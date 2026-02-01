import { execSync } from "node:child_process";
import os from "node:os";
import process from "node:process";
import dotenv from "dotenv";
import path from "node:path";

const isRustAvailable = () => {
  try {
    execSync("cargo --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const platform = os.platform();
const isWindows = platform === "win32";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

if (process.env.SKIP_NATIVE_BUILD === "true") {
  console.log("[BuildNative] SKIP_NATIVE_BUILD 已设置，跳过原生模块构建");
  process.exit(0);
}

if (!isRustAvailable()) {
  console.error("[BuildNative] 错误：检测不到 Rust 工具链");
  console.error("[BuildNative] 未设置 SKIP_NATIVE_BUILD，因此必须包含 Rust 环境才能继续");
  console.error(
    "[BuildNative] 安装 Rust (https://rust-lang.org/tools/install/) 或者设置环境变量 SKIP_NATIVE_BUILD=true",
  );
  process.exit(1);
}

console.log(`[BuildNative] 当前构建目标: ${process.platform}`);

try {
  console.log("[BuildNative] 开始构建原生模块...");

  execSync("pnpm --filter external-media-integration build", {
    stdio: "inherit",
  });

  console.log("[BuildNative] 构建 tools 原生模块...");
  execSync("pnpm --filter tools build", {
    stdio: "inherit",
  });

  if (isWindows) {
    console.log("[BuildNative] 构建任务栏歌词原生模块...");
    execSync("pnpm --filter taskbar-lyric build", {
      stdio: "inherit",
    });
  }

  // 有人抱怨编译 wasm 总是有问题，暂时注释掉
  // console.log("[BuildNative] 构建 ferrous-opencc-wasm...");
  // execSync("pnpm --filter ferrous-opencc-wasm build", {
  //   stdio: "inherit",
  // });
} catch (error) {
  console.error("[BuildNative] 模块构建失败", error);
  process.exit(1);
}

console.log("[BuildNative] 原生模块构建完成");
