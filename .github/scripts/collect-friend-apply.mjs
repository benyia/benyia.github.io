/* 由 .github/workflows/collect-friend-apply.yml 调用：
 * 把「友链申请」Issue 的正文解析成一条申请，追加进 data.json 的 friendApplies。
 * 只用 Node 内置模块，不装任何依赖。
 *
 * 也可以被测试直接 import：核心逻辑在 applyIssueToData() 里，CLI 部分只在直接运行时执行。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function pickField(body, label) {
  const re = new RegExp("\\*\\*" + label + "\\*\\*\\s*[：:]\\s*([^\\n\\r]*)");
  const m = String(body || "").match(re);
  return m ? m[1].trim() : "";
}

export function cleanValue(v) {
  const s = String(v == null ? "" : v).trim();
  if (!s || s === "（未填写）" || s === "(未填写)" || s === "无" || s === "-") return "";
  return s;
}

/** 解析 Issue → 申请对象；解析不出必要字段就返回 null */
export function parseApplyIssue(title, body) {
  const t = String(title || "").replace(/^\s*\[友链申请\]\s*/, "").trim();
  const name = cleanValue(pickField(body, "网站名称")) || t;
  const url = cleanValue(pickField(body, "网站地址"))
    || cleanValue(pickField(body, "网站链接"))
    || cleanValue(pickField(body, "网址"));
  const desc = cleanValue(pickField(body, "网站简介")) || cleanValue(pickField(body, "简介"));
  const avatar = cleanValue(pickField(body, "头像/Logo"))
    || cleanValue(pickField(body, "头像"))
    || cleanValue(pickField(body, "Logo"));
  if (!name || !url) return null;
  return { name, url, desc, avatar };
}

/** 把一条申请并入数据对象；返回 {added:boolean, reason:string} */
export function applyIssueToData(data, apply, meta) {
  meta = meta || {};
  data.friendApplies = Array.isArray(data.friendApplies) ? data.friendApplies : [];
  if (!apply) return { added: false, reason: "解析不出「网站名称 + 网站地址」" };
  const isDup = data.friendApplies.some((x) => String(x.url || "") === apply.url)
    || (data.friendLinks || []).some((x) => String(x.url || "") === apply.url);
  if (isDup) return { added: false, reason: "该网址已存在" };
  const entry = {
    name: apply.name,
    url: apply.url,
    desc: apply.desc || "",
    avatar: apply.avatar || "",
    time: String(meta.time || "").slice(0, 16).replace("T", " "),
    from: "GitHub Issue"
  };
  if (meta.issue) entry.issue = Number(meta.issue);
  data.friendApplies.push(entry);
  return { added: true, reason: "已收录", entry };
}

/* ---------------- CLI（被工作流调用时走这里） ---------------- */
function runCli() {
  const dataPath = path.join(process.cwd(), "data.json");
  const title = process.env.ISSUE_TITLE || "";
  const body = process.env.ISSUE_BODY || "";
  const apply = parseApplyIssue(title, body);
  if (!apply) {
    console.log("Issue 里没有解析到「网站名称 + 网站地址」，跳过。");
    process.exit(0);
  }
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const res = applyIssueToData(data, apply, {
    time: process.env.ISSUE_TIME || "",
    issue: process.env.ISSUE_NUMBER || ""
  });
  if (!res.added) {
    console.log("跳过：" + res.reason + "（" + apply.url + "）");
    process.exit(0);
  }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("已收录友链申请：" + apply.name + " → " + apply.url);
  console.log("当前待处理：" + data.friendApplies.length + " 条");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) runCli();
