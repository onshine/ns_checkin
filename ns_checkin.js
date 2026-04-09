// ns_checkin.js for Quantumult X
// Based on 凉心's original Surge script
// Date: 2026-04-09

const NS_HEADER_KEY = "NS_NodeseekHeaders";
const NS_VALIDATE_URL_KEY = "NS_Validate_Url";
const TITLE = "NS 签到";
const ACCOUNT_SLOTS = [1, 2];

const TG_BOT_TOKEN = getArg("TG_BOT_TOKEN", "");
const TG_CHAT_ID = getArg("TG_CHAT_ID", "");
const TG_ENABLE = getArg("TG_ENABLE", "1") !== "0";

function getArg(key, defaultValue = "") {
  try {
    const params = new URLSearchParams(typeof $argument === "string" ? $argument : "");
    const value = params.get(key);
    return value === null ? defaultValue : value;
  } catch (e) {
    return defaultValue;
  }
}

function getSlotArg() {
  const raw = getArg("slot", "") || getArg("account", "") || getArg("idx", "");
  const slot = parseInt(raw, 10);
  return ACCOUNT_SLOTS.includes(slot) ? slot : 0;
}

function escapeMarkdownV2(text) {
  return String(text).replace(/([_*>\[\]()~`#+\-=|{}.!\\])/g, "\\$1");
}

function nowString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function saveJSON(key, value) {
  return $prefs.setValueForKey(JSON.stringify(value), key);
}

function readJSON(key) {
  const raw = $prefs.valueForKey(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function accountKey(slot) {
  return `${NS_HEADER_KEY}_${slot}`;
}

function accountLabel(slot) {
  return `账号${slot}`;
}

function sendTelegram(title, lines, callback) {
  if (!TG_ENABLE || !TG_BOT_TOKEN || !TG_CHAT_ID) {
    callback && callback();
    return;
  }

  const text = [`*${escapeMarkdownV2(title)}*`]
    .concat(lines.map((line) => `- ${escapeMarkdownV2(line)}`))
    .join("\n");

  $task.fetch({
    url: `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: TG_CHAT_ID,
      text,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true
    })
  }).then(
    () => callback && callback(),
    (error) => {
      console.log(`[NS] TG push error: ${error}`);
      callback && callback();
    }
  );
}

function notify(title, subtitle, body) {
  $notify(title, subtitle, body);
}

function buildHeaders(savedHeaders) {
  return {
    Connection: savedHeaders["Connection"] || "keep-alive",
    "Accept-Encoding": savedHeaders["Accept-Encoding"] || "gzip, deflate, br",
    Priority: savedHeaders["Priority"] || "u=3, i",
    "Content-Type": savedHeaders["Content-Type"] || "text/plain;charset=UTF-8",
    Origin: savedHeaders["Origin"] || "https://www.nodeseek.com",
    "refract-sign": savedHeaders["refract-sign"] || "",
    "User-Agent":
      savedHeaders["User-Agent"] ||
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.2 Mobile/15E148 Safari/604.1",
    "refract-key": savedHeaders["refract-key"] || "",
    "Sec-Fetch-Mode": savedHeaders["Sec-Fetch-Mode"] || "cors",
    Cookie: savedHeaders["Cookie"] || "",
    Host: savedHeaders["Host"] || "www.nodeseek.com",
    Referer: savedHeaders["Referer"] || "https://www.nodeseek.com/sw.js?v=0.3.33",
    "Accept-Language": savedHeaders["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
    Accept: savedHeaders["Accept"] || "*/*"
  };
}

function pickNeedHeaders(headers) {
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
    "Accept"
  ];

  const picked = {};
  for (const k in headers) {
    const originalKey = NEED_KEYS.find((key) => key.toLowerCase() === k.toLowerCase());
    if (originalKey) picked[originalKey] = headers[k];
  }
  return picked;
}

function captureHeaders() {
  const picked = pickNeedHeaders(($request && $request.headers) || {});

  if ($request && $request.url) {
    $prefs.setValueForKey($request.url, NS_VALIDATE_URL_KEY);
  }

  if (Object.keys(picked).length === 0) {
    console.log("[NS] picked headers empty");
    notify(TITLE, "获取失败", "未获取到 Headers，请重试");
    $done({});
    return;
  }

  const cookie = String(picked["Cookie"] || "").trim();
  let slot = ACCOUNT_SLOTS.find((item) => {
    const saved = readJSON(accountKey(item));
    return saved && String(saved["Cookie"] || "").trim() === cookie;
  });

  if (!slot) {
    slot = ACCOUNT_SLOTS.find((item) => {
      const saved = readJSON(accountKey(item));
      return !saved || !String(saved["Cookie"] || "").trim();
    }) || 1;
  }

  if (saveJSON(accountKey(slot), picked)) {
    console.log(`[NS] saved picked headers for ${accountLabel(slot)}: ${JSON.stringify(picked)}`);
    notify(TITLE, "获取成功", `已保存当前${accountLabel(slot)}的cookie和header`);
  } else {
    notify(TITLE, "保存失败", "写入持久化存储失败，请检查配置");
  }

  $done({});
}

