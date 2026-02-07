import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { readFile, rename } from "node:fs/promises";

/** 当前本地音乐库 DB 版本，用于控制缓存结构升级 */
const CURRENT_DB_VERSION = 3;

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

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY,
          path TEXT NOT NULL UNIQUE,
          title TEXT,
          artist TEXT,
          album TEXT,
          duration REAL,
          cover TEXT,
          mtime REAL,
          size INTEGER,
          bitrate REAL,
          track_number INTEGER
        );
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      // 检查版本
      const versionStmt = this.db.prepare("SELECT value FROM meta WHERE key = ?");
      const versionRow = versionStmt.get("version") as { value: string } | undefined;
      if (!versionRow) {
        this.db
          .prepare("INSERT INTO meta (key, value) VALUES (?, ?)")
          .run("version", CURRENT_DB_VERSION.toString());
      }
    } catch (e) {
      console.error("Failed to initialize SQLite DB:", e);
      throw e;
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

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO tracks (id, path, title, artist, album, duration, cover, mtime, size, bitrate, track_number)
      VALUES (@id, @path, @title, @artist, @album, @duration, @cover, @mtime, @size, @bitrate, @track_number)
    `);

    const transaction = this.db.transaction((tracks: MusicTrack[]) => {
      for (const track of tracks) {
        insertStmt.run({
          ...track,
          // rust 模块的 cover 是 option，需要特殊处理一下
          cover: track.cover ?? null,
        });
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
}
