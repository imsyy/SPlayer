<template>
  <div class="history">
    <div class="title" v-if="music.getPlayHistory[0]">
      <span class="key">{{ $t("nav.avatar.history") }}</span>
    </div>
    <div class="title" v-else>
      <span class="key">{{ $t("other.noHistory") }}</span>
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
    <DataLists
      v-if="music.getPlayHistory[0]"
      :listData="music.getPlayHistory"
    />
    <n-divider v-if="music.getPlayHistory[0]" class="tip" dashed>
      <n-text :depth="3" style="font-size: 12px">
        {{ $t("other.justShow", { num: 100 }) }}
      </n-text>
    </n-divider>
  </div>
</template>

<script setup>
import { musicStore } from "@/store";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import DataLists from "@/components/DataList/DataLists.vue";

const { t } = useI18n();
const music = musicStore();
const router = useRouter();

onMounted(() => {
  $setSiteTitle(t("nav.avatar.history"));
});
</script>

<style lang="scss" scoped>
.history {
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    .key {
      font-size: 40px;
      font-weight: bold;
      margin-right: 8px;
    }
  }
}
</style>
