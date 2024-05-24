<!-- 电台播客页面 -->
<template>
  <div v-if="djId" class="dj">
    <Transition name="fade" mode="out-in">
      <div v-if="djDetail && Object.keys(djDetail)?.length" class="detail">
        <div class="cover">
          <!-- 封面 -->
          <n-image
            :src="djDetail.coverSize.l"
            :previewed-img-props="{ style: { borderRadius: '8px' } }"
            :preview-src="djDetail.cover"
            class="cover-img"
            show-toolbar-tooltip
            @load="
              (e) => {
                e.target.style.opacity = 1;
              }
            "
          >
            <template #placeholder>
              <div class="cover-loading">
                <img class="loading-img" src="/imgs/pic/song.jpg?assest" alt="song" />
              </div>
            </template>
          </n-image>
          <!-- 封面背板 -->
          <n-image :src="djDetail.coverSize.m" class="cover-shadow" preview-disabled />
        </div>
        <div class="data">
          <!-- 名称 -->
          <n-text class="name">
            {{ djDetail.name || "未知电台" }}
          </n-text>
          <div class="creator">
            <n-avatar
              :src="(djDetail.creator?.avatarUrl + '?param=300y$300').replace(/^http:/, 'https:')"
              fallback-src="/imgs/pic/avatar.png?assest"
              round
            />
            <n-text class="nickname">{{ djDetail.creator?.nickname || "未知创建者" }}</n-text>
            <n-text v-if="djDetail.createTime" class="create-time" depth="3">
              {{ getTimestampTime(djDetail.createTime) }} 创建
            </n-text>
            <!-- 标签 -->
            <n-tag
              v-if="djDetail?.tags"
              :bordered="false"
              class="tags"
              round
              @click="
                router.push({
                  path: '/dj-type',
                  query: {
                    type: djDetail.tags.id,
                    name: djDetail.tags.name,
                  },
                })
              "
            >
              {{ djDetail.tags.name }}
            </n-tag>
          </div>
          <!-- 简介 -->
          <n-ellipsis
            v-if="djDetail.desc"
            :tooltip="false"
            class="description"
            expand-trigger="click"
            line-clamp="2"
          >
            <n-text depth="3">{{ djDetail.desc }}</n-text>
          </n-ellipsis>
          <n-text v-else class="description">太懒了吧，连简介都没写</n-text>
          <!-- 数量 -->
          <n-flex class="num">
            <div v-if="djDetail?.count" class="num-item">
              <n-icon depth="3" size="18">
                <SvgIcon icon="music-note" />
              </n-icon>
              <n-text depth="3">{{ djDetail.count }}</n-text>
            </div>
            <div v-if="djDetail?.updateTime" class="num-item">
              <n-icon depth="3" size="18">
                <SvgIcon icon="clock" />
              </n-icon>
              <n-text depth="3">{{ getTimestampTime(djDetail.updateTime) }} 更新</n-text>
            </div>
          </n-flex>
        </div>
      </div>
      <div v-else class="detail">
        <n-skeleton class="cover" />
        <div class="data">
          <n-skeleton :repeat="4" text />
        </div>
      </div>
    </Transition>
    <!-- 功能区 -->
    <n-flex class="menu" justify="space-between">
      <n-flex class="left">
        <n-button
          :disabled="djData === 'empty'"
          :focusable="false"
          type="primary"
          class="play"
          tag="div"
          circle
          strong
          secondary
          @click="playAllSongs(djData, 'dj')"
        >
          <template #icon>
            <n-icon size="32">
              <SvgIcon icon="play-arrow-rounded" />
            </n-icon>
          </template>
        </n-button>
        <n-button
          :focusable="false"
          class="like"
          size="large"
          tag="div"
          round
          strong
          secondary
          @click="likeOrDislike(djId)"
        >
          <template #icon>
            <n-icon>
              <SvgIcon
                :icon="isLikeOrDislike(djId) ? 'favorite-outline-rounded' : 'favorite-rounded'"
              />
            </n-icon>
          </template>
          {{ isLikeOrDislike(djId) ? "订阅电台" : "取消订阅" }}
        </n-button>
        <n-dropdown :options="moreOptions" trigger="hover" placement="bottom-start">
          <n-button :focusable="false" class="more" size="large" tag="div" circle strong secondary>
            <template #icon>
              <n-icon>
                <SvgIcon icon="format-list-bulleted" />
              </n-icon>
            </template>
          </n-button>
        </n-dropdown>
      </n-flex>
      <n-flex class="right">
        <!-- 模糊搜索 -->
        <Transition name="fade" mode="out-in">
          <n-input
            v-if="djData !== 'empty' && djData?.length"
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
      <div v-if="djData !== 'empty'" class="list">
        <Transition name="fade" mode="out-in">
          <div v-if="!searchValue" class="song-list">
            <SongList :data="djData" :sourceId="djId" type="dj" />
          </div>
          <SongList v-else-if="searchData?.length" :data="searchData" :sourceId="djId" type="dj" />
          <n-empty
            v-else
            :description="`搜不到关于 ${searchValue} 的任何节目`"
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
      <n-empty v-else class="empty" description="这个电台还没有节目哦" />
    </Transition>
  </div>
  <div v-else class="title">
    <n-text class="key">参数不完整</n-text>
    <n-button :focusable="false" class="back" strong secondary @click="router.go(-1)">
      返回上一页
    </n-button>
  </div>
