import net from "net";

/**
 * 检查端口是否可用, 如果被占用或不可访问，则尝试下一个端口
 * @param {number} port 端口号
 * @param {number} [maxPort=65535] 端口号上限
 * @returns {Promise<number>} 返回可用的端口号
 */
const checkPort = (port, maxPort = 65535) => {
  return new Promise((resolve, reject) => {
    if (port > maxPort) {
      reject(new Error(`${port} 超出端口范围，无法找到可用端口`));
      return;
    }

    port = Number(port);

    const server = net.createServer();

    server.listen(port, "0.0.0.0", () => {
      server.once("close", () => {
        resolve(port);
      });
      server.close();
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE" || err.code === "EACCES") {
        resolve(checkPort(port + 1, maxPort));
      } else {
        reject(err);
      }
    });
  });
};

export default checkPort;
