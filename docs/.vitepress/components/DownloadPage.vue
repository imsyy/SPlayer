<template>
  <div class="download-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在同步 GitHub 版本数据...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error">
      <p>无法连接至 GitHub API: {{ error }}</p>
      <a :href="githubReleasesUrl" target="_blank" class="simple-link">访问镜像下载地址 →</a>
    </div>

    <!-- 正常显示 -->
    <div v-else-if="latestRelease" class="content-fade-in">
      <!-- 版本信息概览 -->
      <div class="version-hero">
        <div class="version-meta">
          <span class="version-tag">{{ latestRelease.tag_name }}</span>
          <span class="release-date">{{ formatDate(latestRelease.published_at) }}</span>
        </div>

        <!-- 推荐下载卡片 -->
        <div class="recommended-card" v-if="recommendedAssets.length > 0">
          <div class="smart-info">
            <span class="magic-icon">✨</span>
            <div class="smart-text">
              您正在使用 <strong>{{ platformName }} {{ archName }}</strong> 架构
            </div>
          </div>

          <div class="recommended-actions">
            <a
              v-for="asset in recommendedAssets"
              :key="asset.name"
              :href="asset.browser_download_url"
              class="cta-button"
              :download="asset.name"
            >
              <div class="btn-content">
                <div class="main-text-row">
                  <span class="main-text">立即下载 SPlayer</span>
                  <span v-if="asset.name.toLowerCase().includes('portable')" class="portable-tag"
                    >便携版</span
                  >
                </div>
                <span class="sub-text">{{ getAssetVersionDesc(asset.name) }}</span>
              </div>
              <div class="btn-badge">{{ formatFileSize(asset.size) }}</div>
            </a>
          </div>

          <!-- 更新日志 -->
          <div class="changelog-compact" v-if="latestRelease.body">
            <details>
              <summary>查看本版本更新详情</summary>
              <div class="markdown-body" v-html="renderMarkdown(latestRelease.body)"></div>
            </details>
          </div>
        </div>
      </div>

      <!-- 所有平台下载区 -->
      <section class="platforms-section">
        <div class="section-header">
          <h2 class="section-title">全平台安装包</h2>
          <p class="section-desc">根据您的设备架构选择对应的文件类型</p>
        </div>

        <div class="platform-container">
          <!-- Windows -->
          <div class="platform-block" v-if="windowsDownloads.length > 0">
            <div class="block-header">
              <span class="platform-icon">🪟</span>
              <h3>Windows</h3>
            </div>
            <div class="download-grid">
              <a
                v-for="(file, index) in windowsDownloads"
                :key="index"
                :href="file.browser_download_url"
                class="download-card"
                :download="file.name"
              >
                <div class="file-info">
                  <div class="file-label-row">
                    <span class="file-label">{{ getSimpleFileName(file.name) }}</span>
                    <span
                      v-if="file.name.toLowerCase().includes('portable')"
                      class="portable-tag mini"
                      >便携版</span
                    >
                  </div>
                  <span class="file-type-tag">{{ getFileTypeDesc(file.name) }}</span>
                </div>
                <span class="file-size-tag">{{ formatFileSize(file.size) }}</span>
              </a>
            </div>
          </div>

          <!-- macOS -->
          <div class="platform-block" v-if="macosDownloads.length > 0">
            <div class="block-header">
              <span class="platform-icon">🍎</span>
              <h3>macOS</h3>
            </div>
            <div class="download-grid">
              <a
                v-for="(file, index) in macosDownloads"
                :key="index"
                :href="file.browser_download_url"
                class="download-card"
                :download="file.name"
              >
                <div class="file-info">
                  <div class="file-label-row">
                    <span class="file-label">{{ getSimpleFileName(file.name) }}</span>
                    <span
                      v-if="file.name.toLowerCase().includes('portable')"
                      class="portable-tag mini"
                      >便携版</span
                    >
                  </div>
                  <span class="file-type-tag">{{ getFileTypeDesc(file.name) }}</span>
                </div>
                <span class="file-size-tag">{{ formatFileSize(file.size) }}</span>
              </a>
            </div>
          </div>

          <!-- Linux -->
          <div class="platform-block" v-if="linuxDownloads.length > 0">
            <div class="block-header">
              <span class="platform-icon">🐧</span>
              <h3>Linux</h3>
            </div>
            <div class="download-grid">
              <a
                v-for="(file, index) in linuxDownloads"
                :key="index"
                :href="file.browser_download_url"
                class="download-card"
                :download="file.name"
              >
                <div class="file-info">
                  <div class="file-label-row">
                    <span class="file-label">{{ getSimpleFileName(file.name) }}</span>
                    <span
                      v-if="file.name.toLowerCase().includes('portable')"
                      class="portable-tag mini"
                      >便携版</span
                    >
                  </div>
                  <span class="file-type-tag">{{ getFileTypeDesc(file.name) }}</span>
                </div>
                <span class="file-size-tag">{{ formatFileSize(file.size) }}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer class="download-footer">
        <p>
          需要旧版本？<a :href="githubReleasesUrl" target="_blank">前往 GitHub Release 归档列表</a>
        </p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { marked } from "marked";

