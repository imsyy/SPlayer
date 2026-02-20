import { app } from "electron";
import { createRequire } from "module";
import path from "path";
import { processLog } from "../logger";

const requireNative = createRequire(import.meta.url);

/**
 * 加载一个原生插件
 * @param fileName 编译后的文件名 (例如: "external-media-integration.node")
 * @param devDirName 开发环境下的目录名 (例如: "external-media-integration")，必须位于项目根目录的 native/ 下
 */
export function loadNativeModule(fileName: string, devDirName: string) {
  let nativeModulePath: string;

  if (app.isPackaged) {
    nativeModulePath = path.join(process.resourcesPath, "native", fileName);
  } else {
    // 适配 tools 模块的路径结构 (native/tools/tools.node)
    // 其他模块可能是 (native/xxx/xxx.node) 或者 (native/xxx/index.node)
    // 这里简单约定 devDirName 就是 native 下的一级目录名
    nativeModulePath = path.join(process.cwd(), "native", devDirName, fileName);
  }

  try {
    return requireNative(nativeModulePath);
  } catch (error) {
    processLog.error(`[NativeLoader] 加载 ${fileName} 失败:`, error);
    return null;
  }
}
