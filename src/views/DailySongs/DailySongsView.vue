<template>
  <div class="dailysongs">
    <div class="title">
      <div class="date">
        <n-icon class="calendar" :component="CalendarTodayFilled" />
        <n-text class="num" v-html="new Date().getDate()" />
      </div>
      <div class="right">
        <n-gradient-text class="big" type="danger">
          {{ $t("home.modules.dailySongs.title") }}
        </n-gradient-text>
        <n-text class="tip" :depth="3">
          {{ $t("home.modules.dailySongs.subtitle") }}
        </n-text>
      </div>
    </div>
    <DataLists :listData="music.getDailySongs" />
  </div>
</template>

<script setup>
import { getDailySongs } from "@/api/home";
import { musicStore } from "@/store";
import { CalendarTodayFilled } from "@vicons/material";
import { useI18n } from "vue-i18n";
import DataLists from "@/components/DataList/DataLists.vue";

const { t } = useI18n();
const music = musicStore();

// 获取每日推荐数据
const getDailySongsData = () => {
  if (music.getDailySongs.length === 0) {
    getDailySongs().then((res) => {
      if (res.data.dailySongs) {
        music.setDailySongs(res.data.dailySongs);
      } else {
        $message.error(t("general.message.acquisitionFailed"));
      }
    });
  }
};

onMounted(() => {
  $setSiteTitle(t("home.modules.dailySongs.title"));
  getDailySongsData();
});
</script>

<style lang="scss" scoped>
.dailysongs {
  .title {
    margin: 30px 0 40px;
    font-size: 40px;
    display: flex;
    align-items: center;
    .date {
      position: relative;
      margin-right: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      .calendar {
        font-size: 70px;
        color: #d03050;
        transform: translateY(-3px);
      }
      .num {
        margin-top: 7px;
        position: absolute;
        font-size: 30px;
        font-weight: bold;
        color: #d03050;
      }
    }
    .right {
      display: flex;
      flex-direction: column;
      .big {
        --n-font-weight: bold;
        line-height: 50px;
      }
      .tip {
        font-size: 14px;
        margin-left: 2px;
      }
    }
  }
}
</style>
