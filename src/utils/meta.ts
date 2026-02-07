import type { SongLevelType } from "@/types/main";
import type { ImageRenderToolbarProps } from "naive-ui";
import { reduce } from "lodash-es";

// 音质数据
export const songLevelData = {
  l: {
    level: "standard",
    name: "标准音质",
    shortName: "标准",
  },
  m: {
    level: "higher",
    name: "较高音质",
    shortName: "高清",
  },
  h: {
    level: "exhigh",
    name: "极高音质",
    shortName: "极高",
  },
  sq: {
    level: "lossless",
    name: "无损音质",
    shortName: "无损",
  },
  hr: {
    level: "hires",
    name: "Hi-Res",
    shortName: "Hi-Res",
  },
  je: {
    level: "jyeffect",
    name: "高清臻音",
    shortName: "臻音",
  },
  sk: {
    level: "sky",
    name: "沉浸环绕",
    shortName: "沉浸",
  },
  db: {
    level: "dolby",
    name: "杜比全景",
    shortName: "Dolby",
  },
  jm: {
    level: "jymaster",
    name: "超清母带",
    shortName: "母带",
  },
};

/** AI 增强音质 Level（需要过滤的音质） */
export const AI_AUDIO_LEVELS = ["jymaster", "sky", "jyeffect", "vivid"];

/** AI 增强音质 Key（需要过滤的 key） */
export const AI_AUDIO_KEYS = ["jm", "sk", "je"];

/** Fuck DJ Mode 关键词 */
export const DJ_MODE_KEYWORDS = ["DJ", "抖音", "0.9", "0.8", "网红", "车载", "热歌", "慢摇"];

/** 歌曲脏标（Explicit Content）位掩码 */
export const EXPLICIT_CONTENT_MARK = 1048576;

/**
 * 获取音质列表
 * @param level 音质等级数据
 * @param quality 歌曲音质详情
 * @returns 格式化后的音质列表
 */
export const getSongLevelsData = (
  level: Partial<typeof songLevelData>,
  quality?: Record<string, any>,
): {
  name: string;
  level: string;
  value: SongLevelType;
  br?: number;
  size?: number;
}[] => {
  if (!level) return [];
  return reduce(
    level,
    (
      result: {
        name: string;
        level: string;
        value: SongLevelType;
        br?: number;
        size?: number;
      }[],
      value,
      key,
    ) => {
      // 如果没有 quality 数据，则默认显示所有 level
      // 如果有 quality 数据，则只显示 quality 中存在的 level
      if (value && (!quality || quality[key])) {
        result.push({
          name: value.name,
          level: value.level,
          value: key as SongLevelType,
          br: quality?.[key]?.br,
          size: quality?.[key]?.size,
        });
      }
      return result;
    },
    [],
  );
};

/**
 * 排序字段选项
 */
export const sortFieldOptions = {
  default: { name: "默认" },
  title: { name: "标题" },
  artist: { name: "歌手" },
  album: { name: "专辑" },
  filename: { name: "文件名" },
  duration: { name: "时长" },
  size: { name: "大小" },
  createTime: { name: "添加时间" },
  updateTime: { name: "更改时间" },
} as const;

/**
 * 排序方式选项
 */
export const sortOrderOptions = {
  default: { name: "默认" },
  asc: { name: "升序" },
  desc: { name: "降序" },
} as const;

/**
 * 渲染图片工具栏
 * @param nodes 图片工具栏节点
 * @returns 图片工具栏
 */
export const renderToolbar = ({ nodes }: ImageRenderToolbarProps) => {
  return [
    nodes.prev,
    nodes.next,
    nodes.rotateCounterclockwise,
    nodes.rotateClockwise,
    nodes.resizeToOriginalSize,
    nodes.zoomOut,
    nodes.zoomIn,
    nodes.download,
    nodes.close,
  ];
};

/**
 * AMLL TTML DB Server 列表
 * @returns AMLL TTML DB Server 列表
 */
export const amllDbServers = [
  {
    label: "【推荐】GitHub 官方仓库",
    description: "官方源，更新及时，但访问速度可能较慢",
    value:
      "https://raw.githubusercontent.com/Steve-xmh/amll-ttml-db/refs/heads/main/ncm-lyrics/%s.ttml",
  },
  {
    label: "AMLL TTML DB Service (SteveXMH)",
    description: "作者提供的官方镜像源，但免费额度快没了 😂",
    value: "https://amll-ttml-db.stevexmh.net/ncm/%s",
  },
  {
    label: "【默认】AMLL TTML DB 镜像站 (HelloZGY)",
    description: "社区提供的镜像源，感谢 HelloZGY",
    value: "https://amlldb.bikonoo.com/ncm-lyrics/%s.ttml",
  },
  {
    label: "Dimeta 镜像站 v1 (Luorix)",
    description: "社区提供的镜像源，感谢 Luorix",
    value: "https://amll.mirror.dimeta.top/api/db/ncm-lyrics/%s.ttml",
  },
  {
    label: "JSDMirror GitHub 镜像站",
    description: "一个提供免费前端静态资源 CDN 镜像服务的平台",
    value: "https://cdn.jsdmirror.cn/gh/Steve-xmh/amll-ttml-db@main/ncm-lyrics/%s.ttml",
  },
] as const;

/**
 * 默认 AMLL TTML DB Server
 * @returns 默认 AMLL TTML DB Server
 */
export const defaultAMLLDbServer = amllDbServers[2].value;
