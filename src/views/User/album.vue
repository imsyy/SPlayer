<template>
  <div class="album">
    <CoverLists :listData="user.getUserAlbumLists.list" listType="album" />
  </div>
</template>

<script setup>
import { userStore } from "@/store";
import { useI18n } from "vue-i18n";
import CoverLists from "@/components/DataList/CoverLists.vue";

const { t } = useI18n();
const user = userStore();

onMounted(() => {
  $setSiteTitle(t("nav.user") + " - " + t("nav.userChildren.album"));
  if (!user.getUserAlbumLists.has && !user.getUserAlbumLists.isLoading)
    user.setUserAlbumLists();
});
</script>
