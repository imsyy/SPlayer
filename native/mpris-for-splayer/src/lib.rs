use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode, UnknownReturnValue};
use napi::Status;
use napi_derive::napi;
use std::sync::{Arc, Mutex};
use mpris_server::{
    LoopStatus, Metadata, PlaybackStatus, PlayerInterface, Property, RootInterface, Server, Signal,
    Time, TrackId, zbus,
};

/// MPRIS 事件结构体
#[napi(object)]
#[derive(Clone)]
pub struct MprisEvent {
    /// 事件类型: "play", "pause", "next", "previous", "seek", "set_position" 等
    pub event_type: String,
    /// 可选的数值参数，例如 seek 时的偏移量（毫秒）
    pub value: Option<f64>,
}

/// 音轨信息结构体
/// 从 JS 传入，用于更新 MPRIS 元数据（在系统通知栏/媒体控制面板显示）
#[napi(object)]
pub struct TrackInfo {
    /// 歌曲标题
    pub title: Option<String>,
    /// 艺术家名称
    pub artist: Option<String>,
    /// 专辑名称
    pub album: Option<String>,
    /// 歌曲长度（毫秒），从 JS 传入
    pub length: Option<i64>,
    /// 封面图片 URL
    pub url: Option<String>,
}

/// SPlayer 播放器后端实现
/// 维护播放器状态并处理 MPRIS 接口调用
#[derive(Clone)]
struct SPlayerBackend {
    /// 当前音轨元数据（标题、艺术家、专辑、时长等）
    metadata: Arc<Mutex<Metadata>>,
    /// 播放状态：Playing / Paused / Stopped
    playback_status: Arc<Mutex<PlaybackStatus>>,
    /// 当前播放位置（微秒）
    position: Arc<Mutex<Time>>,
    /// 循环模式：None / Track / Playlist
    loop_status: Arc<Mutex<LoopStatus>>,
    /// 音量 (0.0 ~ 1.0)
    volume: Arc<Mutex<f64>>,
    /// 播放速率（通常为 1.0）
    rate: Arc<Mutex<f64>>,
    /// 是否随机播放
    shuffle: Arc<Mutex<bool>>,
    /// seek 操作锁，防止并发 seek 导致状态混乱
    seek_lock: Arc<Mutex<()>>,
    /// 事件回调函数，用于将系统控制事件传递给 JS 层
    event_callback: Arc<Mutex<Option<ThreadsafeFunction<MprisEvent, UnknownReturnValue, MprisEvent, Status, false>>>>,
}

impl SPlayerBackend {
    /// 创建新的播放器后端实例
    fn new() -> Self {
        // 初始化 Metadata，确保包含 trackid（MPRIS 规范要求）
        let mut meta = Metadata::new();
        let tid = TrackId::try_from("/org/splayer/CurrentTrack").unwrap_or(TrackId::NO_TRACK);
        meta.set_trackid(Some(tid));

        Self {
            metadata: Arc::new(Mutex::new(meta)),
            playback_status: Arc::new(Mutex::new(PlaybackStatus::Stopped)),
            position: Arc::new(Mutex::new(Time::from_micros(0))),
            loop_status: Arc::new(Mutex::new(LoopStatus::None)),
            volume: Arc::new(Mutex::new(1.0)),
            rate: Arc::new(Mutex::new(1.0)),
            shuffle: Arc::new(Mutex::new(false)),
            seek_lock: Arc::new(Mutex::new(())),
            event_callback: Arc::new(Mutex::new(None)),
        }
    }

    /// 触发事件回调，将系统控制事件发送到 JS 层
    /// 
    /// # 参数
    /// * `event_type` - 事件类型字符串
    /// * `value` - 可选的数值参数（如 seek 偏移量）
    fn emit_event(&self, event_type: &str, value: Option<f64>) {
        if let Some(callback) = self.event_callback.lock().unwrap().as_ref() {
            let event = MprisEvent {
                event_type: event_type.to_string(),
                value,
            };
            let status = callback.call(event, ThreadsafeFunctionCallMode::NonBlocking);
            if status != napi::Status::Ok {
                eprintln!("[MPRIS] 调用 JS 回调失败, status: {:?}", status);
            }
        }
    }
}

