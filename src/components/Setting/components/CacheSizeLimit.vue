<template>
  <n-card class="set-item">
    <div class="label">
      <n-text class="name">{{ item?.label || "缓存大小上限" }}</n-text>
      <n-text class="tip" :depth="3" v-if="item?.description" v-html="item.description" />
      <n-text class="tip" :depth="3" v-else>
        达到上限后将清理最旧的缓存，可以是小数，最低 2GB
      </n-text>
    </div>
    <n-input-group class="set">
      <n-input-number
        :value="cacheLimit"
        :update-value-on-input="false"
        :min="2"
        :max="9999"
        :style="{
          width: cacheLimited ? '55%' : '0%',
          transition: 'width 0.3s',
        }"
        @update:value="onUpdateLimit"
      />
      <n-select
        v-model:value="cacheLimited"
        :options="[
          { label: '不限制', value: 0 },
          { label: cacheLimited === 0 ? '自定义大小 (GB)' : 'GB', value: 1 },
        ]"
        :style="{
          width: cacheLimited ? '45%' : '100%',
          transition: 'width 0.3s',
        }"
        @update:value="onUpdateLimited"
      />
    </n-input-group>
  </n-card>
</template>

<script setup lang="ts">
import { SettingItem } from "@/types/settings";

defineProps<{ item?: SettingItem }>();

const cacheLimit = ref<number>(10);
const cacheLimited = ref<number>(1);

const changeCacheLimit = async (value: number) => {
  await window.api.store.set("cacheLimit", value);
};

const onUpdateLimit = (value: number | null) => {
  cacheLimit.value = value ?? 2;
  changeCacheLimit(cacheLimit.value);
};

const onUpdateLimited = (value: number) => {
  if (value === 0) {
    changeCacheLimit(0);
  } else {
    if (cacheLimit.value === 0) cacheLimit.value = 2;
    changeCacheLimit(cacheLimit.value);
  }
};

onMounted(async () => {
  try {
    const limit = await window.api.store.get("cacheLimit");
    if (typeof limit === "number") {
      cacheLimit.value = limit;
      if (limit === 0) cacheLimited.value = 0;
    }
  } catch (error) {
    console.error("读取缓存配置失败:", error);
  }
});
</script>
