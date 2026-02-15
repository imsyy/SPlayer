# 调试模式和错误排查

本文介绍如何使用调试模式定位和解决 SPlayer 运行中遇到的问题。

## 启用调试模式

### 开发者工具

在 Electron 客户端中，可以通过以下方式打开开发者工具：

- **快捷键**：`Ctrl + Shift + I` (Windows/Linux) 或 `Cmd + Option + I` (macOS)

开发者工具包含以下面板：

| 面板            | 用途                   |
| --------------- | ---------------------- |
| **Console**     | 查看日志输出、错误信息 |
| **Network**     | 监控网络请求、API 调用 |
| **Application** | 查看本地存储、缓存数据 |
| **Sources**     | 调试前端代码           |

### 查看日志文件

应用运行日志保存在以下位置：

| 系统    | 路径                                          |
| ------- | --------------------------------------------- |
| Windows | `%APPDATA%\SPlayer\logs\`                     |
| macOS   | `~/Library/Application Support/SPlayer/logs/` |
| Linux   | `$XDG_CONFIG_HOME/SPlayer/logs/`              |

开发环境日志：`%APPDATA%\SPlayer\logs\dev\`（在原日志目录的 `dev` 子文件夹下）

原生模块日志：

- 外部媒体集成模块日志：`%APPDATA%\SPlayer\logs\external-media-integration\`

## 常见错误类型

### 网络错误

**症状**：无法加载歌曲、封面、歌词等资源

**排查步骤**：

1. 打开开发者工具 → Network 面板
2. 检查失败的请求（红色标记）
3. 查看响应状态码和错误信息

**常见原因**：

- API 服务器不可用
- 网络连接问题
- 代理配置错误
- CORS 跨域限制

### 播放错误

**症状**：歌曲无法播放、卡顿、无声音

**排查步骤**：

1. 检查 Console 面板是否有错误信息
2. 检查音频 URL 是否有效（Network 面板）
3. 确认系统音频输出设备正常

**常见原因**：

- 音频 URL 过期
- 音频格式不支持
- 系统音频设备问题
- 内存不足

### 渲染错误

**症状**：界面显示异常、白屏、组件不加载

**排查步骤**：

1. 查看 Console 面板的错误堆栈
2. 检查是否有 Vue 组件错误
3. 尝试清除缓存后重启

**解决方案**：

```bash
# 清除应用缓存（Windows）
rd /s /q "%APPDATA%\SPlayer\Cache"

# 清除应用缓存（macOS）
rm -rf ~/Library/Application\ Support/SPlayer/Cache

# 清除应用缓存（Linux）
rm -rf "${XDG_CONFIG_HOME:-$HOME/.config}/SPlayer/Cache"
```

## 收集调试信息

如果需要提交 Issue，请收集以下信息：

1. **系统信息**
   - 操作系统版本
   - SPlayer 版本（如果是开发版本，还要带上 Commit ID）
   - Node.js 版本（如果是开发环境）

2. **错误信息**
   - Console 面板的完整错误日志
   - 相关的网络请求截图

3. **复现步骤**
   - 详细描述导致问题的操作步骤
   - 是否可以稳定复现

## 重置应用

如果问题持续存在，可以尝试重置应用：

::: warning 注意
重置会清除所有用户数据，包括登录状态、播放列表、设置等。
:::

```bash
# Windows
rd /s /q "%APPDATA%\SPlayer"

# macOS
rm -rf ~/Library/Application\ Support/SPlayer

# Linux
rm -rf "${XDG_CONFIG_HOME:-$HOME/.config}/SPlayer"
```

重置后重新启动应用并登录即可。
