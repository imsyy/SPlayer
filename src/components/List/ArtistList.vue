<template>
  <Transition name="fade" mode="out-in">
    <div v-if="data.length > 0" class="artist-list">
      <n-grid :cols="cols" x-gap="20" y-gap="20">
        <n-gi
          v-for="(item, index) in data"
          :key="index"
          @click="
            router.push({
              name: 'artist',
              query: { id: item.id },
            })
          "
        >
          <div class="artist-item">
            <!-- 封面 -->
            <div class="cover">
              <s-image
                :src="item.coverSize?.m || item.cover"
                default-src="/images/artist.jpg?assest"
                class="cover-img"
              />
              <!-- 封面背板 -->
              <s-image
                :src="item.coverSize?.m || item.cover"
                default-src="/images/artist.jpg?assest"
                class="cover-shadow"
              />
              <!-- 图标 -->
              <SvgIcon name="Artist" />
            </div>
            <!-- 信息 -->
            <div class="cover-data">
              <n-text class="name text-hidden">{{ item.name }}</n-text>
              <!-- 数量 -->
              <div v-if="item.musicSize" class="num">
                <SvgIcon name="Music" :depth="3" />
                <n-text class="num" :depth="3">{{ item.musicSize }}</n-text>
              </div>
            </div>
          </div>
        </n-gi>
      </n-grid>
      <!-- 加载更多 -->
      <n-flex v-if="loadMore" class="load-more" justify="center">
        <n-button :loading="loading" size="large" strong secondary round @click="emit('loadMore')">
          加载更多
        </n-button>
      </n-flex>
    </div>
    <div v-else-if="loading" class="artist-list">
      <n-grid :cols="cols" x-gap="20" y-gap="20">
        <n-gi v-for="item in 50" :key="item">
          <div class="artist-item">
            <div class="cover">
              <n-skeleton class="cover-img" />
            </div>
            <div class="cover-data">
              <n-skeleton text round :repeat="2" />
            </div>
          </div>
        </n-gi>
      </n-grid>
    </div>
    <!-- 空列表 -->
    <n-empty v-else description="空空如也，怎么什么都没有啊" size="large" />
  </Transition>
</template>

<script setup lang="ts">
import type { ArtistType } from "@/types/main";

interface Props {
  data: ArtistType[];
  type?: "playlist" | "album" | "video";
  cols?: string;
  loadMore?: boolean;
  loading?: boolean;
  loadingText?: string;
}

withDefaults(defineProps<Props>(), {
  cols: "4 600:4 800:5 900:6 1200:7 1400:8",
});

const emit = defineEmits<{
  // 加载更多
  loadMore: [];
}>();

const router = useRouter();
</script>

<style lang="scss" scoped>
.artist-list {
  width: 100%;
  padding: 20px 4px;
  .artist-item {
    position: relative;
    height: auto;
    border-radius: 16px;
    z-index: 0;
    transition:
      background-color 0.3s,
      transform 0.3s;
    cursor: pointer;
    .cover {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      padding: 12px;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      transition: border-radius 0.3s;
      .cover-img {
        border-radius: 50%;
        overflow: hidden;
        z-index: 1;
        transition:
          filter 0.3s,
          transform 0.3s;
      }
      .cover-shadow {
        opacity: 0;
        position: absolute;
        border-radius: 50%;
        overflow: hidden;
        top: 20%;
        width: 80%;
        height: auto;
        aspect-ratio: 1/1;
        filter: blur(10px) opacity(0.5);
        transform: scale(0.92, 0.96);
        z-index: 0;
        transition: opacity 0.3s;
        :deep(img) {
          opacity: 1;
        }
      }
      .n-icon {
        position: absolute;
        font-size: 40px;
        color: #fff;
        transform: scale(0.6);
        opacity: 0;
        z-index: 2;
        transition:
          opacity 0.3s,
          transform 0.3s;
      }
      .n-skeleton {
        height: 100%;
      }
    }
    .cover-data {
      display: flex;
      align-items: center;
      flex-direction: column;
      padding: 0 12px;
      .name {
        font-size: 16px;
        margin-bottom: 4px;
      }
      :deep(.n-skeleton) {
        &:first-child {
          margin-bottom: 12px;
        }
      }
    }
    &:hover {
      .cover {
        .cover-img {
          box-shadow: 0 4px 16px #00000020;
          :deep(img) {
            transform: scale(1.1);
            filter: brightness(0.8);
          }
        }
        .cover-shadow {
          opacity: 1;
        }
        .n-icon {
          transform: scale(1);
          opacity: 1;
        }
      }
    }
    &:active {
      transform: scale(0.98);
    }
  }
  .load-more {
    margin: 20px 0;
  }
}
.n-empty {
  margin-top: 60px;
}
</style>
