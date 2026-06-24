// NS论坛签到 (Loon 适配版)
const NS_HEADER_KEY = "NS_NodeseekHeaders";
const isGetHeader = typeof $request !== "undefined";

const NEED_KEYS = [
  "Connection",
  "Accept-Encoding",
  "Priority",
  "Content-Type",
  "Origin",
  "refract-sign",
  "User-Agent",
  "refract-key",
  "Sec-Fetch-Mode",
  "Cookie",
  "Host",
  "Referer",
  "Accept-Language",
  "Accept",
];

function pickNeedHeaders(src = {}) {
  const dst = {};
  const get = (name) =>
    src[name] ??
    src[name.toLowerCase()] ??
    src[name.toUpperCase()];
  for (const k of NEED_KEYS) {
    const v = get(k);
    if (v !== undefined) dst[k] = v;
  }
  return dst;
}

if (isGetHeader) {
  const allHeaders = $request.headers || {};
  const picked = pickNeedHeaders(allHeaders);

  if (!picked || Object.keys(picked).length === 0) {
    console.log("[NS] picked headers empty:", JSON.stringify(allHeaders));
    $notification.post("NS Headers 获取失败", "", "未获取到指定请求头，请重新再试一次。");
    $done({});
  } else {
    // Loon 使用 $persistentStore.write
    const ok = $persistentStore.write(JSON.stringify(picked), NS_HEADER_KEY);
    console.log("[NS] saved picked headers:", JSON.stringify(picked));
    if (ok) {
      $notification.post("NS Headers 获取成功", "", "指定请求头已持久化保存。");
    } else {
      $notification.post("NS Headers 保存失败", "", "写入持久化存储失败，请检查配置。");
    }
    $done({});
  }
} else {
  // 读取已保存指定 headers
  const raw = $persistentStore.load(NS_HEADER_KEY);
  if (!raw) {
    $notification.post("NS签到结果", "无法签到", "本地没有已保存的请求头，请先抓包访问一次 个人页面。");
    $done();
  }

  let savedHeaders = {};
  try {
    savedHeaders = JSON.parse(raw) || {};
  } catch (e) {
    $notification.post("NS签到结果", "无法签到", "本地保存的请求头数据损坏。");
    $done();
  }

  const myRequest = {
    url: `https://www.nodeseek.com/api/attendance?random=true`,
    method: "POST",
    headers: savedHeaders,
    body: ""
  };

  // Loon 使用 $httpClient.post
  $httpClient.post(myRequest, (error, response, data) => {
    if (error) {
      $notification.post("NS签到结果", "请求错误", error);
      $done();
      return;
    }

    const status = response.status;
    let msg = "";
    try {
      const obj = JSON.parse(data);
      msg = obj?.message ? String(obj.message) : "";
    } catch (e) {}

    if (status === 403) {
      $notification.post("NS签到结果", "403 风控", msg || data);
    } else if (status === 500) {
      $notification.post("NS签到结果", "500 服务器错误", msg || data);
    } else if (status >= 200 && status < 300) {
      $notification.post("NS签到结果", "签到成功", msg || "成功");
    } else {
      $notification.post("NS签到结果", `请求异常 ${status}`, msg || data);
    }
    $done();
  });
}
