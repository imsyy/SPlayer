<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.lyrics.basic") }} </n-h3>
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
          <n-text>{{ t("settings.lyrics.sample") }}</n-text>
          <n-text v-if="settingStore.showTran">I'm the lyric</n-text>
          <n-text v-if="settingStore.showRoma">wo shi yi ju ge ci</n-text>
        </div>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.fontSize") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.fontSizeTip") }}</n-text>
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
              {{ t("settings.lyrics.restoreDefault") }}
            </n-button>

          </Transition>
          <n-input-number
            v-model:value="settingStore.lyricFontSize"
            :min="12"
            :max="60"
            class="set"
            :placeholder="t('settings.lyrics.fontSizePlaceholder')"
            @blur="settingStore.lyricFontSize === null ? (settingStore.lyricFontSize = 30) : null"

          >
            <template #suffix> px </template>
          </n-input-number>
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.tranFontSize") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.tranFontSizeTip") }}</n-text>
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
              {{ t("settings.lyrics.restoreDefault") }}
            </n-button>

          </Transition>
          <n-input-number
            v-model:value="settingStore.lyricTranFontSize"
            :min="5"
            :max="40"
            :disabled="settingStore.useAMLyrics"
            class="set"
            :placeholder="t('settings.lyrics.tranFontSizePlaceholder')"
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
          <n-text class="name">{{ t("settings.lyrics.romaFontSize") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.tranFontSizeTip") }}</n-text>
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
              {{ t("settings.lyrics.restoreDefault") }}
            </n-button>

          </Transition>
          <n-input-number
            v-model:value="settingStore.lyricRomaFontSize"
            :min="5"
            :max="40"
            :disabled="settingStore.useAMLyrics"
            class="set"
            :placeholder="t('settings.lyrics.fontSizePlaceholder')"
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
          <n-text class="name">{{ t("settings.lyrics.fontSettings") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.lyrics.fontSettingsTip") }} </n-text>
        </div>
        <n-button type="primary" strong secondary @click="openFontManager"> {{ t("settings.general.configure") }} </n-button>
      </n-card>

      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.fontBold") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.fontBoldTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.lyricFontBold" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.position") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.positionTip") }}</n-text>
        </div>

        <n-select
          v-model:value="settingStore.lyricsPosition"
          :disabled="settingStore.useAMLyrics"
          :options="[
            {
              label: t('settings.lyrics.posLeft'),
              value: 'flex-start',
            },
            {
              label: t('settings.lyrics.posCenter'),
              value: 'center',
            },
            {
              label: t('settings.lyrics.posRight'),
              value: 'flex-end',
            },
          ]"
          class="set"
        />

      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.scrollPos") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.scrollPosTip") }}</n-text>
        </div>

        <n-select
          v-model:value="settingStore.lyricsScrollPosition"
          :options="[
            {
              label: t('settings.lyrics.scrollPosTop'),
              value: 'start',
            },
            {
              label: t('settings.lyrics.scrollPosCenter'),
              value: 'center',
            },
          ]"
          class="set"
        />

      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.pauseScroll") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.lyrics.pauseScrollTip") }} </n-text>
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
          <n-text class="name">{{ t("settings.lyrics.showYrc") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.showYrc" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.showYrc">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.lyrics.showYrcAnim") }}</n-text>
            <n-text class="tip" :depth="3"> {{ t("settings.lyrics.showYrcAnimTip") }} </n-text>
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
          <n-text class="name">{{ t("settings.lyrics.showTran") }}</n-text>
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
          <n-text class="name">{{ t("settings.lyrics.showRoma") }}</n-text>
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
          <n-text class="name">{{ t("settings.lyrics.autoBlur") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.lyrics.autoBlurTip") }} </n-text>
        </div>

        <n-switch v-model:value="settingStore.lyricsBlur" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.delayStep") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.delayStepTip") }}</n-text>
        </div>

        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.lyricOffsetStep !== 500"
              type="primary"
              strong
              secondary
              @click="settingStore.lyricOffsetStep = 500"
            >
              {{ t("settings.lyrics.restoreDefault") }}
            </n-button>

          </Transition>
          <n-input-number
            v-model:value="settingStore.lyricOffsetStep"
            :min="10"
            :max="10000"
            :step="10"
            class="set"
            :placeholder="t('settings.lyrics.delayStepPlaceholder')"
            @blur="

              settingStore.lyricOffsetStep === null ? (settingStore.lyricOffsetStep = 500) : null
            "
          >
            <template #suffix> ms </template>
          </n-input-number>
        </n-flex>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.lyrics.content") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">
            {{ t("settings.lyrics.onlineTtml") }}
            <n-tag type="warning" size="small" round> Beta </n-tag>
          </n-text>
          <n-text class="tip" :depth="3">
            {{ t("settings.lyrics.onlineTtmlTip") }}
          </n-text>
        </div>

        <n-switch v-model:value="settingStore.enableTTMLLyric" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.enableTTMLLyric">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.lyrics.ttmlDb") }}</n-text>
            <n-text class="tip" :depth="3">
              {{ t("settings.lyrics.ttmlDbTip") }}
            </n-text>
          </div>
          <n-button type="primary" strong secondary @click="openAMLLServer"> {{ t("settings.general.configure") }} </n-button>
        </n-card>

      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.exclude") }}</n-text>
          <n-text class="tip" :depth="3">
            {{ t("settings.lyrics.excludeTip") }}
          </n-text>
        </div>

        <n-switch v-model:value="settingStore.enableExcludeLyrics" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.enableExcludeLyrics">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.lyrics.excludeTtml") }}</n-text>
            <n-text class="tip" :depth="3" v-html="t('settings.lyrics.excludeTtmlTip')"></n-text>
          </div>
          <n-switch v-model:value="settingStore.enableExcludeTTML" class="set" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.lyrics.excludeLocal") }}</n-text>
            <n-text class="tip" :depth="3">
              {{ t("settings.lyrics.excludeLocalTip") }}
            </n-text>
          </div>

          <n-switch
            v-model:value="settingStore.enableExcludeLocalLyrics"
            class="set"
            :round="false"
          />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.lyrics.excludeContent") }}</n-text>
            <n-text class="tip" :depth="3"> {{ t("settings.lyrics.excludeContentTip") }} </n-text>
          </div>
          <n-button type="primary" strong secondary @click="openLyricExclude">{{ t("settings.general.configure") }}</n-button>

        </n-card>
      </n-collapse-transition>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar">
        {{ t("settings.lyrics.amLyrics") }}
        <n-tag type="warning" size="small" round>Beta</n-tag>
      </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.useAmLyrics") }}</n-text>
          <n-text class="tip" :depth="3">
            {{ t("settings.lyrics.useAmLyricsTip") }}
          </n-text>
        </div>

        <n-switch v-model:value="settingStore.useAMLyrics" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.useAMLyrics">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.lyrics.springEffect") }}</n-text>
            <n-text class="tip" :depth="3">
              {{ t("settings.lyrics.springEffectTip") }}
            </n-text>
          </div>
          <n-switch v-model:value="settingStore.useAMSpring" class="set" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.lyrics.hidePassed") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.lyrics.hidePassedTip") }}</n-text>
          </div>

          <n-switch v-model:value="settingStore.hidePassedLines" class="set" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.lyrics.gradientWidth") }}</n-text>
            <n-text class="tip" :depth="3" v-html="t('settings.lyrics.gradientWidthTip')"></n-text>
          </div>

          <n-input-number
            v-model:value="settingStore.wordFadeWidth"
            class="set"
            :min="0.01"
            :max="1"
            :step="0.01"
            :round="false"
          />
        </n-card>
      </n-collapse-transition>
    </div>
    <div v-if="isElectron" ref="desktopLyricRef" class="set-list">
      <n-h3 prefix="bar">
        {{ t("settings.lyrics.desktop") }}
        <n-tag type="warning" size="small" round>Beta</n-tag>
      </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.enableDesktop") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.lyrics.enableDesktopTip") }} </n-text>
        </div>
        <n-switch
          :value="statusStore.showDesktopLyric"
          :round="false"
          class="set"
          @update:value="player.setDesktopLyricShow"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.lockDesktop") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.lockDesktopTip") }}</n-text>
        </div>

        <n-switch
          v-model:value="desktopLyricConfig.isLock"
          :round="false"
          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.twoLine") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.twoLineTip") }}</n-text>
        </div>
        <n-switch
          v-model:value="desktopLyricConfig.isDoubleLine"
          :round="false"
          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.limitPos") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.limitPosTip") }}</n-text>
        </div>

        <n-switch
          v-model:value="desktopLyricConfig.limitBounds"
          :round="false"
          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <!-- position -->
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.align") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.alignTip") }}</n-text>
        </div>
        <n-select
          v-model:value="desktopLyricConfig.position"
          :options="[
            { label: t('settings.lyrics.alignLeft'), value: 'left' },
            { label: t('settings.lyrics.alignCenter'), value: 'center' },
            { label: t('settings.lyrics.alignRight'), value: 'right' },
            { label: t('settings.lyrics.alignBoth'), value: 'both' },
          ]"

          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.desktopFont") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.lyrics.desktopFontTip") }} </n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="desktopLyricConfig.fontFamily !== 'system-ui'"
              type="primary"
              strong
              secondary
              @click="
                () => {
                  desktopLyricConfig.fontFamily = 'system-ui';
                  saveDesktopLyricConfig();
                }
              "
            >
              {{ t("settings.lyrics.restoreDefault") }}
            </n-button>

          </Transition>
          <n-select
            v-model:value="desktopLyricConfig.fontFamily"
            :options="allFontsData"
            class="set"
            filterable
            @update:value="saveDesktopLyricConfig"
          />
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.showYrc") }}</n-text>
          <n-text class="tip" :depth="3">显示桌面歌词逐字效果</n-text>
        </div>
        <n-switch
          v-model:value="desktopLyricConfig.showYrc"
          :round="false"
          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.showDesktopTran") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.showDesktopTranTip") }}</n-text>
        </div>
        <n-switch
          v-model:value="desktopLyricConfig.showTran"
          :round="false"
          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.desktopBold") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.desktopBoldTip") }}</n-text>
        </div>

        <n-switch
          v-model:value="desktopLyricConfig.fontIsBold"
          :round="false"
          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.desktopFontSize") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.desktopFontSizeTip") }}</n-text>
        </div>

        <n-select
          v-model:value="desktopLyricConfig.fontSize"
          :options="
            Array.from({ length: 96 - 20 + 1 }, (_, i) => {
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
          <n-text class="name">{{ t("settings.lyrics.playedColor") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.playedColorTip") }}</n-text>
        </div>
        <n-color-picker
          v-model:value="desktopLyricConfig.playedColor"
          :show-alpha="false"
          :modes="['hex']"
          class="set"
          @complete="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.unplayedColor") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.unplayedColorTip") }}</n-text>
        </div>
        <n-color-picker
          v-model:value="desktopLyricConfig.unplayedColor"
          :show-alpha="false"
          :modes="['hex']"
          class="set"
          @complete="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.strokeColor") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.strokeColorTip") }}</n-text>
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
          <n-text class="name">{{ t("settings.lyrics.bgMask") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.bgMaskTip") }}</n-text>
        </div>
        <n-switch
          v-model:value="desktopLyricConfig.textBackgroundMask"
          :round="false"
          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.alwaysShowInfo") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.alwaysShowInfoTip") }}</n-text>
        </div>

        <n-switch
          v-model:value="desktopLyricConfig.alwaysShowPlayInfo"
          :round="false"
          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.lyrics.restoreConfig") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.lyrics.restoreConfigTip") }}</n-text>
        </div>
        <n-button type="primary" @click="restoreDesktopLyricConfig">{{ t("settings.lyrics.restoreDefault") }}</n-button>

      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NFlex, NText } from "naive-ui";
