import { useSettingStore } from "@/stores";
import { SettingConfig } from "@/types/settings";
import StreamingServerList from "../components/StreamingServerList.vue";

export const useStreamingSettings = (): SettingConfig => {
  const settingStore = useSettingStore();

  return {
    groups: [
      {
        title: "流媒体功能",
        items: [
          {
            key: "streamingEnabled",
            label: "启用流媒体",
            type: "switch",
            description: "开启后可使用并管理 Navidrome、Jellyfin 等流媒体服务",
            value: computed({
              get: () => settingStore.streamingEnabled,
              set: (v) => (settingStore.streamingEnabled = v),
            }),
          },
        ],
      },
      {
        title: "流媒体管理",
        items: [
          {
            key: "serverList",
            label: "服务器列表",
            type: "custom",
            description: "在此添加和管理您的流媒体服务器",
            noWrapper: true,
            component: markRaw(StreamingServerList),
          },
        ],
      },
    ],
  };
};
