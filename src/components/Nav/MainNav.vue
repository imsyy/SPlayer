<!-- 主导航栏 -->
<template>
  <nav :class="{ 'main-nav': true, 'no-sider': !showSider }">
    <div class="left">
      <div :class="['logo', asideMenuCollapsed ? 'collapsed' : null]" @click="router.push('/')">
        <!-- <n-avatar class="logo-img" src="/images/icons/favicon.png?asset" /> -->
        <n-icon class="logo-img" size="30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 1024 1024"
          >
            <path
              d="M511.764091 131.708086a446.145957 446.145957 0 1 0 446.145957 446.145957 446.145957 446.145957 0 0 0-446.145957-446.145957z m0 519.76004A71.829499 71.829499 0 1 1 583.59359 580.530919 72.275645 72.275645 0 0 1 511.764091 651.468126z"
              :fill="themeAutoCover ? 'var(--main-second-color)' : '#F55E55'"
            />
            <path
              d="M802.205109 0.541175l-168.197026 37.030114a67.814185 67.814185 0 0 0-53.091369 66.029602V223.614153l3.569168 349.778431h114.213365V223.614153h108.859613a26.322611 26.322611 0 0 0 26.768758-26.322611V26.863786a26.768757 26.768757 0 0 0-32.122509-26.322611z"
              :fill="themeAutoCover ? 'var(--main-color)' : '#F9BBB8'"
            />
            <path
              d="M511.764091 386.457428a186.935156 186.935156 0 1 0 186.935156 186.48901A186.935156 186.935156 0 0 0 511.764091 386.457428z m0 264.564552a71.383353 71.383353 0 1 1 71.383353-71.383353 71.383353 71.383353 0 0 1-71.383353 71.383353z"
              :fill="themeAutoCover ? 'var(--main-color)' : '#F9BBB8'"
            />
          </svg>
        </n-icon>
        <Transition name="fade" mode="out-in">
          <n-text v-if="!asideMenuCollapsed && showSider" class="site-name">
            {{ siteName }}
          </n-text>
        </Transition>
      </div>
      <n-flex :class="['navigation', { hidden: searchInputFocus }]" :size="6">
        <n-button :focusable="false" class="nav-icon" quaternary @click="router.go(-1)">
          <template #icon>
            <n-icon>
              <SvgIcon icon="chevron-left" />
            </n-icon>
          </template>
        </n-button>
        <n-button :focusable="false" class="nav-icon" quaternary @click="router.go(1)">
          <template #icon>
            <n-icon>
              <SvgIcon icon="chevron-right" />
            </n-icon>
          </template>
        </n-button>
      </n-flex>
      <!-- 搜索框 -->
      <SearchInp />
      <!-- GitHub -->
      <Transition name="fade" mode="out-in">
        <n-button
          v-if="showGithub"
          :focusable="false"
          class="github"
          circle
          quaternary
          @click="openGithub"
        >
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
        :show="mainMenuShow"
        :show-arrow="true"
        :options="mainMenuOptions"
        placement="bottom-end"
        @clickoutside="mainMenuShow = false"
      >
        <n-button
          :style="{ pointerEvents: mainMenuShow ? 'none' : 'auto' }"
          :class="['main-menu', { show: !showSider }]"
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
const { asideMenuCollapsed, searchInputFocus } = storeToRefs(status);
const { showGithub, showSider, themeAutoCover } = storeToRefs(settings);

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
    cursor: pointer;
    .logo-img {
      width: 30px;
      height: 30px;
      min-width: 30px;
      background-color: transparent;
      transition: transform 0.3s;
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
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    height: 34px;
    width: 86px;
    min-width: 86px;
    transition:
      width 0.3s,
      min-width 0.3s,
      opacity 0.3s;
    overflow: hidden;
    -webkit-app-region: no-drag;
    .nav-icon {
      border-radius: 8px;
      padding: 0 8px;
      .n-icon {
        font-size: 24px;
      }
    }
    @media (max-width: 700px) {
      &.hidden {
        opacity: 0;
        width: 0px;
        min-width: 0px;
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
    display: none;
    &.show {
      display: flex;
    }
    @media (max-width: 900px) {
      display: flex;
    }
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
  @media (max-width: 900px) {
    .left {
      .logo {
        width: auto;
        padding-left: 0;
        margin-right: 12px;
        .site-name {
          display: none;
        }
      }
    }
  }
  @media (max-width: 700px) {
    .left {
      width: 100%;
    }
    .github {
      display: none;
    }
  }
}
</style>
