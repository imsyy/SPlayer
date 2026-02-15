use futures_util::StreamExt;
use lofty::config::WriteOptions;
use lofty::picture::{MimeType, Picture, PictureType};
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::tag::{ItemKey, Tag};
use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncSeekExt, AsyncWriteExt, SeekFrom};
use tokio_util::sync::CancellationToken;

// Constants
const CHUNK_SIZE: u64 = 4 * 1024 * 1024;
const MAX_RETRIES: u32 = 3;
const TIMEOUT_SECS: u64 = 10;
const PROGRESS_INTERVAL_MS: u64 = 200;
const PROGRESS_BYTES_THRESHOLD: u64 = 100 * 1024; // 100KB

const JPEG_MAGIC: &[u8] = &[0xFF, 0xD8, 0xFF];
const PNG_MAGIC: &[u8] = &[0x89, 0x50, 0x4E, 0x47];

// Error handling helper trait
trait Context<T> {
    fn context<C>(self, context: C) -> Result<T>
    where
        C: std::fmt::Display;
}

impl<T, E> Context<T> for std::result::Result<T, E>
where
    E: std::fmt::Display,
{
    fn context<C>(self, context: C) -> Result<T>
    where
        C: std::fmt::Display,
    {
        self.map_err(|e| Error::from_reason(format!("{context}: {e}")))
    }
}

#[napi(object)]
#[derive(Clone, Copy)]
pub struct DownloadProgress {
    pub percent: f64,
    pub transferred_bytes: f64,
    pub total_bytes: f64,
}

struct ProgressTracker {
    total_size: u64,
    transferred: AtomicU64,
    last_emitted_ts: AtomicU64,    // Timestamp in ms
    last_emitted_bytes: AtomicU64, // Last emitted bytes count
    callback: Arc<ThreadsafeFunction<DownloadProgress>>,
}

impl ProgressTracker {
    fn new(total_size: u64, callback: ThreadsafeFunction<DownloadProgress>) -> Self {
        Self {
            total_size,
            transferred: AtomicU64::new(0),
            last_emitted_ts: AtomicU64::new(0),
            last_emitted_bytes: AtomicU64::new(0),
            callback: Arc::new(callback),
        }
    }

    fn update(&self, delta: u64) {
        let current = self.transferred.fetch_add(delta, Ordering::Relaxed) + delta;
        let total = self.total_size;

        if total == 0 {
            return;
        }

        let last_bytes = self.last_emitted_bytes.load(Ordering::Relaxed);

        // Optimization: Only check time if we've made significant progress or finished
        if current - last_bytes < PROGRESS_BYTES_THRESHOLD && current != total {
            return;
        }

        // Rate limit
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let last_ts = self.last_emitted_ts.load(Ordering::Relaxed);

        if now - last_ts >= PROGRESS_INTERVAL_MS || current == total {
            self.last_emitted_ts.store(now, Ordering::Relaxed);
            self.last_emitted_bytes.store(current, Ordering::Relaxed);

            let percent = current as f64 / total as f64;
            let progress = DownloadProgress {
                percent,
                transferred_bytes: current as f64,
                total_bytes: total as f64,
            };
            self.callback
                .call(Ok(progress), ThreadsafeFunctionCallMode::NonBlocking);
        }
    }

    fn finish(&self) {
        let progress = DownloadProgress {
            percent: 1.0,
            transferred_bytes: self.total_size as f64,
            total_bytes: self.total_size as f64,
        };
        self.callback
            .call(Ok(progress), ThreadsafeFunctionCallMode::NonBlocking);
    }
}

#[napi(object)]
#[derive(Debug)]
pub struct SongMetadata {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub cover_url: Option<String>,
    pub lyric: Option<String>,
    pub description: Option<String>,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub track_number: Option<u32>,
    pub disc_number: Option<u32>,
}

