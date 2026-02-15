import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

/** 缓存条目 */
export interface CacheEntry {
  key: string;
  type: string;
  data: Buffer;
  size: number;
  mtime: number;
  atime: number;
}

/** 缓存数据库 */
export class CacheDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv_cache (
        key TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data BLOB,
        size INTEGER,
        mtime INTEGER,
        atime INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_type ON kv_cache(type);
      CREATE INDEX IF NOT EXISTS idx_atime ON kv_cache(atime);
    `);
  }

  close() {
    this.db.close();
  }

  /** 获取缓存 */
  get(key: string): CacheEntry | undefined {
    const stmt = this.db.prepare("SELECT * FROM kv_cache WHERE key = ?");
    const entry = stmt.get(key) as CacheEntry | undefined;
    if (entry) {
      // 更新访问时间
      this.db.prepare("UPDATE kv_cache SET atime = ? WHERE key = ?").run(Date.now(), key);
    }
    return entry;
  }

  /** 写入缓存 */
  put(key: string, type: string, data: Buffer) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO kv_cache (key, type, data, size, mtime, atime)
      VALUES (@key, @type, @data, @size, @mtime, @atime)
    `);
    stmt.run({
      key,
      type,
      data,
      size: data.length,
      mtime: now,
      atime: now,
    });
  }

  /** 删除缓存 */
  remove(key: string) {
    this.db.prepare("DELETE FROM kv_cache WHERE key = ?").run(key);
  }

  /** 清空某类缓存 */
  clear(type: string) {
    this.db.prepare("DELETE FROM kv_cache WHERE type = ?").run(type);
  }

  /** 清空所有缓存并回收空间 */
  clearAll() {
    this.db.exec("DELETE FROM kv_cache");
    this.db.exec("VACUUM");
  }

  /** 列出某类缓存 */
  list(type: string): Omit<CacheEntry, "data">[] {
    return this.db
      .prepare("SELECT key, type, size, mtime, atime FROM kv_cache WHERE type = ?")
      .all(type) as Omit<CacheEntry, "data">[];
  }

  /** 获取某类缓存总大小 */
  getSize(type: string): number {
    const result = this.db
      .prepare("SELECT SUM(size) as total FROM kv_cache WHERE type = ?")
      .get(type) as { total: number };
    return result.total || 0;
  }

  /** 获取所有缓存总大小 */
  getTotalSize(): number {
    const result = this.db.prepare("SELECT SUM(size) as total FROM kv_cache").get() as {
      total: number;
    };
    return result.total || 0;
  }
}
