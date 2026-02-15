<template>
  <div class="streaming-server-config">
    <n-form
      ref="formRef"
      :model="serverForm"
      :rules="formRules"
      label-placement="left"
      label-width="auto"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="服务类型" path="type">
        <n-select
          v-model:value="serverForm.type"
          :options="serverTypeOptions"
          placeholder="选择服务类型"
        />
      </n-form-item>
      <n-form-item label="服务器名称" path="name">
        <n-input v-model:value="serverForm.name" placeholder="为服务器取个名字（如：我的音乐库）" />
      </n-form-item>
      <n-form-item label="服务器地址" path="url">
        <n-input v-model:value="serverForm.url" placeholder="http://127.0.0.1:4533" />
      </n-form-item>
      <n-form-item label="用户名" path="username">
        <n-input v-model:value="serverForm.username" placeholder="输入用户名" />
      </n-form-item>
      <n-form-item label="密码" path="password">
        <n-input
          v-model:value="serverForm.password"
          type="password"
          show-password-on="click"
          placeholder="输入密码"
        />
      </n-form-item>
    </n-form>
    <n-flex justify="end" style="margin-top: 12px">
      <n-button @click="handleCancel">取消</n-button>
      <n-button type="primary" :loading="loading" @click="handleSave">
        {{ isEditing ? "保存" : "添加" }}
      </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { StreamingServerConfig, StreamingServerType } from "@/types/streaming";
import type { FormInst, FormRules } from "naive-ui";

const props = defineProps<{
  server?: StreamingServerConfig | null;
}>();

const emit = defineEmits<{
  /** 保存成功 */
  save: [config: Omit<StreamingServerConfig, "id">];
  /** 取消 */
  cancel: [];
}>();

const loading = ref<boolean>(false);
const formRef = ref<FormInst | null>(null);
// 是否为编辑
const isEditing = computed(() => !!props.server);

// 服务器表单
const serverForm = reactive({
  type: "navidrome" as StreamingServerType,
  name: "",
  url: "",
  username: "",
  password: "",
});

// 服务器类型选项
const serverTypeOptions = [
  { label: "Navidrome", value: "navidrome" },
  { label: "Jellyfin", value: "jellyfin" },
  { label: "Emby", value: "emby" },
  { label: "Subsonic", value: "subsonic" },
  { label: "OpenSubsonic", value: "opensubsonic" },
];

// 表单验证规则
const formRules: FormRules = {
  type: { required: true, message: "请选择服务类型", trigger: "change" },
  name: { required: true, message: "请输入服务器名称", trigger: "blur" },
  url: { required: true, message: "请输入服务器地址", trigger: "blur" },
  username: { required: true, message: "请输入用户名", trigger: "blur" },
  password: { required: true, message: "请输入密码", trigger: "blur" },
};

// 用服务器数据填充表单
const fillForm = (server: StreamingServerConfig) => {
  serverForm.type = server.type;
  serverForm.name = server.name;
  serverForm.url = server.url;
  serverForm.username = server.username;
  serverForm.password = server.password;
};

// 保存
const handleSave = async () => {
  try {
    await formRef.value?.validate();
    loading.value = true;

    emit("save", {
      type: serverForm.type,
      name: serverForm.name,
      url: serverForm.url,
      username: serverForm.username,
      password: serverForm.password,
    });
  } catch {
    // 验证失败
  } finally {
    loading.value = false;
  }
};

// 取消
const handleCancel = () => emit("cancel");

// 监听服务器变化
watch(
  () => props.server,
  (server) => {
    if (server) {
      fillForm(server);
    }
  },
  { immediate: true },
);
</script>
