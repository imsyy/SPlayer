<!-- 图片组件 -->
<template>
  <div ref="imgRef" class="s-image">
    <Transition name="fade" mode="out-in">
      <img :key="imgSrc" :src="imgSrc" :alt="alt || 'image'" />
    </Transition>
    <img v-if="!isLoaded" class="loading" :src="src" @load="imageLoaded" />
  </div>
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
  // 可视状态变化
  "update:show": [show: boolean];
}>();

// 图片数据
const imgRef = ref<HTMLImageElement>();
const imgSrc = ref<string>(props.defaultSrc);

// 是否加载完成
const isLoaded = ref<boolean>(false);

// 是否可视
const isCanLook = useElementVisibility(imgRef);

// 图片加载完成
const imageLoaded = (e: Event) => {
  isLoaded.value = true;
  // 加载完成
  emit("load", e);
};

// 可视状态变化
watchOnce(isCanLook, (show) => {
  if (show) imgSrc.value = props.src || props.defaultSrc;
  emit("update:show", show);
});
</script>

<style lang="scss" scoped>
.s-image {
  position: relative;
  img {
    width: 100%;
    height: 100%;
  }
  .loading {
    position: absolute;
    opacity: 0;
  }
}
</style>
