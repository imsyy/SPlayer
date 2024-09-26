import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pathCase } from "change-case";
import NeteaseCloudMusicApi from "NeteaseCloudMusicApi";
import log from "../../main/logger";

// 获取数据
const getHandler = (name: string, neteaseApi: (params: any) => any) => {
  return async (
    req: FastifyRequest<{ Querystring: { [key: string]: string } }>,
    reply: FastifyReply,
  ) => {
    log.info("🌐 Request NcmAPI:", name);
    // 获取 NcmAPI 数据
    try {
      const result = await neteaseApi({
        ...req.query,
        ...(req.body as Record<string, any>),
        cookie: req.cookies,
      });
      return reply.send(result.body);
    } catch (error: any) {
      log.error("❌ NcmAPI Error:", error);
      if ([400, 301].includes(error.status)) {
        return reply.status(error.status).send(error.body);
      }
      return reply.status(500);
    }
  };
};

// 初始化 NcmAPI
const initNcmAPI = async (fastify: FastifyInstance) => {
  // 主信息
  fastify.get("/netease", (_, reply) => {
    reply.send({
      name: "NeteaseCloudMusicApi",
      version: "4.20.0",
      description: "网易云音乐 Node.js API service",
      author: "@binaryify",
      license: "MIT",
      url: "https://gitlab.com/Binaryify/neteasecloudmusicapi",
    });
  });

  // 注册 NeteaseCloudMusicApi 所有接口
  Object.entries(NeteaseCloudMusicApi).forEach(([routerName, neteaseApi]: [string, any]) => {
    // 例外
    if (["serveNcmApi", "getModulesDefinitions"].includes(routerName)) return;
    // 路由名称
    const pathName = pathCase(routerName);
    // 获取数据
    const handler = getHandler(pathName, neteaseApi);
    // 注册路由
    fastify.get(`/netease/${pathName}`, handler);
    fastify.post(`/netease/${pathName}`, handler);
    // 兼容路由 - 中间具有 _ 的路由
    if (routerName.includes("_")) {
      fastify.get(`/netease/${routerName}`, handler);
      fastify.post(`/netease/${routerName}`, handler);
    }
  });

  log.info("🌐 Register NcmAPI successfully");
};

export default initNcmAPI;
