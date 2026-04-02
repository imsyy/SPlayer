<template>
  <div class="cloud-upload">
    <!-- 文件选择 -->
    <n-upload
      :custom-request="handleUpload"
      :show-file-list="false"
      multiple
      accept="audio/*"
      @before-upload="beforeUpload"
    >
      <n-upload-dragger>
        <div class="upload-area">
          <SvgIcon name="Cloud" :size="48" />
          <n-text class="upload-hint">点击或拖拽文件到此区域上传</n-text>
          <n-text depth="3" class="upload-desc">
            支持多文件上传
          </n-text>
        </div>
      </n-upload-dragger>
    </n-upload>

    <!-- 上传进度 -->
    <div v-if="uploadQueue.length > 0" class="progress-section">
      <n-scrollbar style="max-height: 300px">
        <div v-for="item in uploadQueue" :key="item.id" class="progress-item">
          <n-flex vertical :size="4">
            <n-flex justify="space-between" align="center">
              <n-text>{{ item.file.name }}</n-text>
              <n-flex align="center" :size="8">
                <n-text depth="3" style="font-size: 12px">{{ formatSize(item.file.size) }}</n-text>
                <n-button
                  v-if="item.status === 'error'"
                  size="tiny"
                  type="primary"
                  secondary
                  @click="retryUpload(item)"
                >
                  重试
                </n-button>
              </n-flex>
            </n-flex>
            <n-flex justify="space-between" align="center">
              <n-text :type="item.error ? 'error' : item.status === 'success' ? 'success' : 'info'" depth="2" style="font-size: 13px">
                {{ item.statusText }}
              </n-text>
              <n-text depth="3" style="font-size: 12px">
                {{ item.percent }}%
              </n-text>
            </n-flex>
            <n-progress
              :percentage="item.percent"
              :status="item.error ? 'error' : item.status === 'success' ? 'success' : 'default'"
              :show-indicator="false"
            />
          </n-flex>
        </div>
      </n-scrollbar>
    </div>

    <!-- 底部按钮 -->
    <n-flex class="menu" justify="end">
      <n-button strong secondary @click="emit('close')"> 关闭 </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { UploadCustomRequestOptions } from "naive-ui";
import { uploadCloudSong, getCloudUploadToken, completeCloudUpload } from "@/api/cloud";
import md5 from "md5";
import axios from "axios";

const emit = defineEmits<{
  close: [];
  success: [];
}>();

// 上传队列
interface UploadItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  statusText: string;
  percent: number;
  error: boolean;
}

const uploadQueue = ref<UploadItem[]>([]);
const isUploading = ref(false);

// 文件上传前校验
const beforeUpload = (data: { file: { file: File | null }; fileList: any[] }) => {
  const file = data.file.file;
  if (!file) return false;
  
  // 检查是否为音频文件
  if (!file.type.startsWith("audio/")) {
    window.$message.warning(`${file.name} 不是音频文件`);
    return false;
  }
  
  return true;
};

// 检查文件是否已在队列中（排除已成功和失败的文件）
const isFileInQueue = (file: File): boolean => {
  return uploadQueue.value.some(item => 
    item.file.name === file.name && 
    item.file.size === file.size &&
    item.file.lastModified === file.lastModified &&
    (item.status === 'pending' || item.status === 'uploading')
  );
};

// 重试上传失败的文件
const retryUpload = async (item: UploadItem) => {
  // 重置状态
  item.status = 'pending';
  item.statusText = '准备中...';
  item.percent = 0;
  item.error = false;
  
  // 如果当前没有正在上传的任务，立即开始处理
  if (!isUploading.value) {
    isUploading.value = true;
    await processUploadQueue();
    isUploading.value = false;
  }
};

// 处理文件上传
const handleUpload = async (options: UploadCustomRequestOptions) => {
  const file = options.file.file;
  if (!file) return;

  // 检查文件是否已存在于队列中
  if (isFileInQueue(file as File)) {
    window.$message.warning(`${file.name} 已在上传队列中`);
    return;
  }

  // 添加到上传队列
  const uploadItem: UploadItem = {
    id: `${Date.now()}_${Math.random()}`,
    file: file as File,
    status: "pending",
    statusText: "准备中...",
    percent: 0,
    error: false,
  };
  uploadQueue.value.push(uploadItem);

  // 开始上传
  if (!isUploading.value) {
    isUploading.value = true;
    await processUploadQueue();
    isUploading.value = false;
  }
};

// 处理上传队列
const processUploadQueue = async () => {
  for (const item of uploadQueue.value) {
    if (item.status !== "pending") continue;

    try {
      // 先尝试后端代理，失败则回退到客户端直传
      await uploadFileWithFallback(item);
      item.status = "success";
      item.statusText = "上传完成！";
      item.percent = 100;
    } catch (error: any) {
      console.error(`${item.file.name} 上传失败:`, error);
      item.status = "error";
      item.error = true;
      const errorMsg = error.response?.data?.msg || error.message || "未知错误";
      item.statusText = `上传失败: ${errorMsg}`;
      item.percent = 0;
    }
  }
  
  // 检查是否有成功的上传
  const hasSuccess = uploadQueue.value.some(item => item.status === "success");
  if (hasSuccess) {
    // 通知刷新
    emit("success");
    
    // 清理已成功上传的文件
    setTimeout(() => {
      uploadQueue.value = uploadQueue.value.filter(item => item.status !== "success");
    }, 3000);
  }
};

