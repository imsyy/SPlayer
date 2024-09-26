<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 歌词设置 </n-h3>
      <n-card
        id="lyrics-show"
        :content-style="{
          'flex-direction': 'column',
          'align-items': settingStore.lyricsPosition,
          '--font-weight': settingStore.lyricFontBold ? 'bold' : 'normal',
          '--font-size': settingStore.lyricFontSize,
          '--font-tran-size': settingStore.lyricTranFontSize,
          '--font-roma-size': settingStore.lyricRomaFontSize,
          '--transform-origin':
            settingStore.lyricsPosition === 'center'
              ? 'center'
              : settingStore.lyricsPosition === 'flex-start'
                ? 'left'
                : 'right',
        }"
        class="set-item"
      >
        <div v-for="item in 2" :key="item" :class="['lrc-item', { on: item === 2 }]">
          <n-text>我是一句歌词</n-text>
          <n-text v-if="settingStore.showTran">I'm the lyric</n-text>
          <n-text v-if="settingStore.showRoma">wo shi yi ju ge ci</n-text>
        </div>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词字体大小</n-text>
          <n-text class="tip" :depth="3">单位 px，最小 30，最大 60</n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.lyricFontSize !== 46"
              type="primary"
              strong
              secondary
              @click="settingStore.lyricFontSize = 46"
            >
              恢复默认
            </n-button>
          </Transition>
          <n-input-number
            v-model:value="settingStore.lyricFontSize"
            :min="30"
            :max="60"
            class="set"
            placeholder="请输入歌词字体大小"
            @blur="settingStore.lyricFontSize === null ? (settingStore.lyricFontSize = 30) : null"
          >
            <template #suffix> px </template>
          </n-input-number>
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">翻译歌词大小</n-text>
          <n-text class="tip" :depth="3">单位 px，最小 12，最大 40</n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.lyricTranFontSize !== 22"
              type="primary"
              strong
              secondary
              @click="settingStore.lyricTranFontSize = 22"
            >
              恢复默认
            </n-button>
          </Transition>
          <n-input-number
            v-model:value="settingStore.lyricTranFontSize"
            :min="12"
            :max="40"
            :disabled="settingStore.useAMLyrics"
            class="set"
            placeholder="请输入翻译歌词字体大小"
            @blur="
              settingStore.lyricTranFontSize === null ? (settingStore.lyricTranFontSize = 22) : null
            "
          >
            <template #suffix> px </template>
          </n-input-number>
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">音译歌词大小</n-text>
          <n-text class="tip" :depth="3">单位 px，最小 12，最大 40</n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.lyricRomaFontSize !== 18"
              type="primary"
              strong
              secondary
              @click="settingStore.lyricRomaFontSize = 18"
            >
              恢复默认
            </n-button>
          </Transition>
          <n-input-number
            v-model:value="settingStore.lyricRomaFontSize"
            :min="12"
            :max="40"
            :disabled="settingStore.useAMLyrics"
            class="set"
            placeholder="请输入歌词字体大小"
            @blur="
              settingStore.lyricRomaFontSize === null ? (settingStore.lyricRomaFontSize = 18) : null
            "
          >
            <template #suffix> px </template>
          </n-input-number>
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词字体加粗</n-text>
          <n-text class="tip" :depth="3">是否将歌词字体加粗显示，部分字体可能显示异常</n-text>
        </div>
        <n-switch v-model:value="settingStore.lyricFontBold" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词位置</n-text>
          <n-text class="tip" :depth="3">歌词的默认垂直位置</n-text>
        </div>
        <n-select
          v-model:value="settingStore.lyricsPosition"
          :disabled="settingStore.useAMLyrics"
          :options="[
            {
              label: '居左',
              value: 'flex-start',
            },
            {
              label: '居中',
              value: 'center',
            },
            {
              label: '居右',
              value: 'flex-end',
            },
          ]"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词滚动位置</n-text>
          <n-text class="tip" :depth="3">歌词高亮时所处的位置</n-text>
        </div>
        <n-select
          v-model:value="settingStore.lyricsScrollPosition"
          :options="[
            {
              label: '靠近顶部',
              value: 'start',
            },
            {
              label: '水平居中',
              value: 'center',
            },
          ]"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">自动暂停滚动</n-text>
          <n-text class="tip" :depth="3"> 鼠标移入歌词区域时是否暂停滚动 </n-text>
        </div>
        <n-switch
          v-model:value="settingStore.lrcMousePause"
          :disabled="settingStore.useAMLyrics"
          :round="false"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示逐字歌词</n-text>
        </div>
        <n-switch v-model:value="settingStore.showYrc" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.showYrc">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">显示逐字歌词动画</n-text>
            <n-text class="tip" :depth="3"> 可能会造成性能问题，如遇卡顿请关闭 </n-text>
          </div>
          <n-switch
            v-model:value="settingStore.showYrcAnimation"
            :disabled="settingStore.useAMLyrics"
            :round="false"
            class="set"
          />
        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示歌词翻译</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.showTran"
          class="set"
          :round="false"
          :disabled="settingStore.useAMLyrics"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示歌词音译</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.showRoma"
          class="set"
          :round="false"
          :disabled="settingStore.useAMLyrics"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词自动模糊</n-text>
          <n-text class="tip" :depth="3"> 是否聚焦显示当前播放行，其他行将模糊显示 </n-text>
        </div>
        <n-switch v-model:value="settingStore.lyricsBlur" class="set" :round="false" />
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> Apple Music-like Lyrics </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">使用 Apple Music-like Lyrics</n-text>
          <n-text class="tip" :depth="3">
            歌词使用 Apple Music-like Lyrics 进行渲染，需要高性能设备
          </n-text>
        </div>
        <n-switch v-model:value="settingStore.useAMLyrics" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词弹簧效果</n-text>
          <n-text class="tip" :depth="3">
            是否使用物理弹簧算法实现歌词动画效果，需要高性能设备
          </n-text>
        </div>
        <n-switch v-model:value="settingStore.useAMSpring" class="set" :round="false" />
      </n-card>
    </div>
    <div v-if="isElectron" class="set-list">
      <n-h3 prefix="bar"> 桌面歌词 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">开启桌面歌词</n-text>
          <n-text class="tip" :depth="3"> 如遇问题请向开发者反馈 </n-text>
        </div>
        <n-switch
          :value="statusStore.showDesktopLyric"
          :round="false"
          class="set"
          @update:value="player.toggleDesktopLyric"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">桌面歌词文字大小</n-text>
          <n-text class="tip" :depth="3">翻译或其他文字将会跟随变化</n-text>
        </div>
        <n-select
          v-model:value="desktopLyricConfig.fontSize"
          :options="
            Array.from({ length: 41 }, (_, i) => {
              return {
                label: `${20 + i} px`,
                value: 20 + i,
              };
            })
          "
          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">主题色</n-text>
          <n-text class="tip" :depth="3">桌面歌词文字主色</n-text>
        </div>
        <n-color-picker
          v-model:value="desktopLyricConfig.mainColor"
          :show-alpha="false"
          :modes="['hex']"
          class="set"
          @complete="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">描边色</n-text>
          <n-text class="tip" :depth="3">桌面歌词文字描边色</n-text>
        </div>
        <n-color-picker
          v-model:value="desktopLyricConfig.shadowColor"
          :modes="['rgb']"
          class="set"
          @complete="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">恢复默认配置</n-text>
          <n-text class="tip" :depth="3">恢复默认桌面歌词配置</n-text>
        </div>
        <n-button type="primary" @click="restoreDesktopLyricConfig">恢复默认</n-button>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore, useStatusStore } from "@/stores";
