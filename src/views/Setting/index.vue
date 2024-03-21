<!-- 全局设置 -->
<template>
  <div :class="{ setting: true, 'use-cover': themeAutoCover }">
    <n-h1 class="title">
      <n-text>全局设置</n-text>
      <div class="copyright" @click="jump">
        <div class="author">
          <n-icon depth="3" size="18">
            <SvgIcon icon="github" />
          </n-icon>
          <n-text class="author-text" depth="3">{{ packageJson.author }}</n-text>
        </div>
        <n-text class="version" depth="3">{{ packageJson.version }}</n-text>
      </div>
    </n-h1>
    <!-- 导航栏 -->
    <n-tabs
      ref="setTabsRef"
      v-model:value="setTabsValue"
      type="segment"
      @update:value="settingTabChange"
    >
      <n-tab name="setTab1"> 常规 </n-tab>
      <n-tab name="setTab2"> 系统 </n-tab>
      <n-tab name="setTab3"> 播放 </n-tab>
      <n-tab name="setTab4"> 歌词 </n-tab>
      <n-tab name="setTab5"> 下载 </n-tab>
      <n-tab name="setTab6"> 其他 </n-tab>
    </n-tabs>
    <!-- 设置项 -->
    <n-scrollbar
      ref="setScrollRef"
      :style="{
        height: `calc(100vh - ${music.getPlaySongData?.id && showPlayBar ? 328 : 248}px)`,
      }"
      class="all-set"
      @scroll="allSetScroll"
    >
      <!-- 常规 -->
      <div class="set-type">
        <n-h3 prefix="bar"> 常规 </n-h3>
        <n-card class="set-item">
          <div class="name">明暗模式</div>
          <n-select
            v-model:value="themeType"
            :options="[
              {
                label: '浅色模式',
                value: 'light',
              },
              {
                label: '深色模式',
                value: 'dark',
              },
            ]"
            class="set"
            @update:value="themeAuto = false"
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">明暗模式是否跟随系统</div>
          <n-switch
            v-model:value="themeAuto"
            :round="false"
            @update:value="
              (val) => {
                if (val) themeType = osThemeRef;
              }
            "
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            开启侧边栏
            <n-text class="tip">将导航栏放于侧边显示，可展开或收起</n-text>
          </div>
          <n-switch v-model:value="showSider" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            侧边栏展示封面
            <n-text class="tip">侧边栏歌单是否展示歌单封面</n-text>
          </div>
          <n-switch v-model:value="siderShowCover" :disabled="!showSider" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">显示搜索历史</div>
          <n-switch v-model:value="showSearchHistory" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            自动签到
            <n-text class="tip">在每日首次开启软件时自动签到</n-text>
          </div>
          <n-switch v-model:value="autoSignIn" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            <div class="dev">
              全局动态取色
              <n-tag :bordered="false" round size="small" type="warning">
                开发中
                <template #icon>
                  <n-icon>
                    <SvgIcon icon="code" />
                  </n-icon>
                </template>
              </n-tag>
            </div>
            <n-text class="tip">主题色是否跟随封面，目前感觉不好看</n-text>
          </div>
          <n-switch
            v-model:value="themeAutoCover"
            :round="false"
            :disabled="Object.keys(coverTheme)?.length === 0"
            @update:value="themeAutoCoverChange"
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            <div class="dev">
              全局动态取色类别
              <n-tag :bordered="false" round size="small" type="warning">
                开发中
                <template #icon>
                  <n-icon>
                    <SvgIcon icon="code" />
                  </n-icon>
                </template>
              </n-tag>
            </div>
            <n-text class="tip">将在下一首播放或刷新时生效，不建议更改</n-text>
          </div>
          <n-select
            v-model:value="themeAutoCoverType"
            :disabled="!themeAutoCover"
            :options="[
              {
                label: '中性',
                value: 'neutral',
              },
              {
                label: '中性变体',
                value: 'neutralVariant',
              },
              {
                label: '主要',
                value: 'primary',
              },
              {
                label: '次要',
                value: 'secondary',
              },
              {
                label: '次次要',
                value: 'tertiary',
              },
            ]"
            class="set"
          />
        </n-card>
      </div>
      <!-- 系统 -->
      <div v-if="checkPlatform.electron()" class="set-type">
        <n-h3 prefix="bar"> 系统 </n-h3>
        <n-card class="set-item">
          <div class="name">关闭软件时</div>
          <n-select
            v-model:value="closeType"
            :disabled="closeTip"
            :options="[
              {
                label: '最小化到任务栏',
                value: 'hide',
              },
              {
                label: '直接退出',
                value: 'close',
              },
            ]"
            class="set"
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">每次关闭前都进行提醒</div>
          <n-switch v-model:value="closeTip" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">任务栏显示歌曲播放进度</div>
          <n-switch
            v-model:value="showTaskbarProgress"
            :round="false"
            @update:value="closeTaskbarProgress"
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            自动检查更新
            <n-text class="tip">在开启软件时自动检查更新</n-text>
          </div>
          <n-switch v-model:value="autoCheckUpdates" :round="false" />
        </n-card>
      </div>
      <div v-else class="set-type">
        <n-h3 prefix="bar"> 系统 </n-h3>
        <n-card class="set-item">
          <div class="name">该设置项为桌面端独占功能</div>
        </n-card>
      </div>
      <!-- 播放 -->
      <div class="set-type">
        <n-h3 prefix="bar"> 播放 </n-h3>
        <n-card class="set-item">
          <div class="name">
            启动时自动播放
            <n-text class="tip">
              {{ checkPlatform.electron() ? "程序启动时自动播放上次歌曲" : "客户端独占功能" }}
            </n-text>
          </div>
          <n-switch v-model:value="autoPlay" :disabled="!checkPlatform.electron()" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            记忆上次播放位置
            <n-text v-if="autoPlay" class="tip"> 与自动播放相冲突，已禁用 </n-text>
          </div>
          <n-switch v-model:value="memorySeek" :disabled="autoPlay" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            音乐资源自动缓存
            <n-text class="tip"> 可能会造成加载缓慢，将在下一首播放或刷新时生效 </n-text>
          </div>
          <n-switch v-model:value="useMusicCache" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">音乐渐入渐出</div>
          <n-switch v-model:value="songVolumeFade" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            播放全部搜索歌曲
            <n-text class="tip">
              在播放搜索页面上的歌曲时，是否同时播放所有搜索结果中的歌曲
            </n-text>
          </div>
          <n-switch v-model:value="playSearch" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            在线播放音质
            <n-text class="tip">
              {{ songLevelData[songLevel].tip }}
            </n-text>
          </div>
          <n-select v-model:value="songLevel" :options="Object.values(songLevelData)" class="set" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            底栏歌词显示
            <n-text class="tip">是否在播放时将歌手信息更改为歌词</n-text>
          </div>
          <n-switch v-model:value="bottomLyricShow" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">显示播放列表歌曲数量</div>
          <n-switch v-model:value="showPlaylistCount" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            播放器样式
            <n-text class="tip"> 播放器左侧区域样式 </n-text>
          </div>
          <n-select
            v-model:value="playCoverType"
            :options="[
              {
                label: '封面模式',
                value: 'cover',
              },
              {
                label: '唱片模式',
                value: 'record',
              },
            ]"
            class="set"
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            播放背景样式
            <n-text class="tip">
              {{
                playerBackgroundType === "animation"
                  ? "流体效果，较消耗性能，请谨慎开启"
                  : playerBackgroundType === "blur"
                    ? "将封面模糊处理为背景"
                    : "提取封面主色为渐变色"
              }}
            </n-text>
          </div>
          <n-select
            v-model:value="playerBackgroundType"
            :options="[
              {
                label: '流体效果',
                value: 'animation',
              },
              {
                label: '封面模糊',
                value: 'blur',
              },
              {
                label: '主色渐变',
                value: 'gradient',
              },
            ]"
            class="set"
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            显示前奏倒计时
            <n-text class="tip">部分歌曲前奏可能存在显示错误</n-text>
          </div>
          <n-switch v-model:value="countDownShow" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            尝试替换无法播放的歌曲
            <n-text class="tip">
              {{ checkPlatform.electron() ? "可能会造成音乐与原曲不符" : "客户端独占功能" }}
            </n-text>
          </div>
          <n-switch
            v-model:value="useUnmServer"
            :disabled="!checkPlatform.electron()"
            :round="false"
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            <div class="dev">
              显示音乐频谱
              <n-tag :bordered="false" round size="small" type="warning">
                开发中
                <template #icon>
                  <n-icon>
                    <SvgIcon icon="code" />
                  </n-icon>
                </template>
              </n-tag>
            </div>
            <n-text class="tip">
              {{
                showSpectrums
                  ? "开启音乐频谱会极大影响性能，如遇问题请关闭"
                  : "是否在播放器底部显示音乐频谱"
              }}
            </n-text>
          </div>
          <n-switch v-model:value="showSpectrums" :round="false" />
        </n-card>
      </div>
      <!-- 歌词 -->
      <div class="set-type">
        <n-h3 prefix="bar"> 歌词 </n-h3>
        <n-card
          class="set-item"
          :content-style="{
            flexDirection: 'column',
            alignItems: 'flex-start',
          }"
        >
          <div class="name">
            歌词文本大小
            <n-text :style="{ fontSize: lyricsFontSize + 'px', fontWeight: 'bold' }" class="tip">
              我是一句歌词
            </n-text>
          </div>
          <n-slider
            v-model:value="lyricsFontSize"
            :tooltip="false"
            :max="56"
            :min="36"
            :step="1"
            :marks="{
              36: '最小',
              46: '默认',
              56: '最大',
            }"
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            智能暂停滚动
            <n-text class="tip">鼠标移入歌词区域是否暂停滚动</n-text>
          </div>
          <n-switch v-model:value="lrcMousePause" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            歌词位置
            <n-text class="tip">歌词的默认垂直位置</n-text>
          </div>
          <n-select
            v-model:value="lyricsPosition"
            :options="[
              {
                label: '居左',
                value: 'left',
              },
              {
                label: '居中',
                value: 'center',
              },
              {
                label: '居右',
                value: 'right',
              },
            ]"
            class="set"
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            歌词滚动位置
            <n-text class="tip">歌词高亮时所处的位置</n-text>
          </div>
          <n-select
            v-model:value="lyricsBlock"
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
          <div class="name">
            <div class="dev">
              显示逐字歌词
              <n-tag :bordered="false" round size="small" type="warning">
                开发中
                <template #icon>
                  <n-icon>
                    <SvgIcon icon="code" />
                  </n-icon>
                </template>
              </n-tag>
            </div>
            <n-text class="tip">是否在具有逐字歌词时显示</n-text>
          </div>
          <n-switch v-model:value="showYrc" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            <div class="dev">
              显示逐字歌词动画
              <n-tag :bordered="false" round size="small" type="warning">
                开发中
                <template #icon>
                  <n-icon>
                    <SvgIcon icon="code" />
                  </n-icon>
                </template>
              </n-tag>
            </div>
            <n-text class="tip">可能会造成卡顿等性能问题，建议显卡为 GTX 2060 及以上</n-text>
          </div>
          <n-switch v-model:value="showYrcAnimation" :disabled="!showYrc" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            显示歌词翻译
            <n-text class="tip">是否在具有翻译歌词时显示</n-text>
          </div>
          <n-switch v-model:value="showTransl" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            显示歌词音译
            <n-text class="tip">是否在具有音译歌词时显示</n-text>
          </div>
          <n-switch v-model:value="showRoma" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            歌词自动聚焦
            <n-text class="tip">是否聚焦显示当前播放行，其他行将模糊显示</n-text>
          </div>
          <n-switch v-model:value="lyricsBlur" :round="false" />
        </n-card>
      </div>
      <!-- 下载 -->
      <div class="set-type">
        <n-h3 prefix="bar"> 下载 </n-h3>
        <n-card class="set-item">
          <div class="name">
            默认下载文件夹
            <n-text class="tip">{{ downloadPath || "不设置则会每次选择保存位置" }}</n-text>
          </div>
          <n-flex>
            <Transition name="fade" mode="out-in">
              <n-button
                v-if="downloadPath"
                type="error"
                strong
                secondary
                @click="downloadPath = null"
              >
                清除
              </n-button>
            </Transition>
            <n-button :disabled="!checkPlatform.electron()" strong secondary @click="choosePath">
              更改
            </n-button>
          </n-flex>
        </n-card>
        <n-card class="set-item">
          <div class="name">
            同时下载歌曲元信息
            <n-text class="tip">为当前下载歌曲附加封面及歌词等元信息</n-text>
          </div>
          <n-switch v-model:value="downloadMeta" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">下载歌曲时同时下载封面</div>
          <n-switch v-model:value="downloadCover" :disabled="!downloadMeta" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">下载歌曲时同时下载歌词</div>
          <n-switch v-model:value="downloadLyrics" :disabled="!downloadMeta" :round="false" />
        </n-card>
      </div>
      <!-- 其他 -->
      <div class="set-type">
        <n-h3 prefix="bar"> 其他 </n-h3>
        <n-card class="set-item">
          <div class="name">显示 GitHub 仓库按钮</div>
          <n-switch v-model:value="showGithub" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            默认加载数量
            <n-text class="tip">在部分列表页面显示几条数据</n-text>
          </div>
          <n-select
            v-model:value="loadSize"
            :options="[
              {
                label: '少一点（ 30 条 ）',
                value: 30,
              },
              {
                label: '差不多刚刚好（ 50 条 ）',
                value: 50,
              },
              {
                label: '我要很多（ 100 条 ）',
                value: 100,
              },
            ]"
            class="set"
            @update:value="themeAuto = false"
          />
        </n-card>
        <n-card class="set-item">
          <div class="name">
            程序重置
            <n-text class="tip">若程序显示异常或出现问题时可尝试此操作</n-text>
          </div>
          <n-button strong secondary type="error" @click="resetApp"> 重置 </n-button>
        </n-card>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useOsTheme } from "naive-ui";
