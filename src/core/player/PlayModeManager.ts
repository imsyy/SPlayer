import { heartRateList } from "@/api/playlist";
import { useDataStore, useMusicStore, useStatusStore } from "@/stores";
import { type SongType } from "@/types/main";
import { RepeatModeType, ShuffleModeType } from "@/types/shared";
import { RepeatMode } from "@/types/smtc";
import { isLogin } from "@/utils/auth";
import { isElectron, isWin } from "@/utils/env";
import { formatSongsList } from "@/utils/format";
import { shuffleArray } from "@/utils/helper";
import { openUserLogin } from "@/utils/modal";
import axios from "axios";
import { MessageReactive } from "naive-ui";
import * as playerIpc from "./PlayerIpc";

/**
 * 播放模式管理器
 *
 * 负责循环模式、随机模式的切换逻辑及状态同步
 */
export class PlayModeManager {
  /**
   * 用来管理 AbortController 实例
   */
  private currentAbortController: AbortController | null = null;

  /**
   * 存储当前加载消息的实例
   */
  private loadingMessage: MessageReactive | null = null;

  /**
   * 清除当前的加载消息
   */
  private clearLoadingMessage() {
    if (this.loadingMessage) {
      this.loadingMessage.destroy();
      this.loadingMessage = null;
    }
  }

  /**
   * 切换循环模式
   * @param mode 可选，直接设置目标模式。如果不传，则按 List -> One -> Off 顺序轮转
   */
  public toggleRepeat(mode?: RepeatModeType) {
    const statusStore = useStatusStore();

    if (mode) {
      if (statusStore.repeatMode === mode) return;
      statusStore.repeatMode = mode;
    } else {
      statusStore.toggleRepeat();
    }

    this.syncSmtcPlayMode();

    // const modeText: Record<RepeatModeType, string> = {
    //   list: "列表循环",
    //   one: "单曲循环",
    //   off: "不循环",
    // };
    // window.$message.success(`已切换至：${modeText[statusStore.repeatMode]}`);
  }

  /**
   * 中止之前的请求并清除 Loading 消息
   * @returns 新的 AbortSignal
   */
  private resetCurrentTask(): AbortSignal {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.clearLoadingMessage();
    this.currentAbortController = new AbortController();
    return this.currentAbortController.signal;
  }

  /**
   * 计算下一个随机模式
   * 注意：心跳模式只能通过菜单开启，不能通过点击随机按钮进入
   */
  public calculateNextShuffleMode(currentMode: ShuffleModeType): ShuffleModeType {
    if (currentMode === "off") return "on";
    if (currentMode === "on") return "off";
    // 如果是心跳模式，点击随机按钮时退出心跳模式
    if (currentMode === "heartbeat") return "off";
    return "off";
  }

  /**
   * 执行开启随机模式的操作
   */
  private async applyShuffleOn(signal: AbortSignal) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();

    const currentList = [...dataStore.playList];
    // 备份原始列表
    await dataStore.setOriginalPlayList(currentList);

    if (signal.aborted) return;

    // 打乱列表
    const shuffled = shuffleArray(currentList);
    await dataStore.setPlayList(shuffled);

