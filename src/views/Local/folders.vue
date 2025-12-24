<template>
  <div class="local-folders">
    <!-- 左侧文件夹列表 -->
    <n-scrollbar class="folder-list">
      <n-tree
        block-line
        expand-on-click
        virtual-scroll
        :data="treeData"
        :selected-keys="[chooseFolder]"
        :expanded-keys="expandedKeys"
        :render-prefix="renderPrefix"
        :render-label="renderLabel"
        @update:selected-keys="handleTreeSelect"
        @update:expanded-keys="(keys: string[]) => (expandedKeys = keys)"
      />
    </n-scrollbar>

    <!-- 右侧歌曲列表 -->
    <Transition name="fade" mode="out-in">
      <SongList
        :key="chooseFolder"
        :data="folderSongs"
        :loading="folderSongs?.length ? false : true"
        :hidden-cover="!settingStore.showLocalCover"
        class="song-list"
        @removeSong="handleRemoveSong"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { TreeOption } from "naive-ui";
import { useLocalStore, useSettingStore } from "@/stores";
import SongList from "@/components/List/SongList.vue";
import SvgIcon from "@/components/Global/SvgIcon.vue";
import { some, uniqBy } from "lodash-es";
import { h } from "vue";

const props = defineProps<{
  data: SongType[];
  loading: boolean;
}>();

const localStore = useLocalStore();
const settingStore = useSettingStore();

// 选中的文件夹
const chooseFolder = ref<string>("");

// 按文件夹分组后的数据：{ 文件夹路径: SongType[] }
const folderData = computed<Record<string, SongType[]>>(() => {
  const map: Record<string, SongType[]> = {};

  props.data.forEach((song) => {
    const fullPath = (song as any).path as string | undefined;
    if (!fullPath) return;

    // 去掉文件名，提取目录路径
    const folderPath = fullPath.replace(/[/\\][^/\\]*$/, "") || "未知文件夹";

    if (!map[folderPath]) map[folderPath] = [];
    // 去重
    if (!some(map[folderPath], { id: song.id })) {
      map[folderPath].push(song);
    }
  });

  const sortedKeys = Object.keys(map).sort((a, b) => a.localeCompare(b));
  const sortedMap: Record<string, SongType[]> = {};
  sortedKeys.forEach((key) => {
    sortedMap[key] = map[key];
  });

  return sortedMap;
});

// 树状结构数据
const treeData = computed<TreeOption[]>(() => {
  const allPaths = Object.keys(folderData.value);
  if (allPaths.length === 0) return [];

  // 构建原始树结构
  interface RawNode {
    label: string;
    key: string;
    children: RawNode[];
    isDirectFolder: boolean; // 是否直接包含歌曲
    songCount: number; // 直接包含的歌曲数量
  }

  const rootNodes: RawNode[] = [];
  const nodeMap = new Map<string, RawNode>();

  const sortedPaths = allPaths.sort();

  sortedPaths.forEach((fullPath) => {
    const isWindows = fullPath.includes("\\");
    const sep = isWindows ? "\\" : "/";
    const segments = fullPath.split(/[/\\]/).filter(Boolean);

    let currentPath = "";
    if (fullPath.startsWith(sep)) currentPath = sep;

    segments.forEach((segment, index) => {
      const prevPath = currentPath;
      if (index === 0 && !fullPath.startsWith(sep)) {
        currentPath = segment;
      } else {
        currentPath = currentPath.endsWith(sep)
          ? currentPath + segment
          : currentPath + sep + segment;
      }

      if (!nodeMap.has(currentPath)) {
        const isLast = index === segments.length - 1;
        const node: RawNode = {
          label: segment,
          key: currentPath,
          children: [],
          isDirectFolder: isLast,
          songCount: isLast ? folderData.value[currentPath]?.length || 0 : 0,
        };
        nodeMap.set(currentPath, node);

        if (index === 0) {
          rootNodes.push(node);
        } else {
          const parentNode = nodeMap.get(prevPath);
          if (parentNode) {
            parentNode.children.push(node);
          } else {
            rootNodes.push(node);
          }
        }
      } else if (index === segments.length - 1) {
        const node = nodeMap.get(currentPath)!;
        node.isDirectFolder = true;
        node.songCount = folderData.value[currentPath]?.length || 0;
      }
    });
  });

  // 计算节点及其所有子节点的总歌曲数
  const nodeTotalCounts = new Map<string, number>();
  const calcTotalCount = (node: RawNode): number => {
    let total = node.songCount;
    node.children.forEach((child) => {
      total += calcTotalCount(child);
    });
    nodeTotalCounts.set(node.key, total);
    return total;
  };
  rootNodes.forEach((root) => calcTotalCount(root));

  // 合并只有一个子节点的节点，并转换为 TreeOption
  const mergeAndConvert = (nodes: RawNode[]): TreeOption[] => {
    return nodes.map((node) => {
      let currentLabel = node.label;
      let currentKey = node.key;
      let currentChildren = node.children;
      let currentDirectFolder = node.isDirectFolder;

      const isWindows = currentKey.includes("\\");
      const sep = isWindows ? "\\" : "/";

      // 如果只有一个子节点，且当前节点本身没有歌曲，则合并
      while (currentChildren.length === 1 && !currentDirectFolder) {
        const child = currentChildren[0];
        currentLabel += sep + child.label;
        currentKey = child.key;
        currentChildren = child.children;
        currentDirectFolder = child.isDirectFolder;
      }

      const totalSongs = nodeTotalCounts.get(node.key) || 0;

      return {
        label: `${currentLabel} (${totalSongs})`,
        key: currentKey,
        children: currentChildren.length > 0 ? mergeAndConvert(currentChildren) : undefined,
      };
    });
  };

  const finalTree = mergeAndConvert(rootNodes);

  // 默认选中第一个节点
  if (!chooseFolder.value && finalTree.length > 0) {
    chooseFolder.value = finalTree[0].key as string;
  }

  return finalTree;
});

