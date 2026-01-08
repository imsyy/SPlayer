import { spawn, ChildProcess } from "child_process";
import { app } from "electron";
import { connect } from "net";
import { join } from "path";
import { existsSync, unlinkSync } from "fs";
import { processLog } from "../logger";
import mainWindow from "../windows/main-window";

export class MpvService {
    private static instance: MpvService;
    private mpvProcess: ChildProcess | null = null;
    private socketPath: string = "";
    private client: any = null;
    private isConnected: boolean = false;
    private commandQueue: string[] = [];
    private observationMap: Map<number, string> = new Map();

    private playNonce = 0;
    private mpvProcessNonce: number | null = null;
    private pendingFileLoaded: {
        nonce: number;
        resolve: () => void;
        reject: (err: Error) => void;
        timeout: ReturnType<typeof setTimeout>;
    } | null = null;

    private constructor() {
        this.socketPath = process.platform === "win32"
            ? "\\\\.\\pipe\\mpv-socket"
            : join(app.getPath("userData"), "mpv-socket");
    }

    public static getInstance(): MpvService {
        if (!MpvService.instance) {
            MpvService.instance = new MpvService();
        }
        return MpvService.instance;
    }

    /**
     * 启动 MPV 进程
     * @param url 可选，播放的音频 URL
     * @param title 可选，媒体标题
     */
    public async start(url?: string, title?: string, autoPlay: boolean = true): Promise<void> {
        // 先停止旧进程（如果有）
        if (this.mpvProcess) {
            await this.stop();
        }

        if (process.platform !== "win32" && existsSync(this.socketPath)) {
            try {
                unlinkSync(this.socketPath);
            } catch (e) {
                processLog.error("无法删除旧的 MPV socket:", e);
            }
        }

        const args = [
            "--idle=yes",
            "--input-ipc-server=" + this.socketPath,
            "--no-video",    // 无视频模式
            "--no-terminal", // 不使用终端
            "--cache=yes",                  // 启用缓存
            "--demuxer-max-bytes=120MiB",   // 增大缓存容量
            "--demuxer-readahead-secs=120", // 增加预读时间
            "--audio-device=auto"           // 自动选择音频设备
        ];

        // 关闭自动播放时，用启动参数强制暂停，避免启动后短暂自动播放
        if (!autoPlay) {
            args.push("--pause=yes");
        }

        // 设置媒体标题
        if (title && title.length > 0) {
            args.push(`--force-media-title=${title}`);
        }

        //processLog.info("正在启动 MPV 进程...", args);

        try {
            this.mpvProcess = spawn("mpv", args, { stdio: "ignore" });
            // 将当前进程与本次播放请求关联，便于区分旧进程退出与新进程生命周期
            this.mpvProcessNonce = this.playNonce;

            this.mpvProcess.on("exit", () => {
                //processLog.warn(`MPV 进程已退出`);
                this.mpvProcess = null;
                this.isConnected = false;
                this.client = null;
                this.commandQueue = []; // 清空队列
                // 仅当退出的是当前播放请求关联的进程时，才拒绝等待；忽略旧进程的正常退出
                const pending = this.pendingFileLoaded;
                if (pending && this.mpvProcessNonce === pending.nonce) {
                    this.pendingFileLoaded = null;
                    clearTimeout(pending.timeout);
                    pending.reject(new Error("MPV 进程已退出"));
                }
            });

            this.mpvProcess.on("error", (err) => {
                processLog.error("MPV 进程启动失败:", err);
                this.mpvProcess = null;
                const pending = this.pendingFileLoaded;
                if (pending && this.mpvProcessNonce === pending.nonce) {
                    this.pendingFileLoaded = null;
                    clearTimeout(pending.timeout);
                    pending.reject(new Error("MPV 进程启动失败"));
                }
            });

            // 等待 MPV 启动并创建 socket
            await this.connectWithRetry();

            // 连接成功后再加载文件，确保能收到 file-loaded/playback-restart
            if (url) {
                this.sendCommand("loadfile", [url, "replace"]);
            }
        } catch (error) {
            processLog.error("启动 MPV 失败:", error);
            throw error;
        }
    }

