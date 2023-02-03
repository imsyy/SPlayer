# SPlayer

> 一个简约的在线音乐播放器，**项目尚未完成**，不保证可用性

本项目采用 Vue 3 全家桶及 SCSS 开发  
目前主要以 PC 端为主，移动端做了基础适配，仅保证功能

## 👀 Demo

- [SPlayer](https://music.imsyy.top/)

## 🎉 功能

- 账号登录
  - 扫码登录
  - 更多登录方式待添加
- 推荐
  - 每日推荐歌曲
  - 私人 FM
- 音乐云盘
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
  - 支持评论区功能
  - 明暗模式自动 / 手动切换
  - 对移动端简单适配

- [ ] 更多登录方式
- [ ] 主题换肤

## 😍 Screenshots

<details>
<summary>主页面</summary>

![主页面](/screenshots/SPlayer%20-%20%E4%B8%BB%E9%A1%B5%E9%9D%A2.jpg)
</details>

<details>
<summary>播放页面</summary>

![播放页面](/screenshots/SPlayer%20-%20%E6%92%AD%E6%94%BE%E9%A1%B5%E9%9D%A2.jpg)
</details>

<details>
<summary>发现页面</summary>

![发现页面](/screenshots/SPlayer%20-%20%E5%8F%91%E7%8E%B0%E9%A1%B5%E9%9D%A2.jpg)
</details>

<details>
<summary>歌单页面</summary>

![歌单页面](/screenshots/SPlayer%20-%20%E6%AD%8C%E5%8D%95%E9%A1%B5%E9%9D%A2.jpg)
</details>

<details>
<summary>评论页面</summary>

![评论页面](/screenshots/SPlayer%20-%20%E8%AF%84%E8%AE%BA%E9%A1%B5%E9%9D%A2.jpg)
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