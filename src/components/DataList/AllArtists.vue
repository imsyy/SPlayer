<template>
  <div class="artists">
    <span
      class="artist"
      v-for="(item, index) in artistsData.filter((v) => v)"
      :key="item"
    >
      <n-text
        class="name"
        depth="3"
        v-html="item.name"
        @click.stop="jumpArtist(item.id)"
      />
      <span
        class="line"
        v-if="
          index != artistsData.length - 1 && artistsData[artistsData.length - 1]
        "
        >/</span
      >
    </span>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { musicStore } from "@/store";

const music = musicStore();
const router = useRouter();
const props = defineProps({
  // 歌手数据
  artistsData: {
    type: Object,
    default: [],
  },
});

// 跳转歌手页面
const jumpArtist = (id) => {
  console.log(id);
  music.setBigPlayerState(false);
  router.push({
    path: "/artist/songs",
    query: {
      id,
    },
  });
};
</script>

<style lang="scss" scoped>
.artists {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  .name {
    cursor: pointer;
    transition: all 0.3s;
    &:hover {
      color: $mainColor;
    }
  }
  .line {
    margin: 0 4px;
    opacity: 0.8;
  }
}
</style>