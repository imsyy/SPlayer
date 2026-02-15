use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    sync::Arc,
    thread,
    time::SystemTime,
};

use anyhow::Result;
use crossbeam_channel::{bounded, Receiver};
use jwalk::WalkDir;
use lofty::{
    file::{AudioFile, TaggedFile, TaggedFileExt},
    probe::Probe,
    tag::Accessor,
};
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use rayon::prelude::*;
use rusqlite::{Connection, OpenFlags};

#[napi(object)]
#[derive(Debug, Clone)]
pub struct MusicTrack {
    pub id: String,
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: f64,
    pub cover: Option<String>,
    pub mtime: f64,
    pub size: i64,
    pub bitrate: f64,
    pub track_number: Option<i32>,
}

struct TrackSnapshot {
    mtime: f64,
    size: i64,
    has_cover: bool,
}

#[napi(object)]
#[derive(Clone, Debug)]
pub struct ScanProgress {
    pub current: u32,
    pub total: u32,
}

#[napi(object)]
#[derive(Clone, Debug)]
pub struct ScanEvent {
    pub event: String,
    pub tracks: Option<Vec<MusicTrack>>,
    pub progress: Option<ScanProgress>,
    pub deleted_paths: Option<Vec<String>>,
}

enum ChannelMsg {
    Track(MusicTrack),
    Skip,
}

fn get_file_id(path: &str) -> String {
    let digest = md5::compute(path);
    format!("{digest:x}")
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

/// 前端用的 `FFmpeg` 解码器理论上支持的文件格式
///
/// 虽然 `lofty` 读不出来的话也没法在前端显示
const SUPPORTED_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "wav", "aac", "m4a", "ogg", "opus", "wma", "ape", "wv", "alac", "aiff", "aif",
    "dsf", "dff", "mpc", "tak", "tta", "ac3", "dts", "thd", "truehd", "mka", "mkv", "mp4", "m4v",
    "mov", "webm", "asf", "amr", "au", "ra", "rm", "3gp",
];

fn is_supported_ext(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| {
            let lower_ext = ext.to_lowercase();
            SUPPORTED_EXTENSIONS.contains(&lower_ext.as_str())
        })
}

fn load_db_snapshot(db_path: &str) -> Result<HashMap<String, TrackSnapshot>> {
    let mut map = HashMap::new();
    let conn = Connection::open_with_flags(db_path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;

    let mut stmt = conn.prepare("SELECT path, mtime, size, cover FROM tracks")?;
    let rows = stmt.query_map([], |row| {
        let path: String = row.get(0)?;
        let mtime: f64 = row.get(1)?;
        let size: i64 = row.get(2)?;
        let cover: Option<String> = row.get(3)?;
        Ok((
            path,
            TrackSnapshot {
                mtime,
                size,
                has_cover: cover.is_some(),
            },
        ))
    })?;

    for (path, snapshot) in rows.flatten() {
        map.insert(path, snapshot);
    }
    Ok(map)
}

fn process_cover(tag: &TaggedFile, file_id: &str, cover_dir: &Path) -> Option<String> {
    let picture = tag
        .primary_tag()
        .or_else(|| tag.tags().first())
        .and_then(|t| t.pictures().first())?;

    let file_name = format!("{file_id}.jpg");
    let save_path = cover_dir.join(&file_name);

    if save_path.exists() {
        return Some(file_name);
    }

    match image::load_from_memory(picture.data()) {
        Ok(img) => {
            let resized = img.resize(256, 256, image::imageops::FilterType::Lanczos3);
            if let Err(e) = resized.save_with_format(&save_path, image::ImageFormat::Jpeg) {
                // TODO: 添加一个通用的日志模块给所有其他原生模块用？
                eprintln!("为 {file_id} 保存封面时失败: {e}");
                return None;
            }
            Some(file_name)
        }
        Err(e) => {
            eprintln!("为 {file_id} 处理封面时失败: {e}");
            None
        }
    }
}

fn collect_file_paths(music_dirs: &[String]) -> Vec<PathBuf> {
    let mut file_paths = Vec::new();
    for dir in music_dirs {
        for entry in WalkDir::new(dir).skip_hidden(true).into_iter().flatten() {
            let path = entry.path();
            if entry.file_type().is_file() && is_supported_ext(&path) {
                file_paths.push(path);
            }
        }
    }
    file_paths
}

fn spawn_reporter(
    rx: Receiver<ChannelMsg>,
    callback: Arc<ThreadsafeFunction<ScanEvent>>,
    total_files: u32,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let mut batch_buffer = Vec::with_capacity(50);
        let mut current_progress = 0;
        let batch_size = 50;

        callback.call(
            Ok(ScanEvent {
                event: "progress".to_string(),
                tracks: None,
                progress: Some(ScanProgress {
                    current: 0,
                    total: total_files,
                }),
                deleted_paths: None,
            }),
            ThreadsafeFunctionCallMode::NonBlocking,
        );

        while let Ok(msg) = rx.recv() {
            current_progress += 1;

            match msg {
                ChannelMsg::Track(track) => {
                    batch_buffer.push(track);
                    if batch_buffer.len() >= batch_size {
                        callback.call(
                            Ok(ScanEvent {
                                event: "batch".to_string(),
                                tracks: Some(batch_buffer.clone()),
                                progress: None,
                                deleted_paths: None,
                            }),
                            ThreadsafeFunctionCallMode::NonBlocking,
                        );
                        batch_buffer.clear();
                    }
                }
                ChannelMsg::Skip => {}
            }

            if current_progress % 50 == 0 || current_progress == total_files {
                callback.call(
                    Ok(ScanEvent {
                        event: "progress".to_string(),
                        tracks: None,
                        progress: Some(ScanProgress {
                            current: current_progress,
                            total: total_files,
                        }),
                        deleted_paths: None,
                    }),
                    ThreadsafeFunctionCallMode::NonBlocking,
                );
            }
        }

        if !batch_buffer.is_empty() {
            callback.call(
                Ok(ScanEvent {
                    event: "batch".to_string(),
                    tracks: Some(batch_buffer),
                    progress: None,
                    deleted_paths: None,
                }),
                ThreadsafeFunctionCallMode::NonBlocking,
            );
        }
    })
}

