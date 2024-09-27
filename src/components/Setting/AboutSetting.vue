<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 关于软件 </n-h3>
      <n-card class="set-item">
        <n-flex align="center" class="about">
          <SvgIcon name="SPlayer" size="26" />
          <n-text class="logo-name">SPlayer</n-text>
          <n-tag :bordered="false" size="small" type="primary">
            {{ packageJson.version }}
          </n-tag>
        </n-flex>
        <n-button type="primary" strong secondary @click="checkUpdate"> 检查更新 </n-button>
      </n-card>
      <n-collapse-transition :show="!!updateData">
        <n-card class="set-item update-data">
          <n-flex class="version">
            <n-text>最新版本</n-text>
            <n-tag :bordered="false" size="small" type="primary">
              {{ newVersion?.version || "v0.0.0" }}
            </n-tag>
            <n-text :depth="3" class="time">{{ newVersion?.time }}</n-text>
          </n-flex>
          <div class="changelog" v-html="newVersion?.changelog" />
        </n-card>
      </n-collapse-transition>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 历史版本 </n-h3>
      <n-collapse-transition :show="oldVersion?.length > 0">
        <n-collapse accordion>
          <n-collapse-item
            v-for="(item, index) in oldVersion"
            :key="index"
            :title="item.version"
            :name="item.version"
          >
            <n-card class="set-item update-data">
              <n-flex class="version" justify="space-between">
                <n-tag :bordered="false" size="small" type="primary">
                  {{ item?.version || "v0.0.0" }}
                </n-tag>
                <n-text :depth="3" class="time">{{ item?.time }}</n-text>
              </n-flex>
              <div class="changelog" v-html="item?.changelog" />
            </n-card>
          </n-collapse-item>
        </n-collapse>
      </n-collapse-transition>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 社区与资讯 </n-h3>
      <n-flex class="link">
        <n-card
          v-for="(item, index) in communityData"
          :key="index"
          class="link-item"
          hoverable
          @click="openLink(item.url)"
        >
          <SvgIcon :name="item.icon" :size="26" />
          <n-text class="name"> {{ item.name }} </n-text>
        </n-card>
      </n-flex>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UpdateLogType } from "@/types/main";
import { getUpdateLog, isElectron, openLink } from "@/utils/helper";
import { debounce } from "lodash-es";
import packageJson from "@/../package.json";

// 社区数据
const communityData = [
  {
    name: "GitHub",
    url: packageJson.github,
    icon: "Github",
  },
  {
    name: "官方博客",
    url: packageJson.blog,
    icon: "RssFeed",
  },
];

// 更新日志数据
const updateData = ref<UpdateLogType[] | null>(null);

// 最新版本
const newVersion = computed<UpdateLogType | undefined>(() => updateData.value?.[0]);

// 历史版本
const oldVersion = computed<UpdateLogType[]>(() => {
  const oldData = updateData.value?.slice(1);
  return oldData ? oldData : [];
});

// 检查更新
const checkUpdate = debounce(() => {
  if (!isElectron) {
    window.open(packageJson.github + "/releases", "_blank");
    return;
  }
  window.$notification.info({
    title: "检查更新",
    content: "正在检查更新，请稍后...",
    duration: 3000,
  });
  window.electron.ipcRenderer.send("check-update", true);
}, 300);

// 获取更新日志
const getUpdateData = async () => (updateData.value = await getUpdateLog());

onMounted(getUpdateData);
</script>

<style lang="scss" scoped>
.about {
  .logo-name {
    font-size: 16px;
  }
  .n-tag {
    border-radius: 6px;
  }
}
.update-data {
  :deep(.n-card__content) {
    flex-direction: column !important;
    align-items: normal !important;
  }
  .version {
    padding-left: 4px;
    .n-tag {
      border-radius: 6px;
    }
    .time {
      margin-left: auto;
      font-size: 13px;
    }
  }
  .changelog {
    margin-top: 12px;
    padding: 20px;
    background-color: var(--n-border-color);
    border-radius: 8px;
    :deep(ul) {
      margin: 1rem 0 0 1rem;
    }
  }
}
.link {
  .link-item {
    max-width: 200px;
    border-radius: 8px;
    cursor: pointer;
    :deep(.n-card__content) {
      display: flex;
      align-items: center;
      padding: 12px;
    }
    .n-icon {
      margin-right: 6px;
    }
  }
}
</style>
