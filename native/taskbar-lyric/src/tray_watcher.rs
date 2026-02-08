//! 适用于 Windows 11 的托盘尺寸监听器
//!
//! 由于托盘中程序图标的添加和减少并不触发 UIA 或者注册表事件，只能监听托盘尺寸了

use std::{
    sync::{Arc, LazyLock, Mutex},
    thread,
};

use anyhow::Result;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use tracing::{error, info, warn};
use windows::Win32::{
    Foundation::{HWND, LPARAM, WPARAM},
    System::Threading::GetCurrentThreadId,
    UI::{
        Accessibility::{HWINEVENTHOOK, SetWinEventHook, UnhookWinEvent},
        WindowsAndMessaging::{
            EVENT_OBJECT_LOCATIONCHANGE, GetClassNameW, GetMessageW, GetWindowThreadProcessId, MSG,
            PostThreadMessageW, WINEVENT_OUTOFCONTEXT, WM_QUIT,
        },
    },
};

use crate::utils::find_taskbar_hwnd;

pub type TrayChangedCallback = Box<dyn Fn() + Send + Sync + 'static>;

static GLOBAL_CALLBACK: LazyLock<Mutex<Option<Arc<TrayChangedCallback>>>> =
    LazyLock::new(|| Mutex::new(None));

unsafe extern "system" fn win_event_proc(
    _h_win_event_hook: HWINEVENTHOOK,
    event: u32,
    hwnd: HWND,
    id_object: i32,
    _id_child: i32,
    _id_event_thread: u32,
    _dw_ms_event_time: u32,
) {
    if event == EVENT_OBJECT_LOCATIONCHANGE && id_object == 0 {
        let mut buffer = [0u16; 64];
        let len = unsafe { GetClassNameW(hwnd, &mut buffer) };
        if len > 0 {
            let name = String::from_utf16_lossy(&buffer[..len as usize]);
            if name == "TrayNotifyWnd"
                && let Ok(guard) = GLOBAL_CALLBACK.lock()
                && let Some(cb) = guard.as_ref()
            {
                cb();
            }
        }
    }
}

pub struct NativeTrayWatcher {
    thread_id: Option<u32>,
}

impl NativeTrayWatcher {
    pub fn new(callback: TrayChangedCallback) -> Result<Self> {
        let callback_arc = Arc::new(callback);

        if let Ok(mut guard) = GLOBAL_CALLBACK.lock() {
            *guard = Some(callback_arc);
        }

        let (tx, rx) = std::sync::mpsc::channel();

        thread::spawn(move || unsafe {
            let current_tid = GetCurrentThreadId();
            let _ = tx.send(current_tid);

            let mut pid = 0;
            let explorer_tid = find_taskbar_hwnd()
                .map_or(0, |hwnd| GetWindowThreadProcessId(hwnd, Some(&raw mut pid)));

            let mut hook_handle = HWINEVENTHOOK(std::ptr::null_mut());

            if explorer_tid != 0 {
                info!(pid, explorer_tid, "[TrayWatcher] 正在安装钩子");

                hook_handle = SetWinEventHook(
                    EVENT_OBJECT_LOCATIONCHANGE,
                    EVENT_OBJECT_LOCATIONCHANGE,
                    None,
                    Some(win_event_proc),
                    pid,
                    explorer_tid,
                    WINEVENT_OUTOFCONTEXT,
                );

                if hook_handle.0.is_null() {
                    error!("[TrayWatcher] 钩子安装失败");
                }
            } else {
                warn!("[TrayWatcher] 未找到 Explorer 线程，监听器将空转");
            }

            let mut msg = MSG::default();
            while GetMessageW(&raw mut msg, None, 0, 0).as_bool() {}

            if !hook_handle.0.is_null() {
                let _ = UnhookWinEvent(hook_handle);
            }
        });

        let thread_id = rx.recv()?;

        Ok(Self {
            thread_id: Some(thread_id),
        })
    }

    pub fn stop(&mut self) {
        if let Some(tid) = self.thread_id {
            unsafe {
                let _ = PostThreadMessageW(tid, WM_QUIT, WPARAM(0), LPARAM(0));
            }
            self.thread_id = None;
        }
    }
}

impl Drop for NativeTrayWatcher {
    fn drop(&mut self) {
        self.stop();
    }
}

#[napi]
pub struct TrayWatcher {
    inner: Option<NativeTrayWatcher>,
}

#[napi]
impl TrayWatcher {
    #[napi(constructor)]
    pub fn new(tsfn: ThreadsafeFunction<()>) -> napi::Result<Self> {
        let tsfn_arc = Arc::new(tsfn);

        let rust_callback: TrayChangedCallback = Box::new(move || {
            tsfn_arc.call(Ok(()), ThreadsafeFunctionCallMode::NonBlocking);
        });

        match NativeTrayWatcher::new(rust_callback) {
            Ok(inner) => Ok(Self { inner: Some(inner) }),
            Err(e) => Err(napi::Error::from_reason(format!(
                "创建 TrayWatcher 失败: {e}"
            ))),
        }
    }

    #[napi]
    pub fn stop(&mut self) {
        if let Some(mut inner) = self.inner.take() {
            inner.stop();
        }
    }
}

#[cfg(test)]
mod tests {
    use std::time::{Duration, Instant};

    use serial_test::serial;

    use super::*;

    #[test]
    #[serial]
    fn test_lifecycle_management() {
        let call_count = Arc::new(Mutex::new(0));
        let count_clone = call_count;

        let callback = Box::new(move || {
            let mut num = count_clone.lock().unwrap();
            *num += 1;
            println!("回调触发，数量: {}", *num);
        });

        let watcher_res = NativeTrayWatcher::new(callback);
        assert!(watcher_res.is_ok(), "Watcher 初始化失败");

        let mut watcher = watcher_res.unwrap();

        thread::sleep(Duration::from_millis(500));

        watcher.stop();
        watcher.stop();
    }

    #[test]
    #[serial]
    #[ignore = "需要手动交互"]
    fn test_manual_interaction() {
        let (tx, rx) = std::sync::mpsc::channel();
        let tx = Arc::new(Mutex::new(tx));

        let callback = Box::new(move || {
            let _ = tx.lock().unwrap().send(());
            println!("✅ 捕获到托盘尺寸变更事件");
        });

        let mut watcher = NativeTrayWatcher::new(callback).expect("初始化失败");

        let start = Instant::now();
        let timeout = Duration::from_secs(15);
        let mut event_count = 0;

        loop {
            if start.elapsed() >= timeout {
                break;
            }

            if rx.try_recv().is_ok() {
                event_count += 1;
            }

            thread::sleep(Duration::from_millis(100));
        }

        watcher.stop();

        println!("---------------------------------------------------------------");
        println!("测试统计:");
        println!("  总捕获事件数: {event_count}");
        println!("---------------------------------------------------------------");

        assert!(
            event_count != 0,
            "❌ 测试失败：未检测到任何托盘尺寸变更事件，确保你跟任务栏进行了任何交互"
        );
    }
}
