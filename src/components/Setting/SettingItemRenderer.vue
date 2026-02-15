<template>
  <div
    :id="'setting-' + item.key"
    :class="{ highlighted: highlighted }"
    class="setting-item-wrapper"
  >
    <template v-if="item.noWrapper">
      <component
        v-if="item.type === 'custom' && item.component"
        :is="resolve(item.component)"
        v-bind="item.componentProps"
        :item="item"
      />
    </template>
    <n-card v-else class="set-item">
      <div class="label">
        <n-text class="name">
          {{ resolve(item.label) }}
          <n-tag
            v-if="item.tags"
            v-for="tag in item.tags"
            :key="tag.text"
            :type="tag.type"
            size="small"
            round
          >
            {{ tag.text }}
          </n-tag>
        </n-text>
        <n-text class="tip" :depth="3" v-if="descriptionContent">
          <span v-if="typeof descriptionContent === 'string'" v-html="descriptionContent" />
          <component v-else :is="descriptionContent" />
        </n-text>
      </div>
      <div class="control-wrapper">
        <TransitionGroup name="fade">
          <n-button
            v-for="btn in activeActions"
            :key="btn.label"
            :type="btn.type || 'primary'"
            :secondary="btn.secondary !== false"
            :strong="btn.strong !== false"
            @click="btn.action"
          >
            {{ btn.label }}
          </n-button>
        </TransitionGroup>

        <!-- Switch -->
        <n-switch
          v-if="item.type === 'switch'"
          v-model:value="modelValue"
          class="set"
          :round="false"
          :disabled="isDisabled"
          :title="title"
          v-bind="item.componentProps"
        />

        <!-- Select -->
        <n-select
          v-else-if="item.type === 'select'"
          v-model:value="modelValue"
          :options="normalizedOptions"
          class="set"
          :disabled="isDisabled"
          :title="title"
          v-bind="item.componentProps"
        />

        <!-- Input Number -->
        <n-input-number
          v-else-if="item.type === 'input-number'"
          v-model:value="modelValue"
          class="set"
          :min="resolve(item.min)"
          :max="resolve(item.max)"
          :step="resolve(item.step)"
          :disabled="isDisabled"
          :title="title"
          v-bind="item.componentProps"
        >
          <template #prefix v-if="item.prefix">{{ resolve(item.prefix) }}</template>
          <template #suffix v-if="item.suffix">{{ resolve(item.suffix) }}</template>
        </n-input-number>

        <!-- Text Input -->
        <n-input
          v-else-if="item.type === 'text-input'"
          v-model:value="modelValue"
          class="set"
          :placeholder="item.componentProps?.placeholder"
          :type="item.componentProps?.type || 'text'"
          :show-password-on="item.componentProps?.showPasswordOn"
          :disabled="isDisabled"
          :title="title"
          v-bind="item.componentProps"
        >
          <template #prefix v-if="item.prefix">{{ resolve(item.prefix) }}</template>
          <template #suffix v-if="item.suffix">{{ resolve(item.suffix) }}</template>
        </n-input>

        <!-- Slider -->
        <n-slider
          v-else-if="item.type === 'slider'"
          v-model:value="modelValue"
          class="set"
          :min="resolve(item.min)"
          :max="resolve(item.max)"
          :step="resolve(item.step)"
          :marks="item.marks"
          :format-tooltip="item.formatTooltip"
          :disabled="isDisabled"
          :title="title"
          v-bind="item.componentProps"
        />

        <!-- Button -->
        <n-button
          v-else-if="item.type === 'button'"
          type="primary"
          strong
          secondary
          @click="handleAction"
          :disabled="isDisabled"
          :title="title"
          v-bind="item.componentProps"
        >
          {{ resolve(item.buttonLabel) || "配置" }}
        </n-button>

        <!-- Color Picker -->
        <n-color-picker
          v-else-if="item.type === 'color-picker'"
          v-model:value="modelValue"
          class="set"
          :show-alpha="item.componentProps?.showAlpha ?? false"
          :modes="item.componentProps?.modes ?? ['hex']"
          :disabled="isDisabled"
          :title="title"
          @complete="handleAction"
        />

        <!-- Custom -->
        <component
          v-else-if="item.type === 'custom' && item.component"
          :is="item.component"
          v-bind="item.componentProps"
          :item="item"
        />
      </div>
    </n-card>

    <!-- Children (Nested items) -->
    <template v-if="resolvedChildren && resolvedChildren.length > 0">
      <n-collapse-transition :show="isChildrenExpanded">
        <!-- 递归渲染子项 -->
        <SettingItemRenderer
          v-for="child in resolvedChildren"
          :key="child.key"
          :item="child"
          v-show="isShow(child)"
        />
      </n-collapse-transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { SettingItem, SettingAction } from "@/types/settings";

defineOptions({
  name: "SettingItemRenderer",
});

