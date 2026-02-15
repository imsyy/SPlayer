import { songQuality } from "@/api/song";
import { usePlayerController } from "@/core/player/PlayerController";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { QualityType } from "@/types/main";
import { formatFileSize, handleSongQuality } from "@/utils/helper";
import { AI_AUDIO_LEVELS, getSongLevelsData, songLevelData } from "@/utils/meta";
import { DropdownOption } from "naive-ui";

// 音质名称映射
const qualityNameMap: Record<string, string> = {
  [QualityType.Master]: songLevelData.jm.shortName,
  [QualityType.Dolby]: songLevelData.db.shortName,
  [QualityType.Spatial]: songLevelData.sk.shortName,
  [QualityType.Surround]: songLevelData.je.shortName,
  [QualityType.HiRes]: songLevelData.hr.shortName,
  [QualityType.SQ]: songLevelData.sq.shortName,
  [QualityType.HQ]: songLevelData.h.shortName,
  [QualityType.MQ]: songLevelData.m.shortName,
  [QualityType.LQ]: songLevelData.l.shortName,
};

export const useQualityControl = () => {
  const musicStore = useMusicStore();
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();

  const player = usePlayerController();

  // 获取音质名称
  const getQualityName = (quality: QualityType | undefined) => {
    const song = musicStore.playSong;
    if (song.path) return "本地";
    if (song.pc) return "云盘";
    if (statusStore.isUnlocked) return "解锁";
    if (!quality) return "未知";
    return qualityNameMap[quality] || quality;
  };

  // 音质选择菜单状态
  const availableQualities = computed(() => statusStore.availableQualities);

  // 当前实际播放的音质级别
  const currentPlayingLevel = computed(() => {
    const current = statusStore.songQuality;
    if (!current || !availableQualities.value.length) return settingStore.songLevel;
    // 在可用列表中找到与当前播放音质名称匹配的级别
    const found = availableQualities.value.find((q) => handleSongQuality(q) === current);
    return found ? found.level : settingStore.songLevel;
  });

  // 音质选项
  const qualityOptions = computed<DropdownOption[]>(() => {
    return availableQualities.value.map((item) => {
      // 是否为当前设置的音质
      const isDefaultQuality = settingStore.songLevel === item.level;
      // 是否为当前实际播放的音质
      const isPlayingQuality = currentPlayingLevel.value === item.level;
      return {
        label: () =>
          h(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                width: "100%",
                minWidth: "150px",
                fontWeight: isDefaultQuality ? "bold" : "normal",
              },
            },
            [
              h("span", item.name),
              h(
                "span",
                { style: { opacity: 0.6, fontSize: "12px", marginLeft: "6px" } },
                isDefaultQuality && !isPlayingQuality
                  ? "当前配置"
                  : item.size
                    ? formatFileSize(item.size)
                    : "",
              ),
            ],
          ),
        value: item.level,
      };
    });
  });

  /**
   * 加载可用音质列表
   * @param isPreload 是否为预加载模式（静默加载，无错误提示）
   */
  const loadQualities = async (isPreload = false) => {
    // 本地歌曲或解锁歌曲不支持切换
    if (musicStore.playSong.path || statusStore.isUnlocked || musicStore.playSong.type !== "song")
      return;
    // 如果已经加载过，不重复加载
    if (statusStore.availableQualities.length > 0) return;
    const songId = musicStore.playSong.id;
    if (!songId) return;
    try {
      const res = await songQuality(songId);
      if (res.data) {
        const levels = getSongLevelsData(songLevelData, res.data);

        statusStore.availableQualities = levels;

        // Apply Fuck AI Mode filter (Secondary filter)
        // 如果当前播放的是被隐藏的音质，尝试切换到最高可用音质
        if (settingStore.disableAiAudio) {
          statusStore.availableQualities = statusStore.availableQualities.filter((q) => {
            if (q.level === "dolby") return true;
            return !AI_AUDIO_LEVELS.includes(q.level);
          });
        }
      } else if (!isPreload) {
        window.$message.warning("获取音质信息失败");
      }
    } catch (error) {
      console.error(`获取音质详情失败${isPreload ? " (预加载)" : ""}:`, error);
      statusStore.availableQualities = [];
      if (!isPreload) {
        window.$message.error("获取音质信息失败");
      }
    }
  };
  // 预加载音质列表
  const preloadQualities = () => loadQualities(true);
  // 选择音质
  const handleQualitySelect = async (key: string) => {
    // 如果选择的和当前一样，不处理
    if (settingStore.songLevel === key) {
      return;
    }
    const item = availableQualities.value.find((q) => q.level === key);
    if (!item) return;
    // 更新音质
    settingStore.songLevel = key as typeof settingStore.songLevel;
    // 切换音质，保持当前进度，不重新加载歌词
    await player.switchQuality(statusStore.currentTime);
    // 获取实际切换后的音质项
    const actualItem = availableQualities.value.find(
      (q) => handleSongQuality(q) === statusStore.songQuality,
    );
    window.$message.success(`已切换至 ${actualItem?.name || item.name}`);
  };

  return {
    availableQualities,
    currentPlayingLevel,
    qualityOptions,
    loadQualities,
    preloadQualities,
    handleQualitySelect,
    getQualityName,
    isOnlineSong: computed(() => {
      const song = musicStore.playSong;
      return !song.path && !song.pc && song.type === "song" && !statusStore.isUnlocked;
    }),
  };
};