/// 实现 MPRIS RootInterface
/// 处理应用程序级别的 MPRIS 方法（如 Raise, Quit, Identity 等）
impl RootInterface for SPlayerBackend {
    /// 将应用窗口提升到前台（未实现具体逻辑）
    async fn raise(&self) -> zbus::fdo::Result<()> {
        Ok(())
    }

    /// 退出应用（未实现）
    async fn quit(&self) -> zbus::fdo::Result<()> {
        Ok(())
    }

    /// 是否支持退出命令
    async fn can_quit(&self) -> zbus::fdo::Result<bool> {
        Ok(false)
    }

    /// 是否处于全屏模式
    async fn fullscreen(&self) -> zbus::fdo::Result<bool> {
        Ok(false)
    }

    /// 设置全屏模式（未实现）
    async fn set_fullscreen(&self, _fullscreen: bool) -> zbus::Result<()> {
        Ok(())
    }

    /// 是否支持设置全屏
    async fn can_set_fullscreen(&self) -> zbus::fdo::Result<bool> {
        Ok(false)
    }

    /// 是否支持提升窗口
    async fn can_raise(&self) -> zbus::fdo::Result<bool> {
        Ok(true)
    }

    /// 是否支持播放列表接口
    async fn has_track_list(&self) -> zbus::fdo::Result<bool> {
        Ok(false)
    }

    /// 应用程序名称标识
    async fn identity(&self) -> zbus::fdo::Result<String> {
        Ok("SPlayer".to_string())
    }

    /// Desktop Entry 文件名（用于关联应用图标和元数据）
    async fn desktop_entry(&self) -> zbus::fdo::Result<String> {
        Ok("splayer".to_string())
    }

    /// 支持的 URI 协议（file、http、https）
    async fn supported_uri_schemes(&self) -> zbus::fdo::Result<Vec<String>> {
        Ok(vec!["file".into(), "http".into(), "https".into()])
    }

    /// 支持的音频 MIME 类型
    async fn supported_mime_types(&self) -> zbus::fdo::Result<Vec<String>> {
        Ok(vec![
            "audio/mpeg".into(),
            "audio/aac".into(),
            "audio/ogg".into(),
            "audio/flac".into(),
            "audio/wav".into(),
        ])
    }
}

/// 实现 MPRIS PlayerInterface
/// 处理播放控制相关的 MPRIS 方法（播放、暂停、上/下一曲、seek 等）
impl PlayerInterface for SPlayerBackend {
    /// 下一曲
    async fn next(&self) -> zbus::fdo::Result<()> {
        self.emit_event("next", None);
        Ok(())
    }

    /// 上一曲
    async fn previous(&self) -> zbus::fdo::Result<()> {
        self.emit_event("previous", None);
        Ok(())
    }

    /// 暂停播放
    async fn pause(&self) -> zbus::fdo::Result<()> {
        self.emit_event("pause", None);
        Ok(())
    }

    /// 切换播放/暂停状态
    async fn play_pause(&self) -> zbus::fdo::Result<()> {
        self.emit_event("play_pause", None);
        Ok(())
    }

    /// 停止播放
    async fn stop(&self) -> zbus::fdo::Result<()> {
        self.emit_event("stop", None);
        Ok(())
    }

    /// 开始播放
    async fn play(&self) -> zbus::fdo::Result<()> {
        self.emit_event("play", None);
        Ok(())
    }

    /// 相对 seek（快进/快退）
    /// offset 为微秒，转换为毫秒传递给 JS
    async fn seek(&self, offset: Time) -> zbus::fdo::Result<()> {
        let _lock = self.seek_lock.lock().unwrap();
        self.emit_event("seek", Some(offset.as_micros() as f64 / 1000.0));
        Ok(())
    }