import { siteSettings, siteStatus, musicData } from "@/stores";
import { checkPlatform } from "@/utils/helper";
import debounce from "@/utils/debounce";
import packageJson from "@/../package.json";

const music = musicData();
const status = siteStatus();
const settings = siteSettings();
const { showPlayBar, coverTheme } = storeToRefs(status);
const {
  themeType,
  themeTypeName,
  themeAuto,
  themeAutoCover,
  themeAutoCoverType,
  showSider,
  closeTip,
  closeType,
  loadSize,
  songVolumeFade,
  autoPlay,
  showYrc,
  showYrcAnimation,
  countDownShow,
  playerBackgroundType,
  useUnmServer,
  showTransl,
  showRoma,
  songLevel,
  showTaskbarProgress,
  lyricsPosition,
  lyricsBlock,
  lrcMousePause,
  lyricsFontSize,
  lyricsBlur,
  showSearchHistory,
  autoSignIn,
  bottomLyricShow,
  downloadPath,
  memorySeek,
  showGithub,
  playCoverType,
  playSearch,
  showPlaylistCount,
  showSpectrums,
  siderShowCover,
  useMusicCache,
  downloadMeta,
  downloadCover,
  downloadLyrics,
  autoCheckUpdates,
} = storeToRefs(settings);

