<template>
  <div class="toplists">
    <n-divider v-if="toplistData.officialList[0]">
      {{ $t("nav.officialList") }}
    </n-divider>
    <Transition mode="out-in">
      <n-grid
        class="official"
        x-gap="20"
        y-gap="20"
        :cols="2"
        v-if="toplistData.officialList[0]"
      >
        <n-gi v-for="item in toplistData.officialList" :key="item">
          <n-card
            class="item"
            :bordered="false"
            :content-style="{
              padding: '0',
              display: 'flex',
              alignItems: 'center',
            }"
            hoverable
            @click="router.push(`/playlist?id=${item.id}&page=1`)"
          >
            <div class="cover">
              <n-avatar
                class="coverImg"
                :src="
                  item.coverImgUrl.replace(/^http:/, 'https:') +
                  '?param=300y300'
                "
                fallback-src="/images/pic/default.png"
              />
              <n-text class="update" v-html="item.updateFrequency" />
            </div>
            <div class="data">
              <n-text class="title" v-html="item.name" />
              <div class="desc">
                <div
                  class="song text-hidden"
                  v-for="(song, index) in item.tracks"
                  :key="song"
                >
                  <n-text>{{ index + 1 }}. {{ song.first }} - </n-text>
                  <n-text depth="3">{{ song.second }}</n-text>
                </div>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </Transition>
    <n-divider>{{ $t("nav.globalList") }}</n-divider>
    <CoverLists :listData="toplistData.globalList" listType="topList" />
  </div>
</template>

<script setup>
import { getToplist } from "@/api/album";
import { useRouter } from "vue-router";
import { formatNumber } from "@/utils/timeTools";
import { useI18n } from "vue-i18n";
import CoverLists from "@/components/DataList/CoverLists.vue";

const { t } = useI18n();
const router = useRouter();

// 排行榜数据
const toplistData = reactive({
  // 官方榜
  officialList: [],
  // 全球榜
  globalList: [],
});

// 获取排行榜数据
const getToplistData = () => {
  getToplist().then((res) => {
    toplistData.officialList = [];
    toplistData.globalList = [];
    if (res.list[0]) {
      res.list.forEach((v) => {
        if (v.ToplistType) {
          toplistData.officialList.push(v);
        } else {
          toplistData.globalList.push({
            id: v.id,
            cover: v.coverImgUrl,
            name: v.name,
            update: v.updateFrequency,
            playCount: formatNumber(v.playCount),
          });
        }
      });
      console.log(toplistData);
    } else {
      $message.error(t("general.message.acquisitionFailed"));
    }
  });
};

onMounted(() => {
  $setSiteTitle(t("nav.discover") + " - " + t("nav.discoverChildren.toplists"));
  getToplistData();
});
</script>

<style lang="scss" scoped>
.toplists {
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.3s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
  .official {
    @media (max-width: 768px) {
      grid-template-columns: repeat(1, minmax(0px, 1fr)) !important;
      .cover {
        .coverImg {
          width: 120px !important;
          height: 120px !important;
          min-width: 120px !important;
        }
      }
      .data {
        height: 120px !important;
        .title {
          font-size: 16px !important;
          margin-bottom: 6px !important;
        }
      }
    }
    .item {
      border-radius: 8px;
      transition: all 0.3s;
      overflow: hidden;
      cursor: pointer;
      &:active {
        transform: scale(0.98);
      }
      .cover {
        position: relative;
        margin-right: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        .coverImg {
          width: 160px;
          height: 160px;
          min-width: 160px;
          border-radius: 8px;
        }
        .update {
          position: absolute;
          right: 0;
          bottom: 0;
          color: #fff;
          background-color: #00000030;
          font-size: 12px;
          -webkit-backdrop-filter: blur(40px);
          backdrop-filter: blur(40px);
          padding: 4px 8px;
          border-radius: 8px 0 8px 0;
        }
      }
      .data {
        height: 160px;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        padding: 20px 20px 20px 0;
        box-sizing: border-box;
        .title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 12px;
        }
        .desc {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      }
    }
  }
}
</style>
