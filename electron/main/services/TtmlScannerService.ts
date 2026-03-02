import { open, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import FastGlob from "fast-glob";
import pLimit from "p-limit";
import { CacheService } from "./CacheService";
import { ipcLog } from "../logger";

// ──────────────────────────────────────────────
// 类型
// ──────────────────────────────────────────────

/** TTML ID 映射条目 */
interface TtmlIdEntry {
    ncmIds: number[];
    filePath: string;
    mtime: number;
}

// ──────────────────────────────────────────────
// TtmlIdMappingCache — 内存 + CacheDB 持久化
// ──────────────────────────────────────────────

class TtmlIdMappingCache {
    /** 双向索引：`id:{ncmId}` / `path:{filePath}` → TtmlIdEntry */
    private cache = new Map<string, TtmlIdEntry>();
    /** CacheDB 中的 key */
    private readonly cacheKey = "ttml-id-mapping";
    /** 防止并发保存 */
    private pendingSave = false;

    // ── 加载 / 保存 ──

    async load(): Promise<void> {
        try {
            const cacheService = CacheService.getInstance();
            await cacheService.init();
            const data = await cacheService.get("lyrics", this.cacheKey);
            if (data) {
                const parsed = JSON.parse(data.toString("utf-8"));
                this.cache = new Map(Object.entries(parsed));
                ipcLog.info(`[TtmlIdMappingCache] 加载了 ${this.cache.size} 条缓存`);
            }
        } catch (e) {
            ipcLog.error("[TtmlIdMappingCache] 加载缓存失败:", e);
        }
    }

    private async saveInternal(): Promise<void> {
        if (this.pendingSave) return;
        this.pendingSave = true;
        try {
            const cacheService = CacheService.getInstance();
            await cacheService.init();
            const data = JSON.stringify(Object.fromEntries(this.cache));
            await cacheService.put("lyrics", this.cacheKey, data);
        } catch (e) {
            ipcLog.error("[TtmlIdMappingCache] 保存缓存失败:", e);
        } finally {
            this.pendingSave = false;
        }
    }

    async save(): Promise<void> {
        await this.saveInternal();
    }

    // ── 查询 ──

    getById(ncmId: number): TtmlIdEntry | undefined {
        return this.cache.get(`id:${ncmId}`);
    }

    getByPath(filePath: string): TtmlIdEntry | undefined {
        return this.cache.get(`path:${filePath}`);
    }

    getByIds(ncmIds: number[]): TtmlIdEntry | undefined {
        for (const id of ncmIds) {
            const cached = this.cache.get(`id:${id}`);
            if (cached) return cached;
        }
        return undefined;
    }

    // ── 写入 / 删除 ──

    async set(
        ncmIds: number[],
        filePath: string,
        mtime: number,
        options: { autoSave: boolean } = { autoSave: true },
    ): Promise<void> {
        // 清除旧映射
        const oldCache = this.cache.get(`path:${filePath}`);
        if (oldCache) {
            for (const oldId of oldCache.ncmIds) {
                this.cache.delete(`id:${oldId}`);
            }
        }

        const entry: TtmlIdEntry = { ncmIds, filePath, mtime };
        this.cache.set(`path:${filePath}`, entry);
        for (const ncmId of ncmIds) {
            this.cache.set(`id:${ncmId}`, entry);
        }

        if (options.autoSave) {
            await this.saveInternal();
        }
    }

    async delete(
        filePath: string,
        options: { autoSave: boolean } = { autoSave: true },
    ): Promise<void> {
        const cached = this.cache.get(`path:${filePath}`);
        if (cached) {
            for (const id of cached.ncmIds) {
                this.cache.delete(`id:${id}`);
            }
            this.cache.delete(`path:${filePath}`);
            if (options.autoSave) {
                await this.saveInternal();
            }
        }
    }

    clear(): void {
        this.cache.clear();
    }
}

// ──────────────────────────────────────────────
// 单例 & 全局状态
// ──────────────────────────────────────────────

let ttmlIdCache: TtmlIdMappingCache | null = null;
let loadPromise: Promise<void> | null = null;
let isScanning = false;

const getTtmlIdCache = async (): Promise<TtmlIdMappingCache> => {
    if (!ttmlIdCache) {
        ttmlIdCache = new TtmlIdMappingCache();
    }
    if (!loadPromise) {
        loadPromise = ttmlIdCache.load();
    }
    await loadPromise;
    return ttmlIdCache;
};

// ──────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────

/** fast-glob 配置 */
const globOpt = (cwd?: string) => ({
    cwd,
    caseSensitiveMatch: false,
});

/**
 * 从 TTML 内容中提取 ncmMusicId
 * 支持多个 ID；仅需传入文件头部内容即可
 */
export const extractNcmIdFromTTML = (ttmlContent: string): number[] => {
    try {
        const matches = ttmlContent.matchAll(
            /<amll:meta\s+key=["']ncmMusicId["']\s+value=["'](\d+)["']/g,
        );
        const ids: number[] = [];
        for (const match of matches) {
            if (match[1]) {
                const ncmId = parseInt(match[1], 10);
                if (!isNaN(ncmId) && ncmId > 0 && !ids.includes(ncmId)) {
                    ids.push(ncmId);
                }
            }
        }
        return ids;
    } catch {
        return [];
    }
};

// ──────────────────────────────────────────────
// 核心：全量 / 增量扫描
// ──────────────────────────────────────────────

/**
 * 扫描歌词目录中的 TTML 文件，提取 ncmMusicId 并建立缓存
 * - 并发限制 p-limit(5)，避免卡顿
 * - 比较 mtime 跳过未变更文件
 * @param lyricDirs 歌词目录列表
 * @returns 新增/更新的映射数量
 */
export async function scanTtmlIdMapping(lyricDirs: string[]): Promise<number> {
    if (isScanning) {
        ipcLog.info("[scanTtmlIdMapping] 扫描正在进行中，跳过本次请求");
        return 0;
    }
    isScanning = true;

    try {
        const cache = await getTtmlIdCache();
        let scannedCount = 0;
        let hasChanges = false;

        // 并发限制
        const limit = pLimit(5);

        // 收集所有 TTML 文件路径
        const filePaths = (
            await Promise.all(
                lyricDirs.map(async (dir) => {
                    try {
                        const files = await FastGlob("**/*.ttml", globOpt(dir));
                        return files.map((file) => join(dir, file));
                    } catch (e) {
                        ipcLog.warn(`[scanTtmlIdMapping] 扫描目录失败: ${dir}`, e);
                        return [];
                    }
                }),
            )
        ).flat();

        const totalFiles = filePaths.length;
        let processedCount = 0;

        // 并发处理每个文件
        await Promise.all(
            filePaths.map((filePath) =>
                limit(async () => {
                    try {
                        const fileStat = await stat(filePath);
                        // 如果文件未变更，跳过
                        const existingCache = cache.getByPath(filePath);
                        if (existingCache && fileStat.mtimeMs === existingCache.mtime) {
                            return;
                        }

                        // 仅读取文件前 5KB 来提取元数据（性能优化）
                        let ttmlHeader = "";
                        let fileHandle;
                        try {
                            fileHandle = await open(filePath, "r");
                            const buffer = Buffer.allocUnsafe(5000);
                            const { bytesRead } = await fileHandle.read(buffer, 0, 5000, 0);
                            ttmlHeader = buffer.toString("utf-8", 0, bytesRead);
                        } catch {
                            return;
                        } finally {
                            await fileHandle?.close();
                        }

                        const extractedIds = extractNcmIdFromTTML(ttmlHeader);
                        if (extractedIds.length > 0) {
                            await cache.set(extractedIds, filePath, fileStat.mtimeMs, { autoSave: false });
                            hasChanges = true;
                            scannedCount++;
                        }
                    } catch (e) {
                        ipcLog.warn(`[scanTtmlIdMapping] 处理文件失败: ${filePath}`, e);
                    } finally {
                        processedCount++;
                        if (processedCount % 50 === 0) {
                            ipcLog.info(`[scanTtmlIdMapping] 进度: ${processedCount}/${totalFiles}`);
                        }
                    }
                }),
            ),
        );

        // 一次性保存
        if (hasChanges) {
            await cache.save();
        }

        return scannedCount;
    } finally {
        isScanning = false;
    }
}

// ──────────────────────────────────────────────
// 核心：读取本地歌词（替代原方法）
// ──────────────────────────────────────────────

/**
 * 读取本地目录中的歌词（通过 ID 查找）
 * 1. 优先查询 ncmMusicId 缓存（命中则读取文件，验证 mtime）
 * 2. 回退到文件名模式匹配（`{id}.ttml` / `{id}.lrc`）
 * 3. 若仍未找到 TTML，后台异步触发 scanTtmlIdMapping
 *
 * @param lyricDirs 歌词目录列表
 * @param id 歌曲 ID（NCM ID）
 * @returns { lrc, ttml }
 */
export async function readLocalLyricImpl(
    lyricDirs: string[],
    id: number,
): Promise<{ lrc: string; ttml: string }> {
    const result = { lrc: "", ttml: "" };
    const cache = await getTtmlIdCache();
    let isCacheDirty = false;

    // ── 步骤 1：查询 ncmMusicId 缓存 ──
    const cached = cache.getByIds([id]);
    if (cached) {
        try {
            const fileStat = await stat(cached.filePath);
            if (fileStat.mtimeMs === cached.mtime) {
                // 文件未变更，直接读取
                result.ttml = await readFile(cached.filePath, "utf-8");
                ipcLog.info(`[readLocalLyric] 从缓存中找到 TTML: ${cached.filePath}`);
            } else {
                // 文件已更新，删除旧缓存
                await cache.delete(cached.filePath, { autoSave: false });
                isCacheDirty = true;
            }
        } catch (e) {
            ipcLog.warn(
                `[readLocalLyric] 访问缓存的 TTML 文件失败，删除缓存: ${cached.filePath}`,
                e,
            );
            await cache.delete(cached.filePath, { autoSave: false });
            isCacheDirty = true;
        }
    }

    // ── 步骤 2：文件名模式匹配 ──
    // 查找 LRC
    if (!result.lrc) {
        const lrcPattern = `**/{,*.}${id}.lrc`;
        for (const dir of lyricDirs) {
            try {
                const lrcFiles = await FastGlob(lrcPattern, globOpt(dir));
                if (lrcFiles.length > 0) {
                    const filePath = join(dir, lrcFiles[0]);
                    result.lrc = await readFile(filePath, "utf-8");
                    break;
                }
            } catch (e) {
                ipcLog.warn(`[readLocalLyric] 查找 LRC 文件时路径异常，跳过: ${dir}`, e);
            }
        }
    }

    // 查找 TTML（如果缓存未命中）
    if (!result.ttml) {
        const ttmlPattern = `**/{,*.}${id}.ttml`;
        for (const dir of lyricDirs) {
            try {
                const ttmlFiles = await FastGlob(ttmlPattern, globOpt(dir));
                if (ttmlFiles.length > 0) {
                    const filePath = join(dir, ttmlFiles[0]);
                    result.ttml = await readFile(filePath, "utf-8");
                    // 将文件名匹配到的结果也存入缓存
                    const fileStat = await stat(filePath);
                    await cache.set([id], filePath, fileStat.mtimeMs, { autoSave: false });
                    isCacheDirty = true;
                    break;
                }
            } catch (e) {
                ipcLog.warn(`[readLocalLyric] 查找 TTML 文件时路径异常，跳过: ${dir}`, e);
            }
        }
    }

    // ── 步骤 3：后台扫描 ──
    if (!result.ttml && lyricDirs.length > 0) {
        ipcLog.info(`[readLocalLyric] 未找到TTML，将在后台扫描目录建立缓存...`);
        scanTtmlIdMapping(lyricDirs)
            .then((count) => {
                ipcLog.info(`[readLocalLyric] 后台扫描完成，建立了 ${count} 条缓存`);
            })
            .catch((e) => {
                ipcLog.warn(`[readLocalLyric] 后台扫描失败:`, e);
            });
    }

    // 保存脏缓存
    if (isCacheDirty) {
        await cache.save();
    }

    return result;
}
