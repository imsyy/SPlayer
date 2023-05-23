<template>
  <div class="search">
    <div class="title" v-if="searchKeywords">
      <n-text class="key" v-html="searchKeywords" />
      <n-text v-html="$t('nav.search.results')" />
    </div>
    <div class="title" v-else>
      <span class="key">{{ $t("general.name.noKeywords") }}</span>
      <br />
      <n-button
        strong
        secondary
        @click="router.go(-1)"
        style="margin-top: 20px"
      >
        {{ $t("general.name.goBack") }}
      </n-button>
    </div>
    <n-tabs
      class="main-tab"
      type="line"
      @update:value="tabChange"
      v-model:value="tabValue"
      v-if="searchKeywords"
    >
      <n-tab name="songs">{{ $t("general.name.song") }}</n-tab>
      <n-tab name="artists">{{ $t("general.name.artists") }}</n-tab>
      <n-tab name="albums">{{ $t("general.name.album") }}</n-tab>
      <n-tab name="videos">{{ $t("general.name.videos") }}</n-tab>
      <n-tab name="playlists">{{ $t("general.name.playlist") }}</n-tab>
    </n-tabs>
    <main class="content" v-if="searchKeywords">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <Transition name="move" mode="out-in">
            <component :is="Component" />
          </Transition>
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();

// 搜索关键词
const searchKeywords = ref(router.currentRoute.value.query.keywords);

// Tab 默认选中
const tabValue = ref(router.currentRoute.value.path.split("/")[2]);

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    $setSiteTitle(val.query.keywords + "的搜索结果");
    searchKeywords.value = val.query.keywords;
    tabValue.value = val.path.split("/")[2];
  }
);

// Tab 选项卡变化
const tabChange = (value) => {
  console.log(value);
  router.push({
    path: `/search/${value}`,
    query: {
      keywords: searchKeywords.value,
      page: 1,
    },
  });
};

onMounted(() => {
  if (searchKeywords.value)
    $setSiteTitle(searchKeywords.value + " " + t("nav.search.results"));
});
</script>

<style lang="scss" scoped>
.search {
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    font-size: 24px;
    .key {
      font-size: 40px;
      font-weight: bold;
      margin-right: 8px;
    }
  }
  .content {
    margin-top: 20px;
  }
}

// 路由跳转动画
.move-enter-active,
.move-leave-active {
  transition: all 0.2s ease;
}

.move-enter-from,
.move-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
