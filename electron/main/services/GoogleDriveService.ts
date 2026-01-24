import { shell } from "electron";
import { google, drive_v3 } from "googleapis";
import http from "http";
import { URL } from "url";
import { useStore } from "../store";
import { processLog } from "../logger";
import axios from "axios";

// --- 配置区域 ---
const CLIENT_ID = process.env["GOOGLE_DRIVE_CLIENT_ID"] || "";
const CLIENT_SECRET = process.env["GOOGLE_DRIVE_CLIENT_SECRET"] || "";
const REDIRECT_URI = "http://localhost:3000/oauth2callback";
// 使用 drive.readonly 权限以支持文件内容读取
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

// 支持的音频文件 MIME 类型
const AUDIO_MIME_TYPES = [
  "audio/mpeg",      // mp3
  "audio/mp4",       // m4a
  "audio/flac",      // flac
  "audio/wav",       // wav
  "audio/x-wav",     // wav
  "audio/ogg",       // ogg
  "audio/aac",       // aac
  "audio/x-m4a",     // m4a
];



/**
 * Google Drive 服务类
 * 负责 OAuth2 认证、Token 管理和 Drive API 调用
 */
export class GoogleDriveService {
  private static instance: GoogleDriveService | null = null;
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private store = useStore();
  private isAuthenticating = false;
  private authServer: http.Server | null = null;

  private constructor() {
    this.oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    // 尝试从 store 恢复 tokens
    this.restoreTokens();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  /**
   * 从 store 恢复 tokens
   */
  private restoreTokens(): void {
    const stored = this.store.get("googleDrive");
    if (stored?.refreshToken) {
      processLog.info("🔑 Restoring Google Drive tokens from store");
      this.oauth2Client.setCredentials({
        refresh_token: stored.refreshToken,
        access_token: stored.accessToken,
        expiry_date: stored.expiryDate,
      });
    }
  }

  /**
   * 保存 tokens 到 store
   */
  private saveTokens(tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  }): void {
    const existing = this.store.get("googleDrive") || {};
    this.store.set("googleDrive", {
      accessToken: tokens.access_token || existing.accessToken,
      refreshToken: tokens.refresh_token || existing.refreshToken,
      expiryDate: tokens.expiry_date || existing.expiryDate,
    });
    processLog.info("💾 Saved Google Drive tokens to store");
  }

  /**
   * 关闭认证服务器
   */
  private closeAuthServer(): void {
    if (this.authServer) {
      this.authServer.close();
      this.authServer = null;
    }
    this.isAuthenticating = false;
  }

  /**
   * 检查是否有有效的 tokens
   */
  hasValidTokens(): boolean {
    const stored = this.store.get("googleDrive");
    return !!(stored?.refreshToken);
  }

  /**
   * 获取当前认证状态
   */
  getAuthStatus(): { authenticated: boolean; hasRefreshToken: boolean } {
    const stored = this.store.get("googleDrive");
    return {
      authenticated: !!stored?.refreshToken,
      hasRefreshToken: !!stored?.refreshToken,
    };
  }