const GITHUB_REPO = "imsyy/SPlayer";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const githubReleasesUrl = `https://github.com/${GITHUB_REPO}/releases`;

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  body: string;
  published_at: string;
  assets: GitHubAsset[];
}

const loading = ref(true);
const error = ref<string | null>(null);
const latestRelease = ref<GitHubRelease | null>(null);
const platform = ref<string>("");
const arch = ref<string>("x64");

// 检测架构
const detectArch = () => {
  if (typeof window === "undefined") return "x64";
  const ua = window.navigator.userAgent;
  if (ua.includes("arm64") || ua.includes("aarch64")) return "ARM64";
  return "x64";
};

const detectPlatform = (): string => {
  if (typeof window === "undefined") return "unknown";
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platformStr = window.navigator.platform.toLowerCase();
  if (userAgent.includes("win") || platformStr.includes("win")) return "windows";
  if (userAgent.includes("mac") || platformStr.includes("mac")) return "macos";
  if (userAgent.includes("linux") || platformStr.includes("linux")) return "linux";
  return "unknown";
};

const platformNames: Record<string, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  unknown: "未知平台",
};

const platformName = computed(() => platformNames[platform.value] || "未知平台");
const archName = computed(() => arch.value);

const fetchLatestRelease = async () => {
  try {
    loading.value = true;
    const response = await fetch(GITHUB_API_URL);
    if (!response.ok) throw new Error(`${response.status}`);
    latestRelease.value = await response.json();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "获取失败";
  } finally {
    loading.value = false;
  }
};

const windowsDownloads = computed(() => {
  if (!latestRelease.value) return [];
  return latestRelease.value.assets.filter((a) => {
    const n = a.name.toLowerCase();
    return n.endsWith(".exe") || n.endsWith(".msi");
  });
});

const macosDownloads = computed(() => {
  if (!latestRelease.value) return [];
  return latestRelease.value.assets.filter((a) => {
    const n = a.name.toLowerCase();
    return (
      n.endsWith(".dmg") || (n.endsWith(".zip") && (n.includes("mac") || n.includes("darwin")))
    );
  });
});

const linuxDownloads = computed(() => {
  if (!latestRelease.value) return [];
  return latestRelease.value.assets.filter((a) => {
    const n = a.name.toLowerCase();
    return (
      n.endsWith(".appimage") || n.endsWith(".deb") || n.endsWith(".rpm") || n.endsWith(".tar.gz")
    );
  });
});

const recommendedPlatform = computed(() => {
  if (platform.value === "windows" && windowsDownloads.value.length > 0) return "windows";
  if (platform.value === "macos" && macosDownloads.value.length > 0) return "macos";
  if (platform.value === "linux" && linuxDownloads.value.length > 0) return "linux";
  return windowsDownloads.value.length > 0
    ? "windows"
    : macosDownloads.value.length > 0
      ? "macos"
      : "linux";
});

