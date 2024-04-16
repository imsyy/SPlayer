<!-- 本地歌曲 -->
<template>
  <div class="local">
    <n-h1 class="title">本地歌曲</n-h1>
    <!-- 数据统计 -->
    <n-flex class="num">
      <!-- 总数 -->
      <div class="num-item">
        <n-icon size="18">
          <SvgIcon icon="music-note" />
        </n-icon>
        <n-number-animation :from="0" :to="localSongList ? localSongList.length : 0" />
        首歌曲
      </div>
      <!-- 空间 -->
      <div class="num-item">
        <n-icon size="18">
          <SvgIcon icon="storage" />
        </n-icon>
        占用
        <n-number-animation
          :from="0"
          :to="Number((allSongStorage / 1024).toFixed(2))"
          :precision="2"
        />
        GB
      </div>
    </n-flex>
    <!-- 功能区 -->
    <n-flex class="menu" justify="space-between">
      <n-flex class="left">
        <n-button
          :disabled="!localSongList?.length"
          :focusable="false"
          type="primary"
          class="play"
          tag="div"
          circle
          strong
          secondary
          @click="playAllSongs(localSongList)"
        >
          <template #icon>
            <n-icon size="32">
              <SvgIcon icon="play-arrow-rounded" />
            </n-icon>
          </template>
        </n-button>
        <!-- 目录管理 -->
        <n-button
          :focusable="false"
          class="local-path"
          tag="div"
          round
          strong
          secondary
          @click="localPathShow = true"
        >
          <template #icon>
            <n-icon>
              <SvgIcon icon="folder-cog" />
            </n-icon>
          </template>
          目录管理
        </n-button>
      </n-flex>
      <n-flex class="right">
        <!-- 模糊搜索 -->
        <n-input
          v-if="localSongList?.length"
          v-model:value="searchValue"
          :input-props="{ autoComplete: false }"
          class="search"
          placeholder="模糊搜索"
          clearable
          @input="localSearch"
        >
          <template #prefix>
            <n-icon size="18">
              <SvgIcon icon="search-rounded" />
            </n-icon>
          </template>
        </n-input>
      </n-flex>
    </n-flex>
    <!-- 标签页 -->
    <n-tabs v-model:value="tabValue" class="tabs" type="segment" animated @update:value="tabChange">
      <n-tab name="local-songs"> 歌曲 </n-tab>
      <n-tab name="local-artists"> 歌手 </n-tab>
      <n-tab name="local-albums"> 专辑 </n-tab>
    </n-tabs>
    <!-- 路由页面 -->
    <Transition name="fade" mode="out-in">
      <div v-if="!searchValue" class="local-list">
        <router-view
          v-slot="{ Component }"
          :songList="localSongList"
          @getAllPathMusic="getAllPathMusic"
        >
          <keep-alive>
            <Transition name="router" mode="out-in">
              <component :is="Component" />
            </Transition>
          </keep-alive>
        </router-view>
      </div>
      <div v-else-if="searchData?.length" class="local-list">
        <router-view
          v-slot="{ Component }"
          :songList="searchData"
          @getAllPathMusic="getAllPathMusic"
        >
          <keep-alive>
            <Transition name="router" mode="out-in">
              <component :is="Component" />
            </Transition>
          </keep-alive>
        </router-view>
      </div>
      <n-empty
        v-else
        :description="`很抱歉，未能找到与 ${searchValue} 相关的任何歌曲`"
        style="margin-top: 60px"
        size="large"
      >
        <template #icon>
          <n-icon>
            <SvgIcon icon="search-off" />
          </n-icon>
        </template>
      </n-empty>
    </Transition>
    <!-- 目录管理弹窗 -->
    <n-modal
      v-model:show="localPathShow"
      :close-on-esc="false"
      :mask-closable="false"
      :bordered="false"
      preset="card"
      title="目录管理"
      transform-origin="center"
    >
      <n-list class="local-list" hoverable clickable bordered>
        <template #header>
          <n-text>请选择本地音乐文件夹，将自动扫描您添加的目录，文件增删实时同步</n-text>
        </template>
        <n-list-item v-if="defaultMusicPath">
          <template #prefix>
            <n-icon class="folder" size="20">
              <SvgIcon icon="folder-music" />
            </n-icon>
          </template>
          <template #suffix>
            <n-button quaternary disabled>
              <template #icon>
                <n-icon class="delete" size="20">
                  <SvgIcon icon="delete" />
                </n-icon>
              </template>
            </n-button>
          </template>
          <n-thing :title="defaultMusicPath" description="系统默认音乐文件夹" />
        </n-list-item>
        <n-list-item v-for="(item, index) in music.localSongPath" :key="index">
          <template #prefix>
            <n-icon class="folder" size="20">
              <SvgIcon icon="folder-open" />
            </n-icon>
          </template>
          <template #suffix>
            <n-button quaternary @click="changeLocalPath(index)">
              <template #icon>
                <n-icon class="delete" size="20">
                  <SvgIcon icon="delete" />
                </n-icon>
              </template>
            </n-button>
          </template>
          <n-thing :title="item" />
        </n-list-item>
      </n-list>
      <template #footer>
        <n-flex justify="center">
          <n-button class="add-path" strong secondary @click="changeLocalPath">
            <template #icon>
              <n-icon>
                <SvgIcon icon="folder-plus" />
              </n-icon>
            </template>
            添加文件夹
          </n-button>
        </n-flex>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { musicData, indexedDBData } from "@/stores";
import { useRouter } from "vue-router";
import { fuzzySearch } from "@/utils/helper";
import { playAllSongs } from "@/utils/Player";
import debounce from "@/utils/debounce";

