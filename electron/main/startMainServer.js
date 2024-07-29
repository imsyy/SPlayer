import { join } from "path";
import express from "express";
import expressProxy from "express-http-proxy";
import checkPort from "./utils/checkPort";

/**
 * 启动主服务器
 * @returns {import('http').Server} HTTP 服务器实例
 */
export const startMainServer = async () => {
  const { MAIN_VITE_MAIN_PORT, MAIN_VITE_SERVER_HOST, MAIN_VITE_SERVER_PORT } = import.meta.env;
  const port = await checkPort(MAIN_VITE_MAIN_PORT ?? 7899);
  process.env.MAIN_VITE_MAIN_PORT = port;
  const apiHost = `http://${MAIN_VITE_SERVER_HOST}:${MAIN_VITE_SERVER_PORT}`;
  const expressApp = express();
  // 代理
  expressApp.use("/", express.static(join(__dirname, "../renderer/")));
  expressApp.use("/api", expressProxy(apiHost));
  console.log("生产模式主进程端口: ", port);
  // 启动 Express 应用服务器，并监听指定端口
  return expressApp.listen(port, "127.0.0.1");
};
