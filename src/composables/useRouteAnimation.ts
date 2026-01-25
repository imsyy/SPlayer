import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useSettingStore } from "@/stores";

export function useRouteAnimation() {
  const settingStore = useSettingStore();
  const route = useRoute();
  const currentAnimation = ref<string>(
    settingStore.routeAnimation === "random" ? "fade" : settingStore.routeAnimation
  );

  const animations = ["fade", "zoom", "slide", "up"];

  const randomize = () => {
    if (settingStore.routeAnimation === "random") {
      currentAnimation.value = animations[Math.floor(Math.random() * animations.length)];
    } else {
      currentAnimation.value = settingStore.routeAnimation;
    }
  };

  watch(
    () => route.fullPath,
    () => {
      randomize();
    }
  );

  watch(
    () => settingStore.routeAnimation,
    () => {
      randomize();
    }
  );

  // Init
  randomize();

  return currentAnimation;
}
