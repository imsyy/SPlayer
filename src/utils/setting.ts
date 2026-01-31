import { trimIndentString } from "@/utils/format";

/**
 * 当条件满足时，禁用设置项并强制显示为某值
 * @param options.condition 条件，当为 true 时禁用设置项并强制显示为某值
 * @param options.displayValue 当条件满足时强制显示的值
 * @param options.value 原始值
 * @param options.title 鼠标悬停时的文字（需配合 `titleDisabled` 一起使用，否则会被忽略，此时将此值放在此函数外部）
 * @param options.titleDisabled 被禁用时鼠标悬停显示的提示文字
 * @param options.description 描述文字（需配合 `descriptionDisabled` 一起使用，同上）
 * @param options.descriptionDisabled 被禁用时显示的描述文字
 */
export const forceDisplaySettingIf = <T>(options: {
  condition: MaybeRefOrGetter<boolean>;
  displayValue: MaybeRefOrGetter<T>;
  value: { get: () => T; set: (v: T) => void } | WritableComputedRef<T> | Ref<T>;
  title?: MaybeRefOrGetter<string>;
  titleDisabled?: MaybeRefOrGetter<string>;
  description?: MaybeRefOrGetter<string>;
  descriptionDisabled?: MaybeRefOrGetter<string>;
}): {
  disabled: ComputedRef<boolean>;
  title?: ComputedRef<string>;
  description?: ComputedRef<string>;
  value: ComputedRef<T>;
} => {
  const { condition, displayValue, value, title, titleDisabled, description, descriptionDisabled } =
    options;
  const conditionRef = computed(() => toValue(condition));

  const getter: () => T =
    "get" in value && typeof value.get === "function"
      ? (value.get as () => T)
      : () => toValue(value as Ref<T>);
  const setter: (v: T) => void =
    "set" in value && typeof value.set === "function"
      ? (value.set as (v: T) => void)
      : (v: T) => ((value as Ref<T>).value = v);

  const result: any = {
    disabled: conditionRef,
    value: computed({
      get: () => (conditionRef.value ? toValue(displayValue) : getter()),
      set: (v) => setter(v),
    }),
  };

  if (titleDisabled)
    result.title = computed(() => (conditionRef.value ? toValue(titleDisabled) : toValue(title)));
  if (descriptionDisabled)
    result.description = computed(() =>
      conditionRef.value ? toValue(descriptionDisabled) : toValue(description),
    );

  return result;
};

export const descMultiline = (strings: TemplateStringsArray, ...values: any[]): string => {
  const fullString = String.raw(strings, ...values);
  return trimIndentString(fullString).replace(/\n/g, "<br />");
};
