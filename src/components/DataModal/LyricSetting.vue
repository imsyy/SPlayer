<template>
  <!-- 歌词设置 -->
  <n-modal
    :bordered="false"
    :z-index="10000"
    class="s-modal lyric-set"
    v-model:show="LyricSettingModal"
    preset="card"
    title="歌词设置"
  >
    <n-scrollbar>
      <div class="set">
        <n-card class="set-item">
          <div class="name">
            播放页快捷设置
            <span class="tip">关闭后需在设置页开启</span>
          </div>
          <n-switch v-model:value="showLyricSetting" :round="false" />
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
            显示歌词翻译
            <span class="tip">是否在具有翻译歌词时显示</span>
          </div>
          <n-switch v-model:value="showTransl" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            显示歌词音译
            <span class="tip">是否在具有音译歌词时显示</span>
          </div>
          <n-switch v-model:value="showRoma" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            显示前奏等待
            <span class="tip">部分歌曲前奏可能存在显示错误</span>
          </div>
          <n-switch v-model:value="countDownShow" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            智能暂停滚动
            <span class="tip">鼠标移入歌词区域是否暂停滚动</span>
          </div>
          <n-switch v-model:value="lrcMousePause" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            歌词模糊
            <span class="tip">未播放或已播放歌词模糊显示，实验性功能</span>
          </div>
          <n-switch v-model:value="lyricsBlur" :round="false" />
        </n-card>
        <n-space justify="center">
          <n-button
            class="more"
            size="large"
            strong
            secondary
            round
            @click="
              () => {
                LyricSettingModal = false;
                music.setBigPlayerState(false);
                router.push('/setting/player');
              }
            "
          >
            更多设置
          </n-button>
        </n-space>
      </div>
    </n-scrollbar>
  </n-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { settingStore } from "@/store";
import { useRouter } from "vue-router";
import { musicStore } from "@/store";

const setting = settingStore();
const router = useRouter();
const music = musicStore();

// 歌词设置弹窗
const LyricSettingModal = ref(false);

// 设置数据
const {
  showTransl,
  lyricsBlur,
  lrcMousePause,
  showYrc,
  showRoma,
  countDownShow,
  showLyricSetting,
} = storeToRefs(setting);

// 开启歌词设置弹窗
const openLyricSetting = () => {
  LyricSettingModal.value = true;
};

// 暴露方法
defineExpose({
  openLyricSetting,
});
</script>

<style lang="scss">
.n-card {
  &.lyric-set {
    background-color: #ffffff40;
    color: #fff;
    .n-card-header {
      .n-card-header__main,
      .n-card-header__close {
        color: #fff;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.set {
  width: 100%;
  :deep(.set-item) {
    width: 100%;
    color: #fff;
    border-radius: 8px;
    margin-bottom: 12px;
    background-color: #ffffff40;
    border-color: transparent;
    .n-card__content {
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
      .n-switch {
        --n-box-shadow-focus: none;
        &.n-switch--active {
          .n-switch__rail {
            background-color: #ffffff78;
          }
        }
        .n-switch__rail {
          background-color: #ffffff24;
        }
      }
      .set {
        width: 200px;
        @media (max-width: 768px) {
          width: 140px;
          min-width: 140px;
        }
      }
    }
  }
  .more {
    margin: 12px 0;
    color: #fff;
    background-color: #ffffff40;
    &:hover {
      background-color: #ffffff20;
    }
  }
}
</style>
