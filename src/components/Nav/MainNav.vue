<!-- 主导航栏 -->
<template>
  <nav :class="{ 'main-nav': true, 'no-sider': !showSider }">
    <div class="left">
      <div
        :class="['logo', status.asideMenuCollapsed ? 'collapsed' : null]"
        @click="router.push('/')"
      >
        <n-avatar class="logo-img" src="/images/logo/favicon.png?asset" />
        <Transition name="fade" mode="out-in">
          <n-text v-if="!status.asideMenuCollapsed && showSider" class="site-name">
            {{ siteName }}
          </n-text>
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
      <!-- GitHub -->
      <Transition name="fade" mode="out-in">
        <n-button v-if="showGithub" class="github" circle quaternary @click="openGithub">
          <template #icon>
            <n-icon size="20">
              <SvgIcon icon="github" />
            </n-icon>
          </template>
        </n-button>
      </Transition>
    </div>
    <div class="right">
      <!-- 全局菜单 -->
      <n-dropdown
        v-if="!showSider"
        :show="mainMenuShow"
        :show-arrow="true"
        :options="mainMenuOptions"
        placement="bottom-end"
        @clickoutside="mainMenuShow = false"
      >
        <n-button
          :style="{ pointerEvents: mainMenuShow ? 'none' : 'auto' }"
          class="main-menu"
          secondary
          strong
          round
          @click="mainMenuShow = !mainMenuShow"
        >
          <template #icon>
            <n-icon>
              <SvgIcon icon="menu" />
            </n-icon>
          </template>
        </n-button>
      </n-dropdown>
      <!-- 用户信息 -->
      <userData />
      <!-- TitleBar -->
      <TitleBar v-if="checkPlatform.electron()" />
    </div>
  </nav>
</template>

<script setup>
import { NScrollbar } from "naive-ui";
import { storeToRefs } from "pinia";
import { siteStatus, siteSettings } from "@/stores";
import { checkPlatform } from "@/utils/helper";
import { useRouter } from "vue-router";
import Menu from "@/components/Global/Menu";
import packageJson from "@/../package.json";

const router = useRouter();
const status = siteStatus();
const settings = siteSettings();
const { showGithub, showSider } = storeToRefs(settings);

// 站点信息
const siteName = import.meta.env.RENDERER_VITE_SITE_TITLE;

// 打开 GitHub
const openGithub = () => {
  console.log(packageJson.github);
  window.open(packageJson.github);
};

// 主菜单渲染
const mainMenuShow = ref(false);
const mainMenuOptions = computed(() => [
  {
    key: "menu",
    type: "render",
    props: {
      onClick: () => (mainMenuShow.value = false),
    },
    render: () => {
      return h(NScrollbar, { style: { maxHeight: "calc(100vh - 200px)", minWidth: "280px" } }, () =>
        h(Menu),
      );
    },
  },
]);
</script>

<style lang="scss" scoped>
.main-nav {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  .left,
  .right {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
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
  .github {
    margin-left: 12px;
    -webkit-app-region: no-drag;
  }
  .main-menu {
    -webkit-app-region: no-drag;
    margin-right: 12px;
  }
  &.no-sider {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 10vw;
    @media (max-width: 1200px) {
      padding: 0 5vw;
    }
    .logo {
      width: auto;
      padding-left: 0;
      margin-right: 12px;
    }
  }
}
</style>
