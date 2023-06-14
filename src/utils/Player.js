import { Howl, Howler } from "howler";
import { songScrobble } from "@/api/song";
import { musicStore } from "@/store";
import { NIcon } from "naive-ui";
import { MusicNoteFilled } from "@vicons/material";
import getLanguageData from "./getLanguageData";

// 歌曲信息更新定时器
let timeupdateInterval = null;
// 听歌打卡延时器
let scrobbleTimeout = null;
// 重试次数
let testNumber = 0;

/**
 * 创建音频对象
 * @param {string} src - 音频文件地址
 * @param {number} volume - 音量（默认为0.7）
 * @param {number} seek - 初始播放进度（默认为0）
 * @return {Howl} - 音频对象
 */
export const createSound = (src, autoPlay = true) => {
  try {
    Howler.unload();
    const music = musicStore();
    const sound = new Howl({
      src: [src],
      format: ["mp3", "flac"],
      html5: true,
      preload: true,
      volume: music.persistData.playVolume,
    });
    if (autoPlay && music.getPlayState) {
      fadePlayOrPause(sound, "play", music.persistData.playVolume);
    }
    // 首次加载事件
    sound?.once("load", () => {
      const songId = music.getPlaySongData?.id;
      const sourceId = music.getPlaySongData?.sourceId
        ? music.getPlaySongData.sourceId
        : 0;
      const user = JSON.parse(localStorage.getItem("userData"));
      const settings = JSON.parse(localStorage.getItem("settingData"));
      const isLogin = user.userLogin;
      const isMemory = settings.memoryLastPlaybackPosition;
      console.log("首次缓冲完成：" + songId + " / 来源：" + sourceId);
      if (isMemory) {
        sound?.seek(music.persistData.playSongTime.currentTime);
      } else {
        music.persistData.playSongTime = {
          currentTime: 0,
          duration: 0,
          barMoveDistance: 0,
          songTimePlayed: "00:00",
          songTimeDuration: "00:00",
        };
      }
      // 取消加载状态
      music.isLoadingSong = false;
      // 听歌打卡
      if (isLogin) {
        clearTimeout(scrobbleTimeout);
        scrobbleTimeout = setTimeout(() => {
          songScrobble(songId, sourceId)
            .then((res) => {
              console.log("歌曲打卡完成", res);
            })
            .catch((err) => {
              console.error("歌曲打卡失败：" + err);
            });
        }, 3000);
      }
    });
    // 播放事件
    sound?.on("play", () => {
      if (!Object.keys(music.getPlaySongData).length) {
        $message.error(getLanguageData("songLoadError"));
        return false;
      }
      testNumber = 0;
      music.setPlayState(true);
      const songName = music.getPlaySongData?.name;
      const songArtist = music.getPlaySongData.artist[0]?.name;
      // 播放通知
      if (typeof $message !== "undefined" && songArtist !== null) {
        $message.info(songName + " - " + songArtist, {
          icon: () =>
            h(NIcon, null, {
              default: () => h(MusicNoteFilled),
            }),
        });
      } else {
        $message.warning(getLanguageData("songNotDetails"));
      }
      console.log("开始播放：" + songName + " - " + songArtist);
      setMediaSession(music);
      // 获取播放器信息
      timeupdateInterval = setInterval(() => checkAudioTime(sound, music), 250);
      // 写入播放历史
      music.setPlayHistory(music.getPlaySongData);
      // 播放时页面标题
      window.document.title =
        music.getPlaySongData.name +
        " - " +
        music.getPlaySongData.artist[0].name +
        " - " +
        import.meta.env.VITE_SITE_TITLE;
    });
    // 暂停事件
    sound?.on("pause", () => {
      clearInterval(timeupdateInterval);
      console.log("音乐暂停");
      music.setPlayState(false);
      // 更改页面标题
      $setSiteTitle();
    });
    // 结束事件
    sound?.on("end", () => {
      console.log("歌曲播放结束");
      music.setPlaySongIndex("next");
    });
    // 错误事件
    sound?.on("loaderror", () => {
      if (testNumber > 2) {
        $message.error(getLanguageData("songPlayError"));
        console.error(getLanguageData("songPlayError"));
        music.setPlayState(false);
      }
      if (testNumber < 4) {
        if (music.getPlaylists[0]) $getPlaySongData(music.getPlaySongData);
        testNumber++;
      } else {
        $message.error(getLanguageData("songLoadTest"), {
          closable: true,
          duration: 0,
        });
      }
    });
    sound?.on("playerror", () => {
      $message.error(getLanguageData("songPlayError"));
      console.error(getLanguageData("songPlayError"));
      music.setPlayState(false);
    });
    // 生成频谱
    // createSpectrums(sound, music);
    // 返回音频对象
    return (window.$player = sound);
  } catch (err) {
    $message.error(getLanguageData("songLoadError"));
    console.error(getLanguageData("songLoadError"), err);
  }
};

