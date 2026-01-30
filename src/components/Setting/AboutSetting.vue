<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 关于软件 </n-h3>
      <n-card class="set-item">
        <n-flex align="center" class="about">
          <SvgIcon name="SPlayer" size="26" />
          <n-text class="logo-name">SPlayer</n-text>
          <n-tag v-if="statusStore.isDeveloperMode" size="small" type="warning" round> DEV </n-tag>
          <n-tag :bordered="false" size="small" type="primary" round @click="openDeveloperMode">
            {{ packageJson.version }}
          </n-tag>
        </n-flex>
        <n-button
          :loading="statusStore.updateCheck"
          type="primary"
          strong
          secondary
          @click="checkUpdate"
        >
          {{ statusStore.updateCheck ? "检查更新中" : "检查更新" }}
        </n-button>
      </n-card>
      <n-collapse-transition :show="!!updateData">
        <n-card class="set-item update-data">
          <n-flex class="version">
            <n-text>最新版本</n-text>
            <n-tag :bordered="false" size="small" type="primary">
              {{ newVersion?.version || "v0.0.0" }}
            </n-tag>
            <n-tag v-if="newVersion?.prerelease" class="test" size="small" type="warning">
              测试版
            </n-tag>
            <n-text :depth="3" class="time">{{ newVersion?.time }}</n-text>
          </n-flex>
          <div class="markdown-body" v-html="newVersion?.changelog" @click="jumpLink" />
        </n-card>
      </n-collapse-transition>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 特别鸣谢 </n-h3>
      <n-flex :size="12" class="link">
        <n-card
          v-for="(item, index) in contributors"
          :key="index"
          class="link-item"
          hoverable
          @click="openLink(item.url)"
        >
          <n-flex vertical :gap="4">
            <n-text class="name" strong> {{ item.name }} </n-text>
            <n-text class="tip" :depth="3" style="font-size: 12px">
              {{ item.description }}
            </n-text>
          </n-flex>
        </n-card>
      </n-flex>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 开发人员 </n-h3>
      <n-flex :size="12" class="link">
        <n-card
          v-for="(item, index) in developers"
          :key="index"
          class="link-item"
          hoverable
          @click="openLink(item.url)"
        >
          <n-flex align="center">
            <n-avatar round :size="40" :src="item.avatar" fallback-src="/images/avatar.jpg?asset" />
            <n-flex vertical :gap="4">
              <n-text class="name" strong> {{ item.name }} </n-text>
              <n-text class="tip" :depth="3" style="font-size: 12px">
                {{ item.role }}
              </n-text>
            </n-flex>
          </n-flex>
        </n-card>
      </n-flex>
    </div>
    <Transition name="fade" mode="out-in">
      <div v-if="allContributors.length > 0" class="set-list">
        <n-collapse arrow-placement="right">
          <n-collapse-item title="更多贡献者" name="1">
            <n-flex :size="12" class="link">
              <n-card
                v-for="(item, index) in allContributors"
                :key="index"
                class="link-item"
                hoverable
                @click="openLink(item.url)"
              >
                <n-flex align="center">
                  <n-avatar
                    round
                    :size="40"
                    :src="item.avatar"
                    fallback-src="/images/avatar.jpg?asset"
                  />
                  <n-flex vertical :gap="4">
                    <n-text class="name" strong> {{ item.name }} </n-text>
                    <n-text class="tip" :depth="3" style="font-size: 12px">
                      {{ item.role }}
                    </n-text>
                  </n-flex>
                </n-flex>
              </n-card>
            </n-flex>
          </n-collapse-item>
        </n-collapse>
      </div>
    </Transition>
    <div class="set-list">
      <n-h3 prefix="bar"> 社区与资讯 </n-h3>
      <n-flex :size="12" class="link">
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
              <div class="markdown-body" v-html="item?.changelog" @click="jumpLink" />
            </n-card>
          </n-collapse-item>
        </n-collapse>
      </n-collapse-transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UpdateLogType } from "@/types/main";
