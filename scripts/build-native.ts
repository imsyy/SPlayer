import dotenv from "dotenv";
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";

interface NativeModule {
  name: string;
  enabled?: boolean;
}

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

const modules: NativeModule[] = [
  {
    name: "external-media-integration",
  },
  {
    name: "tools",
  },
  {
    name: "taskbar-lyric",
    enabled: isWindows,
  },
];

// 构建 napi-rs 原生模块
try {
  const args = process.argv.slice(2);
  const isDev = args.includes("--dev");
  const buildCommand = isDev ? "build:debug" : "build";

  for (const mod of modules) {
    if (mod.enabled === false) {
      continue;
    }
    execSync(`pnpm --filter ${mod.name} ${buildCommand}`, {
      stdio: "inherit",
    });
  }
} catch (error) {
  console.error("[BuildNative] napi-rs 模块构建失败", error);
  process.exit(1);
}

// 构建 ncm-server sidecar
try {
  console.log("[BuildNative] 构建 ncm-server sidecar...");
  execSync("cargo build --package ncm-server --release", {
    cwd: path.resolve(import.meta.dirname, ".."),
    stdio: "inherit",
  });
  console.log("[BuildNative] ncm-server 构建成功");
} catch (error) {
  console.error("[BuildNative] ncm-server 构建失败", error);
  process.exit(1);
}
