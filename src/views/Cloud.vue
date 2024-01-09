<template>
  <div class="cloud">
    <n-h1 class="title">我的云盘</n-h1>
    <!-- 基础状态 -->
    <n-progress
      :percentage="100 / (userCloudSpace[1] / userCloudSpace[0])"
      class="status"
      type="line"
    >
      <div class="tip">
        <n-text class="space" depth="3">
          云盘容量 {{ userCloudSpace[0] ?? 0 }}GB / {{ userCloudSpace[1] ?? 0 }}GB
        </n-text>
        <n-text class="buy" @click="goBuy"> 扩容 </n-text>
      </div>
    </n-progress>
    <!-- 功能区 -->
    <n-flex class="menu" justify="space-between">
      <n-flex class="left">
        <n-button
          :disabled="userCloudData?.length === 0"
          :focusable="false"
          type="primary"
          class="play"
          tag="div"
          circle
          strong
          secondary
          @click="playAllSongs(userCloudData)"
        >
          <template #icon>
            <n-icon size="32">
              <SvgIcon icon="play-arrow-rounded" />
            </n-icon>
          </template>
        </n-button>
        <n-button size="large" round strong secondary @click="upCloudSongRef?.openUpSongModal()">
          <template #icon>
            <n-icon>
              <SvgIcon icon="cloud-arrow-up" />
            </n-icon>
          </template>
          上传歌曲
        </n-button>
        <!-- 歌曲上传弹窗 -->
        <UpCloudSong ref="upCloudSongRef" @getUserCloudData="getUserCloudData" />
      </n-flex>
      <n-flex class="right">
        <!-- 模糊搜索 -->
        <Transition name="fade" mode="out-in">
          <n-input
            v-if="userCloudData?.length"
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
        </Transition>
      </n-flex>
    </n-flex>
    <!-- 列表 -->
    <Transition name="fade" mode="out-in">
      <div v-if="userCloudData !== 'empty'" class="list">
        <Transition name="fade" mode="out-in">
          <SongList v-if="!searchValue" :data="userCloudData" :showPrivilege="false" />
          <SongList v-else-if="searchData?.length" :data="searchData" :showPrivilege="false" />
          <n-empty
            v-else
            :description="`搜不到关于 ${searchValue} 的任何歌曲呀`"
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
      </div>
      <n-empty v-else class="empty" description="你还有任何歌曲，快去上传吧" />
    </Transition>
  </div>
</template>

<script setup>
import { indexedDBData } from "@/stores";
import { getUserCloud } from "@/api/cloud";
import { fuzzySearch } from "@/utils/helper";
import { playAllSongs } from "@/utils/Player";
import debounce from "@/utils/debounce";
import formatData from "@/utils/formatData";

const indexedDB = indexedDBData();

// 云盘数据
const userCloudSpace = ref([]);
const userCloudData = ref([]);
const upCloudSongRef = ref(null);

// 模糊搜索数据
const searchValue = ref(null);
const searchData = ref([]);

// 获取用户云盘缓存数据
const getUserCloudDataCatch = async () => {
  const result = await indexedDB.getfilesDB("userCloudList");
  userCloudData.value = result;
};

// 获取用户云盘列表
const getUserCloudData = async (isOnce = false) => {
  try {
    // 初始化数据
    let offset = 0;
    let totalCount = null;
    let resultArr = [];
    // 获取数据
    while (totalCount === null || offset < totalCount) {
      const res = await getUserCloud(100, offset);
      resultArr.push(formatData(res.data, "song"));
      offset += 100;
      // 歌曲总数
      totalCount = res.count;
      // 云盘空间
      userCloudSpace.value = [
        (res.size / Math.pow(1024, 3)).toFixed(2),
        (res.maxSize / Math.pow(1024, 3)).toFixed(0),
      ];
      if (res.count === 0) {
        console.log("云盘为空");
        userCloudData.value = "empty";
        return false;
      }
      if (isOnce) break;
    }
    // 展平并赋值
    const resultArrFlat = resultArr.flat();
    userCloudData.value = resultArrFlat;
    // 更新本地歌曲
    await indexedDB.setfilesDB("userCloudList", resultArrFlat.slice());
  } catch (error) {
    console.error("云盘数据加载失败：", error);
    $message.error("云盘数据加载失败");
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
  const result = fuzzySearch(searchValue, userCloudData.value);
  searchData.value = result;
}, 300);

// 云盘扩容
const goBuy = () => {
  window.open("https://music.163.com/#/store/product/detail?id=34001");
};

onMounted(async () => {
  await getUserCloudDataCatch();
  await getUserCloudData();
});

onMounted(() => {
  window.$refreshCloudCatch = getUserCloudDataCatch;
});
</script>

<style lang="scss" scoped>
.cloud {
  .title {
    margin: 20px 0;
    font-size: 36px;
    font-weight: bold;
  }
  .status {
    width: 340px;
    --n-fill-color: var(--main-color);
    .tip {
      display: flex;
      flex-direction: row;
      align-items: center;
      .buy {
        margin-left: 8px;
        cursor: pointer;
        &::after {
          content: ">";
          margin-left: 2px;
        }
      }
    }
  }
  .menu {
    align-items: center;
    margin: 26px 0;
    .left {
      align-items: center;
      .play {
        --n-width: 46px;
        --n-height: 46px;
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
}
</style>
