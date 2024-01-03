<!-- 非网页端标题栏 -->
<template>
  <div class="title-bar">
    <n-divider vertical />
    <n-button
      :focusable="false"
      class="bar-icon"
      tag="div"
      style="margin-left: 0"
      quaternary
      circle
      @click="windowMin"
    >
      <template #icon>
        <n-icon :depth="2">
          <SvgIcon icon="window-minimize" />
        </n-icon>
      </template>
    </n-button>
    <n-button :focusable="false" class="bar-icon" tag="div" quaternary circle @click="maxOrRestore">
      <template #icon>
        <n-icon :depth="2">
          <SvgIcon :icon="defaultWindowState ? 'window-restore' : 'window-maximize'" />
        </n-icon>
      </template>
    </n-button>
    <n-button :focusable="false" class="bar-icon" tag="div" quaternary circle @click="openCloseTip">
      <template #icon>
        <n-icon :depth="2">
          <SvgIcon icon="window-close" />
        </n-icon>
      </template>
    </n-button>
    <!-- 关闭软件弹窗 -->
    <n-modal
      id="closeTipModal"
      v-model:show="closeTipModal"
      :auto-focus="false"
      :mask-closable="false"
      :bordered="false"
      :close-on-esc="false"
      :closable="false"
      preset="card"
      title="关闭软件"
      transform-origin="center"
    >
      <n-text class="close-tip">确认关闭软件吗？</n-text>
      <n-checkbox v-model:checked="closeTipCheckbox"> 记住且不再询问 </n-checkbox>
      <template #footer>
        <n-space justify="space-between">
          <n-button strong secondary @click="closeCloseTip('cancel')"> 取消 </n-button>
          <n-space class="type">
            <n-button strong secondary @click="closeCloseTip('close')"> 退出 </n-button>
            <n-button type="primary" strong secondary @click="closeCloseTip('hide')">
              最小化
            </n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteSettings } from "@/stores";

const settings = siteSettings();
const { closeTip, closeType } = storeToRefs(settings);

// 默认窗口状态
const defaultWindowState = ref(false);

// 退出软件弹窗数据
const closeTipTimeout = ref(null);
const closeTipModal = ref(false);
const closeTipCheckbox = ref(false);

// 窗口最小化
const windowMin = () => {
  electron.ipcRenderer.send("window-min");
};

// 窗口最大化或恢复
const maxOrRestore = () => {
  electron.ipcRenderer.send("window-maxOrRestore");
};

// 窗口关闭
const winClose = () => {
  electron.ipcRenderer.send("window-close");
};

// 窗口隐藏
const winHide = () => {
  // 获取元素
  const closeTipModal = document.getElementById("closeTipModal");
  if (closeTipModal) closeTipModal.style.display = "none";
  closeTipTimeout.value = setTimeout(() => {
    electron.ipcRenderer.send("window-hide");
  }, 100);
};

// 开启退出软件弹窗
const openCloseTip = () => {
  if (closeTip.value) {
    closeTipModal.value = true;
  } else {
    closeType.value === "close" ? winClose() : winHide();
  }
};

// 关闭退出软件弹窗
const closeCloseTip = (type) => {
  const closeActions = {
    cancel: () => {
      closeTipCheckbox.value = false;
    },
    hide: () => {
      if (closeTipCheckbox.value) closeTip.value = false;
      closeType.value = "hide";
      winHide();
    },
    close: () => {
      if (closeTipCheckbox.value) closeTip.value = false;
      closeType.value = "close";
      winClose();
    },
  };
  const action = closeActions[type];
  if (action) {
    action();
  }
  closeTipModal.value = false;
};

// 窗口状态响应
electron.ipcRenderer.on("windowState", (_, val) => {
  defaultWindowState.value = val;
});

onBeforeUnmount(() => {
  clearTimeout(closeTipTimeout.value);
});
</script>

<style lang="scss" scoped>
.title-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  -webkit-app-region: no-drag;
  .n-divider {
    margin-left: 16px;
  }
  .bar-icon {
    margin-left: 8px;
  }
}
.close-tip {
  font-size: 16px;
  margin-bottom: 8px;
}
</style>
