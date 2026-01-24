<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 歌词设置 </n-h3>
      <n-card
        id="lyrics-show"
        :content-style="{
          'flex-direction': 'column',
          'align-items': settingStore.lyricsPosition,
          '--font-weight': settingStore.lyricFontWeight,
          '--font-size': settingStore.lyricFontSize,
          '--font-tran-size': tranFontSize,
          '--font-roma-size': romaFontSize,
          '--transform-origin':
            settingStore.lyricsPosition === 'center'
              ? 'center'
              : settingStore.lyricsPosition === 'flex-start'
                ? 'left'
                : 'right',
          '--font-family': settingStore.LyricFont !== 'follow' ? settingStore.LyricFont : '',
        }"
        class="set-item"
      >
        <n-card class="warning" v-if="settingStore.useAMLyrics">
          <n-text>
            正在使用 Apple Music-like Lyrics，实际显示效果可能与此处的预览有较大差别
          </n-text>
        </n-card>
        <div v-for="item in 2" :key="item" :class="['lrc-item', { on: item === 2 }]">
          <n-text>我是一句歌词</n-text>
          <template v-if="settingStore.swapTranRoma">
            <n-text v-if="settingStore.showRoma">wo shi yi ju ge ci</n-text>
            <n-text v-if="settingStore.showTran">I'm the lyric</n-text>
          </template>
          <template v-else>
            <n-text v-if="settingStore.showTran">I'm the lyric</n-text>
            <n-text v-if="settingStore.showRoma">wo shi yi ju ge ci</n-text>
          </template>
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
            v-model:value="tranFontSize"
            :min="5"
            :max="40"
            :disabled="settingStore.useAMLyrics"
            class="set"
            placeholder="请输入翻译歌词字体大小"
            :title="tranFontSizeTitle"
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
            v-model:value="romaFontSize"
            :min="5"
            :max="40"
            :disabled="settingStore.useAMLyrics"
            class="set"
            placeholder="请输入歌词字体大小"
            :title="tranFontSizeTitle"
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
          <n-text class="name">歌词字体设置</n-text>
          <n-text class="tip" :depth="3"> 统一配置各语种歌词区域的字体 </n-text>
        </div>
        <n-button type="primary" strong secondary @click="openFontManager"> 配置 </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词字重设置</n-text>
          <n-text class="tip" :depth="3">设置歌词显示的字重，部分字体可能不支持所有字重</n-text>
        </div>
        <n-input-number
          v-model:value="settingStore.lyricFontWeight"
          :min="100"
          :max="900"
          :step="100"
          class="set"
        />
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
          <n-text class="name">歌词左侧边距</n-text>
          <n-text class="tip" :depth="3">调整全屏模式下歌词的起始位置</n-text>
        </div>
        <n-slider
          v-model:value="settingStore.lyricHorizontalOffset"
          :min="0"
          :max="200"
          :step="1"
          :marks="{ 10: '默认' }"
          :format-tooltip="(value: number) => `${value}px`"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">默认歌词靠右</n-text>
          <n-text class="tip" :depth="3">左右对唱位置互换</n-text>
        </div>
        <n-switch v-model:value="settingStore.lyricAlignRight" class="set" :round="false" />
      </n-card>

      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词滚动位置</n-text>
          <n-text class="tip" :depth="3">歌词高亮时在屏幕中的垂直位置</n-text>
        </div>
        <n-slider
          v-model:value="settingStore.lyricsScrollOffset"
          :min="0.1"
          :max="0.9"
          :step="0.05"
          :format-tooltip="(value: number) => `${(value * 100).toFixed(0)}%`"
          :marks="{ '0.1': '靠上', '0.9': '靠下' }"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示逐字歌词</n-text>
          <n-text class="tip" :depth="3"> 对性能要求较高，若发生卡顿请关闭 </n-text>
        </div>
        <n-switch v-model:value="settingStore.showYrc" class="set" :round="false" />
      </n-card>
      <n-collapse-transition v-if="isElectron" :show="settingStore.showYrc">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">优先使用 QM 歌词</n-text>
            <n-text class="tip" :depth="3"> 优先从 QM 获取逐字歌词，模糊搜索，可能不准确 </n-text>
          </div>
          <n-switch v-model:value="settingStore.preferQQMusicLyric" class="set" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">本地歌曲使用 QM 歌词</n-text>
            <n-text class="tip" :depth="3">
              为本地歌曲从 QM 匹配逐字歌词，如已有 TTML 歌词则跳过
            </n-text>
          </div>
          <n-switch
            v-model:value="settingStore.localLyricQQMusicMatch"
            class="set"
            :round="false"
          />
        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示歌词翻译</n-text>
        </div>
        <n-switch v-model:value="settingStore.showTran" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示歌词音译</n-text>
        </div>
        <n-switch v-model:value="settingStore.showRoma" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">调换翻译与音译位置</n-text>
          <n-text class="tip" :depth="3">开启后音译显示在翻译上方</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.swapTranRoma"
          :disabled="!settingStore.showTran || !settingStore.showRoma"
          class="set"
          :round="false"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词自动模糊</n-text>
          <n-text class="tip" :depth="3"> 是否聚焦显示当前播放行，其他行将模糊显示 </n-text>
        </div>
        <n-switch v-model:value="settingStore.lyricsBlur" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词时延调节步长</n-text>
          <n-text class="tip" :depth="3">单位毫秒，每次点击调节的时延大小</n-text>
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
              恢复默认
            </n-button>
          </Transition>
          <n-input-number
            v-model:value="settingStore.lyricOffsetStep"
            :min="10"
            :max="10000"
            :step="10"
            class="set"
            placeholder="请输入时延步长"
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
      <n-h3 prefix="bar"> 歌词内容 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">更喜欢繁体中文</n-text>
          <n-text class="tip" :depth="3"> 将简体中文的歌词文本和翻译内容转换为繁体中文 </n-text>
        </div>
        <n-switch
          v-model:value="settingStore.preferTraditionalChinese"
          class="set"
          :round="false"
        />
      </n-card>
      <n-collapse-transition :show="settingStore.preferTraditionalChinese">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">繁体中文变体</n-text>
            <n-text class="tip" :depth="3"> 偏好的繁体中文变体 </n-text>
          </div>
          <n-select
            v-model:value="settingStore.traditionalChineseVariant"
            :options="[
              { label: '繁体中文 (标准)', value: 's2t' },
              { label: '台湾正体', value: 's2tw' },
              { label: '香港繁体', value: 's2hk' },
              // { label: '台湾正体 (包含词汇)', value: 's2twp' }, // 包含词汇的转换可能会导致字数发生变化，不开了
            ]"
            class="set"
          />
        </n-card>
      </n-collapse-transition>
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
        <n-switch v-model:value="settingStore.enableOnlineTTMLLyric" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.enableOnlineTTMLLyric">
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
        <n-card v-if="isElectron" class="set-item">
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
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">显示逐字音译</n-text>
          </div>
          <n-switch v-model:value="settingStore.showWordsRoma" class="set" :round="false" />
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
        <n-button type="primary" strong secondary @click="openFontManager">配置</n-button>
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
          <n-text class="name">文字字重</n-text>
          <n-text class="tip" :depth="3">设置桌面歌词显示的字重</n-text>
        </div>
        <n-input-number
          v-model:value="desktopLyricConfig.fontWeight"
          :min="100"
          :max="900"
          :step="100"
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
      <n-collapse-transition :show="desktopLyricConfig.textBackgroundMask">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">遮罩颜色</n-text>
            <n-text class="tip" :depth="3">设置背景遮罩的颜色和透明度</n-text>
          </div>
          <n-color-picker
            v-model:value="desktopLyricConfig.backgroundMaskColor"
            :show-alpha="true"
            :modes="['rgb', 'hex']"
            class="set"
            @complete="saveDesktopLyricConfig"
          />
        </n-card>
      </n-collapse-transition>
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
import defaultDesktopLyricConfig from "@/assets/data/lyricConfig";
import { usePlayerController } from "@/core/player/PlayerController";
import { useSettingStore, useStatusStore } from "@/stores";
import { LyricConfig } from "@/types/desktop-lyric";
import { isElectron } from "@/utils/env";
import { openAMLLServer, openFontManager, openLyricExclude } from "@/utils/modal";
import { cloneDeep, isEqual } from "lodash-es";
import { NFlex, NText } from "naive-ui";

