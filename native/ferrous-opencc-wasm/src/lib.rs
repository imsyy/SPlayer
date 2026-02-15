use ferrous_opencc::{OpenCC, config::BuiltinConfig};
use wasm_bindgen::prelude::*;

/// 一个包装了 [`OpenCC`] 转换器的结构体
/// @see {@link <https://docs.rs/ferrous-opencc/0.3.1/ferrous_opencc/struct.OpenCC.html>}
#[wasm_bindgen]
pub struct TextConverter {
    inner: OpenCC,
}

#[wasm_bindgen]
impl TextConverter {
    /// 使用指定的配置文件创建一个 `TextConverter` 实例
    /// @param `config_name` 内置配置文件的名称，参见 {@link <https://docs.rs/ferrous-opencc/0.3.1/ferrous_opencc/config/enum.BuiltinConfig.html>}
    /// @returns 返回初始化的转换器实例
    /// @throws 如果传入的配置名称不存在或加载失败，抛出错误
    #[wasm_bindgen(constructor)]
    #[allow(clippy::missing_errors_doc)] // 有了
    pub fn new(config_name: &str) -> Result<Self, JsValue> {
        let to_js_err = |e: ferrous_opencc::error::OpenCCError| JsValue::from_str(&e.to_string());

        let config_enum = BuiltinConfig::from_filename(config_name).map_err(to_js_err)?;
        let inner = OpenCC::from_config(config_enum).map_err(to_js_err)?;
        Ok(Self { inner })
    }

    /// 根据之前初始化时的配置进行简繁转换
    /// @see OpenCC.convert
    #[wasm_bindgen]
    #[must_use]
    pub fn convert(&self, input: &str) -> String {
        self.inner.convert(input)
    }
}
