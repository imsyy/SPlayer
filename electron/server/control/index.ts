import { FastifyInstance } from "fastify";
import { appVersion, appName } from "../../main/utils/config";
import { getTrackInfoFromRenderer } from "../../main/utils/track-info";
import mainWindow from "../../main/windows/main-window";

/**
 * 播放控制接口
 * @param fastify Fastify 实例
 */
export const initControlAPI = async (fastify: FastifyInstance) => {
  // 播放控制路由前缀
  await fastify.register(
    async (fastify) => {
      // 播放
      fastify.get("/play", async (_request, reply) => {
        try {
          const mainWin = mainWindow.getWin();
          if (!mainWin) {
            return reply.code(500).send({
              code: 500,
              message: "主窗口未找到",
              data: null,
            });
          }

          mainWin.webContents.send("play");

          return reply.send({
            code: 200,
            message: "播放命令已发送",
            data: null,
          });
        } catch (error) {
          return reply.code(500).send({
            code: 500,
            message: "播放失败",
            data: error,
          });
        }
      });

      // 暂停
      fastify.get("/pause", async (_request, reply) => {
        try {
          const mainWin = mainWindow.getWin();
          if (!mainWin) {
            return reply.code(500).send({
              code: 500,
              message: "主窗口未找到",
              data: null,
            });
          }

          mainWin.webContents.send("pause");

          return reply.send({
            code: 200,
            message: "暂停命令已发送",
            data: null,
          });
        } catch (error) {
          return reply.code(500).send({
            code: 500,
            message: "暂停失败",
            data: error,
          });
        }
      });

      // 播放/暂停切换
      fastify.get("/toggle", async (_request, reply) => {
        try {
          const mainWin = mainWindow.getWin();
          if (!mainWin) {
            return reply.code(500).send({
              code: 500,
              message: "主窗口未找到",
              data: null,
            });
          }

          mainWin.webContents.send("playOrPause");

          return reply.send({
            code: 200,
            message: "播放/暂停切换命令已发送",
            data: null,
          });
        } catch (error) {
          return reply.code(500).send({
            code: 500,
            message: "播放/暂停切换失败",
            data: error,
          });
        }
      });

      // 下一曲
      fastify.get("/next", async (_request, reply) => {
        try {
          const mainWin = mainWindow.getWin();
          if (!mainWin) {
            return reply.code(500).send({
              code: 500,
              message: "主窗口未找到",
              data: null,
            });
          }

          mainWin.webContents.send("playNext");

          return reply.send({
            code: 200,
            message: "下一曲命令已发送",
            data: null,
          });
        } catch (error) {
          return reply.code(500).send({
            code: 500,
            message: "下一曲失败",
            data: error,
          });
        }
      });

      // 上一曲
      fastify.get("/prev", async (_request, reply) => {
        try {
          const mainWin = mainWindow.getWin();
          if (!mainWin) {
            return reply.code(500).send({
              code: 500,
              message: "主窗口未找到",
              data: null,
            });
          }

          mainWin.webContents.send("playPrev");

          return reply.send({
            code: 200,
            message: "上一曲命令已发送",
            data: null,
          });
        } catch (error) {
          return reply.code(500).send({
            code: 500,
            message: "上一曲失败",
            data: error,
          });
        }
      });

      // 获取状态
      fastify.get("/status", async (_request, reply) => {
        try {
          const mainWin = mainWindow.getWin();
          if (!mainWin) {
            return reply.code(500).send({
              code: 500,
              message: "主窗口未找到",
              data: null,
            });
          }

          // 获取环境信息
          const environment = {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.versions.node,
            electronVersion: process.versions.electron,
            chromeVersion: process.versions.chrome,
            v8Version: process.versions.v8,
          };

          // 返回完整状态
          return reply.send({
            code: 200,
            message: "获取状态成功",
            data: {
              // 软件版本
              version: {
                app: appVersion,
                name: appName,
              },
              // 环境数据
              environment,
              // 连接状态
              connected: true,
              window: "available",
            },
          });
        } catch (error) {
          return reply.code(500).send({
            code: 500,
            message: "获取状态失败",
            data: error,
          });
        }
      });

      // 获取当前播放信息
      fastify.get("/song-info", async (_request, reply) => {
        try {
          const trackInfo = await getTrackInfoFromRenderer();
          return reply.send({
            code: 200,
            message: "获取当前播放信息成功",
            data: trackInfo,
          });
        } catch (error) {
          return reply.code(500).send({
            code: 500,
            message: "获取当前播放信息失败",
            data: error instanceof Error ? error.message : error,
          });
        }
      });
    },
    { prefix: "/control" },
  );
};
