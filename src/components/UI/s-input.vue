<template>
  <n-input
    :value="input"
    @input="handleInput"
    @blur="handleConfirm"
    @keyup.enter="handleConfirm"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value?: string;
    updateValueOnInput?: boolean;
  }>(),
  {
    value: "",
    updateValueOnInput: false,
  },
);

const emit = defineEmits<{
  (e: "update:value", value: string): void;
}>();

const input = ref(props.value); // 内部值
const value = ref(props.value); // 外部值

// 监听父组件 value 变化，同步到内部值
watch(
  () => props.value,
  (newValue) => {
    value.value = newValue;
    input.value = newValue;
  },
  { immediate: true },
);

const handleInput = (newValue: string) => {
  if (props.updateValueOnInput) {
    value.value = newValue;
    emit("update:value", newValue);
  } else {
    input.value = newValue;
  }
};

const handleConfirm = () => {
  if (!props.updateValueOnInput && input.value !== value.value) {
    value.value = input.value;
    emit("update:value", value.value);
  }
}
</script>
