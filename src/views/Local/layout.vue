<template>
  <div class="local">
    <div class="title">
      <n-text class="keyword">本地歌曲</n-text>
      <n-flex class="status">
        <n-text class="item">
          <SvgIcon name="Music" :depth="3" />
          <n-number-animation :from="0" :to="localStore.localSongs?.length || 0" /> 首歌曲
        </n-text>
        <n-text class="item">
          <SvgIcon name="Storage" :depth="3" />
          <n-number-animation :from="0" :to="allMusicSize" :precision="2" /> GB
        </n-text>
      </n-flex>
    </div>
    <n-flex class="menu" justify="space-between">
      <n-flex class="left" align="flex-end">
        <n-button
          :focusable="false"
          :disabled="loading && !localStore.localSongs?.length"
          :loading="loading"
          type="primary"
          strong
          secondary
          round
          v-debounce="() => player.updatePlayList(listData)"
        >
          <template #icon>
            <SvgIcon name="Play" />
          </template>
          播放
        </n-button>
        <n-button
          :focusable="false"
          class="more"
          strong
          secondary
          circle
          @click="getAllLocalMusic(true)"
        >
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
      <n-flex class="right" justify="end">
        <!-- 模糊搜索 -->
        <n-input
          v-if="localStore.localSongs?.length"
          v-model:value="searchValue"
          :input-props="{ autocomplete: 'off' }"
          class="search"
          placeholder="模糊搜索"
          clearable
          round
          @input="listSearch"
        >
          <template #prefix>
            <SvgIcon name="Search" />
          </template>
        </n-input>
        <n-tabs
          v-model:value="localType"
          class="tabs"
          type="segment"
          @update:value="(name: string) => router.push({ name })"
        >
          <n-tab name="local-songs"> 单曲 </n-tab>
          <n-tab :disabled="listData.length === 0" name="local-artists"> 歌手 </n-tab>
          <n-tab :disabled="listData.length === 0" name="local-albums"> 专辑 </n-tab>
        </n-tabs>
      </n-flex>
    </n-flex>
    <!-- 路由 -->
    <RouterView v-slot="{ Component }">
      <Transition :name="`router-${settingStore.routeAnimation}`" mode="out-in">
        <KeepAlive>
          <component :is="Component" :data="listData" :loading="loading" class="router-view" />
        </KeepAlive>
      </Transition>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { DropdownOption, MessageReactive } from "naive-ui";
import { useLocalStore, useSettingStore } from "@/stores";
import { formatSongsList } from "@/utils/format";
import { uniqBy, flattenDeep, debounce } from "lodash-es";
import { fuzzySearch, renderIcon } from "@/utils/helper";
import { openBatchList } from "@/utils/modal";
import player from "@/utils/player";

const router = useRouter();
const localStore = useLocalStore();
const settingStore = useSettingStore();

const loading = ref<boolean>(true);
const loadingMsg = ref<MessageReactive | null>(null);

// 本地歌曲总线
const localEventBus = useEventBus("local");

// 本地歌曲路由
const localType = ref<string>((router.currentRoute.value?.name as string) || "local-songs");

// 模糊搜索数据
const searchValue = ref<string>("");
const searchData = ref<SongType[]>([]);

// 列表数据
const listData = computed<SongType[]>(() => {
  if (searchValue.value && searchData.value.length) return searchData.value;
  return localStore.localSongs;
});

// 获取音乐文件夹
const getMusicFolder = async (): Promise<string[]> => {
  const defaultPath = await window.electron.ipcRenderer.invoke("get-default-dir", "music");
  return [defaultPath, ...settingStore.localFilesPath];
};

// 全部音乐大小
const allMusicSize = computed<number>(() => {
  const total = localStore.localSongs.reduce((total, song) => (total += song?.size || 0), 0);
  return Number((total / 1024).toFixed(2));
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "本地目录管理",
    key: "folder",
    icon: renderIcon("FolderCog"),
  },
  {
    label: "批量操作",
    key: "batch",
    props: {
      onClick: () => openBatchList(listData.value, true),
    },
    icon: renderIcon("Batch"),
  },
]);

// 获取全部路径歌曲
const getAllLocalMusic = debounce(
  async (showTip: boolean = false) => {
    // 获取路径
    const allPath = await getMusicFolder();
    if (!allPath || !allPath.length) return;
    // 加载提示
    if (showTip) {
      loadingMsg.value = window.$message.loading("正在获取本地歌曲", {
        duration: 0,
      });
    }
    // 获取全部歌曲
    loading.value = true;
    const dirContentsPromises = allPath.map((path) =>
      window.electron.ipcRenderer.invoke("get-music-files", path),
    );
    const results = await Promise.allSettled(dirContentsPromises);
    const allSongData = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<any>).value);
    // 展平去重
    const songData = uniqBy(flattenDeep(allSongData), "id");
    // 处理数据
    const listData = formatSongsList(songData);
    // 数据是否变化
    const oldLength = localStore.localSongs.length;
    if (oldLength === 0 && listData.length > 0) {
      window.$message.success(`发现 ${listData.length} 首歌曲`);
    } else if (listData.length > oldLength) {
      window.$message.success(`新增 ${listData.length - oldLength} 首歌曲`);
    }
    if (showTip) window.$message.success(`已发现 ${listData.length} 首`);
    // 保存并更新
    localStore.updateLocalSong(listData);
    // 关闭加载
    loading.value = false;
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  },
  300,
  { leading: true, trailing: false },
);

// 模糊搜索
const listSearch = debounce((val: string) => {
  val = val.trim();
  if (!val || val === "") return;
  // 获取搜索结果
  const result = fuzzySearch(val, localStore.localSongs);
  searchData.value = result;
}, 300);

localEventBus.on(() => getAllLocalMusic());

onBeforeRouteUpdate((to) => {
  if (to.matched[0].name !== "local") return;
  localType.value = to.name as string;
});

onMounted(getAllLocalMusic);
</script>

<style lang="scss" scoped>
.local {
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
    }
  }
  .menu {
    width: 100%;
    margin-bottom: 20px;
    height: 40px;
    .n-button {
      height: 40px;
      transition: all 0.3s var(--n-bezier);
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
    .n-tabs {
      width: 200px;
      --n-tab-border-radius: 25px !important;
      :deep(.n-tabs-rail) {
        outline: 1px solid var(--n-tab-color-segment);
      }
    }
  }
  .router-view {
    flex: 1;
    overflow: hidden;
    max-height: calc((var(--layout-height) - 132) * 1px);
  }
}
</style>
