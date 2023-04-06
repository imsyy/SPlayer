import { createRouter, createWebHistory } from "vue-router";
import routes from "./routes";
import { getLoginState } from "@/api/login";
import { userStore } from "@/store";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return {
        x: 0,
        y: 0,
      };
    }
  },
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const user = userStore();
  $loadingBar.start();
  // 判断是否需要登录
  if (to.meta.needLogin) {
    getLoginState()
      .then((res) => {
        if (res.data.profile && user.userLogin) {
          user.setUserData(res.data.profile);
          if (user.userLogin && !user.userData.level) user.setUserOtherData();
          next();
        } else {
          $message.error(localStorage.getItem("cookie") ? "登录过期，请重新登录" : "请登录账号后使用");
          user.userLogOut();
          next("/login");
        }
      })
      .catch((err) => {
        $message.error("请求发生错误");
        console.error("请求发生错误" + err);
        next("/500");
        return false;
      });
  } else {
    if (user.userLogin && !user.userData.level) user.setUserOtherData();
    next();
  }
});

router.afterEach(() => {
  $loadingBar.finish();
});

export default router;
