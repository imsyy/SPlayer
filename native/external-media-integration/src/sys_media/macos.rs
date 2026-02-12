use std::{
    ptr::NonNull,
    sync::{Arc, Mutex},
};

use anyhow::Result;
use block2::RcBlock;
use objc2::{
    AnyThread, Message,
    rc::Retained,
    runtime::{AnyObject, ProtocolObject},
};
use objc2_app_kit::NSImage;
use objc2_foundation::{NSArray, NSData, NSMutableDictionary, NSNumber, NSSize, NSString};
use objc2_media_player::{
    MPChangePlaybackPositionCommandEvent, MPChangePlaybackRateCommandEvent,
    MPChangeRepeatModeCommandEvent, MPChangeShuffleModeCommandEvent, MPMediaItemArtwork,
    MPMediaItemPropertyAlbumTitle, MPMediaItemPropertyArtist, MPMediaItemPropertyArtwork,
    MPMediaItemPropertyPersistentID, MPMediaItemPropertyPlaybackDuration, MPMediaItemPropertyTitle,
    MPNowPlayingInfoCenter, MPNowPlayingInfoPropertyElapsedPlaybackTime,
    MPNowPlayingInfoPropertyPlaybackRate, MPNowPlayingPlaybackState, MPRemoteCommand,
    MPRemoteCommandCenter, MPRemoteCommandEvent, MPRemoteCommandHandlerStatus, MPRepeatType,
    MPShuffleType,
};
use tracing::{debug, error, trace};

use crate::{
    model::{
        MetadataPayload, PlayModePayload, PlayStatePayload, PlaybackStatus, SystemMediaEvent,
        SystemMediaEventType, TimelinePayload,
    },
    sys_media::{SystemMediaControls, SystemMediaThreadsafeFunction},
};

pub struct MacosImpl {
    np_info_ctr: Retained<MPNowPlayingInfoCenter>,
    cmd_ctr: Retained<MPRemoteCommandCenter>,
    info: Mutex<Retained<NSMutableDictionary<NSString, AnyObject>>>,
    event_handler: Arc<Mutex<Option<SystemMediaThreadsafeFunction>>>,
    target_tokens: Mutex<Vec<(Retained<MPRemoteCommand>, Retained<AnyObject>)>>,
}

#[allow(clippy::non_send_fields_in_send_ty)]
unsafe impl Send for MacosImpl {}
unsafe impl Sync for MacosImpl {}

impl MacosImpl {
    pub fn new() -> Self {
        unsafe {
            let np_info_ctr = MPNowPlayingInfoCenter::defaultCenter();
            let cmd_ctr = MPRemoteCommandCenter::sharedCommandCenter();
            let info = NSMutableDictionary::new();

            Self {
                np_info_ctr,
                cmd_ctr,
                info: Mutex::new(info),
                event_handler: Arc::new(Mutex::new(None)),
                target_tokens: Mutex::new(Vec::new()),
            }
        }
    }

    fn store_token(&self, command: &MPRemoteCommand, token: Retained<AnyObject>) {
        if let Ok(mut tokens) = self.target_tokens.lock() {
            tokens.push((command.retain(), token));
        } else {
            error!("无法锁定 target_tokens，token 可能泄漏");
        }
    }

    fn add_command_handler(&self, command: &MPRemoteCommand, event_type: SystemMediaEventType) {
        let handler_arc = self.event_handler.clone();

        let block = RcBlock::new(
            move |_: NonNull<MPRemoteCommandEvent>| -> MPRemoteCommandHandlerStatus {
                if let Ok(guard) = handler_arc.lock()
                    && let Some(tsfn) = guard.as_ref()
                {
                    debug!(?event_type, "MPRemoteCommand 触发");
                    let evt = SystemMediaEvent::new(event_type);
                    tsfn.call(
                        evt,
                        napi::threadsafe_function::ThreadsafeFunctionCallMode::NonBlocking,
                    );
                }
                MPRemoteCommandHandlerStatus::Success
            },
        );

        unsafe {
            command.setEnabled(true);
            let token = command.addTargetWithHandler(&block);
            self.store_token(command, token);
        }
    }

