# 使用指南

本指南介绍如何安装和使用 SPlayer，以及如何搭建本地开发环境。

## 📦 安装方式

### 客户端下载

前往 [GitHub Releases](https://github.com/imsyy/SPlayer/releases) 下载对应系统的安装包：

| 系统    | 安装包格式                        |
| ------- | --------------------------------- |
| Windows | `.exe` (安装版) / `.zip` (便携版) |
| macOS   | `.dmg`                            |
| Linux   | `.AppImage` / `.deb` / ...        |

### Docker 部署 (仅 Web 版)

#### 本地构建

> 建议拉取最新代码后本地构建，在线镜像可能更新不及时

```bash
# 构建镜像
docker build -t splayer .

# 运行容器
docker run -d --name SPlayer -p 25884:25884 splayer

# 或使用 Docker Compose
docker-compose up -d
```

#### 在线拉取

```bash
# 从 Docker Hub 拉取
docker pull imsyy/splayer:latest

# 从 GitHub Container Registry 拉取
docker pull ghcr.io/imsyy/splayer:latest

# 运行容器
docker run -d --name SPlayer -p 25884:25884 imsyy/splayer:latest
```

启动成功后访问 `http://localhost:25884`

### Vercel 部署

1. 先部署 [NeteaseCloudMusicApi](https://github.com/neteasecloudmusicapienhanced/api-enhanced) 并获取 API 地址
2. Fork 本仓库到你的 GitHub 账号
3. 复制 `/.env.example` 为 `/.env` 并配置：
   ```
   VITE_API_URL = "https://your-api-url.com"
   ```
4. 在 Vercel 导入项目
5. 设置 `Output Directory` 为 `out/renderer`
6. 点击 Deploy 完成部署

## 🛠 本地开发环境

### 系统要求

- **Node.js**: v22.0.0 或更高版本 (推荐 v24 LTS)
- **pnpm**: v8.0.0 或更高版本
- **Git**: 最新版本
- **操作系统**: Windows 10+, macOS 10.15+, 或 Linux

### 软件安装

#### 1. 安装 Node.js

访问 [Node.js 官网](https://nodejs.org/) 下载 LTS 版本，或使用版本管理工具：

```bash
# Windows (使用 winget)
winget install OpenJS.NodeJS.LTS

# macOS (使用 Homebrew)
brew install node@24

# Linux (使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 24
```

验证安装：

```bash
node --version   # 应显示 v22.x.x 或更高
npm --version
```

#### 2. 安装 pnpm

```bash
npm install -g pnpm

# 验证安装
pnpm --version
```

#### 3. 安装 Git

- Windows: 下载 [Git for Windows](https://git-scm.com/download/win)
- macOS: `brew install git`
- Linux: `sudo apt install git`

#### 4. 安装 Rust (可选，仅开发原生模块时需要)

访问 [rustup.rs](https://rustup.rs/) 安装 Rust 工具链：

```bash
# Windows: 下载运行 rustup-init.exe
# macOS/Linux:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 验证安装
rustc --version
cargo --version
```

#### 5. 安装 C++ 构建工具 (Windows 原生模块开发)

下载 [Visual Studio Build Tools](https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/)，安装时勾选：

- **使用 C++ 的桌面开发**
- MSVC v14x C++ x64/x86 build tools
- Windows 10/11 SDK

### 项目初始化

```bash
# 1. 克隆仓库
git clone https://github.com/imsyy/SPlayer.git
cd SPlayer

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置 API 地址

# 4. 构建原生模块
pnpm build:native

# 5. 启动开发服务器
pnpm dev
```

### 常用开发命令

| 命令                | 说明                                 |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | 启动开发服务器 (Electron + Vite HMR) |
| `pnpm dev:web`      | 仅启动 Web 版开发服务器              |
| `pnpm build`        | 构建 Web 版生产包                    |
| `pnpm build:win`    | 构建 Windows 客户端                  |
| `pnpm build:mac`    | 构建 macOS 客户端                    |
| `pnpm build:linux`  | 构建 Linux 客户端                    |
| `pnpm build:native` | 构建原生插件                         |
| `pnpm lint`         | 运行代码检查                         |
| `pnpm format`       | 格式化代码                           |

### 构建客户端

```bash
# 构建当前系统架构
pnpm build:win

# 构建指定架构
pnpm build:win -- --x64 --arm64

# 构建产物位于 dist/ 目录
```

### IDE 配置推荐

#### VS Code 扩展

- **Vue - Official**: Vue 3 语言支持
- **ESLint**: 代码规范检查
- **Prettier**: 代码格式化
- **rust-analyzer**: Rust 语言支持 (开发原生模块时)

## ⚠️ 重要提示

::: warning 许可协议

### 严肃警告

- 请务必遵守 [GNU Affero General Public License (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) 许可协议
- 在您的修改、演绎、分发或派生项目中，必须同样采用 **AGPL-3.0** 许可协议，**并在适当的位置包含本项目的许可和版权信息**
- 若您用于售卖或其他盈利用途，**必须提供本项目的源代码及原项目链接**。另外由于本项目涉及第三方，**售卖后可能遭受法律或诉讼风险**。如若发现违反许可协议，作者保留追究法律责任的权利
- 禁止在二开项目中修改程序原版权信息（ 您可以添加二开作者信息 ）
- 感谢您的尊重与理解

:::

## 📢 免责声明

本项目部分功能使用了网易云音乐的第三方 API 服务，**仅供个人学习研究使用，禁止用于商业及非法用途**

同时，本项目开发者承诺 **严格遵守相关法律法规和网易云音乐 API 使用协议，不会利用本项目进行任何违法活动。** 如因使用本项目而引起的任何纠纷或责任，均由使用者自行承担。**本项目开发者不承担任何因使用本项目而导致的任何直接或间接责任，并保留追究使用者违法行为的权利**

请使用者在使用本项目时遵守相关法律法规，**不要将本项目用于任何商业及非法用途。如有违反，一切后果由使用者自负。** 同时，使用者应该自行承担因使用本项目而带来的风险和责任。本项目开发者不对本项目所提供的服务和内容做出任何保证

感谢您的理解

## 📜 开源许可

- **本项目仅供个人学习研究使用，禁止用于商业及非法用途**
- 本项目基于 [GNU Affero General Public License (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) 许可进行开源
  1. **修改和分发：** 任何对本项目的修改和分发都必须基于 AGPL-3.0 进行，源代码必须一并提供
  2. **派生作品：** 任何派生作品必须同样采用 AGPL-3.0，并在适当的地方注明原始项目的许可证
  3. **注明原作者：** 在任何修改、派生作品或其他分发中，必须在适当的位置明确注明原作者及其贡献
  4. **免责声明：** 根据 AGPL-3.0，本项目不提供任何明示或暗示的担保。请详细阅读 [GNU Affero General Public License (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) 以了解完整的免责声明内容
  5. **社区参与：** 欢迎社区的参与和贡献，我们鼓励开发者一同改进和维护本项目
  6. **许可证链接：** 请阅读 [GNU Affero General Public License (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) 了解更多详情

## 😘 鸣谢

特此感谢为本项目提供支持与灵感的项目

- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)
- [UnblockNeteaseMusic](https://github.com/UnblockNeteaseMusic/server)
- [applemusic-like-lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics)
- [Vue-mmPlayer](https://github.com/maomao1996/Vue-mmPlayer)
- [refined-now-playing-netease](https://github.com/solstice23/refined-now-playing-netease)
- [material-color-utilities](https://github.com/material-foundation/material-color-utilities)
