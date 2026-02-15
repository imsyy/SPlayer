<template>
  <div class="exclude-lyrics-modal">
    <n-flex vertical size="large">
      <n-card class="switch-card" size="small">
        <n-flex align="center" justify="space-between">
          <n-text>启用歌词排除</n-text>
          <n-switch v-model:value="enableExcludeLyrics" :round="false" />
        </n-flex>
      </n-card>

      <n-tabs v-model:value="page" animated>
        <n-tab-pane name="options" tab="排除选项">
          <div class="set-list">
            <n-card class="set-item">
              <div class="label">
                <n-text class="name">TTML 歌词排除</n-text>
                <n-text class="tip" :depth="3">
                  是否要对 TTML 歌词进行歌词排除 <br />
                  AMLL TTML DB
                  对此有硬性规定，不得包含作词、作曲等歌词无关内容，因此大多情况下无需开启
                </n-text>
              </div>
              <n-switch v-model:value="enableExcludeTTML" class="set" :round="false" />
            </n-card>
            <n-card v-if="isElectron" class="set-item">
              <div class="label">
                <n-text class="name">本地歌词排除</n-text>
                <n-text class="tip" :depth="3">
                  是否要对来自本地的歌词进行歌词排除，这包含本地覆盖的在线歌词和本地歌曲中的歌词
                </n-text>
              </div>
              <n-switch v-model:value="enableExcludeLocalLyrics" class="set" :round="false" />
            </n-card>
          </div>
        </n-tab-pane>

        <n-tab-pane name="keywords" tab="元数据关键词">
          <n-scrollbar style="max-height: 50vh">
            <n-flex vertical :size="12">
              <n-text depth="3">元数据关键词过滤（匹配冒号前的关键词）</n-text>
              <n-dynamic-tags v-model:value="filterKeywords" />
              <n-popconfirm @positive-click="clearKeywords">
                <template #trigger>
                  <n-button type="error" secondary size="small">
                    <template #icon>
                      <SvgIcon name="DeleteSweep" />
                    </template>
                    清空元数据关键词
                  </n-button>
                </template>
                <n-text> 确定要清空所有元数据关键词规则吗？ </n-text>
              </n-popconfirm>
            </n-flex>
          </n-scrollbar>
        </n-tab-pane>

        <n-tab-pane name="regexes" tab="正则表达式">
          <n-scrollbar style="max-height: 50vh">
            <n-flex vertical :size="12">
              <n-text depth="3">正则过滤（支持 JavaScript 正则表达式）</n-text>
              <n-dynamic-tags v-model:value="filterRegexes" />
              <n-popconfirm @positive-click="clearRegexes">
                <template #trigger>
                  <n-button type="error" secondary size="small">
                    <template #icon>
                      <SvgIcon name="DeleteSweep" />
                    </template>
                    清空正则表达式
                  </n-button>
                </template>
                <n-text> 确定要清空所有正则表达式规则吗？ </n-text>
              </n-popconfirm>
            </n-flex>
          </n-scrollbar>
        </n-tab-pane>
      </n-tabs>

      <n-divider style="margin: 6px 0" />

      <n-flex justify="space-between">
        <n-flex>
          <n-collapse-transition :show="page !== 'options'">
            <n-flex>
              <n-popconfirm @positive-click="clearAll">
                <template #trigger>
                  <n-button type="error" secondary>
                    <template #icon>
                      <SvgIcon name="DeleteSweep" />
                    </template>
                    清空全部
                  </n-button>
                </template>
                <n-text> 确定要清空所有过滤规则（元数据关键词和正则表达式）吗？ </n-text>
              </n-popconfirm>
              <n-button secondary @click="importFilters"> 导入 </n-button>
              <n-button secondary @click="exportFilters"> 导出 </n-button>
            </n-flex>
          </n-collapse-transition>
        </n-flex>
        <n-flex>
          <n-button @click="handleClose">取消</n-button>
          <n-button type="primary" @click="saveFilter">保存</n-button>
        </n-flex>
      </n-flex>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";

const emit = defineEmits(["close"]);

const settingStore = useSettingStore();

const enableExcludeLyrics = ref(settingStore.enableExcludeLyrics);
const enableExcludeTTML = ref(settingStore.enableExcludeLyricsTTML);
const enableExcludeLocalLyrics = ref(settingStore.enableExcludeLyricsLocal);

const filterKeywords = ref<string[]>([]);
const filterRegexes = ref<string[]>([]);
const page = ref("options");

// 清空关键词
const clearKeywords = () => {
  filterKeywords.value = [];
};

// 清空正则表达式
const clearRegexes = () => {
  filterRegexes.value = [];
};

// 清空全部
const clearAll = () => {
  filterKeywords.value = [];
  filterRegexes.value = [];
};

// 导出规则
const exportFilters = () => {
  const data = {
    keywords: settingStore.excludeLyricsUserKeywords || [],
    regexes: settingStore.excludeLyricsUserRegexes || [],
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "splayer-lyrics-filters.json";
  a.click();
  URL.revokeObjectURL(url);
};

// 导入规则
const importFilters = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.keywords && Array.isArray(data.keywords)) {
          filterKeywords.value = data.keywords;
        }
        if (data.regexes && Array.isArray(data.regexes)) {
          filterRegexes.value = data.regexes;
        }
        window.$message.success("规则导入成功");
      } catch (error) {
        console.error("Import filters error:", error);
        window.$message.error("规则文件解析失败");
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

// 保存过滤
const saveFilter = () => {
  settingStore.enableExcludeLyrics = enableExcludeLyrics.value;
  settingStore.enableExcludeLyricsTTML = enableExcludeTTML.value;
  settingStore.enableExcludeLyricsLocal = enableExcludeLocalLyrics.value;
  settingStore.excludeLyricsUserKeywords = filterKeywords.value;
  settingStore.excludeLyricsUserRegexes = filterRegexes.value;
  window.$message.success("设置已保存");
  handleClose();
};

const handleClose = () => {
  emit("close");
};

onMounted(() => {
  enableExcludeLyrics.value = settingStore.enableExcludeLyrics;
  enableExcludeTTML.value = settingStore.enableExcludeLyricsTTML;
  enableExcludeLocalLyrics.value = settingStore.enableExcludeLyricsLocal;
  filterKeywords.value = [...(settingStore.excludeLyricsUserKeywords || [])];
  filterRegexes.value = [...(settingStore.excludeLyricsUserRegexes || [])];
});
</script>

<style lang="scss" scoped>
.exclude-lyrics-modal {
  padding: 0;
  .switch-card {
    width: 100%;
    border-radius: 8px;
    .n-text {
      font-size: 16px;
    }
  }

  .set-list {
    margin-bottom: 24px;
    &:last-child {
      margin-bottom: 0;
    }
  }
  .set-item {
    width: 100%;
    border-radius: 8px;
    margin-bottom: 12px;
    transition: margin 0.3s;
    &:last-child {
      margin-bottom: 0;
    }
    :deep(.n-card__content) {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
    }
    .label {
      display: flex;
      flex-direction: column;
      padding-right: 20px;
      .name {
        font-size: 16px;
      }
    }
    .n-flex {
      flex-flow: nowrap !important;
    }
    .set {
      justify-content: flex-end;
      width: 200px;
      &.n-switch {
        width: max-content;
      }
      @media (max-width: 768px) {
        width: 140px;
        min-width: 140px;
      }
    }
  }
}
</style>