import { cloneDeep, isEqual } from "lodash-es";
import { isElectron } from "@/utils/helper";
import player from "@/utils/player";

const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 桌面歌词配置
const defaultDesktopLyricConfig = {
  fontSize: 30,
  mainColor: "#fff",
  shadowColor: "rgba(0, 0, 0, 0.5)",
};
const desktopLyricConfig = reactive({ ...defaultDesktopLyricConfig });

// 获取桌面歌词配置
const getDesktopLyricConfig = async () => {
  if (!isElectron) return;
  const config = await window.electron.ipcRenderer.invoke("get-desktop-lyric-option");
  if (config) Object.assign(desktopLyricConfig, config);
  // 监听更新
  window.electron.ipcRenderer.on("desktop-lyric-option-change", (_, config) => {
    if (config && !isEqual(desktopLyricConfig, config)) {
      Object.assign(desktopLyricConfig, config);
    }
  });
};

// 保存桌面歌词配置
const saveDesktopLyricConfig = () => {
  try {
    if (!isElectron) return;
    console.log(cloneDeep(desktopLyricConfig));
    window.electron.ipcRenderer.send(
      "set-desktop-lyric-option",
      cloneDeep(desktopLyricConfig),
      true,
    );
    window.$message.success("桌面歌词配置已保存");
  } catch (error) {
    console.error("Failed to save options:", error);
    window.$message.error("桌面歌词配置保存失败");
    getDesktopLyricConfig();
  }
};

// 恢复默认桌面歌词配置
const restoreDesktopLyricConfig = () => {
  try {
    if (!isElectron) return;
    window.electron.ipcRenderer.send("set-desktop-lyric-option", defaultDesktopLyricConfig, true);
    window.$message.success("桌面歌词配置已恢复默认");
    console.log(defaultDesktopLyricConfig, desktopLyricConfig);
  } catch (error) {
    console.error("Failed to save options:", error);
    window.$message.error("桌面歌词配置恢复默认失败");
    getDesktopLyricConfig();
  }
};

onMounted(() => {
  getDesktopLyricConfig();
});
</script>

<style lang="scss" scoped>
#lyrics-show {
  .lrc-item {
    display: flex;
    flex-direction: column;
    opacity: 0.3;
    transform-origin: var(--transform-origin);
    transform: scale(0.86);
    transition: all 0.3s;
    &.on {
      opacity: 1;
      transform: scale(1);
    }
    .n-text {
      &:nth-of-type(1) {
        font-weight: var(--font-weight);
        font-size: calc(var(--font-size) * 1px);
      }
      &:nth-of-type(2) {
        opacity: 0.6;
        font-size: calc(var(--font-tran-size) * 1px);
      }
      &:nth-of-type(3) {
        opacity: 0.6;
        font-size: calc(var(--font-roma-size) * 1px);
      }
    }
  }
}
</style>