const indexedDB = indexedDBData();
const router = useRouter();
const music = musicData();
const isLoading = ref(false);

// 本地歌曲
const localSongList = ref([]);
const allSongStorage = ref(0);

// 默认选中
const tabValue = ref(router.currentRoute.value?.name ?? "local-songs");

// 模糊搜索数据
const searchValue = ref(null);
const searchData = ref([]);

// 目录管理弹窗
const localPathShow = ref(false);

// 系统默认音乐文件夹路径
const defaultMusicPath = ref(null);

// 获取系统默认音乐文件夹路径
const getDefaultMusicPath = async () => {
  const path = await electron.ipcRenderer.invoke("getdefaultMusicPath");
  console.log("系统默认音乐文件夹路径：", path);
  defaultMusicPath.value = path;
};

// 获取本地歌曲数据
const getLocalSongList = async () => {
  await indexedDB.getfilesDB("localSongList").then((res) => {
    localSongList.value = res;
  });
};

// 获取全部路径歌曲
const getAllPathMusic = async () => {
  console.log("获取全部路径歌曲");
  // 先获取
  getLocalSongList();
  // 全部路径
  const allPath = defaultMusicPath.value
    ? [defaultMusicPath.value, ...music.localSongPath]
    : music.localSongPath;
  // 获取全部歌曲
  if (allPath?.length) {
    isLoading.value = true;
    try {
      const dirContentsPromises = allPath.map(async (path) => {
        const dirContents = await electron.ipcRenderer.invoke("getDirContents", path);
        return dirContents;
      });
      const dirContentsArray = await Promise.all(dirContentsPromises);
      // 根据 id 去重
      const uniqueSongsMap = new Map();
      dirContentsArray.forEach((dirContents) => {
        dirContents.forEach((song) => {
          uniqueSongsMap.set(song.id, song);
        });
      });
      // 转换回数组形式并按 a-z 排序
      const uniqueSongsArray = Array.from(uniqueSongsMap.values()).sort((a, b) => {
        return a?.name?.localeCompare(b.name, "zh-Hans-CN", { sensitivity: "base" });
      });
      // 若数据发生变化
      const musicLength = localSongList.value?.length || 0;
      const songArrayLength = uniqueSongsArray?.length || 0;
      if (musicLength < songArrayLength) {
        $message.info(`新增 ${songArrayLength - musicLength} 首歌曲`);
      } else if (musicLength === 0) {
        $message.info(`发现 ${songArrayLength} 首歌曲`);
      }
      // 更新本地歌曲
      await indexedDB.setfilesDB("localSongList", uniqueSongsArray.slice());
      getLocalSongList();
      // 统计歌曲总容量
      allSongStorage.value = uniqueSongsArray.reduce((acc, v) => (acc += Number(v.size)), 0);
    } catch (error) {
      console.error("获取歌曲内容时出错：", error);
    } finally {
      isLoading.value = false;
    }
  }
};

// 更改文件夹
const changeLocalPath = async (isDel = false) => {
  if (typeof isDel === "number") {
    music.localSongPath.splice(isDel, 1);
    await getAllPathMusic();
  } else {
    const selectedDir = await electron.ipcRenderer.invoke("selectDir");
    if (!selectedDir) return false;
    console.log(selectedDir);
    // 检查是否为子文件夹
    const allPath = defaultMusicPath.value
      ? [defaultMusicPath.value, ...music.localSongPath]
      : music.localSongPath;
    const isSubfolder = allPath.some((existingPath) => {
      return selectedDir.startsWith(existingPath);
    });
    if (!isSubfolder) {
      music.localSongPath.push(selectedDir);
      await getAllPathMusic();
    } else {
      $message.error("添加的目录是现有目录的子文件夹");
    }
  }
};

// 歌曲模糊搜索
const localSearch = debounce((val) => {
  const searchValue = val?.trim();
  // 是否为空
  if (!searchValue || searchValue === "") {
    return true;
  }
  // 返回结果
  const result = fuzzySearch(searchValue, localSongList.value);
  searchData.value = result;
}, 300);

// 标签页切换
const tabChange = (val) => {
  const routerPath = val.replace(/^local-/, "");
  router.push({
    path: `/local/${routerPath}`,
  });
};

// 监听路由变化
watch(
  () => router.currentRoute.value,
  (val) => (tabValue.value = val?.name ?? "local-songs"),
);

onBeforeMount(async () => {
  await getDefaultMusicPath();
  await getAllPathMusic();
});
</script>

<style lang="scss" scoped>
.local {
  .title {
    margin: 20px 0 12px 0;
    font-size: 36px;
    font-weight: bold;
  }
  .num {
    margin-bottom: 20px;
    .num-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      .n-icon {
        margin-right: 4px;
      }
    }
  }
  .menu {
    flex-wrap: nowrap;
    align-items: center;
    margin: 20px 0;
    .left {
      flex-wrap: nowrap;
      align-items: center;
      .play {
        --n-width: 46px;
        --n-height: 46px;
      }
      .local-path {
        --n-height: 100%;
        height: 40px;
      }
    }
    .right {
      .search {
        height: 40px;
        width: 130px;
        display: flex;
        align-items: center;
        border-radius: 40px;
        transition:
          width 0.3s,
          background-color 0.3s;
        &.n-input--focus {
          width: 200px;
        }
      }
    }
  }
  .tabs {
    margin-bottom: 20px;
  }
}
.local-list {
  :deep(.n-list-item__prefix) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.add-path {
  border-radius: 6px;
}
</style>
