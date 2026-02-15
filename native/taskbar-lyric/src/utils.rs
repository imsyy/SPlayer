use std::ffi::c_void;

use napi::bindgen_prelude::Buffer;
use tracing::error;
use windows::{
    Win32::{
        Foundation::HWND,
        UI::WindowsAndMessaging::{
            FindWindowW, GetWindowLongPtrW, SetWindowLongPtrW, WINDOW_LONG_PTR_INDEX,
        },
    },
    core::w,
};
use windows_core::PCWSTR;
use winreg::{
    RegKey,
    enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE},
};

pub const BRIDGE_CLASS: PCWSTR = w!("Windows.UI.Composition.DesktopWindowContentBridge");

pub const REG_KEY_ADVANCED: &str =
    "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced";

/// 从 Electron Buffer 获取 HWND
pub fn get_hwnd_from_buffer(buffer: &Buffer) -> Option<HWND> {
    // Electron 的 buffer 存储的是句柄的内存地址
    let bytes = buffer.as_ref();

    if bytes.len() != 8 && bytes.len() != 4 {
        error!("无效的 buffer 长度 {}", bytes.len());
        return None;
    }

    let ptr_val = match bytes.len() {
        8 => Some(u64::from_ne_bytes(bytes.try_into().ok()?) as isize),
        4 => Some(u32::from_ne_bytes(bytes.try_into().ok()?) as isize),
        _ => None,
    }?;

    if ptr_val == 0 {
        None
    } else {
        Some(HWND(ptr_val as *mut c_void))
    }
}

/// 修改窗口样式的通用 helper
pub unsafe fn modify_window_long(
    hwnd: HWND,
    index: WINDOW_LONG_PTR_INDEX,
    f: impl FnOnce(u32) -> u32,
) {
    let current = unsafe { GetWindowLongPtrW(hwnd, index) };
    let new_value = f(current as u32);
    unsafe { SetWindowLongPtrW(hwnd, index, new_value as isize) };
}

/// 注册表读取 Helper
pub fn check_registry_value<F>(value_name: &str, predicate: F, default: bool) -> bool
where
    F: Fn(u32) -> bool,
{
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(REG_KEY_ADVANCED)
        .and_then(|key| key.get_value::<u32, _>(value_name))
        .map(predicate)
        .unwrap_or(default)
}

/// 查找 Shell_TrayWnd (任务栏顶级窗口)
pub fn find_taskbar_hwnd() -> Option<HWND> {
    unsafe {
        let hwnd = FindWindowW(w!("Shell_TrayWnd"), None).unwrap_or_default();
        if hwnd.0.is_null() { None } else { Some(hwnd) }
    }
}

/// 获取系统 Build Number
pub fn get_windows_build_number() -> u32 {
    RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion")
        .and_then(|key| key.get_value::<String, _>("CurrentBuild"))
        .map(|s| s.parse::<u32>().unwrap_or(0))
        .unwrap_or(0)
}
