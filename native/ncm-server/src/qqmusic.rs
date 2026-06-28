use axum::{
    extract::Query,
    http::StatusCode,
    Json,
};
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use tracing::warn;

use crate::qrc::decrypt_qrc;

#[derive(Debug, Deserialize)]
pub struct QqLyricParams {
    pub id: String,
    pub name: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct QqSearchParams {
    pub keyword: String,
    pub page: Option<String>,
    pub page_size: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct QqMatchParams {
    pub keyword: String,
}

const QM_API_URL: &str = "https://u.y.qq.com/cgi-bin/musicu.fcg";

fn get_common_params() -> Value {
    json!({
        "ct": 11,
        "cv": "1003006",
        "v": "1003006",
        "os_ver": "15",
        "phonetype": "24122RKC7C",
        "tmeAppID": "qqmusiclight",
        "nettype": "NETWORK_WIFI",
        "udid": "0",
    })
}

async fn qm_request(
    client: &Client,
    method: &str,
    module: &str,
    param: Value,
) -> Result<Value, String> {
    let comm = get_common_params();
    let body = json!({
        "comm": comm,
        "request": {
            "method": method,
            "module": module,
            "param": param,
        }
    });

    let resp = client
        .post(QM_API_URL)
        .header("Content-Type", "application/json")
        .header("User-Agent", "okhttp/3.14.9")
        .header("Cookie", "tmeLoginType=-1;")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("QM request failed: {}", e))?;

    let data: Value = resp
        .json()
        .await
        .map_err(|e| format!("QM response parse failed: {}", e))?;

    if data.get("code").and_then(|c| c.as_i64()) != Some(0) {
        return Err(format!("QM API error: {:?}", data));
    }

    data.get("request")
        .and_then(|r| r.get("data"))
        .cloned()
        .ok_or_else(|| "No data in QM response".to_string())
}

fn base64_encode(input: &str) -> String {
    use base64::Engine as _;
    base64::engine::general_purpose::STANDARD.encode(input.as_bytes())
}

pub async fn info() -> Json<Value> {
    Json(json!({
        "name": "QQMusicAPI",
        "description": "QQ API (Rust)",
        "author": "@imsyy",
    }))
}

pub async fn lyric(
    Query(params): Query<QqLyricParams>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let song_id: i64 = match params.id.parse() {
        Ok(id) => id,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(json!({ "code": 400, "message": "id is required" })),
            ))
        }
    };

    let client = Client::new();
    let duration: i64 = params
        .duration
        .as_deref()
        .unwrap_or("0")
        .parse()
        .unwrap_or(0);

    let param = json!({
        "albumName": base64_encode(params.album.as_deref().unwrap_or("")),
        "crypt": 1,
        "ct": 19,
        "cv": 2111,
        "interval": duration,
        "lrc_t": 0,
        "qrc": 1,
        "qrc_t": 0,
        "roma": 1,
        "roma_t": 0,
        "singerName": base64_encode(params.artist.as_deref().unwrap_or("")),
        "songID": song_id,
        "songName": base64_encode(params.name.as_deref().unwrap_or("")),
        "trans": 1,
        "trans_t": 0,
        "type": 0,
    });

    match qm_request(&client, "GetPlayLyricInfo", "music.musichallSong.PlayLyricInfo", param).await
    {
        Ok(response) => {
            let mut result = json!({ "code": 200 });

            // 处理逐字歌词 / LRC 歌词
            if let Some(lyric) = response.get("lyric").and_then(|l| l.as_str()) {
                if !lyric.is_empty() {
                    if let Some(decrypted) = decrypt_qrc(lyric) {
                        result["qrc"] = json!(decrypted);
                        result["lrc"] = json!(decrypted);
                    } else {
                        // 解密失败，返回原始值
                        result["qrc"] = json!(lyric);
                        result["lrc"] = json!(lyric);
                    }
                }
            }

            // 处理翻译歌词
            if let Some(trans) = response.get("trans").and_then(|t| t.as_str()) {
                if !trans.is_empty() {
                    if let Some(decrypted) = decrypt_qrc(trans) {
                        result["trans"] = json!(decrypted);
                    } else {
                        result["trans"] = json!(trans);
                    }
                }
            }

            // 处理罗马音歌词
            if let Some(roma) = response.get("roma").and_then(|r| r.as_str()) {
                if !roma.is_empty() {
                    if let Some(decrypted) = decrypt_qrc(roma) {
                        result["roma"] = json!(decrypted);
                    } else {
                        result["roma"] = json!(roma);
                    }
                }
            }

            Ok(Json(result))
        }
        Err(e) => {
            warn!("QQMusic lyric error: {}", e);
            Ok(Json(json!({ "code": 500, "message": e })))
        }
    }
}

