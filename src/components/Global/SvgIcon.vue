<!-- 全局图标 -->
<template>
  <n-icon v-if="name" :size="size" :color="color" :depth="depth">
    <div ref="svgContainer" class="svg-container" />
  </n-icon>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string;
  size?: string | number;
  color?: string;
  depth?: 1 | 2 | 3 | 4 | 5;
}>();

const svgContent = ref<string>("");
const svgContainer = ref<HTMLElement | null>(null);

// 加载图标
const loadSVG = async (name: string) => {
  try {
    const svg = await import(`../../assets/icons/${name}.svg?raw`);
    svgContent.value = svg.default || svg;
    if (svgContainer.value) svgContainer.value.innerHTML = svgContent.value;
  } catch (error) {
    console.error(`Could not load SVG for icon name: ${name}`, error);
    svgContent.value = "";
  }
};

watch(
  () => props.name,
  (name) => loadSVG(name),
);

onMounted(() => loadSVG(props.name));
</script>

<style lang="scss" scoped>
.n-icon {
  margin: 0;
  padding: 0;
  // transition: all 0.3s;
  // color: var(--primary-hex);
  .svg-container {
    display: flex;
    align-items: center;
    justify-content: center;
    // color: var(--primary-hex);
  }
}
</style>
