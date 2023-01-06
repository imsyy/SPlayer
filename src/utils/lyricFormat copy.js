const lyricFormat = (lyricData) => {
    let regNewLine = /\n/;
    let lineArr = lyricData.split(regNewLine); // 每行歌词的数组
    let regTime = /\[\d{2}:\d{2}.\d{2,3}\]/; // 分隔时间和歌词
    let lyricsObjArr = [];

    // 数组进行遍历分隔
    lineArr.forEach(item => {
        if (item === '') {
            return false;
        }
        let obj = {};
        let time = item.match(regTime);

        obj.lyric = item.split(']')[1].trim() === '' ? '' : item.split(']')[1].trim();
        obj.time = time ? formatLyricTime(time[0].slice(1, time[0].length - 1)) : 0;
        if (obj.lyric !== '') {
            lyricsObjArr.push(obj);
        }
    });

    return lyricsObjArr;
};

// 格式化歌词的时间 转换成 sss:ms
const formatLyricTime = (time) => {
    if (time) {
        const regMin = /.*:/;
        const regSec = /:.*\./;
        const regMs = /\./;

        const min = parseInt(time.match(regMin)[0].slice(0, 2));
        let sec = parseInt(time.match(regSec)[0].slice(1, 3));
        const ms = time.slice(time.match(regMs).index + 1, time.match(regMs).index + 3);
        if (min !== 0) {
            sec += min * 60;
        }
        return Number(sec + '.' + ms);
    }
}

export default lyricFormat;