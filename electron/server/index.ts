import { join } from "path";
import { isDev } from "../main/utils/config";
import { serverLog } from "../main/logger";
import { initNcmAPI } from "./netease";
import { initUnblockAPI } from "./unblock";
import { initControlAPI } from "./control";
import { initQQMusicAPI } from "./qqmusic";
import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import fastify from "fastify";

const initAppServer = async () => {
  try {
    const server = fastify({
      routerOptions: {
        // 忽略尾随斜杠
        ignoreTrailingSlash: true,
      },
    });
    // 注册插件
    server.register(fastifyCookie);
    server.register(fastifyMultipart);
    // 生产环境启用静态文件
    if (!isDev) {
      serverLog.info("📂 Serving static files from /renderer");
      server.register(fastifyStatic, {
        root: join(__dirname, "../renderer"),
      });
    }
    // 声明
    server.get("/api", (_, reply) => {
      reply.send({
        name: "SPlayer API",
        description: "SPlayer API service",
        author: "@imsyy",
        list: [
          {
            name: "NeteaseCloudMusicApi",
            url: "/api/netease",
          },
          {
            name: "UnblockAPI",
            url: "/api/unblock",
          },
          {
            name: "ControlAPI",
            url: "/api/control",
          },
          {
            name: "QQMusicAPI",
            url: "/api/qqmusic",
          },
        ],
      });
    });
    // 注册接口
    serverLog.info("🌐 Registering NcmAPI...");
    server.register(initNcmAPI, { prefix: "/api" });
    serverLog.info("🌐 Registering UnblockAPI...");
    server.register(initUnblockAPI, { prefix: "/api" });
    serverLog.info("🌐 Registering ControlAPI...");
    server.register(initControlAPI, { prefix: "/api" });
    serverLog.info("🌐 Registering QQMusicAPI...");
    server.register(initQQMusicAPI, { prefix: "/api" });
    // 启动端口
    const port = Number(process.env["VITE_SERVER_PORT"] || 25884);
    serverLog.info(`🌐 Attempting to listen on port ${port}...`);
    await server.listen({ port, host: "127.0.0.1" });
    serverLog.info(`🌐 AppServer is now listening on port ${port}`);
    return server;
  } catch (error) {
    serverLog.error("🚫 AppServer failed to start:", error);
    console.error("🚫 AppServer failed to start:", error);
    throw error;
  }
};

export default initAppServer;
