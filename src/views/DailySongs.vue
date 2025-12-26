<!-- 每日推荐 -->
<template>
  <div class="daily-songs">
    <div class="title">
      <n-text class="name">{{ t("home.recommend.daily") }}</n-text>
      <div class="tip">
        <Transition name="fade" mode="out-in">
          <n-text :key="updatedTime" depth="3">
            {{ t("home.recommend.dailyDesc").split(" · ")[0] }} ·
            {{ updatedTime ? t("home.recommend.updatedAt") + " " + updatedTime : t("home.recommend.dailyUpdateTip") }}
          </n-text>
        </Transition>
      </div>
      <n-flex class="menu">
        <n-button
          :focusable="false"
          type="primary"
          size="large"
          strong
          secondary
          round
          v-debounce="() => player.updatePlayList(musicStore.dailySongsData.list)"
        >
          <template #icon>
            <SvgIcon name="Play" />
          </template>
          {{ t("home.recommend.playAll") }}
        </n-button>

        <!-- 更多 -->
        <n-dropdown :options="moreOptions" trigger="click" placement="bottom-start">
          <n-button :focusable="false" size="large" class="more" circle strong secondary>
            <template #icon>
              <SvgIcon name="List" />
            </template>
          </n-button>
        </n-dropdown>
      </n-flex>
    </div>
    <!-- 列表 -->
    <SongList
      :data="musicStore.dailySongsData.list"
      :loading="true"
      height="auto"
      isDailyRecommend
      disabledSort
    />
  </div>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import { useMusicStore } from "@/stores";
import { updateDailySongsData } from "@/utils/auth";
import { formatTimestamp } from "@/utils/time";
import { renderIcon } from "@/utils/helper";
import { openBatchList } from "@/utils/modal";
import { usePlayerController } from "@/core/player/PlayerController";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const player = usePlayerController();
const musicStore = useMusicStore();

// 更新日期
const updatedTime = computed(() =>
  formatTimestamp(musicStore.dailySongsData.timestamp || 0, "MM-DD HH:mm"),
);

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: t("home.recommend.refresh"),
    key: "refresh",
    props: {
      onClick: async () => {
        await updateDailySongsData(true);
      },
    },
    icon: renderIcon("Refresh"),
  },
  {
    label: t("home.recommend.batch"),
    key: "batch",
    props: {
      onClick: () => openBatchList(musicStore.dailySongsData.list, false),
    },
    icon: renderIcon("Batch"),
  },
]);

onActivated(updateDailySongsData);
onMounted(updateDailySongsData);
</script>


<style lang="scss" scoped>
.daily-songs {
  .title {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    height: 300px;
    margin-bottom: 20px;
    .name {
      font-size: 55px;
      font-weight: bold;
      animation: fade-spacing 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .tip {
      font-size: 16px;
      margin-top: 6px;
      opacity: 0;
      animation: fade-down 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      animation-delay: 0.5s;
    }
    .menu {
      margin-top: 30px;
    }
  }
  .song-list {
    height: auto;
  }
}
</style>
