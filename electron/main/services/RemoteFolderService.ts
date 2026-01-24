import { existsSync, promises as fs } from "fs";
import { createClient } from "webdav";
import { Client } from "basic-ftp";

/** 远程文件夹类型 */
export type RemoteFolderType = "smb" | "nfs" | "webdav" | "ftp";

/** 测试连接参数 */
export interface TestConnectionParams {
  type: RemoteFolderType;
  path: string;
  username?: string;
  password?: string;
}

/** 测试连接结果 */
export interface TestConnectionResult {
  success: boolean;
  message?: string;
}

/**
 * 远程文件夹服务
 * 负责处理 SMB/NFS/WebDAV/FTP 连接
 */
export class RemoteFolderService {
  private static instance: RemoteFolderService;

  private constructor() {}

  static getInstance(): RemoteFolderService {
    if (!RemoteFolderService.instance) {
      RemoteFolderService.instance = new RemoteFolderService();
    }
    return RemoteFolderService.instance;
  }

  /**
   * 测试远程连接
   * @param params 连接参数
   * @returns 测试结果
   */
  async testConnection(params: TestConnectionParams): Promise<TestConnectionResult> {
    const { type, path } = params;

    switch (type) {
      case "smb":
      case "nfs":
        return this.testNetworkPath(path);
      case "webdav":
        return this.testWebDav(params);
      case "ftp":
        return this.testFtp(params);
      default:
        return { success: false, message: "不支持的协议类型" };
    }
  }

  /**
   * 测试 SMB/NFS 网络路径
   * Windows 上 SMB 和 NFS 可以通过 UNC 路径直接访问
   */
  private async testNetworkPath(path: string): Promise<TestConnectionResult> {
    try {
      // 验证路径格式 (仅 Windows 需要 UNC 格式)
      if (process.platform === "win32" && !path.startsWith("\\\\")) {
        return { success: false, message: "路径格式错误，应为 \\\\server\\share 格式" };
      }

      // 检查路径是否存在
      if (existsSync(path)) {
        // 尝试读取目录
        try {
          await fs.readdir(path);
          return { success: true, message: "连接成功" };
        } catch (readError) {
          return { 
            success: false, 
            message: `无法读取目录: ${(readError as Error).message}` 
          };
        }
      } else {
        return { success: false, message: "路径不存在或无法访问" };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `连接失败: ${(error as Error).message}` 
      };
    }
  }

  /**
   * 测试 WebDAV 连接
   * 使用 webdav 库
   */
  private async testWebDav(params: TestConnectionParams): Promise<TestConnectionResult> {
    try {
      const client = createClient(params.path, {
        username: params.username,
        password: params.password,
      });

      // 尝试获取根目录信息以验证连接
      await client.stat("/");
      return { success: true, message: "WebDAV 连接成功" };
    } catch (error) {
      return { success: false, message: `连接失败: ${(error as Error).message}` };
    }
  }

  /**
   * 测试 FTP 连接
   * 使用 basic-ftp 库
   */
  private async testFtp(params: TestConnectionParams): Promise<TestConnectionResult> {
    const client = new Client();
    // 设置超时
    client.ftp.verbose = false;
    
    try {
      const url = new URL(params.path);
      const port = parseInt(url.port) || 21;
      
      await client.access({
        host: url.hostname,
        port: port,
        user: params.username,
        password: params.password,
        secure: false, // 暂不支持 FTPS，如有需要可扩展
      });
      
      return { success: true, message: "FTP 连接成功" };
    } catch (error) {
      return { success: false, message: `连接失败: ${(error as Error).message}` };
    } finally {
      client.close();
    }
  }

  /**
   * 检查远程路径是否可访问
   * @param path 路径
   * @returns 是否可访问
   */
  async isPathAccessible(path: string): Promise<boolean> {
    try {
      if (path.startsWith("\\\\")) {
        // 网络路径
        return existsSync(path);
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 获取远程文件夹的音乐文件列表
   * 对于 SMB/NFS，可以直接使用 LocalMusicService 的扫描逻辑
   * 因为 Windows 上网络路径行为与本地路径相同
   */
  async getMusicFiles(path: string): Promise<string[]> {
    if (path.startsWith("\\\\")) {
      // SMB/NFS 网络路径可以直接由 LocalMusicService 处理
      // 这里只做检查
      if (!existsSync(path)) {
        throw new Error("远程路径不可访问");
      }
      return [path]; // 返回路径让 LocalMusicService 处理
    }
    
    throw new Error("不支持的远程路径格式");
  }
}
