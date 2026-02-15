<template>
  <n-flex :wrap="false" align="center" style="width: 460px; justify-content: flex-end">
    <!-- 本地/页面内快捷键 -->
    <n-input
      :value="shortcutItem.shortcut"
      placeholder="快捷键为空"
      readonly
      class="shortcut-input"
      @focus="onFocus(false)"
      @blur="onBlur"
      @keydown.stop="onKeyDown"
      @keyup="keyHandled = ''"
    />
    <!-- 全局快捷键 -->
    <n-input
      v-if="allowGlobal"
      :value="shortcutItem.globalShortcut"
      :disabled="!shortcutStore.globalOpen"
      :status="shortcutItem.globalShortcut && shortcutItem.isRegistered ? 'error' : undefined"
      placeholder="快捷键为空"
      readonly
      class="shortcut-input"
      @focus="onFocus(true)"
      @blur="onBlur"
      @keydown.stop="onKeyDown"
      @keyup="keyHandled = ''"
    >
      <template #prefix>
        <n-text :depth="3">全局</n-text>
      </template>
    </n-input>
  </n-flex>
</template>

<script setup lang="ts">
import { useShortcutStore } from "@/stores";
import { formatForGlobalShortcut } from "@/utils/helper";
import { includes, some } from "lodash-es";
import { ref, computed } from "vue";

const props = defineProps<{
  shortcutKey: string;
  allowGlobal?: boolean;
}>();

const shortcutStore = useShortcutStore();
const shortcutItem = computed(() => shortcutStore.shortcutList[props.shortcutKey]);

// 选中状态
const isFocus = ref(false);
const isGlobalFocus = ref(false);

// 按键标志位
const keyHandled = ref<string>("");

// 获取按下的快捷键
const getShortcut = (e: KeyboardEvent): string => {
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
    // 功能键
    "Space",
    "ArrowLeft",
    "ArrowUp",
    "ArrowRight",
    "ArrowDown",
    "Escape",
    // Funtion keys
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
  ];
  if (!allowedCodes.includes(e.code)) return "";
  return e.code;
};

const onFocus = (global: boolean) => {
  isFocus.value = true;
  isGlobalFocus.value = global;
  if (global) {
    window.electron.ipcRenderer.send("unregister-all-shortcut");
  }
};

const onBlur = async () => {
  if (isFocus.value) {
    if (isGlobalFocus.value) {
      const failedShortcuts = await shortcutStore.registerAllShortcuts();
      if (failedShortcuts) {
        // 更新所有快捷键的注册状态
        for (const key in shortcutStore.shortcutList) {
          // @ts-ignore
          const item = shortcutStore.shortcutList[key];
          // 如果该快捷键在失败列表中，标记为已注册（即冲突），否则为未注册（成功）
          // @ts-ignore
          shortcutStore.shortcutList[key].isRegistered =
            item.globalShortcut && failedShortcuts.includes(item.globalShortcut);
        }
      }
    }
  }
  isFocus.value = false;
  isGlobalFocus.value = false;
};

// 快捷键是否重复
const isRepeat = (shortcut: string): boolean => {
  return some(Object.values(shortcutStore.shortcutList), (item) => {
    return includes([item.shortcut, item.globalShortcut], shortcut);
  });
};

// 是否被占用
const checkRegistered = async (shortcut: string) => {
  try {
    if (!shortcut) return false;
    const isRegistered = await window.electron.ipcRenderer.invoke(
      "is-shortcut-registered",
      formatForGlobalShortcut(shortcut),
    );
    // 更新状态
    shortcutStore.shortcutList[props.shortcutKey].isRegistered = isRegistered;
    return isRegistered;
  } catch (error) {
    console.error("Error checking shortcut registration:", error);
    return false;
  }
};

const changeShortcut = async (shortcut: string) => {
  const targetKey = isGlobalFocus.value ? "globalShortcut" : "shortcut";
  shortcutStore.shortcutList[props.shortcutKey][targetKey] = shortcut;
};

const onKeyDown = async (e: KeyboardEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (!isFocus.value) return;

  if (e.code === keyHandled.value) return;
  keyHandled.value = e.code;

  if (e.code === "Backspace") {
    changeShortcut("");
    return;
  }

  const isCtrl = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const isAlt = e.altKey;

  const keyCode = getShortcut(e);
  if (!keyCode) return;

  const shortcut = [isCtrl && "CmdOrCtrl", isShift && "Shift", isAlt && "Alt", keyCode]
    .filter(Boolean)
    .join("+");

  if (isRepeat(shortcut)) {
    window.$message.warning("快捷键设置冲突");
    return;
  }

  if (isGlobalFocus.value) {
    const key = isCtrl || isShift || isAlt ? shortcut : "CmdOrCtrl+Shift+" + keyCode;
    const globalShortcut = formatForGlobalShortcut(key);
    if (!globalShortcut) return;

    // 检查占用
    const isRegistered = await checkRegistered(globalShortcut);
    if (isRegistered) {
      window.$message.warning("快捷键已被占用");
    } else {
      window.$message.success("快捷键设置成功");
    }
    changeShortcut(globalShortcut);
  } else {
    changeShortcut(shortcut);
    window.$message.success("快捷键设置成功");
  }
};
</script>

<style scoped lang="scss">
.shortcut-input {
  flex: 1;
  text-align: center;
  :deep(input) {
    text-align: center;
  }
}
.n-flex {
  gap: 12px;
}
</style>
