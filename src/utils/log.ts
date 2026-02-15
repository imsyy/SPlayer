import packageJson from "@/../package.json";

/**
 * 美化打印实现方法
 * https://juejin.cn/post/7371716384847364147
 */

/**
 * 判断是否为空
 * @param value 值
 * @returns boolean
 */
export const isEmpty = (value: any) => {
  return value == null || value === undefined || value === "";
};

/**
 * 美化打印
 * @param title 标题
 * @param text 内容
 * @param color 颜色
 */
export const prettyPrint = (title: string, text: string, color: string) => {
  console.info(
    `%c ${title} %c ${text} %c`,
    `background:${color};border:1px solid ${color}; padding: 1px; border-radius: 2px 0 0 2px; color: #fff;`,
    `border:1px solid ${color}; padding: 1px; border-radius: 0 2px 2px 0; color: ${color};`,
    "background:transparent",
  );
};

/**
 * 信息打印
 * @param textOrTitle 文本或标题
 * @param content 内容
 */
export const info = (textOrTitle: string, content = "") => {
  const title = isEmpty(content) ? "Info" : textOrTitle;
  const text = isEmpty(content) ? textOrTitle : content;
  prettyPrint(title, text, "#909399");
};

/**
 * 错误打印
 * @param textOrTitle 文本或标题
 * @param content 内容
 */
export const error = (textOrTitle: string, content = "") => {
  const title = isEmpty(content) ? "Error" : textOrTitle;
  const text = isEmpty(content) ? textOrTitle : content;
  prettyPrint(title, text, "#F56C6C");
};

/**
 * 警告打印
 * @param textOrTitle 文本或标题
 * @param content 内容
 */
export const warning = (textOrTitle: string, content = "") => {
  const title = isEmpty(content) ? "Warning" : textOrTitle;
  const text = isEmpty(content) ? textOrTitle : content;
  prettyPrint(title, text, "#E6A23C");
};

/**
 * 成功打印
 * @param textOrTitle 文本或标题
 * @param content 内容
 */
export const success = (textOrTitle: string, content = "") => {
  const title = isEmpty(content) ? "Success " : textOrTitle;
  const text = isEmpty(content) ? textOrTitle : content;
  prettyPrint(title, text, "#67C23A");
};

/**
 * 图片打印
 * @param url 图片地址
 * @param scale 缩放比例
 */
export const picture = (url: string, scale = 1) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (ctx) {
      c.width = img.width;
      c.height = img.height;
      ctx.fillStyle = "red";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      const dataUri = c.toDataURL("image/png");

      console.info(
        `%c sup?`,
        `font-size: 1px;
          padding: ${Math.floor((img.height * scale) / 2)}px ${Math.floor((img.width * scale) / 2)}px;background-image: url(${dataUri});
          background-repeat: no-repeat;
          background-size: ${img.width * scale}px ${img.height * scale}px;
          color: transparent;`,
      );
    }
  };
  img.src = url;
};

// 版本输出
export const printVersion = async () => {
  success(`🚀 ${packageJson.version}`, packageJson.productName);
  info(`👤 ${packageJson.author}`, packageJson.github);
};
