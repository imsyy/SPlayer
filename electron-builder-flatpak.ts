// Electron builder config for Flatpak (unpack directory only)
import type { Configuration } from "electron-builder";

const config: Configuration = {
  appId: "com.imsyy.splayer",
  productName: "SPlayer",
  copyright: "Copyright © imsyy 2023",
  directories: {
    buildResources: "build",
  },
  files: [
    "public/**",
    "out/**",
    "!**/.vscode/*",
    "!src/*",
    "!electron.vite.config.{js,ts,mjs,cjs}",
    "!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}",
    "!{.env,.env.*,.npmrc,pnpm-lock.yaml}",
  ],
  asarUnpack: ["public/**", "**/node_modules/better-sqlite3/**"],
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
  linux: {
    executableName: "SPlayer",
    icon: "public/icons/favicon-512x512.png",
    artifactName: "${name}-${version}-${arch}.${ext}",
    // Only build unpacked directory for Flatpak
    target: [
      {
        target: "dir",
        arch: ["x64"],
      },
    ],
    maintainer: "imsyy.top",
    category: "Audio;Music;AudioVideo;",
  },
  npmRebuild: false,
  publish: [],
};

export default config;
