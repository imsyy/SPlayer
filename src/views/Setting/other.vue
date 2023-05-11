<template>
  <div class="set-other">
    <n-card class="set-item">
      <div class="name">
        程序重置
        <span class="tip">若程序显示异常或出现问题时可尝试此操作</span>
      </div>
      <n-button strong secondary type="error" @click="resetApp">
        重置
      </n-button>
    </n-card>
  </div>
</template>

<script setup>
// 程序重置
const resetApp = () => {
  const cleanAll = () => {
    $message ? $message.success("重置成功") : alert("重置成功");
    localStorage.clear();
    window.location.href = "/";
  };
  $dialog.warning({
    class: "s-dialog",
    title: "程序重置",
    content: "确认重置为默认状态？你的登录状态以及自定义设置都将丢失！",
    positiveText: "确认重置",
    negativeText: "取消",
    onPositiveClick: () => {
      $cleanAll ? $cleanAll() : cleanAll();
    },
  });
};
</script>
