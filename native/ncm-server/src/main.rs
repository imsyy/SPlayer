mod control;
mod qrc;
mod qqmusic;
mod unblock;

use axum::{
    routing::get,
    Json, Router,
};
use ncm_api_rs::{create_client, server::{build_app_with_config, ServerConfig}};
use serde_json::{json, Value};
use std::net::SocketAddr;
use std::path::PathBuf;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tracing::info;

const DEFAULT_PORT: u16 = 25884;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,ncm_api_rs=warn".into()),
        )
        .init();

    let port: u16 = std::env::var("NCM_SERVER_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    info!("SPlayer Rust API server starting on port {}", port);

    // Create Netease API client and build ncm-api-rs server
    let client = create_client(None);
    let ncm_config = ServerConfig {
        host: "127.0.0.1".to_string(),
        port,
        cors_origin: Some("*".to_string()),
        rate_limit: 0,
        rate_limit_window: 60,
    };
    let ncm_app = build_app_with_config(client, &ncm_config);

    // Build our server with ncm-api-rs mounted at /api/netease
    let mut app = Router::new()
        .route("/api", get(api_info))
        .nest("/api/netease", ncm_app)
        .route("/api/unblock", get(unblock::info))
        .route("/api/unblock/netease", get(unblock::netease))
        .route("/api/unblock/kuwo", get(unblock::kuwo))
        .route("/api/unblock/bodian", get(unblock::bodian))
        .route("/api/qqmusic", get(qqmusic::info))
        .route("/api/qqmusic/lyric", get(qqmusic::lyric))
        .route("/api/qqmusic/search", get(qqmusic::search))
        .route("/api/qqmusic/match", get(qqmusic::match_song))
        .route("/api/control/play", get(control::play))
        .route("/api/control/pause", get(control::pause))
        .route("/api/control/toggle", get(control::toggle))
        .route("/api/control/next", get(control::next))
        .route("/api/control/prev", get(control::prev))
        .route("/api/control/status", get(control::status))
        .route("/api/control/song-info", get(control::song_info))
        .layer(CorsLayer::permissive());

    // 如果设置了静态文件目录，提供静态文件服务
    if let Ok(static_dir) = std::env::var("NCM_STATIC_DIR") {
        let path = PathBuf::from(&static_dir);
        if path.is_dir() {
            info!("静态文件服务: {}", path.display());
            app = app.fallback_service(ServeDir::new(path));
        }
    }

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!("Server listening on {}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

async fn api_info() -> Json<Value> {
    Json(json!({
        "name": "SPlayer API",
        "description": "SPlayer API service (Rust)",
        "author": "@imsyy",
        "list": [
            { "name": "NeteaseCloudMusicApi", "url": "/api/netease" },
            { "name": "UnblockAPI", "url": "/api/unblock" },
            { "name": "QQMusicAPI", "url": "/api/qqmusic" },
            { "name": "ControlAPI", "url": "/api/control" },
        ],
    }))
}
