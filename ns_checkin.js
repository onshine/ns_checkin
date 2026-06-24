/*
 * Loon 版 NodeSeek 签到脚本
 * 功能：签到 + 统计
 */

const NS_HEADER_KEY = "NS_NodeseekHeaders";

async function sign() {
    const raw = $persistentStore.read(NS_HEADER_KEY);
    if (!raw) {
        $notification.post("NS签到", "失败", "未找到 Cookie，请先抓包获取。");
        return;
    }

    const savedHeaders = JSON.parse(raw);
    savedHeaders["Content-Type"] = "application/json";

    // 签到请求
    $httpClient.post({
        url: "https://www.nodeseek.com/api/attendance",
        headers: savedHeaders
    }, (error, response, data) => {
        if (error) {
            $notification.post("NS签到", "请求异常", String(error));
        } else {
            const obj = JSON.parse(data);
            const msg = obj.message || data;
            $notification.post("NS签到结果", "状态: " + response.status, String(msg));
            
            // 签到后查询收益
            if (obj.success || msg.includes("已完成")) {
                getStats(savedHeaders);
            }
        }
    });
}

function getStats(headers) {
    $httpClient.get({
        url: "https://www.nodeseek.com/api/account/credit/page-1",
        headers: headers
    }, (error, response, data) => {
        if (!error) {
            try {
                const obj = JSON.parse(data);
                // 简单处理：提取最近一条记录
                const last = obj.data[0];
                $notification.post("NS收益统计", "最近记录", last[2] + ": " + last[0] + "个");
            } catch (e) {}
        }
    });
}

// 执行
sign();