    fn add_toggle_handler(&self) {
        let command = unsafe { self.cmd_ctr.togglePlayPauseCommand() };
        let handler_arc = self.event_handler.clone();
        let info_ctr = self.np_info_ctr.clone();

        let block = RcBlock::new(move |_| -> MPRemoteCommandHandlerStatus {
            let current_state = unsafe { info_ctr.playbackState() };

            let event_type = if current_state == MPNowPlayingPlaybackState::Playing {
                SystemMediaEventType::Pause
            } else {
                SystemMediaEventType::Play
            };

            if let Ok(guard) = handler_arc.lock()
                && let Some(tsfn) = guard.as_ref()
            {
                debug!(?event_type, "MPRemoteCommand Toggle 触发");
                let evt = SystemMediaEvent::new(event_type);
                tsfn.call(
                    evt,
                    napi::threadsafe_function::ThreadsafeFunctionCallMode::NonBlocking,
                );
            }
            MPRemoteCommandHandlerStatus::Success
        });

        unsafe {
            command.setEnabled(true);
            let token = command.addTargetWithHandler(&block);
            self.store_token(&command, token);
        }
    }

    fn add_seek_handler(&self) {
        let command = unsafe { self.cmd_ctr.changePlaybackPositionCommand() };
        let handler_arc = self.event_handler.clone();

        let block = RcBlock::new(
            move |event: NonNull<MPRemoteCommandEvent>| -> MPRemoteCommandHandlerStatus {
                let seek_evt_opt = unsafe { Retained::retain(event.as_ptr()) }
                    .and_then(|evt| evt.downcast::<MPChangePlaybackPositionCommandEvent>().ok());

                if let Some(seek_evt) = seek_evt_opt {
                    let position_seconds = unsafe { seek_evt.positionTime() };
                    let position_ms = position_seconds * 1000.0;

                    debug!(position_ms, "MPChangePlaybackPositionCommand 触发");

                    if let Ok(guard) = handler_arc.lock()
                        && let Some(tsfn) = guard.as_ref()
                    {
                        let evt = SystemMediaEvent::seek(position_ms);
                        tsfn.call(
                            evt,
                            napi::threadsafe_function::ThreadsafeFunctionCallMode::NonBlocking,
                        );
                    }
                }

                MPRemoteCommandHandlerStatus::Success
            },
        );

        unsafe {
            command.setEnabled(true);
            let token = command.addTargetWithHandler(&block);
            self.store_token(&command, token);
        }
    }

    fn add_change_playback_rate_handler(&self) {
        let command = unsafe { self.cmd_ctr.changePlaybackRateCommand() };
        let handler_arc = self.event_handler.clone();

        let block = RcBlock::new(
            move |event: NonNull<MPRemoteCommandEvent>| -> MPRemoteCommandHandlerStatus {
                let rate_evt_opt = unsafe { Retained::retain(event.as_ptr()) }
                    .and_then(|evt| evt.downcast::<MPChangePlaybackRateCommandEvent>().ok());

                if let Some(rate_evt) = rate_evt_opt {
                    let rate = unsafe { rate_evt.playbackRate() };
                    debug!(rate, "MPChangePlaybackRateCommand 触发");

                    if let Ok(guard) = handler_arc.lock()
                        && let Some(tsfn) = guard.as_ref()
                    {
                        let evt = SystemMediaEvent::set_rate(f64::from(rate));
                        tsfn.call(
                            evt,
                            napi::threadsafe_function::ThreadsafeFunctionCallMode::NonBlocking,
                        );
                    }
                }

                MPRemoteCommandHandlerStatus::Success
            },
        );

        unsafe {
            command.setEnabled(true);
            // 这里可以设置 supportedPlaybackRates，但如果不设置，系统可能会提供默认选项或允许任意值
            let rates = NSArray::from_retained_slice(&[
                NSNumber::new_f64(0.25),
                NSNumber::new_f64(0.5),
                NSNumber::new_f64(0.75),
                NSNumber::new_f64(1.0),
                NSNumber::new_f64(1.25),
                NSNumber::new_f64(1.5),
                NSNumber::new_f64(1.75),
                NSNumber::new_f64(2.0),
            ]);
            command.setSupportedPlaybackRates(&rates);

            let token = command.addTargetWithHandler(&block);
            self.store_token(&command, token);
        }
    }

