<template>
  <n-card class="set-item" content-style="flex-direction: column; padding: 16px;">
    <n-flex justify="space-between" align="center" style="width: 100%">
      <div class="label">
        <n-text class="name">{{ item?.label || "本地歌词覆盖在线歌词" }}</n-text>
        <n-text class="tip" :depth="3" v-if="item?.description" v-html="item.description" />
        <n-text class="tip" :depth="3" v-else>
          可在这些文件夹及其子文件夹内覆盖在线歌曲的歌词 <br />
          将歌词文件命名为 `歌曲ID.后缀名` 或者 `任意前缀.歌曲ID.后缀名` 即可 <br />
          支持 .lrc 和 .ttml 格式 <br />
          （提示：可以在前缀加上歌名等信息，也可以利用子文件夹分类管理）
        </n-text>
      </div>
      <n-button strong secondary @click="changeLocalLyricPath()">
        <template #icon>
          <SvgIcon name="Folder" />
        </template>
        添加
      </n-button>
    </n-flex>
    <n-collapse-transition :show="settingStore.localLyricPath.length > 0">
      <n-card
        v-for="(path, index) in settingStore.localLyricPath"
        :key="index"
        class="set-item sub-item"
        content-style="padding: 4px 16px"
      >
        <n-flex justify="space-between" align="center" style="width: 100%">
          <div class="label">
            <n-text class="name">{{ path }}</n-text>
          </div>
          <n-button strong secondary @click="changeLocalLyricPath(index)">
            <template #icon>
              <SvgIcon name="Delete" />
            </template>
          </n-button>
        </n-flex>
      </n-card>
    </n-collapse-transition>
  </n-card>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { changeLocalLyricPath } from "@/utils/helper";
import { SettingItem } from "@/types/settings";

defineProps<{
  item?: SettingItem;
}>();

const settingStore = useSettingStore();
</script>

<style scoped lang="scss">
.sub-item {
  margin-top: 12px;
  background-color: rgba(var(--primary), 0.05);
}
</style>
