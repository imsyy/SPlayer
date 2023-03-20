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
        上传音乐
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
        <n-progress
          type="line"
          color="#f55e55"
          class="progress"
          :show-indicator="false"
          :percentage="100 / (cloudSpace[1] / cloudSpace[0])"
        />
        <span>{{ cloudSpace[1] }} G</span>
      </div>
    </div>
    <DataLists :listData="cloudData" @cloudDataLoad="cloudDataLoad" />
    <Pagination
      :totalCount="totalCount"
      :pageNumber="pageNumber"
      @pageSizeChange="pageSizeChange"
      @pageNumberChange="pageNumberChange"
    />
  </div>
</template>

<script setup>
import { getCloud, upCloudSong } from "@/api";
import { useRouter } from "vue-router";
import { getSongTime } from "@/utils/timeTools.js";
import { BackupRound } from "@vicons/material";
import DataLists from "@/components/DataList/DataLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const router = useRouter();

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
const upSongRef = ref(null);
const upSongMessage = ref(null);

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
          time: getSongTime(v.simpleSong.dt),
        });
      });
    } else {
      $message.error("搜索内容为空");
    }
    // 请求后回顶
    if ($mainContent && scroll)
      $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

// 歌曲上传
const upCloudSongData = (e) => {
  console.log(e.target.files);
  const files = e.target.files;
  upSongMessage.value = $message.loading("歌曲正在上传", {
    duration: 0,
  });
  upCloudSong(files[0])
    .then((res) => {
      console.log(res);
      if (res.code === 200) {
        upSongMessage.value.destroy();
        $message.success(res.privateCloud.simpleSong.name + " 上传成功");
        if (!res.privateCloud.simpleSong.al.name) {
          $message.warning("歌曲详细信息获取失败，可尝试歌曲纠正");
        }
        getCloudData(pagelimit.value, (pageNumber.value - 1) * pagelimit.value);
      }
    })
    .catch((err) => {
      upSongMessage.value.destroy();
      $message.error("歌曲上传出错，请重试");
      console.error("歌曲上传出错：" + err);
    });
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

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    pageNumber.value = Number(val.query.page);
    if (val.name == "cloud") {
      getCloudData(pagelimit.value, (val.query.page - 1) * pagelimit.value);
    }
  }
);

onMounted(() => {
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
