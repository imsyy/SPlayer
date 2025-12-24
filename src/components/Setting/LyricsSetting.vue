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
          <n-text class="tip" :depth="3">单位 px，最小 12，最大 60</n-text>
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
            :min="12"
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
          <n-text class="tip" :depth="3">单位 px，最小 5，最大 40</n-text>
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
            :min="5"
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
          <n-text class="tip" :depth="3">单位 px，最小 5，最大 40</n-text>
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
            :min="5"
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
          <n-text class="name">歌词区域字体</n-text>
          <n-text class="tip" :depth="3"> 是否独立更改歌词区域字体 </n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.LyricFont !== 'follow'"
              type="primary"
              strong
              secondary
              @click="settingStore.LyricFont = 'follow'"
            >
              恢复默认
            </n-button>
          </Transition>
          <n-select
            v-model:value="settingStore.LyricFont"
            :options="[
              { label: '跟随全局', value: 'follow' },
              ...allFontsData.filter((v) => v.value !== 'default'),
            ]"
            class="set"
            filterable
          />
        </n-flex>
      </n-card>
      <n-collapse-transition :show="settingStore.LyricFont !== 'follow'">
        <n-card v-for="item in languageFontSettings" :key="item.key" class="set-item">
          <div class="label">
            <n-text class="name">{{ item.name }}歌词字体</n-text>
            <n-text class="tip" :depth="3"> {{ item.tip }} </n-text>
          </div>
          <n-flex>
            <Transition name="fade" mode="out-in">
              <n-button
                v-if="settingStore[item.key] !== 'follow'"
                type="primary"
                strong
                secondary
                @click="settingStore[item.key] = 'follow'"
              >
                恢复默认
              </n-button>
            </Transition>
            <n-select
              v-model:value="settingStore[item.key]"
              :options="[
                { label: '跟随全局', value: 'follow' },
                ...allFontsData.filter((v) => v.value !== 'default'),
              ]"
              class="set"
              filterable
            />
          </n-flex>
        </n-card>
      </n-collapse-transition>
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
      <n-h3 prefix="bar"> 歌词内容 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">
            启用在线 TTML 歌词
            <n-tag type="warning" size="small" round> Beta </n-tag>
          </n-text>
          <n-text class="tip" :depth="3">
            是否从 AMLL TTML DB 获取歌词（如有），TTML
            歌词支持逐字、翻译、音译等功能，将会在下一首歌生效
          </n-text>
        </div>
        <n-switch v-model:value="settingStore.enableTTMLLyric" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.enableTTMLLyric">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">AMLL TTML DB 地址</n-text>
            <n-text class="tip" :depth="3">
              AMLL TTML DB 地址，请确保地址正确，否则将导致歌词获取失败
            </n-text>
          </div>
          <n-button type="primary" strong secondary @click="openAMLLServer"> 配置 </n-button>
        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">启用歌词排除</n-text>
          <n-text class="tip" :depth="3">
            开启后可配置排除歌词，包含关键词或匹配正则表达式的歌词行将不会显示
          </n-text>
        </div>
        <n-switch v-model:value="settingStore.enableExcludeLyrics" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.enableExcludeLyrics">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">TTML 歌词排除</n-text>
            <n-text class="tip" :depth="3">
              是否要对 TTML 歌词进行歌词排除 <br />
              AMLL TTML DB 对此有硬性规定，不得包含作词、作曲等歌词无关内容，因此大多情况下无需开启
            </n-text>
          </div>
          <n-switch v-model:value="settingStore.enableExcludeTTML" class="set" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">本地歌词排除</n-text>
            <n-text class="tip" :depth="3">
              是否要对来自本地的歌词进行歌词排除，这包含本地覆盖的在线歌词和本地歌曲中的歌词
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
            <n-text class="name">歌词排除内容</n-text>
            <n-text class="tip" :depth="3"> 包含关键词或匹配正则表达式的歌词行将不会显示 </n-text>
          </div>
          <n-button type="primary" strong secondary @click="openLyricExclude">配置</n-button>
        </n-card>
      </n-collapse-transition>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar">
        Apple Music-like Lyrics
        <n-tag type="warning" size="small" round>Beta</n-tag>
      </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">使用 Apple Music-like Lyrics</n-text>
          <n-text class="tip" :depth="3">
            歌词使用 Apple Music-like Lyrics 进行渲染，需要高性能设备
          </n-text>
        </div>
        <n-switch v-model:value="settingStore.useAMLyrics" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.useAMLyrics">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">歌词弹簧效果</n-text>
            <n-text class="tip" :depth="3">
              是否使用物理弹簧算法实现歌词动画效果，需要高性能设备
            </n-text>
          </div>
          <n-switch v-model:value="settingStore.useAMSpring" class="set" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">隐藏已播放歌词</n-text>
            <n-text class="tip" :depth="3">是否隐藏已播放歌词</n-text>
          </div>
          <n-switch v-model:value="settingStore.hidePassedLines" class="set" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">文字动画的渐变宽度</n-text>
            <n-text class="tip" :depth="3">
              单位以歌词行的主文字字体大小的倍数为单位 <br />
              默认为 0.5，即一个全角字符的一半宽度 <br />
              若模拟 Apple Music for Android 的效果，可以设为 1 <br />
              若模拟 Apple Music for iPad 的效果，可以设为 0.5 <br />
              若需近乎禁用渐变，可设为非常接近 0 的小数，如 0.01
            </n-text>
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
        桌面歌词
        <n-tag type="warning" size="small" round>Beta</n-tag>
      </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">开启桌面歌词</n-text>
          <n-text class="tip" :depth="3"> 如遇问题请向开发者反馈 </n-text>
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
          <n-text class="name">锁定桌面歌词位置</n-text>
          <n-text class="tip" :depth="3">是否锁定桌面歌词位置，防止误触或遮挡内容</n-text>
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
          <n-text class="name">双行歌词</n-text>
          <n-text class="tip" :depth="3">是否启用双行歌词，交替显示当前句和下一句</n-text>
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
          <n-text class="name">限制歌词位置</n-text>
          <n-text class="tip" :depth="3">是否限制桌面歌词位置在当前屏幕内</n-text>
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
          <n-text class="name">对齐方式</n-text>
          <n-text class="tip" :depth="3">桌面歌词对齐方式</n-text>
        </div>
        <n-select
          v-model:value="desktopLyricConfig.position"
          :options="[
            { label: '左对齐', value: 'left' },
            { label: '居中对齐', value: 'center' },
            { label: '右对齐', value: 'right' },
            { label: '左右分离', value: 'both' },
          ]"
          class="set"
          @update:value="saveDesktopLyricConfig"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词字体</n-text>
          <n-text class="tip" :depth="3"> 更改桌面歌词字体 </n-text>
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
              恢复默认
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
          <n-text class="name">显示逐字歌词</n-text>
          <n-text class="tip" :depth="3">是否显示桌面歌词逐字效果</n-text>
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
          <n-text class="name">显示翻译</n-text>
          <n-text class="tip" :depth="3">是否显示桌面歌词翻译</n-text>
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
          <n-text class="name">文字加粗</n-text>
          <n-text class="tip" :depth="3">是否加粗桌面歌词文字</n-text>
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
          <n-text class="name">文字大小</n-text>
          <n-text class="tip" :depth="3">翻译或其他文字将会跟随变化</n-text>
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
          <n-text class="name">已播放文字</n-text>
          <n-text class="tip" :depth="3">桌面歌词已播放文字颜色</n-text>
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
          <n-text class="name">未播放文字</n-text>
          <n-text class="tip" :depth="3">桌面歌词未播放文字颜色</n-text>
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
          <n-text class="name">文本背景遮罩</n-text>
          <n-text class="tip" :depth="3">防止在某些界面看不清文本</n-text>
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
          <n-text class="name">始终展示播放信息</n-text>
          <n-text class="tip" :depth="3">是否始终展示当前歌曲名及歌手</n-text>
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
          <n-text class="name">恢复默认配置</n-text>
          <n-text class="tip" :depth="3">恢复默认桌面歌词配置</n-text>
        </div>
        <n-button type="primary" @click="restoreDesktopLyricConfig">恢复默认</n-button>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NFlex, NText } from "naive-ui";