</template>

<script setup>
import { NIcon } from "naive-ui";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { siteData } from "@/stores";
import { getDjDetail, getDjProgram, likeDj } from "@/api/dj";
import { fuzzySearch } from "@/utils/helper";
import { isLogin } from "@/utils/auth";
import { getTimestampTime } from "@/utils/timeTools";
import { playAllSongs } from "@/utils/Player";
import debounce from "@/utils/debounce";
import formatData from "@/utils/formatData";
import SvgIcon from "@/components/Global/SvgIcon";

const router = useRouter();
const data = siteData();
const { userLikeData } = storeToRefs(data);

//  电台数据
const djId = ref(router.currentRoute.value.query.id);
const djDetail = ref(null);
const djData = ref(null);

// 模糊搜索数据
const loadingMsg = ref(null);
const searchValue = ref(null);
const searchData = ref([]);

// 图标渲染
const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(SvgIcon, { icon }, null) });
};

// 更多操作数据
const moreOptions = [
  {
    label: "打开源页面链接",
    key: "open",
    props: {
      onclick: () => {
        const id = djId.value;
        if (id) window.open(`https://music.163.com/#/djradio?id=${id}`);
      },
    },
    icon: renderIcon("link"),
  },
];

// 获取电台信息
const getDjDetailData = async (id) => {
  try {
    if (!id) return false;
    // 清空数据
    djDetail.value = null;
    djData.value = null;
    // 获取数据
    const detail = await getDjDetail(id);
    // 基础信息
    djDetail.value = formatData(detail.data, "dj")[0];
    // 获取节目
    await getDjProgramData(djId.value, djDetail.value?.count);
  } catch (error) {
    console.error("获取电台信息出错：", error);
    $message.error("获取电台信息出现错误");
  }
};

// 获取电台全部节目
const getDjProgramData = async (id, count) => {
  try {
    if (count === 0) return (djData.value = "empty");
    // 是否为超大歌单
    if (count >= 500) {
      loadingMsg.value = $message.loading("该电台节目数量过多，请稍等", {
        duration: 0,
      });
    }
    // 循环获取
    let offset = 0;
    djData.value = [];
    while (count === null || offset < count) {
      const result = await getDjProgram(id, 500, offset);
      const djDetail = formatData(result.programs, "dj");
      djData.value = djData.value.concat(djDetail);
      offset += 500;
    }
    // 关闭加载提示
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  } catch (error) {
    console.error("获取电台节目错误：", error);
    $message.error("获取电台节目出现错误");
  }
};

// 节目模糊搜索
const localSearch = debounce((val) => {
  const searchValue = val?.trim();
  // 是否为空
  if (!searchValue || searchValue === "") {
    return true;
  }
  // 返回结果
  const result = fuzzySearch(searchValue, djData.value);
  searchData.value = result;
}, 300);

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  const djs = userLikeData.value.djs;
  if (djs.length) {
    return !djs.some((item) => item.id === Number(id));
  }
  return true;
};

