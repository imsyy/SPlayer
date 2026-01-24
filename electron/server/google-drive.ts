import { FastifyInstance } from "fastify";
import { GoogleDriveService } from "../main/services/GoogleDriveService";

import { serverLog } from "../main/logger";

/**
 * 初始化 Google Drive 代理服务
 * @param server Fastify 实例
 */
export const initGoogleDriveProxy = async (server: FastifyInstance) => {
  server.get("/proxy/google-drive/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    
    try {
      const driveService = GoogleDriveService.getInstance();
      if (!driveService.hasValidTokens()) {
        return reply.status(401).send("Not authenticated with Google Drive");
      }

      // 获取 Token
      // 这里我们需要更 hack 一点，因为 GoogleDriveService 本身的 oauth2Client 是私有的
      // 但我们可以通过 getStreamInfo 间接获取 token，或者扩展 GoogleDriveService
      // 简单起见，我们直接用 GoogleDriveService 内部逻辑获取 token，
      // 但最干净的方法是扩展 GoogleDriveService 提供一个 getToken() 方法。
      // 不过为了尽量少改动，我们直接在 server 里创建临时 client 或复用 service 方法。
      
      // Update: 既然 Service 是单例且在 Main 进程，虽然 Server 也是在 Main 进程中初始化，
      // 我们可以尝试扩展 GoogleDriveService 来获取 stream。
      
      // 让 GoogleDriveService 提供一个方法返回 stream
      const headersInit: Record<string, string> = {};
      if (req.headers.range) {
        headersInit["range"] = req.headers.range as string;
      }
      
      const { data, headers, statusCode } = await driveService.getFileStream(id, headersInit);

      // 设置响应头
      Object.entries(headers).forEach(([key, value]) => {
        reply.header(key, value);
      });
      // 强制流媒体相关头
      reply.header("Accept-Ranges", "bytes");

      // 设置状态码
      reply.status(statusCode);

      // 返回流
      return reply.send(data);

    } catch (error: any) {
      serverLog.error(`❌ Google Drive Proxy Error [${id}]:`, error);
      return reply.status(500).send(error.message || "Internal Proxy Error");
    }
  });
};
