import { existsSync, promises as fs } from "fs";

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
      // 验证路径格式
      if (!path.startsWith("\\\\")) {
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
   * 使用 HTTP OPTIONS 请求检测 WebDAV 服务
   */
  private async testWebDav(params: TestConnectionParams): Promise<TestConnectionResult> {
    return new Promise((resolve) => {
      try {
        const url = new URL(params.path);
        const isHttps = url.protocol === "https:";
        const httpModule = isHttps ? require("https") : require("http");
        
        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname || "/",
          method: "OPTIONS",
          timeout: 10000,
          headers: {} as Record<string, string>,
        };
        
        // 添加认证
        if (params.username && params.password) {
          const auth = Buffer.from(`${params.username}:${params.password}`).toString("base64");
          options.headers["Authorization"] = `Basic ${auth}`;
        }
        
        const req = httpModule.request(options, (res: { statusCode: number; headers: Record<string, string> }) => {
          // WebDAV 服务通常会在 DAV header 中返回支持的版本
          const davHeader = res.headers["dav"];
          if (res.statusCode >= 200 && res.statusCode < 400) {
            if (davHeader) {
              resolve({ success: true, message: `WebDAV 连接成功 (DAV: ${davHeader})` });
            } else {
              resolve({ success: true, message: "HTTP 服务可访问（可能支持 WebDAV）" });
            }
          } else if (res.statusCode === 401) {
            resolve({ success: false, message: "认证失败，请检查用户名和密码" });
          } else {
            resolve({ success: false, message: `服务器返回错误: ${res.statusCode}` });
          }
        });
        
        req.on("error", (err: Error) => {
          resolve({ success: false, message: `连接失败: ${err.message}` });
        });
        
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, message: "连接超时" });
        });
        
        req.end();
      } catch (error) {
        resolve({ success: false, message: `URL 格式错误: ${(error as Error).message}` });
      }
    });
  }

  /**
   * 测试 FTP 连接
   * 使用 TCP Socket 检测 FTP 服务器
   */
  private async testFtp(params: TestConnectionParams): Promise<TestConnectionResult> {
    return new Promise((resolve) => {
      try {
        const url = new URL(params.path);
        const net = require("net");
        const port = parseInt(url.port) || 21;
        
        const socket = net.createConnection({ host: url.hostname, port, timeout: 10000 }, () => {
          // FTP 服务器会发送欢迎消息
        });
        
        let welcomed = false;
        
        socket.on("data", (data: Buffer) => {
          const response = data.toString();
          if (response.startsWith("220")) {
            welcomed = true;
            
            // 如果有认证信息，尝试登录
            if (params.username) {
              socket.write(`USER ${params.username}\r\n`);
            } else {
              socket.end();
              resolve({ success: true, message: "FTP 服务器可访问" });
            }
          } else if (response.startsWith("331") && params.password) {
            // 需要密码
            socket.write(`PASS ${params.password}\r\n`);
          } else if (response.startsWith("230")) {
            // 登录成功
            socket.write("QUIT\r\n");
            resolve({ success: true, message: "FTP 登录成功" });
          } else if (response.startsWith("530") || response.startsWith("430")) {
            // 登录失败
            socket.end();
            resolve({ success: false, message: "FTP 认证失败" });
          }
        });
        
        socket.on("error", (err: Error) => {
          resolve({ success: false, message: `连接失败: ${err.message}` });
        });
        
        socket.on("timeout", () => {
          socket.destroy();
          resolve({ success: false, message: "连接超时" });
        });
        
        socket.on("close", () => {
          if (!welcomed) {
            resolve({ success: false, message: "无法连接到 FTP 服务器" });
          }
        });
      } catch (error) {
        resolve({ success: false, message: `URL 格式错误: ${(error as Error).message}` });
      }
    });
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