    fn add_shuffle_handler(&self) {
        let command = unsafe { self.cmd_ctr.changeShuffleModeCommand() };
        let handler_arc = self.event_handler.clone();

        let block = RcBlock::new(
            move |event: NonNull<MPRemoteCommandEvent>| -> MPRemoteCommandHandlerStatus {
                let raw_evt = unsafe { Retained::retain(event.as_ptr()) };

                if raw_evt
                    .and_then(|e| e.downcast::<MPChangeShuffleModeCommandEvent>().ok())
                    .is_some()
                    && let Ok(guard) = handler_arc.lock()
                    && let Some(tsfn) = guard.as_ref()
                {
                    debug!("MPChangeShuffleModeCommand 触发");
                    tsfn.call(
                        SystemMediaEvent::new(SystemMediaEventType::ToggleShuffle),
                        napi::threadsafe_function::ThreadsafeFunctionCallMode::NonBlocking,
                    );
                }
                MPRemoteCommandHandlerStatus::Success
            },
        );

        unsafe {
            command.setEnabled(true);
            let token = command.addTargetWithHandler(&block);
            self.store_token(&command, token);
        }
    }

    fn add_repeat_handler(&self) {
        let command = unsafe { self.cmd_ctr.changeRepeatModeCommand() };
        let handler_arc = self.event_handler.clone();

        let block = RcBlock::new(
            move |event: NonNull<MPRemoteCommandEvent>| -> MPRemoteCommandHandlerStatus {
                let raw_evt = unsafe { Retained::retain(event.as_ptr()) };

                if raw_evt
                    .and_then(|e| e.downcast::<MPChangeRepeatModeCommandEvent>().ok())
                    .is_some()
                    && let Ok(guard) = handler_arc.lock()
                    && let Some(tsfn) = guard.as_ref()
                {
                    debug!("MPChangeRepeatModeCommand 触发");
                    tsfn.call(
                        SystemMediaEvent::new(SystemMediaEventType::ToggleRepeat),
                        napi::threadsafe_function::ThreadsafeFunctionCallMode::NonBlocking,
                    );
                }
                MPRemoteCommandHandlerStatus::Success
            },
        );

        unsafe {
            command.setEnabled(true);
            let token = command.addTargetWithHandler(&block);
            self.store_token(&command, token);
        }
    }

    fn set_commands_enabled(&self, enabled: bool) {
        unsafe {
            self.cmd_ctr.playCommand().setEnabled(enabled);
            self.cmd_ctr.pauseCommand().setEnabled(enabled);
            self.cmd_ctr.togglePlayPauseCommand().setEnabled(enabled);
            self.cmd_ctr.nextTrackCommand().setEnabled(enabled);
            self.cmd_ctr.previousTrackCommand().setEnabled(enabled);
            self.cmd_ctr.stopCommand().setEnabled(enabled);
            self.cmd_ctr
                .changePlaybackPositionCommand()
                .setEnabled(enabled);
            self.cmd_ctr.changePlaybackRateCommand().setEnabled(enabled);
            self.cmd_ctr.changeShuffleModeCommand().setEnabled(enabled);
            self.cmd_ctr.changeRepeatModeCommand().setEnabled(enabled);
        }
    }

