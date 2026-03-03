import { open, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import FastGlob from "fast-glob";
import pLimit from "p-limit";
import { CacheService } from "./CacheService";
import { ipcLog } from "../logger";

// ──────────────────────────────────────────────
// 类型
// ──────────────────────────────────────────────

interface TtmlIdEntry {
    ncmIds: number[];
    musicNames: string[];
    artists: string[];
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

    /**
     * 判断两个字符串是否包含匹配（忽略大小写和空格）
     * 增加长度差异判断，防止'Track 1'匹配到'Track 10'
     */
    private isContainsMatch(a: string, b: string): boolean {
        const al = a.trim().toLowerCase();
        const bl = b.trim().toLowerCase();
        if (!al || !bl) return false;
        if (al === bl) return true;

        // 对过短的字符串（小于3），必须精确匹配
        if (al.length < 3 || bl.length < 3) return false;

        // 如果一个是另一个的包含子串，但长度过于相近，可能意味着只是版本号或 track number 不同，应当被拒绝
        const diff = Math.abs(al.length - bl.length);
        const minLen = Math.min(al.length, bl.length);

        // 例如 track 1 (7) 和 track 10 (8)，diff = 1，minLen * 0.3 = 2.1，拒绝包含匹配
        if (diff > minLen * 0.3) {
            return al.includes(bl) || bl.includes(al);
        }

        return false;
    }

    /**
     * 通过歌名和（可选的）歌手信息进行联合查找
     * 将底层所有的元素转化为 Flat Array 进行灵活过滤
     */
    getBySongAndArtist(songName: string, queryArtists?: string[]): TtmlIdEntry | undefined {
        if (!songName || !songName.trim()) return undefined;
        const targetSongName = songName.trim().toLowerCase();
        const targetArtists = (queryArtists || []).map((a) => a.trim().toLowerCase()).filter(Boolean);

        // 去重获取所有的有效 Entry（因为 path 和 id 都指向了同一个 Object）
        const allEntries = Array.from(
            new Set(
                Array.from(this.cache.values())
            )
        );

        // 第一优先级：歌名和歌手同时匹配
        if (targetArtists.length > 0) {
            const matchedWithArtist = allEntries.find(entry => {
                // 歌名匹配
                const songMatch = entry.musicNames.some(name => this.isContainsMatch(name, targetSongName));
                if (!songMatch) return false;

                // 歌手匹配（只要目标的一个歌手名，在缓存的某一个歌手名中存在部分包含关系即可）
                const artistMatch = targetArtists.some(targetArtist =>
                    entry.artists.some(cacheArtist => this.isContainsMatch(cacheArtist, targetArtist))
                );
                return artistMatch;
            });
            if (matchedWithArtist) return matchedWithArtist;
        }

        // 第二优先级降级：如果没有传歌手，或者传了但是歌手没匹配上，回退到只匹配歌名
        const matchedOnlySong = allEntries.find(entry =>
            entry.musicNames.some(name => this.isContainsMatch(name, targetSongName))
        );
        return matchedOnlySong;
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
        musicNames: string[],
        artists: string[],
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

        const entry: TtmlIdEntry = { ncmIds, musicNames, artists, filePath, mtime };
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
 * 从 TTML 内容中提取 ncmMusicId 和 musicName 和 artists
 * 支持多个 ID；仅需传入文件头部内容即可
 */
export const extractMetadataFromTTML = (ttmlContent: string): { ncmIds: number[]; musicNames: string[]; artists: string[] } => {
    const result = { ncmIds: [] as number[], musicNames: [] as string[], artists: [] as string[] };
    try {
        const idMatches = ttmlContent.matchAll(
            /<amll:meta\s+key=["']ncmMusicId["']\s+value=["'](\d+)["']/g,
        );
        for (const match of idMatches) {
            if (match[1]) {
                const ncmId = parseInt(match[1], 10);
                if (!isNaN(ncmId) && ncmId > 0 && !result.ncmIds.includes(ncmId)) {
                    result.ncmIds.push(ncmId);
                }
            }
        }

        const nameMatches = ttmlContent.matchAll(
            /<amll:meta\s+key=["']musicName["']\s+value=["']([^"']+)["']/g,
        );
        for (const match of nameMatches) {
            if (match[1]) {
                const musicName = match[1].trim();
                const lowerName = musicName.toLowerCase();
                if (lowerName && !result.musicNames.includes(lowerName)) {
                    result.musicNames.push(lowerName);
                }
            }
        }

        // 提取艺术家 (artists, artist, singer, 或者 singers)
        const artistMatches = ttmlContent.matchAll(
            /<amll:meta\s+key=["'](?:artists?|singers?)["']\s+value=["']([^"']+)["']/gi,
        );
        for (const match of artistMatches) {
            if (match[1]) {
                const artistStr = match[1].trim();
                // 分解类似 "周杰伦, 孙燕姿" 或 "周杰伦 / 孙燕姿"
                const artistParts = artistStr.split(/[,/、&;；]+/).map(a => a.trim().toLowerCase()).filter(Boolean);
                for (const part of artistParts) {
                    if (part && !result.artists.includes(part)) {
                        result.artists.push(part);
                    }
                }
            }
        }
    } catch {
        // ignore
    }
    return result;
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

                        const { ncmIds, musicNames, artists } = extractMetadataFromTTML(ttmlHeader);
                        if (ncmIds.length > 0 || musicNames.length > 0) {
                            await cache.set(ncmIds, musicNames, artists, filePath, fileStat.mtimeMs, { autoSave: false });
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
 * 读取本地目录中的歌词（通过 ID 或歌名查找）
 * 0. 优先查询歌名缓存
 * 1. 优先查询 ncmMusicId 缓存（命中则读取文件，验证 mtime）
 * 2. 回退到文件名模式匹配（`{id}.ttml` / `{id}.lrc`）
 * 3. 若仍未找到 TTML，后台异步触发 scanTtmlIdMapping
 *
 * @param lyricDirs 歌词目录列表
 * @param id 歌曲 ID（NCM ID）
 * @param songName 歌曲名称
 * @returns { lrc, ttml, matchedNcmId }
 */
export async function readLocalLyricImpl(
    lyricDirs: string[],
    id: number,
    songName?: string,
    artists?: string[]
): Promise<{ lrc: string; ttml: string; matchedNcmId?: number }> {
    const result: { lrc: string; ttml: string; matchedNcmId?: number } = { lrc: "", ttml: "" };
    const cache = await getTtmlIdCache();
    let isCacheDirty = false;

    // ── 步骤 0：查询歌名（与歌手）缓存 ──
    let cachedByName: ReturnType<typeof cache.getBySongAndArtist> | undefined;
    if (songName) {
        cachedByName = cache.getBySongAndArtist(songName, artists);
        if (cachedByName) {
            const filePath = cachedByName.filePath;
            try {
                const fileStat = await stat(filePath);
                if (fileStat.mtimeMs === cachedByName.mtime) {
                    result.ttml = await readFile(filePath, "utf-8");
                    result.matchedNcmId = cachedByName.ncmIds.length > 0 ? cachedByName.ncmIds[0] : undefined;
                    ipcLog.info(`[readLocalLyric] 歌名缓存命中 TTML: ${filePath}`);
                } else {
                    await cache.delete(filePath, { autoSave: false });
                    isCacheDirty = true;
                    // @ts-ignore
                    cachedByName = undefined;
                }
            } catch (e) {
                await cache.delete(filePath, { autoSave: false });
                isCacheDirty = true;
                // @ts-ignore
                cachedByName = undefined;
            }
        }
    }

    // ── 步骤 1：查询 ncmMusicId 缓存 ──
    if (!result.ttml) {
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
                    await cache.set([id], [], [], filePath, fileStat.mtimeMs, { autoSave: false });
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

/**
 * 尝试通过歌名快速在本地缓存中寻找对应的 TTML 文件信息并提取其关联的 ncmId
 * @param lyricDirs 本地歌词目录列表
 * @param songName 本地歌曲标题
 * @param artists 本地歌手信息
 * @returns 命中的 ncmId 或 null
 */
export async function matchLocalTtmlByName(
    lyricDirs: string[],
    songName: string,
    artists?: string[],
): Promise<number | null> {
    if (!songName) return null;
    const cache = await getTtmlIdCache();
    const cached = cache.getBySongAndArtist(songName, artists);

    if (cached && cached.ncmIds.length > 0) {
        ipcLog.info(
            `[matchLocalTtmlByName] 本地 TTML 歌名缓存命中: "${songName}" -> ID ${cached.ncmIds[0]}`,
        );
        return cached.ncmIds[0];
    }

    // 初次查询若未命中，直接返回 null 以不阻塞主流程，并触发异步后台扫描以备后续使用
    if (!cached && lyricDirs.length > 0) {
        scanTtmlIdMapping(lyricDirs).catch((e) => {
            ipcLog.warn(`[matchLocalTtmlByName] 后台扫描失败:`, e);
        });
    }

    return null;
}

