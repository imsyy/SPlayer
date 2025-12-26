<!-- 工具设置 -->
<template>
  <div class="setting-type">
    <!-- 快捷键设置 -->
    <div class="set-list">
      <n-h3 prefix="bar"> 全局快捷键 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">开启全局快捷键</n-text>
          <n-text class="tip" :depth="3">可能会导致与其他软件相互冲突，请谨慎开启</n-text>
        </div>
        <n-switch
          class="set"
          v-model:value="shortcutStore.globalOpen"
          :round="false"
          @update:value="updateGlobalOpen"
        />
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 全局快捷键更改 </n-h3>
      <n-card id="shortcut-list" class="set-item">
        <n-list
          v-for="(item, key, index) in globalShortcutList"
          :key="index"
          class="shortcut"
          hoverable
        >
          <n-list-item>
            <template #prefix>
              <n-text class="name">{{ item.name }}</n-text>
            </template>
            <n-thing>
              <n-flex>
                <n-input
                  :value="item.shortcut"
                  placeholder="快捷键为空"
                  readonly
                  @focus="inputFocus(key)"
                  @blur="inputBlur"
                  @keydown.stop="inputKeyDown"
                  @keyup="keyHandled = ''"
                />
                <n-input
                  :value="item.globalShortcut"
                  :disabled="!shortcutStore.globalOpen"
                  :status="item.globalShortcut && item?.isRegistered ? 'error' : undefined"
                  placeholder="快捷键为空"
                  readonly
                  @focus="inputFocus(key, true)"
                  @blur="inputBlur"
                  @keydown.stop="inputKeyDown"
                  @keyup="keyHandled = ''"
                >
                  <template #prefix>
                    <n-text :depth="3">全局</n-text>
                  </template>
                </n-input>
              </n-flex>
            </n-thing>
          </n-list-item>
        </n-list>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">恢复全局默认</n-text>
        </div>
        <n-button type="primary" strong secondary @click="resetShortcut"> 恢复默认 </n-button>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 页面内快捷键 </n-h3>
      <n-card id="page-shortcut-list" class="set-item">
        <n-list
          v-for="(item, key, index) in pageShortcutList"
          :key="index"
          class="shortcut"
          hoverable
        >
          <n-list-item>
            <template #prefix>
              <n-text class="name">{{ item.name }}</n-text>
            </template>
            <n-thing>
              <n-input
                :value="item.shortcut"
                placeholder="快捷键为空"
                readonly
                @focus="inputFocus(key)"
                @blur="inputBlur"
                @keydown.stop="inputKeyDown"
                @keyup="keyHandled = ''"
              />
            </n-thing>
          </n-list-item>
        </n-list>
      </n-card>
    </div>

    <!-- 第三方设置 -->
    <div class="set-list">
      <n-h3 prefix="bar"> Last.fm 集成 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">启用 Last.fm</n-text>
          <n-text class="tip" :depth="3">开启后可记录播放历史到 Last.fm</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.lastfm.enabled" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.lastfm.enabled">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">API Key</n-text>
            <n-text class="tip" :depth="3">
              在
              <n-a href="https://www.last.fm/api/account/create" target="_blank">Last.fm API</n-a>
              创建应用获取
            </n-text>
          </div>
          <n-input
            v-model:value="settingStore.lastfm.apiKey"
            placeholder="请输入 API Key"
            class="set"
            type="text"
          />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">API Secret</n-text>
            <n-text class="tip" :depth="3">Shared Secret，用于签名验证</n-text>
          </div>
          <n-input
            v-model:value="settingStore.lastfm.apiSecret"
            placeholder="请输入 API Secret"
            class="set"
            type="password"
            show-password-on="click"
          />
        </n-card>
        <n-card v-if="!settingStore.lastfm.sessionKey" class="set-item">
          <div class="label">
            <n-text class="name">连接 Last.fm 账号</n-text>
            <n-text class="tip" :depth="3">首次使用需要授权连接</n-text>
          </div>
          <n-button
            type="primary"
            strong
            secondary
            :loading="lastfmAuthLoading"
            :disabled="!settingStore.isLastfmConfigured"
            @click="connectLastfm"
          >
            连接账号
          </n-button>
        </n-card>
        <n-card v-else class="set-item">
          <div class="label">
            <n-text class="name">已连接账号</n-text>
            <n-text class="tip" :depth="3">{{ settingStore.lastfm.username }}</n-text>
          </div>
          <n-button type="error" strong secondary @click="disconnectLastfm"> 断开连接 </n-button>
        </n-card>
        <n-card v-if="settingStore.lastfm.sessionKey" class="set-item">
          <div class="label">
            <n-text class="name">Scrobble（播放记录）</n-text>
            <n-text class="tip" :depth="3">自动记录播放历史到 Last.fm</n-text>
          </div>
          <n-switch
            class="set"
            v-model:value="settingStore.lastfm.scrobbleEnabled"
            :round="false"
          />
        </n-card>
        <n-card v-if="settingStore.lastfm.sessionKey" class="set-item">
          <div class="label">
            <n-text class="name">正在播放状态</n-text>
            <n-text class="tip" :depth="3">向 Last.fm 同步正在播放的歌曲</n-text>
          </div>
          <n-switch
            class="set"
            v-model:value="settingStore.lastfm.nowPlayingEnabled"
            :round="false"
          />
        </n-card>
      </n-collapse-transition>
    </div>

    <div v-if="isElectron" class="set-list">
      <n-h3 prefix="bar"> WebSocket 配置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">启用 WebSocket</n-text>
          <n-text class="tip" :depth="3"> 开启后可通过 WebSocket 获取状态或控制播放器 </n-text>
        </div>
        <n-switch
          class="set"
          v-model:value="socketEnabled"
          :round="false"
          @update:value="handleSocketEnabledUpdate"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">WebSocket 端口</n-text>
          <n-text class="tip" :depth="3"> 更改后需要测试并保存才能生效 </n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="socketPort !== socketPortSaved"
              type="primary"
              strong
              secondary
              :loading="socketTestLoading"
              @click="testSocketPort"
            >
              测试并保存
            </n-button>
          </Transition>
          <n-input-number
            v-model:value="socketPort"
            :disabled="socketEnabled"
            :show-button="false"
            :min="1"
            :max="65535"
            placeholder="请输入端口号"
            class="set"
          />
        </n-flex>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useShortcutStore, useSettingStore } from "@/stores";
