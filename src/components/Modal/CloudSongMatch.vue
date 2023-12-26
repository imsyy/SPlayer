<!-- 云盘歌曲纠正 -->
<template>
  <n-modal
    v-model:show="cloudSongMatchShow"
    :bordered="false"
    :on-after-leave="closeCloudSongMatch"
    title="歌曲纠正"
    preset="card"
  >
    <n-form class="cloud-match" :label-width="80" :model="cloudMatchValue">
      <n-form-item label="原歌曲 ID" path="asid">
        <n-input-number v-model:value="cloudMatchValue.sid" :show-button="false" disabled />
      </n-form-item>
      <n-form-item label="匹配的 ID" path="asid">
        <n-input-number
          v-model:value="cloudMatchValue.asid"
          :show-button="false"
          placeholder="请输入要匹配的歌曲 ID"
        />
        <n-button
          :disabled="!cloudMatchValue.asid"
          style="margin-left: 12px"
          @click="checkMatchSong(cloudMatchValue.asid)"
        >
          检查
        </n-button>
      </n-form-item>
    </n-form>
    <!-- 纠正歌曲数据 -->
    <Transition name="fade" mode="out-in">
      <n-card
        v-if="cloudMatchSongData"
        :key="cloudMatchSongData"
        :content-style="{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '16px',
          height: '100%',
        }"
        class="song-detail"
      >
        <n-image
          :src="cloudMatchSongData?.coverSize?.s || cloudMatchSongData?.cover"
          class="cover-img"
          preview-disabled
          @load="
            (e) => {
              e.target.style.opacity = 1;
            }
          "
        >
          <template #placeholder>
            <div class="cover-loading">
              <img class="loading-img" src="/images/pic/song.jpg?assest" alt="loading-img" />
            </div>
          </template>
        </n-image>
        <div class="content">
          <div class="name">{{ cloudMatchSongData?.name || "未知曲目" }}</div>
          <div class="artist">
            <n-icon depth="3" size="20">
              <SvgIcon icon="account-music" />
            </n-icon>
            <div
              v-if="cloudMatchSongData?.artists && Array.isArray(cloudMatchSongData?.artists)"
              class="all-ar"
            >
              <span v-for="ar in cloudMatchSongData.artists" :key="ar.id" class="ar">
                {{ ar.name }}
              </span>
            </div>
            <div v-else class="all-ar">
              <span class="ar"> {{ cloudMatchSongData?.artists || "未知艺术家" }} </span>
            </div>
          </div>
        </div>
      </n-card>
    </Transition>
    <template #footer>
      <n-space justify="end">
        <n-button @click="closeCloudSongMatch"> 取消 </n-button>
        <n-button
          :disabled="!cloudMatchValue.asid"
          type="primary"
          @click="setCloudSongMatchBtn(cloudMatchValue)"
        >
          纠正
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteData, indexedDBData } from "@/stores";
import { setCloudMatch } from "@/api/cloud";
import { getSongDetail } from "@/api/song";
import formatData from "@/utils/formatData";

const data = siteData();
const indexedDB = indexedDBData();
const { userData } = storeToRefs(data);

// 歌曲信息纠正数据
const cloudMatchId = ref(null);
const cloudMatchIndex = ref(null);
const cloudSongMatchShow = ref(false);
const cloudMatchSongData = ref(null);
const cloudMatchValue = ref({
  uid: userData.value?.userId,
  sid: null,
  asid: null,
});

// 检查纠正歌曲id
const checkMatchSong = async (id) => {
  try {
    if (!id) return false;
    const songId = id.toString();
    const result = await getSongDetail(songId);
    if (result.code === 200 && result.songs.length > 0) {
      $message.success("匹配的歌曲检查通过");
      cloudMatchSongData.value = formatData(result.songs[0], "song")[0];
    } else {
      $message.warning("请检查要匹配的歌曲 ID 是否正确");
    }
  } catch (error) {
    console.error("检查纠正歌曲失败：", error);
    $message.error("检查纠正歌曲失败，请重试");
  }
};

// 歌曲纠正
const setCloudSongMatchBtn = async (data) => {
  if (Number(data.sid) === Number(data.asid)) {
    return $message.warning("与原歌曲 ID 一致，无需修改");
  }
  if (!cloudMatchSongData.value) {
    return $message.warning("未检测到正确的匹配检查结果");
  }
  const result = await setCloudMatch(data.uid, data.sid, data.asid);
  console.log(result);
  if (result.code === 200) {
    // 更改歌曲信息
    try {
      cloudMatchSongData.value.pc = undefined;
      const allCloudSongs = await indexedDB.getfilesDB("userCloudList");
      allCloudSongs[cloudMatchIndex.value] = JSON.parse(JSON.stringify(cloudMatchSongData.value));
      await indexedDB.setfilesDB("userCloudList", allCloudSongs.slice());
      // 刷新列表
      if (typeof $refreshCloudCatch !== "undefined") $refreshCloudCatch();
    } catch (error) {
      console.error("更改云盘列表时出错：", error);
      $message.error("更改云盘列表时出错，请刷新后重试");
    }
    closeCloudSongMatch();
    $message.success("歌曲信息纠正成功");
  } else {
    $message.error("歌曲信息纠正失败，请重试");
  }
};

// 开启歌曲纠正
const openCloudSongMatch = (data, index) => {
  cloudMatchIndex.value = index;
  cloudMatchValue.value.sid = data.id;
  cloudSongMatchShow.value = true;
};

// 关闭歌曲纠正
const closeCloudSongMatch = () => {
  cloudSongMatchShow.value = false;
  cloudMatchId.value = null;
  cloudMatchValue.value.asid = null;
  cloudMatchSongData.value = null;
};

// 暴露方法
defineExpose({
  openCloudSongMatch,
});
</script>

<style lang="scss" scoped>
.cloud-match {
  :deep(.n-input-number) {
    width: 100%;
  }
}
</style>

<style lang="scss" scoped>
.song-detail {
  height: 100px;
  border-radius: 8px;
  .cover-img {
    width: 66px;
    height: 66px;
    margin-right: 16px;
    border-radius: 8px;
    overflow: hidden;
    z-index: 1;
    box-shadow: 0 0 10px 6px #00000008;
    transition: opacity 0.1s ease-in-out;
    :deep(img) {
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
  }
  .content {
    .name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .artist {
      display: flex;
      align-items: center;
      .n-icon {
        margin-right: 4px;
      }
      .all-ar {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        overflow: hidden;
        word-break: break-all;
        .ar {
          display: inline-flex;
          &::after {
            content: "/";
            margin: 0 4px;
          }
          &:last-child {
            &::after {
              display: none;
            }
          }
        }
      }
    }
  }
}
</style>
