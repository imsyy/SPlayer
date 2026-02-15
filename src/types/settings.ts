import { Ref, WritableComputedRef, MaybeRefOrGetter } from "vue";
import { SelectOption } from "naive-ui";

/**
 * 设置项的 UI 类型
 * - `switch`: 开关
 * - `select`: 下拉选择框
 * - `input-number`: 数字输入框
 * - `slider`: 滑动条
 * - `button`: 按钮 (通常用于触发弹窗或操作)
 * - `color-picker`: 颜色选择器
 * - `custom`: 自定义组件
 */
export type SettingItemType =
  | "switch"
  | "select"
  | "input-number"
  | "slider"
  | "button"
  | "color-picker"
  | "custom"
  | "text-input";

/**
 * 通用标签定义
 */
export interface SettingTag {
  text: string;
  type?: "default" | "error" | "primary" | "info" | "success" | "warning";
}

/**
 * 额外的操作按钮定义
 */
export interface SettingAction {
  label: string;
  type?: "default" | "primary" | "info" | "success" | "warning" | "error";
  secondary?: boolean;
  strong?: boolean;
  action: () => void;
  show?: MaybeRefOrGetter<boolean>;
}

/**
 * 设置项定义接口
 * 定义了单个设置项的 UI 表现、数据绑定及交互逻辑
 */
export interface SettingItem {
  /**
   * 唯一标识符
   * 用于搜索索引和列表渲染的 key
   */
  key: string;

  /**
   * 显示名称
   * 设置项主标题
   */
  label: MaybeRefOrGetter<string>;

  /**
   * 设置项类型
   * 决定渲染使用哪个组件
   */
  type: SettingItemType;

  /**
   * 描述信息
   * 显示在标题下方的辅助说明文字
   * 支持字符串或渲染函数（可以使用 h 函数渲染复杂内容）
   */
  description?: MaybeRefOrGetter<string> | (() => any);

  /**
   * 搜索关键词
   * 用于增强搜索功能，除 label 和 description 外的额外搜索匹配项
   */
  keywords?: string[];

  // --- 数据绑定 (Data Binding) ---

  /**
   * 绑定的响应式数据
   * 可以是 Vue 的 ref 或 computed
   * 如果提供了 `value`，通常不需要再提供 `get` 和 `set`
   */
  value?: WritableComputedRef<any> | Ref<any>;

  /**
   * 自定义 Getter
   * 当无法直接传递 ref 时使用，用于获取当前值
   */
  get?: () => any;

  /**
   * 自定义 Setter
   * 当无法直接传递 ref 时使用，用于更新值
   */
  set?: (value: any) => void;

  /**
   * 默认值
   * 用于显示“恢复默认”按钮
   * 当当前值与默认值不同时，显示恢复按钮
   */
  defaultValue?: any;

  /**
   * 是否显示
   * 控制该设置项是否渲染
   * 支持布尔值、返回布尔值的函数或响应式引用
   * @default true
   */
  show?: MaybeRefOrGetter<boolean>;

  /**
   * 是否禁用
   * 控制该设置项是否处于禁用状态
   * 支持布尔值、返回布尔值的函数或响应式引用
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean>;

  /**
   * 标题
   * 一般用作鼠标悬停时会显示的提示
   */
  title?: MaybeRefOrGetter<string>;

  /**
   * 子项展开条件
   * 仅当存在 `children` 时有效
   * 默认逻辑是当父级 `value === true` 时展开
   *如果是其他类型或需要特定条件，请提供此函数
   */
  condition?: () => boolean;

  /**
   * 选项列表
   * 仅当 `type` 为 `select` 时有效
   * 支持静态数组、返回数组的函数或计算属性
   */
  options?: MaybeRefOrGetter<SelectOption[]>;

  /**
   * 最小值
   * 仅当 `type` 为 `input-number` 或 `slider` 时有效
   */
  min?: MaybeRefOrGetter<number>;

  /**
   * 最大值
   * 仅当 `type` 为 `input-number` 或 `slider` 时有效
   */
  max?: MaybeRefOrGetter<number>;

