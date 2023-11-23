import { join } from "path";
import express from "express";
import expressProxy from "express-http-proxy";

/**
 * 启动主服务器
 * @returns {import('http').Server} HTTP 服务器实例
 */
export const startMainServer = async () => {
  const { MAIN_VITE_MAIN_PORT, MAIN_VITE_SERVER_HOST, MAIN_VITE_SERVER_PORT } = import.meta.env;
  const port = MAIN_VITE_MAIN_PORT ?? 7899;
  const apiHost = `http://${MAIN_VITE_SERVER_HOST}:${MAIN_VITE_SERVER_PORT}`;
  const expressApp = express();
  // 代理
  expressApp.use("/", express.static(join(__dirname, "../renderer/")));
  expressApp.use("/api", expressProxy(apiHost));
  // 启动 Express 应用服务器，并监听指定端口
  return expressApp.listen(port, "127.0.0.1");
};
