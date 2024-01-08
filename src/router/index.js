import { nextTick } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import { checkPlatform } from "@/utils/helper";
import { isLogin } from "@/utils/auth";
import routes from "@/router/routes";

// 基础配置
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

// 页面回顶
const scrollToTop = () => {
  nextTick().then(() => {
    const mainLayout = document.getElementById("main-layout");
    mainLayout?.scrollIntoView({ behavior: "smooth" });
  });
};

// 路由守卫
router.beforeEach((to, from, next) => {
  // 开始进度条
  if (to.path !== from.path) {
    if (typeof $loadingBar !== "undefined" && !checkPlatform.electron()) {
      $loadingBar.start();
    }
  }
  // 判断是否需要登录
  if (to.meta.needLogin) {
    if (isLogin()) {
      next();
    } else {
      $message.warning("请登录后使用");
      if (typeof $loadingBar !== "undefined" && !checkPlatform.electron()) {
        $loadingBar.error();
      }
      if (typeof $changeLogin !== "undefined") $changeLogin();
    }
  }
  // 是否为本地功能
  else if (to.meta.needLocal) {
    if (checkPlatform.electron()) {
      next();
    } else {
      $message.error("客户端独占功能");
      if (typeof $loadingBar !== "undefined" && !checkPlatform.electron()) {
        $loadingBar.error();
      }
      next("/403");
    }
  } else {
    next();
  }
});

router.afterEach(() => {
  // 结束进度条
  if (typeof $loadingBar !== "undefined" && !checkPlatform.electron()) $loadingBar.finish();
  // 页面回顶
  scrollToTop();
});

export default router;
