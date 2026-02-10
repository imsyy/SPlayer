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
    // 检查解析错误（如未转义的 & 等）
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      // DOM 解析失败，回退到正则解析
      return regexParser(xmlStr);
    }

    return doc.documentElement.getAttribute("LyricContent") || "";
  } catch (e) {
    console.error("[QRC Parser] Fatal Error:", e);
    // 回退到正则解析
    return regexParser(xmlStr);
  }
};

const decodeXml = (str: string) => {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
};

// 实现正则策略
const regexParser: QRCParserFn = (xmlStr) => {
  if (!xmlStr) return "";

  // 尝试贪婪匹配 (处理 LyricContent="... "..." ..." 这种非标准 XML 引号未转义的情况)
  // 匹配从 LyricContent=" 开始，直到标签结束前的最后一个引号
  const greedyMatch = /LyricContent\s*=\s*"([\s\S]*)"\s*\/?>/.exec(xmlStr);
  if (greedyMatch) {
    const content = greedyMatch[1];
    // 启发式检查：如果提取的内容中包含类似 ` Attribute="` 的结构，说明贪婪匹配吃掉了其他属性
    // 这种情况下回退到非贪婪匹配
    if (!/\s+\w+\s*=\s*"/.test(content)) {
      return decodeXml(content);
    }
  }

  // 标准非贪婪匹配 (兼容标准 XML 属性)
  const match = /LyricContent\s*=\s*"([^"]*)"/.exec(xmlStr);

  // 如果没有匹配到 XML 结构，假设输入本身就是内容 (保持原有逻辑的兼容性)
  const result = match?.[1] || xmlStr;
  return decodeXml(result);
};

// 避免每次调用时的运行时检查
export const extractLyricContent: QRCParserFn =
  typeof DOMParser !== "undefined" ? domParser : regexParser;
