use std::sync::OnceLock;

use anyhow::Result;
use napi::{
    Status,
    threadsafe_function::{ThreadsafeFunction, UnknownReturnValue},
};

use crate::model::{
    MetadataPayload, PlayModePayload, PlayStatePayload, SystemMediaEvent, TimelinePayload,
};

pub type SystemMediaThreadsafeFunction =
    ThreadsafeFunction<SystemMediaEvent, UnknownReturnValue, SystemMediaEvent, Status, false>;

static CONTROLS: OnceLock<Box<dyn SystemMediaControls>> = OnceLock::new();

/// 跨平台的媒体控制接口
pub trait SystemMediaControls: Send + Sync {
    /// 初始化系统集成
    ///
    /// 建立连接，如连接 D-Bus，初始化 Windows COM 组件等
    fn initialize(&self) -> Result<()>;

    /// 启用系统集成
    ///
    /// 设置 `IsEnabled = true`，让系统开始接收按键事件
    fn enable(&self) -> Result<()>;

    /// 禁用系统集成
    ///
    /// 设置 `IsEnabled = false`，不再处理系统按键，但保持连接
    fn disable(&self) -> Result<()>;

    /// 清理资源并关闭
    fn shutdown(&self) -> Result<()>;

    /// 注册事件回调
    ///
    /// 当用户点击系统的“上一首”、“暂停”按钮时，通过此回调通知 Node.js 层
    fn register_event_handler(&self, callback: SystemMediaThreadsafeFunction) -> Result<()>;

    /// 更新歌曲元数据（标题、歌手、封面等）
    fn update_metadata(&self, payload: MetadataPayload);

    /// 更新播放状态（播放/暂停）
    fn update_playback_status(&self, payload: PlayStatePayload);

    /// 更新播放速率
    fn update_playback_rate(&self, rate: f64);

    /// 更新进度条/时间轴
    ///
    /// `current` 和 `total` 单位均为毫秒。
    fn update_timeline(&self, payload: TimelinePayload);

    /// 更新播放模式（循环/随机）
    fn update_play_mode(&self, payload: PlayModePayload);
}

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "linux")]
pub mod linux;

#[cfg(target_os = "macos")]
mod macos;

pub fn get_platform_controls() -> &'static dyn SystemMediaControls {
    CONTROLS
        .get_or_init(|| {
            #[cfg(target_os = "windows")]
            {
                Box::new(windows::WindowsImpl::new())
            }

            #[cfg(target_os = "linux")]
            {
                Box::new(linux::LinuxImpl::new())
            }

            #[cfg(target_os = "macos")]
            {
                Box::new(macos::MacosImpl::new())
            }

            #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
            {
                Box::new(NoOpControls)
            }
        })
        .as_ref()
}

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
struct NoOpControls;

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
impl SystemMediaControls for NoOpControls {
    fn initialize(&self) -> Result<()> {
        Ok(())
    }
    fn enable(&self) -> Result<()> {
        Ok(())
    }
    fn disable(&self) -> Result<()> {
        Ok(())
    }
    fn shutdown(&self) -> Result<()> {
        Ok(())
    }
    fn register_event_handler(&self, _: SystemMediaThreadsafeFunction) -> Result<()> {
        Ok(())
    }
    fn update_metadata(&self, _: MetadataPayload) {}
    fn update_playback_status(&self, _: PlayStatePayload) {}
    fn update_playback_rate(&self, _: f64) {}
    fn update_timeline(&self, _: TimelinePayload) {}
    fn update_play_mode(&self, _: PlayModePayload) {}
}
