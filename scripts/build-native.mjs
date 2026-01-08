import { execSync } from "child_process";
import process from "process";

// 检测 Rust/Cargo 是否可用
const isRustAvailable = () => {
  try {
    execSync("cargo --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const skipNative = process.env.SKIP_NATIVE_BUILD === "true" || !isRustAvailable();

if (skipNative) {
  const reason = process.env.SKIP_NATIVE_BUILD === "true" 
    ? "SKIP_NATIVE_BUILD 已设置" 
    : "Rust 工具链不可用";
  console.log(`[BuildNative] ${reason}，跳过原生模块构建`);
  console.log("[BuildNative] 这是正常的，Web 部署不需要原生模块");
  process.exit(0);
}

console.log(`[BuildNative] 当前构建目标: ${process.platform}`);

// 构建 Discord RPC 模块（跨平台）
try {
  console.log("[BuildNative] 构建 Discord RPC 模块...");
  execSync("pnpm --filter discord-rpc-for-splayer build", {
    stdio: "inherit",
  });
  console.log("[BuildNative] Discord RPC 模块构建成功");
} catch (error) {
  console.error("[BuildNative] Discord RPC 模块构建失败", error);
  process.exit(1);
}

// 仅在 Windows 平台构建 SMTC 模块
if (process.platform === "win32") {
  try {
    console.log("[BuildNative] 构建 SMTC 模块...");
    execSync("pnpm --filter smtc-for-splayer build", {
      stdio: "inherit",
    });
    console.log("[BuildNative] SMTC 模块构建成功");
  } catch (error) {
    console.error("[BuildNative] SMTC 模块构建失败", error);
    process.exit(1);
  }
} else {
  console.log("[BuildNative] 不是 Windows, 跳过 SMTC 模块构建");
}

// 仅在 Linux 平台构建 MPRIS 模块
if (process.platform === "linux") {
  try {
    console.log("[BuildNative] 构建 MPRIS 模块...");
    execSync("pnpm --filter mpris-for-splayer build", {
      stdio: "inherit",
    });
    console.log("[BuildNative] MPRIS 模块构建成功");
  } catch (error) {
    console.error("[BuildNative] MPRIS 模块构建失败", error);
    process.exit(1);
  }
} else {
  console.log("[BuildNative] 不是 Linux, 跳过 MPRIS 模块构建");
}

console.log("[BuildNative] 所有原生模块构建完成");
