use des::cipher::{BlockDecrypt, BlockEncrypt, KeyInit};
use des::cipher::generic_array::{typenum::U8, GenericArray};
use des::Des;
use flate2::read::{DeflateDecoder, GzDecoder, ZlibDecoder};
use std::io::Read;
use tracing::warn;

/// QRC 解密密钥 — 24 字节 Triple DES 密钥
const QRC_KEY: &[u8; 24] = b"!@#)(*$%123ZXC!@!@#)(NHL";

type Block = GenericArray<u8, U8>;

/// Triple DES EDE 解密单个 8 字节块
fn triple_des_decrypt_block(block: &mut Block) {
    let k1 = Des::new_from_slice(&QRC_KEY[0..8]).expect("DES key K1");
    let k2 = Des::new_from_slice(&QRC_KEY[8..16]).expect("DES key K2");
    let k3 = Des::new_from_slice(&QRC_KEY[16..24]).expect("DES key K3");

    k3.decrypt_block(block);
    k2.encrypt_block(block);
    k1.decrypt_block(block);
}

/// Triple DES EDE 解密（ECB 模式）
fn triple_des_decrypt(data: &[u8]) -> Vec<u8> {
    data.chunks(8)
        .flat_map(|chunk| {
            let mut arr = [0u8; 8];
            let len = chunk.len().min(8);
            arr[..len].copy_from_slice(&chunk[..len]);
            let mut block = Block::from(arr);
            triple_des_decrypt_block(&mut block);
            block.to_vec()
        })
        .take(data.len())
        .collect()
}

/// 尝试多种解压/解码方式还原明文
fn try_decompress(data: &[u8]) -> Option<String> {
    let mut s = String::new();
    if ZlibDecoder::new(data).read_to_string(&mut s).is_ok() && !s.is_empty() {
        return Some(s);
    }

    s.clear();
    if DeflateDecoder::new(data).read_to_string(&mut s).is_ok() && !s.is_empty() {
        return Some(s);
    }

    s.clear();
    if GzDecoder::new(data).read_to_string(&mut s).is_ok() && !s.is_empty() {
        return Some(s);
    }

    if let Ok(s) = String::from_utf8(data.to_vec()) {
        if s.contains('[') || s.contains('<') {
            return Some(s);
        }
    }

    None
}

/// 解密 QRC 歌词（端口自 electron/server/qqmusic/qrc.ts）
pub fn decrypt_qrc(encrypted_hex: &str) -> Option<String> {
    let hex_str = encrypted_hex.trim();
    if hex_str.is_empty() {
        return None;
    }

    // hex 解码
    let encrypted_data = match hex::decode(hex_str) {
        Ok(data) => data,
        Err(_) => {
            warn!("QRC: hex 解码失败");
            return None;
        }
    };

    // Triple DES 解密
    let decrypted = triple_des_decrypt(&encrypted_data);

    // 解压 / 转明文
    match try_decompress(&decrypted) {
        Some(text) => Some(text),
        None => {
            warn!("QRC: 解压失败");
            None
        }
    }
}