pub async fn search(
    Query(params): Query<QqSearchParams>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let page: i64 = params.page.as_deref().unwrap_or("1").parse().unwrap_or(1);
    let page_size: i64 = params
        .page_size
        .as_deref()
        .unwrap_or("20")
        .parse()
        .unwrap_or(20);

    let param = json!({
        "search_id": format!(
            "{}",
            rand::random::<u64>() % 100000000000000000
        ),
        "remoteplace": "search.android.keyboard",
        "query": params.keyword,
        "search_type": 0,
        "num_per_page": page_size,
        "page_num": page,
        "highlight": 0,
        "nqc_flag": 0,
        "page_id": 1,
        "grp": 1,
    });

    let client = Client::new();
    match qm_request(
        &client,
        "DoSearchForQQMusicLite",
        "music.search.SearchCgiService",
        param,
    )
    .await
    {
        Ok(response) => {
            let songs = response
                .get("body")
                .and_then(|b| b.get("item_song"))
                .and_then(|s| s.as_array())
                .map(|arr| {
                    arr.iter()
                        .map(|song| {
                            let artists: Vec<&str> = song
                                .get("singer")
                                .and_then(|s| s.as_array())
                                .map(|singers| {
                                    singers
                                        .iter()
                                        .filter_map(|s| {
                                            s.get("name").and_then(|n| n.as_str())
                                        })
                                        .collect()
                                })
                                .unwrap_or_default();

                            json!({
                                "id": song.get("id").and_then(|i| i.as_i64()).unwrap_or(0).to_string(),
                                "mid": song.get("mid").and_then(|m| m.as_str()).unwrap_or(""),
                                "name": song.get("title").and_then(|t| t.as_str()).unwrap_or(""),
                                "artist": artists.join(" / "),
                                "album": song.get("album").and_then(|a| a.get("name")).and_then(|n| n.as_str()).unwrap_or(""),
                                "duration": song.get("interval").and_then(|i| i.as_i64()).unwrap_or(0) * 1000,
                            })
                        })
                        .collect::<Vec<Value>>()
                })
                .unwrap_or_default();

            let total = response
                .get("meta")
                .and_then(|m| m.get("sum"))
                .and_then(|s| s.as_i64())
                .unwrap_or(songs.len() as i64);

            Ok(Json(json!({
                "code": 200,
                "songs": songs,
                "total": total,
            })))
        }
        Err(e) => {
            warn!("QQMusic search error: {}", e);
            Ok(Json(json!({ "code": 500, "message": e })))
        }
    }
}

