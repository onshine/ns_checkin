/**
 * V4.0 - 修复说明：
 * 1. 强制将请求方法锁定为 POST (解决 Cannot GET 错误)。
 * 2. 优化了 $httpClient.post 的参数结构。
 * 3. 增加了对请求头的校验提示，确保脚本不因无效 Header 报错。
 */

const NS_HEADER_KEY = "NS_NodeseekHeaders";
const isGetHeader = typeof $request !== "undefined";

if (isGetHeader) {
  const picked = $request.headers;
  // 仅在获取到 Cookie 时才覆盖存储
  if (picked && picked.Cookie) {
    $persistentStore.write(JSON.stringify(picked), NS_HEADER_KEY);
    $notification.post("NS签到 [V4.0]", "获取成功", "请求头已保存，请保持抓包状态刷新一次页面以确保 Header 有效。");
  } else {
    $notification.post("NS签到 [V4.0]", "获取失败", "未检测到有效的 Cookie。");
  }
  $done({});
} else {
  const raw = $persistentStore.read(NS_HEADER_KEY);
  if (!raw) {
    $notification.post("NS签到 [V4.0]", "失败", "本地数据为空，请先访问个人信息页触发获取。");
    $done();
    return;
  }

  const savedHeaders = JSON.parse(raw);
  
  // 必须是 POST 请求
  const options = {
    url: "https://www.nodeseek.com/api/attendance",
    headers: savedHeaders,
    body: "" // 签到接口目前不需要发送 JSON body
  };

  $httpClient.post(options, (error, response, data) => {
    if (error) {
      $notification.post("NS签到 [V4.0]", "网络错误", String(error));
    } else {
      console.log("NS服务器响应状态: " + response.status);
      console.log("NS服务器完整响应: " + data); // 持续保留原始响应以便调试
      
      try {
        const obj = JSON.parse(data);
        const title = response.status === 200 ? "签到反馈" : "签到异常";
        const msg = obj.message || JSON.stringify(obj);
        $notification.post(`NS签到 [V4.0] (${response.status})`, "", String(msg));
      } catch (e) {
        $notification.post(`NS签到 [V4.0] (${response.status})`, "数据解析失败", "服务器返回了非 JSON 内容，请检查日志。");
      }
    }
    $done();
  });
}
