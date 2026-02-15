import type { CoverType, SongType } from "@/types/main";
import { useStatusStore } from "@/stores";
import { useMobile } from "@/composables/useMobile";

/**
 * 列表详情逻辑
 */
export const useListDetail = () => {
  const statusStore = useStatusStore();
  const { isSmallScreen } = useMobile();

  const detailData = ref<CoverType | null>(null);
  const listData = shallowRef<SongType[]>([]);
  const loading = ref<boolean>(true);

  /**
   * 计算列表高度
   */
  const getSongListHeight = (listScrolling: boolean) => {
    // 移动端高度较小
    const normalHeight = isSmallScreen.value ? 180 : 240;
    const smallHeight = isSmallScreen.value ? 100 : 120;
    return statusStore.mainContentHeight - (listScrolling ? smallHeight : normalHeight);
  };

  /**
   * 重置数据
   */
  const resetData = (resetList: boolean = true) => {
    detailData.value = null;
    if (resetList) {
      listData.value = [];
    }
  };

  /**
   * 设置详情数据
   */
  const setDetailData = (data: CoverType | null) => {
    detailData.value = data;
  };

  /**
   * 设置列表数据
   */
  const setListData = (data: SongType[]) => {
    listData.value = data;
  };

  /**
   * 追加列表数据
   */
  const appendListData = (data: SongType[]) => {
    listData.value = [...listData.value, ...data];
  };

  /**
   * 设置加载状态
   */
  const setLoading = (value: boolean) => {
    loading.value = value;
  };

  return {
    detailData,
    listData,
    loading,
    getSongListHeight,
    resetData,
    setDetailData,
    setListData,
    appendListData,
    setLoading,
  };
};
