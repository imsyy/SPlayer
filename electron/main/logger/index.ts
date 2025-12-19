// 日志输出
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { app } from "electron";
import log from "electron-log";

// 日志文件路径
const logDir = join(app.getPath("logs"));

// 是否存在日志目录
if (!existsSync(logDir)) mkdirSync(logDir);

// 获取日期 - YYYY-MM-DD
const dateString = new Date().toISOString().slice(0, 10);
const logFilePath = join(logDir, `${dateString}.log`);

// 配置日志系统
log.transports.console.useStyles = true; // 颜色输出
log.transports.file.level = "info"; // 仅记录 info 及以上级别
log.transports.file.resolvePathFn = (): string => logFilePath; // 日志文件路径
log.transports.file.maxSize = 2 * 1024 * 1024; // 文件最大 2MB

// 日志格式化
// log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}] [{level}] [{scope}] {text}";

// 绑定默认事件
const defaultLog = log.scope("default");
console.log = defaultLog.log;
console.info = defaultLog.info;
console.warn = defaultLog.warn;
console.error = defaultLog.error;

// 分作用域导出
export { defaultLog };
export const ipcLog = log.scope("ipc");
export const trayLog = log.scope("tray");
export const thumbarLog = log.scope("thumbar");
export const storeLog = log.scope("store");
export const updateLog = log.scope("update");
export const systemLog = log.scope("system");
export const configLog = log.scope("config");
export const windowsLog = log.scope("windows");
export const processLog = log.scope("process");
export const preloadLog = log.scope("preload");
export const rendererLog = log.scope("renderer");
export const shortcutLog = log.scope("shortcut");
export const serverLog = log.scope("server");
export const cacheLog = log.scope("cache");
