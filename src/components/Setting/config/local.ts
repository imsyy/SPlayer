import { useSettingStore, useStatusStore } from "@/stores";
import { useCacheManager } from "@/core/resource/CacheManager";
import { formatFileSize } from "@/utils/helper";
import { songLevelData, getSongLevelsData, AI_AUDIO_LEVELS } from "@/utils/meta";
import { SettingConfig } from "@/types/settings";
import { openLocalMusicDirectoryModal } from "@/utils/modal";
import { pick } from "lodash-es";
import LocalLyricDirectories from "../components/LocalLyricDirectories.vue";
import CacheSizeLimit from "../components/CacheSizeLimit.vue";

export const useLocalSettings = (): SettingConfig => {
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const cacheManager = useCacheManager();

  // --- 缓存逻辑 ---
  const cacheSizeDisplay = ref<string>("--");
  const cachePath = ref<string>("");

  // 统计全部缓存目录占用大小
  const loadCacheSize = async () => {
    const res = await cacheManager.getSize();
    if (res.success && res.data !== undefined) {
      cacheSizeDisplay.value = formatFileSize(res.data);
    } else {
      cacheSizeDisplay.value = "--";
    }
  };

  // 获取缓存目录
  const loadCachePath = async () => {
    try {
      const path = await window.api.store.get("cachePath");
      cachePath.value = path || "";
    } catch (error) {
      console.error("读取缓存路径失败:", error);
    }
  };

  // 初始加载
  const onActivate = () => {
    loadCacheSize();
    loadCachePath();
  };

  // 更改缓存目录
  const changeCachePath = async () => {
    const path = await window.electron.ipcRenderer.invoke("choose-path");
    if (path) {
      cachePath.value = path;
      await window.api.store.set("cachePath", path);
    }
  };

  // 确认更改缓存目录
  const confirmChangeCachePath = () => {
    window.$dialog.warning({
      title: "更改缓存目录",
      content: "更改缓存目录不会自动移动已有缓存文件，建议在清空缓存后再更改目录。确定要继续吗？",
      positiveText: "确定更改",
      negativeText: "取消",
      onPositiveClick: () => {
        return changeCachePath();
      },
    });
  };

  // 清空所有缓存目录
  const clearCache = async () => {
    const res = await cacheManager.clearAll();
    await loadCacheSize();
    if (!res.success) {
      window.$message.error("缓存清理失败: " + (res.message || "未知错误"));
    } else {
      window.$message.success("缓存已清空");
    }
  };

  // 确认清空缓存
  const confirmClearCache = () => {
    window.$dialog.warning({
      title: "清空缓存",
      content: "将删除所有缓存的音乐、歌词和本地数据，此操作不可恢复，确定要继续吗？",
      positiveText: "清空缓存",
      negativeText: "取消",
      onPositiveClick: () => {
        return clearCache();
      },
    });
  };

  // --- 下载逻辑 ---

  // 繁体变体标签
  const variantMap: Record<string, string> = {
    s2t: "繁体中文 (标准)",
    s2tw: "台湾正体",
    s2hk: "香港繁体",
    s2twp: "台湾正体 (含词汇)",
  };

  const traditionalVariantLabel = computed(() => {
    return variantMap[settingStore.traditionalChineseVariant] || "繁体中文";
  });

  // 默认下载音质选项
  const downloadQualityOptions = computed(() => {
    const levels = pick(songLevelData, ["l", "m", "h", "sq", "hr", "je", "sk", "db", "jm"]);
    let allData = getSongLevelsData(levels);

    if (settingStore.disableAiAudio) {
      allData = allData.filter((item) => {
        if (item.level === "dolby") return true;
        return !AI_AUDIO_LEVELS.includes(item.level);
      });
    }

    return allData.map((item) => ({
      label: item.name,
      value: item.value,
    }));
  });

  const fileNameFormatOptions = [
    { label: "歌曲名", value: "title" },
    { label: "歌手 - 歌曲名", value: "artist-title" },
    { label: "歌曲名 - 歌手", value: "title-artist" },
  ];

  const folderStrategyOptions = [
    { label: "不分文件夹", value: "none" },
    { label: "按歌手分文件夹", value: "artist" },
    { label: "按 歌手 \\ 专辑 分文件夹", value: "artist-album" },
  ];

  // 模拟播放下载开关
  const handlePlaybackDownloadChange = (value: boolean) => {
    if (value) {
      window.$dialog.warning({
        title: "开启提示",
        content:
          "模拟播放下载可能导致部分音质歌词嵌入异常且未经完整测试可能有不稳定情况，确认要打开吗？",
        positiveText: "确认打开",
        negativeText: "取消",
        onPositiveClick: () => {
          settingStore.usePlaybackForDownload = true;
        },
      });
    } else {
      settingStore.usePlaybackForDownload = false;
    }
  };

  // 解锁接口下载开关
  const handleUnlockDownloadChange = (value: boolean) => {
    if (value) {
      window.$dialog.warning({
        title: "开启提示",
        content: "开启此功能可能导致音质下降和与原曲不一致等情况，确认要打开吗？",
        positiveText: "确认打开",
        negativeText: "取消",
        onPositiveClick: () => {
          settingStore.useUnlockForDownload = true;
        },
      });
    } else {
      settingStore.useUnlockForDownload = false;
    }
  };

  // 歌词编码更改
  const handleLyricEncodingChange = (value: "utf-8" | "gbk" | "utf-16" | "iso-8859-1") => {
    if (value === settingStore.downloadLyricEncoding) return;
    window.$dialog.warning({
      title: "更改编码提示",
      content: "请确保你的编码为相应编码再开启，改变编码可能导致文件播放乱码。确认要更改吗？",
      positiveText: "确认更改",
      negativeText: "取消",
      onPositiveClick: () => {
        settingStore.downloadLyricEncoding = value;
      },
    });
  };

  // 更改下载目录
  const chooseDownloadPath = async () => {
    const path = await window.electron.ipcRenderer.invoke("choose-path");
    if (path) settingStore.downloadPath = path;
  };

  return {
    onActivate,
    groups: [
      {
        title: "本地歌曲",
        items: [
          {
            key: "showLocalCover",
            label: "显示本地歌曲封面",
            type: "switch",
            description: "当数量过多时请勿开启，会严重影响性能",
            value: computed({
              get: () => settingStore.showLocalCover,
              set: (v) => (settingStore.showLocalCover = v),
            }),
          },
          {
            key: "localFolderDisplayMode",
            label: "本地文件夹显示模式",
            type: "select",
            description: "选择本地音乐页面文件夹的显示方式",
            options: [
              { label: "标签页模式", value: "tab" },
              { label: "下拉筛选模式", value: "dropdown" },
            ],
            value: computed({
              get: () => settingStore.localFolderDisplayMode,
              set: (v) => (settingStore.localFolderDisplayMode = v),
            }),
          },
          {
            key: "showDefaultLocalPath",
            label: "显示本地默认歌曲目录",
            type: "switch",
            value: computed({
              get: () => settingStore.showDefaultLocalPath,
              set: (v) => (settingStore.showDefaultLocalPath = v),
            }),
          },
          {
            key: "localFilesPath",
            label: "本地歌曲目录",
            type: "button",
            buttonLabel: "管理目录",
            description: "可在此增删本地歌曲目录，歌曲增删实时同步",
            action: openLocalMusicDirectoryModal,
          },
          {
            key: "localLyricPath",
            label: "本地歌词覆盖在线歌词",
            type: "custom",
            noWrapper: true,
            component: markRaw(LocalLyricDirectories),
          },
        ],
      },
      {
        title: "缓存配置",
        items: [
          {
            key: "cacheEnabled",
            label: "启用缓存",
            type: "switch",
            description: "开启缓存会加快资源加载速度，但会占用更多磁盘空间",
            value: computed({
              get: () => settingStore.cacheEnabled,
              set: (v) => (settingStore.cacheEnabled = v),
            }),
          },
          {
            key: "songCacheEnabled",
            label: "缓存歌曲",
            type: "switch",
            description: "是否缓存歌曲音频，关闭后可节省缓存空间",
            value: computed({
              get: () => settingStore.songCacheEnabled,
              set: (v) => (settingStore.songCacheEnabled = v),
            }),
            condition: () => settingStore.cacheEnabled,
          },
          {
            key: "cacheLimit",
            label: "缓存大小上限",
            type: "custom",
            description: "达到上限后将清理最旧的缓存，可以是小数，最低 2GB",
            component: markRaw(CacheSizeLimit),
            condition: () => settingStore.cacheEnabled,
            noWrapper: true,
          },
          {
            key: "cachePath",
            label: "缓存目录",
            type: "button",
            description: computed(() => cachePath.value || "未配置时将使用默认缓存目录"),
            buttonLabel: "更改",
            action: confirmChangeCachePath,
            condition: () => settingStore.cacheEnabled,
          },
          {
            key: "clearCache",
            label: "缓存占用与清理",
            type: "button",
            description: () => `当前缓存占用：${cacheSizeDisplay.value}`,
            buttonLabel: "清空缓存",
            action: confirmClearCache,
            componentProps: { type: "error" },
          },
        ],
      },
      {
        title: "下载配置",
        show: computed(() => statusStore.isDeveloperMode),
        items: [
          {
            key: "downloadPath",
            label: "默认下载目录",
            type: "button",
            description: computed(() => settingStore.downloadPath || "若不设置则无法进行下载"),
            buttonLabel: "更改",
            action: chooseDownloadPath,
            extraButton: {
              label: "清除选择",
              type: "primary",
              secondary: true,
              strong: true,
              action: () => (settingStore.downloadPath = ""),
              show: computed(() => !!settingStore.downloadPath),
            },
          },
          {
            key: "enableDownloadHttp2",
            label: "启用 HTTP/2 下载",
            type: "switch",
            tags: [{ text: "Beta", type: "warning" }],
            description: "使用 HTTP/2 协议进行下载",
            value: computed({
              get: () => settingStore.enableDownloadHttp2,
              set: (v) => (settingStore.enableDownloadHttp2 = v),
            }),
          },
          {
            key: "downloadSongLevel",
            label: "默认下载音质",
            type: "select",
            description: "默认使用的音质，实际可用音质取决于账号权限和歌曲资源",
            options: downloadQualityOptions,
            value: computed({
              get: () => settingStore.downloadSongLevel,
              set: (v) => (settingStore.downloadSongLevel = v),
            }),
          },
          {
            key: "downloadThreadCount",
            label: "下载线程数",
            type: "slider",
            description: "多线程下载可提高速度，默认为 8，建议设置在 4-16 之间",
            min: 1,
            max: 32,
            step: 1,
            value: computed({
              get: () => settingStore.downloadThreadCount,
              set: (v) => (settingStore.downloadThreadCount = v),
            }),
          },
          {
            key: "downloadMeta",
            label: "下载歌曲元信息",
            type: "switch",
            description: "为当前下载歌曲附加封面及歌词等元信息",
            value: computed({
              get: () => settingStore.downloadMeta,
              set: (v) => (settingStore.downloadMeta = v),
            }),
          },
          {
            key: "downloadCover",
            label: "同时下载封面",
            type: "switch",
            description: "下载歌曲时同时下载封面",
            disabled: computed(() => !settingStore.downloadMeta),
            value: computed({
              get: () => settingStore.downloadCover,
              set: (v) => (settingStore.downloadCover = v),
            }),
          },
          {
            key: "downloadLyric",
            label: "同时下载歌词",
            type: "switch",
            description: "下载歌曲时同时下载歌词",
            disabled: computed(() => !settingStore.downloadMeta),
            value: computed({
              get: () => settingStore.downloadLyric,
              set: (v) => (settingStore.downloadLyric = v),
            }),
          },
          {
            key: "downloadLyricTranslation",
            label: "同时下载歌词翻译",
            type: "switch",
            description: "下载歌词时同时包含翻译",
            disabled: computed(() => !settingStore.downloadMeta || !settingStore.downloadLyric),
            value: computed({
              get: () => settingStore.downloadLyricTranslation,
              set: (v) => (settingStore.downloadLyricTranslation = v),
            }),
          },
          {
            key: "downloadLyricRomaji",
            label: "同时下载歌词音译",
            type: "switch",
            description: "下载歌词时同时包含音译（罗马音）",
            disabled: computed(() => !settingStore.downloadMeta || !settingStore.downloadLyric),
            value: computed({
              get: () => settingStore.downloadLyricRomaji,
              set: (v) => (settingStore.downloadLyricRomaji = v),
            }),
          },
          {
            key: "fileNameFormat",
            label: "音乐命名格式",
            type: "select",
            description: "选择下载文件的命名方式，建议包含歌手信息便于区分",
            options: fileNameFormatOptions,
            value: computed({
              get: () => settingStore.fileNameFormat,
              set: (v) => (settingStore.fileNameFormat = v),
            }),
          },
          {
            key: "folderStrategy",
            label: "文件智能分类",
            type: "select",
            description: "自动按歌手或歌手与专辑创建子文件夹进行分类",
            options: folderStrategyOptions,
            value: computed({
              get: () => settingStore.folderStrategy,
              set: (v) => (settingStore.folderStrategy = v),
            }),
          },
          {
            key: "usePlaybackForDownload",
            label: "模拟播放下载",
            type: "switch",
            tags: [{ text: "Beta", type: "warning" }],
            description: "使用播放接口进行下载，可能解决部分下载失败问题",
            value: computed({
              get: () => settingStore.usePlaybackForDownload,
              set: (v) => handlePlaybackDownloadChange(v),
            }),
          },
          {
            key: "useUnlockForDownload",
            label: "使用解锁接口下载",
            type: "switch",
            tags: [{ text: "Beta", type: "warning" }],
            description: "利用配置的解锁服务获取下载链接（优先于默认方式）",
            value: computed({
              get: () => settingStore.useUnlockForDownload,
              set: (v) => handleUnlockDownloadChange(v),
            }),
          },
          {
            key: "downloadMakeYrc",
            label: "下载时另存逐字歌词文件",
            type: "switch",
            tags: [{ text: "Beta", type: "warning" }],
            description: "在有条件时保存独立的 YRC/TTML 逐字歌词文件（源文件仍内嵌 LRC）",
            disabled: computed(() => !settingStore.downloadMeta || !settingStore.downloadLyric),
            value: computed({
              get: () => settingStore.downloadMakeYrc,
              set: (v) => (settingStore.downloadMakeYrc = v),
            }),
          },
          {
            key: "downloadSaveAsAss",
            label: "下载时另存为 ASS 文件",
            type: "switch",
            description: "生成 ASS 字幕文件以支持第三方播放器识别（源文件仍内嵌 LRC）",
            disabled: computed(() => !settingStore.downloadMeta || !settingStore.downloadLyric),
            value: computed({
              get: () => settingStore.downloadSaveAsAss,
              set: (v) => (settingStore.downloadSaveAsAss = v),
            }),
          },
          {
            key: "downloadLyricToTraditional",
            label: "下载歌词转繁体",
            type: "switch",
            description: () =>
              h("div", {
                innerHTML:
                  "下载的歌词文件将转换为繁体中文（包括 LRC、YRC、TTML）<br />使用歌词设置中的繁体变体：" +
                  traditionalVariantLabel.value,
              }),
            disabled: computed(() => !settingStore.downloadMeta || !settingStore.downloadLyric),
            value: computed({
              get: () => settingStore.downloadLyricToTraditional,
              set: (v) => (settingStore.downloadLyricToTraditional = v),
            }),
          },
          {
            key: "downloadLyricEncoding",
            label: "下载的歌词文件编码格式",
            type: "select",
            description: "部分车载或老旧播放器可能仅支持 GBK 编码",
            options: [
              { label: "UTF-8", value: "utf-8" },
              { label: "GBK", value: "gbk" },
              { label: "UTF-16", value: "utf-16" },
              { label: "ISO-8859-1", value: "iso-8859-1" },
            ],
            value: computed({
              get: () => settingStore.downloadLyricEncoding,
              set: (v) => handleLyricEncodingChange(v),
            }),
          },
          {
            key: "saveMetaFile",
            label: "保留元信息文件",
            type: "switch",
            description: "是否在下载目录中保留元信息文件",
            disabled: computed(() => !settingStore.downloadMeta),
            value: computed({
              get: () => settingStore.saveMetaFile,
              set: (v) => (settingStore.saveMetaFile = v),
            }),
          },
        ],
      },
    ],
  };
};
