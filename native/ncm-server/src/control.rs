use axum::Json;
use serde_json::{json, Value};

/// GET /api/control/play
pub async fn play() -> Json<Value> {
    // In sidecar mode, these would send IPC to Electron
    // For now return a placeholder that the Electron main process can intercept
    Json(json!({
        "code": 200,
        "message": "播放命令已发送 (Rust sidecar)",
        "data": null,
        "action": "play"
    }))
}

/// GET /api/control/pause
pub async fn pause() -> Json<Value> {
    Json(json!({
        "code": 200,
        "message": "暂停命令已发送 (Rust sidecar)",
        "data": null,
        "action": "pause"
    }))
}

/// GET /api/control/toggle
pub async fn toggle() -> Json<Value> {
    Json(json!({
        "code": 200,
        "message": "播放/暂停切换命令已发送 (Rust sidecar)",
        "data": null,
        "action": "playOrPause"
    }))
}

/// GET /api/control/next
pub async fn next() -> Json<Value> {
    Json(json!({
        "code": 200,
        "message": "下一曲命令已发送 (Rust sidecar)",
        "data": null,
        "action": "playNext"
    }))
}

/// GET /api/control/prev
pub async fn prev() -> Json<Value> {
    Json(json!({
        "code": 200,
        "message": "上一曲命令已发送 (Rust sidecar)",
        "data": null,
        "action": "playPrev"
    }))
}

/// GET /api/control/status
pub async fn status() -> Json<Value> {
    Json(json!({
        "code": 200,
        "message": "获取状态成功",
        "data": {
            "version": {
                "app": "3.1.1",
                "name": "SPlayer"
            },
            "environment": {
                "platform": std::env::consts::OS,
                "arch": std::env::consts::ARCH,
                "service": "Rust sidecar"
            },
            "connected": true,
            "window": "sidecar_mode"
        }
    }))
}

/// GET /api/control/song-info
pub async fn song_info() -> Json<Value> {
    Json(json!({
        "code": 200,
        "message": "获取当前播放信息成功 (Rust sidecar)",
        "data": {
            "title": null,
            "artist": null,
            "album": null,
            "duration": 0,
            "position": 0,
            "is_playing": false,
        }
    }))
}
