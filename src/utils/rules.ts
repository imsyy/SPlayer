import type { FormItemRule } from "naive-ui";

// 普通文本
export const textRule: FormItemRule = {
  required: true,
  message: "请填写必要信息",
  trigger: ["blur"],
};

// 数字验证
export const numberRule: FormItemRule = {
  required: true,
  type: "number",
  message: "请输入数字",
  trigger: ["input", "blur"],
};

// 邮箱验证
export const emailRule: FormItemRule = {
  required: true,
  message: "请输入正确的邮箱",
  trigger: ["input", "blur"],
  validator: (_: FormItemRule, value: any) => {
    if (!value) return new Error("请输入电子邮箱");
    else if (
      !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        value,
      )
    ) {
      return new Error("请输入正确的电子邮箱");
    }
    return true;
  },
};

// 手机号验证
export const phoneRule: FormItemRule = {
  required: true,
  type: "number",
  message: "请输入正确的手机号",
  trigger: ["input", "blur"],
  validator: (_: FormItemRule, value: any) => {
    if (!value) return new Error("请输入手机号");
    else if (
      !/^1(3\d|4[5-9]|5[0-35-9]|6[567]|7[0-8]|8\d|9[0-35-9])\d{8}$/.test(value)
    ) {
      return new Error("请输入正确的手机号");
    }
    return true;
  },
}
