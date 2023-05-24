<template>
  <div class="like">
    <CoverLists :listData="user.getUserPlayLists.like" />
  </div>
</template>

<script setup>
import { userStore } from "@/store";
import { useI18n } from "vue-i18n";
import CoverLists from "@/components/DataList/CoverLists.vue";

const { t } = useI18n();
const user = userStore();

onMounted(() => {
  $setSiteTitle(t("nav.user") + " - " + t("nav.userChildren.like"));
  if (!user.getUserPlayLists.has && !user.getUserPlayLists.isLoading)
    user.setUserPlayLists();
});
</script>
