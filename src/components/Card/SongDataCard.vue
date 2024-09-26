<template>
  <n-card class="song-data-card">
    <n-image
      :src="data?.coverSize?.s || data?.cover"
      class="cover"
      preview-disabled
      lazy
      @load="coverLoaded"
    >
      <template #placeholder>
        <div class="cover-loading">
          <img src="/images/song.jpg?assest" class="loading-img" alt="loading-img" />
        </div>
      </template>
    </n-image>
    <Transition name="fade" mode="out-in">
      <div v-if="data" class="data">
        <n-text class="name">{{ data.name || "未知曲目" }}</n-text>
        <div v-if="Array.isArray(data.artists)" class="artists text-hidden">
          <SvgIcon name="Artist" :depth="3" />
          <n-text v-for="ar in data.artists" :key="ar.id" class="ar">
            {{ ar.name }}
          </n-text>
        </div>
        <div v-else class="artists text-hidden">
          <SvgIcon name="Artist" :depth="3" />
          <n-text class="ar"> {{ data.artists || "未知艺术家" }} </n-text>
        </div>
        <div class="album text-hidden">
          <SvgIcon name="Album" :depth="3" />
          <n-text v-if="isObject(data.album)" class="album-text">
            {{ data.album?.name || "未知专辑" }}
          </n-text>
          <n-text v-else class="album-text">
            {{ data.album || "未知专辑" }}
          </n-text>
        </div>
      </div>
      <div v-else class="data">
        <n-skeleton text round :repeat="2" />
      </div>
    </Transition>
  </n-card>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { coverLoaded } from "@/utils/helper";
import { isObject } from "lodash-es";

defineProps<{
  data: SongType | null;
  canJump?: boolean;
}>();
</script>

<style lang="scss" scoped>
.song-data-card {
  width: 100%;
  min-height: 120px;
  border-radius: 12px;
  :deep(.n-card__content) {
    padding: 16px;
    display: flex;
    align-items: center;
    padding: 16px;
  }
  .cover {
    width: 80px;
    height: 80px;
    min-width: 80px;
    border-radius: 12px;
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    :deep(img) {
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.35s ease-in-out;
    }
  }
  .data {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    justify-content: space-around;
    flex: 1;
    :deep(.n-skeleton) {
      height: 20px;
      margin-bottom: 12px;
    }
    .name {
      font-size: 20px;
      font-weight: bold;
    }
    .artists {
      margin-top: 2px;
      font-size: 14px;
      .n-icon {
        font-size: 18px;
        margin-right: 4px;
        transform: translateY(3px);
      }
      .ar {
        display: inline-flex;
        transition: opacity 0.3s;
        opacity: 0.6;
        cursor: pointer;
        &::after {
          content: "/";
          margin: 0 4px;
        }
        &:last-child {
          &::after {
            display: none;
          }
        }
        &:hover {
          opacity: 0.8;
        }
      }
    }
    .album {
      font-size: 14px;
      .n-icon {
        font-size: 18px;
        margin-right: 4px;
        transform: translateY(3px);
      }
      .album-text {
        transition: opacity 0.3s;
        opacity: 0.6;
        cursor: pointer;
      }
      &:hover {
        .album-text {
          opacity: 1;
          color: var(--primary-hex);
        }
      }
    }
  }
}
</style>