import { useSettingStore, useStatusStore } from "@/stores";
import { cloneDeep, isEqual } from "lodash-es";
import { isElectron } from "@/utils/env";
import { openLyricExclude, openAMLLServer } from "@/utils/modal";
import { LyricConfig } from "@/types/desktop-lyric";
import { usePlayerController } from "@/core/player/PlayerController";
import { SelectOption } from "naive-ui";
import defaultDesktopLyricConfig from "@/assets/data/lyricConfig";

const props = defineProps<{ scrollTo?: string }>();

const player = usePlayerController();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

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
    window.$dialog.warning({
      title: "警告",
      content: "此操作将恢复所有桌面歌词配置为默认值，是否继续?",
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: () => {
        window.electron.ipcRenderer.send(
          "update-desktop-lyric-option",
          defaultDesktopLyricConfig,
          true,
        );
        window.$message.success("桌面歌词配置已恢复默认");
        console.log(defaultDesktopLyricConfig, desktopLyricConfig);
      },
    });
  } catch (error) {
    console.error("Failed to save options:", error);
    window.$message.error("桌面歌词配置恢复默认失败");
    getDesktopLyricConfig();
  }
};

// 语言字体配置
const languageFontSettings = [
  {
    name: "英语",
    key: "englishLyricFont" as const,
    tip: "是否在歌词为英语时单独设置字体",
  },
  {
    name: "日语",
    key: "japaneseLyricFont" as const,
    tip: "是否在歌词为日语时单独设置字体",
  },
  {
    name: "韩语",
    key: "koreanLyricFont" as const,
    tip: "是否在歌词为韩语时单独设置字体",
  },
];

// 获取全部系统字体
const getAllSystemFonts = async () => {
  const allFonts = await window.electron.ipcRenderer.invoke("get-all-fonts");
  allFonts.map((v: string) => {
    // 去除前后的引号
    v = v.replace(/^['"]+|['"]+$/g, "");
    allFontsData.value.push({
      label: v,
      value: v,
      style: {
        fontFamily: v,
      },
    });
  });
  // 添加默认选项
  allFontsData.value.unshift({
    label: "系统默认",
    value: "system-ui",
    style: {
      fontFamily: "system-ui",
    },
  });
};

onMounted(async () => {
  if (isElectron) {
    getDesktopLyricConfig();
    getAllSystemFonts();
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