    fn setup_event_listeners(&self) {
        unsafe {
            // 播放
            self.add_command_handler(&self.cmd_ctr.playCommand(), SystemMediaEventType::Play);

            // 暂停
            self.add_command_handler(&self.cmd_ctr.pauseCommand(), SystemMediaEventType::Pause);

            // 播放暂停
            self.add_toggle_handler();

            // 上一首
            self.add_command_handler(
                &self.cmd_ctr.previousTrackCommand(),
                SystemMediaEventType::PreviousSong,
            );

            // 下一首
            self.add_command_handler(
                &self.cmd_ctr.nextTrackCommand(),
                SystemMediaEventType::NextSong,
            );

            // 停止
            self.add_command_handler(&self.cmd_ctr.stopCommand(), SystemMediaEventType::Stop);
        }

        // Seek
        self.add_seek_handler();

        // 速率
        self.add_change_playback_rate_handler();

        // 随机和循环
        self.add_shuffle_handler();
        self.add_repeat_handler();
    }
}

impl Drop for MacosImpl {
    fn drop(&mut self) {
        let _ = self.shutdown();
    }
}

impl SystemMediaControls for MacosImpl {
    fn initialize(&self) -> Result<()> {
        // macOS 上不用初始化
        Ok(())
    }

    fn enable(&self) -> Result<()> {
        self.set_commands_enabled(true);
        Ok(())
    }

    fn disable(&self) -> Result<()> {
        self.set_commands_enabled(false);
        Ok(())
    }

    fn shutdown(&self) -> Result<()> {
        self.set_commands_enabled(false);

        if let Ok(mut tokens) = self.target_tokens.lock() {
            for (command, token) in tokens.drain(..) {
                unsafe {
                    command.removeTarget(Some(&token));
                }
            }
        } else {
            error!("关闭时无法锁定 target_tokens，handler 可能泄漏");
        }

        unsafe {
            self.np_info_ctr.setNowPlayingInfo(None);
        }

        trace!("销毁了 MacosImpl");
        Ok(())
    }

    fn register_event_handler(&self, callback: SystemMediaThreadsafeFunction) -> Result<()> {
        {
            let mut guard = self
                .event_handler
                .lock()
                .map_err(|e| anyhow::anyhow!("注册事件回调时锁中毒: {e:?}"))?;
            *guard = Some(callback);
        }

        self.setup_event_listeners();

        Ok(())
    }

    fn update_metadata(&self, payload: MetadataPayload) {
        debug!(
            title = %payload.song_name,
            artist = %payload.author_name,
            album = %payload.album_name,
            ncm_id = ?payload.ncm_id,
            "正在更新 macOS NowPlayingInfo 元数据"
        );

        let info = match self.info.lock() {
            Ok(g) => g,
            Err(e) => {
                error!("macOS update_metadata 锁中毒: {e:?}");
                return;
            }
        };

        unsafe {
            // 基础文本信息
            info.setObject_forKey(
                &NSString::from_str(&payload.song_name),
                ProtocolObject::from_ref(MPMediaItemPropertyTitle),
            );
            info.setObject_forKey(
                &NSString::from_str(&payload.author_name),
                ProtocolObject::from_ref(MPMediaItemPropertyArtist),
            );
            info.setObject_forKey(
                &NSString::from_str(&payload.album_name),
                ProtocolObject::from_ref(MPMediaItemPropertyAlbumTitle),
            );

            // 重置已播放时间
            info.setObject_forKey(
                &NSNumber::new_f64(0.0),
                ProtocolObject::from_ref(MPNowPlayingInfoPropertyElapsedPlaybackTime),
            );

            // 设置唯一 PersistentID
            let persistent_id = payload.ncm_id.unwrap_or_else(|| {
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as i64
            });

            info.setObject_forKey(
                &NSNumber::new_i64(persistent_id),
                ProtocolObject::from_ref(MPMediaItemPropertyPersistentID),
            );

            // 时长
            if let Some(duration_ms) = payload.duration {
                let duration_secs = duration_ms / 1000.0;
                info.setObject_forKey(
                    &NSNumber::new_f64(duration_secs),
                    ProtocolObject::from_ref(MPMediaItemPropertyPlaybackDuration),
                );
            } else {
                info.removeObjectForKey(MPMediaItemPropertyPlaybackDuration);
            }

            // 封面
            if let Some(data) = payload.cover_data {
                let ns_data = NSData::from_vec(data);
                let img = NSImage::alloc();

                if let Some(img) = NSImage::initWithData(img, &ns_data) {
                    let img_size = img.size();

                    let handler = RcBlock::new(move |_: NSSize| -> NonNull<NSImage> {
                        let ptr = Retained::as_ptr(&img);
                        NonNull::new(ptr.cast_mut()).expect("NSImage 指针不应为空")
                    });

                    let artwork = MPMediaItemArtwork::alloc();
                    let artwork = MPMediaItemArtwork::initWithBoundsSize_requestHandler(
                        artwork, img_size, &handler,
                    );

                    info.setObject_forKey(
                        &artwork,
                        ProtocolObject::from_ref(MPMediaItemPropertyArtwork),
                    );
                }
            } else {
                info.removeObjectForKey(MPMediaItemPropertyArtwork);
            }

            self.np_info_ctr.setNowPlayingInfo(Some(&*info));
        }
    }

