<template>
  <div class="setting-type">
    <template v-for="(node, index) in displayList" :key="node.key">
      <!-- Group Title -->
      <div
        v-if="node.type === 'group'"
        class="slide-in-item group-title"
        :class="{ 'first-group': !!node.isFirst }"
        :style="{ '--delay': highlightKey ? '0s' : `${Math.min(index, 15) * 0.03}s` }"
      >
        <n-h3 prefix="bar">
          {{ node.data.title }}
          <n-tag
            v-if="node.data.tags"
            v-for="tag in node.data.tags"
            :key="tag.text"
            :type="tag.type || 'default'"
            size="small"
            round
          >
            {{ tag.text }}
          </n-tag>
        </n-h3>
      </div>

      <!-- Setting Item -->
      <SettingItemRenderer
        v-else
        :item="node.data"
        class="slide-in-item"
        :highlighted="node.data.key === highlightKey"
        :style="{ '--delay': highlightKey ? '0s' : `${Math.min(index, 15) * 0.03}s` }"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { SettingGroup, SettingItem } from "@/types/settings";
import SettingItemRenderer from "./SettingItemRenderer.vue";

const props = defineProps<{
  groups: SettingGroup[];
  highlightKey?: string;
}>();

// 判断设置项是否显示
const isShow = (item: SettingItem) => {
  if (item.show === undefined) return true;
  if (typeof item.show === "function") return item.show();
  return toValue(item.show);
};

// 判断分组是否显示
const isShowGroup = (group: SettingGroup) => {
  if (group.show === undefined) return true;
  if (typeof group.show === "function") return group.show();
  return toValue(group.show);
};

// 扁平化列表以支持统一下标的动画延迟
const displayList = computed(() => {
  const list: Array<{
    type: "group" | "item";
    key: string;
    data: any;
    isFirst?: boolean;
  }> = [];

  let groupIndex = 0;
  props.groups.forEach((group) => {
    if (!isShowGroup(group)) return;

    // 添加分组标题
    list.push({
      type: "group",
      key: `group-${group.title}`,
      data: group,
      isFirst: groupIndex === 0,
    });

    // 添加设置项
    group.items.forEach((item) => {
      if (isShow(item)) {
        list.push({
          type: "item",
          key: item.key,
          data: item,
        });
      }
    });

    groupIndex++;
  });

  return list;
});
</script>

<style scoped lang="scss">
.group-title {
  padding-top: 30px;

  &.first-group {
    padding-top: 0;
  }
}
.slide-in-item {
  animation: slide-up-fade-in 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;
  animation-delay: var(--delay, 0s);
}
</style>
