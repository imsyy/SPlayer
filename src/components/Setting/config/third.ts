import { useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { SettingConfig } from "@/types/settings";
import { NA } from "naive-ui";
import { disableDiscordRpc, enableDiscordRpc, updateDiscordConfig } from "@/core/player/PlayerIpc";
import { getAuthToken, getAuthUrl, getSession } from "@/api/lastfm";

export const useThirdSettings = (): SettingConfig => {
  const settingStore = useSettingStore();

  // 更新 Discord 配置
  const handleDiscordConfigUpdate = () => {
    if (!settingStore.discordRpc.enabled) return;
    updateDiscordConfig({
      showWhenPaused: settingStore.discordRpc.showWhenPaused,
      displayMode: settingStore.discordRpc.displayMode,
    });
  };

  // 切换 Discord 启用状态
  const handleDiscordEnabledUpdate = (val: boolean) => {
    settingStore.discordRpc.enabled = val;
    if (val) {
      enableDiscordRpc();
      handleDiscordConfigUpdate();
    } else {
      disableDiscordRpc();
    }
  };

  // --- WebSocket Logic ---
  // socket
  const socketPort = ref(25885);
  const socketEnabled = ref(false);
  const socketPortSaved = ref<number | null>(null);

  // 初始化 socket 配置
  const initSocketConfig = async () => {
    if (!isElectron) return;
    const wsOptions = await window.api.store.get("websocket");
    const portFromStore = wsOptions?.port ?? 25885;
    socketPort.value = portFromStore;
    socketPortSaved.value = portFromStore;
    socketEnabled.value = wsOptions?.enabled ?? false;
  };

  // 保存 socket 配置
  const saveSocketConfig = async () => {
    if (!isElectron) return;
    await window.api.store.set("websocket", {
      enabled: socketEnabled.value,
      port: socketPort.value,
    });
  };

  // 切换启用状态
  const handleSocketEnabledUpdate = async (value: boolean) => {
    if (!isElectron) {
      socketEnabled.value = value;
      await saveSocketConfig();
      return;
    }
    if (value) {
      if (socketPort.value !== socketPortSaved.value) {
        window.$message.warning("请先测试并保存端口配置后再启用 WebSocket");
        return;
      }
      const result = await window.electron.ipcRenderer.invoke("socket-start");
      if (result?.success) {
        socketEnabled.value = true;
        await saveSocketConfig();
        window.$message.success("WebSocket 服务已启动");
      } else {
        window.$message.error(result?.message ?? "WebSocket 启动失败");
        socketEnabled.value = false;
      }
    } else {
      const result = await window.electron.ipcRenderer.invoke("socket-stop");
      if (result?.success) {
        socketEnabled.value = false;
        await saveSocketConfig();
        window.$message.success("WebSocket 服务已关闭");
      } else {
        window.$message.error(result?.message ?? "WebSocket 关闭失败");
        socketEnabled.value = true;
      }
    }
  };

  // 测试 socket 端口
  const testSocketPort = async () => {
    if (!isElectron) return;
    if (!socketPort.value) {
      window.$message.error("请输入端口号");
      return;
    }
    try {
      const result = await window.electron.ipcRenderer.invoke("socket-test-port", socketPort.value);
      if (result?.success) {
        await saveSocketConfig();
        socketPortSaved.value = socketPort.value;
        window.$message.success("已保存 WebSocket 配置");
      } else {
        window.$message.error(result?.message ?? "该端口不可用，请更换端口");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Last.fm Logic ---
  const lastfmAuthLoading = ref(false);

  /**
   * 连接 Last.fm 账号
   */
  const connectLastfm = async () => {
    try {
      lastfmAuthLoading.value = true;
      const tokenResponse = await getAuthToken();
      if (!tokenResponse.token) throw new Error("无法获取认证令牌");
      const token = tokenResponse.token;
      const authUrl = getAuthUrl(token);

      if (typeof window !== "undefined") {
        const authWindow = window.open(authUrl, "_blank", "width=800,height=600");
        const checkAuth = setInterval(async () => {
          if (authWindow?.closed) {
            clearInterval(checkAuth);
            if (lastfmAuthLoading.value) {
              lastfmAuthLoading.value = false;
              window.$message.warning("授权已取消");
            }
            return;
          }
          try {
            const sessionResponse = await getSession(token);
            if (sessionResponse.session) {
              clearInterval(checkAuth);
              authWindow?.close();
              settingStore.lastfm.sessionKey = sessionResponse.session.key;
              settingStore.lastfm.username = sessionResponse.session.name;
              window.$message.success(`已成功连接到 Last.fm 账号: ${sessionResponse.session.name}`);
              lastfmAuthLoading.value = false;
            }
          } catch (error) {
            // 用户还未授权，继续等待
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(checkAuth);
          if (lastfmAuthLoading.value) {
            lastfmAuthLoading.value = false;
            window.$message.warning("授权超时，请重试");
          }
        }, 30000);
      }
    } catch (error: any) {
      console.error("Last.fm 连接失败:", error);
      window.$message.error(`连接失败: ${error.message || "未知错误"}`);
      lastfmAuthLoading.value = false;
    }
  };

  /**
   * 断开 Last.fm 账号
   */
  const disconnectLastfm = () => {
    window.$dialog.warning({
      title: "断开连接",
      content: "确定要断开与 Last.fm 的连接吗？",
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: () => {
        settingStore.lastfm.sessionKey = "";
        settingStore.lastfm.username = "";
        window.$message.success("已断开与 Last.fm 的连接");
      },
    });
  };

  const onActivate = () => {
    initSocketConfig();
  };

  return {
    onActivate,
    groups: [
      {
        title: "系统集成",
        items: [
          {
            key: "smtcOpen",
            label: isElectron ? "开启系统音频集成" : "开启浏览器媒体会话",
            type: "switch",
            description: isElectron
              ? "与系统集成以显示媒体元数据，支持高清封面显示"
              : "向浏览器发送 Media Session 媒体元数据",
            value: computed({
              get: () => settingStore.smtcOpen,
              set: (v) => (settingStore.smtcOpen = v),
            }),
          },
        ],
      },
      {
        title: "Last.fm 集成",
        items: [
          {
            key: "lastfm_enabled",
            label: "启用 Last.fm",
            type: "switch",
            description: "开启后可记录播放历史到 Last.fm",
            value: computed({
              get: () => settingStore.lastfm.enabled,
              set: (v) => (settingStore.lastfm.enabled = v),
            }),
            children: [
              {
                key: "lastfm_apikey",
                label: "API Key",
                type: "text-input",
                description: () =>
                  h("div", null, [
                    h("div", null, [
                      "在 ",
                      h(
                        NA,
                        {
                          href: "https://www.last.fm/zh/api/account/create",
                          target: "_blank",
                        },
                        { default: () => "Last.fm 创建应用" },
                      ),
                      " 获取，只有「程序名称」是必要的",
                    ]),
                    h("div", null, [
                      "如果已经创建过，则可以在 ",
                      h(
                        NA,
                        {
                          href: "https://www.last.fm/zh/api/accounts",
                          target: "_blank",
                        },
                        { default: () => "Last.fm API 应用程序" },
                      ),
                      " 处查看",
                    ]),
                  ]),
                value: computed({
                  get: () => settingStore.lastfm.apiKey,
                  set: (v) => (settingStore.lastfm.apiKey = v),
                }),
              },
              {
                key: "lastfm_secret",
                label: "API Secret",
                type: "text-input",
                description: "Shared Secret，用于签名验证",
                componentProps: { type: "password", showPasswordOn: "click" },
                value: computed({
                  get: () => settingStore.lastfm.apiSecret,
                  set: (v) => (settingStore.lastfm.apiSecret = v),
                }),
              },
              {
                key: "lastfm_connect",
                label: computed(() =>
                  !settingStore.lastfm.sessionKey ? "连接 Last.fm 账号" : "已连接账号",
                ),
                type: "button",
                description: computed(() =>
                  !settingStore.lastfm.sessionKey
                    ? "首次使用需要授权连接"
                    : settingStore.lastfm.username,
                ),
                buttonLabel: computed(() =>
                  !settingStore.lastfm.sessionKey ? "连接账号" : "断开连接",
                ),
                action: () =>
                  !settingStore.lastfm.sessionKey ? connectLastfm() : disconnectLastfm(),
                componentProps: computed(() =>
                  !settingStore.lastfm.sessionKey
                    ? {
                        type: "primary",
                        loading: lastfmAuthLoading.value,
                        disabled: !settingStore.isLastfmConfigured,
                      }
                    : { type: "error" },
                ),
              },
              {
                key: "lastfm_scrobble",
                label: "Scrobble（播放记录）",
                type: "switch",
                description: "自动记录播放历史到 Last.fm",
                condition: () => !!settingStore.lastfm.sessionKey,
                value: computed({
                  get: () => settingStore.lastfm.scrobbleEnabled,
                  set: (v) => (settingStore.lastfm.scrobbleEnabled = v),
                }),
              },
              {
                key: "lastfm_nowplaying",
                label: "正在播放状态",
                type: "switch",
                description: "向 Last.fm 同步正在播放的歌曲",
                condition: () => !!settingStore.lastfm.sessionKey,
                value: computed({
                  get: () => settingStore.lastfm.nowPlayingEnabled,
                  set: (v) => (settingStore.lastfm.nowPlayingEnabled = v),
                }),
              },
            ],
          },
        ],
      },
      {
        title: "Discord RPC",
        show: isElectron,
        items: [
          {
            key: "discord_enabled",
            label: "启用 Discord RPC",
            type: "switch",
            description: "在 Discord 状态中显示正在播放的歌曲",
            value: computed({
              get: () => settingStore.discordRpc.enabled,
              set: (v) => handleDiscordEnabledUpdate(v),
            }),
            children: [
              {
                key: "discord_paused",
                label: "暂停时显示",
                type: "switch",
                description: "暂停播放时是否保留 Discord 状态",
                value: computed({
                  get: () => settingStore.discordRpc.showWhenPaused,
                  set: (v) => {
                    settingStore.discordRpc.showWhenPaused = v;
                    handleDiscordConfigUpdate();
                  },
                }),
              },
              {
                key: "discord_mode",
                label: "简略状态显示",
                type: "select",
                description: "不打开详细信息面板时，在用户名下方显示的小字",
                options: [
                  { label: "应用名", value: "Name" },
                  { label: "歌曲名", value: "Details" },
                  { label: "歌手名", value: "State" },
                ],
                value: computed({
                  get: () => settingStore.discordRpc.displayMode,
                  set: (v) => {
                    settingStore.discordRpc.displayMode = v;
                    handleDiscordConfigUpdate();
                  },
                }),
              },
            ],
          },
        ],
      },
      {
        title: "WebSocket 配置",
        show: isElectron,
        items: [
          {
            key: "socket_enabled",
            label: "启用 WebSocket",
            type: "switch",
            description: "开启后可通过 WebSocket 获取状态或控制播放器",
            value: computed({
              get: () => socketEnabled.value,
              set: (v) => handleSocketEnabledUpdate(v),
            }),
          },
          {
            key: "socket_port",
            label: "WebSocket 端口",
            type: "input-number",
            description: "更改后需要测试并保存才能生效",
            componentProps: { min: 1, max: 65535, showButton: false, placeholder: "请输入端口号" },
            disabled: computed(() => socketEnabled.value),
            value: computed({
              get: () => socketPort.value,
              set: (v) => (socketPort.value = v || 25885),
            }),
          },
          {
            key: "socket_test",
            label: "测试端口配置",
            type: "button",
            buttonLabel: "测试并保存",
            show: computed(() => socketPort.value !== socketPortSaved.value),
            action: testSocketPort,
            componentProps: { type: "primary" },
          },
        ],
      },
    ],
  };
};