// 先尝试后端代理，失败则回退到客户端直传
const uploadFileWithFallback = async (item: UploadItem) => {
  try {
    // 先尝试后端代理上传
    item.statusText = "正在使用后端代理上传...";
    await uploadFileProxy(item);
  } catch (error: any) {
    // 回退到客户端直传
    window.$message.info(`${item.file.name}: 后端上传失败，切换到客户端直传模式`);
    item.statusText = "切换到客户端直传模式...";
    item.percent = 0;
    await uploadFileDirect(item);
  }
};

// 后端代理上传
const uploadFileProxy = async (item: UploadItem) => {
  item.status = "uploading";
  item.statusText = "上传中...";
  item.percent = 10;

  await uploadCloudSong(item.file);
  
  item.percent = 100;
};

// 客户端直传
const uploadFileDirect = async (item: UploadItem) => {
  item.status = "uploading";
  
  // 计算MD5
  item.statusText = "计算文件MD5...";
  item.percent = 5;
  const fileMd5 = await calculateMD5(item.file);
  const ext = item.file.name.split(".").pop() || "mp3";
  const filename = item.file.name.replace("." + ext, "").replace(/\s/g, "").replace(/\./g, "_");

  // 获取上传凭证
  item.statusText = "获取上传凭证...";
  item.percent = 10;
  const tokenRes = await getCloudUploadToken(fileMd5, item.file.size, filename);
  if (tokenRes.code !== 200) {
    throw new Error(tokenRes.msg || "获取上传凭证失败");
  }

  const uploadData = tokenRes.data;
  const needUpload = uploadData.needUpload;
  const songId = uploadData.songId;
  const resourceId = uploadData.resourceId;

  // 如果需要上传文件
  if (needUpload) {
    item.statusText = "上传到云存储...";
    item.percent = 20;

    await axios({
      method: "put",
      url: uploadData.uploadUrl,
      headers: {
        "x-nos-token": uploadData.uploadToken,
        "Content-Type": item.file.type || "audio/mpeg",
        "Content-MD5": fileMd5,
      },
      data: item.file,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 70) + 20;
          item.percent = Math.min(percent, 90);
          item.statusText = `上传中... ${Math.round((progressEvent.loaded / progressEvent.total) * 100)}%`;
        }
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 600000,
    });
  } else {
    item.statusText = "文件已存在，跳过上传...";
    item.percent = 90;
  }

  // 提取歌曲信息
  let song: string | undefined;
  let artist: string | undefined;
  let album: string | undefined;

  // 在 Electron 环境中，尝试使用 music-metadata 解析完整元数据
  const filePath = (item.file as any).path;
  if (filePath && window.electron?.ipcRenderer) {
    try {
      const metadata = await window.electron.ipcRenderer.invoke("get-music-metadata", filePath);
      song = metadata.common?.title;
      artist = metadata.common?.artist;
      album = metadata.common?.album;
    } catch (error) {
      console.warn("获取音乐元数据失败，回退到文件名解析:", error);
    }
  }

  // 如果没有获取到元数据（网页环境或解析失败），从文件名提取
  if (!song) {
    const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
    const dashMatch = nameWithoutExt.match(/^(.+?)\s*-\s*(.+)$/);
    song = dashMatch ? dashMatch[2].trim() : nameWithoutExt;
    artist = dashMatch ? dashMatch[1].trim() : undefined;
  }

  // 完成导入
  item.statusText = "完成导入...";
  item.percent = 95;
  const completeRes = await completeCloudUpload(
    String(songId),
    filename,
    resourceId,
    fileMd5,
    song,
    artist,
    album,
  );
  if (completeRes.code !== 200) {
    throw new Error(completeRes.msg || "完成导入失败");
  }

  item.percent = 100;
};

// 计算文件MD5
const calculateMD5 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        try {
          const arrayBuffer = e.target.result as ArrayBuffer;
          const hash = md5(new Uint8Array(arrayBuffer));
          resolve(hash);
        } catch (error) {
          reject(error);
        }
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};
</script>

<style lang="scss" scoped>
.cloud-upload {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px;

  .mode-tip {
    margin-bottom: 16px;
  }

  .upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    gap: 12px;

    .upload-hint {
      font-size: 16px;
      font-weight: bold;
    }

    .upload-desc {
      font-size: 13px;
      text-align: center;
      max-width: 400px;
    }
  }

  .progress-section {
    background-color: var(--n-color);
    border-radius: 8px;
    padding: 12px;

    .progress-item {
      padding: 12px;
      border-radius: 6px;
      background-color: var(--n-color-hover);
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .menu {
    margin-top: 8px;
  }
}
</style>
