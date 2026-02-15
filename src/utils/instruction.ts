import { useIntersectionObserver } from "@vueuse/core";
import { debounce, throttle } from "lodash-es";
import { DirectiveBinding } from "vue";

interface HTMLElementWithDebounce extends HTMLElement {
  _debouncedFn?: EventListener;
}

// 防抖指令
export const debounceDirective = {
  mounted(el: HTMLElementWithDebounce, binding: DirectiveBinding) {
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
    el._debouncedFn = debouncedFn;
  },
  beforeUnmount(el: HTMLElementWithDebounce) {
    if (el._debouncedFn) {
      el.removeEventListener("click", el._debouncedFn);
      delete el._debouncedFn;
    }
  },
};

interface HTMLElementWithThrottle extends HTMLElement {
  _throttledFn?: EventListener;
}

// 节流指令
export const throttleDirective = {
  mounted(el: HTMLElementWithThrottle, binding: DirectiveBinding) {
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
    el._throttledFn = throttledFn;
  },
  beforeUnmount(el: HTMLElementWithThrottle) {
    if (el._throttledFn) {
      el.removeEventListener("click", el._throttledFn);
      delete el._throttledFn;
    }
  },
};

// 元素可见
export const visibleDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
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
