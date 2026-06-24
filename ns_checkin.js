/**
 * NS论坛自动签到 (Loon 专用版)
 * 修复：更新签到接口地址为：https://www.nodeseek.com/api/attendance
 * 修复：完全替换 QX 专用 API，适配 Loon $persistentStore 和 $notification
 */

const NS_HEADER_KEY = "NS_NodeseekHeaders";
const isGetHeader = typeof $request !== "undefined";

// 需要抓取的 Header 列表
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
  // 1. 获取并保存 Header
  const picked = pickNeedHeaders($request.headers || {});
  if (!picked || Object.keys(picked).length === 0) {
    $notification.post("NS签到", "获取失败", "未获取到有效的请求头");
  } else {
    $persistentStore.write(JSON.stringify(picked), NS_HEADER_KEY);
    $notification.post("NS签到", "获取成功", "请求头已持久化，现在可以执行定时任务了");
  }
  $done({});
} else {
  // 2. 执行签到任务
  const raw = $persistentStore.read(NS_HEADER_KEY);
  if (!raw) {
    $notification.post("NS签到", "失败", "未找到 Cookie，请重新进入个人页面获取");
    $done();
    return;
  }

  const savedHeaders = JSON.parse(raw);
  
  // 【修复点】更换为正确的接口地址
  const url = "https://www.nodeseek.com/api/attendance";
  
  $httpClient.post({
    url: url,
    headers: savedHeaders,
    body: "" 
  }, (error, response, data) => {
    if (error) {
      $notification.post("NS签到", "请求异常", String(error));
    } else {
      try {
        const obj = JSON.parse(data);
        const title = response.status === 200 ? "签到成功" : "签到结果";
        const msg = obj?.message || data;
        $notification.post("NS签到", title, String(msg));
      } catch (e) {
        $notification.post("NS签到", "数据解析失败", String(data));
      }
    }
    $done();
  });
}
