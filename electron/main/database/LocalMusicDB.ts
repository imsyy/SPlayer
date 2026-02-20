import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { readFile, rename } from "node:fs/promises";

/** 列定义接口 */
interface ColumnDef {
  /** 列类型（如 TEXT、INTEGER、REAL） */
  type: string;
  /** 列约束（如 PRIMARY KEY、NOT NULL、UNIQUE） */
  constraints?: string;
  /** 默认值（用于 ALTER TABLE 添加 NOT NULL 列） */
  default?: string | number | null;
}

/** 分析结果表定义 */
const ANALYSIS_SCHEMA: Record<string, ColumnDef> = {
  path: { type: "TEXT", constraints: "PRIMARY KEY" },
  data: { type: "TEXT", constraints: "NOT NULL" }, // JSON string of AudioAnalysis
  mtime: { type: "REAL" },
  size: { type: "INTEGER" },
};

/** 声明式表结构定义 */
const TRACKS_SCHEMA: Record<string, ColumnDef> = {
  id: { type: "TEXT", constraints: "PRIMARY KEY" },
  path: { type: "TEXT", constraints: "NOT NULL UNIQUE" },
  title: { type: "TEXT" },
  artist: { type: "TEXT" },
  album: { type: "TEXT" },
  duration: { type: "REAL" },
  cover: { type: "TEXT" },
  mtime: { type: "REAL" },
  size: { type: "INTEGER" },
  bitrate: { type: "REAL" },
  track_number: { type: "INTEGER" },
};

/** 索引定义 - 自动创建常用查询字段的索引 */
const INDEXES: Record<string, string[]> = {
  // path 已有 UNIQUE 约束，无需额外索引
  idx_tracks_artist: ["artist"],
  idx_tracks_album: ["album"],
};

/** 音乐数据接口 */
export interface MusicTrack {
  /** 文件id */
  id: string;
  /** 文件路径 */
  path: string;
  /** 文件标题 */
  title: string;
  /** 文件艺术家 */
  artist: string;
  /** 文件专辑 */
  album: string;
  /** 文件时长 */
  duration: number;
  /** 文件封面 */
  cover?: string;
  /** 文件修改时间 */
  mtime: number;
  /** 文件大小 */
  size: number;
  /** 文件码率（bps） */
  bitrate?: number;
  /** 曲目序号 */
  track_number?: number;
}

/** 旧版 JSON DB 接口 */
interface LegacyMusicLibraryDB {
  version: number;
  tracks: Record<string, MusicTrack>;
}

/** 本地音乐数据库管理类 */
export class LocalMusicDB {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /** 初始化数据库 */
  public init() {
    if (this.db) return;

    try {
      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");

      // 使用声明式 schema 创建表
      const columnsSQL = Object.entries(TRACKS_SCHEMA)
        .map(([name, def]) => {
          const parts = [name, def.type];
          if (def.constraints) parts.push(def.constraints);
          return parts.join(" ");
        })
        .join(", ");

      const analysisColumnsSQL = Object.entries(ANALYSIS_SCHEMA)
        .map(([name, def]) => {
          const parts = [name, def.type];
          if (def.constraints) parts.push(def.constraints);
          return parts.join(" ");
        })
        .join(", ");

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tracks (${columnsSQL});
        CREATE TABLE IF NOT EXISTS audio_analysis (${analysisColumnsSQL});
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
      `);

      // 自动同步缺失的列和索引
      this.syncSchema();
      this.syncIndexes();
    } catch (e) {
      console.error("Failed to initialize SQLite DB:", e);
      throw e;
    }
  }

  /** 获取音频分析结果 */
  public getAnalysis(path: string): { data: string; mtime: number; size: number } | undefined {
    if (!this.db) return undefined;
    return this.db.prepare("SELECT * FROM audio_analysis WHERE path = ?").get(path) as
      | { data: string; mtime: number; size: number }
      | undefined;
  }

  /** 保存音频分析结果 */
  public saveAnalysis(path: string, data: string, mtime: number, size: number) {
    if (!this.db) return;
    this.db
      .prepare(
        "INSERT OR REPLACE INTO audio_analysis (path, data, mtime, size) VALUES (?, ?, ?, ?)",
      )
      .run(path, data, mtime, size);
  }

  /** 自动同步表结构 - 检测并添加缺失的列 */
  private syncSchema() {
    if (!this.db) return;

    // 获取现有列信息
    const columns = this.db.prepare("PRAGMA table_info(tracks)").all() as { name: string }[];
    const existingColumns = new Set(columns.map((col) => col.name));

    // 检测并添加缺失的列
    for (const [columnName, def] of Object.entries(TRACKS_SCHEMA)) {
      if (!existingColumns.has(columnName)) {
        // NOT NULL 列必须有默认值，否则迁移会失败
        const hasNotNull = def.constraints?.includes("NOT NULL");
        if (hasNotNull && def.default === undefined) {
          throw new Error(
            `[LocalMusicDB] Cannot add NOT NULL column '${columnName}' without a default value`,
          );
        }

        // 构建 ALTER TABLE 语句
        let sql = `ALTER TABLE tracks ADD COLUMN ${columnName} ${def.type}`;
        if (def.default !== undefined) {
          const defaultVal = typeof def.default === "string" ? `'${def.default}'` : def.default;
          sql += ` DEFAULT ${defaultVal}`;
        }
        console.log(`[LocalMusicDB] Adding missing column: ${columnName}`);
        this.db.exec(sql);
      }
    }
  }

  /** 自动同步索引 */
  private syncIndexes() {
    if (!this.db) return;

    for (const [indexName, columns] of Object.entries(INDEXES)) {
      // CREATE INDEX IF NOT EXISTS 是安全的
      const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON tracks (${columns.join(", ")})`;
      this.db.exec(sql);
    }
  }

