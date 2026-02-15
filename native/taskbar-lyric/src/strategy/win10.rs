use tracing::{debug, error, trace};
use windows::{
    Win32::{
        Foundation::{HWND, RECT},
        UI::WindowsAndMessaging::{
            FindWindowExW, GWL_EXSTYLE, GWL_STYLE, GetWindowRect, MoveWindow, SetParent,
            WINDOW_EX_STYLE, WINDOW_STYLE, WS_CAPTION, WS_EX_LAYERED, WS_EX_TOOLWINDOW,
            WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_SYSMENU, WS_THICKFRAME,
        },
    },
    core::{PCWSTR, w},
};

use crate::{
    GAP,
    strategy::{LayoutParams, Rect, TaskbarLayout, TaskbarStrategy, Win10Layout},
    utils::{find_taskbar_hwnd, modify_window_long},
};

#[allow(clippy::struct_field_names)]
pub struct LegacyStrategy {
    h_taskbar: HWND,
    h_rebar: HWND,
    h_tasklist: HWND,
}

impl LegacyStrategy {
    pub fn new() -> Self {
        Self {
            h_taskbar: HWND::default(),
            h_rebar: HWND::default(),
            h_tasklist: HWND::default(),
        }
    }

    unsafe fn find_child_window(
        parent: HWND,
        class_name: PCWSTR,
        fallback: Option<PCWSTR>,
    ) -> HWND {
        let hwnd =
            unsafe { FindWindowExW(Some(parent), None, class_name, None).unwrap_or_default() };
        if hwnd.0.is_null()
            && let Some(fb) = fallback
        {
            return unsafe { FindWindowExW(Some(parent), None, fb, None).unwrap_or_default() };
        }
        hwnd
    }
}

impl TaskbarStrategy for LegacyStrategy {
    fn init(&mut self) -> bool {
        if let Some(hwnd) = find_taskbar_hwnd() {
            self.h_taskbar = hwnd;
            debug!("找到 Shell_TrayWnd {:?}", self.h_taskbar);
        } else {
            return false;
        }

        unsafe {
            self.h_rebar =
                Self::find_child_window(self.h_taskbar, w!("ReBarWindow32"), Some(w!("WorkerW")));

            if self.h_rebar.0.is_null() {
                error!("未能找到 ReBarWindow32");
                return false;
            }

            self.h_tasklist = Self::find_child_window(
                self.h_rebar,
                w!("MSTaskSwWClass"),
                Some(w!("MSTaskListWClass")),
            );

            if self.h_tasklist.0.is_null() {
                error!("未能找到 MSTaskSwWClass/MSTaskListWClass");
                return false;
            }
        }

        debug!(
            ?self.h_rebar, ?self.h_tasklist,
            "初始化 Win10 策略",
        );

        true
    }

    fn embed_window(&self, child_wnd: HWND) -> bool {
        if self.h_taskbar.0.is_null() {
            return false;
        }

        unsafe {
            let _ = SetParent(child_wnd, Some(self.h_taskbar));

            modify_window_long(child_wnd, GWL_STYLE, |raw_style| {
                let style = WINDOW_STYLE(raw_style);
                let mask =
                    WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU;
                let new_style = style & !mask;
                new_style.0
            });

            modify_window_long(child_wnd, GWL_EXSTYLE, |raw_style| {
                let ex_style = WINDOW_EX_STYLE(raw_style);
                let new_ex_style = ex_style | WS_EX_LAYERED | WS_EX_TOOLWINDOW;
                new_ex_style.0
            });
        }
        true
    }

    fn update_layout(&mut self, params: LayoutParams) -> Option<TaskbarLayout> {
        if self.h_rebar.0.is_null() || self.h_tasklist.0.is_null() {
            return None;
        }

        unsafe {
            struct CalculatedBounds {
                x: i32,
                y: i32,
                w: i32,
                h: i32,
            }

            // 屏幕坐标
            let mut rc_rebar = RECT::default();
            let _ = GetWindowRect(self.h_rebar, &raw mut rc_rebar);

            trace!(
                %rc_rebar.top, %rc_rebar.bottom, %rc_rebar.left, %rc_rebar.right,
                "ReBar Rect"
            );

            let mut rc_tasklist = RECT::default();
            let _ = GetWindowRect(self.h_tasklist, &raw mut rc_tasklist);

            // ReBar 的总尺寸
            let rebar_w = rc_rebar.right - rc_rebar.left;
            let rebar_h = rc_rebar.bottom - rc_rebar.top;
            let is_vertical = rebar_h > rebar_w;

            let bounds = if is_vertical {
                // TaskList 顶部的偏移量
                let offset_y = rc_tasklist.top - rc_rebar.top;

                // 计算 TaskList 的新高度
                // 在垂直模式下，传入的 lyric_width 实际上被视为高度
                let mut new_tasklist_h = rebar_h - offset_y - params.lyric_width - GAP;
                if new_tasklist_h < 0 {
                    new_tasklist_h = 0;
                }

                // 挤压 TaskList 的高度
                let _ = MoveWindow(self.h_tasklist, 0, offset_y, rebar_w, new_tasklist_h, true);

                CalculatedBounds {
                    x: 0,
                    y: offset_y + new_tasklist_h + GAP,
                    w: rebar_w,
                    h: params.lyric_width,
                }
            } else {
                // 计算 TaskList 左侧的偏移量
                let offset_x = rc_tasklist.left - rc_rebar.left;

                // 计算 TaskList 的新宽度
                let mut new_tasklist_w = rebar_w - offset_x - params.lyric_width - GAP;
                if new_tasklist_w < 0 {
                    new_tasklist_w = 0;
                }

                // 挤压 TaskList 的宽度
                let _ = MoveWindow(self.h_tasklist, offset_x, 0, new_tasklist_w, rebar_h, true);

                CalculatedBounds {
                    x: offset_x + new_tasklist_w + GAP,
                    y: 0,
                    w: params.lyric_width,
                    h: rebar_h,
                }
            };

            debug!(
                %bounds.x, %bounds.y, %bounds.w, %bounds.h,
                "计算的布局 (win10)",
            );

            Some(TaskbarLayout {
                system_type: "win10".to_string(),
                win10: Some(Win10Layout {
                    lyric_area: Rect {
                        x: bounds.x,
                        y: bounds.y,
                        width: bounds.w,
                        height: bounds.h,
                    },
                }),
                win11: None,
            })
        }
    }

    fn restore(&self) {
        if self.h_rebar.0.is_null() || self.h_tasklist.0.is_null() {
            return;
        }

        unsafe {
            let mut rc_rebar = RECT::default();
            let _ = GetWindowRect(self.h_rebar, &raw mut rc_rebar);

            let mut rc_tasklist = RECT::default();
            let _ = GetWindowRect(self.h_tasklist, &raw mut rc_tasklist);

            let rebar_w = rc_rebar.right - rc_rebar.left;
            let rebar_h = rc_rebar.bottom - rc_rebar.top;
            let is_vertical = rebar_h > rebar_w;

            if is_vertical {
                let offset_y = rc_tasklist.top - rc_rebar.top;
                let original_height = rebar_h - offset_y;
                let _ = MoveWindow(self.h_tasklist, 0, offset_y, rebar_w, original_height, true);
            } else {
                let offset_x = rc_tasklist.left - rc_rebar.left;
                let original_width = rebar_w - offset_x;
                let _ = MoveWindow(self.h_tasklist, offset_x, 0, original_width, rebar_h, true);
            }
        }
    }
}

impl Drop for LegacyStrategy {
    fn drop(&mut self) {
        self.restore();
    }
}