// 当前选中文件夹的歌曲（包含子目录）
const folderSongs = computed<SongType[]>(() => {
  if (!chooseFolder.value) return [];

  const songs: SongType[] = [];
  const path = chooseFolder.value;

  // 查找当前目录及所有子目录下的歌曲
  Object.keys(folderData.value).forEach((k) => {
    const isWindows = k.includes("\\");
    const sep = isWindows ? "\\" : "/";
    if (k === path || k.startsWith(path + sep)) {
      songs.push(...folderData.value[k]);
    }
  });

  return uniqBy(songs, "id");
});

// 树节点选中回调
const handleTreeSelect = (keys: string[]) => {
  if (keys.length > 0) {
    chooseFolder.value = keys[0];
  }
};

// 自定义渲染前缀（图标）
const renderPrefix = () => {
  return h(SvgIcon, { name: "Folder", depth: 2 });
};

// 自定义渲染标签（显示数量）
const renderLabel = ({ option }: { option: TreeOption }) => {
  const label = option.label as string;
  const match = label.match(/(.*) \((\d+)\)$/);
  if (match) {
    return h("div", { class: "tree-label" }, [
      h("span", { class: "name" }, match[1]),
      h("span", { class: "count" }, ` (${match[2]})`),
    ]);
  }
  return label;
};

// 从完整路径中提取最后一级目录作为显示名
// 删除歌曲时，同步更新本地歌曲列表
const handleRemoveSong = (ids: number[]) => {
  const updatedSongs = localStore.localSongs.filter((song) => !ids.includes(song.id));
  localStore.updateLocalSong(updatedSongs);
};

// 展开的节点
const expandedKeys = ref<string[]>([]);

// 初始化时展开第一层
watch(
  () => treeData.value,
  (val) => {
    if (val.length > 0 && expandedKeys.value.length === 0) {
      expandedKeys.value = val.map((node) => node.key as string);
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.local-folders {
  display: flex;
  height: calc((var(--layout-height) - 80) * 1px);

  :deep(.folder-list) {
    width: 280px;
    height: 100%;
    background-color: var(--surface-container-hex);
    border-radius: 12px;
    padding: 10px;
    .n-tree {
      .n-tree-node-wrapper {
        --n-node-border-radius: 6px;
      }
    }
  }

  .song-list {
    width: 100%;
    flex: 1;
    margin-left: 15px;
  }
}
</style>
