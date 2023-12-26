import { userDailySignin } from "@/api/user";
import { siteSettings } from "@/stores";
import { isLogin } from "@/utils/auth";

/**
 * 用户签到
 * https://github.com/Binaryify/NeteaseCloudMusicApi/issues/1387
 * 云贝签到本质上就是 Android 客户端每日签到
 */
const userSignIn = async () => {
  const settings = siteSettings();
  try {
    if (!isLogin()) return false;
    const today = new Date().toLocaleDateString();
    const lastSignInDate = sessionStorage.getItem("lastSignInDate");
    if (lastSignInDate !== today) {
      const result = await userDailySignin(1);
      console.log("签到结果：", result);
      sessionStorage.setItem("lastSignInDate", today);
      if (result.status === 400) {
        return console.log("重复签到");
      }
      $notification["success"]({
        content: "签到通知",
        meta: "🎉 每日签到成功",
        duration: 3000,
      });
    } else {
      console.log("今日已签到");
    }
  } catch (error) {
    if (error.request.status === 400) {
      console.log("重复签到");
      sessionStorage.setItem("lastSignInDate", new Date().toLocaleDateString());
      return false;
    }
    settings.autoSignIn = false;
    console.error("签到过程中发生错误：", error);
    $notification["error"]({
      content: "签到通知",
      meta: "签到过程中发生错误，已关闭自动签到，详细信息可查看控制台输出，请及时向开发者报告",
      duration: 8000,
    });
  }
};

export default userSignIn;
