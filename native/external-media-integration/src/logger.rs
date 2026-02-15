use std::{fs, path::PathBuf, sync::OnceLock};

use anyhow::{Context, Result};
use time::macros::format_description;
use tracing::{error, trace};
use tracing_appender::{non_blocking::WorkerGuard, rolling::RollingFileAppender};
use tracing_subscriber::{
    Layer,
    filter::{LevelFilter, Targets},
    fmt::{self, time::LocalTime},
    layer::SubscriberExt,
    util::SubscriberInitExt,
};

static LOG_GUARD: OnceLock<WorkerGuard> = OnceLock::new();

pub fn init(log_dir_str: String) -> Result<()> {
    let log_path = PathBuf::from(log_dir_str);

    if !log_path.exists() {
        fs::create_dir_all(&log_path).context("无法创建日志目录")?;
    }

    let file_appender = RollingFileAppender::builder()
        .rotation(tracing_appender::rolling::Rotation::DAILY)
        .filename_prefix("external-media-integration")
        .filename_suffix("log")
        .max_log_files(5)
        .build(&log_path)
        .context("无法创建日志文件 Appender")?;

    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    if LOG_GUARD.set(guard).is_err() {
        error!("Logger Guard 已经被初始化，不应重复调用 init()");
        return Ok(());
    }

    let time_format = format_description!("[hour]:[minute]:[second]");
    let local_timer = LocalTime::new(time_format);

    let crate_name = env!("CARGO_PKG_NAME").replace('-', "_");
    let file_filter = Targets::new().with_target(&crate_name, LevelFilter::TRACE);

    let stdout_filter = Targets::new().with_target(&crate_name, LevelFilter::WARN);

    let file_layer = fmt::layer()
        .with_writer(non_blocking)
        .with_ansi(false)
        .with_target(true)
        .with_timer(local_timer.clone())
        .with_filter(file_filter);

    let stdout_layer = fmt::layer()
        .with_writer(std::io::stdout)
        .with_ansi(true)
        .pretty()
        .with_timer(local_timer)
        .with_filter(stdout_filter);

    tracing_subscriber::registry()
        .with(file_layer)
        .with(stdout_layer)
        .try_init()
        .context("无法初始化 Tracing subscriber")?;

    trace!(path = ?log_path, "日志系统初始化完成");

    Ok(())
}