// 订阅 / 取消订阅电台
const likeOrDislike = debounce(async (id) => {
  try {
    if (!isLogin()) return $message.warning("请登录后使用");
    const type = isLikeOrDislike(id) ? 1 : 0;
    const result = await likeDj(id, type);
    if (result.code === 200) {
      $message.success((type === 1 ? "订阅" : "取消订阅") + "成功");
      // 更新用户电台
      await data.setUserLikeDjs();
    } else {
      $message.error((type === 1 ? "订阅" : "取消订阅") + "失败，请重试");
    }
  } catch (error) {
    console.error("订阅出错：", error);
    $message.error("订阅操作出现错误");
  }
}, 300);

onMounted(async () => {
  await getDjDetailData(djId.value);
});
</script>

<style lang="scss" scoped>
.dj {
  .detail {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    margin-bottom: 20px;
    .cover {
      position: relative;
      display: flex;
      width: 200px;
      height: 200px;
      min-width: 200px;
      margin-right: 20px;
      border-radius: 8px;
      .cover-img {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        z-index: 1;
        transition:
          filter 0.3s,
          transform 0.3s;
        :deep(img) {
          width: 100%;
          opacity: 0;
          transition: opacity 0.35s ease-in-out;
        }
        &:active {
          transform: scale(0.98);
        }
      }
      .cover-shadow {
        position: absolute;
        top: 4px;
        height: 100%;
        width: 100%;
        filter: blur(16px) opacity(0.6);
        transform: scale(0.92, 0.96);
        z-index: 0;
        background-size: cover;
        aspect-ratio: 1/1;
      }
    }
    .data {
      width: 100%;
      .name {
        font-size: 30px;
        font-weight: bold;
        margin-bottom: 12px;
        -webkit-line-clamp: 2;
      }
      .creator {
        display: flex;
        flex-direction: row;
        align-items: center;
        .n-avatar {
          width: 28px;
          height: 28px;
          margin-right: 8px;
        }
        .nickname {
          transition: color 0.3s;
          cursor: pointer;
          &:hover {
            color: var(--main-color);
          }
        }
        .create-time {
          margin-left: 12px;
          font-size: 13px;
        }
        .tags {
          margin-left: 12px;
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
      .num {
        margin-top: 12px;
        .num-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          .n-icon {
            margin-right: 4px;
            // color: var(--main-color);
          }
        }
      }
      .description {
        margin-top: 12px;
        .n-text {
          display: initial;
        }
      }
      :deep(.n-skeleton) {
        &:first-child {
          width: 60%;
          margin-top: 0;
          height: 40px;
        }
        height: 30px;
        margin-top: 12px;
        border-radius: 8px;
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
  @media (max-width: 700px) {
    .detail {
      .cover {
        width: 140px;
        height: 140px;
        min-width: 140px;
      }
      .data {
        .name {
          font-size: 20px;
          margin-bottom: 4px;
        }
        .creator {
          .n-avatar {
            width: 20px;
            height: 20px;
            margin-right: 6px;
          }
          .nickname {
            font-size: 12px;
          }
          .create-time {
            margin-left: 6px;
            font-size: 12px;
          }
        }
        .tags {
          .pl-tags {
            font-size: 12px;
            padding: 0 12px;
          }
        }
        .num,
        .description {
          display: none !important;
        }
      }
    }
    .menu {
      margin: 20px 0;
      .left {
        .play {
          --n-width: 40px;
          --n-height: 40px;
          .n-icon {
            font-size: 22px !important;
          }
        }
        .like {
          --n-height: 36px;
          --n-font-size: 13px;
          --n-padding: 0 16px;
          --n-icon-size: 18px;
          :deep(.n-button__icon) {
            margin: 0;
          }
          :deep(.n-button__content) {
            display: none;
          }
        }
        .more {
          --n-height: 36px;
          --n-font-size: 13px;
          --n-icon-size: 18px;
        }
      }
      .right {
        .search {
          height: 36px;
          width: 130px;
          font-size: 13px;
        }
      }
    }
  }
}
.title {
  display: flex;
  flex-direction: column;
  .key {
    margin: 10px 0;
    font-size: 36px;
    font-weight: bold;
    margin-right: 8px;
  }
  .back {
    width: 98px;
  }
}
</style>
