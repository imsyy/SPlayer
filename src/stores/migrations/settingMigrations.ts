import { keywords, regexes } from "@/assets/data/exclude";
import { SongUnlockServer } from "@/core/player/SongManager";
import { defaultAMLLDbServer } from "@/utils/meta";
import type { SettingState } from "../setting";

/**
 * 当前设置 Schema 版本号
 */
export const CURRENT_SETTING_SCHEMA_VERSION = 9;

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
  5: (state) => {
    // 迁移排除歌词关键字和正则表达式到用户自定义字段
    // 如果旧字段存在且不为空，则迁移到新字段
    // 定义旧版本的设置状态类型（包含已废弃的字段）
    interface OldSettingState extends Partial<SettingState> {
      excludeKeywords?: string[];
      excludeRegexes?: string[];
    }

    const oldState = state as OldSettingState;
    const oldKeywords = oldState.excludeKeywords;
    const oldRegexes = oldState.excludeRegexes;

    // 如果旧字段包含默认值，则只保留用户自定义的部分
    const userKeywords: string[] = [];
    const userRegexes: string[] = [];

    if (oldKeywords && Array.isArray(oldKeywords)) {
      // 过滤掉默认关键字，只保留用户自定义的
      oldKeywords.forEach((keyword) => {
        if (!keywords.includes(keyword)) {
          userKeywords.push(keyword);
        }
      });
    }

    if (oldRegexes && Array.isArray(oldRegexes)) {
      // 过滤掉默认正则，只保留用户自定义的
      oldRegexes.forEach((regex) => {
        if (!regexes.includes(regex)) {
          userRegexes.push(regex);
        }
      });
    }

    return {
      // 这些字段在 Schema Version 8 时被重命名，导致类型检查报错
      excludeUserKeywords: userKeywords,
      excludeUserRegexes: userRegexes,
    } as Partial<SettingState>;
  },
  6: (state) => {
    interface OldSettingState extends Partial<SettingState> {
      enableTTMLLyric?: boolean;

      hideDiscover?: boolean;
      hidePersonalFM?: boolean;
      hideRadioHot?: boolean;
      hideLike?: boolean;
      hideCloud?: boolean;
      hideDownload?: boolean;
      hideLocal?: boolean;
      hideHistory?: boolean;
      hideUserPlaylists?: boolean;
      hideLikedPlaylists?: boolean;
      hideHeartbeatMode?: boolean;
    }
    const oldState = state as OldSettingState;

    return {
      enableOnlineTTMLLyric: oldState.enableTTMLLyric,

      sidebarHide: {
        hideDiscover: oldState.hideDiscover || false,
        hidePersonalFM: oldState.hidePersonalFM || false,
        hideRadioHot: oldState.hideRadioHot || false,
        hideLike: oldState.hideLike || false,
        hideCloud: oldState.hideCloud || false,
        hideDownload: oldState.hideDownload || false,
        hideLocal: oldState.hideLocal || false,
        hideHistory: oldState.hideHistory || false,
        hideUserPlaylists: oldState.hideUserPlaylists || false,
        hideLikedPlaylists: oldState.hideLikedPlaylists || false,
        hideHeartbeatMode: oldState.hideHeartbeatMode || false,
      },
    };
  },
  7: (state) => {
    interface OldSettingState extends Omit<Partial<SettingState>, "discordRpc"> {
      discordRpc?: {
        enabled: boolean;
        showWhenPaused: boolean;
        displayMode: string;
      };
    }

    const oldState = state as OldSettingState;
    const oldRpc = oldState.discordRpc;

    if (!oldRpc || !oldRpc.displayMode) {
      return {};
    }

    const modeMap: Record<string, "Name" | "State" | "Details"> = {
      name: "Name",
      state: "State",
      details: "Details",
    };

    const currentMode = oldRpc.displayMode;

    if (Object.hasOwn(modeMap, currentMode)) {
      return {
        discordRpc: {
          enabled: oldRpc.enabled,
          showWhenPaused: oldRpc.showWhenPaused,
          displayMode: modeMap[currentMode],
        },
      };
    }

    return {};
  },
  8: (state) => {
    interface OldSettingState extends Partial<SettingState> {
      enableExcludeTTML?: boolean;
      enableExcludeLocalLyrics?: boolean;
      excludeUserKeywords?: string[];
      excludeUserRegexes?: string[];
    }

    const oldState = state as OldSettingState;

    return {
      enableExcludeLyricsTTML: oldState.enableExcludeTTML,
      enableExcludeLyricsLocal: oldState.enableExcludeLocalLyrics,
      excludeLyricsUserKeywords: oldState.excludeUserKeywords,
      excludeLyricsUserRegexes: oldState.excludeUserRegexes,
    };
  },
  9: (state) => {
    interface OldSettingState extends Partial<SettingState> {
      preferQQMusicLyric?: boolean;
    }
    const oldState = state as OldSettingState;
    const preferQM = oldState.preferQQMusicLyric ?? false;

    return {
      enableQQMusicLyric: preferQM,
      lyricPriority: preferQM ? "qm" : "auto",
    };
  },
};
