<template>
  <div class="setting">
    <div class="title">全局设置</div>
    <n-h6 prefix="bar"> 基础设置 </n-h6>
    <n-card class="set-item">
      <div class="name">明暗模式</div>
      <n-select class="set" v-model:value="theme" :options="darkOptions" />
    </n-card>
    <n-card class="set-item">
      <div class="name">明暗模式跟随系统</div>
      <n-switch v-model:value="themeAuto" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        每日签到
        <span class="tip">是否自动进行每日签到</span>
      </div>
      <n-switch v-model:value="autoSignIn" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">显示轮播图</div>
      <n-switch v-model:value="bannerShow" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        列表点击方式
        <span class="tip">移动端该设置项无效，单击同时生效</span>
      </div>
      <n-select
        class="set"
        v-model:value="listClickMode"
        :options="listClickModeOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">显示搜索历史</div>
      <n-switch v-model:value="searchHistory" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示底栏歌词
        <span class="tip">是否在播放时显示歌词</span>
      </div>
      <n-switch v-model:value="bottomLyricShow" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        歌曲音质
        <span class="tip">无损音质及以上需要您为黑胶会员</span>
      </div>
      <n-select
        class="set"
        v-model:value="songLevel"
        :options="songLevelOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        替换无法播放的歌曲链接
        <span class="tip">
          {{
            useUnmServerShow
              ? "是否使用 UNM 替换无法播放的歌曲链接"
              : "请配置 UNM-Server 后使用解灰功能"
          }}
        </span>
      </div>
      <n-switch
        v-model:value="useUnmServer"
        :round="false"
        :disabled="!useUnmServerShow"
      />
    </n-card>
    <n-h6 prefix="bar"> 歌词设置 </n-h6>
    <n-card class="set-item">
      <div class="name">显示歌词翻译</div>
      <n-switch v-model:value="showTransl" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示逐字歌词
        <span class="tip">是否在歌曲具有逐字歌词时显示，实验性功能</span>
      </div>
      <n-switch v-model:value="showYrc" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        智能暂停滚动
        <span class="tip">鼠标移入歌词区域是否暂停滚动</span>
      </div>
      <n-switch v-model:value="lrcMousePause" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">播放器样式</div>
      <n-select
        class="set"
        v-model:value="playerStyle"
        :options="playerStyleOptions"
      />
    </n-card>
    <n-card
      class="set-item"
      :content-style="{
        flexDirection: 'column',
        alignItems: 'flex-start',
      }"
    >
      <div class="name">歌词文本大小</div>
      <n-slider
        v-model:value="lyricsFontSize"
        :tooltip="false"
        :max="4"
        :min="3"
        :step="0.01"
        :marks="{
          3: '最小',
          3.6: '默认',
          4: '最大',
        }"
      />
      <div :class="lyricsBlur ? 'more blur' : 'more'">
        <div
          v-for="n in 3"
          :key="n"
          :class="n === 2 ? 'lrc on' : 'lrc'"
          :style="{
            margin: n === 2 ? '12px 0' : null,
            alignItems: lyricsPosition == 'center' ? 'center' : null,
            transformOrigin:
              lyricsPosition == 'center' ? 'center' : 'center left',
          }"
        >
          <span :style="{ fontSize: lyricsFontSize + 'vh' }"
            >这是一句歌词
          </span>
          <span :style="{ fontSize: lyricsFontSize - 0.4 + 'vh' }"
            >This is a lyric
          </span>
        </div>
      </div>
    </n-card>
    <n-card class="set-item">
      <div class="name">默认歌词位置</div>
      <n-select
        class="set"
        v-model:value="lyricsPosition"
        :options="lyricsPositionOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        歌词滚动位置
        <span class="tip">歌词高亮时所处的位置</span>
      </div>
      <n-select
        class="set"
        v-model:value="lyricsBlock"
        :options="lyricsBlockOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        歌词模糊
        <span class="tip">未播放或已播放歌词模糊显示，实验性功能</span>
      </div>
      <n-switch v-model:value="lyricsBlur" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示音乐频谱
        <span class="tip">可能会导致一些意想不到的后果，实验性功能</span>
      </div>
      <n-switch
        v-model:value="musicFrequency"
        :round="false"
        @click="changeMusicFrequency"
      />
    </n-card>
    <n-h6 prefix="bar"> 其他设置 </n-h6>
    <n-card class="set-item">
      <div class="name">
        系统重置
        <span class="tip">若程序显示异常或出现问题时可尝试此操作</span>
      </div>
      <n-button strong secondary type="error" @click="resetApp">
        重置
      </n-button>
    </n-card>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { settingStore, userStore } from "@/store";
