/**
 * NS论坛自动签到 (V3.0 - 增强版)
 * 修复：增强响应解析能力，兼容非 JSON 返回值
 * 优化：使用 $httpClient.post 的标准回调处理
 */

const NS_HEADER_KEY = "NS_NodeseekHeaders";
const isGetHeader = typeof $request !== "undefined";

if (isGetHeader) {
  // 获取并保存 Headers
  const picked = $request.headers;
  if (picked) {
    $persistentStore.write(JSON.stringify(picked), NS_HEADER_KEY);
    $notification.post("NS签到", "成功", "Headers 已更新，可以进行签到了。");
  }
  $done({});
} else {
  const raw = $persistentStore.read(NS_HEADER_KEY);
  if (!raw) {
    $notification.post("NS签到", "失败", "未找到 Cookie，请重新访问个人页面。");
    $done();
    return;
  }

  const savedHeaders = JSON.parse(raw);
  
  // 核心：NodeSeek 现在对接口有严格校验，Header 必须完整
  const options = {
    url: "https://www.nodeseek.com/api/attendance",
    headers: savedHeaders,
    body: "" // 签到接口通常不需要 body，但需要正确的 Header 签名
  };

  $httpClient.post(options, (error, response, data) => {
    if (error) {
      $notification.post("NS签到", "请求异常", String(error));
    } else {
      // 核心修复：更健壮的 JSON 解析逻辑
      let result = "无返回内容";
      try {
        if (data) {
          const obj = JSON.parse(data);
          result = obj.message || JSON.stringify(obj);
        }
      } catch (e) {
        // 如果无法解析为 JSON，打印原始数据以便排查
        result = data.substring(0, 50); // 截取前50字符防止日志过长
        console.log("NS服务器原始响应: " + data);
      }
      
      $notification.post(
        `NS签到结果 (${response.status})`, 
        "", 
        String(result)
      );
    }
    $done();
  });
}
