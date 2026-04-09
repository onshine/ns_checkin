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

function saveAccount(slot, value) {
  return $prefs.setValueForKey(JSON.stringify(value), accountKey(slot));
}

function readAccount(slot) {
  const raw = $prefs.valueForKey(accountKey(slot));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function readAccountHeaders(slot) {
  const account = readAccount(slot);
  if (!account) return null;
  if (account && account.headers && typeof account.headers === "object") return account.headers;
  return account;
}

function readAccountName(slot) {
  const account = readAccount(slot);
  if (!account) return "";
  return String(account.displayName || account.name || "").trim();
}

function writeAccount(slot, headers, displayName) {
  return saveAccount(slot, {
    headers,
    displayName: String(displayName || "").trim(),
    updatedAt: nowString()
  });
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
    const saved = readAccount(item);
    const savedCookie = String((saved && saved.headers && saved.headers["Cookie"]) || saved && saved["Cookie"] || "").trim();
    return savedCookie && savedCookie === cookie;
  });

  if (!slot) {
    slot = ACCOUNT_SLOTS.find((item) => {
      const saved = readAccount(item);
      const savedCookie = String((saved && saved.headers && saved.headers["Cookie"]) || saved && saved["Cookie"] || "").trim();
      return !savedCookie;
    }) || 1;
  }

  if (writeAccount(slot, picked, "")) {
    const savedName = accountLabel(slot);
    console.log(`[NS] saved picked headers for ${savedName}: ${JSON.stringify(picked)}`);
    notify(TITLE, "获取成功", `已保存当前${savedName}的cookie和header`);
  } else {
    notify(TITLE, "保存失败", "写入持久化存储失败，请检查配置");
  }

  $done({});
}

function extractDisplayName(payload) {
  const candidates = [];

  const pushValue = (value) => {
    if (typeof value === "string" && value.trim()) candidates.push(value.trim());
  };

  if (payload && typeof payload === "object") {
    pushValue(payload.nickname);
    pushValue(payload.nickName);
    pushValue(payload.username);
    pushValue(payload.userName);
    pushValue(payload.name);
    pushValue(payload.accountName);
    pushValue(payload.displayName);
    if (payload.data && typeof payload.data === "object") {
      pushValue(payload.data.nickname);
      pushValue(payload.data.nickName);
      pushValue(payload.data.username);
      pushValue(payload.data.userName);
      pushValue(payload.data.name);
      pushValue(payload.data.accountName);
      pushValue(payload.data.displayName);
    }
    if (payload.user && typeof payload.user === "object") {
      pushValue(payload.user.nickname);
      pushValue(payload.user.nickName);
      pushValue(payload.user.username);
      pushValue(payload.user.userName);
      pushValue(payload.user.name);
      pushValue(payload.user.accountName);
      pushValue(payload.user.displayName);
    }
  }

  return candidates.length > 0 ? candidates[0] : "";
}

function parseAccountNameFromResponse(body, fallback) {
  try {
    const parsed = JSON.parse(body);
    return extractDisplayName(parsed) || fallback;
  } catch (e) {
    return fallback;
  }
}

function normalizeNotifyName(name, fallback) {
  const value = String(name || "").trim();
  return value || fallback;
}

function validateSession(savedHeaders, callback) {
  const validateUrl = $prefs.valueForKey(NS_VALIDATE_URL_KEY);

  if (!validateUrl) {
    const hasCookie = !!String(savedHeaders["Cookie"] || "").trim();
    callback({
      valid: hasCookie,
      message: hasCookie ? "本地 Cookie 已保存" : "本地 Cookie 为空",
      displayName: ""
    });
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
      let displayName = "";

      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed.message === "string") msg = parsed.message;
        displayName = extractDisplayName(parsed);
      } catch (e) {}

      const invalidKeywords = ["请先登录", "未登录", "登录", "Unauthorized", "401", "403"];
      const bodyText = String(body || "");
      const invalid = status >= 400 || invalidKeywords.some((kw) => bodyText.includes(kw) || String(msg).includes(kw));

      callback({
        valid: !invalid,
        message: invalid ? `Cookie 可能失效：HTTP ${status} / ${msg}` : "Cookie 有效",
        displayName
      });
    },
    (error) => {
      callback({
        valid: false,
        message: `Cookie 校验请求失败：${error}`,
        displayName: ""
      });
    }
  );
}

function checkinOne(account, done) {
  const headers = buildHeaders(account.savedHeaders);
  const label = account.label;

  validateSession(account.savedHeaders, (validation) => {
    if (!validation.valid) {
      const subtitle = `${label} Cookie 无效`;
      const body = validation.message;
      notify(TITLE, subtitle, body);
      done({
        label,
        ok: false,
        subtitle,
        message: validation.message
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

        console.log(`[NS签到] ${label} | 状态码: ${status} | 响应内容: ${msg}`);

        let subtitle = `${label} ${status} 异常`;
        if (status >= 200 && status < 300) {
          subtitle = `${label} 签到成功 🍗`;
          notify(TITLE, subtitle, msg);
        } else if (status === 500 && (String(msg).includes("已完成签到") || String(msg).includes("重复操作"))) {
          subtitle = `${label} 今日已签到 🍗`;
          notify(TITLE, subtitle, "今天已经领过鸡腿啦，明天再来吧~");
        } else if (status === 403) {
          subtitle = `${label} 403 风控`;
          notify(TITLE, subtitle, `暂时被风控，稍后再试\n内容：${msg}`);
        } else {
          notify(TITLE, subtitle, msg);
        }

        done({
          label,
          ok: status >= 200 && status < 300,
          subtitle,
          message: msg,
          status
        });
      },
      (error) => {
        console.log(`[NS签到] ${label} request error: ${error}`);
        notify(TITLE, `${label} 请求错误`, String(error));
        done({
          label,
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
    const account = readAccount(slot);
    if (!account) continue;

    const savedHeaders = readAccountHeaders(slot);
    if (!savedHeaders) continue;

    const cookie = String(savedHeaders["Cookie"] || "").trim();
    if (!cookie || seenCookies.has(cookie)) continue;
    seenCookies.add(cookie);

    accounts.push({
      slot,
      label: accountLabel(slot),
      savedHeaders
    });
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
