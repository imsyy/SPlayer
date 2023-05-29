import { createRouter, createWebHistory } from "vue-router";
import routes from "./routes";
import { getLoginState } from "@/api/login";
import { userStore } from "@/store";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const user = userStore();
  if (typeof $loadingBar !== "undefined") $loadingBar.start();
  // 判断是否需要登录
  if (to.meta.needLogin) {
    getLoginState()
      .then((res) => {
        if (res.data?.profile && user.userLogin) {
          user.setUserData(res.data.profile);
          if (!Object.keys(user.getUserOtherData).length) {
            user.setUserOtherData();
          }
          next();
        } else {
          $message.error(
            localStorage.getItem("cookie")
              ? "登录过期，请重新登录"
              : "请登录账号后使用"
          );
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
    if (!Object.keys(user.getUserOtherData).length) user.setUserOtherData();
    next();
  }
});

router.afterEach(() => {
  if (typeof $loadingBar !== "undefined") $loadingBar.finish();
});

export default router;
