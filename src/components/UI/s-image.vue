<!-- 图片组件 -->
<template>
  <Transition name="fade" mode="out-in">
    <div ref="imgContainer" :key="src" class="s-image">
      <!-- 加载图片 -->
      <Transition name="fade">
        <img v-if="!isLoaded" :src="defaultSrc" class="loading" alt="loading" />
      </Transition>
      <!-- 真实图片 -->
      <img
        v-if="src"
        ref="imgRef"
        :src="imgSrc"
        :key="imgSrc"
        :alt="alt || 'image'"
        :class="['cover', { loaded: isLoaded }]"
        @load="imageLoaded"
        @error="imageError"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src: string | undefined;
    defaultSrc?: string;
    alt?: string;
  }>(),
  {
    defaultSrc: "/images/song.jpg?assest",
  },
);

const emit = defineEmits<{
  // 加载完成
  load: [e: Event];
  // 加载失败
  error: [e: Event];
  // 可视状态变化
  "update:show": [show: boolean];
}>();

// 图片数据
const imgRef = ref<HTMLImageElement>();
const imgSrc = ref<string>();
const imgContainer = ref<HTMLImageElement>();

// 是否加载完成
const isLoaded = ref<boolean>(false);

// 是否可视
const isCanLook = useElementVisibility(imgContainer);

// 图片加载完成
const imageLoaded = (e: Event) => {
  isLoaded.value = true;
  // 加载完成
  emit("load", e);
};

// 图片加载失败
const imageError = (e: Event) => {
  isLoaded.value = false;
  imgSrc.value = props.defaultSrc;
  // 加载失败
  emit("error", e);
};

// 可视状态变化
watchOnce(isCanLook, (show) => {
  emit("update:show", show);
  if (show) imgSrc.value = props.src;
});
</script>

<style lang="scss" scoped>
.s-image {
  position: relative;
  width: 100%;
  height: 100%;
  img {
    width: 100%;
    height: 100%;
    overflow: hidden;
    transition: all 0.3s;
  }
  .loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }
  .cover {
    // position: absolute;
    // top: 0;
    // left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    opacity: 0;
    &.loaded {
      opacity: 1;
    }
  }
}
</style>