const recommendedAssets = computed(() => {
  if (!latestRelease.value) return [];
  let assets: GitHubAsset[] = [];
  if (recommendedPlatform.value === "windows") assets = windowsDownloads.value;
  else if (recommendedPlatform.value === "macos") assets = macosDownloads.value;
  else if (recommendedPlatform.value === "linux") assets = linuxDownloads.value;

  if (assets.length === 0) return [];

  const targetArch = arch.value.toLowerCase();
  const matchedArch = assets.filter((a) => a.name.toLowerCase().includes(targetArch));
  const pool = matchedArch.length > 0 ? matchedArch : assets;

  const results: GitHubAsset[] = [];

  // 对于 Windows，尝试同时推荐安装版和便携版
  if (recommendedPlatform.value === "windows") {
    const setup = pool.find((a) => a.name.toLowerCase().includes("setup"));
    const portable = pool.find((a) => a.name.toLowerCase().includes("portable"));

    if (setup) results.push(setup);
    if (portable) results.push(portable);

    // 如果都没找到，至少返回第一个
    if (results.length === 0 && pool.length > 0) results.push(pool[0]);
  } else {
    // 其他系统默认推荐第一个匹配架构的
    results.push(pool[0]);
  }

  return results;
});

const getAssetVersionDesc = (name: string): string => {
  const n = name.toLowerCase();
  const pName = platformNames[recommendedPlatform.value];
  if (n.includes("portable")) return `适用于 ${pName} - 免安装便携版`;
  if (n.includes("setup")) return `适用于 ${pName} - 官方安装版`;
  return `适用于 ${pName}`;
};

const getSimpleFileName = (name: string): string => {
  if (!latestRelease.value) return name;
  const version = latestRelease.value.tag_name.replace(/^v/, "");
  return name.replace(new RegExp(`^SPlayer[_-]?v?${version}[_-]?`, "i"), "") || name;
};

