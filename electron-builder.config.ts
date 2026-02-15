import type { Configuration } from "electron-builder";

const config: Configuration = {
  // 应用程序的唯一标识符
  appId: "com.imsyy.splayer",
  // 应用程序的产品名称
  productName: "SPlayer",
  copyright: "Copyright © imsyy 2023",
  // 构建资源所在的目录
  directories: {
    buildResources: "build",
  },
  // 包含在最终应用程序构建中的文件列表
  // 使用通配符 ! 表示排除不需要的文件
  files: [
    "public/**",
    "out/**",
    "!**/.vscode/*",
    "!src/*",
    "!electron.vite.config.{js,ts,mjs,cjs}",
    "!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}",
    "!{.env,.env.*,.npmrc,pnpm-lock.yaml}",
  ],
  // 哪些文件将不会被压缩，而是解压到构建目录
  asarUnpack: ["public/**"],
  // 将原生插件作为外部资源复制
  extraResources: [
    {
      from: "native/external-media-integration",
      to: "native",
      filter: ["*.node"],
    },
    {
      from: "native/taskbar-lyric",
      to: "native",
      filter: ["*.node"],
    },
    {
      from: "native/tools",
      to: "native",
      filter: ["*.node"],
    },
  ],
  win: {
    // 可执行文件名
    executableName: "SPlayer",
    // 应用程序的图标文件路径
    icon: "public/icons/logo.ico",
    // Windows 平台全局文件名模板
    artifactName: "${productName}-${version}-${arch}.${ext}",
    // 是否对可执行文件进行签名和编辑
    // signAndEditExecutable: false,
    // 构建类型（架构由命令行参数 --x64 或 --arm64 指定）
    target: [
      // 安装版
      {
        target: "nsis",
        arch: ["x64", "arm64"],
      },
      // 打包版
      {
        target: "portable",
        arch: ["x64", "arm64"],
      },
    ],
    // 注册协议
    protocols: [
      {
        name: "Orpheus Protocol",
        schemes: ["orpheus"],
      },
    ],
  },
  // NSIS 安装器配置
  nsis: {
    // 是否一键式安装
    oneClick: false,
    // 安装程序的生成名称
    artifactName: "${productName}-${version}-${arch}-setup.${ext}",
    // 创建的桌面快捷方式名称
    shortcutName: "${productName}",
    // 卸载时显示的名称
    uninstallDisplayName: "${productName}",
    // 创建桌面图标
    createDesktopShortcut: "always",
    // 是否允许 UAC 提升权限
    allowElevation: true,
    // 是否允许用户更改安装目录
    allowToChangeInstallationDirectory: true,
    // 安装包图标
    installerIcon: "public/icons/favicon.ico",
    // 卸载命令图标
    uninstallerIcon: "public/icons/favicon.ico",
  },
  // Portable 便携版配置
  portable: {
    // 便携版文件名
    artifactName: "${productName}-${version}-${arch}-portable.${ext}",
  },
  // macOS 平台配置
  mac: {
    // 可执行文件名
    executableName: "SPlayer",
    // 应用程序的图标文件路径
    icon: "public/icons/icon.icns",
    // macOS 平台全局文件名模板
    artifactName: "${productName}-${version}-${arch}.${ext}",
    // 不签名
    identity: null,
    hardenedRuntime: false,
    // 是否启用应用程序的 Notarization（苹果的安全审核）
    notarize: false,
    gatekeeperAssess: false,
    darkModeSupport: true,
    category: "public.app-category.music",
    // 扩展信息，如权限描述
    extendInfo: {
      NSCameraUsageDescription: "Application requests access to the device's camera.",
      NSMicrophoneUsageDescription: "Application requests access to the device's microphone.",
      NSDocumentsFolderUsageDescription:
        "Application requests access to the user's Documents folder.",
      NSDownloadsFolderUsageDescription:
        "Application requests access to the user's Downloads folder.",
      // 注册协议
      CFBundleURLTypes: [
        {
          CFBundleURLName: "Orpheus Protocol",
          CFBundleURLSchemes: ["orpheus"],
        },
      ],
    },
    target: [
      // DMG 安装版
      {
        target: "dmg",
        arch: ["x64", "arm64"],
      },
      // 压缩包安装版
      {
        target: "zip",
        arch: ["x64", "arm64"],
      },
    ],
  },
  // Linux 平台配置
  linux: {
    // 可执行文件名
    executableName: "SPlayer",
    // 应用程序的图标文件路径
    icon: "public/icons/favicon-512x512.png",
    // Linux 所有格式的统一文件名模板
    artifactName: "${name}-${version}-${arch}.${ext}",
    // 构建类型 - 支持 x64 和 ARM64 架构
    target: [
      // Pacman 包管理器
      {
        target: "pacman",
        arch: ["x64", "arm64"],
      },
      // AppImage 格式
      {
        target: "AppImage",
        arch: ["x64", "arm64"],
      },
      // Debian 包管理器
      {
        target: "deb",
        arch: ["x64", "arm64"],
      },
      // RPM 包管理器
      {
        target: "rpm",
        arch: ["x64", "arm64"],
      },
      // Snap 包管理器（仅支持 x64 架构）
      // {
      //   target: "snap",
      //   arch: ["x64"],
      // },
      // 压缩包格式
      {
        target: "tar.gz",
        arch: ["x64", "arm64"],
      },
    ],
    // 维护者信息
    maintainer: "imsyy.top",
    // 应用程序类别
    category: "Audio;Music;AudioVideo;",
    // 桌面项
    desktop: {
      entry: {
        // 注册协议
        MimeType: "x-scheme-handler/orpheus;",
      },
    },
  },
  // AppImage 特定配置
  appImage: {
    // AppImage 文件的生成名称
    artifactName: "${name}-${version}-${arch}.${ext}",
  },
  // 是否在构建之前重新编译原生模块
  npmRebuild: false,
  // Electron 下载镜像配置
  electronDownload: {
    mirror: "https://npmmirror.com/mirrors/electron/",
  },
  // 发布配置
  // 先留空，不自动上传
  publish: [],
};

export default config;
