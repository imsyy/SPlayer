export interface WikiUiElement {
  /** 主标题 */
  mainTitle?: { title?: string };
  /** 副标题列表 */
  subTitles?: { title?: string }[];
  /** 文本链接列表 */
  textLinks?: { text?: string }[];
  /** 图片列表 */
  images?: { imageUrl?: string; title?: string }[];
}

/**
 * 创意资源接口
 * 描述百科块中的具体数据项，如相似歌曲、百科条目等
 */
export interface CreativeResource {
  /** 资源的 UI 展示信息 */
  uiElement?: WikiUiElement;
  /** 包含的具体资源列表 */
  resources?: {
    uiElement?: WikiUiElement;
    /** 资源 ID */
    resourceId?: string | number;
    /** 资源类型 */
    resourceType?: string;
  }[];
  /** 创意类型，用于区分不同的数据块 */
  creativeType: string;
}

/**
 * 百科块接口
 * 描述页面结构中的各个模块，如"音乐故事"、"相似歌曲"等
 */
export interface WikiBlock {
  /** 模块代码标识 */
  code: string;
  /** 模块的 UI 信息 */
  uiElement?: WikiUiElement;
  /** 模块包含的创意内容列表 */
  creatives?: CreativeResource[];
}

/**
 * 歌曲百科数据接口
 * 对应 /song/wiki/summary 接口返回的数据
 */
export interface SongWikiData {
  /** 百科模块列表 */
  blocks: WikiBlock[];
  /** 首次收听信息 DTO */
  musicFirstListenDto?: MusicFirstListenDto;
  /** 总播放信息 DTO */
  musicTotalPlayDto?: MusicTotalPlayDto;
  /** 红心/收藏信息 DTO */
  musicLikeSongDto?: MusicLikeSongDto;
}

/**
 * 首次收听信息 DTO
 */
export interface MusicFirstListenDto {
  /** 季节 */
  season?: string;
  /** 时段 */
  period?: string;
  /** 日期字符串 (yyyy.MM.dd) */
  date?: string;
  /** 收听时间戳 */
  listenTime?: number;
  /** 相遇时长描述 */
  meetDurationDesc?: string;
  /** 场景文案 (旧版?) */
  sceneText?: string;
  /** 时间文案 (旧版?) */
  timeText?: string;
  /** 具体时间 (HH:mm) */
  time?: string;
  /** 主标题 */
  mainTitle?: string;
  /** 副标题 */
  subTitles?: string;
  /** 描述 */
  desc?: string;
  /** 相遇时长 (分/秒?) */
  meetDuration?: string;
}

/**
 * 总播放信息 DTO
 */
export interface MusicTotalPlayDto {
  /** 播放次数 */
  playCount: number;
  /** 文案 */
  text: string;
  /** 播放时长 */
  duration?: number;
  /** 主标题 */
  mainTitle?: string;
  /** 副标题 */
  subTitles?: string;
  /** 描述 */
  desc?: string;
  /** 年度最高播放记录 */
  maxPlayTimes?: { year: string; times: number }[];
}

/**
 * 红心/收藏信息 DTO
 */
export interface MusicLikeSongDto {
  /** 是否收藏 */
  like: boolean;
  /** 文案 */
  text: string;
  /** 红色描述文案 */
  redDesc: string;
  /** 是否收藏 (collect 字段?) */
  collect?: boolean;
  /** 收藏时间字符串 */
  redTime?: string;
  /** 收藏时间戳 */
  redTimeStamp?: number;
  /** 主标题 */
  mainTitle?: string;
  /** 副标题 */
  subTitles?: string;
  /** 描述 */
  desc?: string;
}

/**
 * 乐器类型接口
 */
export interface SheetInstrumentTypeVO {
  /** 类型代码 */
  code: number;
  /** 名称 (如: 吉他) */
  name: string;
  /** 图标 URL */
  icon: string;
}

/**
 * 乐谱简要信息 VO
 * 对应 /sheet/list 接口返回列表中的项
 */
export interface SheetSimpleInfoVO {
  /** 乐谱 ID */
  id: number;
  /** 乐谱包 ID */
  sheetPackageId?: number;
  /** 乐谱名称 */
  name: string;
  /** 乐谱类型/乐器列表 */
  type?: SheetInstrumentTypeVO[];
  /** 来源类型 */
  source?: number;
  /** 来源描述 */
  sourceDesc?: string;
  /** 来源图标 */
  sourceIcon?: string | null;
  /** 封面图片 URL */
  coverImageUrl: string;
  /** 总页数 */
  totalPageSize?: number;
  /** 难度 */
  difficulty?: string;
  /** 调号 */
  musicKey?: string;
  /** 演奏版本 (如: 弹唱版) */
  playVersion?: string;
  /** 和弦名称? */
  chordName?: string;
  /** BPM */
  bpm?: number;
  /** 评论数 */
  commentNum?: number;
}

/**
 * 乐谱数据包装接口
 * 对应 /sheet/list 接口返回的 data
 */
export interface SheetData {
  /** 乐谱简要信息列表 */
  musicSheetSimpleInfoVOS?: SheetSimpleInfoVO[];
  /** 乐器类型列表 */
  sheetInstrumentTypeVOList?: SheetInstrumentTypeVO[];
}

/**
 * 聚合的收听数据接口
 * 可能会从 listen 接口或 wiki 接口中获取的数据结构
 */
export interface ListenData {
  data?: {
    musicFirstListenDto?: MusicFirstListenDto;
    musicTotalPlayDto?: MusicTotalPlayDto;
    musicLikeSongDto?: MusicLikeSongDto;
  };
  musicFirstListenDto?: MusicFirstListenDto;
  musicTotalPlayDto?: MusicTotalPlayDto;
  musicLikeSongDto?: MusicLikeSongDto;
}

/**
 * 用户记录 (视图模型的一部分)
 * 整理后的用户个人相关数据
 */
export interface UserRecord {
  /** 首次收听信息 */
  firstListen?: {
    season?: string;
    period?: string;
    date?: string;
    meetDurationDesc?: string;
    sceneText?: string;
    timeText?: string;
  };
  /** 总播放信息 */
  totalPlay?: {
    playCount?: number;
    text?: string;
  };
  /** 红心/收藏信息 */
  likeSong?: {
    like?: boolean;
    text?: string;
    redDesc?: string;
  };
}

/**
 * 乐谱信息 (视图模型的一部分)
 * 用于 UI 展示的乐谱数据
 */
export interface SheetInfo {
  id: number;
  name: string;
  playVersion?: string;
  coverImageUrl: string;
  /** 预览图列表 */
  images?: string[];
}

/**
 * 基本信息项 (视图模型的一部分)
 * 如曲风、语种、BPM 等
 */
export interface BasicInfoItem {
  label: string;
  value?: string;
  tags?: string[];
  type: "text" | "tags";
}

/**
 * 资源信息项 (视图模型的一部分)
 * 如奖项、认证等
 */
export interface ResourceInfoItem {
  image?: string;
  title: string;
  subTitle?: string;
}

/**
 * 最终的视图模型
 * 用于 wiki.vue 组件渲染
 */
export interface WikiViewModel {
  /** 音乐故事/用户记录 */
  story?: UserRecord;
  /** 音乐简介/基本信息 */
  basicInfo: BasicInfoItem[];
  /** 乐谱列表 */
  sheets: SheetInfo[];
  /** 获奖记录 */
  awards: ResourceInfoItem[];
  /** 认证记录 (如综艺节目、影视原声) */
  credentials: ResourceInfoItem[];
  /** 相似歌曲 ID 列表 */
  similarSongs: number[];
}