const setting = settingStore();
const user = userStore();
const {
  theme,
  themeAuto,
  showTransl,
  lyricsPosition,
  playerStyle,
  musicFrequency,
  listClickMode,
  lyricsFontSize,
  bottomLyricShow,
  lyricsBlock,
  songLevel,
  bannerShow,
  lyricsBlur,
  autoSignIn,
  lrcMousePause,
  searchHistory,
  showYrc,
  useUnmServer,
} = storeToRefs(setting);

// 某些开关是否显示
const useUnmServerShow = import.meta.env.VITE_UNM_API ? true : false;

// 深浅模式
const darkOptions = [
  {
    label: "浅色模式",
    value: "light",
  },
  {
    label: "深色模式",
    value: "dark",
  },
];

// 列表模式
const listClickModeOptions = [
  {
    label: "双击播放",
    value: "dblclick",
  },
  {
    label: "单击播放",
    value: "click",
  },
];

// 歌曲音质
const songLevelOptions = [
  {
    label: "标准",
    value: "standard",
  },
  {
    label: "较高",
    value: "higher",
  },
  ,
  {
    label: "极高",
    value: "exhigh",
  },
  ,
  {
    label: "无损",
    value: "lossless",
    disabled: user.userData?.vipType ? false : true,
  },
  ,
  {
    label: "Hi-Res",
    value: "hires",
    disabled: user.userData?.vipType ? false : true,
  },
];

// 歌词位置
const lyricsPositionOptions = [
  {
    label: "居左",
    value: "left",
  },
  {
    label: "居中",
    value: "center",
  },
];

// 歌词滚动位置
const lyricsBlockOptions = [
  {
    label: "靠近顶部",
    value: "start",
  },
  {
    label: "水平居中",
    value: "center",
  },
];

// 播放器样式
const playerStyleOptions = [
  {
    label: "封面模式",
    value: "cover",
  },
  {
    label: "唱片模式",
    value: "record",
  },
];

// 音乐频谱提醒
const changeMusicFrequency = () => {
  if (musicFrequency.value) {
    $dialog.warning({
      class: "s-dialog",
      title: "实验性功能",
      content: "确认开启音乐频谱？将于刷新后生效",
      positiveText: "开启",
      negativeText: "取消",
      onMaskClick: () => {
        musicFrequency.value = false;
      },
      onPositiveClick: () => {
        musicFrequency.value = true;
        location.reload();
      },
      onNegativeClick: () => {
        musicFrequency.value = false;
      },
    });
  }
};

// 系统重置
const resetApp = () => {
  const cleanAll = () => {
    $message ? $message.success("重置成功") : alert("重置成功");
    localStorage.clear();
    window.location.href = "/";
  };
  $dialog.warning({
    title: "系统重置",
    content: "确认重置为默认状态？你的登录状态以及自定义设置都将丢失！",
    positiveText: "重置",
    negativeText: "取消",
    onPositiveClick: () => {
      $cleanAll ? $cleanAll() : cleanAll();
    },
  });
};

onMounted(() => {
  $setSiteTitle("全局设置");
});
</script>

<style lang="scss" scoped>
.setting {
  padding: 0 10vw;
  max-width: 1200px;
  margin: 0 auto;
  @media (max-width: 768px) {
    padding: 0;
  }
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    font-size: 40px;
    font-weight: bold;
  }
  .n-h {
    padding-left: 16px;
    font-size: 20px;
    margin-left: 4px;
  }
  .set-item {
    width: 100%;
    border-radius: 8px;
    margin-bottom: 12px;
    :deep(.n-card__content) {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      .name {
        font-size: 16px;
        display: flex;
        flex-direction: column;
        padding-right: 20px;
        .tip {
          font-size: 12px;
          opacity: 0.8;
        }
      }
      .set {
        width: 200px;
        @media (max-width: 768px) {
          width: 140px;
          min-width: 140px;
        }
      }
      .more {
        padding: 12px;
        border-radius: 8px;
        background-color: var(--n-border-color);
        width: 100%;
        margin-top: 12px;
        box-sizing: border-box;
        &.blur {
          .lrc {
            filter: blur(2px);
            &.on {
              filter: blur(0);
            }
          }
        }
        .lrc {
          opacity: 0.6;
          display: flex;
          flex-direction: column;
          transform: scale(0.95);
          transition: all 0.3s;
          &.on {
            font-weight: bold;
            opacity: 1;
            transform: scale(1.05);
          }
        }
      }
    }
  }
}
</style>