import { formatForGlobalShortcut } from "@/utils/helper";
import { cloneDeep, debounce, includes, some } from "lodash-es";
import { getAuthToken, getAuthUrl, getSession } from "@/api/lastfm";
import { isElectron } from "@/utils/env";

const shortcutStore = useShortcutStore();
const settingStore = useSettingStore();

// Keyboard Logic =============================================================

// 选中快捷键
const selectShortcut = ref<string | null>(null);
const selectGlobal = ref<boolean>(false);

// 按键标志位 - 防止重复触发
const keyHandled = ref<string>("");

// 快捷键列表
const shortcutList = ref(cloneDeep(shortcutStore.shortcutList));

// 全局快捷键列表（排除页面内快捷键）
const globalShortcutList = computed(() => {
  const pageShortcutKeys = ["openPlayer", "openPlayList", "closePlayer"];
  return Object.entries(shortcutList.value)
    .filter(([key]) => !pageShortcutKeys.includes(key))
    .reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, (typeof shortcutList.value)[keyof typeof shortcutList.value]>,
    );
});

// 页面内快捷键列表
const pageShortcutList = computed(() => {
  const pageShortcutKeys = ["openPlayer", "openPlayList", "closePlayer"];
  return Object.entries(shortcutList.value)
    .filter(([key]) => pageShortcutKeys.includes(key))
    .reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, (typeof shortcutList.value)[keyof typeof shortcutList.value]>,
    );
});

// 获取按下的快捷键
const getShortcut = (e: KeyboardEvent): string => {
  // 允许输入
  const allowedCodes = [
    // 字母 a-z
    "KeyA",
    "KeyB",
    "KeyC",
    "KeyD",
    "KeyE",
    "KeyF",
    "KeyG",
    "KeyH",
    "KeyI",
    "KeyJ",
    "KeyK",
    "KeyL",
    "KeyM",
    "KeyN",
    "KeyO",
    "KeyP",
    "KeyQ",
    "KeyR",
    "KeyS",
    "KeyT",
    "KeyU",
    "KeyV",
    "KeyW",
    "KeyX",
    "KeyY",
    "KeyZ",
    // 数字 0-9
    "Digit0",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Numpad0",
    "Numpad1",
    "Numpad2",
    "Numpad3",
    "Numpad4",
    "Numpad5",
    "Numpad6",
    "Numpad7",
    "Numpad8",
    "Numpad9",
    // 空格
    "Space",
    // 方向键
    "ArrowLeft",
    "ArrowUp",
    "ArrowRight",
    "ArrowDown",
    // Escape 键
    "Escape",
  ];
  if (!allowedCodes.includes(e.code)) return "";
  return e.code;
};