  /**
   * 启动 OAuth2 授权流程
   */
  startAuth(): Promise<{ status: string; message?: string }> {
    // 如果已经认证，直接返回成功
    if (this.hasValidTokens()) {
      processLog.info("✅ Already authenticated with Google Drive");
      return Promise.resolve({ status: "success", message: "Already authenticated" });
    }

    // 如果正在认证中，返回提示
    if (this.isAuthenticating) {
      processLog.warn("⚠️ Authentication already in progress");
      return Promise.resolve({ status: "pending", message: "认证正在进行中，请在浏览器中完成授权" });
    }

    this.isAuthenticating = true;

    return new Promise((resolve, reject) => {
      processLog.info("🔐 Starting Google OAuth2 flow...");

      // 创建临时本地服务器来接收回调
      this.authServer = http.createServer(async (req, res) => {
        try {
          if (!req.url) {
            res.end("Invalid request");
            return;
          }

          const parsedUrl = new URL(req.url, "http://localhost:3000");

          // 只处理 oauth2callback 路径
          if (parsedUrl.pathname !== "/oauth2callback") {
            res.end("Invalid path");
            return;
          }

          const code = parsedUrl.searchParams.get("code");
          const error = parsedUrl.searchParams.get("error");

          if (error) {
            res.end(`Authentication failed: ${error}`);
            this.closeAuthServer();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (code) {
            // 关闭浏览器显示的页面
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`
              <html>
                <head><title>认证成功</title></head>
                <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                  <h1>✅ 认证成功！</h1>
                  <p>您可以关闭此窗口并返回应用。</p>
                  <script>setTimeout(() => window.close(), 2000);</script>
                </body>
              </html>
            `);

            // 关闭服务器
            this.closeAuthServer();

            // 用 Code 换取 Tokens
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            // 保存 tokens
            this.saveTokens(tokens);

            processLog.info("✅ Google OAuth2 authentication successful");
            resolve({ status: "success" });
          }
        } catch (e) {
          const error = e as Error;
          processLog.error("❌ Error getting tokens:", error);
          this.closeAuthServer();
          reject(error);
        }
      });

      // 处理服务器错误
      this.authServer.on("error", (err) => {
        processLog.error("❌ OAuth server error:", err);
        this.closeAuthServer();
        reject(new Error(`Server error: ${err.message}`));
      });

      // 监听端口
      this.authServer.listen(3000, () => {
        processLog.info("📡 OAuth callback server listening on port 3000");

        // 生成授权 URL 并打开用户默认浏览器
        const authUrl = this.oauth2Client.generateAuthUrl({
          access_type: "offline", // 获取 refresh_token
          scope: SCOPES,
          prompt: "consent", // 强制显示同意页面以获取 refresh_token
        });

        shell.openExternal(authUrl);
        processLog.info("🌐 Opened browser for Google authorization");
      });

      // 设置超时（2分钟）
      setTimeout(() => {
        if (this.isAuthenticating) {
          this.closeAuthServer();
          reject(new Error("Authentication timeout"));
        }
      }, 120000);
    });
  }

