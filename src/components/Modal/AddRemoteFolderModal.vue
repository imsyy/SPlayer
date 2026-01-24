<template>
  <div class="add-remote-folder">
    <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="90">
      <n-form-item label="协议类型" path="type">
        <n-select v-model:value="formData.type" :options="protocolOptions" />
      </n-form-item>
      <n-form-item label="显示名称" path="name">
        <n-input v-model:value="formData.name" :placeholder="namePlaceholder" />
      </n-form-item>
      <n-form-item label="服务器地址" path="host">
        <n-input v-model:value="formData.host" placeholder="192.168.1.100" />
      </n-form-item>
      <n-form-item v-if="showPort" label="端口" path="port">
        <n-input-number v-model:value="formData.port" :min="1" :max="65535" style="width: 100%" />
      </n-form-item>
      <n-form-item label="共享路径" path="path">
        <n-input v-model:value="formData.path" :placeholder="pathPlaceholder" />
      </n-form-item>
      <n-form-item v-if="showAuth" label="用户名" path="username">
        <n-input v-model:value="formData.username" placeholder="可选" />
      </n-form-item>
      <n-form-item v-if="showAuth" label="密码" path="password">
        <n-input v-model:value="formData.password" type="password" show-password-on="click" placeholder="可选" />
      </n-form-item>
    </n-form>
    <n-flex justify="space-between">
      <n-button :loading="testing" @click="testConnection">
        <template #icon>
          <SvgIcon name="Link" />
        </template>
        测试连接
      </n-button>
      <n-button type="primary" :disabled="!isFormValid" @click="confirmAdd">
        添加
      </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui";
import { useSettingStore } from "@/stores";
import { textRule } from "@/utils/rules";
import { nanoid } from "@/utils/helper";
import type { RemoteFolderConfig, RemoteFolderType } from "@/types/local";

const props = withDefaults(
  defineProps<{
    /** 初始协议类型 */
    initialType?: RemoteFolderType;
  }>(),
  { initialType: "smb" },
);

const emit = defineEmits<{ close: [] }>();

const settingStore = useSettingStore();

// 表单引用
const formRef = ref<FormInst | null>(null);

// 测试状态
const testing = ref(false);

// 协议选项
const protocolOptions: SelectOption[] = [
  { label: "SMB", value: "smb" },
  { label: "NFS", value: "nfs" },
  { label: "WebDAV", value: "webdav" },
  { label: "FTP", value: "ftp" },
];

// 表单数据
const formData = ref<{
  type: RemoteFolderType;
  name: string;
  host: string;
  port: number | null;
  path: string;
  username: string;
  password: string;
}>({
  type: props.initialType,
  name: "",
  host: "",
  port: null,
  path: "",
  username: "",
  password: "",
});

// 表单验证规则
const formRules: FormRules = {
  name: textRule,
  host: {
    required: true,
    message: "请输入服务器地址",
    trigger: ["blur", "input"],
  },
  path: {
    required: true,
    message: "请输入共享路径",
    trigger: ["blur", "input"],
  },
};

// 默认端口
const defaultPorts: Record<RemoteFolderType, number> = {
  smb: 445,
  nfs: 2049,
  webdav: 443,
  ftp: 21,
};

// 是否显示端口
const showPort = computed(() => ["webdav", "ftp"].includes(formData.value.type));

// 是否显示认证
const showAuth = computed(() => ["smb", "webdav", "ftp"].includes(formData.value.type));

// 显示名称占位符
const namePlaceholder = computed(() => {
  switch (formData.value.type) {
    case "smb":
      return "我的SMB共享";
    case "nfs":
      return "我的NFS挂载";
    case "webdav":
      return "我的WebDAV";
    case "ftp":
      return "我的FTP服务器";
    default:
      return "";
  }
});

// 路径占位符
const pathPlaceholder = computed(() => {
  switch (formData.value.type) {
    case "smb":
      return "share/music";
    case "nfs":
      return "/export/music";
    case "webdav":
      return "/dav/music";
    case "ftp":
      return "/music";
    default:
      return "";
  }
});

// 表单是否有效
const isFormValid = computed(() => {
  return formData.value.name && formData.value.host && formData.value.path;
});

// 生成完整路径
const getFullPath = (): string => {
  const { type, host, port, path, username, password } = formData.value;
  const cleanPath = path.replace(/^\/+/, "");
  
  switch (type) {
    case "smb":
      // SMB 使用 UNC 路径: \\host\share\path
      // 将所有正斜杠替换为反斜杠
      return `\\\\${host}\\${cleanPath.replace(/\//g, "\\")}`;
    case "nfs":
      // NFS 使用网络路径: \\host\path
      return `\\\\${host}${path.startsWith("/") ? path : "/" + path}`;
    case "webdav":
      // WebDAV URL (支持 http/https)
      const webdavPort = port || defaultPorts.webdav;
      const webdavAuth = username ? `${username}:${password}@` : "";
      
      let protocol = "https://";
      let cleanHost = host;
      
      if (host.startsWith("http://")) {
        protocol = "http://";
        cleanHost = host.slice(7);
      } else if (host.startsWith("https://")) {
        protocol = "https://";
        cleanHost = host.slice(8);
      }
      
      return `${protocol}${webdavAuth}${cleanHost}:${webdavPort}${path.startsWith("/") ? path : "/" + path}`;
    case "ftp":
      // FTP URL
      const ftpPort = port || defaultPorts.ftp;
      const ftpAuth = username ? `${username}:${password}@` : "";
      return `ftp://${ftpAuth}${host}:${ftpPort}${path.startsWith("/") ? path : "/" + path}`;
    default:
      return "";
  }
};

// 测试连接
const testConnection = async () => {
  // 验证必填字段
  if (!formData.value.host || !formData.value.path) {
    window.$message.warning("请先填写服务器地址和共享路径");
    return;
  }
  testing.value = true;
  try {
    const fullPath = getFullPath();
    const result = await window.electron.ipcRenderer.invoke("remote-folder-test", {
      type: formData.value.type,
      path: fullPath,
      username: formData.value.username,
      password: formData.value.password,
    });
    if (result.success) {
      window.$message.success("连接成功");
    } else {
      window.$message.error(result.message || "连接失败");
    }
  } catch (error) {
    console.error("测试连接失败:", error);
    window.$message.error("测试连接失败");
  } finally {
    testing.value = false;
  }
};

// 确认添加
const confirmAdd = async () => {
  try {
    await formRef.value?.validate();
    
    // 先测试连接
    testing.value = true;
    const fullPath = getFullPath();
    const result = await window.electron.ipcRenderer.invoke("remote-folder-test", {
      type: formData.value.type,
      path: fullPath,
      username: formData.value.username,
      password: formData.value.password,
    });
    testing.value = false;
    
    if (!result.success) {
      window.$message.error(result.message || "连接测试失败，无法添加");
      return;
    }
    
    const config: RemoteFolderConfig = {
      id: nanoid(),
      type: formData.value.type,
      name: formData.value.name,
      host: formData.value.host,
      port: formData.value.port || undefined,
      path: formData.value.path,
      username: formData.value.username || undefined,
      password: formData.value.password || undefined,
      fullPath,
      enabled: true,
    };
    
    settingStore.remoteFolders.push(config);
    window.$message.success("远程文件夹添加成功");
    emit("close");
  } catch (error) {
    testing.value = false;
    // 验证失败
  }
};
</script>

<style lang="scss" scoped>
.add-remote-folder {
  .n-form {
    margin-top: 12px;
  }
  .n-flex {
    margin-top: 16px;
  }
}
</style>