    /// 绝对位置设置
    /// position 为微秒，转换为毫秒传递给 JS
    async fn set_position(&self, _track_id: TrackId, position: Time) -> zbus::fdo::Result<()> {
        let _lock = self.seek_lock.lock().unwrap();
        *self.position.lock().unwrap() = position;
        self.emit_event("set_position", Some(position.as_micros() as f64 / 1000.0));
        Ok(())
    }

    /// 打开 URI（未实现）
    async fn open_uri(&self, _uri: String) -> zbus::fdo::Result<()> { Ok(()) }

    /// 获取当前播放状态
    async fn playback_status(&self) -> zbus::fdo::Result<PlaybackStatus> {
        Ok(*self.playback_status.lock().unwrap())
    }

    /// 获取音量
    async fn volume(&self) -> zbus::fdo::Result<f64> { Ok(*self.volume.lock().unwrap()) }

    /// 设置音量
    async fn set_volume(&self, volume: f64) -> zbus::Result<()> { *self.volume.lock().unwrap() = volume; Ok(()) }

    /// 获取元数据
    async fn metadata(&self) -> zbus::fdo::Result<Metadata> { Ok(self.metadata.lock().unwrap().clone()) }

    /// 获取当前播放位置
    async fn position(&self) -> zbus::fdo::Result<Time> { Ok(*self.position.lock().unwrap()) }

    /// 获取播放速率
    async fn rate(&self) -> zbus::fdo::Result<f64> { Ok(*self.rate.lock().unwrap()) }

    /// 设置播放速率
    async fn set_rate(&self, rate: f64) -> zbus::Result<()> { *self.rate.lock().unwrap() = rate; Ok(()) }

    /// 最小播放速率
    async fn minimum_rate(&self) -> zbus::fdo::Result<f64> { Ok(1.0) }

    /// 最大播放速率
    async fn maximum_rate(&self) -> zbus::fdo::Result<f64> { Ok(1.0) }

    /// 是否可以下一曲
    async fn can_go_next(&self) -> zbus::fdo::Result<bool> { Ok(true) }

    /// 是否可以上一曲
    async fn can_go_previous(&self) -> zbus::fdo::Result<bool> { Ok(true) }

    /// 是否可以播放
    async fn can_play(&self) -> zbus::fdo::Result<bool> { Ok(true) }

    /// 是否可以暂停
    async fn can_pause(&self) -> zbus::fdo::Result<bool> { Ok(true) }

    /// 是否可以 seek
    async fn can_seek(&self) -> zbus::fdo::Result<bool> { Ok(true) }

    /// 是否可以控制
    async fn can_control(&self) -> zbus::fdo::Result<bool> { Ok(true) }

    /// 循环状态
    async fn loop_status(&self) -> zbus::fdo::Result<LoopStatus> {
        Ok(*self.loop_status.lock().unwrap())
    }

    /// 设置循环状态
    async fn set_loop_status(&self, loop_status: LoopStatus) -> zbus::Result<()> {
        *self.loop_status.lock().unwrap() = loop_status;
        self.emit_event("loop_status_changed", None);
        Ok(())
    }

    /// 随机播放状态
    async fn shuffle(&self) -> zbus::fdo::Result<bool> {
        Ok(*self.shuffle.lock().unwrap())
    }

    /// 设置随机播放
    async fn set_shuffle(&self, shuffle: bool) -> zbus::Result<()> {
        *self.shuffle.lock().unwrap() = shuffle;
        self.emit_event("shuffle_changed", Some(if shuffle { 1.0 } else { 0.0 }));
        Ok(())
    }
}

/// SPlayer MPRIS 主类
/// 暴露给 Node.js 的接口，用于管理 MPRIS 服务器和播放器状态
#[napi]
pub struct SPlayerMpris {
    /// 播放器后端实例
    backend: SPlayerBackend,
    /// MPRIS 服务器实例
    server: Arc<Server<SPlayerBackend>>,
    /// Tokio 异步运行时（处理 D-Bus 通信）
    rt: Arc<tokio::runtime::Runtime>,
}