// 标签页数据
const setTabsRef = ref(null);
const setScrollRef = ref(null);
const setTabsValue = ref("setTab1");

// 基础数据
const osThemeRef = useOsTheme();

// 音质数据
const songLevelData = {
  standard: {
    label: "标准音质",
    tip: "标准音质 128kbps",
    value: "standard",
  },
  higher: {
    label: "较高音质",
    tip: "较高音质 328kbps",
    value: "higher",
  },
  exhigh: {
    label: "极高 HQ",
    tip: "近 CD 品质的细节体验，最高 320kbps",
    value: "exhigh",
  },
  lossless: {
    label: "无损 SQ",
    tip: "高保真无损音质，最高 48kHz/16bit",
    value: "lossless",
  },
  hires: {
    label: "高清臻音 Spatial Audio",
    tip: "环绕声体验，声音听感增强，96kHz/24bit",
    value: "hires",
  },
  jymaster: {
    label: "超清母带 Master",
    tip: "还原音频细节，192kHz/24bit",
    value: "jymaster",
  },
  sky: {
    label: "沉浸环绕声 Surround Audio",
    tip: "沉浸式体验，最高 5.1 声道",
    value: "sky",
  },
};

// 封面自动跟随变化
const themeAutoCoverChange = (val) => {
  if ($changeThemeColor !== "undefined" && Object.keys(coverTheme.value)?.length) {
    $changeThemeColor(val ? coverTheme.value : themeTypeName.value, val);
  }
};

