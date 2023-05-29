<template>
  <div class="setting">
    <div class="title">{{ $t("nav.avatar.setting") }}</div>
    <n-tabs
      class="main-tab"
      type="segment"
      @update:value="tabChange"
      v-model:value="tabValue"
    >
      <n-tab name="main">{{ $t("setting.main") }}</n-tab>
      <n-tab name="player">{{ $t("setting.player") }}</n-tab>
      <n-tab name="other">{{ $t("general.type.other") }}</n-tab>
    </n-tabs>
    <main class="content">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <Transition name="move" mode="out-in">
            <component :is="Component" />
          </Transition>
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();

// Tab 默认选中
const tabValue = ref(router.currentRoute.value.path.split("/")[2]);

// Tab 选项卡变化
const tabChange = (value) => {
  console.log(value);
  router.push({
    path: `/setting/${value}`,
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    tabValue.value = val.path.split("/")[2];
  }
);

onMounted(() => {
  $setSiteTitle(t("nav.avatar.setting"));
  // 回顶
  if (typeof $scrollToTop !== "undefined") $scrollToTop();
});
</script>

<style lang="scss" scoped>
.setting {
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    font-size: 40px;
    font-weight: bold;
    display: flex;
    align-items: center;
  }
  .content {
    margin-top: 20px;
    :deep(.set-item) {
      width: 100%;
      border-radius: 8px;
      margin-bottom: 12px;
      .n-card__content {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        .name {
          font-size: 16px;
          display: flex;
          flex-direction: column;
          padding-right: 20px;
          .dev {
            display: flex;
            flex-direction: row;
            align-items: center;
            .n-tag {
              margin-left: 6px;
            }
          }
          .tip {
            font-size: 12px;
            opacity: 0.8;
          }
        }
        .set {
          width: 200px;
          @media (max-width: 768px) {
            width: 140px;
            min-width: 140px;
          }
        }
        .more {
          padding: 12px;
          border-radius: 8px;
          background-color: var(--n-border-color);
          width: 100%;
          margin-top: 12px;
          box-sizing: border-box;
          &.blur {
            .lrc {
              filter: blur(2px);
              &.on {
                filter: blur(0);
              }
            }
          }
          .lrc {
            opacity: 0.6;
            display: flex;
            flex-direction: column;
            transform: scale(0.95);
            transition: all 0.3s;
            &.on {
              font-weight: bold;
              opacity: 1;
              transform: scale(1.05);
            }
          }
        }
      }
    }
  }
}
// 路由跳转动画
.move-enter-active,
.move-leave-active {
  transition: all 0.2s ease;
}

.move-enter-from,
.move-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
