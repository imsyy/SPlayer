use axum::{
    extract::Query,
    Json,
};
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use tracing::{info, warn};

#[derive(Debug, Deserialize)]
pub struct UnblockParams {
    pub id: Option<String>,
    pub keyword: Option<String>,
    pub song_name: Option<String>,
    pub artist: Option<String>,
}

pub async fn info() -> Json<Value> {
    Json(json!({
        "name": "UnblockAPI",
        "description": "SPlayer UnblockAPI service (Rust)",
        "author": "@imsyy",
        "content": "GD music platform unblock service",
    }))
}

pub async fn netease(
    Query(params): Query<UnblockParams>,
) -> Result<Json<Value>, Json<Value>> {
    let id = params.id.as_deref().unwrap_or("");
    if id.is_empty() {
        return Err(Json(json!({ "code": 404, "url": null })));
    }

    let client = Client::new();
    match client
        .get("https://music-api.gdstudio.xyz/api.php")
        .query(&[("types", "url"), ("id", id)])
        .send()
        .await
    {
        Ok(resp) => {
            if let Ok(data) = resp.json::<Value>().await {
                let url = data.get("url").and_then(|u| u.as_str());
                info!("NeteaseSongUrl for id={}: {:?}", id, url);
                Ok(Json(json!({ "code": 200, "url": url })))
            } else {
                Ok(Json(json!({ "code": 404, "url": null })))
            }
        }
        Err(e) => {
            warn!("Get NeteaseSongUrl error: {}", e);
            Ok(Json(json!({ "code": 404, "url": null })))
        }
    }
}

fn build_match_info(params: &UnblockParams) -> (String, String, String) {
    let keyword = params.keyword.as_deref().unwrap_or("").to_string();
    let mut song_name = params.song_name.as_deref().unwrap_or("").to_string();
    let mut artist = params.artist.as_deref().unwrap_or("").to_string();

    if song_name.is_empty() && !keyword.is_empty() {
        if let Some(last_idx) = keyword.rfind('-') {
            if last_idx > 0 {
                song_name = keyword[..last_idx].trim().to_string();
                if artist.is_empty() {
                    artist = keyword[last_idx + 1..].trim().to_string();
                }
            } else {
                song_name = keyword.trim().to_string();
            }
        } else {
            song_name = keyword.trim().to_string();
        }
    }

    (keyword, song_name, artist)
}

fn normalize_name(name: &str) -> String {
    let mut result = name.to_lowercase();
    if let Some(end) = result.find('(') {
        result.truncate(end);
    }
    if let Some(end) = result.find('\u{ff08}') {
        result.truncate(end);
    }
    result.trim().to_string()
}

fn is_song_match(result_name: &str, result_artist: &str, song_name: &str, artist: &str) -> bool {
    let normalized_result = normalize_name(result_name);
    let normalized_original = normalize_name(song_name);

    if normalized_result.is_empty() {
        return false;
    }

    if !normalized_original.is_empty() {
        if !normalized_result.contains(&normalized_original)
            && !normalized_original.contains(&normalized_result)
        {
            return false;
        }
    }

    if !result_artist.is_empty() && !artist.is_empty() {
        let norm_res_artist = result_artist.to_lowercase();
        let norm_orig_artist = artist.to_lowercase();
        if !norm_res_artist.contains(&norm_orig_artist)
            && !norm_orig_artist.contains(&norm_res_artist)
        {
            return false;
        }
    }

    true
}

