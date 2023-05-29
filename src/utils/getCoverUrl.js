/**
 * 获取图片的 url
 * @param {string} url - 必选参数，输入的原始图片url
 * @param {number} size - 可选参数，需要生成的图片尺寸，默认为null
 * @return {string} 返回根据 url 和 size 参数生成的图片url
 */
const getCoverUrl = (url, size = null) => {
  if (!url) return "/images/pic/default.png";
  const sizeUrl = size ? `?param=${size}y${size}` : "";
  const imageUrl = url.replace(/^http:/, "https:");
  if (imageUrl.endsWith(".jpg")) {
    return imageUrl + sizeUrl;
  }
  return imageUrl;
};

export default getCoverUrl;
