<!-- 单曲页面 -->
<template>
  <div class="song">
    单曲页面 - 待完成
    {{ songDetail }}
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { getSongDetail } from "@/api/song";
import formatData from "@/utils/formatData";

const router = useRouter();

// 歌曲信息
const songId = ref(router.currentRoute.value.query.id);
const songDetail = ref(null);

// 检查是否具有视频 id
const isHasSongId = (id) => {
  if (!id) {
    $message.error("参数不完整");
    return router.go(-1);
  }
};

// 获取歌曲详情
const getSongDetailData = async (id) => {
  try {
    const detail = await getSongDetail(id);
    const data = formatData(detail?.songs?.[0], "song");
    songDetail.value = data?.[0] ?? null;
  } catch (error) {
    console.error("获取歌曲详情失败：", error);
  }
};

onMounted(() => {
  // 若无 id
  isHasSongId(songId.value);
  // 获取歌曲详情
  getSongDetailData(songId.value);
});
</script>