// 获得焦点
const inputFocus = (type: string, isGlobal: boolean = false) => {
  selectShortcut.value = type;
  selectGlobal.value = isGlobal;
  if (isGlobal) {
    window.electron.ipcRenderer.send("unregister-all-shortcut");
  }
};

// 失去焦点
const inputBlur = async () => {
  if (selectShortcut.value) {
    await shortcutStore.registerAllShortcuts();
    // 重新检查所有全局快捷键占用状态
    await checkAllGlobalShortcuts();
  }
  selectShortcut.value = null;
  selectGlobal.value = false;
};

// 键盘按下
const inputKeyDown = async (e: KeyboardEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (!selectShortcut.value) return;
  // 记录标志位
  if (e.code === keyHandled.value) return;
  keyHandled.value = e.code;
  // 删除键
  if (e.code === "Backspace") {
    changeShortcut("");
    return;
  }
  // 特殊按键
  const isCtrl = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const isAlt = e.altKey;
  // 快捷键
  const keyCode = getShortcut(e);
  const shortcut = [isCtrl && "CmdOrCtrl", isShift && "Shift", isAlt && "Alt", keyCode]
    .filter(Boolean)
    .join("+");
  console.log(keyCode, e, [isCtrl && "CmdOrCtrl", isShift && "Shift", isAlt && "Alt", keyCode]);
  // 更改快捷键
  if (isRepeat(shortcut)) {
    window.$message.warning("快捷键设置冲突");
  } else {
    // 全局快捷键
    if (selectGlobal.value) {
      // 若为单个按键
      const key = isCtrl || isShift || isAlt ? shortcut : "CmdOrCtrl+Shift+" + keyCode;
      const globalShortcut = formatForGlobalShortcut(key);
      if (!globalShortcut) return;
      // 先更改
      shortcutList.value[selectShortcut.value].globalShortcut = globalShortcut;
      // 是否被占用
      const isRegistered = await checkRegistered(globalShortcut);
      if (isRegistered) {
        window.$message.warning("快捷键已被占用");
      } else {
        window.$message.success("快捷键设置成功");
      }
      changeShortcut(globalShortcut);
    } else {
      // 页面内快捷键或全局快捷键的页面内部分
      changeShortcut(shortcut);
      window.$message.success("快捷键设置成功");
    }
  }
};

// 更改快捷键
const changeShortcut = async (shortcut: string) => {
  if (!selectShortcut.value) return;
  shortcutList.value[selectShortcut.value][selectGlobal.value ? "globalShortcut" : "shortcut"] =
    shortcut;
  shortcutStore.shortcutList[selectShortcut.value][
    selectGlobal.value ? "globalShortcut" : "shortcut"
  ] = shortcut;
};

// 快捷键是否重复
const isRepeat = (shortcut: string): boolean => {
  return some(Object.values(shortcutStore.shortcutList), (item) => {
    return includes([item.shortcut, item.globalShortcut], shortcut);
  });
};

// 是否被占用
const checkRegistered = debounce(async (shortcut: string, shortcutKey?: string) => {
  try {
    if (!shortcut) return false;
    const targetKey = shortcutKey || selectShortcut.value;
    if (!targetKey) return false;
    const isRegistered = await window.electron.ipcRenderer.invoke(
      "is-shortcut-registered",
      formatForGlobalShortcut(shortcut),
    );
    // 更新状态
    shortcutList.value[targetKey].isRegistered = isRegistered;
    return isRegistered;
  } catch (error) {
    console.error("Error checking shortcut registration:", error);
    window.$message.error("快捷键检查出现错误");
    if (selectShortcut.value) {
      changeShortcut("");
    }
    return false;
  }
}, 500);

