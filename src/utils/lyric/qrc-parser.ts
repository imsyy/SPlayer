/**
 * QRC 解析
 */

// 定义函数签名类型
type QRCParserFn = (xmlStr: string) => string;

// 实现 DOM 策略
const domParser: QRCParserFn = (xmlStr) => {
  if (!xmlStr || !xmlStr.trim()) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, "text/xml");
    
    // 检查解析错误
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      console.warn("[QRC Parser] XML Parsing Error:", parseError.textContent);
      return "";
    }

    return doc.documentElement.getAttribute("LyricContent") || "";
  } catch (e) {
    console.error("[QRC Parser] Fatal Error:", e);
    return "";
  }
};

// 实现正则策略
const regexParser: QRCParserFn = (xmlStr) => {
  if (!xmlStr) return "";
  const match = /LyricContent\s*=\s*"([^"]*)"/.exec(xmlStr);
  // 如果没有匹配到 XML 结构，假设输入本身就是内容 (保持原有逻辑的兼容性)
  return match?.[1] || xmlStr;
};

// 避免每次调用时的运行时检查
export const extractLyricContent: QRCParserFn = 
  (typeof DOMParser !== "undefined") 
    ? domParser 
    : regexParser;
