<template>
  <n-modal
    class="s-modal"
    v-model:show="cloudMatchModal"
    preset="card"
    :title="$t('menu.match')"
    :bordered="false"
    :on-after-leave="closeCloudMatch"
  >
    <n-form class="cloud-match" :label-width="80" :model="cloudMatchValue">
      <n-form-item :label="$t('other.sData')">
        <n-card content-style="padding: 16px" :bordered="false" embedded>
          <SmallSongData :songData="cloudMatchBeforeData" notJump />
        </n-card>
      </n-form-item>
      <n-form-item :label="$t('other.asId')" path="asid">
        <n-input-number
          v-model:value="cloudMatchValue.asid"
          :placeholder="$t('other.asIdDes')"
          :show-button="false"
        />
        <n-popover trigger="hover" :keep-alive-on-hover="false">
          <template #trigger>
            <n-button
              style="margin-left: 12px"
              @click="toSearch(cloudMatchBeforeData.name)"
            >
              <template #icon>
                <n-icon :component="Search" />
              </template>
            </n-button>
          </template>
          {{ $t("menu.search") }}
        </n-popover>
        <n-button
          style="margin-left: 12px"
          :disabled="!cloudMatchValue.asid"
          @click="cloudMatchId = cloudMatchValue.asid.toString()"
        >
          {{ $t("general.dialog.check") }}
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
        <n-button @click="closeCloudMatch">
          {{ $t("general.dialog.cancel") }}
        </n-button>
        <n-button
          type="primary"
          @click="setCloudMatchBtn(cloudMatchValue)"
          :disabled="!cloudMatchValue.asid"
        >
          {{ $t("general.dialog.match") }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { setCloudMatch } from "@/api/user";
import { userStore } from "@/store";
import { useI18n } from "vue-i18n";
import { Search } from "@icon-park/vue-next";
import SmallSongData from "@/components/DataList/SmallSongData.vue";

const { t } = useI18n();
const user = userStore();

// 歌曲信息纠正数据
const cloudDataLoad = inject("cloudDataLoad", null);
const smallSongDataRef = ref(null);
const cloudMatchModal = ref(false);
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
    $message.error(t("other.noNeedMatch"));
  } else {
    if (!smallSongDataRef.value) {
      $message.error(t("other.plaseCheck"));
    } else if (smallSongDataRef.value.checkSongData()) {
      setCloudMatch(data.uid, data.sid, data.asid).then((res) => {
        console.log(res);
        if (res.data) {
          closeCloudMatch();
          $message.success(t("other.matchSuccess"));
          cloudDataLoad();
        } else {
          $message.error(t("other.matchFailed"));
        }
      });
    } else {
      $message.error(t("other.matchError"));
    }
  }
};

// 同名搜索
const toSearch = (name) => {
  window.open(`/search/songs?keywords=${name}&page=1`);
};

// 开启歌曲纠正
const openCloudMatch = (data) => {
  cloudMatchValue.value.sid = data.id;
  cloudMatchBeforeData.value = data;
  cloudMatchModal.value = true;
};

// 关闭歌曲纠正
const closeCloudMatch = () => {
  cloudMatchBeforeData.value = null;
  cloudMatchId.value = null;
  cloudMatchValue.value.asid = null;
  cloudMatchModal.value = false;
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