#[napi]
#[allow(
    clippy::trailing_empty_array,
    clippy::missing_errors_doc,
    clippy::option_if_let_else
)]
pub async fn write_music_metadata(
    file_path: String,
    metadata: SongMetadata,
    cover_path: Option<String>,
) -> Result<()> {
    let cover_data = if let Some(path) = cover_path {
        match tokio::fs::read(&path).await {
            Ok(bytes) => Some(bytes::Bytes::from(bytes)),
            Err(_) => None,
        }
    } else {
        None
    };

    tokio::task::spawn_blocking(move || write_metadata(&file_path, metadata, cover_data))
        .await
        .context("Metadata task panicked or cancelled")??;

    Ok(())
}

#[napi]
pub struct DownloadTask {
    token: CancellationToken,
}

#[napi]
impl DownloadTask {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            token: CancellationToken::new(),
        }
    }
}

impl Default for DownloadTask {
    fn default() -> Self {
        Self::new()
    }
}

#[napi]
impl DownloadTask {
    #[napi]
    pub fn cancel(&self) {
        self.token.cancel();
    }

    #[napi]
    #[allow(clippy::too_many_arguments, clippy::missing_errors_doc)]
    pub async fn download(
        &self,
        url: String,
        file_path: String,
        metadata: Option<SongMetadata>,
        thread_count: u32,
        referer: Option<String>,
        on_progress: ThreadsafeFunction<DownloadProgress>,
        enable_http2: bool,
    ) -> Result<()> {
        if self.token.is_cancelled() {
            return Err(Error::new(Status::Cancelled, "下载已取消".to_string()));
        }

        let client = build_client(enable_http2)?;

        // Size detection
        let (total_size, http_version) =
            detect_content_length(&client, &url, referer.as_deref()).await;

        println!("[Download] URL: {url}, Version: {http_version:?}, Size: {total_size}");

        if total_size > 0 {
            println!("[Download] Threads: {thread_count}");
            download_range_stream(
                self.token.clone(),
                client.clone(),
                url.clone(),
                file_path.clone(),
                total_size,
                thread_count,
                referer,
                on_progress,
            )
            .await?;
        } else {
            println!("[Download] Mode: Simple Stream");
            download_simple_stream(
                self.token.clone(),
                client.clone(),
                url.clone(),
                file_path.clone(),
                total_size,
                referer,
                on_progress,
            )
            .await?;
        }

        if let Some(meta) = metadata {
            process_metadata(client, file_path, meta).await?;
        }

        Ok(())
    }
}

fn build_client(enable_http2: bool) -> Result<reqwest::Client> {
    let mut builder = reqwest::Client::builder()
        .user_agent("SPlayer/1.0")
        .tcp_nodelay(true)
        .http2_keep_alive_interval(std::time::Duration::from_secs(15));

    if !enable_http2 {
        builder = builder.http1_only();
    }

    builder.build().context("Failed to build HTTP client")
}

async fn detect_content_length(
    client: &reqwest::Client,
    url: &str,
    referer: Option<&str>,
) -> (u64, Option<reqwest::Version>) {
    // 1. HEAD request
    let mut head_req = client.head(url);
    if let Some(r) = referer {
        head_req = head_req.header("Referer", r);
    }

    if let Ok(head_resp) = head_req.send().await {
        let version = head_resp.version();
        if let Some(len) = head_resp.content_length() {
            // Only accept if length > 0. If 0, fallback to Range probe.
            if len > 0 {
                return (len, Some(version));
            }
        }
    }

    // 2. Range probe (bytes=0-0)
    let mut range_req = client.get(url).header("Range", "bytes=0-0");
    if let Some(r) = referer {
        range_req = range_req.header("Referer", r);
    }

    if let Ok(range_resp) = range_req.send().await {
        let version = range_resp.version();
        if range_resp.status() == reqwest::StatusCode::PARTIAL_CONTENT {
            if let Some(val) = range_resp.headers().get(reqwest::header::CONTENT_RANGE) {
                if let Ok(s) = val.to_str() {
                    // bytes 0-0/12345
                    if let Some(size_str) = s.rsplit('/').next() {
                        return (size_str.parse().unwrap_or(0), Some(version));
                    }
                }
            }
        }
    }

    (0, None)
}

