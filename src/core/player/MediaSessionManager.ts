import axios from "axios";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { getPlaySongData } from "@/utils/format";
import { isElectron, isWin, isLinux } from "@/utils/env";
import { msToS } from "@/utils/time";
import { type SmtcEvent } from "@native";
import { usePlayerController } from "./PlayerController";
import { SmtcEventType, PlaybackStatus } from "@/types/smtc";
import {
  sendSmtcMetadata,
  sendSmtcTimeline,
  sendSmtcPlayState,
  sendDiscordMetadata,
  sendDiscordTimeline,
  sendDiscordPlayState,
  enableDiscordRpc,
  updateDiscordConfig,
  sendMprisMetadata,
  sendMprisTimeline,
  sendMprisPlayState,
  sendMprisLoopStatus,
  sendMprisShuffle,
} from "./PlayerIpc";
import { throttle } from "lodash-es";

/**
 * 媒体会话管理器，负责跨平台媒体控制集成
 * - Windows: 原生 SMTC
 * - Linux: 原生 MPRIS
 * - 其他平台: navigator.mediaSession
 */
class MediaSessionManager {
  private metadataAbortController: AbortController | null = null;

  private shouldUseNativeMpris(): boolean {
    return isElectron && isLinux;
  }

  /**
   * 初始化 MPRIS 事件监听和状态同步
   */
  private initMpris() {
    const player = usePlayerController();
    const statusStore = useStatusStore();

    window.electron.ipcRenderer.removeAllListeners("mpris-event");
    window.electron.ipcRenderer.on("mpris-event", (_, event: any) => {
      //console.log("[MPRIS] 收到系统事件:", event.eventType, event.value);

      switch (event.eventType) {
        case "play":
          player.play();
          setTimeout(
            () => sendMprisPlayState(statusStore.playStatus ? "Playing" : "Paused"),
            50
          );
          break;
        case "pause":
          player.pause();
          setTimeout(() => sendMprisPlayState("Paused"), 50);
          break;
        case "play_pause":
          player.playOrPause();
          setTimeout(
            () => sendMprisPlayState(statusStore.playStatus ? "Playing" : "Paused"),
            50
          );
          break;
        case "stop":
          player.pause();
          setTimeout(() => sendMprisPlayState("Stopped"), 50);
          break;
        case "next":
          player.nextOrPrev("next");
          break;
        case "previous":
          player.nextOrPrev("prev");
          break;
        case "seek":
          if (event.value !== undefined) {
            player.setSeek(player.getSeek() + event.value);
          }
          break;
        case "set_position":
          if (event.value !== undefined) {
            player.setSeek(event.value);
          }
          break;
        case "loop_status_changed":
          player.toggleRepeat();
          break;
        case "shuffle_changed":
          player.handleSmtcShuffle();
          break;
      }
    });

    // 同步初始播放模式状态
    const loopStatus =
      statusStore.repeatMode === "list"
        ? "Playlist"
        : statusStore.repeatMode === "one"
          ? "Track"
          : "None";
    const shuffle = statusStore.shuffleMode !== "off";

    sendMprisLoopStatus(loopStatus);
    sendMprisShuffle(shuffle);
  }

