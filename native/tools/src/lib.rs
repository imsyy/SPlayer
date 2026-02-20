//! 适用于 `SPlayer` 的工具原生模块
//!
//! 你可以在这里添加代码量不那么多的单个功能，如果代码量非常多，请新开一个原生模块
//!
//! 注意：若使用了针对特点平台的条件编译，必须在这里重新导出一个在全平台下可用的函数，
//! 即使它在其他平台是空操作以防止 JS 端在其他平台编译时找不到对应的函数声明

mod analysis;
mod download;
mod scanner;

pub use analysis::*;
pub use download::*;
use napi_derive::napi;
pub use scanner::scan_music_library;
#[cfg(target_os = "windows")]
use windows::{core::w, Win32::UI::WindowsAndMessaging::RegisterWindowMessageW};

#[napi]
pub fn get_taskbar_created_message_id() -> u32 {
    #[cfg(target_os = "windows")]
    {
        unsafe { RegisterWindowMessageW(w!("TaskbarCreated")) }
    }

    #[cfg(not(target_os = "windows"))]
    {
        0
    }
}
