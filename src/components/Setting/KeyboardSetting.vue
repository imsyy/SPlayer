<!-- 快捷键设置 -->
<!-- 写的一坨屎 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 全局快捷键 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">开启全局快捷键</n-text>
          <n-text class="tip" :depth="3">可能会导致与其他软件相互冲突，请谨慎开启</n-text>
        </div>
        <n-switch
          class="set"
          v-model:value="shortcutStore.globalOpen"
          :round="false"
          @update:value="updateGlobalOpen"
        />
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 快捷键更改 </n-h3>
      <n-card id="shortcut-list" class="set-item">
        <n-list v-for="(item, key, index) in shortcutList" :key="index" class="shortcut" hoverable>
          <n-list-item>
            <template #prefix>
              <n-text class="name">{{ item.name }}</n-text>
            </template>
            <n-thing>
              <n-flex>
                <n-input
                  :value="item.shortcut"
                  placeholder="快捷键为空"
                  readonly
                  @focus="inputFocus(key)"
                  @blur="inputBlur"
                  @keydown.stop="inputKeyDown"
                  @keyup="keyHandled = ''"
                />
                <n-input
                  :value="item.globalShortcut"
                  :disabled="!shortcutStore.globalOpen"
                  :status="item?.isRegistered ? 'error' : 'success'"
                  placeholder="快捷键为空"
                  readonly
                  @focus="inputFocus(key, true)"
                  @blur="inputBlur"
                  @keydown.stop="inputKeyDown"
                  @keyup="keyHandled = ''"
                >
                  <template #prefix>
                    <n-text :depth="3">全局</n-text>
                  </template>
                </n-input>
              </n-flex>
            </n-thing>
          </n-list-item>
        </n-list>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">恢复默认</n-text>
        </div>
        <n-button type="primary" strong secondary @click="resetShortcut"> 恢复默认 </n-button>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useShortcutStore } from "@/stores";
import { formatForGlobalShortcut } from "@/utils/helper";
import { cloneDeep, debounce, includes, some } from "lodash-es";

const shortcutStore = useShortcutStore();

// 选中快捷键
const selectShortcut = ref<string | null>(null);
const selectGlobal = ref<boolean>(false);

// 按键标志位 - 防止重复触发
const keyHandled = ref<string>("");

// 快捷键列表
const shortcutList = ref(cloneDeep(shortcutStore.shortcutList));

// 获取按下的快捷键
const getShortcut = (e: KeyboardEvent): string => {
  // 允许输入
  const allowedCodes = [
    // 字母 a-z
    "KeyA",
    "KeyB",
    "KeyC",
    "KeyD",
    "KeyE",
    "KeyF",
    "KeyG",
    "KeyH",
    "KeyI",
    "KeyJ",
    "KeyK",
    "KeyL",
    "KeyM",
    "KeyN",
    "KeyO",
    "KeyP",
    "KeyQ",
    "KeyR",
    "KeyS",
    "KeyT",
    "KeyU",
    "KeyV",
    "KeyW",
    "KeyX",
    "KeyY",
    "KeyZ",
    // 数字 0-9
    "Digit0",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Numpad0",
    "Numpad1",
    "Numpad2",
    "Numpad3",
    "Numpad4",
    "Numpad5",
    "Numpad6",
    "Numpad7",
    "Numpad8",
    "Numpad9",
    // 空格
    "Space",
    // 方向键
    "ArrowLeft",
    "ArrowUp",
    "ArrowRight",
    "ArrowDown",
  ];
  if (!allowedCodes.includes(e.code)) return "";
  return e.code;
};

// 获得焦点
const inputFocus = (type: string, isGlobal: boolean = false) => {
  selectShortcut.value = type;
  selectGlobal.value = isGlobal;
  if (isGlobal) {
    window.electron.ipcRenderer.send("unregister-all-shortcut");
  }
};

// 失去焦点
const inputBlur = () => {
  if (selectShortcut.value) shortcutStore.registerAllShortcuts();
  selectShortcut.value = null;
  selectGlobal.value = false;
};

