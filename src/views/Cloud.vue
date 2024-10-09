<template>
  <div class="cloud">
    <div class="title">
      <n-text class="keyword">我的云盘</n-text>
      <n-flex class="status">
        <n-text class="item">
          <SvgIcon name="Music" :depth="3" />
          <n-number-animation :from="0" :to="cloudCount || cloudData?.length || 0" /> 首
        </n-text>
        <n-text class="item">
          <SvgIcon name="Storage" :depth="3" />
          <n-progress
            :percentage="100 / (cloudSize.maxSize / cloudSize.size)"
            class="status"
            type="line"
          >
            <n-text class="space" depth="3">
              {{ cloudSize.size ?? 0 }}GB / {{ cloudSize.maxSize ?? 0 }}GB
            </n-text>
          </n-progress>
        </n-text>
      </n-flex>
    </div>
    <n-flex class="menu" justify="space-between">
      <n-flex class="left" align="flex-end">
        <n-button
          :focusable="false"
          :disabled="loading || !cloudData?.length"
          :loading="loading"
          type="primary"
          strong
          secondary
          round
          v-debounce="() => player.updatePlayList(cloudData)"
        >
          <template #icon>
            <SvgIcon name="Play" />
          </template>
          {{
            loading
              ? `
              正在更新... (${cloudData.length === cloudCount ? 0 : cloudData.length}/${cloudCount})`
              : "播放"
          }}
        </n-button>
        <n-button :focusable="false" class="more" strong secondary circle @click="getAllCloudMusic">
          <template #icon>
            <SvgIcon name="Refresh" />
          </template>
        </n-button>
        <!-- 更多 -->
        <n-dropdown :options="moreOptions" trigger="click" placement="bottom-start">
          <n-button :focusable="false" class="more" circle strong secondary>
            <template #icon>
              <SvgIcon name="List" />
            </template>
          </n-button>
        </n-dropdown>
      </n-flex>
      <!-- 模糊搜索 -->
      <n-input
        v-if="cloudData?.length"
        v-model:value="searchValue"
        :input-props="{ autocomplete: 'off' }"
        class="search"
        placeholder="模糊搜索"
        clearable
        round
      >
        <template #prefix>
          <SvgIcon name="Search" />
        </template>
      </n-input>
    </n-flex>
    <!-- 列表 -->
    <Transition name="fade" mode="out-in">
      <SongList v-if="!searchValue || searchData?.length" :data="listDataShow" :loading="loading" />
      <n-empty
        v-else
        :description="`搜不到关于 ${searchValue} 的任何歌曲呀`"
        style="margin-top: 60px"
        size="large"
      >
        <template #icon>
          <SvgIcon name="SearchOff" />
        </template>
      </n-empty>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { DropdownOption } from "naive-ui";
import { useDataStore } from "@/stores";
import { userCloud } from "@/api/cloud";
import { formatSongsList } from "@/utils/format";
import { fuzzySearch, renderIcon } from "@/utils/helper";
import { openBatchList } from "@/utils/modal";
import player from "@/utils/player";

const router = useRouter();
const dataStore = useDataStore();

// 是否激活
const isActivated = ref<boolean>(false);

// 云盘数据
const loading = ref<boolean>(false);
const cloudCount = ref<number>(0);
const cloudData = shallowRef<SongType[]>(dataStore.cloudPlayList);
const cloudSize = ref<{ size: number; maxSize: number }>({ size: 0, maxSize: 0 });

// 模糊搜索数据
const searchValue = ref<string>("");
const searchData = ref<SongType[]>([]);

// 列表歌曲
const listDataShow = computed<SongType[]>(() => {
  if (searchValue.value && searchData.value.length) return searchData.value;
  return cloudData.value;
});

// 是否处于云盘页面
const isCloudPage = computed<boolean>(() => router.currentRoute.value.name === "cloud");

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "批量操作",
    key: "batch",
    props: {
      onClick: () => openBatchList(cloudData.value, false),
    },
    icon: renderIcon("Batch"),
  },
]);

// 获取全部云盘歌曲
const getAllCloudMusic = async () => {
  loading.value = true;
  // 必要数据
  let offset: number = 0;
  const limit: number = 500;
  const listData: SongType[] = [];
  // 循环获取
  do {
    const result = await userCloud(limit, offset);
    const songData = formatSongsList(result.data);
    // 歌曲总数
    cloudCount.value = result.count;
    // 云盘空间
    cloudSize.value = {
      size: Number((result.size / Math.pow(1024, 3)).toFixed(2)),
      maxSize: Number((result.maxSize / Math.pow(1024, 3)).toFixed(0)),
    };
    // 更新数据
    listData.push(...songData);
    cloudData.value = listData;
    offset += limit;
  } while (offset < cloudCount.value && isCloudPage.value);
  // 更新云盘数据
  dataStore.setCloudPlayList(cloudData.value);
  loading.value = false;
};

watchDebounced(
  () => [searchValue.value, cloudData.value],
  () => {
    const search = searchValue.value.trim();
    if (!search || search === "" || !cloudData.value.length) return;
    // 获取搜索结果
    const result = fuzzySearch(search, cloudData.value);
    searchData.value = result;
  },
  { debounce: 300, maxWait: 1000 },
);

onActivated(() => {
  if (!isActivated.value) {
    isActivated.value = true;
  } else {
    getAllCloudMusic();
  }
});

onMounted(getAllCloudMusic);
</script>

<style lang="scss" scoped>
.cloud {
  display: flex;
  flex-direction: column;
  .title {
    display: flex;
    align-items: flex-end;
    line-height: normal;
    margin-top: 12px;
    margin-bottom: 20px;
    height: 40px;
    .keyword {
      font-size: 30px;
      font-weight: bold;
      margin-right: 12px;
      line-height: normal;
    }
    .status {
      font-size: 15px;
      font-weight: normal;
      line-height: 30px;
      .item {
        display: flex;
        align-items: center;
        opacity: 0.9;
        .n-icon {
          margin-right: 4px;
        }
      }
      .n-progress {
        --n-fill-color: var(--primary-hex);
        margin-left: 4px;
        cursor: pointer;
        :deep(.n-progress-graph) {
          width: 80px;
        }
        .space {
          display: inline-block;
          font-size: 12px;
          transform: translateX(-5px);
          opacity: 0;
          transition:
            opacity 0.3s,
            transform 0.3s;
        }
        &:hover {
          .space {
            opacity: 1;
            transform: translateX(0);
          }
        }
      }
    }
  }
  .menu {
    width: 100%;
    margin-bottom: 20px;
    height: 40px;
    .n-button {
      height: 40px;
    }
    .more {
      width: 40px;
    }
    .search {
      height: 40px;
      width: 130px;
      display: flex;
      align-items: center;
      border-radius: 25px;
      transition: all 0.3s var(--n-bezier);
      &.n-input--focus {
        width: 200px;
      }
    }
  }
  .song-list {
    flex: 1;
    overflow: hidden;
    max-height: calc((var(--layout-height) - 132) * 1px);
  }
}
</style>
