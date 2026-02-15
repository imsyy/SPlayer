<template>
  <div class="home-page-section-manager">
    <n-card
      :content-style="{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
      }"
      class="greeting-item"
    >
      <n-text class="name">显示主页问好</n-text>
      <n-switch v-model:value="settingStore.showHomeGreeting" :round="false" />
    </n-card>
    <div ref="sortableRef" class="sortable-list">
      <n-card
        v-for="item in settingStore.homePageSections"
        :key="item.key"
        :content-style="{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
        }"
        class="sortable-item"
      >
        <SvgIcon :depth="3" name="Menu" />
        <n-text class="name">{{ item.name }}</n-text>
        <n-switch v-model:value="item.visible" :round="false" />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { useSortable } from "@vueuse/integrations/useSortable";
import type { Options } from "sortablejs";
import SvgIcon from "@/components/Global/SvgIcon.vue";

const settingStore = useSettingStore();

const sortableRef = ref<HTMLElement | null>(null);

// 更新排序值
const updateSortOrder = () => {
  settingStore.homePageSections.forEach((item, index) => {
    item.order = index;
  });
};

// 拖拽
useSortable(sortableRef, settingStore.homePageSections, {
  animation: 150,
  handle: ".n-icon",
  onEnd: updateSortOrder,
} as Options);

onMounted(() => {
  // 初始化排序值
  updateSortOrder();
});
</script>

<style scoped lang="scss">
.greeting-item {
  border-radius: 8px;
  margin-bottom: 12px;
  .name {
    font-size: 16px;
    line-height: normal;
  }
  .n-switch {
    margin-left: auto;
  }
}
.sortable-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  .sortable-item {
    border-radius: 8px;
    .n-icon {
      font-size: 16px;
      cursor: move;
    }
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
