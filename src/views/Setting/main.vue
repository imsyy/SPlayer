<template>
  <div class="set-main">
    <n-card
      class="set-item"
      :content-style="{
        flexDirection: 'column',
        alignItems: 'flex-start',
      }"
    >
      <div class="top">
        <div class="name">
          {{ $t("setting.themeType") }}
          <span class="tip">{{ $t("setting.themeTypeTip") }}</span>
        </div>
        <n-button
          v-if="themeType !== 'red'"
          strong
          secondary
          @click="changeThemeColor(null, true)"
        >
          {{ $t("general.name.restore") }}
        </n-button>
      </div>
      <n-grid
        class="color-selete"
        :x-gap="16"
        :y-gap="16"
        responsive="screen"
        cols="3 s:4 m:5 l:6"
      >
        <n-grid-item
          v-for="item in themeColorData"
          :key="item"
          :style="{ '--color': item.primaryColor }"
          :class="item.label === themeType ? 'item check' : 'item'"
          @click="changeThemeColor(item)"
        >
          <n-text v-html="language === 'zh-CN' ? item.name : item.label" />
        </n-grid-item>
        <n-grid-item
          :class="themeType === 'custom' ? 'item check' : 'item'"
          :style="{ '--color': themeData.primaryColor }"
          @click="openThemeCustom()"
        >
          <n-text v-html="$t('general.name.customTheme')" />
        </n-grid-item>
      </n-grid>
    </n-card>
    <n-card class="set-item">
      <div class="name">{{ $t("setting.language") }}</div>
      <n-select
        class="set"
        v-model:value="language"
        :options="languageOptions"
        @update:value="changeLanguage"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">{{ $t("setting.theme") }}</div>
      <n-select
        class="set"
        v-model:value="theme"
        :options="themeOptions"
        @update:value="themeAuto = false"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">{{ $t("setting.themeAuto") }}</div>
      <n-switch
        v-model:value="themeAuto"
        :round="false"
        @update:value="themeAutoOpen"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.autoSignIn") }}
        <span class="tip">{{ $t("setting.autoSignInTip") }}</span>
      </div>
      <n-switch v-model:value="autoSignIn" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">{{ $t("setting.bannerShow") }}</div>
      <n-switch v-model:value="bannerShow" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.listClickMode") }}
        <span class="tip">{{ $t("setting.listClickModeTip") }}</span>
      </div>
      <n-select
        class="set"
        v-model:value="listClickMode"
        :options="listClickModeOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">{{ $t("setting.searchHistory") }}</div>
      <n-switch v-model:value="searchHistory" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.bottomLyricShow") }}
        <span class="tip">{{ $t("setting.bottomLyricShowTip") }}</span>
      </div>
      <n-switch v-model:value="bottomLyricShow" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.bottomClick") }}
        <span class="tip">{{ $t("setting.bottomClickTip") }}</span>
      </div>
      <n-switch v-model:value="bottomClick" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.songVolumeFade") }}
        <span class="tip">{{ $t("setting.songVolumeFadeTip") }}</span>
      </div>
      <n-switch v-model:value="songVolumeFade" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.memoryLastPlaybackPosition") }}
        <span class="tip">{{
          $t("setting.memoryLastPlaybackPositionTip")
        }}</span>
      </div>
      <n-switch v-model:value="memoryLastPlaybackPosition" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.songLevel") }}
        <span class="tip">{{ $t("setting.songLevelTip") }}</span>
      </div>
      <n-select
        class="set"
        v-model:value="songLevel"
        :options="songLevelOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.useUnmServerShow") }}
        <span class="tip">
          {{
            useUnmServerShow
              ? $t("setting.useUnmServerShowTip1")
              : $t("setting.useUnmServerShowTip2")
          }}
        </span>
      </div>
      <n-switch
        v-model:value="useUnmServer"
        :round="false"
        :disabled="!useUnmServerShow"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.showLyricSetting") }}
        <span class="tip">{{ $t("setting.showLyricSettingTip") }}</span>
      </div>
      <n-switch v-model:value="showLyricSetting" :round="false" />
    </n-card>
    <!-- 自定义主题 -->
    <n-modal
      class="s-modal"
      v-model:show="showThemeCustom"
      preset="card"
      :title="$t('general.name.customTheme')"
      :bordered="false"
    >
      <n-form class="color-custom" :model="customColorData">
        <n-form-item
          :label="$t('general.name.primaryColor')"
          path="primaryColor"
        >
          <n-color-picker v-model:value="customColorData.primaryColor" />
        </n-form-item>
        <n-form-item
          :label="$t('general.name.primaryColor') + ' Hover'"
          path="primaryColorHover"
        >
          <n-color-picker v-model:value="customColorData.primaryColorHover" />
        </n-form-item>
        <n-form-item
          :label="$t('general.name.primaryColor') + ' Suppl'"
          path="primaryColorSuppl"
        >
          <n-color-picker v-model:value="customColorData.primaryColorSuppl" />
        </n-form-item>
        <n-form-item
          :label="$t('general.name.primaryColor') + ' Pressed'"
          path="primaryColorPressed"
        >
          <n-color-picker v-model:value="customColorData.primaryColorPressed" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showThemeCustom = false">
            {{ $t("general.dialog.cancel") }}
          </n-button>
          <n-button type="primary" @click="setThemeCustom">
            {{ $t("general.name.customTheme") }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { settingStore, userStore } from "@/store";
import { useI18n } from "vue-i18n";
import { useOsTheme } from "naive-ui";
import themeColorData from "@/components/Provider/themeColor.json";

const setting = settingStore();
const user = userStore();
const osThemeRef = useOsTheme();
const {
  theme,
  themeAuto,
  listClickMode,
  bottomLyricShow,
  songLevel,
  bannerShow,
  autoSignIn,
  searchHistory,
  themeType,
  themeData,
  showLyricSetting,
  songVolumeFade,
  useUnmServer,
  memoryLastPlaybackPosition,
  language,
  bottomClick,
} = storeToRefs(setting);

// 国际化
const { locale, t } = useI18n();

// 自定义主题
const showThemeCustom = ref(false);
const customColorData = ref({
  primaryColor: null,
  primaryColorHover: null,
  primaryColorSuppl: null,
  primaryColorPressed: null,
});

const openThemeCustom = () => {
  showThemeCustom.value = true;
  customColorData.value = {
    primaryColor: themeData.value.primaryColor,
    primaryColorHover: themeData.value.primaryColorHover,
    primaryColorSuppl: themeData.value.primaryColorSuppl,
    primaryColorPressed: themeData.value.primaryColorPressed,
  };
};

// 确认自定义颜色
const setThemeCustom = () => {
  console.log(customColorData.value);
  themeType.value = "custom";
  themeData.value = {
    label: "custom",
    name: t("general.name.customTheme"),
    ...customColorData.value,
  };
  showThemeCustom.value = false;
};

// UNM 开关显示
const useUnmServerShow = import.meta.env.VITE_UNM_API ? true : false;

// 深浅模式
const themeOptions = ref([]);
const themeChange = () => {
  themeOptions.value = [
    {
      label: t("nav.avatar.light"),
      value: "light",
    },
    {
      label: t("nav.avatar.dark"),
      value: "dark",
    },
  ];
};

// 开启自动跟随
const themeAutoOpen = (val) => {
  console.log(osThemeRef.value);
  if (val) {
    theme.value = osThemeRef.value;
  }
};

// 列表模式
const listClickModeOptions = ref([]);
const listClickModeChange = () => {
  listClickModeOptions.value = [
    {
      label: t("setting.dblclick"),
      value: "dblclick",
    },
    {
      label: t("setting.click"),
      value: "click",
    },
  ];
};

// 语言
const languageOptions = [
  {
    label: "🇨🇳 简体中文",
    value: "zh-CN",
  },
  {
    label: "🇬🇧 English",
    value: "en",
  },
];

// 语言切换
const changeLanguage = (value, option) => {
  const html = document.documentElement;
  locale.value = value;
  if (html) html.setAttribute("lang", value);
  changeAllOptions();
  console.log(t("setting.changeLanguage", { name: value }));
  $message.success(t("setting.changeLanguage", { name: option.label }));
};

// 歌曲音质
const songLevelOptions = ref([]);
const songLevelChange = () => {
  songLevelOptions.value = [
    {
      label: t("setting.standard"),
      value: "standard",
    },
    {
      label: t("setting.higher"),
      value: "higher",
    },
    ,
    {
      label: t("setting.exhigh"),
      value: "exhigh",
    },
    {
      label: t("setting.lossless"),
      value: "lossless",
      disabled: user.userData?.vipType ? false : true,
    },
    {
      label: t("setting.hires"),
      value: "hires",
      disabled: user.userData?.vipType ? false : true,
    },
    {
      label: t("setting.jyeffect"),
      value: "jyeffect",
      disabled: user.userData?.vipType ? false : true,
    },
    {
      label: t("setting.jymaster"),
      value: "jymaster",
      disabled: user.userData?.vipType ? false : true,
    },
  ];
};

// 更改所有配置
const changeAllOptions = () => {
  themeChange();
  listClickModeChange();
  songLevelChange();
};

// 更换主题色
const changeThemeColor = (data, reset = false) => {
  if (reset) {
    $dialog.warning({
      class: "s-dialog",
      title: t("general.name.restore"),
      content: t("setting.themeTypeDialog"),
      positiveText: t("general.name.restore"),
      negativeText: t("general.dialog.cancel"),
      onPositiveClick: () => {
        $message.success(t("other.cleanAll"));
        themeType.value = "red";
      },
    });
  } else {
    $message.success(t("setting.themeChange", { name: data.name }));
    themeType.value = data.label;
  }
};

onMounted(() => {
  changeAllOptions();
});
</script>

<style lang="scss" scoped>
.set-item {
  .top {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .color-selete {
    margin-top: 16px;
    .item {
      position: relative;
      width: 100%;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color);
      border-radius: 8px;
      transition: all 0.3s;
      cursor: pointer;
      @media (max-width: 800px) {
        height: 60px;
      }
      &::before {
        content: "";
        position: absolute;
        border-radius: 12px;
        top: -4px;
        left: -4px;
        right: -4px;
        bottom: -4px;
        border: 2px solid var(--color);
        opacity: 0;
        transition: opacity 0.3s;
      }
      &.check {
        &::before {
          opacity: 1;
        }
      }
      &:active {
        transform: scale(0.98);
      }
      .n-text {
        color: #fff;
      }
    }
  }
}
</style>
