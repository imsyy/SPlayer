<!-- 歌手跳转 -->
<template>
  <div class="jump-artist">
    <Transition name="fade" mode="out-in">
      <div v-if="artistData?.length" class="ar-list">
        <n-alert v-if="typeof artist === 'string'" :show-icon="false">
          以下结果来自在线搜索，仅供参考
        </n-alert>
        <n-card
          v-for="(item, index) in artistData"
          :key="index"
          class="ar-item"
          hoverable
          @click="jumpArtist(item.id)"
        >
          <n-avatar :src="item.cover || '/images/artist.jpg?asset'" class="cover" round />
          <n-text class="name">
            {{ settingStore.hideBracketedContent ? removeBrackets(item.name) : item.name }}
          </n-text>
        </n-card>
      </div>
      <div v-else class="ar-list">
        <n-skeleton class="ar-item" :repeat="2" text />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType, MetaData } from "@/types/main";
import { useSettingStore } from "@/stores";
import { searchArtist, artistDetail } from "@/api/artist";
import { uniq } from "lodash-es";
import { removeBrackets } from "@/utils/format";

const props = defineProps<{
  artist: SongType["artists"];
}>();

const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();
const settingStore = useSettingStore();

const artistData = ref<MetaData[]>([]);

// 获取歌手信息
const getArtistData = async () => {
  if (!props.artist) return;
  // 写入歌手信息
  const setArtistData = (data: any, name: string) => {
    if (!data) return;
    const filteredData = data
      .filter((ar: any) => ar.artistName === name)
      .map((ar: any) => ({
        id: ar.artistId,
        name: ar.artistName,
        cover: ar.artistAvatarPicUrl,
      }));
    artistData.value.push(...filteredData);
  };
  if (typeof props.artist === "string") {
    let artists: string[] = [];
    // 是否有分割符
    const hasSeparator = settingStore.localSeparators.some((separator) =>
      (props.artist as string).includes(separator),
    );
    if (!hasSeparator) {
      const name = (props.artist as string).trim();
      const result = await searchArtist(name);
      setArtistData(result.data.list, name);
    } else {
      // 遍历分割符，并分割歌手名字
      settingStore.localSeparators.forEach((separator) => {
        artists = artists.concat((props.artist as string).split(separator));
      });
      // 去重
      artists = uniq(
        artists
          .map((artist) => artist.trim())
          .filter((artist) => artist && artist !== props.artist),
      );
      // 获取歌手信息
      artists.map(async (name) => {
        const result = await searchArtist(name);
        setArtistData(result.data.list, name);
      });
    }
  } else if (Array.isArray(props.artist)) {
    // 检查是否有 cover 字段，如果没有则获取歌手详情
    const artistPromises = props.artist.map(async (ar) => {
      // 如果已有封面，则直接返回
      if (ar.cover) {
        return ar;
      }
      // 否则，获取歌手详情
      try {
        const result = await artistDetail(ar.id);
        const artist = result.data?.artist;
        return {
          id: ar.id,
          name: ar.name,
          cover: artist?.avatar || artist?.img1v1Url || artist?.picUrl,
        };
      } catch (error) {
        console.error(`获取歌手 ${ar.name} (${ar.id}) 的详情失败:`, error);
        return { id: ar.id, name: ar.name, cover: undefined };
      }
    });
    artistData.value = await Promise.all(artistPromises);
  }
};

// 跳转至歌手
const jumpArtist = (id: number) => {
  if (!id) return;
  emit("close");
  router.push({ name: "artist", query: { id } });
};

onMounted(getArtistData);
</script>

<style lang="scss" scoped>
.ar-list {
  .n-alert {
    margin-bottom: 12px;
  }
  :deep(.ar-item) {
    height: 60px;
    margin-bottom: 12px;
    border-radius: 12px;
    cursor: pointer;
    &:last-child {
      margin-bottom: 0;
    }
    .n-card__content {
      padding: 12px 16px;
      display: flex;
      align-items: center;
    }
    .cover {
      margin-right: 8px;
    }
    .name {
      font-size: 16px;
    }
    &:hover {
      border-color: rgba(var(--primary), 0.58);
    }
  }
}
</style>