import { useSettingStore, useStatusStore } from "@/stores";
import { useI18n } from "vue-i18n";
import { cloneDeep, isEqual } from "lodash-es";

import { isElectron } from "@/utils/env";
import { openLyricExclude, openAMLLServer, openFontManager } from "@/utils/modal";
import { LyricConfig } from "@/types/desktop-lyric";
import { usePlayerController } from "@/core/player/PlayerController";
import { SelectOption } from "naive-ui";
import defaultDesktopLyricConfig from "@/assets/data/lyricConfig";

const props = defineProps<{ scrollTo?: string }>();

const player = usePlayerController();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const { t } = useI18n();


// 桌面歌词区域引用
const desktopLyricRef = ref<HTMLElement | null>(null);

// 全部字体
const allFontsData = ref<SelectOption[]>([]);

// 桌面歌词配置
const desktopLyricConfig = reactive<LyricConfig>({ ...defaultDesktopLyricConfig });

// 获取桌面歌词配置
const getDesktopLyricConfig = async () => {
  const config = await window.electron.ipcRenderer.invoke("request-desktop-lyric-option");
  if (config) Object.assign(desktopLyricConfig, config);
  // 监听更新
  window.electron.ipcRenderer.on("update-desktop-lyric-option", (_, config) => {
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
      "update-desktop-lyric-option",
      cloneDeep(desktopLyricConfig),
      true,
    );
    window.$message.success(t("settings.lyrics.saveSuccess"));
  } catch (error) {
    console.error("Failed to save options:", error);
    window.$message.error(t("settings.lyrics.saveFail"));

    getDesktopLyricConfig();
  }
};

