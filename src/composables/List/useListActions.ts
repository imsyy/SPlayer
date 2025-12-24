import type { SongType } from "@/types/main";
import { usePlayerController } from "@/core/player/PlayerController";
import { useStatusStore } from "@/stores";

/**
 * 列表操作逻辑
 */
export const useListActions = () => {
  const player = usePlayerController();
  const statusStore = useStatusStore();

  /**
   * 播放全部歌曲
   */
  const playAllSongs = async (songs: SongType[], playListId?: number) => {
    if (!songs?.length) return;
    // 如果是单曲循环模式，自动切换为顺序播放
    if (statusStore.playSongMode === "repeat-once") {
      await player.togglePlayMode("repeat");
    }
    await player.updatePlayList(songs, undefined, playListId);
  };

  return {
    playAllSongs,
  };
};