// 检查所有全局快捷键占用状态
const checkAllGlobalShortcuts = async () => {
  if (!shortcutStore.globalOpen) return;
  for (const key in shortcutList.value) {
    const item = shortcutList.value[key];
    if (item.globalShortcut) {
      await checkRegistered(item.globalShortcut, key);
    }
  }
};

// 开关全局快捷键
const updateGlobalOpen = async (val: boolean) => {
  if (val) {
    await shortcutStore.registerAllShortcuts();
    // 重新检查所有全局快捷键占用状态
    await checkAllGlobalShortcuts();
  } else {
    window.electron.ipcRenderer.send("unregister-all-shortcut");
    // 清除所有占用状态
    for (const key in shortcutList.value) {
      shortcutList.value[key].isRegistered = false;
    }
  }
};

// 重置快捷键
const resetShortcut = () => {
  window.$dialog.warning({
    title: "重置快捷键",
    content: "确定重置当前快捷键配置？",
    positiveText: "重置",
    negativeText: "取消",
    onPositiveClick: () => {
      shortcutStore.$reset();
      shortcutList.value = cloneDeep(shortcutStore.shortcutList);
      window.$message.success("快捷键重置成功");
    },
  });
};

// ThirdParty Logic ===========================================================

const lastfmAuthLoading = ref(false);

// socket
const socketPort = ref(25885);
const socketEnabled = ref(false);
const socketTestLoading = ref(false);
const socketPortSaved = ref<number | null>(null);

/**
 * 连接 Last.fm 账号
 */
const connectLastfm = async () => {
  try {
    lastfmAuthLoading.value = true;

    // 获取认证令牌
    const tokenResponse = await getAuthToken();
    if (!tokenResponse.token) {
      throw new Error("无法获取认证令牌");
    }

    const token = tokenResponse.token;

    // 打开授权页面
    const authUrl = getAuthUrl(token);
    if (typeof window !== "undefined") {
      const authWindow = window.open(authUrl, "_blank", "width=800,height=600");

      // 轮询等待用户授权
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
          // 尝试获取会话
          const sessionResponse = await getSession(token);

          if (sessionResponse.session) {
            clearInterval(checkAuth);
            authWindow?.close();

            // 保存会话信息
            settingStore.lastfm.sessionKey = sessionResponse.session.key;
            settingStore.lastfm.username = sessionResponse.session.name;

            window.$message.success(`已成功连接到 Last.fm 账号: ${sessionResponse.session.name}`);
            lastfmAuthLoading.value = false;
          }
        } catch (error) {
          // 用户还未授权，继续等待
        }
      }, 2000);

      // 30秒超时
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
    // 如果端口未测试通过，提示用户先测试端口
    if (socketPort.value !== socketPortSaved.value) {
      window.$message.warning("请先测试并保存端口配置后再启用 WebSocket");
      socketEnabled.value = false;
      return;
    }

    const result = await window.electron.ipcRenderer.invoke("socket-start");
    if (result?.success) {
      socketEnabled.value = true;
      await saveSocketConfig();
      window.$message.success("WebSocket 服务已启动");
    } else {
      window.$message.error(result?.message ?? "WebSocket 启动失败");
      // 回退开关状态
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
  socketTestLoading.value = true;
  try {
    const result = await window.electron.ipcRenderer.invoke("socket-test-port", socketPort.value);
    if (result?.success) {
      await saveSocketConfig();
      socketPortSaved.value = socketPort.value;
      window.$message.success("已保存 WebSocket 配置");
    } else {
      window.$message.error(result?.message ?? "该端口不可用，请更换端口");
    }
  } finally {
    socketTestLoading.value = false;
  }
};

onMounted(async () => {
  // Keyboard
  shortcutStore.registerAllShortcuts();
  // 检查所有全局快捷键占用状态
  await checkAllGlobalShortcuts();

  // ThirdParty
  initSocketConfig();
});
</script>

<style lang="scss" scoped>
#shortcut-list,
#page-shortcut-list {
  overflow: hidden;
  :deep(.n-card__content) {
    padding: 0;
    flex-direction: column;
    overflow: hidden;
  }
  .shortcut {
    width: 100%;
    .name {
      display: flex;
      justify-content: center;
      min-width: 80px;
    }
    .n-input {
      user-select: none;
    }
  }
}
#page-shortcut-list {
  .shortcut {
    .name {
      min-width: 120px;
    }
  }
}
</style>