    // 修正当前播放索引
    const idx = shuffled.findIndex((s) => s.id === musicStore.playSong?.id);
    if (idx !== -1) statusStore.playIndex = idx;
  }

  /**
   * 执行开启心动模式的操作
   */
  private async applyHeartbeatMode(signal: AbortSignal, previousMode: ShuffleModeType) {
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();
    const dataStore = useDataStore();

    if (isLogin() !== 1) {
      // 未登录，回滚状态
      statusStore.shuffleMode = previousMode;
      if (isLogin() === 0) {
        openUserLogin(true);
      } else {
        window.$message.warning("该登录模式暂不支持该操作");
      }
      return;
    }

    this.loadingMessage = window.$message.loading("心动模式开启中...", {
      duration: 0,
    });

    try {
      const pid =
        musicStore.playPlaylistId || (await dataStore.getUserLikePlaylist())?.detail?.id || 0;
      if (!musicStore.playSong) throw new Error("无播放歌曲");
      // 获取当前歌曲ID，如果不是纯数字则生成随机10位数
      let currentSongId = musicStore.playSong.id;
      if (!Number.isInteger(currentSongId) || currentSongId <= 0) {
        currentSongId = Math.floor(Math.random() * 9000000000) + 1000000000;
      }

      const res = await heartRateList(currentSongId, pid, undefined, signal);
      if (res.code !== 200) throw new Error("获取推荐失败");

      const recList = formatSongsList(res.data);

      // 混合列表
      const currentList = [...dataStore.playList];
      const mixedList = interleaveLists(currentList, recList);

      await dataStore.setPlayList(mixedList);

      const idx = mixedList.findIndex((s) => s.id === currentSongId);
      if (idx !== -1) statusStore.playIndex = idx;
      window.$message.success("心动模式已开启");
    } finally {
      this.clearLoadingMessage();
    }
  }

  /**
   * 执行关闭随机模式的操作
   *
   * 会恢复原始列表 和/或 清理推荐歌曲
   */
  private async applyShuffleOff() {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();

    // 恢复原始列表
    const original = await dataStore.getOriginalPlayList();

    if (original && original.length > 0) {
      await dataStore.setPlayList(original);
      const idx = original.findIndex((s) => s.id === musicStore.playSong?.id);
      statusStore.playIndex = idx !== -1 ? idx : 0;
      await dataStore.clearOriginalPlayList();
    } else {
      const cleaned = cleanRecommendations(dataStore.playList);
      await dataStore.setPlayList(cleaned);
    }
  }

  /**
   * 切换随机模式
   * @param mode 要切换到的随机模式
   */
  public async toggleShuffle(mode: ShuffleModeType) {
    const statusStore = useStatusStore();
    const signal = this.resetCurrentTask();

    const nextMode = mode;
    const currentMode = statusStore.shuffleMode;

    if (nextMode === currentMode) return;

    const previousMode = statusStore.shuffleMode;
    statusStore.shuffleMode = nextMode;
    this.syncSmtcPlayMode();

    // 将耗时的数据处理扔到 UI 图标更新后再进行，避免打乱庞大列表导致点击延迟
    setTimeout(async () => {
      if (signal.aborted) return;

      try {
        switch (nextMode) {
          case "on":
            await this.applyShuffleOn(signal);
            break;
          case "heartbeat":
            await this.applyHeartbeatMode(signal, previousMode);
            break;
          default:
            await this.applyShuffleOff();
            break;
        }
      } catch (e) {
        if (signal.aborted || axios.isCancel(e)) return;

        this.clearLoadingMessage();

        console.error("切换模式时发生错误:", e);

        // 失败回滚
        statusStore.shuffleMode = previousMode;

        const errorMsg = (e as Error).message || "模式切换出错";
        window.$message.error(errorMsg);
      }
    }, 10);
  }

  /**
   * 同步当前的播放模式到 SMTC
   */
  public syncSmtcPlayMode() {
    const statusStore = useStatusStore();

    if (isElectron && isWin) {
      const smtcShuffle = statusStore.shuffleMode !== "off";

      let smtcRepeat = RepeatMode.None;
      if (statusStore.repeatMode === "list") smtcRepeat = RepeatMode.List;
      if (statusStore.repeatMode === "one") smtcRepeat = RepeatMode.Track;

      playerIpc.sendSmtcPlayMode(smtcShuffle, smtcRepeat);
    } else if (isElectron && !isWin) {
      // Linux MPRIS 同步
      const loopStatus = statusStore.repeatMode === "list" ? "Playlist" : statusStore.repeatMode === "one" ? "Track" : "None";
      const shuffle = statusStore.shuffleMode !== "off";
      
      playerIpc.sendMprisLoopStatus(loopStatus);
      playerIpc.sendMprisShuffle(shuffle);
    }
  }

  /**
   * 专门处理 SMTC 的随机按钮事件
   */
  public handleSmtcShuffle() {
    const statusStore = useStatusStore();
    const nextMode = statusStore.shuffleMode === "off" ? "on" : "off";
    this.toggleShuffle(nextMode);
  }

  /**
   * 专门处理 SMTC 的循环按钮事件
   */
  public handleSmtcRepeat() {
    this.toggleRepeat();
  }

  /**
   * 同步播放模式给托盘
   */
  public playModeSyncIpc() {
    const statusStore = useStatusStore();
    if (isElectron) {
      playerIpc.sendPlayMode(statusStore.repeatMode, statusStore.shuffleMode);
    }
  }
}

/**
 * 混合列表算法 (用于心动模式)
 *
 * 保持 sourceList 顺序不变，每隔 interval 首插入一个 recommendation
 * @param sourceList 原始用户列表
 * @param recommendationList 推荐歌曲列表
 * @param interval 插入间隔 (例如 2 表示：用户, 用户, 推荐, 用户, 用户, 推荐...)
 */
export const interleaveLists = (
  sourceList: SongType[],
  recommendationList: SongType[],
  interval: number = 2,
): SongType[] => {
  const result: SongType[] = [];
  let recIndex = 0;

  // 标记推荐歌曲
  const taggedRecs = recommendationList.map((song) => ({
    ...song,
    isRecommendation: true,
  }));

  sourceList.forEach((song, index) => {
    result.push(song);
    // 每隔 interval 首，且还有推荐歌时，插入一首
    if ((index + 1) % interval === 0 && recIndex < taggedRecs.length) {
      result.push(taggedRecs[recIndex]);
      recIndex++;
    }
  });

  return result;
};

/**
 * 清理推荐歌曲，
 * 用于退出心动模式时，恢复纯净列表
 */
export const cleanRecommendations = (list: SongType[]): SongType[] => {
  return list.filter((s) => !s.isRecommendation);
};
