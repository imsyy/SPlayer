import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { getPlaySongData } from "@/utils/format";
import { msToS } from "@/utils/time";
import type { SystemMediaEvent } from "@emi";
import axios from "axios";
import { throttle } from "lodash-es";
import { usePlayerController } from "./PlayerController";
import {
  enableDiscordRpc,
  sendMediaMetadata,
  sendMediaPlaybackRate,
  sendMediaPlayMode,
  sendMediaPlayState,
  sendMediaTimeline,
  updateDiscordConfig,
} from "./PlayerIpc";

/**
 * 媒体会话管理器，负责不同平台的媒体控制集成
 *
 * 在 Electron 平台上会使用原生插件，Web 平台上会使用 Navigator.mediaSession
 */
class MediaSessionManager {
  private metadataAbortController: AbortController | null = null;
  private currentRate: number = 1;

  private throttledSendTimeline = throttle((currentTime: number, duration: number) => {
    sendMediaTimeline(currentTime, duration);
  }, 200);

  /**
   * 是否使用原生媒体集成
   */
  private shouldUseNativeMedia(): boolean {
    return isElectron;
  }

  /**
   * 处理原生来的媒体事件
   */
  private handleMediaEvent(
    event: SystemMediaEvent,
    player: ReturnType<typeof usePlayerController>,
  ) {
    switch (event.type) {
      case "Play":
        player.play();
        break;
      case "Pause":
        player.pause();
        sendMediaPlayState("Paused");
        break;
      case "Stop":
        player.pause();
        player.setSeek(0);
        sendMediaPlayState("Paused");
        break;
      case "NextSong":
        player.nextOrPrev("next");
        break;
      case "PreviousSong":
        player.nextOrPrev("prev");
        break;
      case "Seek":
        if (event.positionMs != null) {
          player.setSeek(event.positionMs);
        }
        break;
      case "ToggleShuffle":
        player.toggleShuffle();
        break;
      case "ToggleRepeat":
        player.toggleRepeat();
        break;
      case "SetRate":
        if (event.rate != null) {
          player.setRate(event.rate);
        }
        break;
    }
  }

  /**
   * 初始化媒体会话
   */
  public init() {
    const settingStore = useSettingStore();
    if (!settingStore.smtcOpen) return;

    const player = usePlayerController();
    const statusStore = useStatusStore();

    this.currentRate = statusStore.playRate;

    if (isElectron) {
      window.electron.ipcRenderer.removeAllListeners("media-event");
      window.electron.ipcRenderer.on("media-event", (_, event) => {
        this.handleMediaEvent(event, player);
      });

      // 同步初始播放模式状态
      const shuffle = statusStore.shuffleMode !== "off";
      const repeat =
        statusStore.repeatMode === "list"
          ? "List"
          : statusStore.repeatMode === "one"
            ? "Track"
            : "None";
      sendMediaPlayMode(shuffle, repeat);

      player.syncMediaPlayMode();

      // 同步初始播放速率
      sendMediaPlaybackRate(statusStore.playRate);

      // Discord RPC 初始化
      if (settingStore.discordRpc.enabled) {
        enableDiscordRpc();
        updateDiscordConfig({
          showWhenPaused: settingStore.discordRpc.showWhenPaused,
          displayMode: settingStore.discordRpc.displayMode,
        });
      }

      // 如果有原生集成则不需要 Web API
      if (settingStore.smtcOpen) return;
    }

    // Web API 初始化
    if ("mediaSession" in navigator) {
      const nav = navigator.mediaSession;
      nav.setActionHandler("play", () => player.play());
      nav.setActionHandler("pause", () => player.pause());
      nav.setActionHandler("previoustrack", () => player.nextOrPrev("prev"));
      nav.setActionHandler("nexttrack", () => player.nextOrPrev("next"));
      nav.setActionHandler("seekto", (e) => {
        if (e.seekTime) player.setSeek(e.seekTime * 1000);
      });
    }
  }

