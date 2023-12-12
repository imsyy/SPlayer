<template>
  <div class="like-playlists">
    <Transition name="fade" mode="out-in">
      <div v-if="userLikeData.playlists?.length" class="pl-list">
        <!-- 分类 -->
        <n-space class="type">
          <n-tag
            v-for="(item, index) in ['我创建的', '我收藏的']"
            :key="index"
            :bordered="false"
            :type="index === plTypeChoose ? 'primary' : 'default'"
            class="tag"
            round
            @click="plTypeChange(index)"
          >
            {{ item }}
          </n-tag>
        </n-space>
        <!-- 列表 -->
        <Transition name="fade" mode="out-in">
          <div v-if="plTypeChoose === 0" class="list">
            <MainCover
              :data="likePlaylistsData.filter((playlist) => playlist.userId === userData?.userId)"
            />
          </div>
          <div v-else class="list">
            <MainCover
              :data="likePlaylistsData.filter((playlist) => playlist.userId !== userData?.userId)"
            />
          </div>
        </Transition>
      </div>
      <n-empty
        v-else
        description="当前暂无收藏歌单"
        class="tip"
        style="margin-top: 60px"
        size="large"
      />
    </Transition>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteData } from "@/stores";
import { useRouter } from "vue-router";
import formatData from "@/utils/formatData";

const router = useRouter();
const data = siteData();
const { userData, userLikeData } = storeToRefs(data);

// 默认分类
const plTypeChoose = ref(Number(router.currentRoute.value.query?.type) || 0);

// 处理视频数据
const likePlaylistsData = computed(() => {
  return formatData(userLikeData.value.playlists);
});

// 默认分类变化
const plTypeChange = (type) => {
  router.push({
    path: "/like/playlists",
    query: {
      type,
    },
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    if (val.name === "like-playlists") {
      plTypeChoose.value = Number(val.query?.type) || 0;
    }
  },
);
</script>

<style lang="scss" scoped>
.like-playlists {
  .type {
    margin-bottom: 20px;
    .tag {
      font-size: 13px;
      padding: 0 16px;
      line-height: 0;
      cursor: pointer;
      transition:
        transform 0.3s,
        background-color 0.3s,
        color 0.3s;
      &:hover {
        background-color: var(--main-second-color);
        color: var(--main-color);
      }
      &:active {
        transform: scale(0.95);
      }
    }
  }
}
</style>
