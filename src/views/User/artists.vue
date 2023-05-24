<template>
  <div class="artists">
    <ArtistLists :listData="user.getUserArtistLists.list" />
  </div>
</template>

<script setup>
import { userStore } from "@/store";
import { useI18n } from "vue-i18n";
import ArtistLists from "@/components/DataList/ArtistLists.vue";

const { t } = useI18n();
const user = userStore();

onMounted(() => {
  $setSiteTitle(t("nav.user") + " - " + t("nav.userChildren.artist"));
  if (!user.getUserArtistLists.has && !user.getUserArtistLists.isLoading)
    user.setUserArtistLists();
});
</script>