  /**
   * 初始化媒体会话
   */
  public init() {
    const settingStore = useSettingStore();
    if (!settingStore.smtcOpen) return;

    const player = usePlayerController();

    if (isElectron) {
      // Windows SMTC 初始化
      if (isWin) {
        window.electron.ipcRenderer.removeAllListeners("smtc-event");
        window.electron.ipcRenderer.on("smtc-event", (_, event: SmtcEvent) => {
          this.handleSmtcEvent(event, player, settingStore);
        });
        player.syncSmtcPlayMode();
      }

      // Linux MPRIS 初始化
      if (!isWin && isLinux) {
        this.initMpris();
      }

      // Discord RPC 初始化
      if (settingStore.discordRpc.enabled) {
        enableDiscordRpc();
        updateDiscordConfig({
          showWhenPaused: settingStore.discordRpc.showWhenPaused,
          displayMode: settingStore.discordRpc.displayMode,
        });
      }

      if (isWin && settingStore.enableNativeSmtc) return;
    }

    // Web API 初始化（非 Linux）
    if (!this.shouldUseNativeMpris() && "mediaSession" in navigator) {
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
   * 处理 Windows SMTC 事件
   */
  private handleSmtcEvent(
    event: SmtcEvent,
    player: ReturnType<typeof usePlayerController>,
    settingStore: ReturnType<typeof useSettingStore>
  ) {
    switch (event.type) {
      case SmtcEventType.Play:
        player.play();
        break;
      case SmtcEventType.Pause:
        sendSmtcPlayState(PlaybackStatus.Paused);
        if (settingStore.discordRpc.enabled) {
          sendDiscordPlayState(PlaybackStatus.Paused);
        }
        player.pause();
        break;
      case SmtcEventType.NextSong:
        player.nextOrPrev("next");
        break;
      case SmtcEventType.PreviousSong:
        player.nextOrPrev("prev");
        break;
      case SmtcEventType.Stop:
        player.pause();
        break;
      case SmtcEventType.Seek:
        if (event.positionMs !== undefined) {
          player.setSeek(event.positionMs);
        }
        break;
    }
  }

  /**
   * 更新元数据
   */
  public async updateMetadata() {
    if (!("mediaSession" in navigator)) return;

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

    if (isElectron) {
      // Discord
      if (settingStore.discordRpc.enabled) {
        sendDiscordMetadata({
          songName: metadata.title,
          authorName: metadata.artist,
          albumName: metadata.album,
          originalCoverUrl:
            metadata.coverUrl.startsWith("http") ? metadata.coverUrl : undefined,
          duration: song.duration,
          ncmId: typeof song.id === "number" ? song.id : 0,
        });
      }

      // Windows SMTC
      if (isWin && settingStore.enableNativeSmtc) {
        await this.updateSmtcMetadata(metadata, signal);
        return;
      }

      // Linux MPRIS
      if (this.shouldUseNativeMpris()) {
        sendMprisMetadata({
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          length: song.duration,
          url: metadata.coverUrl,
        });
        return;
      }
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
  private buildMetadata(
    song: ReturnType<typeof getPlaySongData>
  ): { title: string; artist: string; album: string; coverUrl: string } {
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
   * 更新 SMTC 元数据
   */
  private async updateSmtcMetadata(
    metadata: { title: string; artist: string; album: string; coverUrl: string },
    signal: AbortSignal
  ): Promise<void> {
    try {
      let coverBuffer: Uint8Array | undefined;

      if (
        metadata.coverUrl &&
        (metadata.coverUrl.startsWith("http") ||
          metadata.coverUrl.startsWith("blob:"))
      ) {
        const resp = await axios.get(metadata.coverUrl, {
          responseType: "arraybuffer",
          signal,
        });
        coverBuffer = new Uint8Array(resp.data);
      }

      sendSmtcMetadata({
        songName: metadata.title,
        authorName: metadata.artist,
        albumName: metadata.album,
        coverData: coverBuffer as Buffer,
        ncmId: 0,
      });
    } catch (e) {
      if (!axios.isCancel(e)) {
        console.error("[SMTC] 更新元数据失败", e);
      }
    } finally {
      if (this.metadataAbortController?.signal === signal) {
        this.metadataAbortController = null;
      }
    }
  }

  /**
   * 更新播放进度
   */
  public updateState(duration: number, position: number) {
    const settingStore = useSettingStore();
    if (!settingStore.smtcOpen) return;

    if (isElectron) {
      if (settingStore.discordRpc.enabled) {
        sendDiscordTimeline(position, duration);
      }

      if (isWin && settingStore.enableNativeSmtc) {
        sendSmtcTimeline(position, duration);
        return;
      }

      if (this.shouldUseNativeMpris()) {
        sendMprisTimeline(position, duration);
        return;
      }
    }

    this.throttledUpdatePositionState(duration, position);
  }

  /**
   * 更新播放状态
   */
  public updatePlaybackStatus(isPlaying: boolean) {
    if (this.shouldUseNativeMpris()) {
      sendMprisPlayState(isPlaying ? "Playing" : "Paused");
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
      });
    }
  }, 1000);
}

export const mediaSessionManager = new MediaSessionManager();
