<!-- 图片组件 -->
<template>
  <div
    ref="imgContainer"
    :key="src"
    class="s-image"
    :class="{ round }"
    :style="{ width: size + 'px', height: size + 'px' }"
  >
    <!-- 加载图片 -->
    <Transition name="fade">
      <img v-if="!isLoaded" :src="defaultSrc" class="loading" alt="loading" />
    </Transition>
    <!-- 真实图片 -->
    <img
      v-if="imgSrc"
      ref="imgRef"
      :src="imgSrc"
      :key="imgSrc"
      :alt="alt || 'image'"
      :class="['cover', { loaded: isLoaded }]"
      :decoding="decodeAsync ? 'async' : 'auto'"
      :loading="nativeLazy ? 'lazy' : 'eager'"
      :style="{ objectFit: objectFit }"
      :crossorigin="crossorigin"
      @load="imageLoaded"
      @error="imageError"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** 图片地址 */
    src: string | undefined;
    /** 默认图片 */
    defaultSrc?: string;
    /** 图片描述 */
    alt?: string;
    /** 图片大小 */
    size?: number;
    /** 图片填充方式 */
    objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
    /** 是否进行可视状态变化 */
    observeVisibility?: boolean;
    /** 在不可视时是否释放图片以回收内存 */
    releaseOnHide?: boolean;
    /** 是否使用浏览器异步解码 */
    decodeAsync?: boolean;
    /** 是否使用原生懒加载 */
    nativeLazy?: boolean;
    /** 跨域 */
    crossorigin?: "" | "anonymous" | "use-credentials" | undefined;
    /** 圆角 */
    round?: boolean;
  }>(),
  {
    defaultSrc: "/images/song.jpg?asset",
    observeVisibility: true,
    releaseOnHide: false,
    decodeAsync: true,
    nativeLazy: true,
    objectFit: "cover",
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
// 可视状态上一次值，避免重复 emit
const lastShowState = ref<boolean | null>(null);
// 加载竞态 token，防止旧图片回调覆盖新状态
const loadToken = ref<number>(0);
const currentToken = ref<number>(0);

// 是否可视
const isCanLook = useElementVisibility(imgContainer);

// 图片加载完成
const imageLoaded = (e: Event) => {
  // 竞态保护：仅响应最新一次设置的图片
  if (currentToken.value !== loadToken.value) return;
  if (isLoaded.value) return;
  isLoaded.value = true;
  emit("load", e);
};

// 图片加载失败
const imageError = (e: Event) => {
  // 竞态保护
  if (currentToken.value !== loadToken.value) return;
  isLoaded.value = false;
  // 避免默认图也反复触发导致死循环
  if (imgSrc.value !== props.defaultSrc) {
    imgSrc.value = props.defaultSrc;
  }
  emit("error", e);
};

// 可视状态变化（可控）
watch(
  isCanLook,
  (show) => {
    if (!props.observeVisibility) return;
    // 去重：仅在状态变化时触发
    if (lastShowState.value !== show) {
      lastShowState.value = show;
      emit("update:show", show);
    }
    if (show) {
      // 进入可视区再加载，避免重复赋值
      if (imgSrc.value !== props.src) {
        loadToken.value += 1;
        currentToken.value = loadToken.value;
        imgSrc.value = props.src;
      }
    } else if (props.releaseOnHide) {
      // 释放图片以回收内存
      if (imgSrc.value !== undefined) imgSrc.value = undefined;
    }
  },
  { immediate: true },
);

// 监听 src 变化
watch(
  () => props.src,
  (val) => {
    isLoaded.value = false;
    // 不同值时才进行赋值，减少重绘
    if (props.observeVisibility) {
      if (isCanLook.value) {
        if (imgSrc.value !== val) {
          loadToken.value += 1;
          currentToken.value = loadToken.value;
          imgSrc.value = val;
        }
      } else {
        if (props.releaseOnHide) {
          if (imgSrc.value !== undefined) imgSrc.value = undefined;
        }
      }
    } else {
      if (imgSrc.value !== val) {
        loadToken.value += 1;
        currentToken.value = loadToken.value;
        imgSrc.value = val;
      }
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  try {
    if (imgRef.value) imgRef.value.src = "";
  } catch {
    /* empty */
  }
  imgSrc.value = undefined;
  imgRef.value = undefined;
  imgContainer.value = undefined;
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
    // top: 0;
    // left: 0;
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
  &.round {
    border-radius: 50%;
    overflow: hidden;
  }
}
</style>
