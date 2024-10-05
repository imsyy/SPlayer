import { useIntersectionObserver } from "@vueuse/core";
import { debounce, throttle } from "lodash-es";
import { DirectiveBinding } from "vue";

// 防抖指令
export const debounceDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    if (typeof binding.value !== "function") {
      console.warn("v-debounce directive expects a function as the value");
      return;
    }

    const delay = binding.arg ? parseInt(binding.arg) : 300;
    const debouncedFn = debounce(binding.value, delay, {
      leading: true,
      trailing: false,
    });

    el.addEventListener("click", debouncedFn);
    (el as any)._debouncedFn = debouncedFn;
  },
  beforeUnmount(el: HTMLElement) {
    if ((el as any)._debouncedFn) {
      el.removeEventListener("click", (el as any)._debouncedFn);
      delete (el as any)._debouncedFn;
    }
  },
};

// 节流指令
export const throttleDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    if (typeof binding.value !== "function") {
      console.warn("v-throttle directive expects a function as the value");
      return;
    }

    const delay = binding.arg ? parseInt(binding.arg) : 300;
    const throttledFn = throttle(binding.value, delay, {
      leading: true,
      trailing: false,
    });

    el.addEventListener("click", throttledFn);
    (el as any)._throttledFn = throttledFn;
  },
  beforeUnmount(el: HTMLElement) {
    if ((el as any)._throttledFn) {
      el.removeEventListener("click", (el as any)._throttledFn);
      delete (el as any)._throttledFn;
    }
  },
};

// 元素可见
export const visibleDirective = {
  mounted(el: HTMLElement, binding: any) {
    const { modifiers, value } = binding;

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const isVisible = entry.isIntersecting;
        el.classList.toggle("hidden", !isVisible);
        if (typeof value === "function") value(isVisible);
        if (modifiers.once && isVisible) stop();
      });
    };
    const { stop } = useIntersectionObserver(el, handleIntersection, { threshold: 0.1 });
  },
};
