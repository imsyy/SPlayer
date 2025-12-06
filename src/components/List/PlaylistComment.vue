<template>
  <Teleport to="body">
    <Transition name="up" mode="out-in">
        <div
            v-show="showDrawer"
            class="playlist-comment"
            :style="{ '--main-color': statusStore.mainColor }"
        >
            <n-flex :wrap="false" align="center" class="playlist-info">
                <n-image
                    :src="data?.cover"
                    width="60"
                    height="60"
                    class="cover-img"
                    preview-disabled
                    @load="coverLoaded"
                >
                    <template #placeholder>
                        <div class="cover-loading">
                            <img src="/images/song.jpg?assest" class="loading-img" alt="loading-img" />
                        </div>
                    </template>
                </n-image>
                <n-flex :size="2" class="info-text" vertical>
                    <span class="title text-hidden">{{ data?.name || '未知歌单' }}</span>
                    <span class="creator text-hidden">
                        {{ data?.creator?.name || '未知创建者' }}
                    </span>
                </n-flex>
                <n-flex
                    class="close"
                    align="center"
                    justify="center"
                    @click="showDrawer = false"
                >
                    <SvgIcon name="Down" :size="24" />
                </n-flex>
            </n-flex>
            <n-scrollbar ref="scrollbarRef" class="comment-scroll" @scroll="handleScroll">
                 <template v-if="hotComments.length > 0">
                    <div class="placeholder">
                      <div class="title">
                        <SvgIcon name="Fire" />
                        <span>热门评论</span>
                      </div>
                    </div>
                    <CommentList
                      :data="hotComments"
                      :loading="loading"
                      :type="2"
                      transparent
                    />
                 </template>
                 <div class="placeholder">
                    <div class="title">
                      <SvgIcon name="Message" />
                      <span>全部评论</span>
                    </div>
                 </div>
                 <CommentList
                   :data="comments"
                   :loading="loading"
                   :type="2"
                   :loadMore="hasMore"
                   transparent
                   @loadMore="loadMore"
                 />
                 <div class="placeholder" />
            </n-scrollbar>
        </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { getPlaylistComment } from '@/api/comment';
import CommentList from './CommentList.vue';
import type { CommentType, CoverType } from '@/types/main';
import { formatCommentList } from '@/utils/format';
import { NScrollbar } from 'naive-ui';
import { coverLoaded } from "@/utils/helper";
import { useStatusStore } from "@/stores";

const props = defineProps<{
  id: number;
  show: boolean;
  data: CoverType | null;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const statusStore = useStatusStore();

const showDrawer = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val),
});

const loading = ref(false);
const comments = ref<CommentType[]>([]);
const hotComments = ref<CommentType[]>([]);
const page = ref(1);
const hasMore = ref(false);
const scrollbarRef = ref<InstanceType<typeof NScrollbar> | null>(null);

const getComments = async (isLoadMore = false) => {
  if (!isLoadMore) {
    loading.value = true;
    comments.value = [];
    hotComments.value = [];
    page.value = 1;
    scrollbarRef.value?.scrollTo({ top: 0 });
  }

  try {
    const offset = (page.value - 1) * 20;
    const res = await getPlaylistComment(props.id, 20, offset);
    
    if (res.code === 200) {
      if (!isLoadMore) {
        hotComments.value = formatCommentList(res.hotComments || []);
      }
      
      const newComments = formatCommentList(res.comments || []);
      if (isLoadMore) {
        comments.value.push(...newComments);
      } else {
        comments.value = newComments;
      }
      
      hasMore.value = res.more;
    }
  } catch (error) {
    console.error('Failed to get playlist comments:', error);
  } finally {
    loading.value = false;
  }
};

const loadMore = () => {
    if(!hasMore.value) return;
    page.value++;
    getComments(true);
}

const handleScroll = () => {
}

watch(
  () => props.show,
  (val) => {
    if (val && props.id) {
        if(comments.value.length === 0) {
            getComments();
        }
    }
  }
);
</script>

<style lang="scss" scoped>
.playlist-comment {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  padding-top: 80px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  background-color: rgb(var(--background));
  [data-theme='dark'] & {
      background-color: #121212;
  }
  
  :deep(.n-text),
  :deep(.n-icon),
  :deep(.n-button) {
    color: rgb(var(--main-color));
  }

  .playlist-info {
    margin: 0 60px 12px; 
    height: 90px;
    padding: 0 16px;
    border-radius: 12px;
    background-color: rgba(var(--main-color), 0.08);
    
    .cover-img {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      margin-right: 12px;
      overflow: hidden;
      display: flex;
    }
    
    .info-text {
        flex: 1;
        overflow: hidden;
    }

    .title {
      font-size: 18px;
      font-weight: bold;
    }
    .creator {
      opacity: 0.8;
      font-size: 14px;
    }
    .close {
      width: 40px;
      height: 40px;
      margin-left: auto;
      background-color: rgba(var(--main-color), 0.08);
      border-radius: 8px;
      transition: background-color 0.3s;
      cursor: pointer;
      &:hover {
        background-color: rgba(var(--main-color), 0.29);
      }
    }
  }

  :deep(.comment-scroll) {
    flex: 1;
    height: calc(100% - 122px);
    mask: linear-gradient(
      180deg,
      hsla(0, 0%, 100%, 0) 0,
      hsla(0, 0%, 100%, 0.6) 2%,
      #fff 5%,
      #fff 90%,
      hsla(0, 0%, 100%, 0.6) 95%,
      hsla(0, 0%, 100%, 0)
    );
     .n-scrollbar-content {
      padding: 0 60px;
    }
  }

  .placeholder {
    width: 100%;
    height: 80px;
    padding-bottom: 20px;
    display: flex;
    align-items: flex-end;
    &:last-child {
      height: 0;
      padding-top: 100px;
    }
    .title {
      display: flex;
      align-items: center;
      font-size: 20px;
      font-weight: bold;
      .n-icon {
        margin-right: 6px;
      }
    }
  }
}
</style>
