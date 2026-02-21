use std::{
    io::Write,
    process,
    sync::{Arc, RwLock},
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

use anyhow::Result;
use mpris_server::{
    LoopStatus as MprisLoopStatus, Metadata, PlaybackStatus as MprisPlaybackStatus, Player, Time,
    zbus::zvariant::ObjectPath,
};
use napi::threadsafe_function::ThreadsafeFunctionCallMode;
use tempfile::NamedTempFile;
use tokio::{
    runtime::Runtime,
    sync::mpsc::{UnboundedReceiver, UnboundedSender, unbounded_channel},
};
use tracing::{debug, error};

use crate::{
    model::{
        MetadataPayload, PlayModePayload, PlayStatePayload, PlaybackStatus, RepeatMode,
        SystemMediaEvent, SystemMediaEventType, TimelinePayload,
    },
    sys_media::{SystemMediaControls, SystemMediaThreadsafeFunction},
};

/// 主线程和后台 D-Bus 现成通信的指令
pub enum MprisCommand {
    UpdateMetadata(MetadataPayload),
    UpdatePlaybackStatus(PlayStatePayload),
    UpdatePlaybackRate(f64),
    UpdateTimeline(TimelinePayload),
    UpdatePlayMode(PlayModePayload),
    Enable,
    Disable,
    RegisterCallback(SystemMediaThreadsafeFunction),
    Shutdown,
}

pub struct LinuxImpl {
    sender: UnboundedSender<MprisCommand>,
}

impl LinuxImpl {
    pub fn new() -> Self {
        let (tx, rx) = unbounded_channel();

        thread::spawn(move || {
            let rt = match Runtime::new() {
                Ok(r) => r,
                Err(e) => {
                    error!("无法创建 MPRIS Tokio Runtime: {e:?}");
                    return;
                }
            };

            rt.block_on(async move {
                if let Err(e) = run_mpris_loop(rx).await {
                    error!("MPRIS 循环异常退出: {e:?}");
                }
            });
        });

        Self { sender: tx }
    }

    fn send_command(&self, cmd: MprisCommand) {
        if let Err(e) = self.sender.send(cmd) {
            error!("无法发送 MPRIS 指令: {e:?}");
        }
    }
}

fn setup_mpris_signals(
    player: &Player,
    event_handler: Arc<RwLock<Option<SystemMediaThreadsafeFunction>>>,
) {
    let dispatch = move |evt: SystemMediaEvent| {
        if let Ok(guard) = event_handler.read()
            && let Some(tsfn) = guard.as_ref()
        {
            tsfn.call(evt, ThreadsafeFunctionCallMode::NonBlocking);
        }
    };

    // 播放
    let d = dispatch.clone();
    player.connect_play(move |_| {
        debug!("收到 play 命令");
        d(SystemMediaEvent::new(SystemMediaEventType::Play));
    });

    // 暂停
    let d = dispatch.clone();
    player.connect_pause(move |_| {
        debug!("收到 pause 命令");
        d(SystemMediaEvent::new(SystemMediaEventType::Pause));
    });

    // Toggle
    let d = dispatch.clone();
    player.connect_play_pause(move |p| {
        debug!("收到 play_pause 命令");
        let status = p.playback_status();
        let evt_type = if status == MprisPlaybackStatus::Playing {
            SystemMediaEventType::Pause
        } else {
            SystemMediaEventType::Play
        };
        d(SystemMediaEvent::new(evt_type));
    });

    // 上一首
    let d = dispatch.clone();
    player.connect_previous(move |_| {
        debug!("收到 previous 命令");
        d(SystemMediaEvent::new(SystemMediaEventType::PreviousSong));
    });

    // 下一首
    let d = dispatch.clone();
    player.connect_next(move |_| {
        debug!("收到 next 命令");
        d(SystemMediaEvent::new(SystemMediaEventType::NextSong));
    });

    // 停止
    let d = dispatch.clone();
    player.connect_stop(move |_| {
        debug!("收到 stop 命令");
        d(SystemMediaEvent::new(SystemMediaEventType::Stop));
    });

    let d = dispatch.clone();
    player.connect_set_loop_status(move |_, new_status| {
        debug!(?new_status, "收到 set_loop_status 命令");
        d(SystemMediaEvent::new(SystemMediaEventType::ToggleRepeat));
    });

    let d = dispatch.clone();
    player.connect_set_shuffle(move |_, new_val| {
        debug!(?new_val, "收到 set_shuffle 命令");
        d(SystemMediaEvent::new(SystemMediaEventType::ToggleShuffle));
    });

    // 播放速率
    let d = dispatch.clone();
    player.connect_set_rate(move |_, new_rate| {
        debug!(?new_rate, "收到 set_rate 命令");
        d(SystemMediaEvent::set_rate(new_rate));
    });

    // 相对跳转
    // 这里通过 Player 内部维护的进度来计算绝对跳转位置
    let d = dispatch.clone();
    player.connect_seek(move |p, offset| {
        debug!(?offset, "收到 seek 命令");
        let current_micros = p.position().as_micros();
        let delta_micros = offset.as_micros();
        let target_micros = current_micros.saturating_add(delta_micros);
        let final_micros = if target_micros < 0 { 0 } else { target_micros };
        let target_millis = final_micros as f64 / 1000.0;

        d(SystemMediaEvent::seek(target_millis));
    });

    // 绝对跳转
    player.connect_set_position(move |_, trackid, position| {
        debug!(?position, ?trackid, "收到 set_position 命令");
        let ms = position.as_micros() as f64 / 1000.0;
        dispatch(SystemMediaEvent::seek(ms));
    });
}

#[allow(clippy::future_not_send)]
async fn process_metadata_update(
    player: &Player,
    payload: MetadataPayload,
    cover_guard: &mut Option<NamedTempFile>,
) {
    let art_url = if let Some(data) = payload.cover_data {
        match tempfile::Builder::new().suffix(".jpg").tempfile() {
            Ok(mut file) => {
                if file.write_all(&data).is_ok() {
                    let path = file.path().to_string_lossy().to_string();
                    let url = format!("file://{path}");

                    *cover_guard = Some(file);

                    Some(url)
                } else {
                    None
                }
            }
            Err(e) => {
                error!("创建临时封面失败: {e:?}");
                None
            }
        }
    } else if let Some(url) = payload.original_cover_url {
        *cover_guard = None;
        Some(url)
    } else {
        *cover_guard = None;
        None
    };

    let mut mb = Metadata::builder()
        .title(payload.song_name)
        .artist([payload.author_name])
        .album(payload.album_name);

    let track_id_str = payload.ncm_id.map_or_else(
        || {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
                .to_string()
        },
        // 以免上层传入负数的 ncm_id
        |id| id.to_string().replace('-', "_"),
    );

    let track_path = format!("/com/splayer/track/{track_id_str}");

    if let Ok(op) = ObjectPath::try_from(track_path.as_str()) {
        mb = mb.trackid(op);
    } else {
        error!("生成的 Track ID 不符合 D-Bus 路径规范: {track_path}");
    }

    if let Some(dur) = payload.duration {
        mb = mb.length(Time::from_millis(dur as i64));
    }

    if let Some(url) = art_url {
        mb = mb.art_url(url);
    }

    player.set_metadata(mb.build()).await.ok();
    player.set_position(Time::from_millis(0));
}

#[allow(clippy::future_not_send)]
async fn handle_command(
    cmd: MprisCommand,
    player: &Player,
    event_handler: &Arc<RwLock<Option<SystemMediaThreadsafeFunction>>>,
    cover_guard: &mut Option<NamedTempFile>,
) -> bool {
    match cmd {
        MprisCommand::Shutdown => return false,

        MprisCommand::RegisterCallback(cb) => {
            if let Ok(mut guard) = event_handler.write() {
                *guard = Some(cb);
            }
        }

        MprisCommand::UpdateMetadata(payload) => {
            process_metadata_update(player, payload, cover_guard).await;
        }

        MprisCommand::UpdatePlaybackStatus(payload) => {
            let status = match payload.status {
                PlaybackStatus::Playing => MprisPlaybackStatus::Playing,
                PlaybackStatus::Paused => MprisPlaybackStatus::Paused,
            };
            player.set_playback_status(status).await.ok();
        }

        MprisCommand::UpdatePlaybackRate(rate) => {
            player.set_rate(rate).await.ok();
        }

        MprisCommand::UpdateTimeline(payload) => {
            let pos = Time::from_millis(payload.current_time as i64);
            player.set_position(pos);
            // seek 操作时发出 Seeked D-Bus 信号，通知外部客户端立即刷新进度
            if payload.seeked.unwrap_or(false) {
                player.seeked(pos).await.ok();
            }
        }

        MprisCommand::UpdatePlayMode(payload) => {
            let loop_status = match payload.repeat_mode {
                RepeatMode::None => MprisLoopStatus::None,
                RepeatMode::Track => MprisLoopStatus::Track,
                RepeatMode::List => MprisLoopStatus::Playlist,
            };
            player.set_loop_status(loop_status).await.ok();
            player.set_shuffle(payload.is_shuffling).await.ok();
        }

        MprisCommand::Enable => {
            // Linux 上，只要在 D-Bus 上注册了名字就会自动启用，所以这里什么都不做
        }
        MprisCommand::Disable => {
            player
                .set_playback_status(MprisPlaybackStatus::Stopped)
                .await
                .ok();

            player.set_metadata(Metadata::new()).await.ok();
        }
    }
    true
}

#[allow(clippy::future_not_send)]
async fn run_mpris_loop(mut rx: UnboundedReceiver<MprisCommand>) -> Result<()> {
    let event_handler = Arc::new(RwLock::new(None::<SystemMediaThreadsafeFunction>));
    let mut current_cover_file_guard: Option<NamedTempFile> = None;

    let pid = process::id();
    // 使用唯一标识符以避免多个实例冲突
    let identity = format!("splayer.instance{pid}");

    let player = Player::builder(&identity)
        .can_play(true)
        .can_pause(true)
        .can_go_next(true)
        .can_go_previous(true)
        .can_seek(true)
        .can_control(true)
        .minimum_rate(0.2)
        .maximum_rate(2.0)
        .playback_status(MprisPlaybackStatus::Stopped)
        .identity("SPlayer")
        .desktop_entry("SPlayer")
        .build()
        .await
        .map_err(|e| anyhow::anyhow!("MPRIS Player 初始化失败: {e}"))?;

    setup_mpris_signals(&player, event_handler.clone());

    let server_task = player.run();
    tokio::pin!(server_task);

    loop {
        tokio::select! {
            () = &mut server_task => {
                error!("MPRIS D-Bus 连接意外断开");
                break;
            }

            // 来自 lib.rs 的指令
            cmd_opt = rx.recv() => {
                let Some(cmd) = cmd_opt else { break };

                let should_continue = handle_command(
                    cmd,
                    &player,
                    &event_handler,
                    &mut current_cover_file_guard
                ).await;

                if !should_continue {
                    break;
                }
            }
        }
    }

    Ok(())
}

impl SystemMediaControls for LinuxImpl {
    fn initialize(&self) -> Result<()> {
        // Linux 上不用初始化
        Ok(())
    }

    fn enable(&self) -> Result<()> {
        self.send_command(MprisCommand::Enable);
        Ok(())
    }

    fn disable(&self) -> Result<()> {
        self.send_command(MprisCommand::Disable);
        Ok(())
    }

    fn shutdown(&self) -> Result<()> {
        self.send_command(MprisCommand::Shutdown);
        Ok(())
    }

    fn register_event_handler(&self, callback: SystemMediaThreadsafeFunction) -> Result<()> {
        self.send_command(MprisCommand::RegisterCallback(callback));
        Ok(())
    }

    fn update_metadata(&self, payload: MetadataPayload) {
        self.send_command(MprisCommand::UpdateMetadata(payload));
    }

    fn update_playback_status(&self, payload: PlayStatePayload) {
        self.send_command(MprisCommand::UpdatePlaybackStatus(payload));
    }

    fn update_playback_rate(&self, rate: f64) {
        self.send_command(MprisCommand::UpdatePlaybackRate(rate));
    }

    fn update_timeline(&self, payload: TimelinePayload) {
        self.send_command(MprisCommand::UpdateTimeline(payload));
    }

    fn update_play_mode(&self, payload: PlayModePayload) {
        self.send_command(MprisCommand::UpdatePlayMode(payload));
    }
}
