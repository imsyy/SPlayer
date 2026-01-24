import { ipcMain } from "electron";
import { RemoteFolderService, type TestConnectionParams } from "../services/RemoteFolderService";

const remoteFolderService = RemoteFolderService.getInstance();

/**
 * 注册远程文件夹相关的 IPC 处理器
 */
export const registerRemoteFolderIpc = () => {
  /**
   * 测试远程文件夹连接
   */
  ipcMain.handle("remote-folder-test", async (_event, params: TestConnectionParams) => {
    try {
      const result = await remoteFolderService.testConnection(params);
      return result;
    } catch (error) {
      return {
        success: false,
        message: `测试连接失败: ${(error as Error).message}`,
      };
    }
  });

  /**
   * 检查远程路径是否可访问
   */
  ipcMain.handle("remote-folder-check", async (_event, path: string) => {
    try {
      const accessible = await remoteFolderService.isPathAccessible(path);
      return { success: accessible };
    } catch (error) {
      return { success: false };
    }
  });
};