  /**
   * 获取 Drive 文件列表
   */
  async getFiles(pageSize = 10): Promise<drive_v3.Schema$File[]> {
    if (!this.hasValidTokens()) {
      throw new Error("Not authenticated");
    }

    const drive = google.drive({ version: "v3", auth: this.oauth2Client });

    try {
      const res = await drive.files.list({
        pageSize,
        fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime)",
      });

      const files = res.data.files || [];
      processLog.info(`📁 Retrieved ${files.length} files from Google Drive`);
      return files;
    } catch (err) {
      const error = err as Error;
      processLog.error("❌ Error fetching Drive files:", error);
      throw error;
    }
  }

  /**
   * 扫描音频文件
   */
  async getAudioFiles(pageSize = 1000): Promise<drive_v3.Schema$File[]> {
    if (!this.hasValidTokens()) {
      throw new Error("Not authenticated");
    }

    const drive = google.drive({ version: "v3", auth: this.oauth2Client });

    try {
      // 1. 根据 MIME 类型过滤
      const mimeTypeQuery = AUDIO_MIME_TYPES.map((type) => `mimeType = '${type}'`).join(" or ");
      
      // 2. 根据文件后缀名过滤 (更宽松，防止某些上传文件 MIME 类型不正确)
      const extensions = ["mp3", "flac", "wav", "m4a", "ogg", "aac", "wma", "ape", "opus"];
      const extQuery = extensions.map((ext) => `name contains '.${ext}'`).join(" or ");

      // 组合查询：(MIME类型 OR 后缀名) 且 未删除
      const query = `trashed = false and ((${mimeTypeQuery}) or (${extQuery}))`;

      let allFiles: drive_v3.Schema$File[] = [];
      let pageToken: string | undefined = undefined;

      processLog.info("🔍 Scanning for audio files in Google Drive...");

      do {
        const res = await drive.files.list({
          q: query,
          pageSize,
          pageToken,
          fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webContentLink, parents)",
        });

        const files = res.data.files || [];
        allFiles = allFiles.concat(files);
        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);

      processLog.info(`🎵 Found ${allFiles.length} audio files`);
      return allFiles;
    } catch (err) {
      const error = err as Error;
      processLog.error("❌ Error scanning audio files:", error);
      throw error;
    }
  }

  /**
   * 获取单个文件元数据 (用于补充信息)
   */
  async getFileMetadata(fileId: string): Promise<{ size: number; name: string }> {
    if (!this.hasValidTokens()) {
      throw new Error("Not authenticated");
    }
    const drive = google.drive({ version: "v3", auth: this.oauth2Client });
    try {
      const res = await drive.files.get({
        fileId,
        fields: "id, name, size",
      });
      return {
        size: Number(res.data.size) || 0,
        name: res.data.name || "",
      };
    } catch (error) {
      processLog.error(`⚠️ Failed to fetch metadata for ${fileId}`, error);
      return { size: 0, name: "" };
    }
  }

  /**
   * 验证 File ID 格式
   * Google Drive ID 通常由字母、数字、下划线和连字符组成
   */
  private isValidFileId(fileId: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(fileId);
  }

  /**
   * 获取流式播放信息
   * 返回 URL 和需要的 Headers
   */
  async getStreamInfo(fileId: string): Promise<{ url: string; headers: Record<string, string> }> {
    if (!this.hasValidTokens()) {
      throw new Error("Not authenticated");
    }

    if (!this.isValidFileId(fileId)) {
      throw new Error("Invalid File ID");
    }

    // 确保 token 是新的 (虽然 proxy 会再次检查，但这里用于快速校验)
    const { token } = await this.oauth2Client.getAccessToken();

    if (!token) {
      throw new Error("Failed to get access token");
    }

    // 获取 AppServer 端口
    const port = Number(process.env["VITE_SERVER_PORT"] || 25884);
    const proxyUrl = `http://localhost:${port}/api/proxy/google-drive/${fileId}`;

    return {
      url: proxyUrl,
      headers: {}, // Proxy 不需要额外的 headers
    };
  }

  /**
   * 获取文件流 (用于后端代理)
   */
  /**
   * 获取文件流 (用于后端代理)
   */
  async getFileStream(fileId: string, headers: Record<string, string> = {}): Promise<{ data: any; headers: Record<string, string>; statusCode: number }> {
    if (!this.hasValidTokens()) {
      throw new Error("Not authenticated");
    }

    if (!this.isValidFileId(fileId)) {
      throw new Error("Invalid File ID");
    }

    // 确保 token 是新的
    const { token } = await this.oauth2Client.getAccessToken();
    if (!token) {
      throw new Error("Failed to get access token");
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    // 构造请求头
    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (headers.range) requestHeaders["Range"] = headers.range;

    try {
      // 使用 axios 发起 stream 请求
      const response = await axios({
        method: 'get',
        url: url,
        headers: requestHeaders,
        responseType: 'stream',
        validateStatus: () => true // 允许所有状态码，自己处理错误
      });

      // 提取需要的 headers
      const responseHeaders: Record<string, string> = {};
      
      // 转发关键头
      ["content-type", "content-length", "accept-ranges", "content-range"].forEach(key => {
        const val = response.headers[key];
        if (val) {
          responseHeaders[key] = Array.isArray(val) ? val.join(",") : String(val);
        }
      });

      return { 
        data: response.data, 
        headers: responseHeaders,
        statusCode: response.status 
      };

    } catch (err) {
      const error = err as Error;
      processLog.error(`❌ Error initiating file stream for ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * 下载文件到指定路径
   */
  async downloadFile(fileId: string, destPath: string): Promise<void> {
    if (!this.hasValidTokens()) {
      throw new Error("Not authenticated");
    }

    const drive = google.drive({ version: "v3", auth: this.oauth2Client });
    const fs = require("fs");

    try {
      const dest = fs.createWriteStream(destPath);
      
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      return new Promise((resolve, reject) => {
        res.data
          .on("end", () => {
            processLog.info(`✅ Downloaded file ${fileId} to ${destPath}`);
            resolve();
          })
          .on("error", (err: Error) => {
            processLog.error(`❌ Error downloading file ${fileId}:`, err);
            reject(err);
          })
          .pipe(dest);
      });
    } catch (err) {
      const error = err as Error;
      processLog.error(`❌ Error initiating download for ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * 登出并清除 tokens
   */
  logout(): void {
    this.oauth2Client.revokeCredentials().catch((err) => {
      processLog.warn("⚠️ Error revoking credentials:", err);
    });
    this.store.delete("googleDrive" as keyof ReturnType<typeof useStore>["store"]);
    this.oauth2Client.setCredentials({});
    processLog.info("🚪 Logged out from Google Drive");
  }
}
