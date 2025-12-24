<template>
  <n-icon v-if="name" :size="size" :color="color" :depth="depth" role="img" aria-hidden="true">
    <div ref="svgContainer" :style="containerStyle" class="svg-container" v-html="svgContent"></div>
  </n-icon>
</template>

<script setup lang="ts">
interface Props {
  name: string;
  size?: string | number;
  color?: string;
  offset?: number;
  depth?: 1 | 2 | 3 | 4 | 5;
}

const props = defineProps<Props>();

/**
 * 使用 Vite 的 import.meta.glob 预读取所有图标
 * eager: true 表示同步导入，这些 SVG 内容会直接打包进主 JS 中
 * 这样可以避免运行时的异步 import() 请求
 */
const icons = import.meta.glob("../../assets/icons/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

const svgContent = ref<string>("");

// 计算容器样式
const containerStyle = computed(() => ({
  transform: props.offset ? `translateY(${props.offset}px)` : undefined,
}));

/**
 * 获取图标内容
 */
const resolveIcon = (iconName: string) => {
  const path = `../../assets/icons/${iconName}.svg`;
  const rawSvg = icons[path] as string;

  if (rawSvg) {
    svgContent.value = rawSvg;
  } else {
    console.warn(`[Icon] 找不到图标文件: ${iconName} at ${path}`);
    svgContent.value = "";
  }
};

// 监听名称变化同步更新
watch(
  () => props.name,
  (newName) => {
    resolveIcon(newName);
  },
);

onMounted(() => {
  resolveIcon(props.name);
});
</script>

<style lang="scss" scoped>
.n-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;

  .svg-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;

    :deep(svg) {
      width: 1em;
      height: 1em;
      fill: currentColor;
    }
  }
}
</style>
