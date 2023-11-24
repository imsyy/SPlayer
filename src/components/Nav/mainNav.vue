<!-- 主导航栏 -->
<template>
  <nav class="main-nav">
    <div
      :class="['logo', status.asideMenuCollapsed ? 'collapsed' : null]"
      @click="router.push('/')"
    >
      <n-avatar class="logo-img" src="/images/logo/favicon.png?asset" />
      <Transition name="fade" mode="out-in">
        <n-text v-if="!status.asideMenuCollapsed" class="site-name">{{ siteName }}</n-text>
      </Transition>
    </div>
    <div class="navigation">
      <n-button class="nav-icon" quaternary @click="router.go(-1)">
        <template #icon>
          <n-icon>
            <SvgIcon icon="chevron-left" />
          </n-icon>
        </template>
      </n-button>
      <n-button class="nav-icon" quaternary @click="router.go(1)">
        <template #icon>
          <n-icon>
            <SvgIcon icon="chevron-right" />
          </n-icon>
        </template>
      </n-button>
    </div>
    <!-- 搜索框 -->
    <SearchInp />
    <!-- 用户信息 -->
    <userData />
  </nav>
</template>

<script setup>
import { siteStatus } from "@/stores";
import { useRouter } from "vue-router";

const router = useRouter();
const status = siteStatus();

// 站点信息
const siteName = import.meta.env.RENDERER_VITE_SITE_TITLE;
</script>

<style lang="scss" scoped>
.main-nav {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 16px;
  .logo {
    width: 224px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    padding-left: 6px;
    box-sizing: border-box;
    transition:
      width 0.3s,
      padding-left 0.3s;
    -webkit-app-region: no-drag;
    .logo-img {
      width: 30px;
      height: 30px;
      min-width: 30px;
      background-color: transparent;
      transition: transform 0.3s;
      cursor: pointer;
      &:hover {
        transform: scale(1.15);
      }
      &:active {
        transform: scale(1);
      }
    }
    .site-name {
      margin-left: 12px;
      font-size: 20px;
      font-weight: bold;
    }
    &.collapsed {
      width: 48px;
      padding-left: 0;
    }
  }
  .navigation {
    margin-right: 12px;
    -webkit-app-region: no-drag;
    .nav-icon {
      border-radius: 8px;
      padding: 0 8px;
      &:first-child {
        margin-right: 6px;
      }
      .n-icon {
        font-size: 24px;
      }
    }
  }
}
</style>