// 标签页切换
const settingTabChange = (name) => {
  const index = Number(name.replace("setTab", ""));
  const setDom = document.querySelectorAll(".set-type")?.[index - 1];
  if (!setDom) return false;
  // 滚动至设置分类
  setDom.scrollIntoView({ behavior: "smooth" });
};

// 设置列表滚动
const allSetScroll = debounce((e) => {
  const distance = e.target.scrollTop + 30;
  const allSetDom = document.querySelectorAll(".set-type");
  allSetDom.forEach((v, i) => {
    if (distance >= v.offsetTop) setTabsValue.value = `setTab${i + 1}`;
  });
}, 100);

// 关闭任务栏进度
const closeTaskbarProgress = (val) => {
  if (!val) electron.ipcRenderer.send("setProgressBar", "close");
};

// 更改下载目录
const choosePath = async () => {
  const selectedDir = await electron.ipcRenderer.invoke("selectDir", true);
  if (selectedDir) downloadPath.value = selectedDir;
};

// 跳转
const jump = () => {
  window.open(packageJson.github);
};

// 程序重置
const resetApp = () => {
  $dialog.warning({
    title: "程序重置",
    content: "确认重置为默认状态？你的登录状态以及自定义设置都将丢失！",
    positiveText: "重置",
    negativeText: "取消",
    onPositiveClick: () => {
      if (typeof $cleanAll === "undefined") {
        return $message.error("重置操作出现错误，请重试");
      }
      $cleanAll(false);
      $message.success("重置成功，正在重启");
      setTimeout(() => {
        if (checkPlatform.electron()) {
          electron.ipcRenderer.send("window-relaunch");
        } else {
          window.location.href = "/";
        }
      }, 1000);
    },
  });
};
</script>

