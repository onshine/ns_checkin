/**
 * V6.0 - 针对 HTTPClient 请求异常修复
 * 修复：增加显式的 method 定义，优化请求体格式
 * 修复：解决 Loon 在某些节点环境下 HttpClient 报错问题
 */

const NS_HEADER_KEY = "NS_NodeseekHeaders";

function startSign() {
  const raw = $persistentStore.read(NS_HEADER_KEY);
  if (!raw) {
    $notification.post("NS签到 [V6.0]", "失败", "本地未抓取到 Cookie。");
    return;
  }

  const savedHeaders = JSON.parse(raw);
  
  // 确保 Headers 格式正确
  savedHeaders["Content-Type"] = "application/json";
  savedHeaders["Accept"] = "application/json, text/plain, */*";

  const options = {
    url: "https://www.nodeseek.com/api/attendance",
    method: "POST", // 强制指定为 POST
    headers: savedHeaders,
    body: JSON.stringify({}), // 部分接口要求 body 必须是一个空的 JSON 对象
    timeout: 5000
  };

  $httpClient.post(options, (error, response, data) => {
    if (error) {
      console.log("NS签到错误对象: " + JSON.stringify(error));
      $notification.post("NS签到 [V6.0]", "HTTPClient 异常", "请检查网络或代理节点配置。");
      return;
    }

    console.log("NS服务器响应状态: " + response.status);
    console.log("NS服务器完整响应: " + data);

    try {
      const obj = JSON.parse(data);
      $notification.post(`NS签到 (${response.status})`, "", String(obj.message || "执行完成"));
    } catch (e) {
      $notification.post(`NS签到 (${response.status})`, "解析错误", "返回内容不是 JSON，请查看日志。");
    }
  });
}

// 立即执行
startSign();
