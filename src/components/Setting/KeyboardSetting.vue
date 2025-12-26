<!-- 快捷键设置 -->
<!-- 写的一坨屎 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.shortcut.title") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.shortcut.enable") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.shortcut.enableTip") }}</n-text>
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
      <n-h3 prefix="bar"> {{ t("settings.shortcut.editTitle") }} </n-h3>
      <n-card id="shortcut-list" class="set-item">

        <n-list
          v-for="(item, key, index) in globalShortcutList"
          :key="index"
          class="shortcut"
          hoverable
        >
          <n-list-item>
            <template #prefix>
              <n-text class="name">{{ t(`settings.shortcut.${key}`) }}</n-text>
            </template>
            <n-thing>
              <n-flex>
                <n-input
                  :value="item.shortcut"
                  :placeholder="t('settings.shortcut.placeholder')"
                  readonly

                  @focus="inputFocus(key)"
                  @blur="inputBlur"
                  @keydown.stop="inputKeyDown"
                  @keyup="keyHandled = ''"
                />
                <n-input
                  :value="item.globalShortcut"
                  :disabled="!shortcutStore.globalOpen"
                  :status="item.globalShortcut && item?.isRegistered ? 'error' : undefined"
                  :placeholder="t('settings.shortcut.placeholder')"
                  readonly

                  @focus="inputFocus(key, true)"
                  @blur="inputBlur"
                  @keydown.stop="inputKeyDown"
                  @keyup="keyHandled = ''"
                >
                  <template #prefix>
                    <n-text :depth="3">{{ t("settings.shortcut.globalPrefix") }}</n-text>
                  </template>

                </n-input>
              </n-flex>
            </n-thing>
          </n-list-item>
        </n-list>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.shortcut.restoreDefault") }}</n-text>
        </div>
        <n-button type="primary" strong secondary @click="resetShortcut"> {{ t("settings.shortcut.restore") }} </n-button>
      </n-card>

    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.shortcut.pageKeyTitle") }} </n-h3>
      <n-card id="page-shortcut-list" class="set-item">

        <n-list
          v-for="(item, key, index) in pageShortcutList"
          :key="index"
          class="shortcut"
          hoverable
        >
          <n-list-item>
            <template #prefix>
              <n-text class="name">{{ t(`settings.shortcut.${key}`) }}</n-text>
            </template>
            <n-thing>
              <n-input
                :value="item.shortcut"
                :placeholder="t('settings.shortcut.placeholder')"
                readonly

                @focus="inputFocus(key)"
                @blur="inputBlur"
                @keydown.stop="inputKeyDown"
                @keyup="keyHandled = ''"
              />
            </n-thing>
          </n-list-item>
        </n-list>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useShortcutStore } from "@/stores";
import { formatForGlobalShortcut } from "@/utils/helper";
import { cloneDeep, debounce, includes, some } from "lodash-es";
import { useI18n } from "vue-i18n";

const shortcutStore = useShortcutStore();
const { t } = useI18n();

// 选中快捷键
const selectShortcut = ref<string | null>(null);
const selectGlobal = ref<boolean>(false);

// 按键标志位 - 防止重复触发
const keyHandled = ref<string>("");

// 快捷键列表
const shortcutList = ref(cloneDeep(shortcutStore.shortcutList));

// 全局快捷键列表（排除页面内快捷键）
const globalShortcutList = computed(() => {
  const pageShortcutKeys = ["openPlayer", "openPlayList", "closePlayer"];
  return Object.entries(shortcutList.value)
    .filter(([key]) => !pageShortcutKeys.includes(key))
    .reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, (typeof shortcutList.value)[keyof typeof shortcutList.value]>,
    );
});

// 页面内快捷键列表
const pageShortcutList = computed(() => {
  const pageShortcutKeys = ["openPlayer", "openPlayList", "closePlayer"];
  return Object.entries(shortcutList.value)
    .filter(([key]) => pageShortcutKeys.includes(key))
    .reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, (typeof shortcutList.value)[keyof typeof shortcutList.value]>,
    );
});

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
    // Escape 键
    "Escape",
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
const inputBlur = async () => {
  if (selectShortcut.value) {
    await shortcutStore.registerAllShortcuts();
    // 重新检查所有全局快捷键占用状态
    await checkAllGlobalShortcuts();
  }
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
    window.$message.warning(t("settings.shortcut.conflict"));
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
      const isRegistered = await checkRegistered(globalShortcut);
      if (isRegistered) {
        window.$message.warning(t("settings.shortcut.registered"));
      } else {
        window.$message.success(t("settings.shortcut.success"));
      }

      changeShortcut(globalShortcut);
    } else {
      // 页面内快捷键或全局快捷键的页面内部分
      changeShortcut(shortcut);
      window.$message.success(t("settings.shortcut.success"));
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
const checkRegistered = debounce(async (shortcut: string, shortcutKey?: string) => {
  try {
    if (!shortcut) return false;
    const targetKey = shortcutKey || selectShortcut.value;
    if (!targetKey) return false;
    const isRegistered = await window.electron.ipcRenderer.invoke(
      "is-shortcut-registered",
      formatForGlobalShortcut(shortcut),
    );
    // 更新状态
    shortcutList.value[targetKey].isRegistered = isRegistered;
    return isRegistered;
  } catch (error) {
    console.error("Error checking shortcut registration:", error);
    window.$message.error(t("settings.shortcut.error"));
    if (selectShortcut.value) {

      changeShortcut("");
    }
    return false;
  }
}, 500);

// 检查所有全局快捷键占用状态
const checkAllGlobalShortcuts = async () => {
  if (!shortcutStore.globalOpen) return;
  for (const key in shortcutList.value) {
    const item = shortcutList.value[key];
    if (item.globalShortcut) {
      await checkRegistered(item.globalShortcut, key);
    }
  }
};

// 开关全局快捷键
const updateGlobalOpen = async (val: boolean) => {
  if (val) {
    await shortcutStore.registerAllShortcuts();
    // 重新检查所有全局快捷键占用状态
    await checkAllGlobalShortcuts();
  } else {
    window.electron.ipcRenderer.send("unregister-all-shortcut");
    // 清除所有占用状态
    for (const key in shortcutList.value) {
      shortcutList.value[key].isRegistered = false;
    }
  }
};

// 重置快捷键
const resetShortcut = () => {
  window.$dialog.warning({
    title: t("settings.shortcut.resetTitle"),
    content: t("settings.shortcut.resetContent"),
    positiveText: t("settings.shortcut.resetTitle"), // "重置"
    negativeText: t("general.dialog.cancel"), // "取消"
    onPositiveClick: () => {
      shortcutStore.$reset();
      shortcutList.value = cloneDeep(shortcutStore.shortcutList);
      window.$message.success(t("settings.shortcut.resetSuccess"));
    },
  });

};

onMounted(async () => {
  shortcutStore.registerAllShortcuts();
  // 检查所有全局快捷键占用状态
  await checkAllGlobalShortcuts();
});
</script>

<style lang="scss" scoped>
#shortcut-list,
#page-shortcut-list {
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
#page-shortcut-list {
  .shortcut {
    .name {
      min-width: 120px;
    }
  }
}
</style>