/**
 * 设置音量
 * @param {number} volume - 设置的音量值，0-1之间的浮点数
 */
export const setVolume = (sound, volume) => {
  sound?.volume(volume);
};

/**
 * 设置进度
 * @param {number} seek - 设置的进度值，0-1之间的浮点数
 */
export const setSeek = (sound, seek) => {
  const music = musicStore();
  music.persistData.playSongTime.currentTime = seek;
  sound?.seek(seek);
};

/**
 * 音频渐入渐出
 * @param {Howl} sound - 音频对象
 * @param {String} type - 渐入还是渐出
 * @param {number} volume - 渐出音量的大小，0-1之间的浮点数
 * @param {number} duration - 渐出音量的时长，单位为毫秒
 */
export const fadePlayOrPause = (sound, type, volume, duration = 300) => {
  const isFade =
    JSON.parse(localStorage.getItem("settingData")).songVolumeFade ?? true;
  if (isFade) {
    if (type === "play") {
      if (sound?.playing()) return;
      sound?.play();
      sound?.once("play", () => {
        sound?.fade(0, volume, duration);
      });
    } else if (type === "pause") {
      sound?.fade(volume, 0, duration);
      sound?.once("fade", () => {
        sound?.pause();
      });
    }
  } else {
    type === "play" ? sound?.play() : sound?.pause();
  }
};

/**
 * 停止播放器
 * @param {Howl} sound - 音频对象
 */
export const soundStop = (sound) => {
  sound?.stop();
  setSeek(sound, 0);
};

/**
 * 获取播放进度
 * @param {Howl} sound - 音频对象
 * @param {music} music - pinia
 */
const checkAudioTime = (sound, music) => {
  if (sound.playing()) {
    const currentTime = sound.seek();
    const duration = sound._duration;
    music.setPlaySongTime({ currentTime, duration });
  }
};

/**
 * 生成 MediaSession
 * @param {music} music - pinia
 */
const setMediaSession = (music) => {
  if (
    "mediaSession" in navigator &&
    Object.keys(music.getPlaySongData).length
  ) {
    const artists = music.getPlaySongData.artist.map((a) => a.name);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: music.getPlaySongData.name,
      artist: artists.join(" & "),
      album: music.getPlaySongData.album.name,
      artwork: [
        {
          src:
            music.getPlaySongData.album.picUrl.replace(/^http:/, "https:") +
            "?param=96y96",
          sizes: "96x96",
        },
        {
          src:
            music.getPlaySongData.album.picUrl.replace(/^http:/, "https:") +
            "?param=128y128",
          sizes: "128x128",
        },
        {
          src:
            music.getPlaySongData.album.picUrl.replace(/^http:/, "https:") +
            "?param=512x512",
          sizes: "512x512",
        },
      ],
      length: music.getPlaySongTime?.duration,
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      music.setPlaySongIndex("next");
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      music.setPlaySongIndex("prev");
    });
    navigator.mediaSession.setActionHandler("play", () => {
      music.setPlayState(true);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      music.setPlayState(false);
    });
  }
};

/**
 * 生成频谱数据 - 快速傅里叶变换（FFT）
 * @param {Howl} sound - 音频对象
 * @param {music} music - pinia
 */
const createSpectrums = (sound, music) => {
  try {
    if (!music.spectrumsData.audioCtx) {
      // 断开之前的连接
      music.spectrumsData.audio?.disconnect();
      music.spectrumsData.analyser?.disconnect();
      music.spectrumsData.audioCtx?.close();
      // 创建新的连接
      music.spectrumsData.audioCtx = new (window.AudioContext ||
        window.webkitAudioContext)();
      const audioDom = sound._sounds[0]._node;
      audioDom.crossOrigin = "anonymous";
      const source =
        music.spectrumsData.audioCtx.createMediaElementSource(audioDom);
      const analyser = music.spectrumsData.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(music.spectrumsData.audioCtx.destination);
      // 更新频谱数据
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      updateSpectrums(analyser, dataArray, music);
      // 保存当前链接
      music.spectrumsData.audio = source;
      music.spectrumsData.analyser = analyser;
    }
  } catch (err) {
    console.error("音乐频谱生成失败：" + err);
  }
};

/**
 * 更新音乐频谱数据
 *
 * @param {Object} analyser - 音频分析器
 * @param {Uint8Array} dataArray - 频谱数据数组
 * @param {Object} music - pinia
 */
const updateSpectrums = (analyser, dataArray, music) => {
  analyser.getByteFrequencyData(dataArray);
  music.spectrumsData.data = [...dataArray];
  // 递归调用，持续更新频谱数据
  requestAnimationFrame(() => {
    updateSpectrums(analyser, dataArray, music);
  });
};
