<div align="center">
<img alt="logo" height="100" width="100" src="public/icons/favicon.png" />
<h2> SPlayer </h2>
<p> 一个简约的音乐播放器 </p>

[API Docs](https://splayer.imsyy.top/api.html) | [交流群](https://qm.qq.com/cgi-bin/qm/qr?k=2-cVSf1bE0AvAehCib00qFEFdUvPaJ_k&jump_from=webapi&authKey=1NEhib9+GsmsXVo2rCc0IbRaVHeeRXJJ0gbsyKDcIwDdAzYySOubkFCvkV32+7Cw) | [开发版](https://github.com/imsyy/SPlayer/actions) | [发行版](https://splayer.imsyy.top/download.html)

<br />

[![Stars](https://img.shields.io/github/stars/imsyy/SPlayer?style=flat)](https://github.com/imsyy/SPlayer/stargazers)
[![Version](https://img.shields.io/github/v/release/imsyy/SPlayer)](https://github.com/imsyy/SPlayer/releases)
[![Build Release](https://github.com/imsyy/SPlayer/actions/workflows/release.yml/badge.svg)](https://github.com/imsyy/SPlayer/actions/workflows/release.yml)
[![License](https://img.shields.io/github/license/imsyy/SPlayer)](https://github.com/imsyy/SPlayer/blob/dev/LICENSE)
[![Issues](https://img.shields.io/github/issues/imsyy/SPlayer)](https://github.com/imsyy/SPlayer/issues)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/imsyy/SPlayer)

</div>

![main](/screenshots/SPlayer.jpg)

## 说明

![提示](/screenshots/gitcodes.png)

> [!IMPORTANT]
>
> ### 严肃警告
>
> - 请务必遵守 [GNU Affero General Public License (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) 许可协议
> - 在您的修改、演绎、分发或派生项目中，必须同样采用 **AGPL-3.0** 许可协议，**并在适当的位置包含本项目的许可和版权信息**
> - 若您用于售卖或其他盈利用途，**必须提供本项目的源代码及原项目链接**。另外由于本项目涉及第三方，**售卖后可能遭受法律或诉讼风险**。如若发现违反许可协议，作者保留追究法律责任的权利
> - 禁止在二开项目中修改程序原版权信息（ 您可以添加二开作者信息 ）
> - 感谢您的尊重与理解

- 本项目采用 [Vue 3](https://cn.vuejs.org/) + [TypeScript](https://www.typescriptlang.org/) + [Naïve UI](https://www.naiveui.com/) + [Electron](https://www.electronjs.org/zh/docs/latest/) 开发
- Node.js 版本要求：>= 20，包管理器：pnpm >= 10
- 默认会构建原生模块，需准备 Rust 工具链；如仅需要网页端构建或暂时跳过，可设置环境变量 `SKIP_NATIVE_BUILD=true`
- 支持网页端与客户端，由于设备有限，目前仅保证 Windows 系统的适配，其他平台如遇问题可以提 Issue 或自行解决后选择提 PR
<!-- - 仅对移动端做了基础适配，**不保证功能全部可用** -->

<!--  > 请注意，本程序不打算开发移动端，也不会对移动端进行完美适配，仅保证基础可用性 -->

- 欢迎各位大佬 `Star` 😍

## 🧑‍💻 开发

### 快速开始

1. 安装依赖：`pnpm install`
2. 复制 `.env.example` 为 `.env` 并按需修改
3. 启动开发：`pnpm dev`
4. 构建：
   - `pnpm build`
   - `pnpm build:win`

### 跳过原生模块构建

默认会编译 `native/*` 下的原生模块（需要 Rust）。如果你的场景不需要原生能力，可设置 `SKIP_NATIVE_BUILD=true` 后再执行 `pnpm dev` / `pnpm build`。

## 💬 交流群

<a href="https://qm.qq.com/cgi-bin/qm/qr?k=2-cVSf1bE0AvAehCib00qFEFdUvPaJ_k&jump_from=webapi&authKey=1NEhib9+GsmsXVo2rCc0IbRaVHeeRXJJ0gbsyKDcIwDdAzYySOubkFCvkV32+7Cw" target="_blank">
  <img src="screenshots/welcome.png" alt="交流群" width="300" />
</a>

## 👀 Demo

- 在线演示：[SPlayer](https://splayer.20100907.xyz)

  > 如打不开，说明已经失效请自行前往 [获取](#️-获取)

## 🎉 功能

- ✨ 支持扫码登录
- 📱 支持手机号登录
- ~~📅 自动进行每日签到及云贝签到~~
- 💻 支持桌面歌词
- 💻 支持切换为本地播放器，此模式将不会连接网络
- 🎨 封面主题色自适应，支持全站着色
- 🌚 Light / Dark / Auto 模式自动切换
- 📁 本地歌曲管理及分类（建议先使用 [音乐标签](https://www.cnblogs.com/vinlxc/p/11347744.html) 进行匹配后再使用）
- 📁 本地音乐标签编辑及封面修改
- ➕ 新建歌单及歌单编辑
- ❤️ 收藏 / 取消收藏歌单或歌手
- ☁️ 云盘音乐上传
- 📂 云盘内歌曲播放
- 🔄 云盘内歌曲纠正
- 🗑️ 云盘歌曲删除
- 🌐 支持 Subsonic / Navidrome 等流媒体服务（多服务器支持、自动连接）
- 📝 支持逐字歌词
- 🔄 歌词滚动以及歌词翻译
- 📹 MV 与视频播放
- 🎶 音乐频谱显示
- ⏭️ 音乐渐入渐出
- 🔄 支持 PWA
- 💬 支持评论区
- 🎵 支持 Last.fm Scrobble（播放记录上报）
- 📱 移动端基础适配

## 🖼️ 界面展示

> 开发中，仅供参考

<details>
<summary> 主页面 </summary>

![主页面](/screenshots/SPlayer%20-%20主页面.jpg)

</details>

<details>
<summary> 播放页面 </summary>

![播放页面](/screenshots/SPlayer%20-%20播放页面.jpg)

</details>

<details>
<summary> 发现页面 </summary>

![发现页面](/screenshots/SPlayer%20-%20发现页面.jpg)

</details>

<details>
<summary> 歌单页面 </summary>

![发现页面](/screenshots/SPlayer%20-%20歌单页面.jpg)

</details>

<details>
<summary> 评论页面 </summary>

![发现页面](/screenshots/SPlayer%20-%20评论页面.jpg)

</details>

<details>
<summary> 本地音乐 </summary>

![发现页面](/screenshots/SPlayer%20-%20本地音乐.jpg)

</details>

## 📦️ 获取

### 二进制安装方案

#### 稳定版

通常情况下，可以在 [Releases](https://github.com/imsyy/SPlayer/releases) 中获取稳定版

也可前往 [SPlayer 官网](https://splayer.imsyy.top/) 获取稳定版

#### 开发版

可以通过 GitHub Actions 工作流获取最新的开发版

[Dev Workflow](https://github.com/imsyy/SPlayer/actions/workflows/dev.yml)

### 自行部署方案

#### ⚙️ Docker 部署

> 安装及配置 `Docker` 将不在此处说明，请自行解决

##### 本地构建

> 请尽量拉取最新分支后使用本地构建方式，在线部署的仓库可能更新不及时

```bash
# 构建
docker build -t splayer .

# 运行
docker run -d --name SPlayer -p 25884:25884 splayer
# 或使用 Docker Compose
docker-compose up -d
```

Docker 镜像内包含网页端以及运行所需的服务，默认通过 `25884` 端口访问。

##### 在线部署

```bash
# 从 Docker Hub 拉取
docker pull imsyy/splayer:latest
# 从 GitHub ghcr 拉取
docker pull ghcr.io/imsyy/splayer:latest

# 运行
docker run -d --name SPlayer -p 25884:25884 imsyy/splayer:latest
```

以上步骤成功后，将会在本地 [localhost:25884](http://localhost:25884/) 启动，如需更换端口，请自行修改命令行中的第一个端口号

#### ⚙️ Vercel 部署

> 其他部署平台大致相同，在此不做说明

1. 本程序依赖 [NeteaseCloudMusicApi](https://github.com/neteasecloudmusicapienhanced/api-enhanced) 运行，请确保您已成功部署该项目或兼容的项目，并成功取得在线访问地址
2. 点击本仓库右上角的 `Fork`，复制本仓库到你的 `GitHub` 账号
3. 复制 `/.env.example` 文件并重命名为 `/.env`
4. 将 `.env` 文件中的 `VITE_API_URL` 改为第一步得到的 API 地址

   ```js
   VITE_API_URL = "https://example.com";
   ```

5. 将 `Build and Output Settings` 中的 `Output Directory` 改为 `out/renderer`

   ![build](/screenshots/build.jpg)

6. 点击 `Deploy`，即可成功部署

#### ⚙️ 服务器部署

1. 重复 `⚙️ Vercel 部署` 中的 1 - 4 步骤
2. 克隆仓库

   ```bash
   git clone https://github.com/imsyy/SPlayer.git
   ```

3. 安装依赖

   ```bash
   pnpm install
   ```

4. 编译打包

   ```bash
   pnpm build
   ```

5. 将站点运行目录设置为 `out/renderer` 目录

#### ⚙️ 本地部署

1. 本地部署需要用到 `Node.js`（>= 20），可前往 [Node.js 官网](https://nodejs.org/zh-cn/) 下载安装包，请下载最新稳定版
2. 安装 pnpm（>= 10）

   ```bash
   corepack enable
   # 或
   npm install pnpm -g
   ```

3. 克隆仓库并拉取至本地，此处不再赘述
4. 使用 `pnpm install` 安装项目依赖（若安装过程中遇到网络错误，请使用国内镜像源替代，此处不再赘述）
5. 复制 `.env.example` 文件并重命名为 `.env` 并修改配置（如需跳过原生模块构建，可设置 `SKIP_NATIVE_BUILD=true`）
6. 打包客户端，请依据你的系统类型来选择，打包成功后，会输出安装包或可执行文件在 `/dist` 目录中，可自行安装

   > 默认情况下，构建命令仅会构建当前系统架构的版本。如需构建特定架构（如 x64 + arm64），请在命令后追加参数，例如：`pnpm build:win -- --x64 --arm64`

   | 命令               | 系统类型 |
   | ------------------ | -------- |
   | `pnpm build:win`   | Windows  |
   | `pnpm build:linux` | Linux    |
   | `pnpm build:mac`   | macOS    |

## 😘 鸣谢

特此感谢为本项目提供支持与灵感的项目：

- [NeteaseCloudMusicApi](https://github.com/neteasecloudmusicapienhanced/api-enhanced)
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)
- [UnblockNeteaseMusic](https://github.com/UnblockNeteaseMusic/server)
- [applemusic-like-lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics)
- [Vue-mmPlayer](https://github.com/maomao1996/Vue-mmPlayer)
- [refined-now-playing-netease](https://github.com/solstice23/refined-now-playing-netease)
- [material-color-utilities](https://github.com/material-foundation/material-color-utilities)

## 🗺️ 贡献者联盟

欢迎加入我们 🥰! 一起为 SPlayer 贡献一份力量。
感谢以下所有贡献者 💖

<a href="https://github.com/imsyy/SPlayer/graphs/contributors" target="_blank" rel="noopener">
  <img src="https://contrib.rocks/image?repo=imsyy/SPlayer&max=30&anon=1&v=1"
    alt="SPlayer 项目贡献者"
    width="650"
    loading="lazy"
  />
</a>

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

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=imsyy/SPlayer&type=Date)](https://star-history.com/#imsyy/SPlayer&Date)
