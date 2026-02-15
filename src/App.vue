<template>
  <Provider v-if="!isDesktopLyric">
    <router-view />
  </Provider>
  <router-view v-else />
</template>

<script setup lang="ts">
const isDesktopLyric = location.hash.includes("desktop-lyric");
</script>
