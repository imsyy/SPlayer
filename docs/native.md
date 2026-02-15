# 原生插件集成指南

SPlayer 使用 Rust 编写的原生插件来实现更深度的系统集成。你可以在 `native` 文件夹下找到所有的原生插件。

目前 SPlayer 只有一个原生插件 `external-media-integration` 用于与 Windows、Linux 和 MacOS 上的媒体控件，以及 Discord RPC 进行集成。

## 外部媒体集成模块 (external-media-integration)

> [!NOTE]
> 在项目中可能会以 EMI 的缩写形式出现

### 功能介绍

该插件主要提供两大核心功能：系统级媒体控件集成和 Discord Rich Presence (RPC) 支持。

1. **系统媒体控件集成**
   - **跨平台支持**：
     - **Windows**: 集成系统媒体传输控件 (SMTC)，支持任务栏缩略图按钮和锁屏界面控制。
     - **Linux**: 使用 `mpris_server` 提供的高层抽象 `Player` 结构体，支持 GNOME/KDE 等桌面环境的媒体控制。
     - **MacOS**: 集成控制中心 (Control Center) 和锁屏媒体信息 (MPNowPlayingInfoCenter)。
   - **双向同步**：
     - **状态同步**：将播放器的播放/暂停状态、歌曲元数据（标题、歌手、专辑、封面）、播放进度实时同步到系统。
     - **控制响应**：响应系统的媒体按键事件，包括播放、暂停、上一首、下一首、进度跳转 (Seek)、随机/循环模式切换。

2. **Discord Rich Presence**
   - **实时状态展示**：在 Discord 个人资料中展示当前正在播放的歌曲信息。
   - **详细信息**：显示歌曲名、歌手、专辑封面、播放进度条。
   - **交互按钮**：提供 "Listen" 按钮，点击可跳转到歌曲链接（目前支持网易云音乐链接）。
   - **自定义配置**：支持配置暂停时是否显示、显示模式（强调歌名或歌手）等。

### 技术实现

该模块基于 Rust 语言编写，使用 [`napi-rs`](https://github.com/napi-rs/napi-rs) 构建为 Node.js 原生扩展 (Addon)，兼顾高性能与开发效率。

1. **架构设计**
   - **抽象层**：定义了 `SystemMediaControls` Trait，统一了不同平台的接口调用方式，使得 Electron 前端无需关心底层平台差异。
   - **多线程模型**：
     - **系统媒体控件**：直接在 N-API 线程中运行（Windows 实现内部有异步处理）。
     - **Discord RPC**：为了防止网络 IO 或 IPC 阻塞 Node.js 事件循环，Discord RPC 逻辑运行在独立的 Rust 线程 (`std::thread`) 中。主线程通过 `std::sync::mpsc` 通道发送更新指令。

2. **平台实现细节**
   - **Windows**: 依赖 `windows` crate，调用 WinRT API (`Windows.Media.Playback`, `Windows.Media.Control`)。通过创建一个内存中的 `MediaPlayer` 实例来获取并操作 `SystemMediaTransportControls` 接口，从而更新时间轴和媒体属性。
   - **Linux**: 依赖 `mpris-server` crate，使用 `mpris_server` 提供的高层抽象 `Player` 结构体来管理 MPRIS 接口，自动处理 D-Bus 通信和属性暴露。
   - **MacOS**: 使用 `objc2` 系列 crate (bindgen) 调用 Objective-C 运行时，操作 `MPNowPlayingInfoCenter` (信息显示) 和 `MPRemoteCommandCenter` (事件接收)。

3. **特色处理**
   - **Discord 时间戳 Hack**: 为了在 Discord 上实现“暂停”状态的视觉效果（进度条静止），在暂停时会将开始和结束时间戳平移到未来（+1年）以冻结计时器。注意冻结时播放进度会变成0.
   - **封面处理**: 针对网易云音乐的封面 URL 进行了特殊处理（添加缩放参数），以适应不同平台的显示需求。

### 目录结构

```
native/external-media-integration/
├── src
│    ├── discord.rs         # Discord RPC 集成
│    ├── lib.rs             # 包含了暴露给 Node.js 的函数
│    ├── logger.rs          # 日志系统
│    ├── model.rs           # 前后端通信的结构体等
│    └── sys_media          # 不同平台的媒体控件实现
│        ├── linux.rs       # Linux MPRIS 集成
│        ├── macos.rs       # MacOS MPNowPlayingInfoCenter 和 MPRemoteCommandCenter 集成
│        ├── mod.rs         # 定义跨平台的 SystemMediaControls 接口
│        └── windows.rs     # Windows SMTC 相关集成
├── Cargo.toml              # Rust 依赖配置
└── index.d.ts              # 自动生成的 TypeScript 类型定义
```

### 构建命令

```bash
cd native/external-media-integration
pnpm build           # 构建 release 版本
pnpm build:debug     # 构建 debug 版本
```

### 日志路径

`%APPDATA%/splayer/logs/external-media-integration/`

## 构建

在项目根目录运行以下命令可一次性构建所有原生模块：

```bash
pnpm build:native
```

此命令会执行 `scripts/build-native.ts` 脚本，构建所有模块并放入各自的根目录下以便 Node.js 加载

## 环境要求

### Rust 工具链

```bash
# 安装 Rust (访问 https://rustup.rs/)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 验证安装
rustc --version
cargo --version
```

### Windows 构建工具

SMTC 模块依赖 Windows SDK，需要安装：

1. 下载 [Visual Studio Build Tools](https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/)
2. 安装时勾选 **"使用 C++ 的桌面开发"**
3. 确保包含以下组件：
   - MSVC v14x C++ x64/x86 build tools
   - Windows 10/11 SDK

## 常见问题

### 模块加载失败

```
Error: The specified module could not be found
```

**解决方案**：

- 运行 `pnpm build:native` 编译原生模块
- 确保系统架构 (x64/arm64) 与编译目标匹配

### 链接错误

```
LINK : fatal error LNK1181: cannot open input file
```

**解决方案**：

- 检查 Visual Studio Build Tools 是否正确安装
- 确保 Windows SDK 已安装

### 在 Windows 上不显示媒体控件

- 仅 Windows 10 1607 及以上版本支持
- 打开右下角的控制中心，检查是否显示媒体控件
- 检查日志是否有报错

### 在 Linux 上不显示媒体控件

- 使用 `playerctl` 工具检查是否能看到并控制应用
- 直接调用 `D-Bus` 接口检查是否能看到应用
- 检查日志是否有报错

### 在 MacOS 上不显示媒体控件

- 检查右上角的控制中心是否显示媒体控件
- 通过系统级日志检查 MacOS 是否正在尝试将命令发送给原生插件: `log stream --predicate 'subsystem == "com.apple.MediaPlayer" OR eventMessage contains "RemoteCommand"' --info`
- 检查日志是否有报错

### Discord RPC 不显示

- 确保 Discord 客户端在后台运行
- 检查设置 → 活动隐私 → 允许其他人看到你的活动
- 查看应用设置中 Discord 状态开关是否开启