pub async fn kuwo(
    params: Query<UnblockParams>,
) -> Result<Json<Value>, Json<Value>> {
    let (_keyword, song_name, artist) = build_match_info(&params);

    if song_name.is_empty() {
        return Ok(Json(json!({ "code": 404, "url": null })));
    }

    let client = Client::new();
    let encoded = urlencoding::encode(&song_name);
    let search_url = format!(
        "http://search.kuwo.cn/r.s?&correct=1&stype=comprehensive&encoding=utf8\
         &rformat=json&mobi=1&show_copyright_off=1&searchapi=6&all={}",
        encoded
    );

    match client.get(&search_url).send().await {
        Ok(resp) => {
            let body: Value = resp.json().await.unwrap_or(json!({}));
            let mut song_id: Option<String> = None;

            if let Some(content) = body.get("content").and_then(|c| c.as_array()) {
                if content.len() >= 2 {
                    if let Some(abslist) = content[1]
                        .get("musicpage")
                        .and_then(|m| m.get("abslist"))
                        .and_then(|a| a.as_array())
                    {
                        for item in abslist {
                            let sid = item
                                .get("MUSICRID")
                                .and_then(|r| r.as_str())
                                .unwrap_or("");
                            let rname = item
                                .get("SONGNAME")
                                .and_then(|n| n.as_str())
                                .unwrap_or("");
                            let rartist = item
                                .get("ARTIST")
                                .and_then(|a| a.as_str())
                                .unwrap_or("");

                            if !sid.is_empty()
                                && is_song_match(rname, rartist, &song_name, &artist)
                            {
                                song_id = Some(sid.trim_start_matches("MUSIC_").to_string());
                                break;
                            }
                        }
                    }
                }
            }

            match song_id {
                Some(id) => {
                    let package_name = "kwplayer_ar_5.1.0.0_B_jiakong_vh.apk";
                    let query_str = format!(
                        "corp=kuwo&source={}&p2p=1&type=convert_url2&sig=0&format=mp3&rid={}",
                        package_name, id
                    );
                    let q_encoded = urlencoding::encode(&query_str);
                    let url = format!("http://mobi.kuwo.cn/mobi.s?f=kuwo&q={}", q_encoded);
                    match client
                        .get(&url)
                        .header("User-Agent", "okhttp/3.10.0")
                        .send()
                        .await
                    {
                        Ok(resp) => {
                            let text = resp.text().await.unwrap_or_default();
                            if let Some(start) = text.find("http") {
                                let result_url: String = text[start..]
                                    .split_whitespace()
                                    .next()
                                    .unwrap_or("")
                                    .to_string();
                                if !result_url.is_empty() {
                                    info!("KuwoSong URL: {}", result_url);
                                    return Ok(Json(json!({ "code": 200, "url": result_url })));
                                }
                            }
                            Ok(Json(json!({ "code": 404, "url": null })))
                        }
                        Err(e) => {
                            warn!("Get Kuwo URL error: {}", e);
                            Ok(Json(json!({ "code": 404, "url": null })))
                        }
                    }
                }
                None => Ok(Json(json!({ "code": 404, "url": null }))),
            }
        }
        Err(e) => {
            warn!("Kuwo search error: {}", e);
            Ok(Json(json!({ "code": 404, "url": null })))
        }
    }
}

pub async fn bodian(
    params: Query<UnblockParams>,
) -> Result<Json<Value>, Json<Value>> {
    let (_keyword, song_name, artist) = build_match_info(&params);

    if song_name.is_empty() {
        return Ok(Json(json!({ "code": 404, "url": null })));
    }

    let client = Client::new();
    let replaced = song_name.replace(" - ", " ");
    let keyword_encoded = urlencoding::encode(&replaced);
    let search_url = format!(
        "http://search.kuwo.cn/r.s?&correct=1&vipver=1&stype=comprehensive&encoding=utf8\
         &rformat=json&mobi=1&show_copyright_off=1&searchapi=6&all={}",
        keyword_encoded
    );

    match client.get(&search_url).send().await {
        Ok(resp) => {
            let body: Value = resp.json().await.unwrap_or(json!({}));
            let mut song_id: Option<String> = None;

            if let Some(content) = body.get("content").and_then(|c| c.as_array()) {
                if content.len() >= 2 {
                    if let Some(abslist) = content[1]
                        .get("musicpage")
                        .and_then(|m| m.get("abslist"))
                        .and_then(|a| a.as_array())
                    {
                        for item in abslist {
                            let sid = item
                                .get("MUSICRID")
                                .and_then(|r| r.as_str())
                                .unwrap_or("");
                            let rname = item
                                .get("SONGNAME")
                                .and_then(|n| n.as_str())
                                .unwrap_or("");
                            let rartist = item
                                .get("ARTIST")
                                .and_then(|a| a.as_str())
                                .unwrap_or("");

                            if !sid.is_empty()
                                && is_song_match(rname, rartist, &song_name, &artist)
                            {
                                song_id = sid.split('_').last().map(|s| s.to_string());
                                break;
                            }
                        }
                    }
                }
            }

            match song_id {
                Some(id) => {
                    let audio_url = format!(
                        "http://bd-api.kuwo.cn/api/play/music/v2/audioUrl?br=320kmp3&musicId={}",
                        id
                    );

                    match client
                        .get(&audio_url)
                        .header("User-Agent", "Dart/2.19 (dart:io)")
                        .header("plat", "ar")
                        .header("channel", "aliopen")
                        .header("ver", "3.9.0")
                        .header("host", "bd-api.kuwo.cn")
                        .header("X-Forwarded-For", "1.0.1.114")
                        .send()
                        .await
                    {
                        Ok(resp) => {
                            let data: Value = resp.json().await.unwrap_or(json!({}));
                            if let Some(url) = data
                                .get("data")
                                .and_then(|d| d.get("audioUrl"))
                                .and_then(|u| u.as_str())
                            {
                                info!("BodianSong URL: {}", url);
                                Ok(Json(json!({ "code": 200, "url": url })))
                            } else {
                                Ok(Json(json!({ "code": 404, "url": null })))
                            }
                        }
                        Err(e) => {
                            warn!("Get Bodian URL error: {}", e);
                            Ok(Json(json!({ "code": 404, "url": null })))
                        }
                    }
                }
                None => Ok(Json(json!({ "code": 404, "url": null }))),
            }
        }
        Err(e) => {
            warn!("Bodian search error: {}", e);
            Ok(Json(json!({ "code": 404, "url": null })))
        }
    }
}
