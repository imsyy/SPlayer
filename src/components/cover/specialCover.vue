<!-- 封面 - 特殊 -->
<template>
  <div v-if="cycle" class="all-cover">
    <Transition name="fade" mode="out-in">
      <n-grid
        v-if="data?.length"
        :cols="columns"
        class="cover-lists"
        responsive="screen"
        x-gap="20"
        y-gap="20"
      >
        <n-gi v-for="(item, index) in data" :key="index" @click.stop="jumpLink(item?.id)">
          <specialCoverCard
            :data="item"
            :height="height"
            :showSongs="showSongs"
            :showIcon="showIcon"
            :showDate="showDate"
          />
        </n-gi>
      </n-grid>
      <!-- 加载占位 -->
      <n-grid
        v-else
        :cols="columns"
        class="cover-lists-loading"
        responsive="screen"
        x-gap="20"
        y-gap="20"
      >
        <n-gi v-for="item in loadSize" :key="item">
          <n-card
            class="special-cover-loading"
            :style="{
              '--special-cover-height': height,
            }"
            :content-style="{
              padding: '0px',
              display: 'flex',
              alignItems: 'center',
            }"
          >
            <n-skeleton class="cover" />
            <div class="desc">
              <n-skeleton text round :repeat="2" />
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </Transition>
  </div>
  <div v-else class="all-cover">
    <specialCoverCard
      v-if="Object.keys(data)?.length"
      :data="data"
      :height="height"
      :showSongs="showSongs"
      :showIcon="showIcon"
      :showDate="showDate"
    />
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  // 是否循环
  cycle: {
    type: Boolean,
    default: false,
  },
  // 展示数据
  data: {
    type: [Object, Array],
    required: true,
  },
  // 显示歌曲
  showSongs: {
    type: Boolean,
    default: false,
  },
  // 高度
  height: {
    type: String,
    default: "100px",
  },
  // 自定义列数
  columns: {
    type: String,
    default: "1 s:2 l:3 xl:4",
  },
  // 加载占位数量
  loadSize: {
    type: Number,
    default: 4,
  },
  // 显示图标
  showIcon: {
    type: Boolean,
    default: true,
  },
  // 显示日期
  showDate: {
    type: Boolean,
    default: false,
  },
});

// 链接跳转
const jumpLink = (id) => {
  if (!id) return false;
  router.push({
    path: "/playlist",
    query: { id },
  });
};
</script>

<style lang="scss" scoped>
.special-cover-loading {
  height: var(--special-cover-height);
  border-radius: 16px;
  overflow: hidden;
  .cover {
    height: 100%;
    width: var(--special-cover-height);
    min-width: var(--special-cover-height);
  }
  .desc {
    width: 100%;
    display: flex;
    flex-direction: column;
    margin: 0 20px;
    :deep(.n-skeleton) {
      height: 20px;
      &:last-child {
        margin-top: 12px;
      }
    }
  }
}
</style>
