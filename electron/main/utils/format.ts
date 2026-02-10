/**
 * 获取艺术家名称
 * @param artists 艺术家数组
 * @returns 艺术家名称数组
 */
export const getArtistNames = (artists: any): string[] => {
  if (Array.isArray(artists)) {
    return artists
      .map((ar: any) => (typeof ar === "string" ? ar : ar?.name || ""))
      .filter((name) => name && name.trim().length > 0);
  }
  if (typeof artists === "string" && artists.trim().length > 0) {
    return [artists];
  }
  return [];
};
