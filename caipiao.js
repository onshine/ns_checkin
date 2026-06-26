/*
 * 【彩票查询】完整优化版 v1.3.1
 * 修复内容：
 * 1. 补全了所有请求头伪装（HEADERS），通过伪装浏览器指纹来降低被 WAF 拦截的概率。
 * 2. 实现了 100% 完整代码，包含所有类库框架。
 * 3. 保留详细的错误日志打印，方便排查。
 */

const $ = new API("ssq", true);

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Referer": "https://www.cwl.gov.cn/",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Connection": "keep-alive"
};

!(async () => {
    $.log("=== 脚本开始运行 [v1.3.1] ===");
    try {
        await checkssq();
        await checkdlt();
        await check3d();
        await checkqlc();
    } catch (e) {
        $.log("【全局运行错误】: " + e.message);
    }
})().finally(() => $.done());

async function checkssq() {
    try {
        const url = `http://www.cwl.gov.cn/cwl_admin/kjxx/findDrawNotice?name=ssq&issueCount=5`;
        const resp = await $.http.get({ url, headers: HEADERS });
        if (resp.body.includes("<html") || resp.body.includes("<script")) throw new Error("接口返回了HTML安全页，被拦截");
        const data = JSON.parse(resp.body).result[0];
        $.notify("彩票查询", "双色球", `红球：${data.red}\n蓝球：${data.blue}`);
    } catch (e) { $.log("【双色球错误】: " + e.message); }
}

async function checkdlt() {
    try {
        const url = `https://webapi.sporttery.cn/gateway/lottery/getDigitalDrawInfoV1.qry?param=85,0`;
        const resp = await $.http.get({ url, headers: HEADERS });
        if (resp.body.includes("<html") || resp.body.includes("<script")) throw new Error("接口返回了HTML安全页，被拦截");
        const data = JSON.parse(resp.body).value.dlt;
        $.notify("彩票查询", "大乐透", `结果：${data.lotteryDrawResult}`);
    } catch (e) { $.log("【大乐透错误】: " + e.message); }
}

async function check3d() {
    try {
        const url = `http://www.cwl.gov.cn/cwl_admin/kjxx/findDrawNotice?name=3d&issueCount=1`;
        const resp = await $.http.get({ url, headers: HEADERS });
        if (resp.body.includes("<html") || resp.body.includes("<script")) throw new Error("接口返回了HTML安全页，被拦截");
        const data = JSON.parse(resp.body).result[0];
        $.notify("彩票查询", "福彩3D", `结果：${data.red}`);
    } catch (e) { $.log("【福彩3D错误】: " + e.message); }
}

async function checkqlc() {
    try {
        const url = `http://www.cwl.gov.cn/cwl_admin/kjxx/findDrawNotice?name=qlc&issueCount=1`;
        const resp = await $.http.get({ url, headers: HEADERS });
        if (resp.body.includes("<html") || resp.body.includes("<script")) throw new Error("接口返回了HTML安全页，被拦截");
        const data = JSON.parse(resp.body).result[0];
        $.notify("彩票查询", "七乐彩", `红球：${data.red}`);
    } catch (e) { $.log("【七乐彩错误】: " + e.message); }
}

// ------------------------------
// 类库基础框架
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
                        $task.fetch(options).then(res);
                    } else if (typeof $httpClient !== 'undefined') {
                        $httpClient.get(options, (e, r, b) => res({statusCode: r.status, body: b}));
                    }
                })
            };
        }
    })(name);
}
