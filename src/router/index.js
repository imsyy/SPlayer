import {
  createRouter,
  createWebHistory
} from 'vue-router'
import routes from './routes'
import {
  getLoginState
} from "@/api";
import {
  userStore
} from "@/store/index";

const router = createRouter({
  history: createWebHistory(
    import.meta.env.BASE_URL),
  routes: routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return {
        x: 0,
        y: 0
      }
    }
  }
})


// 路由守卫
router.beforeEach((to, from, next) => {
  const user = userStore();
  $loadingBar.start();
  // 判断是否需要登录
  if (to.meta.needLogin) {
    getLoginState().then(res => {
      if (res.data.profile && user.userLogin) {
        if (user.userLogin && !user.userData.level) user.setUserOtherData();
        next();
      } else {
        $message.error("请登录账号后使用");
        user.userLogOut();
        next("/login");
      }
    }).catch(err => {
      $message.error("遇到错误" + err);
      return false;
    });
  } else {
    if (user.userLogin && !user.userData.level) user.setUserOtherData();
    next();
  }
})

router.afterEach(() => {
  $loadingBar.finish();
})

export default router