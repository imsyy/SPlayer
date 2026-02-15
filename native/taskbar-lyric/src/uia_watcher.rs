#![allow(clippy::ptr_as_ptr)]
#![allow(clippy::borrow_as_ptr)]
#![allow(clippy::ref_as_ptr)]
#![allow(clippy::inline_always)]

use std::{
    ptr,
    sync::{Arc, mpsc},
    thread,
};

use anyhow::{Result, anyhow};
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use windows::{
    Win32::{
        Foundation::{LPARAM, WPARAM},
        System::{
            Com::{
                CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx,
                CoUninitialize, SAFEARRAY,
            },
            Threading::GetCurrentThreadId,
            Variant::VARIANT,
        },
        UI::{
            Accessibility::{
                CUIAutomation, IUIAutomation, IUIAutomationElement,
                IUIAutomationPropertyChangedEventHandler,
                IUIAutomationPropertyChangedEventHandler_Impl,
                IUIAutomationStructureChangedEventHandler,
                IUIAutomationStructureChangedEventHandler_Impl, StructureChangeType,
                TreeScope_Descendants, UIA_BoundingRectanglePropertyId, UIA_PROPERTY_ID,
            },
            WindowsAndMessaging::{
                DispatchMessageW, GetMessageW, MSG, PostThreadMessageW, TranslateMessage, WM_QUIT,
            },
        },
    },
    core::{Ref, Result as WinResult, implement},
};

use crate::utils::find_taskbar_hwnd;

pub type LayoutChangedCallback = Box<dyn Fn() + Send + Sync + 'static>;

#[implement(
    IUIAutomationPropertyChangedEventHandler,
    IUIAutomationStructureChangedEventHandler
)]
pub struct TaskbarEventHandler {
    callback: Arc<LayoutChangedCallback>,
}

impl TaskbarEventHandler {
    pub fn new(callback: Arc<LayoutChangedCallback>) -> Self {
        Self { callback }
    }

    fn notify(&self) {
        (self.callback)();
    }
}

impl IUIAutomationPropertyChangedEventHandler_Impl for TaskbarEventHandler_Impl {
    fn HandlePropertyChangedEvent(
        &self,
        _sender: Ref<'_, IUIAutomationElement>,
        property_id: UIA_PROPERTY_ID,
        _new_value: &VARIANT,
    ) -> WinResult<()> {
        if property_id == UIA_BoundingRectanglePropertyId {
            self.notify();
        }
        Ok(())
    }
}

impl IUIAutomationStructureChangedEventHandler_Impl for TaskbarEventHandler_Impl {
    fn HandleStructureChangedEvent(
        &self,
        _sender: Ref<'_, IUIAutomationElement>,
        _change_type: StructureChangeType,
        _runtime_id: *const SAFEARRAY,
    ) -> WinResult<()> {
        self.notify();
        Ok(())
    }
}

pub struct NativeUiaWatcher {
    thread_id: Option<u32>,
}

impl NativeUiaWatcher {
    pub fn new(callback: LayoutChangedCallback) -> Result<Self> {
        let (tx, rx) = mpsc::channel::<u32>();
        let callback_arc = Arc::new(callback);

        thread::spawn(move || unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

            let thread_id = GetCurrentThreadId();
            let _ = tx.send(thread_id);

            let automation_res: WinResult<IUIAutomation> =
                CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER);

            let handlers_guard = if let Ok(ref automation) = automation_res
                && let Some(hwnd) = find_taskbar_hwnd()
                && let Ok(root_element) = automation.ElementFromHandle(hwnd)
            {
                let handler1 = TaskbarEventHandler::new(callback_arc.clone());
                let handler2 = TaskbarEventHandler::new(callback_arc.clone());

                let prop_handler: IUIAutomationPropertyChangedEventHandler = handler1.into();
                let struct_handler: IUIAutomationStructureChangedEventHandler = handler2.into();

                let _ = automation.AddPropertyChangedEventHandler(
                    &root_element,
                    TreeScope_Descendants,
                    None,
                    &prop_handler,
                    ptr::null(),
                );

                let _ = automation.AddStructureChangedEventHandler(
                    &root_element,
                    TreeScope_Descendants,
                    None,
                    &struct_handler,
                );

                Some((prop_handler, struct_handler))
            } else {
                None
            };

            let mut msg = MSG::default();
            while GetMessageW(&raw mut msg, None, 0, 0).as_bool() {
                let _ = TranslateMessage(&raw const msg);
                let _ = DispatchMessageW(&raw const msg);
            }

            if let Ok(automation) = automation_res {
                let _ = automation.RemoveAllEventHandlers();
            }

            drop(handlers_guard);

            CoUninitialize();
        });

        let thread_id = rx.recv().map_err(|e| anyhow!("获取线程ID失败: {e}"))?;

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

impl Drop for NativeUiaWatcher {
    fn drop(&mut self) {
        self.stop();
    }
}

#[napi]
pub struct UiaWatcher {
    inner: NativeUiaWatcher,
}

#[napi]
impl UiaWatcher {
    #[napi(constructor)]
    pub fn new(tsfn: ThreadsafeFunction<()>) -> napi::Result<Self> {
        let tsfn_arc = Arc::new(tsfn);
        let rust_callback: LayoutChangedCallback = Box::new(move || {
            tsfn_arc.call(Ok(()), ThreadsafeFunctionCallMode::NonBlocking);
        });

        let inner = NativeUiaWatcher::new(rust_callback)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(Self { inner })
    }

    #[napi]
    pub fn stop(&mut self) {
        self.inner.stop();
    }
}

#[cfg(test)]
mod tests {
    use std::{
        sync::{Arc, Mutex},
        time::{Duration, Instant},
    };

    use super::*;

    #[test]
    #[ignore = "需要手动交互"]
    fn test_interaction() {
        let (tx, rx) = std::sync::mpsc::channel();
        let tx = Arc::new(Mutex::new(tx));

        let callback = Box::new(move || {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis();

            println!("[{now}] 任务栏布局发生变化 ");

            if let Ok(guard) = tx.lock()
                && let Err(e) = guard.send(now)
            {
                eprintln!("❌ 发送事件信号失败: {e:?}");
            }
        });

        let watcher_res = NativeUiaWatcher::new(callback);

        if let Err(ref e) = watcher_res {
            panic!("❌ 监听器启动失败: {e:?}");
        }
        let mut watcher = watcher_res.unwrap();

        let timeout = Duration::from_secs(30);
        let start = Instant::now();
        let mut event_count = 0;
        let mut last_event_time = 0;

        loop {
            if start.elapsed() >= timeout {
                println!("\n⏰ 测试时间结束");
                break;
            }

            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(ts) => {
                    event_count += 1;

                    let diff = if last_event_time > 0 {
                        ts - last_event_time
                    } else {
                        0
                    };
                    last_event_time = ts;

                    println!("-> 收到事件 #{event_count} (diff +{diff}ms)");
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    panic!("❌ 通道意外断开");
                }
            }
        }

        println!("---------------------------------------------------------------");
        println!("测试统计:");
        println!("  总捕获事件数: {event_count}");
        println!("---------------------------------------------------------------");

        watcher.stop();

        assert!(
            event_count != 0,
            "❌ 测试失败：未检测到任何 UIA 事件，确保你跟任务栏进行了任何交互"
        );
    }
}
