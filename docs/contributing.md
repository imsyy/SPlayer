# 贡献指南

感谢您对 SPlayer 的关注！本指南将帮助您了解如何为项目做出贡献。

## 前置知识

参与本项目开发需要掌握以下技术：

### 前端技术栈

| 技术           | 说明                  | 学习资源                                         |
| -------------- | --------------------- | ------------------------------------------------ |
| **Vue 3**      | 前端框架              | [官方文档](https://cn.vuejs.org/)                |
| **TypeScript** | 类型安全的 JavaScript | [官方手册](https://www.typescriptlang.org/docs/) |
| **Pinia**      | 状态管理              | [官方文档](https://pinia.vuejs.org/zh/)          |
| **Vite**       | 构建工具              | [官方文档](https://cn.vitejs.dev/)               |
| **Naive UI**   | UI 组件库             | [官方文档](https://www.naiveui.com/zh-CN/)       |

### 桌面端技术栈

| 技术         | 说明                 | 学习资源                                               |
| ------------ | -------------------- | ------------------------------------------------------ |
| **Electron** | 桌面应用框架         | [官方文档](https://www.electronjs.org/zh/docs/latest/) |
| **N-API**    | Node.js 原生模块接口 | [官方文档](https://nodejs.org/api/n-api.html)          |

### 原生模块开发 (可选)

如需开发原生插件，还需掌握：

| 技术            | 说明                   | 学习资源                                                     |
| --------------- | ---------------------- | ------------------------------------------------------------ |
| **Rust**        | 系统编程语言           | [Rust 程序设计语言](https://kaisery.github.io/trpl-zh-cn/)   |
| **napi-rs**     | Rust 编写 Node.js 扩展 | [官方文档](https://napi.rs/)                                 |
| **Windows API** | Windows 系统编程       | [MSDN 文档](https://docs.microsoft.com/zh-cn/windows/win32/) |

## 开发环境搭建

请参考 [使用指南](/guide.html#🛠-本地开发环境) 完成以下准备工作：

1. 安装 Node.js (v18+)
2. 安装 pnpm
3. 安装 Git
4. 克隆仓库并安装依赖
5. 安装 Rust 和 C++ 构建工具 (可选，若只开发 Web 版则不需要。开发桌面版则必选)

## Git 工作流

### 1. Fork 仓库

访问 [SPlayer 仓库](https://github.com/imsyy/SPlayer)，点击右上角 **Fork** 按钮复制仓库到你的账号。

### 2. 克隆你的 Fork

```bash
# 克隆你的 Fork（替换 YOUR_USERNAME）
git clone https://github.com/YOUR_USERNAME/SPlayer.git
cd SPlayer

# 添加上游仓库
git remote add upstream https://github.com/imsyy/SPlayer.git

# 验证远程仓库配置
git remote -v
# 应显示:
# origin    https://github.com/YOUR_USERNAME/SPlayer.git (fetch)
# origin    https://github.com/YOUR_USERNAME/SPlayer.git (push)
# upstream  https://github.com/imsyy/SPlayer.git (fetch)
# upstream  https://github.com/imsyy/SPlayer.git (push)
```

### 3. 同步上游更新

在开始新功能开发前，确保本地代码是最新的：

```bash
# 获取上游最新代码
git fetch upstream

# 切换到主分支
git checkout main

# 合并上游更新
git merge upstream/main

# 推送到你的 Fork
git push origin main
```

### 4. 创建功能分支

**永远不要直接在 main 分支上开发！**

```bash
# 创建并切换到新分支
git checkout -b feature/your-feature-name

# 分支命名规范：
# feature/xxx    - 新功能
# fix/xxx        - Bug 修复
# docs/xxx       - 文档更新
# refactor/xxx   - 代码重构
# style/xxx      - 代码格式调整
```

### 5. 开发与提交

```bash
# 进行开发...

# 查看更改
git status
git diff

# 暂存更改
git add .

# 提交（遵循 Conventional Commits 规范）
git commit -m "feat: 添加新功能描述"
```

**提交信息规范：**

| 类型       | 说明                           |
| ---------- | ------------------------------ |
| `feat`     | 新功能                         |
| `fix`      | Bug 修复                       |
| `docs`     | 文档更新                       |
| `style`    | 代码格式（不影响功能）         |
| `refactor` | 重构（既不是新功能也不是修复） |
| `perf`     | 性能优化                       |
| `test`     | 测试相关                       |
| `chore`    | 构建/工具相关                  |

示例：

```bash
git commit -m "feat: 添加歌词翻译显示功能"
git commit -m "fix: 修复播放列表滚动位置问题"
git commit -m "docs: 更新原生插件文档"
```

### 6. 推送分支

```bash
# 推送到你的 Fork
git push origin feature/your-feature-name
```

### 7. 创建 Pull Request

1. 访问你的 Fork 仓库页面
2. 点击 **Compare & pull request** 按钮
3. 填写 PR 标题和描述：
   - 清晰描述更改内容
   - 关联相关 Issue（如有）：`Closes #123`（详细信息可查看 [GitHub 文档](https://docs.github.com/zh/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)）
   - 提供测试方法或截图
4. 点击 **Create pull request**

### 8. 代码审查

- AI 会对 PR 进行初步审核（AI 有时会挑刺，只改你觉得有必要的即可）
- 维护者可能会提出修改建议
- 根据反馈进行修改并推送更新，你也可以选择说服维护者为什么你是对的
- PR 合并后，可删除功能分支

```bash
# 删除本地分支
git branch -d feature/your-feature-name

# 删除远程分支
git push origin --delete feature/your-feature-name
```

## 代码规范

### 代码风格

项目使用 ESLint 和 Prettier 进行代码规范检查：

```bash
# 检查代码规范
pnpm lint

# 自动格式化
pnpm format
```

提交前请确保您的代码通过规范检查。

### 目录结构

```
SPlayer/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件
│   ├── stores/             # Pinia 状态管理
│   ├── views/              # 页面视图
│   ├── utils/              # 工具函数
│   └── types/              # TypeScript 类型定义
├── electron/               # Electron 主进程
│   ├── main/               # 主进程代码
│   └── preload/            # 预加载脚本
├── native/                 # Node.js 原生插件
│   ├── external-media-integration/   # 媒体控件集成模块
├── docs/                   # 文档
└── scripts/                # 构建脚本
```

## 常见问题

### Q: 如何解决合并冲突？

```bash
# 获取上游最新代码
git fetch upstream

# 在你的功能分支上 rebase
git rebase upstream/main

# 解决冲突后继续
git add .
git rebase --continue

# 强制推送（注意：仅在你自己的分支上使用）
git push origin feature/your-feature-name --force
```

### Q: 如何撤销最近的提交？

```bash
# 撤销最近一次提交（保留更改）
git reset --soft HEAD~1

# 撤销最近一次提交（丢弃更改）
git reset --hard HEAD~1
```

### Q: 如何修改最近的提交信息？

```bash
git commit --amend -m "新的提交信息"
```

## 获取帮助

如果您在贡献过程中遇到问题：

1. 查阅项目 [Issues](https://github.com/imsyy/SPlayer/issues)
2. 提交新 Issue 描述您的问题
3. 加入项目讨论群组

感谢您的贡献！🎉
