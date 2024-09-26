<template>
  <div class="cloud-match">
    <n-form ref="matchFormRef" :model="matchFormData" :rules="matchFormRules">
      <n-form-item path="sid" label="原歌曲 ID">
        <n-input-number v-model:value="matchFormData.sid" :show-button="false" disabled />
      </n-form-item>
      <n-form-item path="asid" label="匹配的 ID">
        <n-flex :size="12" :wrap="false" class="input">
          <n-input-number
            v-model:value="matchFormData.asid"
            :show-button="false"
            placeholder="请输入要匹配的歌曲 ID"
            @input="isSongNormal = false"
          />
          <n-button
            :disabled="!matchFormData.asid || isSongNormal"
            :type="isSongNormal ? 'success' : 'primary'"
            @click="testSongId"
          >
            {{ isSongNormal ? "验证成功" : "验证" }}
          </n-button>
        </n-flex>
      </n-form-item>
    </n-form>
    <!-- 匹配信息 -->
    <n-collapse-transition :show="isSongNormal">
      <SongDataCard :data="matchSongData" />
    </n-collapse-transition>
    <n-flex class="menu" justify="end">
      <n-button strong secondary @click="emit('close')"> 取消 </n-button>
      <n-button type="primary" strong secondary @click="correctSong"> 确认纠正 </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { FormInst, FormRules } from "naive-ui";
import { useDataStore } from "@/stores";
import { matchCloudSong } from "@/api/cloud";
import { numberRule } from "@/utils/rules";
import { debounce } from "lodash-es";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";

// 表单类型
interface MatchFormType {
  sid: number;
  asid: number | null;
}

const props = defineProps<{
  id: number;
  index: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dataStore = useDataStore();

// 验证结果
const isSongNormal = ref<boolean>(false);
const matchSongData = ref<SongType | null>(null);

// 表单数据
const matchFormRef = ref<FormInst | null>(null);
const matchFormData = ref<MatchFormType>({ sid: props.id, asid: null });
const matchFormRules: FormRules = { asid: { ...numberRule, message: "请输入歌曲 ID" } };

// 验证歌曲 ID
const testSongId = debounce(
  async () => {
    const asid = matchFormData.value.asid;
    if (!asid) {
      window.$message.warning("请输入歌曲 ID");
      return;
    }
    // 获取歌曲详情
    const { songs } = await songDetail(asid);
    // 结果是否为空
    if (!songs?.length) {
      window.$message.warning("未找到该歌曲，请重试");
    } else {
      window.$message.success("验证成功");
      isSongNormal.value = true;
      matchSongData.value = formatSongsList(songs)[0];
    }
  },
  300,
  { leading: true, trailing: false },
);

// 歌曲纠正
const correctSong = debounce(
  async () => {
    const userId = dataStore.userData.userId;
    if (!matchFormData.value.asid || !userId) {
      window.$message.warning("获取必要信息失败，请重试");
      return;
    }
    if (matchFormData.value.sid === matchFormData.value.asid) {
      window.$message.warning("与原歌曲 ID 一致，无需纠正");
      return;
    }
    if (!isSongNormal.value) {
      window.$message.warning("歌曲未通过验证，请重试");
      return;
    }
    // 开始纠正
    const result = await matchCloudSong(userId, matchFormData.value.sid, matchFormData.value.asid);
    if (result.code === 200) {
      emit("close");
      // 修改信息
      if (matchSongData.value) {
        dataStore.cloudPlayList[props.index] = matchSongData.value;
        dataStore.setCloudPlayList(dataStore.cloudPlayList);
      }
      window.$message.success("歌曲信息纠正成功");
    } else {
      window.$message.error(result.message || "纠正失败，请重试");
    }
  },
  300,
  { leading: true, trailing: false },
);
</script>

<style lang="scss" scoped>
.input {
  width: 100%;
}
</style>