  /** 关闭数据库 */
  public close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /** 从 JSON 迁移数据 (如果存在) */
  public async migrateFromJsonIfNeeded(jsonPath: string) {
    if (!this.db) return;

    // 检查是否已经有数据 (如果有数据则不迁移)
    const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM tracks");
    const result = countStmt.get() as { count: number };
    if (result.count > 0) return;

    if (existsSync(jsonPath)) {
      try {
        console.log("Migrating local music library from JSON to SQLite...");
        const data = await readFile(jsonPath, "utf-8");
        const parsed = JSON.parse(data) as LegacyMusicLibraryDB;

        if (parsed.tracks) {
          this.addTracks(Object.values(parsed.tracks));
          console.log(`Migrated ${Object.keys(parsed.tracks).length} tracks.`);
        }

        // 迁移完成后重命名 JSON 文件备份
        await rename(jsonPath, `${jsonPath}.bak`);
      } catch (e) {
        console.error("Failed to migrate from JSON:", e);
      }
    }
  }

  /** 获取单曲 */
  public getTrack(path: string): MusicTrack | undefined {
    if (!this.db) return undefined;
    return this.db.prepare("SELECT * FROM tracks WHERE path = ?").get(path) as
      | MusicTrack
      | undefined;
  }

  /** 批量添加/更新歌曲 */
  public addTracks(tracks: MusicTrack[]) {
    if (!this.db || tracks.length === 0) return;

    // 动态生成 INSERT 语句
    const columns = Object.keys(TRACKS_SCHEMA);
    const columnsList = columns.join(", ");
    const valuesList = columns.map((c) => `@${c}`).join(", ");

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO tracks (${columnsList})
      VALUES (${valuesList})
    `);

    const transaction = this.db.transaction((tracks: MusicTrack[]) => {
      for (const track of tracks) {
        // 确保所有列都有值，缺失的使用 null
        const params: Record<string, unknown> = {};
        for (const col of columns) {
          params[col] = (track as unknown as Record<string, unknown>)[col] ?? null;
        }
        insertStmt.run(params);
      }
    });

    transaction(tracks);
  }

  /** 批量删除歌曲 */
  public deleteTracks(paths: string[]) {
    if (!this.db || paths.length === 0) return;

    const deleteStmt = this.db.prepare("DELETE FROM tracks WHERE path = ?");

    const transaction = this.db.transaction((paths: string[]) => {
      for (const path of paths) {
        deleteStmt.run(path);
      }
    });

    transaction(paths);
  }

  /** 清空所有歌曲 */
  public clearTracks() {
    if (!this.db) return;
    this.db.prepare("DELETE FROM tracks").run();
    // 回收磁盘空间，防止数据库文件膨胀
    this.db.exec("VACUUM");
  }

  /** 获取所有歌曲路径 */
  public getAllPaths(): string[] {
    if (!this.db) return [];
    const rows = this.db.prepare("SELECT path FROM tracks").all() as { path: string }[];
    return rows.map((row) => row.path);
  }

  /** 获取所有歌曲 */
  public getAllTracks(): MusicTrack[] {
    if (!this.db) return [];
    return this.db.prepare("SELECT * FROM tracks").all() as MusicTrack[];
  }

  /**
   * 获取指定目录下的所有歌曲
   * @param dirPath 目录路径
   */
  public getTracksInPath(dirPath: string): MusicTrack[] {
    if (!this.db) return [];
    // 确保路径以分隔符结尾，避免匹配到同名前缀的其他目录
    const pathWithSep = dirPath.endsWith("/") || dirPath.endsWith("\\") ? dirPath : dirPath + "/";
    // 先统一路径分隔符
    const unixBase = pathWithSep.replace(/\\/g, "/");
    const winBase = pathWithSep.replace(/\//g, "\\");
    // 转义 LIKE 通配符（使用 ^ 作为转义字符，同时转义 ^ 本身）
    const escapeLike = (s: string) =>
      s.replace(/\^/g, "^^").replace(/%/g, "^%").replace(/_/g, "^_");
    const unixPath = escapeLike(unixBase) + "%";
    const winPath = escapeLike(winBase) + "%";
    // 使用 OR 查询并指定 ESCAPE 字符
    return this.db
      .prepare("SELECT * FROM tracks WHERE path LIKE ? ESCAPE '^' OR path LIKE ? ESCAPE '^'")
      .all(unixPath, winPath) as MusicTrack[];
  }
}