<style lang="scss" scoped>
.setting {
  max-width: 1200px;
  margin: 0 auto;
  .title {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    height: 58px;
    margin: 20px 0;
    font-size: 36px;
    font-weight: bold;
    .copyright {
      display: flex;
      flex-direction: row;
      align-items: center;
      margin-left: 12px;
      margin-bottom: 6px;
      font-size: 16px;
      font-weight: normal;
      cursor: pointer;
      .author {
        display: flex;
        align-items: center;
        &::after {
          content: "/";
          transform: translateY(2px);
          font-size: 14px;
          margin: 0 6px;
          opacity: 0.6;
        }
        .author-text {
          margin-left: 6px;
        }
      }
      .version {
        &::before {
          content: "v";
          margin-right: 2px;
        }
      }
    }
  }
  .n-tabs {
    height: 42px;
  }
  .set-type {
    padding-top: 30px;
    .set-item {
      width: 100%;
      border-radius: 8px;
      margin-bottom: 12px;
      &:last-child {
        margin-bottom: 0;
      }
      :deep(.n-card__content) {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .name {
        font-size: 16px;
        display: flex;
        flex-direction: column;
        padding-right: 20px;
        .dev {
          display: flex;
          flex-direction: row;
          align-items: center;
          .n-tag {
            margin-left: 6px;
          }
        }
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
    }
  }
  &.use-cover {
    .n-switch {
      &.n-switch--active {
        :deep(.n-switch__rail) {
          background-color: var(--main-second-color);
        }
      }
    }
  }
}
</style>