const props = defineProps<{
  item: SettingItem;
  highlighted?: boolean;
}>();

// 基础数据双向绑定处理
const baseModelValue = computed({
  get: () => {
    if (props.item.value !== undefined) {
      return toValue(props.item.value);
    }
    return props.item.get ? props.item.get() : undefined;
  },
  set: (val) => {
    if (props.item.value !== undefined && typeof props.item.value !== "function") {
      (props.item.value as Ref<any>).value = val;
    } else if (props.item.set) {
      props.item.set(val);
    }
  },
});

// 强制显示条件判断
const isForcedConditionMet = computed(() => {
  if (!props.item.forceIf) return false;
  const condition = props.item.forceIf.condition;
  if (typeof condition === "function") {
    return condition();
  }
  return unref(condition);
});

// 最终使用的 modelValue
const modelValue = computed({
  get: () => {
    if (isForcedConditionMet.value) {
      const forcedValueRef = props.item.forceIf!.forcedValue;
      if (forcedValueRef !== undefined) return toValue(forcedValueRef);
    }
    return baseModelValue.value;
  },
  set: (val) => {
    // 如果条件满足，则不允许修改原始值（或者视需求而定，通常互斥时不仅显示强制值，且禁用）
    // 这里的逻辑是：如果被强制显示了，set 操作不应该影响原始值，或者应该被忽略
    if (!isForcedConditionMet.value) {
      baseModelValue.value = val;
    }
  },
});

// 禁用状态
const isDisabled = computed(() => {
  if (isForcedConditionMet.value) return true;
  if (props.item.disabled === undefined) return false;
  return toValue(props.item.disabled);
});

// 描述内容
const descriptionContent = computed(() => {
  if (isForcedConditionMet.value) {
    const forcedDescriptionRef = props.item.forceIf!.forcedDescription;
    if (forcedDescriptionRef !== undefined) return toValue(forcedDescriptionRef);
  }
  return toValue(props.item.description);
});

// 鼠标悬停提示
const title = computed(() => {
  if (isForcedConditionMet.value) {
    const forcedTitleRef = props.item.forceIf!.forcedTitle;
    if (forcedTitleRef !== undefined) return toValue(forcedTitleRef);
  }
  return toValue(props.item.title);
});

// 解析子项
const resolvedChildren = computed(() => {
  if (!props.item.children) return [];
  return toValue(props.item.children);
});

// 计算子项是否展开
const isChildrenExpanded = computed(() => {
  if (props.item.condition) {
    return props.item.condition();
  }
  return modelValue.value === true;
});

// 判断是否显示
const isShow = (childItem: SettingItem) => {
  if (childItem.show === undefined) return true;
  return toValue(childItem.show);
};

// 判断额外按钮是否显示
const isExtraButtonShow = (action: any) => {
  if (action.show === undefined) return true;
  return toValue(action.show);
};

// 规范化选项数据
const normalizedOptions = computed(() => {
  if (!props.item.options) return [];
  return toValue(props.item.options);
});

// 获取属性值
const resolve = toValue;

// 处理操作事件
const handleAction = () => {
  if (props.item.action) {
    props.item.action(modelValue.value);
  }
};

// 计算是否显示恢复默认按钮
const showReset = computed(() => {
  if (isDisabled.value) return false;
  if (props.item.defaultValue === undefined) return false;
  return modelValue.value !== props.item.defaultValue;
});

// 恢复默认
const handleReset = () => {
  modelValue.value = props.item.defaultValue;
};

// 计算激活的按钮列表
const activeActions = computed(() => {
  const actions: SettingAction[] = [];

  // 额外按钮
  if (props.item.extraButton && isExtraButtonShow(props.item.extraButton)) {
    actions.push(props.item.extraButton);
  }

  // 恢复默认按钮
  if (showReset.value) {
    actions.push({
      label: "恢复默认",
      type: "primary",
      secondary: true,
      strong: true,
      action: handleReset,
    });
  }

  return actions;
});
</script>

<style scoped lang="scss">
.setting-item-wrapper {
  width: 100%;
  margin-bottom: 12px;
  transition: margin 0.3s;
  &:last-child {
    margin-bottom: 0;
  }
  &.highlighted {
    .set-item {
      &::after {
        animation: highlight-pulse 2.5s cubic-bezier(0.4, 0, 0.2, 1);
        animation-delay: 0.5s;
      }
    }
  }
}
.set-item {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(var(--primary), 0.25);
    z-index: 1;
    opacity: 0;
    pointer-events: none;
  }
}
:deep(.n-card__content) {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}

.control-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  flex: 1;
}

.set {
  justify-content: flex-end;
  min-width: 200px;
  width: 200px;

  &.n-switch {
    width: max-content;
    min-width: auto;
  }

  @media (max-width: 768px) {
    width: 140px;
    min-width: 140px;
  }
}
</style>
