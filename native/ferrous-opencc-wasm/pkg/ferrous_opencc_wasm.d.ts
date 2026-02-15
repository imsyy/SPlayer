/* tslint:disable */

export class OpenCC {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * 根据加载的配置转换字符串。
   *
   * @param {string} input - 需要转换的字符串。
   * @returns {string} - 转换后的字符串。
   *
   * @example
   * ```javascript
   * const traditionalText = converter.convert("开放中文转换");
   * console.log(traditionalText); // 预期: 開放中文轉換
   * ```
   */
  convert(input: string): string;
  /**
   * 创建一个新的 `OpenCC` 实例。
   *
   * @param {`string`} `config_name` - 要使用的内置配置名称, 例如 "s2t.json"。
   * @returns {`OpenCC`} - 一个 `OpenCC` 实例。
   * @throws {`JsValue`} - 如果配置加载失败，则抛出一个错误对象。
   *
   * @example
   * ```javascript
   * import init, { OpenCC } from './pkg/ferrous_opencc.js';
   *
   * async function main() {
   *   await init();
   *   try {
   *     const converter = new OpenCC("s2t.json");
   *     console.log('加载成功:', converter.name);
   *   } catch (err) {
   *     console.error('加载失败:', err);
   *   }
   * }
   * main();
   * ```
   */
  constructor(config_name: string);
  /**
   * 获取当前加载的配置的名称。
   *
   * @returns {string} - 配置的名称。
   *
   * @example
   * ```javascript
   * const configName = converter.name;
   * console.log(configName);
   * ```
   */
  readonly name: string;
}

export class TextConverter {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * 使用指定的配置文件创建一个 `TextConverter` 实例
   * @param `config_name` 内置配置文件的名称，参见 {@link <https://docs.rs/ferrous-opencc/0.3.1/ferrous_opencc/config/enum.BuiltinConfig.html>}
   * @returns 返回初始化的转换器实例
   * @throws 如果传入的配置名称不存在或加载失败，抛出错误
   */
  constructor(config_name: string);
  /**
   * 根据之前初始化时的配置进行简繁转换
   * @see OpenCC.convert
   */
  convert(input: string): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_textconverter_free: (a: number, b: number) => void;
  readonly textconverter_convert: (a: number, b: number, c: number) => [number, number];
  readonly textconverter_new: (a: number, b: number) => [number, number, number];
  readonly __wbg_opencc_free: (a: number, b: number) => void;
  readonly opencc_convert: (a: number, b: number, c: number) => [number, number];
  readonly opencc_name: (a: number) => [number, number];
  readonly opencc_new_wasm: (a: number, b: number) => [number, number, number];
  readonly rust_zstd_wasm_shim_calloc: (a: number, b: number) => number;
  readonly rust_zstd_wasm_shim_free: (a: number) => void;
  readonly rust_zstd_wasm_shim_malloc: (a: number) => number;
  readonly rust_zstd_wasm_shim_memcmp: (a: number, b: number, c: number) => number;
  readonly rust_zstd_wasm_shim_memcpy: (a: number, b: number, c: number) => number;
  readonly rust_zstd_wasm_shim_memmove: (a: number, b: number, c: number) => number;
  readonly rust_zstd_wasm_shim_memset: (a: number, b: number, c: number) => number;
  readonly rust_zstd_wasm_shim_qsort: (a: number, b: number, c: number, d: number) => void;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | { module_or_path: InitInput | Promise<InitInput> }
    | InitInput
    | Promise<InitInput>,
): Promise<InitOutput>;
