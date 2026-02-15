use anyhow::{Context, Result, bail};
use windows::Win32::{
    Foundation::{HWND, RPC_E_CHANGED_MODE},
    System::Com::{
        CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx,
        CoUninitialize,
    },
    UI::{
        Accessibility::{
            CUIAutomation, IUIAutomation, IUIAutomationElement, TreeScope_Descendants,
        },
        WindowsAndMessaging::FindWindowExW,
    },
};

use crate::{strategy::Rect, utils::BRIDGE_CLASS};

const CLASS_TASKLIST_BUTTON: &str = "Taskbar.TaskListButtonAutomationPeer";
const ID_START_BUTTON: &str = "StartButton";
const ID_SEARCH_BUTTON: &str = "SearchButton";
const ID_SEARCH_TEXT: &str = "SearchBoxTextBlock";
const ID_WIDGETS_BUTTON: &str = "WidgetsButton";

pub struct TaskbarScanner {
    automation: IUIAutomation,
    should_uninitialize: bool,
}

#[derive(Debug, Default, Clone, Copy)]
pub struct TaskbarContentBounds {
    pub start_btn: Rect,
    pub widgets: Rect,
    pub content: Rect,
}

impl TaskbarScanner {
    pub fn new() -> Result<Self> {
        unsafe {
            let hr = CoInitializeEx(None, COINIT_MULTITHREADED);

            let should_uninitialize = if hr.is_ok() {
                true
            } else if hr == RPC_E_CHANGED_MODE {
                false
            } else {
                hr.ok().context("无法初始化 COM 环境")?;
                false
            };

            let automation = CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)
                .context("无法创建 UIAutomation 实例")?;

            Ok(Self {
                automation,
                should_uninitialize,
            })
        }
    }

    pub fn get_element_from_handle(&self, hwnd: HWND) -> Result<IUIAutomationElement> {
        unsafe { Ok(self.automation.ElementFromHandle(hwnd)?) }
    }

    pub fn scan_taskbar(&self, taskbar_hwnd: HWND) -> Result<TaskbarContentBounds> {
        unsafe {
            let mut child_hwnd = HWND::default();
            let true_condition = self.automation.CreateTrueCondition()?;

            loop {
                child_hwnd =
                    FindWindowExW(Some(taskbar_hwnd), Some(child_hwnd), BRIDGE_CLASS, None)?;

                if child_hwnd.0.is_null() {
                    break;
                }

                if let Ok(bridge_element) = self.get_element_from_handle(child_hwnd)
                    && let Ok(items) =
                        bridge_element.FindAll(TreeScope_Descendants, &true_condition)
                {
                    let count = items.Length().unwrap_or(0);

                    let mut bounds = TaskbarContentBounds::default();
                    let mut found_any = false;

                    for i in 0..count {
                        let Ok(item) = items.GetElement(i) else {
                            continue;
                        };
                        let Ok(id_bstr) = item.CurrentAutomationId() else {
                            continue;
                        };
                        let Ok(rect_raw) = item.CurrentBoundingRectangle() else {
                            continue;
                        };
                        let id = id_bstr.to_string();

                        let rect = Rect {
                            x: rect_raw.left,
                            y: rect_raw.top,
                            width: rect_raw.right - rect_raw.left,
                            height: rect_raw.bottom - rect_raw.top,
                        };

                        if id == ID_WIDGETS_BUTTON {
                            bounds.widgets = rect;
                        } else if id == ID_START_BUTTON {
                            bounds.start_btn = rect;
                        }

                        let Ok(class_name_bstr) = item.CurrentClassName() else {
                            continue;
                        };
                        let class_name = class_name_bstr.to_string();

                        let is_app_icon = class_name == CLASS_TASKLIST_BUTTON;
                        let is_content_element = is_app_icon
                            || id == ID_START_BUTTON
                            || id == ID_SEARCH_BUTTON
                            || id == ID_SEARCH_TEXT;

                        if is_content_element && rect.width > 0 {
                            bounds.content.union(&rect);
                            found_any = true;
                        }
                    }

                    if found_any {
                        return Ok(bounds);
                    }
                }
            }
        }

        bail!("未找到有效的任务栏图标区域")
    }
}

impl Drop for TaskbarScanner {
    fn drop(&mut self) {
        if self.should_uninitialize {
            unsafe {
                CoUninitialize();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use serial_test::serial;

    use super::*;
    use crate::utils::find_taskbar_hwnd;

    #[test]
    #[serial] // 因未知原因，同时运行所有测试会导致错误
    fn initialization() {
        let scanner = TaskbarScanner::new();
        if let Err(e) = scanner {
            panic!("{e:?}");
        }
    }

    #[test]
    #[serial]
    fn xaml_scan() {
        let scanner = TaskbarScanner::new().unwrap();
        let hwnd = find_taskbar_hwnd();

        let result = scanner.scan_taskbar(hwnd.unwrap());

        match result {
            Ok(bounds) => {
                println!("扫描结果: {bounds:?}");
            }
            Err(e) => {
                panic!("{e}");
            }
        }
    }
}
