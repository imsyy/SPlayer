use tracing::{debug, error};
use windows::{
    Win32::{
        Foundation::{HWND, RECT},
        UI::WindowsAndMessaging::{
            FindWindowExW, GWL_EXSTYLE, GWL_STYLE, GetWindowRect, SetParent, WINDOW_EX_STYLE,
            WINDOW_STYLE, WS_CAPTION, WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_MAXIMIZEBOX,
            WS_MINIMIZEBOX, WS_SYSMENU, WS_THICKFRAME,
        },
    },
    core::w,
};

use crate::{
    LayoutParams, TaskbarStrategy,
    strategy::{Rect, TaskbarLayout, Win11Layout},
    uia::TaskbarScanner,
    utils::{BRIDGE_CLASS, check_registry_value, find_taskbar_hwnd, modify_window_long},
};

pub struct Win11Strategy {
    h_taskbar: HWND,
    scanner: Option<TaskbarScanner>,
}

impl Win11Strategy {
    pub fn new() -> Self {
        Self {
            h_taskbar: HWND::default(),
            scanner: None,
        }
    }

    fn is_taskbar_center_align() -> bool {
        check_registry_value("TaskbarAl", |val| val == 1, true)
    }
}

impl TaskbarStrategy for Win11Strategy {
    fn init(&mut self) -> bool {
        let Some(hwnd) = find_taskbar_hwnd() else {
            error!("初始化失败，找不到 Shell_TrayWnd");
            return false;
        };

        let h_bridge =
            unsafe { FindWindowExW(Some(hwnd), None, BRIDGE_CLASS, None) }.unwrap_or_default();

        if h_bridge.0.is_null() {
            error!("初始化失败，找不到 XAML 桥");
            return false;
        }

        self.h_taskbar = hwnd;
        debug!(?hwnd, "Win11 策略初始化成功");
        true
    }

    fn embed_window(&self, child_wnd: HWND) -> bool {
        if self.h_taskbar.0.is_null() {
            return false;
        }

        unsafe {
            let _ = SetParent(child_wnd, Some(self.h_taskbar));

            // 修改样式 (去除标题栏、边框等)
            modify_window_long(child_wnd, GWL_STYLE, |raw_style| {
                let style = WINDOW_STYLE(raw_style);
                let mask =
                    WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU;
                let new_style = style & !mask;
                new_style.0
            });

            // 设置扩展样式 (透明 + 鼠标穿透 + 工具窗口)
            modify_window_long(child_wnd, GWL_EXSTYLE, |raw_style| {
                let ex_style = WINDOW_EX_STYLE(raw_style);
                let new_ex_style = ex_style | WS_EX_LAYERED | WS_EX_TOOLWINDOW;
                new_ex_style.0
            });
        }
        true
    }

    fn update_layout(&mut self, _params: LayoutParams) -> Option<TaskbarLayout> {
        if self.h_taskbar.0.is_null() {
            return None;
        }

        // 托盘区域
        let tray_rect = unsafe {
            let h_notify = FindWindowExW(Some(self.h_taskbar), None, w!("TrayNotifyWnd"), None)
                .unwrap_or_default();

            let mut rc = RECT::default();
            if !h_notify.0.is_null() {
                let _ = GetWindowRect(h_notify, &raw mut rc);
            }

            Rect {
                x: rc.left,
                y: rc.top,
                width: rc.right - rc.left,
                height: rc.bottom - rc.top,
            }
        };

        if self.scanner.is_none() {
            match TaskbarScanner::new() {
                Ok(s) => self.scanner = Some(s),
                Err(e) => {
                    error!("[Win11] Scanner 初始化失败: {e:?}");
                    return None;
                }
            }
        }

        let uia_bounds = if let Some(scanner) = self.scanner.as_ref() {
            match scanner.scan_taskbar(self.h_taskbar) {
                Ok(b) => b,
                Err(e) => {
                    error!("[Win11] scan_taskbar 失败: {e:?}");
                    self.scanner = None;
                    return None;
                }
            }
        } else {
            return None;
        };

        let is_centered = Self::is_taskbar_center_align();

        Some(TaskbarLayout {
            system_type: "win11".to_string(),
            win10: None,
            win11: Some(Win11Layout {
                start_button: uia_bounds.start_btn,
                widgets: uia_bounds.widgets,
                content: uia_bounds.content,
                tray: tray_rect,
                is_centered,
            }),
        })
    }

    fn restore(&self) {
        // Win11 不需要恢复
    }
}

impl Drop for Win11Strategy {
    fn drop(&mut self) {
        self.restore();
    }
}