function validateSession(savedHeaders, callback) {
  const validateUrl = $prefs.valueForKey(NS_VALIDATE_URL_KEY);

  if (!validateUrl) {
    const hasCookie = !!String(savedHeaders["Cookie"] || "").trim();
    callback(hasCookie, hasCookie ? "本地 Cookie 已保存" : "本地 Cookie 为空");
    return;
  }

  $task.fetch({
    url: validateUrl,
    method: "GET",
    headers: buildHeaders(savedHeaders)
  }).then(
    (response) => {
      const status = response.statusCode || response.status || 0;
      const body = response.body || "";
      let msg = body || "";

      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed.message === "string") msg = parsed.message;
      } catch (e) {}

      const invalidKeywords = ["请先登录", "未登录", "登录", "Unauthorized", "401", "403"];
      const bodyText = String(body || "");
      const invalid = status >= 400 || invalidKeywords.some((kw) => bodyText.includes(kw) || String(msg).includes(kw));

      callback(!invalid, invalid ? `Cookie 可能失效：HTTP ${status} / ${msg}` : "Cookie 有效");
    },
    (error) => {
      callback(false, `Cookie 校验请求失败：${error}`);
    }
  );
}

function checkinOne(account, done) {
  const headers = buildHeaders(account.savedHeaders);

  validateSession(account.savedHeaders, (valid, validateMsg) => {
    if (!valid) {
      const subtitle = `${account.label} Cookie 无效`;
      const body = validateMsg;
      notify(TITLE, subtitle, body);
      done({
        label: account.label,
        ok: false,
        subtitle,
        message: validateMsg
      });
      return;
    }

    $task.fetch({
      url: "https://www.nodeseek.com/api/attendance?random=true",
      method: "POST",
      headers,
      body: ""
    }).then(
      (response) => {
        const status = response.statusCode || response.status || 0;
        let msg = response.body || "无返回内容";

        try {
          const parsed = JSON.parse(response.body);
          msg = parsed.message || msg;
        } catch (e) {}

        console.log(`[NS签到] ${account.label} | 状态码: ${status} | 响应内容: ${msg}`);

        let subtitle = `${status} 异常`;
        if (status >= 200 && status < 300) {
          subtitle = "签到成功 🍗";
          notify(TITLE, `${account.label} ${subtitle}`, msg);
        } else if (status === 500 && (String(msg).includes("已完成签到") || String(msg).includes("重复操作"))) {
          subtitle = "今日已签到 🍗";
          notify(TITLE, `${account.label} ${subtitle}`, "今天已经领过鸡腿啦，明天再来吧~");
        } else if (status === 403) {
          subtitle = "403 风控";
          notify(TITLE, `${account.label} ${subtitle}`, `暂时被风控，稍后再试\n内容：${msg}`);
        } else {
          notify(TITLE, `${account.label} ${subtitle}`, msg);
        }

        done({
          label: account.label,
          ok: status >= 200 && status < 300,
          subtitle,
          message: msg,
          status
        });
      },
      (error) => {
        console.log(`[NS签到] ${account.label} request error: ${error}`);
        notify(TITLE, `${account.label} 请求错误`, String(error));
        done({
          label: account.label,
          ok: false,
          subtitle: "请求错误",
          message: String(error)
        });
      }
    );
  });
}

function loadAccounts() {
  const accounts = [];
  const seenCookies = new Set();

  for (const slot of ACCOUNT_SLOTS) {
    const raw = $prefs.valueForKey(accountKey(slot));
    if (!raw) continue;

    try {
      const savedHeaders = JSON.parse(raw);
      const cookie = String(savedHeaders["Cookie"] || "").trim();
      if (!cookie || seenCookies.has(cookie)) continue;
      seenCookies.add(cookie);
      accounts.push({
        slot,
        label: accountLabel(slot),
        savedHeaders
      });
    } catch (e) {}
  }

  if (accounts.length === 0) {
    const legacy = readJSON(NS_HEADER_KEY);
    if (legacy && String(legacy["Cookie"] || "").trim()) {
      accounts.push({
        slot: 1,
        label: accountLabel(1),
        savedHeaders: legacy
      });
    }
  }

  return accounts;
}

function doCheckin() {
  const accounts = loadAccounts();
  if (accounts.length === 0) {
    notify(TITLE, "无法签到", "本地没有已保存的 Headers，请先访问一次个人页面");
    $done();
    return;
  }

  const results = [];
  const runNext = (index) => {
    if (index >= accounts.length) {
      const summaryLines = results.map((item) => `${item.label}：${item.subtitle}${item.message ? ` / ${item.message}` : ""}`);
      sendTelegram("NS 签到", [
        `时间：${nowString()}`,
        `账户数：${results.length}`,
        ...summaryLines
      ], () => $done());
      return;
    }

    checkinOne(accounts[index], (result) => {
      results.push(result);
      runNext(index + 1);
    });
  };

  runNext(0);
}

if (typeof $request !== "undefined") {
  captureHeaders();
} else {
  doCheckin();
}
