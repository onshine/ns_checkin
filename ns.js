/**
 * V2.0 - 修复说明：
 * 1. 统一使用 Loon 官方 API ($persistentStore.read/write) 修复 TypeError 问题。
 * 2. 优化了网络请求的错误处理，明确捕捉 404 错误。
 * 3. 增强了日志输出，方便在 Loon 中排查接口是否失效。
 */

const NS_HEADER_KEY = "NS_NodeseekHeaders";
const isGetHeader = typeof $request !== "undefined";

// 保持不变的 Header 定义
const NEED_KEYS = [
  "Connection", "Accept-Encoding", "Priority", "Content-Type", "Origin",
  "refract-sign", "User-Agent", "refract-key", "Sec-Fetch-Mode",
  "Cookie", "Host", "Referer", "Accept-Language", "Accept"
];

function pickNeedHeaders(src = {}) {
  const dst = {};
  const get = (name) => src[name] ?? src[name.toLowerCase()] ?? src[name.toUpperCase()];
  for (const k of NEED_KEYS) {
    const v = get(k);
    if (v !== undefined) dst[k] = v;
  }
  return dst;
}

if (isGetHeader) {
  const picked = pickNeedHeaders($request.headers || {});
  if (!picked || Object.keys(picked).length === 0) {
    $notification.post("NS Headers 获取失败", "", "未获取到指定请求头。");
  } else {
    if ($persistentStore.write(JSON.stringify(picked), NS_HEADER_KEY)) {
      $notification.post("NS Headers 获取成功", "V2.0", "已保存请求头。");
    } else {
      $notification.post("NS Headers 保存失败", "", "写入数据失败。");
    }
  }
  $done({});
} else {
  const raw = $persistentStore.read(NS_HEADER_KEY);
  if (!raw) {
    $notification.post("NS签到失败", "V2.0", "本地没有已保存的请求头，请先抓包访问个人页面。");
    $done();
    return;
  }

  let savedHeaders = {};
  try {
    savedHeaders = JSON.parse(raw);
  } catch (e) {
    $notification.post("NS签到错误", "V2.0", "数据解析失败。");
    $done();
    return;
  }

  // 发送请求
  $httpClient.post({
    url: "https://www.nodeseek.com/api/attendance?random=true",
    headers: savedHeaders,
    body: ""
  }, (error, response, data) => {
    if (error) {
      $notification.post("NS签到请求失败", "V2.0", String(error));
    } else {
      const status = response.status;
      if (status === 404) {
        $notification.post("NS签到结果", "404 错误", "接口地址已失效，请更新脚本。");
      } else {
        try {
          const obj = JSON.parse(data);
          const msg = obj?.message || data;
          $notification.post("NS签到结果", `状态码: ${status}`, String(msg));
        } catch (e) {
          $notification.post("NS签到结果", `状态码: ${status}`, String(data));
        }
      }
    }
    $done();
  });
}