#[allow(clippy::cast_possible_wrap)]
fn process_single_track(
    path_buf: &Path,
    snapshot: &HashMap<String, TrackSnapshot>,
    cover_dir_path: &Path,
) -> Option<MusicTrack> {
    let path_str = normalize_path(path_buf);

    let metadata = fs::metadata(path_buf).ok()?;
    let size = metadata.len().cast_signed();
    let mtime = metadata
        .modified()
        .unwrap_or(SystemTime::UNIX_EPOCH)
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as f64;

    if size < 1024 {
        return None;
    }

    if let Some(cached) = snapshot.get(&path_str) {
        let not_modified = (cached.mtime - mtime).abs() < 1.0 && cached.size == size;
        if not_modified {
            let file_id = get_file_id(&path_str);
            let cover_exists =
                !cached.has_cover || cover_dir_path.join(format!("{file_id}.jpg")).exists();
            if cover_exists {
                return None;
            }
        }
    }

    // TODO: 返回打不开的文件列表给前端？
    let tagged_file = Probe::open(path_buf).ok()?.read().ok()?;
    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.tags().first())?;
    let properties = tagged_file.properties();

    let title = tag
        .title()
        .as_deref()
        .unwrap_or_else(|| {
            path_buf
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("未知歌曲")
        })
        .to_string();
    let duration = properties.duration().as_millis() as f64;

    if tag.title().is_none() && duration < 30_000.0 {
        return None;
    }

    let artist = tag.artist().as_deref().unwrap_or("未知艺术家").to_string();
    let album = tag.album().as_deref().unwrap_or("未知专辑").to_string();
    let track_number = tag.track().map(|t| t as i32);

    let id = get_file_id(&path_str);
    let cover_path = process_cover(&tagged_file, &id, cover_dir_path);

    let bitrate_kbps = properties.audio_bitrate().unwrap_or(0);

    Some(MusicTrack {
        id,
        path: path_str,
        title,
        artist,
        album,
        duration,
        cover: cover_path,
        mtime,
        size,
        bitrate: f64::from(bitrate_kbps) * 1000.0,
        track_number,
    })
}

fn find_deleted_paths(
    snapshot: &HashMap<String, TrackSnapshot>,
    scanned_paths: &HashSet<String>,
) -> Vec<String> {
    snapshot
        .keys()
        .filter(|db_path| !scanned_paths.contains(*db_path))
        .cloned()
        .collect()
}

#[napi]
#[allow(clippy::trailing_empty_array)]
#[allow(clippy::missing_errors_doc)]
pub async fn scan_music_library(
    db_path: String,
    music_dirs: Vec<String>,
    cover_dir: String,
    callback: ThreadsafeFunction<ScanEvent>,
) -> napi::Result<()> {
    napi::tokio::task::spawn_blocking(move || {
        let callback = Arc::new(callback);

        let file_paths = collect_file_paths(&music_dirs);
        let total_files = file_paths.len() as u32;

        let scanned_paths: HashSet<String> =
            file_paths.par_iter().map(|p| normalize_path(p)).collect();
        let (tx, rx) = bounded::<ChannelMsg>(100);
        let reporter_handle = spawn_reporter(rx, callback.clone(), total_files);

        let cover_dir_path = PathBuf::from(&cover_dir);
        if !cover_dir_path.exists() {
            let _ = fs::create_dir_all(&cover_dir_path);
        }

        let snapshot = load_db_snapshot(&db_path).unwrap_or_default();

        file_paths.par_iter().for_each(|path_buf| {
            match process_single_track(path_buf, &snapshot, &cover_dir_path) {
                Some(track) => {
                    let _ = tx.send(ChannelMsg::Track(track));
                }
                None => {
                    let _ = tx.send(ChannelMsg::Skip);
                }
            }
        });

        drop(tx);

        let _ = reporter_handle.join();

        let deleted_paths = find_deleted_paths(&snapshot, &scanned_paths);

        callback.call(
            Ok(ScanEvent {
                event: "end".to_string(),
                tracks: None,
                progress: None,
                deleted_paths: Some(deleted_paths),
            }),
            ThreadsafeFunctionCallMode::Blocking,
        );

        Ok(())
    })
    .await
    .map_err(|e| napi::Error::from_reason(format!("join 错误: {e}")))?
    .map_err(|e: anyhow::Error| napi::Error::from_reason(e.to_string()))
}
