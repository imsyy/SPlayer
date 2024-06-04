import netEaseApi from "NeteaseCloudMusicApi";
import checkPort from "@main/utils/checkPort";

/**
 * 启动网易云音乐 API 服务器
 *
 * @async
 * @param {Object} options - 服务器配置
 * @param {number} [options.port=11451] - 服务器端口
 * @param {string} [options.host="127.0.0.1"] - 服务器主机地址
 * @returns {Promise<void>} 返回一个 Promise，在 API 服务器成功启动后 resolve
 */
export const startNcmServer = async (
  options = {
    port: 11451,
    host: "127.0.0.1",
  },
) => {
  const serverPort = await checkPort(options.port);
  options.port = serverPort;
  return await netEaseApi.serveNcmApi(options);
};
