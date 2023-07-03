<template>
  <div class="cloud">
    <div class="data">
      <n-button
        class="up"
        type="primary"
        strong
        secondary
        round
        @click="upSongRef.click()"
      >
        <template #icon>
          <n-icon :component="BackupRound" />
        </template>
        {{ $t("general.name.upCloud") }}
      </n-button>
      <input
        ref="upSongRef"
        type="file"
        style="display: none"
        accept="audio/*"
        @change="upCloudSongData"
      />
      <div class="space" v-if="cloudSpace[0]">
        <span>{{ cloudSpace[0] }} G</span>
        <n-popover trigger="hover">
          <template #trigger>
            <n-progress
              type="line"
              :color="setting.themeData.primaryColor"
              class="progress"
              :show-indicator="false"
              :percentage="100 / (cloudSpace[1] / cloudSpace[0])"
            />
          </template>
          <n-text>
            {{
              $t("general.name.cloudUsed", {
                used: (100 / (cloudSpace[1] / cloudSpace[0])).toFixed(),
                remaining: (cloudSpace[1] - cloudSpace[0]).toFixed(),
              })
            }}
          </n-text>
        </n-popover>
        <span>{{ cloudSpace[1] }} G</span>
      </div>
    </div>
    <DataLists :listData="cloudData" />
    <Pagination
      :totalCount="totalCount"
      :pageNumber="pageNumber"
      @pageSizeChange="pageSizeChange"
      @pageNumberChange="pageNumberChange"
    />
    <!-- 上传进度弹窗 -->
    <n-modal
      class="s-modal close"
      v-model:show="upSongModal"
      preset="card"
      :title="$t('general.name.upCloud')"
      :auto-focus="false"
      :bordered="false"
      :close-on-esc="false"
      :esc="false"
      :mask-closable="false"
    >
      <n-progress
        type="line"
        :status="upSongType"
        :percentage="upSongCompleted"
        :indicator-placement="'inside'"
        processing
      />
      <template #footer>
        <n-space justify="end" v-if="upSongType === 'error'">
          <n-button @click="closeUpSongModal">
            {{ $t("general.dialog.cancel") }}
          </n-button>
          <n-button type="primary" @click="resetUpSongModal">
            {{ $t("general.dialog.resetUp") }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { getCloud, upCloudSong } from "@/api/user";
import { useRouter } from "vue-router";
import { settingStore } from "@/store";
import { getSongTime } from "@/utils/timeTools";
import { BackupRound } from "@vicons/material";
import { useI18n } from "vue-i18n";
import DataLists from "@/components/DataList/DataLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const { t } = useI18n();
const router = useRouter();
const setting = settingStore();

// 云盘数据
const cloudSpace = ref([]);
const cloudData = ref([]);
const pagelimit = ref(30);
const pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);
const totalCount = ref(0);

// 上传歌曲数据
const upSongRef = ref(null);
const upSongType = ref("success");
const upSongModal = ref(false);
const upSongCompleted = ref(0);

// 获取云盘数据
const getCloudData = (limit = 30, offset = 0, scroll = true) => {
  getCloud(limit, offset).then((res) => {
    console.log(res);
    totalCount.value = res.count;
    cloudData.value = [];
    // 云盘空间
    cloudSpace.value = [
      (res.size / Math.pow(1024, 3)).toFixed(2),
      (res.maxSize / Math.pow(1024, 3)).toFixed(0),
    ];
    // 全部歌曲
    if (res.data) {
      res.data.forEach((v, i) => {
        cloudData.value.push({
          id: v.songId,
          num: i + 1 + (pageNumber.value - 1) * pagelimit.value,
          name: v.simpleSong.name,
          artist: v.simpleSong.ar,
          album: v.simpleSong.al,
          alia: v.simpleSong.alia,
          mv: v.simpleSong.mv,
          time: getSongTime(v.simpleSong.dt),
        });
      });
    } else {
      $message.error(t("general.message.acquisitionFailed"));
    }
    // 请求后回顶
    if (typeof $scrollToTop !== "undefined") $scrollToTop();
  });
};

// 上传进度条
const onUploadProgress = (progressEvent) => {
  const { loaded, total } = progressEvent;
  const percentCompleted = Math.round((loaded * 100) / total);
  upSongCompleted.value = Number(percentCompleted);
};

// 歌曲上传
const upCloudSongData = (e) => {
  console.log(e);
  const files = e.target.files;
  if (!files[0]) return false;
  upSongType.value = "success";
  upSongModal.value = true;
  upCloudSong(files[0], onUploadProgress)
    .then((res) => {
      console.log(res);
      if (res.code === 200) {
        closeUpSongModal();
        if (!res.privateCloud.simpleSong.al?.name) {
          $message.warning(t("general.message.upCloudNotHas"));
        }
        $message.success(
          t("general.message.upCloudSuccess", {
            name: res.privateCloud.simpleSong?.name,
          })
        );
        getCloudData(pagelimit.value, (pageNumber.value - 1) * pagelimit.value);
      } else {
        upSongType.value = "error";
        $message.error(t("general.message.upCloudError"));
        console.error(t("general.message.upCloudError"));
      }
    })
    .catch((err) => {
      upSongType.value = "error";
      closeUpSongModal();
      $message.error(t("general.message.upCloudFailure"));
      console.error(t("general.message.upCloudFailure"), err);
    });
};

// 关闭上传弹窗
const closeUpSongModal = () => {
  upSongModal.value = false;
  upSongCompleted.value = 0;
  upSongRef.value.value = null;
};

// 重新上传
const resetUpSongModal = () => {
  closeUpSongModal();
  upSongRef.value.click();
};

// 每页个数数据变化
const pageSizeChange = (val) => {
  console.log(val);
  pagelimit.value = val;
  getCloudData(val, (pageNumber.value - 1) * pagelimit.value);
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/user/cloud",
    query: {
      page: val,
    },
  });
};

// 当前页数据重载
const cloudDataLoad = (scroll = false) => {
  getCloudData(
    pagelimit.value,
    (pageNumber.value - 1) * pagelimit.value,
    scroll
  );
};
provide("cloudDataLoad", cloudDataLoad);

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    pageNumber.value = Number(val.query.page ? val.query.page : 1);
    if (val.name == "user-cloud") {
      getCloudData(pagelimit.value, (pageNumber.value - 1) * pagelimit.value);
    }
  }
);

onMounted(() => {
  $setSiteTitle(t("nav.user") + " - " + t("nav.userChildren.cloud"));
  getCloudData(pagelimit.value, (pageNumber.value - 1) * pagelimit.value);
});
</script>

<style lang="scss" scoped>
.cloud {
  .data {
    width: 100%;
    margin: 20px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .space {
      width: 160px;
      display: flex;
      align-items: center;
      span {
        white-space: nowrap;
        font-size: 13px;
      }
      .progress {
        margin: 0 8px;
      }
    }
  }
}
</style>
