<template>
  <n-scrollbar
    style="max-height: 70vh"
    :content-style="{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }"
  >
    <div class="config-section">
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">全局着色</n-text>
          <n-text class="tip" :depth="3">将主题色应用至所有元素</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.themeGlobalColor"
          class="set"
          :round="false"
          :disabled="isCustomBackground"
          @update:value="themeGlobalColorChange"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">动态取色</n-text>
          <n-text class="tip" :depth="3">主题色跟随歌曲封面</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.themeFollowCover"
          :disabled="isEmpty(statusStore.songCoverTheme) || isCustomBackground"
          class="set"
          :round="false"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">主题变体</n-text>
          <n-text class="tip" :depth="3">调整颜色生成算法风格，请勿随意修改</n-text>
        </div>
        <n-select
          v-model:value="settingStore.themeVariant"
          :options="variantOptions"
          class="set"
          size="small"
          style="width: 140px"
          @update:value="themeGlobalColorChange(true)"
        />
      </n-card>
      <!-- 自定义背景 -->
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">自定义背景</n-text>
          <n-text class="tip" :depth="3">支持图片或视频（50MB以内）</n-text>
        </div>
        <div class="bg-actions">
          <n-button
            v-if="isCustomBackground"
            size="small"
            type="error"
            strong
            secondary
            @click="clearBackgroundImage"
          >
            取消
          </n-button>
          <n-button size="small" type="primary" strong secondary @click="selectBackgroundImage">
            {{ isCustomBackground ? "更换" : "选择文件" }}
          </n-button>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*,video/*"
          style="display: none"
          @change="handleFileSelect"
        />
      </n-card>
    </div>
    <!-- 颜色模式：选择主题色 -->
    <div
      v-if="!isCustomBackground"
      class="color-section"
      :class="{ disabled: settingStore.themeFollowCover }"
    >
      <n-text class="section-title" :depth="2">选择主题色</n-text>
      <div class="color-grid">
        <div
          v-for="(colorData, key) in themeColors"
          :key="key"
          class="color-item"
          :class="{ active: settingStore.themeColorType === key && !settingStore.themeFollowCover }"
          :style="{
            '--color': key === 'custom' ? settingStore.themeCustomColor || '#888' : colorData.color,
          }"
          :title="colorData.name"
          @click="
            !settingStore.themeFollowCover && key !== 'custom' && selectColor(key as ThemeColorType)
          "
        >
          <!-- 普通颜色 -->
          <template v-if="key !== 'custom'">
            <div class="color-circle">
              <Transition name="fade">
                <SvgIcon
                  v-if="settingStore.themeColorType === key && !settingStore.themeFollowCover"
                  name="Check"
                  :size="20"
                />
              </Transition>
            </div>
            <n-text class="color-name" :depth="2">{{ colorData.name }}</n-text>
          </template>
          <!-- 自定义颜色 -->
          <template v-else>
            <div class="color-circle custom-trigger">
              <SvgIcon
                v-if="settingStore.themeColorType === 'custom' && !settingStore.themeFollowCover"
                name="Check"
                :size="16"
              />
              <n-color-picker
                v-model:value="settingStore.themeCustomColor"
                :show-alpha="false"
                :modes="['hex']"
                placement="top"
                :disabled="settingStore.themeFollowCover"
                class="color-picker-overlay"
                @update:show="(show: boolean) => show && selectColor('custom')"
              />
            </div>
            <n-text class="color-name" :depth="2">{{ colorData.name }}</n-text>
          </template>
        </div>
      </div>
    </div>
    <!-- 自定义背景模式：背景配置 -->
    <div v-else class="config-section">
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">放大倍数</n-text>
          <n-text class="tip" :depth="3">调整背景图缩放比例</n-text>
        </div>
        <n-slider
          v-model:value="statusStore.backgroundConfig.scale"
          :min="1"
          :max="2"
          :step="0.05"
          :format-tooltip="(v: number) => `${v.toFixed(2)}x`"
          style="width: 120px"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">遮罩透明度</n-text>
          <n-text class="tip" :depth="3">覆盖在背景图上的黑色遮罩</n-text>
        </div>
        <n-slider
          v-model:value="statusStore.backgroundConfig.maskOpacity"
          :min="30"
          :max="95"
          :step="5"
          :format-tooltip="(v: number) => `${v}%`"
          style="width: 120px"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">模糊度</n-text>
          <n-text class="tip" :depth="3">背景图模糊程度</n-text>
        </div>
        <n-slider
          v-model:value="statusStore.backgroundConfig.blur"
          :min="0"
          :max="20"
          :step="1"
          :format-tooltip="(v: number) => `${v}px`"
          style="width: 120px"
        />
      </n-card>
    </div>
    <!-- 自定义背景模式：选择主题色 -->
    <div v-if="isCustomBackground" class="color-section">
      <n-text class="section-title" :depth="2">选择主题色</n-text>
      <div class="color-grid">
        <!-- 自动提取的颜色 -->
        <div
          v-if="statusStore.backgroundConfig.themeColor"
          class="color-item"
          :class="{ active: !statusStore.backgroundConfig.useCustomColor }"
          :style="{ '--color': statusStore.backgroundConfig.themeColor }"
          title="自动提取"
          @click="
            () => {
              statusStore.backgroundConfig.useCustomColor = false;
              statusStore.backgroundConfig.isSolid = false;
            }
          "
        >
          <div class="color-circle">
            <Transition name="fade">
              <SvgIcon
                v-if="!statusStore.backgroundConfig.useCustomColor"
                name="Check"
                :size="20"
              />
            </Transition>
          </div>
          <n-text class="color-name" :depth="2">自动</n-text>
        </div>
        <!-- 纯色模式 -->
        <div
          class="color-item"
          :class="{ active: statusStore.backgroundConfig.isSolid }"
          :style="{ '--color': '#9e9e9e' }"
          title="纯色"
          @click="
            () => {
              statusStore.backgroundConfig.useCustomColor = true;
              statusStore.backgroundConfig.isSolid = true;
            }
          "
        >
          <div class="color-circle">
            <Transition name="fade">
              <SvgIcon v-if="statusStore.backgroundConfig.isSolid" name="Check" :size="20" />
            </Transition>
          </div>
          <n-text class="color-name" :depth="2">纯色</n-text>
        </div>
        <!-- 自定义颜色 -->
        <div
          class="color-item"
          :class="{
            active:
              statusStore.backgroundConfig.useCustomColor && !statusStore.backgroundConfig.isSolid,
          }"
          :style="{ '--color': statusStore.backgroundConfig.customColor }"
          title="自定义"
        >
          <div class="color-circle custom-trigger">
            <SvgIcon v-if="statusStore.backgroundConfig.useCustomColor" name="Check" :size="16" />
            <n-color-picker
              v-model:value="statusStore.backgroundConfig.customColor"
              :show-alpha="false"
              :modes="['hex']"
              placement="top"
              class="color-picker-overlay"
              @update:show="
                (show: boolean) =>
                  show &&
                  (statusStore.backgroundConfig.useCustomColor = true) &&
                  (statusStore.backgroundConfig.isSolid = false)
              "
            />
          </div>
          <n-text class="color-name" :depth="2">自定义</n-text>
        </div>
      </div>
    </div>
  </n-scrollbar>
</template>

<script setup lang="ts">
import { useMusicStore, useSettingStore, useStatusStore, useDataStore } from "@/stores";
import { isEmpty } from "lodash-es";
import themeColor from "@/assets/data/themeColor.json";
import { getCoverColor, getCoverColorData } from "@/utils/color";
import { useBlobURLManager } from "@/core/resource/BlobURLManager";
import type { ThemeColorType } from "@/types/color";

const musicStore = useMusicStore();
const settingStore = useSettingStore();
const statusStore = useStatusStore();
const dataStore = useDataStore();
const blobURLManager = useBlobURLManager();

// 文件输入引用
const fileInputRef = ref<HTMLInputElement | null>(null);

// 是否为自定义背景模式
const isCustomBackground = computed(() => statusStore.isCustomBackground);

// 主题颜色变体选项
const variantOptions = [
  { label: "主色", value: "primary" },
  { label: "次色", value: "secondary" },
  { label: "第三色", value: "tertiary" },
  { label: "中性色", value: "neutral" },
  { label: "中性变体", value: "neutralVariant" },
  { label: "错误色", value: "error" },
];

// 主题颜色数据
const themeColors = themeColor as Record<string, { label: string; name: string; color: string }>;

// 选择颜色
const selectColor = (key: ThemeColorType) => {
  settingStore.themeColorType = key;
};

// 全局着色更改
const themeGlobalColorChange = (val: boolean) => {
  if (val) getCoverColor(musicStore.songCover);
};

// 选择背景图
const selectBackgroundImage = () => {
  fileInputRef.value?.click();
};

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  // 检查文件大小（限制 50MB）
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    window.$message.error("文件大小不能超过 50MB");
    input.value = "";
    return;
  }
  // 检查文件类型
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isImage && !isVideo) {
    window.$message.error("请选择图片或视频文件");
    input.value = "";
    return;
  }
  try {
    await dataStore.saveBackgroundImage(file);
    // 生成 Blob URL
    const arrayBuffer = await file.arrayBuffer();
    // 强制清理旧的 URL，确保生成新的
    blobURLManager.revokeBlobURL("background-image");
    const url = blobURLManager.createBlobURL(arrayBuffer, file.type, "background-image");

    if (isImage) {
      // 提取图片主色
      const image = new Image();
      image.src = url;
      await new Promise((resolve) => (image.onload = resolve));
      const colorData = getCoverColorData(image);
      image.remove();
      // 保存提取的主色
      if (colorData?.main) {
        const { r, g, b } = colorData.main;
        const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        statusStore.backgroundConfig.themeColor = hex;
      }
      statusStore.themeBackgroundMode = "image";
    } else {
      statusStore.themeBackgroundMode = "video";
    }

    // 切换模式
    statusStore.backgroundImageUrl = url;
    settingStore.themeFollowCover = false;
    settingStore.themeGlobalColor = true;
    window.$message.success("背景设置成功");
  } catch (error) {
    console.error("Error setting background:", error);
    window.$message.error("背景设置失败");
  }
  input.value = "";
};

// 清除背景图
const clearBackgroundImage = async () => {
  try {
    await dataStore.clearBackgroundImage();
    blobURLManager.revokeBlobURL("background-image");
    statusStore.backgroundImageUrl = null;
    statusStore.themeBackgroundMode = "color";
    statusStore.backgroundConfig.themeColor = null;
    window.$message.success("已恢复颜色模式");
  } catch (error) {
    console.error("Error clearing background image:", error);
    window.$message.error("操作失败");
  }
};
</script>

<style lang="scss" scoped>
.config-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  .set-item {
    border-radius: 8px;
    :deep(.n-card__content) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
    }
    .label {
      display: flex;
      flex-direction: column;
      .name {
        font-size: 14px;
      }
      .tip {
        font-size: 12px;
        margin-top: 2px;
      }
    }
    .bg-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}
.color-section {
  transition: opacity 0.3s ease;
  &.disabled {
    opacity: 0.4;
    pointer-events: none;
  }
  .section-title {
    display: block;
    font-size: 13px;
    margin-bottom: 12px;
  }
  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 12px;
    .color-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 8px;
      border-radius: 8px;
      cursor: pointer;
      transition:
        background-color 0.3s,
        box-shadow 0.3s;
      &:hover {
        background-color: rgba(var(--primary), 0.08);
      }
      &.active {
        background-color: rgba(var(--primary), 0.12);
        .color-circle {
          box-shadow: 0 0 0 3px rgba(var(--primary), 0.3);
        }
      }
      .color-circle {
        position: relative;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: var(--color);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s;
        color: #fff;
        &.custom-trigger {
          cursor: pointer;
          overflow: hidden;
          .color-picker-overlay {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
          }
        }
      }
      .color-name {
        font-size: 12px;
        text-align: center;
      }
    }
  }
}
</style>
