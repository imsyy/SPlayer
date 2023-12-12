> [!IMPORTANT]
> ## 严肃警告
>
> - 请务必遵守 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可协议
> - 在您的修改、演绎、分发或派生项目中，必须同样采用 **CC BY-NC-SA 4.0** 许可协议，**并在适当的位置包含本项目的许可和版权信息**
> - **禁止用于售卖或其他商业用途**，如若发现，作者保留追究法律责任的权利
> - 若发现未遵守 **CC BY-NC-SA 4.0** 许可协议的行为，**本项目将永久停更**
> - 感谢您的尊重与理解

<div align="center">
<img alt="logo" height="80" src="./public/images/logo/favicon.png" />
<h2>SPlayer</h2>
<p>一个简约的音乐播放器</p>
<img alt="main" src="./screenshots/main.png" />
</div>
<br />

## 说明

- 本项目采用 [Vue 3](https://cn.vuejs.org/) 全家桶和 [Naïve UI](https://www.naiveui.com/) 组件库及 [Electron](https://www.electronjs.org/zh/docs/latest/) 开发
- 支持网页端与客户端，由于设备有限，目前仅适配 `Win`，其他平台可自行构建
- ~~仅对移动端做了基础适配，**不保证功能全部可用**~~
- 欢迎各位大佬指点和 `Star` 哦 😍

## 👀 Demo

- [SPlayer](https://music.imsyy.top/)

## 🎉 功能

- 支持扫码登录
- 支持手机号登录
- 自动进行每日签到及云贝签到
- 封面主题色自适应
- 本地歌曲管理及分类 ~~以及音乐标签编辑~~
- **支持播放部分无版权歌曲（可能会与原曲不匹配，客户端独占功能）**
- 下载歌曲（最高支持 Hi-Res）
- 新建歌单及歌单编辑
- 收藏 / 取消收藏歌单或歌手
- 每日推荐歌曲
- 私人 FM
- 云盘音乐上传
- 云盘内歌曲播放
- 云盘内歌曲纠正
- 云盘歌曲删除
- 支持逐字歌词
- 歌词滚动以及歌词翻译
- MV 与视频播放
- 音乐频谱显示（ 暂时去除，还待完善 ）
- 音乐渐入渐出
- 支持 PWA
- 支持评论区及评论点赞
- 明暗模式自动 / 手动切换
- ~~移动端基础适配~~
- ~~`i18n` 支持~~

#### 待办

- [ ] 完善音乐频谱
- [ ] 添加桌面歌词
- [ ] 多种布局方式
- [ ] 发表评论

## 🖼️ Screenshots

> 开发中，仅供参考

<details>
<summary>主页面</summary>

![主页面](/screenshots/SPlayer%20-%20主页面.jpg)

</details>

<details>
<summary>播放页面</summary>

![播放页面](/screenshots/SPlayer%20-%20播放页面.jpg)

</details>

<details>
<summary>发现页面</summary>

![发现页面](/screenshots/SPlayer%20-%20发现页面.jpg)

</details>

<details>
<summary>歌单页面</summary>

![发现页面](/screenshots/SPlayer%20-%20歌单页面.jpg)

</details>

<details>
<summary>评论页面</summary>

![发现页面](/screenshots/SPlayer%20-%20评论页面.jpg)

</details>

<details>
<summary>本地音乐</summary>

![发现页面](/screenshots/SPlayer%20-%20本地音乐.jpg)

</details>

## 📦️ 获取

### 稳定版

通常情况下，可以在 [Releases](https://github.com/imsyy/SPlayer/releases) 中获取稳定版

### 开发版

可以通过 `GitHub Actions` 工作流获取最新的开发版，目前开发版仅提供 `Win` 版本

[Dev Workflow](https://github.com/imsyy/SPlayer/actions/workflows/build.yml)

## ⚙️ 部署

> Vercel 等托管平台可在 Fork 后一键导入并自动部署

### API 服务（客户端无需理会，如果需要网页端，则必需部署）

> 本程序依赖 [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 运行，请确保您已成功部署该项目

- 请在根目录下的 `.env` 文件中的 `RENDERER_VITE_SERVER_URL` 中填入 API 地址（必需）

```js
RENDERER_VITE_SERVER_URL = "your api url";
```

### 安装依赖

```bash
pnpm install
# 或者
yarn install
# 或者
npm install
```

### 开发

```bash
pnpm dev
# 或者
yarn dev
# 或者
npm dev
```

### 构建网页端

```bash
pnpm build
# 或者
yarn build
# 或者
npm build
```

构建完成后可将生成的 `out/renderer` 文件夹内的文件上传至服务器

若使用的为第三方部署平台，比如 `Vercel`，请将 `Build and Output Settings` 中的 `Output Directory` 改为 `out/renderer`

![build](/screenshots/build.png)

### 构建客户端

```bash
# win
pnpm build:win
# linux
pnpm build:linux
# mac
pnpm build:mac
```

构建完成后可在 `dist` 文件夹中打开可执行文件来完成安装操作

## 😘 鸣谢

特此感谢为本项目提供支持与灵感的项目

- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)
- [UnblockNeteaseMusic](https://github.com/UnblockNeteaseMusic/server)
- [BlurLyric](https://github.com/Project-And-Factory/BlurLyric)
- [Vue-mmPlayer](https://github.com/maomao1996/Vue-mmPlayer)

## 📢 免责声明

本项目部分功能使用了网易云音乐的第三方 API 服务，**仅供个人学习研究使用，禁止用于商业及非法用途**

同时，本项目开发者承诺 **严格遵守相关法律法规和网易云音乐 API 使用协议，不会利用本项目进行任何违法活动。** 如因使用本项目而引起的任何纠纷或责任，均由使用者自行承担。**本项目开发者不承担任何因使用本项目而导致的任何直接或间接责任，并保留追究使用者违法行为的权利**

请使用者在使用本项目时遵守相关法律法规，**不要将本项目用于任何商业及非法用途。如有违反，一切后果由使用者自负。** 同时，使用者应该自行承担因使用本项目而带来的风险和责任。本项目开发者不对本项目所提供的服务和内容做出任何保证

感谢您的理解

## 📜 开源许可

- **本项目仅供个人学习研究使用，禁止用于商业及非法用途**
- 本项目基于 [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可进行开源
  1. **修改和分发：** 任何对本项目的修改和分发都必须基于 CC BY-NC-SA 4.0 进行，源代码必须一并提供
  2. **派生作品：** 任何派生作品必须同样采用 CC BY-NC-SA 4.0，并在适当的地方注明原始项目的许可证
  3. **免责声明：** 根据 CC BY-NC-SA 4.0，本项目不提供任何明示或暗示的担保。请详细阅读 [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-nc-sa/4.0/) 以了解完整的免责声明内容
  4. **社区参与：** 欢迎社区的参与和贡献，我们鼓励开发者一同改进和维护本项目
  5. **许可证链接：** 请阅读 [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-nc-sa/4.0/) 了解更多详情

<p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a property="dct:title" rel="cc:attributionURL" href="https://github.com/imsyy/SPlayer">SPlayer</a> by <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://github.com/imsyy">imsyy</a> is licensed under <a href="http://creativecommons.org/licenses/by-nc-sa/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">CC BY-NC-SA 4.0<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/nc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/sa.svg?ref=chooser-v1"></a></p>