#[napi]
impl SPlayerMpris {
    /// 构造函数：创建 MPRIS 服务器并在 D-Bus 上注册
    #[napi(constructor)]
    pub fn new() -> Result<Self> {
        let backend = SPlayerBackend::new();
        let rt = tokio::runtime::Runtime::new().map_err(|e| Error::from_reason(e.to_string()))?;

        // 在 D-Bus 上注册名为 "SPlayer" 的 MPRIS 服务
        let server = rt
            .block_on(async { Server::new("SPlayer", backend.clone()).await })
            .map_err(|e| Error::from_reason(e.to_string()))?;

        Ok(Self {
            backend,
            server: Arc::new(server),
            rt: Arc::new(rt),
        })
    }

    /// 注册事件处理回调函数
    /// 当系统通过 MPRIS 控制播放器时，会调用此回调
    /// 
    /// # TypeScript 签名
    /// ```typescript
    /// registerEventHandler(callback: (event: MprisEvent) => void): void
    /// ```
    #[napi(ts_args_type = "callback: (event: MprisEvent) => void")]
    pub fn register_event_handler(
        &self,
        callback: Function<Unknown<'static>, UnknownReturnValue>,
    ) -> Result<()> {
        let tsfn = callback
            .build_threadsafe_function::<MprisEvent>()
            .build_callback(|ctx| Ok(ctx.value))?;

        *self.backend.event_callback.lock().unwrap() = Some(tsfn);
        Ok(())
    }

    /// 设置播放状态
    /// 更新内部状态并通过 D-Bus 通知系统（会更新系统媒体控制面板）
    /// 
    /// # 参数
    /// * `status` - "Playing" / "Paused" / "Stopped"
    #[napi]
    pub fn set_playback_status(&self, status: String) -> Result<()> {
        let new_status = match status.as_str() {
            "Playing" => PlaybackStatus::Playing,
            "Paused" => PlaybackStatus::Paused,
            _ => PlaybackStatus::Stopped,
        };
        *self.backend.playback_status.lock().unwrap() = new_status;
        {
            let server = self.server.clone();
            let handle = self.rt.handle().clone();
            // 异步发送 D-Bus 属性变化通知
            handle.spawn(async move {
                let _ = server
                    .properties_changed([Property::PlaybackStatus(new_status)])
                    .await;
            });
        }
        Ok(())
    }

    /// 设置音轨元数据
    /// 更新歌曲信息（标题、艺术家、专辑、时长、封面）并通知系统
    /// 
    /// # 参数
    /// * `info` - 包含音轨信息的结构体
    #[napi]
    pub fn set_metadata(&self, info: TrackInfo) -> Result<()> {
        let mut meta = Metadata::new();
        let tid = TrackId::try_from("/org/splayer/CurrentTrack").unwrap_or(TrackId::NO_TRACK);
        meta.set_trackid(Some(tid));

        if let Some(title) = info.title { meta.set_title(Some(title)); }
        if let Some(artist) = info.artist { meta.set_artist(Some(vec![artist])); }
        if let Some(album) = info.album { meta.set_album(Some(album)); }
        if let Some(length) = info.length { meta.set_length(Some(Time::from_millis(length))); }
        if let Some(url) = info.url { meta.set_art_url(Some(url)); }

        *self.backend.metadata.lock().unwrap() = meta.clone();
        {
            let server = self.server.clone();
            let handle = self.rt.handle().clone();
            handle.spawn(async move {
                let _ = server.properties_changed([Property::Metadata(meta)]).await;
            });
        }
        Ok(())
    }