    /**
     * 连接到 MPV IPC Socket
     */
    private async connectWithRetry(retries = 20): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                await new Promise<void>((resolve, reject) => {
                    const client = connect(this.socketPath, () => {
                        this.client = client;
                        this.isConnected = true;
                        this.setupEventListeners();
                        this.flushQueue();
                        resolve();
                    });

                    client.on("error", (err) => {
                        reject(err);
                    });
                });
                return;
            } catch (e) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
        processLog.error("连接 MPV IPC Socket 超时");
        throw new Error("连接 MPV IPC Socket 超时");
    }

    private flushQueue() {
        if (!this.isConnected || !this.client) return;
        //processLog.info(`正在排空命令队列，任务数: ${this.commandQueue.length}`);
        while (this.commandQueue.length > 0) {
            const request = this.commandQueue.shift();
            if (request) this.client.write(request);
        }
    }

    private setupEventListeners() {
        if (!this.client) return;

        let buffer = "";
        this.client.on("data", (data: Buffer) => {
            buffer += data.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const response = JSON.parse(line);
                    // 记录所有非 time-pos 的响应，避免日志刷屏
                    if (response.name !== "time-pos" && response.id !== 1) {
                        //processLog.info("MPV 响应:", line);
                    }
                    this.handleMpvEvent(response);
                } catch (e) {
                    processLog.error("解析 MPV 响应失败:", e, line);
                }
            }
        });

        // 监听关键属性
        this.observeProperty(1, "time-pos");
        this.observeProperty(2, "pause");
        this.observeProperty(3, "volume");
        this.observeProperty(4, "metadata");
        this.observeProperty(5, "duration");
    }

    private handleMpvEvent(event: any) {
        if (event.event === "property-change" || (event.id && event.data !== undefined && !event.event)) {
            const win = mainWindow.getWin();
            if (!win) return;
            const name = event.name || this.observationMap.get(event.id);
            if (name) {
                win.webContents.send("mpv-property-change", {
                    name: name,
                    value: event.data
                });
            }
        } else if (event.event === "file-loaded") {
            //processLog.info("MPV 文件已加载完成");
            if (this.pendingFileLoaded) {
                const pending = this.pendingFileLoaded;
                if (pending.nonce === this.playNonce) {
                    this.pendingFileLoaded = null;
                    clearTimeout(pending.timeout);
                    pending.resolve();
                }
            }

            const win = mainWindow.getWin();
            win?.webContents.send("mpv-file-loaded");
            this.sendCommand("get_property", ["pause"]);
        } else if (event.event === "playback-restart") {
            processLog.info("▶️  MPV 开始播放");
            const win = mainWindow.getWin();
            win?.webContents.send("mpv-playback-restart");
        } else if (event.event === "end-file") {
            //processLog.info(`MPV 文件播放结束，原因: ${event.reason}`);
            const win = mainWindow.getWin();
            win?.webContents.send("mpv-ended", event.reason);
        }
    }

    private observeProperty(id: number, name: string) {
        this.observationMap.set(id, name);
        this.sendCommand("observe_property", [id, name]);
    }

    public sendCommand(command: string, args: any[] = []) {
        const request = JSON.stringify({ command: [command, ...args] }) + "\n";

        if (!this.isConnected || !this.client) {
            if (this.mpvProcess) {
                // 正在连接中，入队
                this.commandQueue.push(request);
            } else {
                processLog.warn(`MPV 未启动，舍弃命令: ${command}`);
            }
            return;
        }

        this.client.write(request);
    }

    public async stop() {
        if (this.mpvProcess) {
            this.sendCommand("quit");
            // 等待进程退出
            await new Promise<void>((resolve) => {
                if (!this.mpvProcess) {
                    resolve();
                    return;
                }
                const timeout = setTimeout(() => {
                    if (this.mpvProcess) {
                        this.mpvProcess.kill();
                    }
                    resolve();
                }, 1000);
                this.mpvProcess.once("exit", () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            this.mpvProcess = null;
            this.isConnected = false;
            this.client = null;
            this.mpvProcessNonce = null;
        }
    }

    /**
     * 播放新歌曲（重启 MPV 进程）
     */
    public async play(url: string, title?: string, autoPlay: boolean = true) {
        const nonce = ++this.playNonce;

        if (this.pendingFileLoaded) {
            const pending = this.pendingFileLoaded;
            this.pendingFileLoaded = null;
            clearTimeout(pending.timeout);
            pending.reject(new Error("新的播放请求覆盖了旧请求"));
        }

        let resolveFileLoaded: (() => void) | null = null;
        let rejectFileLoaded: ((err: Error) => void) | null = null;
        const fileLoadedPromise = new Promise<void>((resolve, reject) => {
            resolveFileLoaded = resolve;
            rejectFileLoaded = reject;
        });

        const timeout = setTimeout(() => {
            const pending = this.pendingFileLoaded;
            if (pending && pending.nonce === nonce) this.pendingFileLoaded = null;
            rejectFileLoaded?.(new Error("等待 MPV file-loaded 超时"));
        }, 15_000);

        this.pendingFileLoaded = {
            nonce,
            resolve: () => resolveFileLoaded?.(),
            reject: (err: Error) => rejectFileLoaded?.(err),
            timeout,
        };

        try {
            // 每次播放都重启进程，并通过启动参数设置标题；连接 IPC 后再 loadfile
            await this.start(url, title, autoPlay);
            await fileLoadedPromise;
        } catch (e) {
            const pending = this.pendingFileLoaded;
            if (pending && pending.nonce === nonce) {
                this.pendingFileLoaded = null;
                clearTimeout(pending.timeout);
            }
            throw e;
        }
    }

    public pause() {
        this.sendCommand("set_property", ["pause", true]);
    }

    public resume() {
        this.sendCommand("set_property", ["pause", false]);
    }

    public seek(seconds: number) {
        this.sendCommand("seek", [seconds, "absolute"]);
    }

    public setVolume(volume: number) {
        this.sendCommand("set_property", ["volume", volume]);
    }

    public setRate(rate: number) {
        this.sendCommand("set_property", ["speed", rate]);
    }

    public terminate() {
        if (this.client) {
            try {
                this.client.destroy();
            } catch (error) {
                processLog.error("销毁 MPV IPC 客户端失败", error);
            }
            this.client = null;
        }

        if (this.mpvProcess) {
            try {
                this.mpvProcess.kill();
            } catch (error) {
                processLog.error("强制终止 MPV 进程失败", error);
            }
            this.mpvProcess = null;
        }

        this.isConnected = false;
        this.commandQueue = [];
        this.observationMap.clear();
        this.mpvProcessNonce = null;
        this.pendingFileLoaded = null;
    }
}