async fn download_simple_stream(
    token: CancellationToken,
    client: reqwest::Client,
    url: String,
    file_path: String,
    total_size: u64,
    referer: Option<String>,
    on_progress: ThreadsafeFunction<DownloadProgress>,
) -> Result<()> {
    let mut req = client.get(&url);
    if let Some(ref r) = referer {
        req = req.header("Referer", r);
    }
    let response = req.send().await.context("Request failed")?;

    let content_length = response.content_length().unwrap_or(0);

    let mut file = tokio::fs::File::create(&file_path)
        .await
        .context("Create file failed")?;

    let mut stream = response.bytes_stream();
    let total_size = if total_size == 0 {
        content_length
    } else {
        total_size
    };
    let tracker = Arc::new(ProgressTracker::new(total_size, on_progress));

    let process_result = async {
        while let Some(item) = tokio::select! {
            () = token.cancelled() => None,
            item = stream.next() => item,
        } {
            let chunk = item.context("Read error")?;
            file.write_all(&chunk).await.context("Write error")?;
            tracker.update(chunk.len() as u64);
        }

        if token.is_cancelled() {
            return Err(Error::new(
                Status::Cancelled,
                "Download cancelled".to_string(),
            ));
        }

        file.flush().await.context("Flush failed")?;
        Ok(())
    }
    .await;

    if let Err(e) = process_result {
        drop(file);
        let _ = tokio::fs::remove_file(&file_path).await;
        return Err(e);
    }

    tracker.finish();
    Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn download_range_stream(
    token: CancellationToken,
    client: reqwest::Client,
    url: String,
    file_path: String,
    total_size: u64,
    thread_count: u32,
    referer: Option<String>,
    on_progress: ThreadsafeFunction<DownloadProgress>,
) -> Result<()> {
    let mut file = tokio::fs::File::create(&file_path)
        .await
        .context("Create file failed")?;
    file.set_len(total_size)
        .await
        .context("Set length failed")?;

    let tracker = Arc::new(ProgressTracker::new(total_size, on_progress));

    let mut ranges = Vec::new();
    let mut start = 0;
    while start < total_size {
        let end = std::cmp::min(start + CHUNK_SIZE - 1, total_size - 1);
        ranges.push((start, end));
        start += CHUNK_SIZE;
    }

    let download_futures = futures_util::stream::iter(ranges).map(|(start, end)| {
        let client = client.clone();
        let url = url.clone();
        let referer = referer.clone();
        let token = token.clone();

        async move { download_chunk_with_retry(client, url, referer, start, end, token).await }
    });

    let mut stream = download_futures.buffer_unordered(thread_count as usize);

    let process_result = async {
        while let Some(result) = stream.next().await {
            let (offset, data) = result?;
            if token.is_cancelled() {
                return Err(Error::new(
                    Status::Cancelled,
                    "Download cancelled".to_string(),
                ));
            }

            file.seek(SeekFrom::Start(offset))
                .await
                .context("Seek failed")?;
            file.write_all(&data).await.context("Write failed")?;
            tracker.update(data.len() as u64);
        }
        file.flush().await.context("Flush failed")?;
        Ok(())
    }
    .await;

    if let Err(e) = process_result {
        drop(file);
        let _ = tokio::fs::remove_file(&file_path).await;
        return Err(Error::from_reason(format!("Range download failed: {e}")));
    }

    tracker.finish();
    Ok(())
}

async fn download_chunk_with_retry(
    client: reqwest::Client,
    url: String,
    referer: Option<String>,
    start: u64,
    end: u64,
    token: CancellationToken,
) -> Result<(u64, bytes::Bytes)> {
    let mut attempts = 0;
    let mut last_error = String::new();

    while attempts < MAX_RETRIES {
        if token.is_cancelled() {
            return Err(Error::new(
                Status::Cancelled,
                "Download cancelled".to_string(),
            ));
        }

        let range_header = format!("bytes={start}-{end}");
        let mut req = client.get(&url).header("Range", &range_header);
        if let Some(ref r) = referer {
            req = req.header("Referer", r);
        }

        match req.send().await {
            Ok(resp) => {
                if !resp.status().is_success() {
                    last_error = format!("HTTP status {}", resp.status());
                    attempts += 1;
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                    continue;
                }

                match resp.bytes().await {
                    Ok(bytes) => return Ok((start, bytes)),
                    Err(e) => {
                        last_error = format!("Read bytes failed: {e}");
                    }
                }
            }
            Err(e) => {
                last_error = e.to_string();
            }
        }

        attempts += 1;
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }
    Err(Error::from_reason(format!(
        "Chunk {start}-{end} failed after {MAX_RETRIES} retries. Last error: {last_error}"
    )))
}

async fn process_metadata(
    client: reqwest::Client,
    file_path: String,
    meta: SongMetadata,
) -> Result<()> {
    let cover_data = fetch_cover(&client, &meta).await;

    tokio::task::spawn_blocking(move || write_metadata(&file_path, meta, cover_data))
        .await
        .context("Metadata task panicked or cancelled")??;

    Ok(())
}

async fn fetch_cover(client: &reqwest::Client, meta: &SongMetadata) -> Option<bytes::Bytes> {
    let cover_url = meta.cover_url.as_ref()?;
    if cover_url.is_empty() {
        return None;
    }

    let resp = tokio::time::timeout(
        std::time::Duration::from_secs(TIMEOUT_SECS),
        client.get(cover_url).send(),
    )
    .await
    .ok()?
    .ok()?;

    if resp.status().is_success() {
        resp.bytes().await.ok()
    } else {
        None
    }
}

fn get_or_create_tag(tagged_file: &mut lofty::file::TaggedFile) -> Result<&mut Tag> {
    if tagged_file.primary_tag_mut().is_some() {
        return Ok(tagged_file.primary_tag_mut().unwrap());
    }

    if tagged_file.first_tag_mut().is_some() {
        return Ok(tagged_file.first_tag_mut().unwrap());
    }

    let tag_type = tagged_file.primary_tag_type();
    tagged_file.insert_tag(Tag::new(tag_type));

    tagged_file
        .primary_tag_mut()
        .ok_or_else(|| Error::from_reason("Create tag failed"))
}

fn write_metadata(path: &str, meta: SongMetadata, cover_data: Option<bytes::Bytes>) -> Result<()> {
    let path_obj = Path::new(path);

    let mut tagged_file = Probe::open(path_obj)
        .context("Open file failed")?
        .read()
        .context("Read tag failed")?;

    let tag = get_or_create_tag(&mut tagged_file)?;

    tag.set_title(meta.title);
    tag.set_artist(meta.artist);
    tag.set_album(meta.album);

    if let Some(album_artist) = meta.album_artist {
        tag.insert_text(ItemKey::AlbumArtist, album_artist);
    }

    if let Some(genre) = meta.genre {
        tag.set_genre(genre);
    }

    if let Some(year) = meta.year {
        tag.set_year(year);
    }

    if let Some(track) = meta.track_number {
        tag.set_track(track);
    }

    if let Some(disc) = meta.disc_number {
        tag.set_disk(disc);
    }

    if let Some(desc) = meta.description {
        tag.set_comment(desc);
    }

    if let Some(lyric) = meta.lyric {
        tag.insert_text(ItemKey::Lyrics, lyric);
    }

    if let Some(data) = cover_data {
        let mime_type = if data.starts_with(JPEG_MAGIC) {
            MimeType::Jpeg
        } else if data.starts_with(PNG_MAGIC) {
            MimeType::Png
        } else {
            MimeType::Jpeg
        };

        let picture = Picture::new_unchecked(
            PictureType::CoverFront,
            Some(mime_type),
            None,
            data.to_vec(),
        );
        tag.push_picture(picture);
    }

    tagged_file
        .save_to_path(path_obj, WriteOptions::default())
        .context("Save tag failed")?;

    Ok(())
}