  /**
   * 步长
   * 仅当 `type` 为 `input-number` 或 `slider` 时有效
   */
  step?: MaybeRefOrGetter<number>;

  /**
   * 是否移除外层容器 (n-card)
   * 用于自定义组件需要完全控制渲染的场景
   * @default false
   */
  noWrapper?: boolean;

  /**
   * 刻度标记
   * 仅当 `type` 为 `slider` 时有效
   * 格式: { [number]: string }
   */
  marks?: Record<number, string>;

  /**
   * 格式化 Tooltip
   * 仅当 `type` 为 `slider` 时有效
   * 用于自定义拖动时显示的数值格式
   */
  formatTooltip?: (value: number) => string;

  /**
   * 后缀
   * 仅当 `type` 为 `input-number` 或 `text-input` 时有效 (例如: "ms", "px")
   */
  suffix?: MaybeRefOrGetter<string>;

  /**
   * 前缀
   * 仅当 `type` 为 `text-input` 时有效
   */
  prefix?: MaybeRefOrGetter<string>;

  /**
   * 按钮文字
   * 仅当 `type` 为 `button` 时有效
   * @default "配置"
   */
  buttonLabel?: MaybeRefOrGetter<string>;

  /**
   * 标签集合
   * 显示在标题旁边的标签 (例如: "Beta", "New")
   */
  tags?: SettingTag[];

  /**
   * 自定义组件对象
   * 仅当 `type` 为 `custom` 时有效
   * 直接传入 import 的 .vue 组件对象
   */
  component?: any;

  /**
   * 传递给组件的 Props
   * 用于 `type` 为 `custom` 时传递 props，或覆盖内置组件的默认 props
   */
  componentProps?: Record<string, any>;

  /**
   * 操作回调
   * - 对于 `button`: 点击时触发
   * - 对于 `color-picker`: 颜色选择完成时触发
   * - 对于其他组件: 通常不需要，值变动由 `value` 绑定处理
   */
  action?: (value?: any) => void;

  /**
   * 额外的操作按钮
   * 显示在主控件左侧的操作按钮
   */
  extraButton?: SettingAction;

  /**
   * 强制显示条件
   * 当满足特定条件时，强制禁用该设置项并显示为特定值
   * 通常用于互斥功能的逻辑处理
   */
  forceIf?: {
    /**
     * 判断条件
     * 当返回 true 时，强制生效
     */
    condition: MaybeRefOrGetter<boolean>;
    /**
     * 强制显示的值
     * 当条件满足时，显示的值
     */
    forcedValue?: MaybeRefOrGetter<any>;
    /**
     * 强制显示的标题
     * 当条件满足时，显示的标题文字
     * @see SettingItem.title
     */
    forcedTitle?: MaybeRefOrGetter<string>;
    /**
     * 强制显示的描述
     * 当条件满足时，显示的描述文字
     * @see SettingItem.description
     */
    forcedDescription?: MaybeRefOrGetter<string> | (() => any);
  };

  // --- 嵌套子项 (Nested Children) ---

  /**
   * 子设置项
   * 用于实现级联折叠效果
   * 当满足特定条件（通常是父级开关开启）时，显示子项列表
   * 渲染在一个 `n-collapse-transition` 中
   */
  children?: MaybeRefOrGetter<SettingItem[]>;
}

/**
 * 设置组接口
 * 代表设置页面中的一个分组区块（通常带有一个小标题）
 */
export interface SettingGroup {
  /**
   * 分组标题
   * 显示在分组上方的标题文字
   */
  title: string;

  /**
   * 分组标签
   * 显示在标题旁边的标签
   */
  tags?: SettingTag[];

  /**
   * 组内包含的设置项列表
   */
  items: SettingItem[];

  /**
   * 是否显示该分组
   * @default true
   */
  show?: boolean | Ref<boolean> | (() => boolean);
}

/**
 * 设置配置接口
 * 用于标准化 Hook 的返回值，支持懒加载
 */
export interface SettingConfig {
  groups: SettingGroup[];
  onActivate?: () => void;
  onDeactivate?: () => void;
}
