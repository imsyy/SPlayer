// 歌曲时长时间戳转换
export const getSongTime = (mss) => {
    let minutes = parseInt((mss % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = parseInt((mss % (1000 * 60)) / 1000);
    if (seconds >= 0 && seconds <= 9) {
        seconds = seconds + "0"
    }
    return minutes + ":" + seconds;
}

// 发布时间戳转换
export const getLongTime = (mss) => {
    let date = new Date(parseInt(mss));
    let y = date.getFullYear();
    let m = date.getMonth() + 1;
    m = m < 10 ? ('0' + m) : m;
    let d = date.getDate();
    d = d < 10 ? ('0' + d) : d;
    let dates = y + '-' + m + '-' + d;
    return dates;
}

// 评论时间戳转换
export const getCommentTime = (t) => {
    let nowDate = null
    let todayLast = null
    if (nowDate === null || todayLast === null) {
        // 当前 Unix 时间戳
        nowDate = new Date().getTime()
        // 今天 23:59:59.999 时间戳
        todayLast = new Date(new Date().setHours(23, 59, 59, 999)).getTime()
    }
    if ((nowDate - t) <= 60000) {
        return '刚刚'
    } else if ((nowDate - t) > 60000 && (nowDate - t) <= 3600000) {
        let pastTimeUnix = nowDate - t
        let pastTime = new Date(Number(pastTimeUnix))
        return `${pastTime.getMinutes()} 分钟前`
    } else if ((todayLast - t) > 3600000 && (todayLast - t) <= 86400000) {
        let userDate = new Date(Number(t))
        let UH = userDate.getHours() < 10 ? `0${userDate.getHours()}` : userDate.getHours()
        let Um = userDate.getMinutes() < 10 ? `0${userDate.getMinutes()}` : userDate.getMinutes()
        return `${UH}:${Um}`
    } else if ((todayLast - t) > 86400000 && (todayLast - t) <= 172800000) {
        let userDate = new Date(Number(t))
        let UH = userDate.getHours() < 10 ? `0${userDate.getHours()}` : userDate.getHours()
        let Um = userDate.getMinutes() < 10 ? `0${userDate.getMinutes()}` : userDate.getMinutes()
        return `昨天 ${UH}:${Um}`
    } else if ((todayLast - t) > 172800000 && (todayLast - t) <= 31557600000) {
        let userDate = new Date(Number(t))
        return `${userDate.getMonth() + 1}月${userDate.getDate()}日`
    } else {
        let userDate = new Date(Number(t))
        return `${userDate.getFullYear()}年${userDate.getMonth() + 1}月${userDate.getDate()}日`
    }
}

// 过万数字转化
export const formatNumber = (num) => {
    num = Number(num);
    if (num == 0) {
        return num;
    } else if (num > 0 && num < 10000) {
        return num;
    } else {
        return (num / 10000).toFixed(1) + "万";
    }
}

// 歌曲播放时间转换
export const getSongPlayingTime = (num) => {
    let time = num;
    let minute = time / 60;
    let minutes = parseInt(minute);
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    let second = time % 60;
    let seconds = parseInt(second);
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    return minutes + ":" + seconds;
}