import packageJson from "@/../package.json";

/** 是否为 Nightly 构建 */
export const isNightly = packageJson.version.includes("-nightly");

/** 获取显示用版本号 */
export const getDisplayVersion = () => {
  if (isNightly) {
    // 版本号格式: x.y.z-nightly.yyyymmdd.hash
    // 提取 hash: a3f9c2d
    const parts = packageJson.version.split(".");
    return parts[parts.length - 1];
  }
  return `v${packageJson.version}`;
};

/** 获取完整版本号 */
export const getFullVersion = () => packageJson.version;
