<template>
  <div class="setting">
    <div class="set-left">
      <div class="title">
        <n-h1>设置</n-h1>
        <n-text :depth="3">个性化与全局设置</n-text>
      </div>
      <!-- 设置菜单 -->
      <n-menu
        v-model:value="activeKey"
        :options="menuOptions"
        :indent="10"
        @update:value="setScrollbar?.scrollTo({ top: 0, behavior: 'smooth' })"
      />
      <!-- 信息 -->
      <div class="power">
        <n-text class="author" :depth="2" @click="toGithub">
          <SvgIcon name="Github" :size="20" />
          {{ packageJson.author }}
        </n-text>
        <n-text class="name">SPlayer</n-text>
        <n-text class="version" depth="3">{{ packageJson.version }}</n-text>
      </div>
    </div>
    <n-scrollbar
      ref="setScrollbar"
      class="set-content"
      :content-style="{ overflow: 'hidden', padding: '40px 0' }"
    >
      <Transition name="fade" mode="out-in">
        <!-- 常规 -->
        <GeneralSetting v-if="activeKey === 'general'" />
        <!-- 播放 -->
        <PlaySetting v-else-if="activeKey === 'play'" />
        <!-- 歌词 -->
        <LyricsSetting v-else-if="activeKey === 'lyrics'" />
        <!-- 快捷键 -->
        <KeyboardSetting v-else-if="activeKey === 'keyboard'" />
        <!-- 本地 -->
        <LocalSetting v-else-if="activeKey === 'local'" />
        <!-- 其他 -->
        <OtherSetting v-else-if="activeKey === 'other'" />
        <!-- 关于 -->
        <AboutSetting v-else-if="activeKey === 'about'" />
        <!-- 空白 -->
        <n-text v-else class="error">暂无该设置项</n-text>
      </Transition>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import type { MenuOption, NScrollbar } from "naive-ui";
import type { SettingType } from "@/types/main";
import { isElectron, renderIcon } from "@/utils/helper";
import packageJson from "@/../package.json";

const props = defineProps<{ type: SettingType }>();

// 设置内容
const setScrollbar = ref<InstanceType<typeof NScrollbar> | null>(null);

// 菜单数据
const activeKey = ref<SettingType>(props.type);

// 菜单内容
const menuOptions: MenuOption[] = [
  {
    key: "general",
    label: "常规设置",
    icon: renderIcon("SettingsLine"),
  },
  {
    key: "play",
    label: "播放设置",
    icon: renderIcon("Music"),
  },
  {
    key: "lyrics",
    label: "歌词设置",
    icon: renderIcon("Lyrics"),
  },
  {
    key: "keyboard",
    label: "快捷键设置",
    show: isElectron,
    icon: renderIcon("Keyboard"),
  },
  {
    key: "local",
    label: "本地与下载",
    show: isElectron,
    icon: renderIcon("Storage"),
  },
  {
    key: "other",
    label: "其他设置",
    icon: renderIcon("SettingsOther"),
  },
  {
    key: "about",
    label: "关于",
    icon: renderIcon("Info"),
  },
];

// 跳转
const toGithub = () => {
  window.open(packageJson.github);
};
</script>

<style lang="scss" scoped>
.setting {
  display: flex;
  width: 100%;
  height: 75vh;
  min-height: 75vh;
  .set-left {
    display: flex;
    flex-direction: column;
    width: 280px;
    height: 100%;
    padding: 20px;
    background-color: var(--surface-container-hex);
    .title {
      margin: 10px 0 20px 10px;
      .n-h1 {
        font-size: 26px;
        font-weight: bold;
        margin-top: 0;
        line-height: normal;
        margin-bottom: 6px;
      }
    }
    .n-menu {
      width: 100%;
      padding: 0;
    }
    .power {
      margin: auto 0 0 10px;
      .name {
        font-weight: bold;
        margin-right: 6px;
      }
      .version {
        &::before {
          content: "v";
          margin-right: 2px;
        }
      }
      .author {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-bottom: 4px;
        cursor: pointer;
        .n-icon {
          margin-right: 4px;
        }
      }
    }
  }
}
</style>

<style lang="scss">
.main-setting {
  position: relative;
  width: calc(100vw - 40px);
  max-width: 1024px !important;
  overflow: hidden;
  .n-card-header {
    position: absolute;
    top: 0;
    right: 0;
    padding: 20px;
    z-index: 1;
  }
  .n-card__content {
    padding: 0;
    .setting-type {
      transition: opacity 0.2s ease-in-out;
    }
    .set-content {
      flex: 1;
      padding: 0 40px;
      background-color: var(--background-hex);
      // background-color: rgba(var(--surface-container), 0.28);
    }
    .set-list {
      margin-bottom: 30px;
      &:last-child {
        margin-bottom: 0;
      }
    }
    .n-collapse-transition {
      margin-bottom: 12px;
      &:last-child {
        margin-bottom: 0;
      }
    }
    .set-item {
      width: 100%;
      border-radius: 8px;
      margin-bottom: 12px;
      transition: margin 0.3s;
      &:last-child {
        margin-bottom: 0;
      }
      .n-card__content {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
      }
      .label {
        display: flex;
        flex-direction: column;
        padding-right: 20px;
        .name {
          font-size: 16px;
        }
      }
      .n-flex {
        flex-flow: nowrap !important;
      }
      .set {
        justify-content: flex-end;
        width: 200px;
        &.n-switch {
          width: max-content;
        }
        @media (max-width: 768px) {
          width: 140px;
          min-width: 140px;
        }
      }
    }
  }
  .n-menu {
    .n-menu-item-content {
      &::before {
        left: 0px;
        right: 0;
        width: 100%;
        border-radius: 6px;
      }
    }
  }
}
</style>
