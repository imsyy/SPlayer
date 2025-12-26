<template>
  <div class="sidebar-hide-manager">
    <n-scrollbar style="max-height: 400px" trigger="none">
      <div class="list">
        <n-card
          v-for="item in sidebarItems"
          :key="item.key"
          :content-style="{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
          }"
          class="item"
        >
          <n-text class="name">{{ item.label }}</n-text>
          <n-switch
            :value="settingStore[item.key]"
            :round="false"
            @update:value="(val) => updateSetting(item.key, val)"
          />
        </n-card>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { NScrollbar } from "naive-ui";
import { useSettingStore } from "@/stores/setting";
import { useI18n } from "vue-i18n";
import { computed } from "vue";

const { t } = useI18n();

const settingStore = useSettingStore();

type SidebarHideKey =
  | "hideDiscover"
  | "hidePersonalFM"
  | "hideRadioHot"
  | "hideLike"
  | "hideCloud"
  | "hideDownload"
  | "hideLocal"
  | "hideHistory"
  | "hideUserPlaylists"
  | "hideLikedPlaylists"
  | "hideHeartbeatMode";

const sidebarItems = computed<{ label: string; key: SidebarHideKey }[]>(() => [
  { label: t("menu.discover"), key: "hideDiscover" },
  { label: t("menu.roaming"), key: "hidePersonalFM" },
  { label: t("menu.podcast"), key: "hideRadioHot" },
  { label: t("menu.myCollection"), key: "hideLike" },
  { label: t("menu.myCloud"), key: "hideCloud" },
  { label: t("menu.download"), key: "hideDownload" },
  { label: t("menu.local"), key: "hideLocal" },
  { label: t("menu.recent"), key: "hideHistory" },
  { label: t("menu.createdList"), key: "hideUserPlaylists" },
  { label: t("menu.collectedList"), key: "hideLikedPlaylists" },
  { label: t("menu.heartbeatMode"), key: "hideHeartbeatMode" },
]);

const updateSetting = (key: SidebarHideKey, val: boolean) => {
  // @ts-ignore
  settingStore[key] = val;
};
</script>

<style scoped lang="scss">
.list {
  margin-top: 12px;
  padding-right: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  .item {
    border-radius: 8px;
    .name {
      font-size: 16px;
      line-height: normal;
    }
    .n-switch {
      margin-left: auto;
    }
  }
}
</style>
