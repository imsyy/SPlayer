<template>
  <n-flex vertical size="large">
    <n-alert :show-icon="false" type="warning">
      {{ t("modal.amll.warning") }}
    </n-alert>

    <n-text>
      <span v-html="t('modal.amll.tip').replace('%s', '<span class=\'replace-part\'>%s</span>')"></span>
    </n-text>

    <n-input
      v-model:value="serverUrl"
      :status="inputStatus"
      :allow-input="noSideSpace"
      :placeholder="t('modal.amll.placeholder')"
    />

    <n-text depth="3">
      {{ t("modal.amll.more") }}
      <n-a @click="openLink('https://github.com/Steve-xmh/amll-ttml-db')"> AMLL TTML DB </n-a>
      {{ t("modal.amll.repo") }}
    </n-text>

    <!-- <n-collapse class="servers-collapse">
      <n-collapse-item title="推荐服务器" name="servers">
        <n-flex vertical size="medium">
          <n-card
            v-for="server in amllDbServers"
            :key="server.value"
            size="small"
            hoverable
            @click="selectServer(server.value)"
          >
            <n-flex vertical size="small">
              <n-text>{{ server.label }}</n-text>
              <n-text depth="3">{{ server.description }}</n-text>
              <n-text depth="3" class="server-url" v-html="renderHighlight(server.value)" />
            </n-flex>
          </n-card>
        </n-flex>
      </n-collapse-item>
    </n-collapse> -->

    <n-flex justify="end">
      <n-button @click="props.onClose()">{{ t("modal.cancel") }}</n-button>
      <n-button type="primary" @click="handleConfirm">{{ t("modal.confirm") }}</n-button>
    </n-flex>
  </n-flex>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { isValidURL } from "@/utils/validate";
// import { amllDbServers } from "@/utils/meta";
import { useSettingStore } from "@/stores";
import { openLink } from "@/utils/helper";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = defineProps<{ onClose: () => void }>();

const settingStore = useSettingStore();
const serverUrl = ref(settingStore.amllDbServer);
const inputStatus = ref<"success" | "error" | "warning">("success");

const noSideSpace = (value: string) => value.trim() === value;

const isValidServer = (url: string) => isValidURL(url) && url.includes("%s");

// 点击确认
const handleConfirm = async () => {
  const url = serverUrl.value;
  // 验证 URL 格式和 %s
  if (isValidServer(url)) {
    await window.api.store.set("amllDbServer", url);
    settingStore.amllDbServer = url;
    window.$message.success(t("modal.amll.updateSuccess"));
    props.onClose();
  } else {
    window.$message.error(t("modal.amll.formatError"));
  }
};


// 输入变动时向输入框反馈
watch(serverUrl, (url: string) => {
  inputStatus.value = isValidServer(url) ? "success" : "error";
});
</script>

<style scoped lang="scss">
.servers-collapse {
  .n-card {
    cursor: pointer;
    &:hover {
      border-color: rgba(var(--primary), 0.58);
    }
  }
  .server-url {
    font-size: 12px;
    margin-top: 4px;
    padding: 4px 8px;
    background: var(--n-code-color);
    border-radius: 4px;
    word-break: break-all;

    :deep(.replace-part) {
      color: var(--n-color-target);
    }
  }
}

.replace-part {
  color: var(--n-color-target);
}
</style>