// 键盘按下
const inputKeyDown = async (e: KeyboardEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (!selectShortcut.value) return;
  // 记录标志位
  if (e.code === keyHandled.value) return;
  keyHandled.value = e.code;
  // 删除键
  if (e.code === "Backspace") {
    changeShortcut("");
    return;
  }
  // 特殊按键
  const isCtrl = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const isAlt = e.altKey;
  // 快捷键
  const keyCode = getShortcut(e);
  const shortcut = [isCtrl && "CmdOrCtrl", isShift && "Shift", isAlt && "Alt", keyCode]
    .filter(Boolean)
    .join("+");
  console.log(keyCode, e, [isCtrl && "CmdOrCtrl", isShift && "Shift", isAlt && "Alt", keyCode]);
  // 更改快捷键
  if (isRepeat(shortcut)) {
    window.$message.warning("快捷键设置冲突");
  } else {
    // 全局快捷键
    if (selectGlobal.value) {
      // 若为单个按键
      const key = isCtrl || isShift || isAlt ? shortcut : "CmdOrCtrl+Shift+" + keyCode;
      const globalShortcut = formatForGlobalShortcut(key);
      if (!globalShortcut) return;
      // 先更改
      shortcutList.value[selectShortcut.value].globalShortcut = globalShortcut;
      // 是否被占用
      await checkRegistered(globalShortcut);
      changeShortcut(globalShortcut);
    } else {
      changeShortcut(shortcut);
      window.$message.success("快捷键设置成功");
    }
  }
};

// 更改快捷键
const changeShortcut = async (shortcut: string) => {
  if (!selectShortcut.value) return;
  shortcutList.value[selectShortcut.value][selectGlobal.value ? "globalShortcut" : "shortcut"] =
    shortcut;
  shortcutStore.shortcutList[selectShortcut.value][
    selectGlobal.value ? "globalShortcut" : "shortcut"
  ] = shortcut;
};

// 快捷键是否重复
const isRepeat = (shortcut: string): boolean => {
  return some(Object.values(shortcutStore.shortcutList), (item) => {
    return includes([item.shortcut, item.globalShortcut], shortcut);
  });
};

// 是否被占用
const checkRegistered = debounce(async (shortcut: string) => {
  try {
    if (!shortcut || !selectShortcut.value) return;
    const isRegistered = await window.electron.ipcRenderer.invoke(
      "is-shortcut-registered",
      formatForGlobalShortcut(shortcut),
    );
    if (isRegistered) window.$message.warning("快捷键已被占用");
    // 更新状态
    shortcutList.value[selectShortcut.value].isRegistered = isRegistered;
  } catch (error) {
    console.error("Error checking shortcut registration:", error);
    window.$message.error("快捷键检查出现错误");
    changeShortcut("");
  }
}, 500);

// 开关全局快捷键
const updateGlobalOpen = (val: boolean) => {
  if(val) shortcutStore.registerAllShortcuts();
  else window.electron.ipcRenderer.send("unregister-all-shortcut");
}

// 重置快捷键
const resetShortcut = () => {
  window.$dialog.warning({
    title: "重置快捷键",
    content: "确定重置当前快捷键配置？",
    positiveText: "重置",
    negativeText: "取消",
    onPositiveClick: () => {
      shortcutStore.$reset();
      shortcutList.value = cloneDeep(shortcutStore.shortcutList);
      window.$message.success("快捷键重置成功");
    },
  });
};

onMounted(() => {
  shortcutStore.registerAllShortcuts();
});
</script>

<style lang="scss" scoped>
#shortcut-list {
  overflow: hidden;
  :deep(.n-card__content) {
    padding: 0;
    flex-direction: column;
    overflow: hidden;
  }
  .shortcut {
    width: 100%;
    .name {
      display: flex;
      justify-content: center;
      min-width: 80px;
    }
    .n-input {
      user-select: none;
    }
  }
}
</style>
