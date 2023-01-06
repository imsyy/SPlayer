const lyricFormat = (lrc) => {
    // 正则匹配，取出时间和歌词文本
    let lines = lrc.split('\n');
    let regex = /^\[(.+?)\](.*)$/;
    let regex2 = /纯音乐，请欣赏/;
    let result = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let match = line.match(regex);
        if (match) {
            // 如果匹配不到时间信息或者歌词文本，则跳过
            if (!match[1] || (match[2].trim() === '' || !match[2].trim())) {
                continue;
            }
            // 如果文本中包含 "纯音乐，请欣赏"
            if (regex2.test(match[2])) {
                console.log("该歌曲为纯音乐");
                result = [];
                return result;
            }
            // 将时间转换为秒
            let time = match[1].split(':').map(i => parseFloat(i));
            let seconds = time[0] * 60 + time[1];
            result.push({
                time: seconds,
                lyric: match[2],
            });
        }
    }
    return result;
}

export default lyricFormat;