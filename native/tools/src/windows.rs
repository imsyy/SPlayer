use napi_derive::napi;
use windows::{
    Win32::UI::WindowsAndMessaging::RegisterWindowMessageW,
    core::w,
};

#[napi]
pub fn get_taskbar_created_message_id() -> u32 {
    unsafe { RegisterWindowMessageW(w!("TaskbarCreated")) }
}