    fn update_playback_status(&self, payload: PlayStatePayload) {
        debug!(new_status = ?payload.status, "正在更新 macOS 播放状态");
        let macos_state = match payload.status {
            PlaybackStatus::Playing => MPNowPlayingPlaybackState::Playing,
            PlaybackStatus::Paused => MPNowPlayingPlaybackState::Paused,
        };

        unsafe {
            self.np_info_ctr.setPlaybackState(macos_state);
        }
    }

    fn update_playback_rate(&self, rate: f64) {
        if let Ok(mut info_guard) = self.info.lock() {
            let info = &mut *info_guard;
            unsafe {
                info.setObject_forKey(
                    &NSNumber::new_f64(rate),
                    ProtocolObject::from_ref(MPNowPlayingInfoPropertyPlaybackRate),
                );
                self.np_info_ctr.setNowPlayingInfo(Some(info));
            }
        }
    }

    fn update_timeline(&self, payload: TimelinePayload) {
        let current_secs = payload.current_time / 1000.0;
        let total_secs = payload.total_time / 1000.0;

        if let Ok(mut info_guard) = self.info.lock() {
            let info = &mut *info_guard;

            unsafe {
                // 播放进度
                info.setObject_forKey(
                    &NSNumber::new_f64(current_secs),
                    ProtocolObject::from_ref(MPNowPlayingInfoPropertyElapsedPlaybackTime),
                );

                // 总时长
                info.setObject_forKey(
                    &NSNumber::new_f64(total_secs),
                    ProtocolObject::from_ref(MPMediaItemPropertyPlaybackDuration),
                );

                self.np_info_ctr.setNowPlayingInfo(Some(info));
            }
        }
    }

    fn update_play_mode(&self, payload: PlayModePayload) {
        debug!(
            is_shuffling = payload.is_shuffling,
            repeat_mode = ?payload.repeat_mode,
            "正在更新 macOS 播放模式"
        );
        unsafe {
            let shuffle_cmd = self.cmd_ctr.changeShuffleModeCommand();
            // Apple 的这个随机模式感觉不太符合我们的应用
            let shuffle_type = if payload.is_shuffling {
                MPShuffleType::Items
            } else {
                MPShuffleType::Off
            };
            shuffle_cmd.setCurrentShuffleType(shuffle_type);

            let repeat_cmd = self.cmd_ctr.changeRepeatModeCommand();
            let repeat_type = match payload.repeat_mode {
                crate::model::RepeatMode::None => MPRepeatType::Off,
                crate::model::RepeatMode::Track => MPRepeatType::One,
                crate::model::RepeatMode::List => MPRepeatType::All,
            };
            repeat_cmd.setCurrentRepeatType(repeat_type);
        }
    }
}
