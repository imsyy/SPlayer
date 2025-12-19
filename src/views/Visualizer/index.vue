<template>
  <div class="visualizer-container">
    <div 
      class="visualizer-bar" 
      :style="{ 
        height: `${visualHeight}%`,
        backgroundColor: `rgba(${color}, ${opacity})`,
        boxShadow: `0 0 15px rgba(${color}, ${opacity * 0.5})`
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const visualHeight = ref(0);
const color = ref('255, 255, 255');
const opacity = ref(0.8);

let currentHeight = 0;
const lerp = (start: number, end: number, amt: number) => {
  return (1 - amt) * start + amt * end;
};

onMounted(() => {
  // @ts-ignore
  if (window.electron && window.electron.ipcRenderer) {
    window.electron.ipcRenderer.on('audio-data', (_event, data: number) => {
      const targetHeight = Math.min(data * 100, 92);
      // 上升非常快，下降慢，制造冲击感
      const lerpFactor = targetHeight > currentHeight ? 0.85 : 0.12;
      currentHeight = lerp(currentHeight, targetHeight, lerpFactor);
      visualHeight.value = currentHeight;
    });
    
    window.electron.ipcRenderer.on('update-theme', (_event, themeColor: string) => {
      color.value = themeColor;
    });

    window.electron.ipcRenderer.on('update-visualizer-opacity', (_event, newOpacity: number) => {
      opacity.value = newOpacity;
    });
  }
});

onUnmounted(() => {
  // @ts-ignore
  if (window.electron && window.electron.ipcRenderer) {
    window.electron.ipcRenderer.removeAllListeners('audio-data');
    window.electron.ipcRenderer.removeAllListeners('update-theme');
    window.electron.ipcRenderer.removeAllListeners('update-visualizer-opacity');
  }
});
</script>

<style scoped>
.visualizer-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: transparent;
  overflow: hidden;
}

.visualizer-bar {
  width: 100%;
  min-height: 4px;
  transition: height 0.03s ease-out;
  border-radius: 6px;
}

:global(body) {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent !important;
}
</style>