pub async fn match_song(
    Query(params): Query<QqMatchParams>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let client = Client::new();

    let param = json!({
        "search_id": format!("{}", rand::random::<u64>() % 100000000000000000),
        "remoteplace": "search.android.keyboard",
        "query": params.keyword,
        "search_type": 0,
        "num_per_page": 1,
        "page_num": 1,
        "highlight": 0,
        "nqc_flag": 0,
        "page_id": 1,
        "grp": 1,
    });

    match qm_request(
        &client,
        "DoSearchForQQMusicLite",
        "music.search.SearchCgiService",
        param,
    )
    .await
    {
        Ok(response) => {
            let song = response
                .get("body")
                .and_then(|b| b.get("item_song"))
                .and_then(|s| s.as_array())
                .and_then(|arr| arr.first());

            match song {
                Some(song) => {
                    let song_id = song
                        .get("id")
                        .and_then(|i| i.as_i64())
                        .unwrap_or(0);
                    let song_name = song
                        .get("title")
                        .and_then(|t| t.as_str())
                        .unwrap_or("")
                        .to_string();
                    let artist = song
                        .get("singer")
                        .and_then(|s| s.as_array())
                        .map(|singers| {
                            singers
                                .iter()
                                .filter_map(|s| s.get("name").and_then(|n| n.as_str()))
                                .collect::<Vec<_>>()
                                .join(" / ")
                        })
                        .unwrap_or_default();
                    let album = song
                        .get("album")
                        .and_then(|a| a.get("name"))
                        .and_then(|n| n.as_str())
                        .unwrap_or("")
                        .to_string();
                    let duration = song
                        .get("interval")
                        .and_then(|i| i.as_i64())
                        .unwrap_or(0);

                    let lyric_param = json!({
                        "albumName": base64_encode(&album),
                        "crypt": 1,
                        "ct": 19,
                        "cv": 2111,
                        "interval": duration,
                        "lrc_t": 0,
                        "qrc": 1,
                        "qrc_t": 0,
                        "roma": 1,
                        "roma_t": 0,
                        "singerName": base64_encode(&artist),
                        "songID": song_id,
                        "songName": base64_encode(&song_name),
                        "trans": 1,
                        "trans_t": 0,
                        "type": 0,
                    });

                    match qm_request(
                        &client,
                        "GetPlayLyricInfo",
                        "music.musichallSong.PlayLyricInfo",
                        lyric_param,
                    )
                    .await
                    {
                        Ok(lyric_resp) => {
                            let mut result = json!({
                                "code": 200,
                                "song": {
                                    "id": song_id.to_string(),
                                    "mid": song.get("mid").and_then(|m| m.as_str()).unwrap_or(""),
                                    "name": song_name,
                                    "artist": artist,
                                    "album": album,
                                    "duration": duration * 1000,
                                }
                            });

                            if let Some(lyric) = lyric_resp.get("lyric").and_then(|l| l.as_str()) {
                                if !lyric.is_empty() {
                                    if let Some(decrypted) = decrypt_qrc(lyric) {
                                        result["qrc"] = json!(decrypted);
                                        result["lrc"] = json!(decrypted);
                                    } else {
                                        result["lrc"] = json!(lyric);
                                        result["qrc"] = json!(lyric);
                                    }
                                }
                            }
                            if let Some(trans) = lyric_resp.get("trans").and_then(|t| t.as_str()) {
                                if !trans.is_empty() {
                                    if let Some(decrypted) = decrypt_qrc(trans) {
                                        result["trans"] = json!(decrypted);
                                    } else {
                                        result["trans"] = json!(trans);
                                    }
                                }
                            }
                            if let Some(roma) = lyric_resp.get("roma").and_then(|r| r.as_str()) {
                                if !roma.is_empty() {
                                    if let Some(decrypted) = decrypt_qrc(roma) {
                                        result["roma"] = json!(decrypted);
                                    } else {
                                        result["roma"] = json!(roma);
                                    }
                                }
                            }

                            Ok(Json(result))
                        }
                        Err(e) => Ok(Json(json!({ "code": 500, "message": e }))),
                    }
                }
                None => Ok(Json(
                    json!({ "code": 404, "message": "not found" }),
                )),
            }
        }
        Err(e) => Ok(Json(json!({ "code": 500, "message": e }))),
    }
}