// 恢复默认桌面歌词配置
const restoreDesktopLyricConfig = () => {
  try {
    if (!isElectron) return;
    window.$dialog.warning({
      title: t("general.dialog.warningTitle"),
      content: t("settings.lyrics.restoreConfirm"),
      positiveText: t("general.dialog.confirm"),
      negativeText: t("general.dialog.cancel"),

      onPositiveClick: () => {
        window.electron.ipcRenderer.send(
          "update-desktop-lyric-option",
          defaultDesktopLyricConfig,
          true,
        );
        window.$message.success(t("settings.lyrics.restoreSuccess"));
        console.log(defaultDesktopLyricConfig, desktopLyricConfig);
      },
    });
  } catch (error) {
    console.error("Failed to save options:", error);
    window.$message.error(t("settings.lyrics.restoreFail"));
    getDesktopLyricConfig();
  }

};

onMounted(async () => {
  if (isElectron) {
    getDesktopLyricConfig();
    // 恢复地址
    await window.api.store.set("amllDbServer", settingStore.amllDbServer);
  }
  // 如果需要滚动到桌面歌词部分
  if (props.scrollTo === "desktop" && desktopLyricRef.value) {
    nextTick(() => {
      desktopLyricRef.value?.scrollIntoView({ behavior: "instant", block: "start" });
    });
  }
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
