<!-- 侧边栏 -->
<template>
  <div class="sider-all">
    <!-- Logo -->
    <div :class="['logo', { collapsed: statusStore.menuCollapsed }]" @click="router.push('/')">
      <svg
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
      >
        <path
          d="M511.764091 131.708086a446.145957 446.145957 0 1 0 446.145957 446.145957 446.145957 446.145957 0 0 0-446.145957-446.145957z m0 519.76004A71.829499 71.829499 0 1 1 583.59359 580.530919 72.275645 72.275645 0 0 1 511.764091 651.468126z"
          fill="#F55E55"
          p-id="11551"
        />
        <path
          d="M802.205109 0.541175l-168.197026 37.030114a67.814185 67.814185 0 0 0-53.091369 66.029602V223.614153l3.569168 349.778431h114.213365V223.614153h108.859613a26.322611 26.322611 0 0 0 26.768758-26.322611V26.863786a26.768757 26.768757 0 0 0-32.122509-26.322611z"
          fill="#F9BBB8"
          p-id="11552"
        />
        <path
          d="M511.764091 386.457428a186.935156 186.935156 0 1 0 186.935156 186.48901A186.935156 186.935156 0 0 0 511.764091 386.457428z m0 264.564552a71.383353 71.383353 0 1 1 71.383353-71.383353 71.383353 71.383353 0 0 1-71.383353 71.383353z"
          fill="#F9BBB8"
          p-id="11553"
        />
      </svg>
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
    svg {
      height: 36px;
      path {
        &:nth-of-type(1) {
          fill: rgba(var(--primary), 0.29);
        }
        &:nth-of-type(2),
        &:nth-of-type(3) {
          fill: var(--primary-hex);
        }
      }
    }
    .n-text {
      width: 90px;
      font-size: 22px;
      // font-weight: bold;
      font-family: "logo";
      margin-left: 8px;
      margin-top: 2px;
      line-height: 40px;
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
