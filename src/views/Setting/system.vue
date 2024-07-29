<template>
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
      <div class="name">
        自定义字体
        <n-text class="tip"> 若有新安装的字体，需要重启后才能生效 </n-text>
      </div>
      <n-flex>
        <Transition name="fade" mode="out-in">
          <n-button
            v-if="systemFonts !== 'HarmonyOS Sans'"
            type="error"
            strong
            secondary
            @click="settings.changeSystemFonts('HarmonyOS Sans')"
          >
            恢复默认
          </n-button>
        </Transition>
        <n-select
          :value="systemFonts"
          :options="allFontsData"
          class="set"
          @update:value="allFontsDataChange"
        />
      </n-flex>
    </n-card>
    <n-card class="set-item">
      <div class="name">自定义字体仅在歌词区域生效</div>
      <n-switch
        v-model:value="justLyricArea"
        :round="false"
        :disabled="systemFonts === 'HarmonyOS Sans'"
        @update:value="settings.changeSystemFonts(systemFonts)"
      />
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
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteSettings } from "@/stores";
import { checkPlatform } from "@/utils/helper";

const settings = siteSettings();
const { closeTip, closeType, showTaskbarProgress, autoCheckUpdates, systemFonts, justLyricArea } =
  storeToRefs(settings);

// 系统字体列表
const allFontsData = ref([]);

// 关闭任务栏进度
const closeTaskbarProgress = (val) => {
  if (!val) electron.ipcRenderer.send("setProgressBar", "close");
};

// 获取全部系统字体
const getSystemFonts = async () => {
  if (!checkPlatform.electron()) return false;
  const allFonts = await electron.ipcRenderer.invoke("getAllFonts");
  allFonts.map((v) => {
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
};

// 系统字体变化
const allFontsDataChange = (val) => {
  console.log("切换字体为：", val);
  settings.changeSystemFonts(val);
};

onMounted(() => {
  getSystemFonts();
});
</script>
