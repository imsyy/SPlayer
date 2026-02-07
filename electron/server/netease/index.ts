import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pathCase } from "change-case";
import { serverLog } from "../../main/logger";
import { useStore } from "../../main/store";
import { defaultAMLLDbServer } from "../../main/utils/config";
import NeteaseCloudMusicApi from "@neteasecloudmusicapienhanced/api";

// 初始化 NcmAPI
export const initNcmAPI = async (fastify: FastifyInstance) => {
  // 主信息
  fastify.get("/netease", (_, reply) => {
    reply.send({
      name: "@neteaseapireborn/api",
      description: "网易云音乐 API Enhanced",
      author: "@MoeFurina",
      license: "MIT",
      url: "https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced",
    });
  });

  // 动态路由处理函数
  const dynamicHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const { "*": requestPath } = req.params as { "*": string };

    // 将 path-case 转回 camelCase 或直接匹配下划线路由
    const routerName = Object.keys(NeteaseCloudMusicApi).find((key) => {
      // 跳过非函数属性
      if (typeof (NeteaseCloudMusicApi as Record<string, unknown>)[key] !== "function")
        return false;
      // 匹配 path-case 格式
      return pathCase(key) === requestPath || key === requestPath;
    });

    if (!routerName) {
      return reply.status(404).send({ error: "API not found" });
    }

    const neteaseApi = (
      NeteaseCloudMusicApi as unknown as Record<string, (params: unknown) => Promise<any>>
    )[routerName];
    serverLog.log("🌐 Request NcmAPI:", requestPath);

    try {
      const result = await neteaseApi({
        ...(req.query as Record<string, unknown>),
        ...(req.body as Record<string, unknown>),
        cookie: req.cookies,
      });
      return reply.send(result.body);
    } catch (error: unknown) {
      serverLog.error("❌ NcmAPI Error:", error);
      if (typeof error === "object" && error) {
        const err = error as { status: number; body: unknown; message?: string };
        if ([400, 301].includes(err.status)) {
          return reply.status(err.status).send(err.body);
        }
        return reply
          .status(500)
          .send(err.body || { error: err.message || "Internal Server Error" });
      }
      return reply.status(500).send({ error: String(error) });
    }
  };

  // 注册动态通配符路由
  fastify.get("/netease/*", dynamicHandler);
  fastify.post("/netease/*", dynamicHandler);

  // 获取 TTML 歌词
  fastify.get(
    "/netease/lyric/ttml",
    async (req: FastifyRequest<{ Querystring: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.query;
      if (!id) {
        return reply.status(400).send({ error: "id is required" });
      }
      const store = useStore();
      const server = store.get("amllDbServer") ?? defaultAMLLDbServer;
      const url = server.replace("%s", String(id));
      try {
        const response = await fetch(url);
        if (response.status !== 200) {
          return reply.send(null);
        }
        const data = await response.text();
        return reply.send(data);
      } catch (error) {
        serverLog.error("❌ TTML Lyric Fetch Error:", error);
        return reply.send(null);
      }
    },
  );

  serverLog.info("🌐 Register NcmAPI successfully");
};
