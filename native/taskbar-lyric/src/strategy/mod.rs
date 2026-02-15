use napi_derive::napi;
use windows::Win32::Foundation::HWND;

mod win10;
mod win11;

pub use win10::LegacyStrategy;
pub use win11::Win11Strategy;

#[derive(Debug, Clone, Copy)]
/// 布局计算的输入参数
pub struct LayoutParams {
    pub lyric_width: i32,
}

/// 布局计算的输出结果
///
/// 作用是将底层计算好的物理坐标和系统状态传递给 Electron ，以便正确地移动和渲染窗口
#[napi(object)]
#[derive(Debug, Clone, Copy, Default)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl Rect {
    pub fn union(&mut self, other: &Self) {
        if self.width == 0 && self.height == 0 {
            *self = *other;
            return;
        }
        if other.width == 0 && other.height == 0 {
            return;
        }

        let my_right = self.x + self.width;
        let my_bottom = self.y + self.height;
        let other_right = other.x + other.width;
        let other_bottom = other.y + other.height;

        let new_left = self.x.min(other.x);
        let new_top = self.y.min(other.y);
        let new_right = my_right.max(other_right);
        let new_bottom = my_bottom.max(other_bottom);

        self.x = new_left;
        self.y = new_top;
        self.width = new_right - new_left;
        self.height = new_bottom - new_top;
    }
}

#[napi(object)]
#[derive(Debug, Clone, Copy)]
pub struct Win10Layout {
    /// 挤压操作后，确切的歌词窗口位置
    pub lyric_area: Rect,
}

#[napi(object)]
#[derive(Debug, Clone, Copy)]
pub struct Win11Layout {
    /// 开始按钮的物理位置
    pub start_button: Rect,

    /// 小组件按钮的物理位置
    ///
    /// 可能为0，如果没有开启小组件的话
    pub widgets: Rect,

    /// 任务栏内容区的总包围盒
    ///
    /// 包括App图标、搜索框等
    pub content: Rect,

    /// 系统托盘区的物理位置
    pub tray: Rect,

    /// 任务栏是否居中
    pub is_centered: bool,
}

#[napi(object)]
pub struct TaskbarLayout {
    pub system_type: String,
    pub win10: Option<Win10Layout>,
    pub win11: Option<Win11Layout>,
}

pub trait TaskbarStrategy {
    fn init(&mut self) -> bool;
    fn embed_window(&self, child_hwnd: HWND) -> bool;
    fn update_layout(&mut self, params: LayoutParams) -> Option<TaskbarLayout>;
    fn restore(&self);
}
