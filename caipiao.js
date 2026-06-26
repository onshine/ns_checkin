/*
 * 【彩票查询】完整修复版 v1.6
 * 修复内容：
 * 1. 修复了 HTTP 回调响应为空（null）导致的脚本崩溃。
 * 2. 完善了网络异常的日志打印。
 */

const $ = new API("ssq", true);

!(async () => {
    $.log("=== 脚本开始运行 [v1.6] ===");
    try {
        await checkData();
    } catch (e) {
        $.log("【全局运行错误】: " + e.message);
    }
    $.log("=== 脚本执行结束 ===");
})().finally(() => $.done());

async function checkData() {
    try {
        // 使用一个通用的聚合接口
        const url = `https://api.667.ee/lotto/latest`; 
        const resp = await $.http.get({ url });
        
        // 增加响应数据检查
        if (!resp || !resp.body) {
            throw new Error("接口返回响应为空或网络连接超时");
        }
        
        const json = JSON.parse(resp.body);
        if (json.code !== 200) {
            throw new Error("数据源获取失败: " + (json.msg || "未知错误"));
        }

        const { ssq, dlt } = json.data;
        $.notify("彩票查询", "双色球", `开奖号码: ${ssq.nums}\n奖池: ${ssq.pool}万`);
        $.notify("彩票查询", "大乐透", `开奖号码: ${dlt.nums}\n奖池: ${dlt.pool}万`);
        
    } catch (e) { 
        $.log("【数据查询错误】: " + e.message); 
    }
}

// ------------------------------
// 类库基础框架 (v1.6)
// ------------------------------
function API(name, debug) {
    return new (class {
        constructor(name) { this.name = name; }
        log(msg) { console.log(`[${this.name}] ${msg}`); }
        notify(t, s, c) { (typeof $notify !== 'undefined') ? $notify(t, s, c) : console.log(`${t} ${s} ${c}`); }
        done() { (typeof $done !== 'undefined') ? $done() : null; }
        get http() {
            return {
                get: (options) => new Promise((res) => {
                    if (typeof $task !== 'undefined') {
                        $task.fetch(options).then(res).catch(e => {
                            console.log(`[HTTP错误] ${e}`);
                            res({statusCode: 500, body: null});
                        });
                    } else if (typeof $httpClient !== 'undefined') {
                        $httpClient.get(options, (e, r, b) => {
                            if (e) {
                                console.log(`[HTTP错误] ${e}`);
                                res({statusCode: 500, body: null});
                            } else {
                                res({statusCode: r.status, body: b});
                            }
                        });
                    }
                })
            };
        }
    })(name);
}
