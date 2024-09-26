import { join } from "path";
import { isDev } from "../main/utils";
import initNcmAPI from "./netease";
import initUnblockAPI from "./unblock";
import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import fastify from "fastify";
import log from "../main/logger";

const initAppServer = async () => {
  try {
    const server = fastify({
      // 忽略尾随斜杠
      ignoreTrailingSlash: true,
    });
    // 注册插件
    server.register(fastifyCookie);
    server.register(fastifyMultipart);
    // 生产环境启用静态文件
    if (!isDev) {
      log.info("📂 Serving static files from /renderer");
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
        ],
      });
    });
    // 注册接口
    server.register(initNcmAPI, { prefix: "/api" });
    server.register(initUnblockAPI, { prefix: "/api" });
    // 启动端口
    const port = Number(import.meta.env["VITE_SERVER_PORT"] || 25884);
    await server.listen({ port });
    log.info(`🌐 Starting AppServer on port ${port}`);
    return server;
  } catch (error) {
    log.error("🚫 AppServer failed to start");
    throw error;
  }
};

export default initAppServer;
