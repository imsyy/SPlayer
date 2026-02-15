<!-- 侧边栏 -->
<template>
  <div class="sider-all">
    <!-- Logo -->
    <div :class="['logo', { collapsed: statusStore.menuCollapsed }]" @click="router.push('/')">
      <Logo />
      <n-text>SPlayer</n-text>
    </div>
    <n-scrollbar
      :style="{
        maxHeight: `calc(100vh - ${musicStore.isHasPlayer && statusStore.showPlayBar ? 150 : 70}px)`,
      }"
    >
      <Menu />
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { useStatusStore, useMusicStore } from "@/stores";

const router = useRouter();
const musicStore = useMusicStore();
const statusStore = useStatusStore();
</script>

<style lang="scss" scoped>
.sider-all {
  display: flex;
  flex-direction: column;
  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 70px;
    padding: 0 1rem;
    transition: transform 0.3s;
    cursor: pointer;
    .n-text {
      width: 90px;
      font-size: 22px;
      font-family: "logo";
      margin-left: 8px;
      margin-top: 2px;
      line-height: 40px;
      overflow: hidden;
      transition:
        width 0.3s,
        opacity 0.3s,
        margin 0.3s;
    }
    &.collapsed {
      .n-text {
        width: 0;
        opacity: 0;
        margin-left: 0;
      }
    }
    &:hover {
      transform: scale(1.05);
    }
    &:active {
      transform: scale(1);
    }
  }
}
</style>
