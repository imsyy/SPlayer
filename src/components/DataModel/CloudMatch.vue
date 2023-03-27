<template>
  <n-modal
    class="s-modal"
    v-model:show="cloudMatchModel"
    preset="card"
    title="歌曲信息纠正"
    :bordered="false"
    :on-after-leave="closeCloudMatch"
  >
    <n-form class="cloud-match" :label-width="80" :model="cloudMatchValue">
      <n-form-item label="原歌曲信息">
        <n-card content-style="padding: 16px" :bordered="false" embedded>
          <SmallSongData :songData="cloudMatchBeforeData" notJump />
        </n-card>
      </n-form-item>
      <n-form-item label="匹配 ID" path="asid">
        <n-input-number
          v-model:value="cloudMatchValue.asid"
          placeholder="请输入要匹配的歌曲 ID"
          :show-button="false"
        />
        <n-button
          style="margin-left: 12px"
          :disabled="!cloudMatchValue.asid"
          @click="cloudMatchId = cloudMatchValue.asid.toString()"
        >
          检查
        </n-button>
      </n-form-item>
    </n-form>
    <n-card
      v-if="cloudMatchId"
      content-style="padding: 16px"
      :bordered="false"
      embedded
    >
      <SmallSongData
        ref="smallSongDataRef"
        :getDataByID="cloudMatchId"
        notJump
      />
    </n-card>
    <template #footer>
      <n-space justify="end">
        <n-button @click="closeCloudMatch"> 取消 </n-button>
        <n-button
          type="primary"
          @click="setCloudMatchBtn(cloudMatchValue)"
          :disabled="!cloudMatchValue.asid"
        >
          纠正歌曲
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { setCloudMatch } from "@/api/user";
import { userStore } from "@/store";
import SmallSongData from "@/components/DataList/SmallSongData.vue";

const user = userStore();

// 歌曲信息纠正数据
const cloudDataLoad = inject("cloudDataLoad", null);
const smallSongDataRef = ref(null);
const cloudMatchModel = ref(false);
const cloudMatchBeforeData = ref(null);
const cloudMatchId = ref(null);
const cloudMatchValue = ref({
  uid: user.getUserData.userId,
  sid: null,
  asid: null,
});

// 歌曲纠正
const setCloudMatchBtn = (data) => {
  if (data.sid == data.asid) {
    $message.error("与原歌曲 ID 一致，无需纠正");
  } else {
    if (!smallSongDataRef.value) {
      $message.error("请先检查");
    } else if (smallSongDataRef.value.checkSongData()) {
      setCloudMatch(data.uid, data.sid, data.asid).then((res) => {
        console.log(res);
        if (res.data) {
          closeCloudMatch();
          $message.success("歌曲纠正成功");
          cloudDataLoad();
        } else {
          $message.error("歌曲纠正失败，请重试");
        }
      });
    } else {
      $message.error("非正常歌曲 ID，无法匹配");
    }
  }
};

// 开启歌曲纠正
const openCloudMatch = (data) => {
  cloudMatchValue.value.sid = data.id;
  cloudMatchBeforeData.value = data;
  cloudMatchModel.value = true;
};

// 关闭歌曲纠正
const closeCloudMatch = () => {
  cloudMatchBeforeData.value = null;
  cloudMatchId.value = null;
  cloudMatchValue.value.asid = null;
  cloudMatchModel.value = false;
};

// 暴露方法
defineExpose({
  openCloudMatch,
});
</script>

<style lang="scss" scoped>
.cloud-match {
  :deep(.n-input-number) {
    width: 100%;
  }
}
</style>
