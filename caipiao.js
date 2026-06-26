/*
 * 【彩票查询】完整修复版 v1.2
 * 修复内容：
 * 1. 补全了 checkdlt, check3d, checkqlc 函数定义。
 * 2. 隔离错误：单个接口报错不会导致整段脚本退出。
 */

const $ = new API("ssq", true);

!(async () => {
    $.log("=== 脚本开始运行 [v1.2] ===");
    try {
        const ssq = $.read("ssq") || true;
        const dlt = $.read("dlt") || true;
        const fc3d = $.read("3d") || true;
        const qlc = $.read("qlc") || true;
        
        if (ssq == true || ssq == "true") await checkssq();
        if (dlt == true || dlt == "true") await checkdlt();
        if (fc3d == true || fc3d == "true") await check3d();
        if (qlc == true || qlc == "true") await checkqlc();
        
    } catch (e) {
        $.log("【全局运行时错误】: " + e.message);
    }
})().finally(() => $.done());

async function checkssq() {
    try {
        const resp = await $.http.get({ url: `http://www.cwl.gov.cn/cwl_admin/kjxx/findDrawNotice?name=ssq&issueCount=5` });
        if (resp.body.trim().startsWith('<')) throw new Error("双色球接口返回了HTML");
        const data = JSON.parse(resp.body).result[0];
        $.notify("彩票查询", "双色球", `红球：${data.red}\n蓝球：${data.blue}`);
    } catch (e) { $.log("【双色球错误】: " + e.message); }
}

async function checkdlt() {
    try {
        const resp = await $.http.get({ url: `https://webapi.sporttery.cn/gateway/lottery/getDigitalDrawInfoV1.qry?param=85,0` });
        if (resp.body.trim().startsWith('<')) throw new Error("大乐透接口返回了HTML");
        const data = JSON.parse(resp.body).value.dlt;
        $.notify("彩票查询", "大乐透", `结果：${data.lotteryDrawResult}`);
    } catch (e) { $.log("【大乐透错误】: " + e.message); }
}

async function check3d() {
    try {
        const resp = await $.http.get({ url: `http://www.cwl.gov.cn/cwl_admin/kjxx/findDrawNotice?name=3d&issueCount=1` });
        if (resp.body.trim().startsWith('<')) throw new Error("福彩3D接口返回了HTML");
        const data = JSON.parse(resp.body).result[0];
        $.notify("彩票查询", "福彩3D", `结果：${data.red}`);
    } catch (e) { $.log("【福彩3D错误】: " + e.message); }
}

async function checkqlc() {
    try {
        const resp = await $.http.get({ url: `http://www.cwl.gov.cn/cwl_admin/kjxx/findDrawNotice?name=qlc&issueCount=1` });
        if (resp.body.trim().startsWith('<')) throw new Error("七乐彩接口返回了HTML");
        const data = JSON.parse(resp.body).result[0];
        $.notify("彩票查询", "七乐彩", `红球：${data.red}`);
    } catch (e) { $.log("【七乐彩错误】: " + e.message); }
}

// ------------------------------
// 类库基础框架 (保持不变)
// ------------------------------
function API(name, debug) {
    return new (class {
        constructor(name) { this.name = name; }
        log(msg) { console.log(`[${this.name}] ${msg}`); }
        read(key) { return (typeof $prefs !== 'undefined') ? $prefs.valueForKey(key) : null; }
        notify(t, s, c) { (typeof $notify !== 'undefined') ? $notify(t, s, c) : console.log(`${t} ${s} ${c}`); }
        done() { (typeof $done !== 'undefined') ? $done() : null; }
        get http() {
            return {
                get: (options) => new Promise((res) => {
                    if (typeof $task !== 'undefined') $task.fetch(options).then(res);
                    else if (typeof $httpClient !== 'undefined') $httpClient.get(options, (e, r, b) => res({statusCode: r.status, body: b}));
                })
            };
        }
    })(name);
}