  /**
   * 更新元数据
   * @param coverBuffer 封面数据（可选，避免重复下载）
   */
  public async updateMetadata(coverBuffer?: Uint8Array) {
    if (!("mediaSession" in navigator) && !isElectron) return;

    const musicStore = useMusicStore();
    const settingStore = useSettingStore();
    const song = getPlaySongData();

    if (!song) return;

    if (this.metadataAbortController) {
      this.metadataAbortController.abort();
    }

    this.metadataAbortController = new AbortController();
    const { signal } = this.metadataAbortController;

    const metadata = this.buildMetadata(song);

    // 原生插件
    if (this.shouldUseNativeMedia() && settingStore.smtcOpen) {
      try {
        // 获取封面数据
        if (
          !coverBuffer &&
          metadata.coverUrl &&
          (metadata.coverUrl.startsWith("http") || metadata.coverUrl.startsWith("blob:"))
        ) {
          try {
            if (metadata.coverUrl.startsWith("blob:")) {
              const resp = await fetch(metadata.coverUrl, { signal });
              const buf = await resp.arrayBuffer();
              coverBuffer = new Uint8Array(buf);
            } else {
              const resp = await axios.get(metadata.coverUrl, {
                responseType: "arraybuffer",
                signal,
              });
              coverBuffer = new Uint8Array(resp.data);
            }
          } catch {
            // 忽略下载失败
          }
        }

        sendMediaMetadata({
          songName: metadata.title,
          authorName: metadata.artist,
          albumName: metadata.album,
          originalCoverUrl: metadata.coverUrl,
          coverData: coverBuffer as Buffer,
          duration: song.duration,
          ncmId: typeof song.id === "number" ? song.id : undefined,
        });
      } catch (e) {
        if (!axios.isCancel(e)) {
          console.error("[Media] 更新元数据失败", e);
        }
      } finally {
        if (this.metadataAbortController?.signal === signal) {
          this.metadataAbortController = null;
        }
      }
      return;
    }

    // Web API
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        artwork: this.buildArtwork(musicStore),
      });
    }
  }

  /**
   * 构建元数据
   */
  private buildMetadata(song: ReturnType<typeof getPlaySongData>): {
    title: string;
    artist: string;
    album: string;
    coverUrl: string;
  } {
    const isRadio = song!.type === "radio";
    const musicStore = useMusicStore();

    return {
      title: song!.name,
      artist: isRadio
        ? "播客电台"
        : Array.isArray(song!.artists)
          ? song!.artists.map((a) => a.name).join("/")
          : String(song!.artists),
      album: isRadio
        ? "播客电台"
        : typeof song!.album === "object"
          ? song!.album.name
          : String(song!.album),
      coverUrl: musicStore.getSongCover("xl") || musicStore.playSong.cover || "",
    };
  }

  /**
   * 构建专辑封面数组
   */
  private buildArtwork(musicStore: ReturnType<typeof useMusicStore>) {
    return [
      {
        src: musicStore.getSongCover("s") || musicStore.playSong.cover || "",
        sizes: "100x100",
        type: "image/jpeg",
      },
      {
        src: musicStore.getSongCover("m") || musicStore.playSong.cover || "",
        sizes: "300x300",
        type: "image/jpeg",
      },
      {
        src: musicStore.getSongCover("cover") || musicStore.playSong.cover || "",
        sizes: "512x512",
        type: "image/jpeg",
      },
      {
        src: musicStore.getSongCover("l") || musicStore.playSong.cover || "",
        sizes: "1024x1024",
        type: "image/jpeg",
      },
      {
        src: musicStore.getSongCover("xl") || musicStore.playSong.cover || "",
        sizes: "1920x1920",
        type: "image/jpeg",
      },
    ];
  }

  /**
   * 更新播放进度
   * @param duration 总时长
   * @param position 当前位置
   * @param immediate 是否立即发送，用于 Seek 操作
   */
  public updateState(duration: number, position: number, immediate: boolean = false) {
    const settingStore = useSettingStore();
    if (!settingStore.smtcOpen) return;

    // 原生插件
    if (this.shouldUseNativeMedia()) {
      if (immediate) {
        this.throttledSendTimeline.cancel();
        // 取消节流就会立刻触发一次更新了，所以不再发送一个多余的事件
        // sendMediaTimeline(position, duration);
      } else {
        this.throttledSendTimeline(position, duration);
      }
      return;
    }

    // Web API
    this.throttledUpdatePositionState(duration, position);
  }

  /**
   * 更新播放状态
   */
  public updatePlaybackStatus(isPlaying: boolean) {
    // 发送到原生插件
    if (this.shouldUseNativeMedia()) {
      sendMediaPlayState(isPlaying ? "Playing" : "Paused");
    }
  }

  /**
   * 更新播放速率
   */
  public updatePlaybackRate(rate: number) {
    this.currentRate = rate;

    if (this.shouldUseNativeMedia()) {
      sendMediaPlaybackRate(rate);
    }
  }

  /**
   * 限流更新进度状态
   */
  private throttledUpdatePositionState = throttle((duration: number, position: number) => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setPositionState({
        duration: msToS(duration),
        position: msToS(position),
        playbackRate: this.currentRate,
      });
    }
  }, 1000);
}

export const mediaSessionManager = new MediaSessionManager();
