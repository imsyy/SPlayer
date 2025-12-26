<!-- 本地设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.third.lastfmTitle") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.third.lastfmEnable") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.third.lastfmEnableTip") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.lastfm.enabled" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.lastfm.enabled">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.third.apiKey") }}</n-text>
            <n-text class="tip" :depth="3">
              {{ t("settings.third.apiKeyTipBefore") }}
              <n-a href="https://www.last.fm/api/account/create" target="_blank">{{ t("settings.third.apiKeyTipLink") }}</n-a>
              {{ t("settings.third.apiKeyTipAfter") }}
            </n-text>
          </div>

          <n-input
            v-model:value="settingStore.lastfm.apiKey"
            :placeholder="t('settings.third.apiKeyPlaceholder')"
            class="set"

            type="text"
          />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.third.apiSecret") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.third.apiSecretTip") }}</n-text>
          </div>

          <n-input
            v-model:value="settingStore.lastfm.apiSecret"
            :placeholder="t('settings.third.apiSecretPlaceholder')"
            class="set"

            type="password"
            show-password-on="click"
          />
        </n-card>
        <n-card v-if="!settingStore.lastfm.sessionKey" class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.third.connectTitle") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.third.connectTip") }}</n-text>
          </div>

          <n-button
            type="primary"
            strong
            secondary
            :loading="lastfmAuthLoading"
            :disabled="!settingStore.isLastfmConfigured"
            @click="connectLastfm"
          >
            {{ t("settings.third.connectBtn") }}
          </n-button>

        </n-card>
        <n-card v-else class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.third.connectedTitle") }}</n-text>
            <n-text class="tip" :depth="3">{{ settingStore.lastfm.username }}</n-text>
          </div>
          <n-button type="error" strong secondary @click="disconnectLastfm"> {{ t("settings.third.disconnectBtn") }} </n-button>
        </n-card>

        <n-card v-if="settingStore.lastfm.sessionKey" class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.third.scrobbleTitle") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.third.scrobbleTip") }}</n-text>
          </div>

          <n-switch
            class="set"
            v-model:value="settingStore.lastfm.scrobbleEnabled"
            :round="false"
          />
        </n-card>
        <n-card v-if="settingStore.lastfm.sessionKey" class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.third.nowPlayingTitle") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.third.nowPlayingTip") }}</n-text>
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
      <n-h3 prefix="bar"> {{ t("settings.third.wsTitle") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.third.wsEnable") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.third.wsEnableTip") }} </n-text>
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
          <n-text class="name">{{ t("settings.third.wsPort") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.third.wsPortTip") }} </n-text>
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
              {{ t("settings.third.wsTestBtn") }}
            </n-button>

          </Transition>
          <n-input-number
            v-model:value="socketPort"
            :disabled="socketEnabled"
            :show-button="false"
            :min="1"
            :max="65535"
            :placeholder="t('settings.third.wsPortPlaceholder')"
            class="set"
          />

        </n-flex>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { getAuthToken, getAuthUrl, getSession } from "@/api/lastfm";
import { isElectron } from "@/utils/env";
import { useI18n } from "vue-i18n";

const settingStore = useSettingStore();
const { t } = useI18n();

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
      throw new Error(t("settings.third.authErrorToken"));
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
            window.$message.warning(t("settings.third.authCancel"));
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

            window.$message.success(t("settings.third.authSuccess", { name: sessionResponse.session.name }));
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
          window.$message.warning(t("settings.third.authTimeout"));
        }

      }, 30000);
    }
  } catch (error: any) {
    console.error("Last.fm 连接失败:", error);
    window.$message.error(t("settings.third.authFail", { message: error.message || t("settings.third.unknownError") }));

    lastfmAuthLoading.value = false;
  }

};

/**
 * 断开 Last.fm 账号
 */
const disconnectLastfm = () => {
  window.$dialog.warning({
    title: t("settings.third.disconnectTitle"),
    content: t("settings.third.disconnectContent"),
    positiveText: t("general.dialog.ok"), // "确定"
    negativeText: t("general.dialog.cancel"), // "取消"
    onPositiveClick: () => {
      settingStore.lastfm.sessionKey = "";
      settingStore.lastfm.username = "";
      window.$message.success(t("settings.third.disconnectSuccess"));
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
      window.$message.warning(t("settings.third.wsWarning"));
      socketEnabled.value = false;
      return;
    }


    const result = await window.electron.ipcRenderer.invoke("socket-start");
    if (result?.success) {
      socketEnabled.value = true;
      await saveSocketConfig();
      window.$message.success(t("settings.third.wsStartSuccess"));
    } else {
      window.$message.error(result?.message ?? t("settings.third.wsStartFail"));
      // 回退开关状态
      socketEnabled.value = false;
    }

  } else {
    const result = await window.electron.ipcRenderer.invoke("socket-stop");
    if (result?.success) {
      socketEnabled.value = false;
      await saveSocketConfig();
      window.$message.success(t("settings.third.wsStopSuccess"));
    } else {
      window.$message.error(result?.message ?? t("settings.third.wsStopFail"));
      socketEnabled.value = true;
    }

  }
};

// 测试 socket 端口
const testSocketPort = async () => {
  if (!isElectron) return;
  if (!socketPort.value) {
    window.$message.error(t("settings.third.wsPortError"));
    return;
  }

  socketTestLoading.value = true;
  try {
    const result = await window.electron.ipcRenderer.invoke("socket-test-port", socketPort.value);
    if (result?.success) {
      await saveSocketConfig();
      socketPortSaved.value = socketPort.value;
      window.$message.success(t("settings.third.wsSaveSuccess"));
    } else {
      window.$message.error(result?.message ?? t("settings.third.wsPortFail"));
    }

  } finally {
    socketTestLoading.value = false;
  }
};

onMounted(() => {
  initSocketConfig();
});
</script>