const props = defineProps<{ scrollTo?: string }>();

const player = usePlayerController();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 桌面歌词区域引用
const desktopLyricRef = ref<HTMLElement | null>(null);

/**
 * 创建响应式字体大小计算属性
 * 当启用 AMLL 时，翻译和音译的字体大小会根据主歌词大小自动调整
 */
const fontSizeComputed = (key: string) =>
  computed({
    get: () =>
      settingStore.useAMLyrics
        ? // AMLL 会为翻译和音译设置 `font-size: max(.5em, 10px);`
          Math.max(0.5 * settingStore.lyricFontSize, 10)
        : settingStore[key],
    set: (value) => (settingStore[key] = value),
  });

// 真实显示的翻译歌词字体大小
const tranFontSize = fontSizeComputed("lyricTranFontSize");

// 真实显示的音译歌词字体大小
const romaFontSize = fontSizeComputed("lyricRomaFontSize");

// 显示翻译和音译歌词字体大小被禁用的原因
const tranFontSizeTitle = computed(() =>
  settingStore.useAMLyrics ? "翻译和音译歌词大小由 Apple Music-like Lyrics 自动设置" : "",
);

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
      font-family: var(--font-family);

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
  .warning {
    border-radius: 8px;
    font-size: 16px;
    background-color: rgba(255, 255, 255, 0.1);
    margin-bottom: 4px;
  }
}
</style>
