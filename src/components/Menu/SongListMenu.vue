<template>
  <n-dropdown
    :x="dropdownX"
    :y="dropdownY"
    :show="dropdownShow"
    :options="dropdownOptions"
    class="song-list-menu"
    placement="bottom-start"
    trigger="manual"
    size="large"
    @select="dropdownShow = false"
    @clickoutside="dropdownShow = false"
  />
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { NFlex, NText, type DropdownOption } from "naive-ui";
import { getPlayerInfoObj } from "@/utils/format";
import SImage from "../UI/s-image.vue";
import { useSongMenu } from "@/composables/useSongMenu";

const props = defineProps<{ hiddenCover?: boolean }>();
const emit = defineEmits<{ removeSong: [index: number[]] }>();

const { getMenuOptions } = useSongMenu();

// 右键菜单数据
const dropdownX = ref<number>(0);
const dropdownY = ref<number>(0);
const dropdownShow = ref<boolean>(false);
const dropdownOptions = ref<DropdownOption[]>([]);

// 开启右键菜单
const openDropdown = (
  e: MouseEvent,
  _data: SongType[],
  song: SongType,
  index: number,
  playListId?: number,
  isDailyRecommend: boolean = false,
) => {
  try {
    e.preventDefault();
    dropdownShow.value = false;
    // 当前歌曲信息
    const songData = getPlayerInfoObj(song);
    // 生成基础菜单选项
    const baseOptions = getMenuOptions(
      song,
      index,
      playListId || 0,
      isDailyRecommend,
      (event, args) => emit(event, args),
    );
    // 头部信息
    const headerOption: DropdownOption = {
      key: "data",
      type: "render",
      render: () =>
        h(
          NFlex,
          {
            align: "center",
            wrap: false,
            class: "song-list-card",
            justify: props.hiddenCover ? "center" : undefined,
          },
          {
            default: () => {
              const list = [
                h(
                  NFlex,
                  {
                    vertical: true,
                    size: 0,
                    align: props.hiddenCover ? "center" : undefined,
                  },
                  {
                    default: () => [
                      h(
                        NText,
                        { class: "text-hidden", depth: 1 },
                        { default: () => songData?.name },
                      ),
                      h(
                        NText,
                        { depth: 3, class: "text-hidden", style: { fontSize: "12px" } },
                        { default: () => songData?.artist },
                      ),
                    ],
                  },
                ),
              ];
              if (!props.hiddenCover) list.unshift(h(SImage, { src: song.coverSize?.s }));
              return list;
            },
          },
        ),
    };
    nextTick().then(() => {
      dropdownOptions.value = [
        headerOption,
        { key: "header-line", type: "divider" },
        ...baseOptions,
      ];
      // 显示菜单
      dropdownX.value = e.clientX;
      dropdownY.value = e.clientY;
      dropdownShow.value = true;
    });
  } catch (error) {
    console.error("右键菜单出现异常：", error);
    window.$message.error("右键菜单出现异常");
  }
};

defineExpose({ openDropdown });
</script>

<style lang="scss">
.delete-mata {
  display: flex;
}
.song-list-card {
  width: 100%;
  max-width: 180px;
  padding: 4px 10px;
  .s-image {
    border-radius: 6px;
    overflow: hidden;
    width: 40px;
    height: 40px;
    min-width: 40px;
  }
}
</style>
