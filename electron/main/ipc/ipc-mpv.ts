import { ipcMain } from "electron";
import { MpvService } from "../services/MpvService";
import { processLog } from "../logger";
import { execSync } from "child_process";

const initMpvIpc = (): void => {
    const mpvService = MpvService.getInstance();

    // 检查 mpv 是否已安装
    ipcMain.handle("mpv-check-installed", async () => {
        try {
            const command = process.platform === "win32" ? "where mpv" : "which mpv";
            execSync(command, { encoding: "utf-8" });
            return { installed: true };
        } catch (e) {
            return { installed: false };
        }
    });

    ipcMain.handle("mpv-start", async () => {
        try {
            await mpvService.start();
            return { success: true };
        } catch (e) {
            processLog.error("MPV 启动失败:", e);
            return { success: false, error: String(e) };
        }
    });

    ipcMain.on("mpv-stop", () => {
        mpvService.stop();
    });

    ipcMain.handle("mpv-play", async (_, url: string, title?: string, autoPlay: boolean = true) => {
        try {
            await mpvService.play(url, title, autoPlay);
            return { success: true };
        } catch (e) {
            processLog.error("MPV 播放失败:", e);
            return { success: false, error: String(e) };
        }
    });

    ipcMain.on("mpv-pause", () => {
        mpvService.pause();
    });

    ipcMain.on("mpv-resume", () => {
        mpvService.resume();
    });

    ipcMain.on("mpv-seek", (_, seconds: number) => {
        mpvService.seek(seconds);
    });

    ipcMain.on("mpv-set-volume", (_, volume: number) => {
        mpvService.setVolume(volume);
    });

    ipcMain.on("mpv-set-rate", (_, rate: number) => {
        mpvService.setRate(rate);
    });
};

export default initMpvIpc;
