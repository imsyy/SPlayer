import { app } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { serverLog } from "../logger";
import { port } from "../utils/config";

class RustSidecarService {
  private process: import("node:child_process").ChildProcess | null = null;
  private _port: number = port;

  get port(): number {
    return this._port;
  }

  /**
   * 获取 Rust sidecar 二进制路径
   */
  private getBinaryPath(): string | null {
    if (app.isPackaged) {
      const binaryName = process.platform === "win32" ? "ncm-server.exe" : "ncm-server";
      const binaryPath = join(process.resourcesPath, "native", binaryName);
      return existsSync(binaryPath) ? binaryPath : null;
    }

    // 开发环境
    const targetDir = join(process.cwd(), "target");
    // 优先 release 版本
    const releaseBin = join(targetDir, "release", "ncm-server");
    if (existsSync(releaseBin)) return releaseBin;

    const debugBin = join(targetDir, "debug", "ncm-server");
    if (existsSync(debugBin)) return debugBin;

    return null;
  }

  /**
   * 启动 Rust sidecar 进程
   */
  async start(): Promise<boolean> {
    const binaryPath = this.getBinaryPath();
    if (!binaryPath) {
      serverLog.warn("[RustSidecar] ncm-server binary not found");
      return false;
    }

    serverLog.info(`[RustSidecar] Starting ncm-server from: ${binaryPath}`);

    try {
      const { spawn } = await import("node:child_process");
      this.process = spawn(binaryPath, [], {
        env: {
          ...process.env,
          NCM_SERVER_PORT: String(this._port),
          ...(app.isPackaged
            ? {
                NCM_STATIC_DIR: join(process.resourcesPath, "app.asar.unpacked", "out", "renderer"),
              }
            : {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.process.stdout?.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) serverLog.log(`[RustSidecar] ${msg}`);
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) serverLog.error(`[RustSidecar] ${msg}`);
      });

      this.process.on("exit", (code) => {
        serverLog.warn(`[RustSidecar] Process exited with code ${code}`);
        this.process = null;
      });

      this.process.on("error", (err) => {
        serverLog.error(`[RustSidecar] Failed to start: ${err.message}`);
        this.process = null;
      });

      // 等待服务器启动
      await this.waitForReady();
      serverLog.info(`[RustSidecar] Server ready on port ${this._port}`);
      return true;
    } catch (error) {
      serverLog.error("[RustSidecar] Failed to start sidecar:", error);
      return false;
    }
  }

  /**
   * 等待服务器准备就绪
   */
  private async waitForReady(): Promise<void> {
    const maxRetries = 30;
    const retryInterval = 200;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${this._port}/api`);
        if (response.ok) return;
      } catch {
        // 服务器尚未就绪
      }
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }

    throw new Error("Rust sidecar failed to start within timeout");
  }

  /**
   * 停止 Rust sidecar 进程
   */
  stop(): void {
    if (this.process) {
      serverLog.info("[RustSidecar] Stopping sidecar...");
      this.process.kill("SIGTERM");
      this.process = null;
    }
  }
}

export const rustSidecar = new RustSidecarService();
