import { ipcMain } from "electron";
import { GoogleDriveService } from "../services/GoogleDriveService";
import { processLog } from "../logger";

/**
 * 初始化 Google Drive IPC 通信
 */
const initGoogleDriveIpc = (): void => {
  processLog.info("🔌 Initializing Google Drive IPC handlers");

  // 触发 Google 登录
  ipcMain.handle("google-drive-login", async () => {
    try {
      const service = GoogleDriveService.getInstance();
      const result = await service.startAuth();
      return result;
    } catch (error) {
      const err = error as Error;
      processLog.error("❌ Google Drive login failed:", err);
      return { status: "error", message: err.message };
    }
  });

  // 获取认证状态
  ipcMain.handle("google-drive-status", () => {
    try {
      const service = GoogleDriveService.getInstance();
      return service.getAuthStatus();
    } catch (error) {
      const err = error as Error;
      processLog.error("❌ Google Drive status check failed:", err);
      return { authenticated: false, hasRefreshToken: false };
    }
  });

  // 获取文件列表
  ipcMain.handle("google-drive-files", async (_event, pageSize = 10) => {
    try {
      const service = GoogleDriveService.getInstance();
      const files = await service.getFiles(pageSize);
      return { status: "success", files };
    } catch (error) {
      const err = error as Error;
      processLog.error("❌ Google Drive files fetch failed:", err);
      return { status: "error", message: err.message, files: [] };
    }
  });

  // 登出
  ipcMain.handle("google-drive-logout", () => {
    try {
      const service = GoogleDriveService.getInstance();
      service.logout();
      return { status: "success" };
    } catch (error) {
      const err = error as Error;
      processLog.error("❌ Google Drive logout failed:", err);
      return { status: "error", message: err.message };
    }
  });

  // 扫描音频文件
  ipcMain.handle("google-drive-scan", async (_event, pageSize = 1000) => {
    try {
      const service = GoogleDriveService.getInstance();
      const files = await service.getAudioFiles(pageSize);
      return { status: "success", files };
    } catch (error) {
      const err = error as Error;
      processLog.error("❌ Google Drive scan failed:", err);
      return { status: "error", message: err.message, files: [] };
    }
  });

  // 获取流式播放信息
  ipcMain.handle("google-drive-stream-info", async (_event, fileId: string) => {
    try {
      const service = GoogleDriveService.getInstance();
      const info = await service.getStreamInfo(fileId);
      return { status: "success", info };
    } catch (error) {
      const err = error as Error;
      processLog.error("❌ Google Drive stream info failed:", err);
      return { status: "error", message: err.message };
    }
  });

  // 下载文件
  ipcMain.handle("google-drive-download", async (_event, fileId: string, destPath: string) => {
    try {
      const service = GoogleDriveService.getInstance();
      await service.downloadFile(fileId, destPath);
      return { status: "success" };
    } catch (error) {
      const err = error as Error;
      processLog.error("❌ Google Drive download failed:", err);
      return { status: "error", message: err.message };
    }
  });
};

export default initGoogleDriveIpc;