import { getUpdateLog, openLink } from "@/utils/helper";
import { debounce } from "lodash-es";
import { useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";
import packageJson from "@/../package.json";

const statusStore = useStatusStore();

// 开发者模式点击次数
const developerModeClickCount = ref(0);

// 开发人员
type DeveloperType = {
  name: string;
  role: string;
  url: string;
  avatar: string;
};

const developers = ref<DeveloperType[]>([]);
const allContributors = ref<DeveloperType[]>([]);

// 获取贡献者
const getContributors = async () => {
  try {
    const response = await fetch(
      "https://api.github.com/repos/imsyy/SPlayer/contributors?per_page=100&anon=true",
    );
    const data = await response.json();
    if (Array.isArray(data)) {
      const list = data
        .filter((item: any) => item.login !== "type-bot" && item.type !== "Bot")
        .map((item: any) => ({
          name: item.login || item.name,
          role: item.login === "imsyy" ? "Owner / Full Stack" : "Contributor",
          url: item.html_url || "",
          avatar: item.avatar_url || "/images/avatar.jpg?asset",
        }));
      developers.value = list.slice(0, 6);
      allContributors.value = list.slice(6);
    }
  } catch (error) {
    console.error("Failed to fetch contributors:", error);
    // Fallback or empty state handling if needed, currently just empty
  }
};

// 特别鸣谢
const contributors = [
  {
    name: "NeteaseCloudMusicApi",
    url: "https://github.com/neteasecloudmusicapienhanced/api-enhanced",
    description: "网易云音乐 API",
  },
  // https://github.com/neteasecloudmusicapienhanced/api-enhanced
  {
    name: "NeteaseCloudMusicApiEnhanced",
    url: "https://github.com/neteasecloudmusicapienhanced/api-enhanced",
    description: "网易云音乐 API 备份 + 增强",
  },
  {
    name: "YesPlayMusic",
    url: "https://github.com/qier222/YesPlayMusic",
    description: "高颜值的第三方网易云播放器",
  },
  {
    name: "UnblockNeteaseMusic",
    url: "https://github.com/UnblockNeteaseMusic/server",
    description: "Revive unavailable songs for Netease Cloud Music",
  },
  {
    name: "applemusic-like-lyrics",
    url: "https://github.com/Steve-xmh/applemusic-like-lyrics",
    description: "类 Apple Music 歌词显示组件库",
  },
];

// 社区数据
const communityData = [
  {
    name: "加入交流群",
    url: "https://qm.qq.com/cgi-bin/qm/qr?k=2-cVSf1bE0AvAehCib00qFEFdUvPaJ_k&jump_from=webapi&authKey=1NEhib9+GsmsXVo2rCc0IbRaVHeeRXJJ0gbsyKDcIwDdAzYySOubkFCvkV32+7Cw",
    icon: "QQ",
  },
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
const checkUpdate = debounce(
  () => {
    if (!isElectron) {
      window.open(packageJson.github + "/releases", "_blank");
      return;
    }
    statusStore.updateCheck = true;
    window.electron.ipcRenderer.send("check-update", true);
  },
  300,
  { leading: true, trailing: false },
);

// 链接跳转
const jumpLink = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName !== "A") {
    return;
  }
  e.preventDefault();
  openLink((target as HTMLAnchorElement).href);
};

// 获取更新日志
const getUpdateData = async () => (updateData.value = await getUpdateLog());

// 打开开发者模式
const openDeveloperMode = useThrottleFn(() => {
  developerModeClickCount.value++;
  const isEnabled = statusStore.developerMode;
  if (developerModeClickCount.value >= 5 && developerModeClickCount.value < 8) {
    const action = isEnabled ? "关闭" : "开启";
    window.$message.info(`再点击${8 - developerModeClickCount.value}次以${action}开发者模式`);
  } else if (developerModeClickCount.value >= 8) {
    developerModeClickCount.value = 0;
    statusStore.developerMode = !isEnabled;
    if (!isEnabled) {
      window.$message.warning("开发者模式已开启，请谨慎使用！");
    } else {
      window.$message.success("开发者模式已关闭");
    }
  }
}, 100);

onMounted(() => {
  getUpdateData();
  getContributors();
});
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
      pointer-events: none;
      border-radius: 6px;
    }
    .time {
      margin-left: auto;
      font-size: 13px;
    }
  }
}
.link {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 12px !important;
}
.link-item {
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
</style>