    /// 设置播放位置
    /// 更新当前播放位置并发送 Seeked 信号
    /// 
    /// # 参数
    /// * `pos` - 位置（微秒）
    #[napi]
    pub fn set_position(&self, pos: i64) -> Result<()> {
        let _lock = self.backend.seek_lock.lock().unwrap();
        *self.backend.position.lock().unwrap() = Time::from_micros(pos);
        // 使用 Seeked 信号通知位置变化
        {
            let server = self.server.clone();
            let handle = self.rt.handle().clone();
            let position = Time::from_micros(pos);
            handle.spawn(async move {
                let _ = server.emit(Signal::Seeked { position }).await;
            });
        }
        Ok(())
    }

    /// 设置音量
    /// 
    /// # 参数
    /// * `volume` - 音量值 (0.0 ~ 1.0)
    #[napi]
    pub fn set_volume(&self, volume: f64) -> Result<()> {
        *self.backend.volume.lock().unwrap() = volume;
        {
            let server = self.server.clone();
            let handle = self.rt.handle().clone();
            handle.spawn(async move {
                let _ = server.properties_changed([Property::Volume(volume)]).await;
            });
        }
        Ok(())
    }

    /// 获取循环模式
    #[napi]
    pub fn get_loop_status(&self) -> String {
        match *self.backend.loop_status.lock().unwrap() {
            LoopStatus::None => "None".to_string(),
            LoopStatus::Track => "Track".to_string(),
            LoopStatus::Playlist => "Playlist".to_string(),
        }
    }

    /// 设置循环模式
    /// 
    /// # 参数
    /// * `status` - "Track" (单曲循环) / "Playlist" (列表循环) / "None" (不循环)
    #[napi]
    pub fn set_loop_status(&self, status: String) -> Result<()> {
        let new_status = match status.as_str() {
            "Track" => LoopStatus::Track,
            "Playlist" => LoopStatus::Playlist,
            _ => LoopStatus::None,
        };
        *self.backend.loop_status.lock().unwrap() = new_status;
        {
            let server = self.server.clone();
            let handle = self.rt.handle().clone();
            handle.spawn(async move {
                let _ = server.properties_changed([Property::LoopStatus(new_status)]).await;
            });
        }
        Ok(())
    }

    /// 获取随机播放状态
    #[napi]
    pub fn get_shuffle(&self) -> bool {
        *self.backend.shuffle.lock().unwrap()
    }

    /// 设置随机播放
    /// 
    /// # 参数
    /// * `shuffle` - 是否启用随机播放
    #[napi]
    pub fn set_shuffle(&self, shuffle: bool) -> Result<()> {
        *self.backend.shuffle.lock().unwrap() = shuffle;
        {
            let server = self.server.clone();
            let handle = self.rt.handle().clone();
            handle.spawn(async move {
                let _ = server.properties_changed([Property::Shuffle(shuffle)]).await;
            });
        }
        Ok(())
    }

    /// 设置播放进度
    /// 同时更新位置和时长信息
    /// 
    /// # 参数
    /// * `pos` - 当前位置（微秒）
    /// * `length` - 总时长（微秒），大于 0 时会更新元数据中的时长
    #[napi]
    pub fn set_progress(&self, pos: i64, length: i64) -> Result<()> {
        *self.backend.position.lock().unwrap() = Time::from_micros(pos);

        // 可选：更新音轨总时长
        if length > 0 {
            let mut meta = self.backend.metadata.lock().unwrap().clone();
            meta.set_length(Some(Time::from_micros(length)));
            *self.backend.metadata.lock().unwrap() = meta.clone();
            {
                let server = self.server.clone();
                let handle = self.rt.handle().clone();
                handle.spawn(async move {
                    let _ = server.properties_changed([Property::Metadata(meta)]).await;
                });
            }
        }

        // 发送位置变化信号
        {
            let server = self.server.clone();
            let handle = self.rt.handle().clone();
            let position = Time::from_micros(pos);
            handle.spawn(async move {
                let _ = server.emit(Signal::Seeked { position }).await;
            });
        }

        Ok(())
    }
}

