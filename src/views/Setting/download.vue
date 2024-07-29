<template>
  <div class="set-type">
    <n-h3 prefix="bar"> 下载 </n-h3>
    <n-card class="set-item">
      <div class="name">
        默认下载文件夹
        <n-text class="tip">{{ downloadPath || "不设置则会每次选择保存位置" }}</n-text>
      </div>
      <n-flex>
        <Transition name="fade" mode="out-in">
          <n-button v-if="downloadPath" type="error" strong secondary @click="downloadPath = null">
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
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteSettings } from "@/stores";
import { checkPlatform } from "@/utils/helper";

const settings = siteSettings();
const {
  downloadPath,

  downloadMeta,
  downloadCover,
  downloadLyrics,
} = storeToRefs(settings);

// 更改下载目录
const choosePath = async () => {
  const selectedDir = await electron.ipcRenderer.invoke("selectDir", true);
  if (selectedDir) downloadPath.value = selectedDir;
};
</script>
