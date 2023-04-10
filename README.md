<div align="center">
<img alt="logo" height="80" src="./public/images/logo/favicon.png" />
<h2>SPlayer</h2>
<p>一个简约的在线音乐播放器</p>
<img alt="main" src="./screenshots/main.png" />
</div>
<br />

> 本项目采用 Vue 3 全家桶及 SCSS 开发  
> 目前主要以 PC 端为主，移动端做了基础适配，仅保证功能

## 👀 Demo

- [SPlayer](https://music.imsyy.top/)

## 🎉 功能

- 账号
  - 扫码登录
  - 手机号登录（目前暂时无法使用）
  - 自动进行每日签到及云贝签到
- 管理
  - 下载歌曲（最高 Hi-Res）
  - 新建歌单
  - 歌单编辑
  - 收藏 / 取消收藏歌单
  - 收藏 / 取消收藏歌手
- 推荐
  - 每日推荐歌曲
  - 私人 FM
- 音乐云盘
  - 云盘音乐上传
  - 云盘内歌曲播放
  - 云盘内歌曲纠正
  - 云盘歌曲删除
- 播放
  - 歌词滚动以及歌词翻译
  - MV 与视频播放
  - 音乐频谱显示（ 实验性功能，需在设置中开启 ）
  - 音乐渐入渐出
- 其他
  - 支持 PWA
  - 支持评论区及评论点赞
  - 明暗模式自动 / 手动切换
  - 移动端基础适配

- [ ] 主题换肤
- [ ] 发表评论

## 😍 Screenshots

<details>
<summary>主页面</summary>

![主页面](/screenshots/SPlayer%20-%20%E4%B8%BB%E9%A1%B5%E9%9D%A2.png)
</details>

<details>
<summary>播放页面</summary>

![播放页面](/screenshots/SPlayer%20-%20%E6%92%AD%E6%94%BE%E9%A1%B5%E9%9D%A2.png)
</details>

<details>
<summary>发现页面</summary>

![发现页面](/screenshots/SPlayer%20-%20%E5%8F%91%E7%8E%B0%E9%A1%B5%E9%9D%A2.png)
</details>

<details>
<summary>歌单页面</summary>

![歌单页面](/screenshots/SPlayer%20-%20%E6%AD%8C%E5%8D%95%E9%A1%B5%E9%9D%A2.png)
</details>

<details>
<summary>评论页面</summary>

![评论页面](/screenshots/SPlayer%20-%20%E8%AF%84%E8%AE%BA%E9%A1%B5%E9%9D%A2.png)
</details>

## ⚙️ 部署

> Vercel 等托管平台可在 Fork 后一键导入并自动部署

### API 服务

> 本程序依赖 [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 运行，请确保您已成功部署该项目

- 请在根目录下的 `.env` 文件中的 `VITE_MUSIC_API` 中填入 API 地址

```js
VITE_MUSIC_API = "your api url"
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

### 构建

```bash
pnpm build
# 或者
yarn build
# 或者
npm build
```

构建完成后可将生成的 `dist` 文件夹内的文件上传至服务器

## 😘 鸣谢

特此感谢为本项目提供支持与灵感的项目

- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)
- [Vue-mmPlayer](https://github.com/maomao1996/Vue-mmPlayer)

## 📜 开源许可
- **本项目仅供个人学习研究使用，禁止用于商业及非法用途**
- 本项目基于 [MIT license](https://opensource.org/license/mit/) 许可进行开源

## 📢 免责声明

本项目使用了网易云音乐的第三方 API 服务，**仅供个人学习研究使用，禁止用于商业及非法用途。** 本项目旨在提供一个前端练手的实战项目，用于帮助开发者提升技能水平和对前端技术的理解

同时，本项目开发者承诺 **严格遵守相关法律法规和网易云音乐 API 使用协议，不会利用本项目进行任何违法活动。** 如因使用本项目而引起的任何纠纷或责任，均由使用者自行承担。**本项目开发者不承担任何因使用本项目而导致的任何直接或间接责任，并保留追究使用者违法行为的权利**

请使用者在使用本项目时遵守相关法律法规，**不要将本项目用于任何商业及非法用途。如有违反，一切后果由使用者自负。** 同时，使用者应该自行承担因使用本项目而带来的风险和责任。本项目开发者不对本项目所提供的服务和内容做出任何保证