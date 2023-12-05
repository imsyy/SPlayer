// 表单规则
const formRules = () => {
  return {
    // 普通验证
    textRule: {
      required: true,
      message: "请填写必要信息",
      trigger: "blur",
    },
    // 数字验证
    numberRule: {
      type: "number",
      required: true,
      message: "请填写必要信息",
      trigger: "blur",
    },
    // 邮箱验证
    emailRule: {
      required: true,
      validator(_, value) {
        if (!value) {
          return new Error("请输入电子邮箱");
        } else if (
          !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
            value,
          )
        ) {
          return new Error("请输入正确的电子邮箱");
        }
        return true;
      },
      trigger: ["input", "blur"],
    },
    // 手机号验证
    mobileRule: {
      key: "phone",
      required: true,
      validator(_, value) {
        if (!value) {
          return new Error("请输入手机号码");
        } else if (!/^(?:(?:\+|00)86)?1[3-9]\d{9}$/.test(value)) {
          return new Error("请输入正确的手机号码");
        }
        return true;
      },
      trigger: ["input", "blur"],
    },
  };
};

export { formRules };
