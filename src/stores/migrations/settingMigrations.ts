import { SongUnlockServer } from "@/core/player/SongManager";
import type { SettingState } from "../setting";
import { defaultAMLLDbServer } from "@/utils/meta";

/**
 * 当前设置 Schema 版本号
 */
export const CURRENT_SETTING_SCHEMA_VERSION = 4;

/**
 * 迁移函数类型
 * 迁移函数只需返回需要更新的字段，系统会自动合并到原有状态
 */
export type MigrationFunction = (state: Partial<SettingState>) => Partial<SettingState>;

/**
 * 迁移脚本映射表
 * key: 目标版本号
 * value: 从上一版本迁移到该版本的函数
 */
export const settingMigrations: Record<number, MigrationFunction> = {
  3: () => {
    return {
      // ttml 同步
      enableTTMLLyric: false,
      amllDbServer: defaultAMLLDbServer,
    };
  },
  4: () => {
    return {
      songUnlockServer: [
        { key: SongUnlockServer.BODIAN, enabled: true },
        { key: SongUnlockServer.GEQUBAO, enabled: true },
        { key: SongUnlockServer.NETEASE, enabled: true },
        { key: SongUnlockServer.KUWO, enabled: false },
      ],
    };
  },
};