// 后缀类型说明
const getFileTypeDesc = (name: string): string => {
  const n = name.toLowerCase();
  let archInfo = "";
  if (n.includes("arm64")) archInfo = "ARM64 ";
  else if (n.includes("x64")) archInfo = "x64 ";

  if (n.endsWith(".exe")) return `${archInfo}Windows`;
  if (n.endsWith(".msi")) return `${archInfo}Windows MSI 镜像`;
  if (n.endsWith(".dmg")) return `${archInfo}macOS 磁盘镜像`;
  if (n.endsWith(".appimage")) return `${archInfo}Linux 通用运行包`;
  if (n.endsWith(".deb")) return `${archInfo}Debian / Ubuntu`;
  if (n.endsWith(".rpm")) return `${archInfo}RedHat / Fedora`;
  if (n.endsWith(".tar.gz")) return `${archInfo}Linux 压缩包`;
  if (n.endsWith(".zip")) return `${archInfo}便携式压缩包`;
  return "安装程序";
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (s: string) => {
  if (!s) return "";
  return new Date(s).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const renderMarkdown = (text: string) => {
  return marked.parse(text);
};

onMounted(() => {
  platform.value = detectPlatform();
  arch.value = detectArch();
  fetchLatestRelease();
});
</script>

<style scoped>
.download-page {
  margin: 0 auto;
  color: var(--vp-c-text-1);
}

.content-fade-in {
  animation: fadeIn 0.5s cubic-bezier(0.2, 0, 0.4, 1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 加载中 */
.loading {
  padding: 5rem 0;
  text-align: center;
}
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand);
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Hero 区域 */
.version-hero {
  margin: 2.5rem 0;
}
.version-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.version-tag {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
  padding: 0.2rem 1rem;
  background: var(--vp-c-brand-soft);
  border-radius: 20px;
}
.release-date {
  font-size: 1rem;
  color: var(--vp-c-text-3);
}

/* 推荐卡片优化 */
.recommended-card {
  padding: 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.smart-info {
  margin-bottom: 2rem;
  font-size: 1rem;
  color: var(--vp-c-text-2);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.magic-icon {
  font-size: 1.2rem;
}

/* 按钮容器 */
.recommended-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 核心按钮重构：无底色边框样式 */
.cta-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: transparent;
  border: 1.5px solid var(--vp-c-brand-1);
  color: var(--vp-c-brand-1) !important;
  border-radius: 10px;
  text-decoration: none !important;
  transition: all 0.25s ease;
}
.cta-button:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-2);
}

.main-text-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.portable-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  background: var(--vp-c-brand-1);
  color: #ffffff !important;
  border-radius: 4px;
  line-height: 1.4;
}

.portable-tag.mini {
  padding: 0 0.4rem;
  font-size: 0.7rem;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.btn-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}
.main-text {
  font-size: 1.15rem;
  font-weight: 700;
}
.sub-text {
  font-size: 0.85rem;
  opacity: 0.8;
}
.btn-badge {
  padding: 0.4rem 0.8rem;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
}

/* 更新日志 */
.changelog-compact {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
}
.changelog-compact summary {
  cursor: pointer;
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-size: 0.95rem;
  user-select: none;
}
.markdown-body {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body :deep(h1) {
  font-size: 1.5rem;
}
.markdown-body :deep(h2) {
  font-size: 1.25rem;
}
.markdown-body :deep(h3) {
  font-size: 1.1rem;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 2rem;
  margin-top: 0;
  margin-bottom: 1rem;
}

.markdown-body :deep(li) {
  margin-top: 0.25rem;
}

.markdown-body :deep(a) {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(code) {
  padding: 0.2rem 0.4rem;
  margin: 0;
  font-size: 85%;
  background-color: var(--vp-c-bg-soft);
  border-radius: 6px;
  font-family: var(--vp-font-family-mono);
}

.markdown-body :deep(pre) {
  padding: 1rem;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: var(--vp-c-bg-soft);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.markdown-body :deep(blockquote) {
  padding: 0 1rem;
  color: var(--vp-c-text-2);
  border-left: 0.25rem solid var(--vp-c-divider);
  margin: 0 0 1rem 0;
}

.markdown-body :deep(table) {
  display: block;
  width: 100%;
  overflow: auto;
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.markdown-body :deep(table th),
.markdown-body :deep(table td) {
  padding: 6px 13px;
  border: 1px solid var(--vp-c-divider);
}

.markdown-body :deep(table tr) {
  background-color: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
}

.markdown-body :deep(table tr:nth-child(2n)) {
  background-color: var(--vp-c-bg-soft);
}

.markdown-body :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: var(--vp-c-divider);
  border: 0;
}

/* 全平台部分 */
.platforms-section {
  margin-top: 5rem;
}
.section-header {
  margin-bottom: 3rem;
  text-align: center;
}
.section-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.section-desc {
  color: var(--vp-c-text-3);
  font-size: 1rem;
}

.platform-block {
  margin-bottom: 4rem;
}
.block-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.platform-icon {
  font-size: 1.5rem;
}
.block-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.download-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}
.download-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  text-decoration: none !important;
  transition: all 0.2s ease;
}
.download-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-alt);
  transform: translateX(4px);
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.file-label-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.file-type-tag {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}
.file-size-tag {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  padding: 0.25rem 0.6rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  flex-shrink: 0;
}

/* 页脚 */
.download-footer {
  margin: 6rem 0 4rem;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}
.download-footer a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

@media (max-width: 640px) {
  .recommended-card {
    padding: 1.5rem;
  }
  .cta-button {
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem 1rem;
    text-align: center;
  }
  .btn-badge {
    width: 100%;
  }
  .download-grid {
    grid-template-columns: 1fr;
  }
  .section-title {
    font-size: 1.5rem;
  }
}
</style>
