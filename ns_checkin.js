/**
 * V5.0 - 参考社区稳定版逻辑
 * 修复：强化请求头结构，增加超时处理，确保网络请求完整性。
 * 功能：增加了 Referer 自动补全，防止服务器拒绝非法请求。
 */

const NS_HEADER_KEY = "NS_NodeseekHeaders";
const isGetHeader = typeof $request !== "undefined";

if (isGetHeader) {
  // 严格记录请求头
  const picked = $request.headers;
  if (picked && picked.Cookie) {
    $persistentStore.write(JSON.stringify(picked), NS_HEADER_KEY);
    $notification.post("NS签到 [V5.0]", "Header 缓存成功", "请保持配置开启。");
  }
  $done({});
} else {
  const raw = $persistentStore.read(NS_HEADER_KEY);
  if (!raw) {
    $notification.post("NS签到 [V5.0]", "失败", "本地数据为空，请先触发抓包。");
    $done();
    return;
  }

  const savedHeaders = JSON.parse(raw);
  
  // 核心：强制构造完整的 Referer，这往往是“网络错误”或 403 的根源
  savedHeaders["Referer"] = "https://www.nodeseek.com/";
  savedHeaders["Origin"] = "https://www.nodeseek.com";
  savedHeaders["User-Agent"] = savedHeaders["User-Agent"] || "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

  const options = {
    url: "https://www.nodeseek.com/api/attendance",
    headers: savedHeaders,
    timeout: 10000, // 增加超时设置，防止网络连接不稳定导致报错
    body: ""
  };

  $httpClient.post(options, (error, response, data) => {
    if (error) {
      console.log("NS签到网络错误详情: " + JSON.stringify(error));
      $notification.post("NS签到 [V5.0]", "网络错误", "请检查网络环境或节点连通性。");
    } else {
      console.log("NS服务器响应状态: " + response.status);
      console.log("NS服务器响应体: " + data);
      
      try {
        const obj = JSON.parse(data);
        $notification.post(`NS签到反馈 (${response.status})`, "", String(obj.message || "未知响应"));
      } catch (e) {
        $notification.post("NS签到 [V5.0]", "解析错误", "服务器返回数据格式异常。");
      }
    }
    $done();
  });
}
