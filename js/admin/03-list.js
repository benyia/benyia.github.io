/* ============================================================
   列表工具：最新排最前 + 关键词过滤
   ------------------------------------------------------------
   只影响「显示顺序」，绝不改动 blogData 里数组本身的顺序：
   adminSortNewest 返回的是 [{i, item}]，i 始终是原始下标，
   渲染时按钮上写的还是这个 i，删除 / 编辑才不会点错人。
   ============================================================ */
var ADMIN_SORT_KEYS = ["time", "date", "updatedAt", "createdAt", "publishDate"];

/* 取条目的时间字符串；都没有就返回 null（会排到最后） */
function adminTimeOf(it){
  if(!it || typeof it !== "object") return null;
  for(var i = 0; i < ADMIN_SORT_KEYS.length; i++){
    var v = it[ADMIN_SORT_KEYS[i]];
    if(v === undefined || v === null) continue;
    var s = String(v).trim();
    if(s) return s;
  }
  return null;
}

/* 时间倒序（"2026-09-27 13:50" / "2026-09-27" 这种字符串直接倒序比较即可）；
   没有时间字段的排最后，并保持它们彼此之间的原有顺序；有时间且相同的也保持原有顺序。
   返回 [{i, item}]，i = 原始下标。 */
function adminSortNewest(arr){
  var list = arr || [];
  var rows = [];
  for(var i = 0; i < list.length; i++){
    var item = list[i];
    rows.push({ i: i, item: item, k: adminTimeOf(item) });
  }
  rows.sort(function(a, b){
    if(a.k === null && b.k === null) return a.i - b.i;
    if(a.k === null) return 1;
    if(b.k === null) return -1;
    if(a.k !== b.k) return a.k < b.k ? 1 : -1;
    return a.i - b.i;
  });
  return rows;
}

/* 把任意字段值摊平成一段可搜索的纯文本 */
function adminText(v){
  if(v === null || v === undefined) return "";
  if(typeof v === "string") return v;
  if(typeof v === "number" || typeof v === "boolean") return String(v);
  if(Object.prototype.toString.call(v) === "[object Array]"){
    return v.map(adminText).join(" ");
  }
  if(typeof v === "object"){
    var out = [];
    for(var k in v){ if(Object.prototype.hasOwnProperty.call(v, k)) out.push(adminText(v[k])); }
    return out.join(" ");
  }
  return String(v);
}

/* 把条目里那些字段拼成一段纯文本 */
function adminHaystack(item, fields){
  var parts = [];
  (fields || []).forEach(function(f){
    parts.push(adminText(item ? item[f] : ""));
  });
  return parts.join(" \n ");
}

/* 关键词匹配：大小写不敏感；多个空格分隔的关键词要求全部命中（AND）；
   搜索词为空时一律返回 true。 */
function adminMatch(item, fields, q){
  var terms = String(q == null ? "" : q).trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!terms.length) return true;
  var hay = adminHaystack(item, fields).toLowerCase();
  for(var i = 0; i < terms.length; i++){
    if(hay.indexOf(terms[i]) < 0) return false;
  }
  return true;
}

/* 每个面板自己的搜索词（模块级保存，重渲染时输入框的值不会丢） */
var courseQuery = "", paperQuery = "", noticeQuery = "", classQuery = "";
var rosterQuery = "", ledgerQuery = "", diaryQuery = "", advisorQuery = "";

/* 各面板共用的重渲染入口：搜索框 oninput 直接调它 */
var ADMIN_QUERY_RERENDER = {
  courses: function(){ renderCourses(); },
  papers:  function(){ renderPapers(); },
  notices: function(){ renderNotices(); },
  "class": function(){ renderClass(); },
  roster:  function(){ renderRoster(); },
  ledger:  function(){ renderLedger(); },
  diary:   function(){ renderDiary(); },
  advisor: function(){ renderAdvisor(); }
};

/* 搜索框的 oninput：存住搜索词 + 立刻重渲染 */
function adminQueryInput(key, value){
  if(key === "courses") courseQuery = value;
  else if(key === "papers") paperQuery = value;
  else if(key === "notices") noticeQuery = value;
  else if(key === "class") classQuery = value;
  else if(key === "roster") rosterQuery = value;
  else if(key === "ledger") ledgerQuery = value;
  else if(key === "diary") diaryQuery = value;
  else if(key === "advisor") advisorQuery = value;
  var fn = ADMIN_QUERY_RERENDER[key];
  if(fn) fn();
}

/* 取当前搜索词（渲染函数里用） */
function adminQueryOf(key){
  if(key === "courses") return courseQuery;
  if(key === "papers") return paperQuery;
  if(key === "notices") return noticeQuery;
  if(key === "class") return classQuery;
  if(key === "roster") return rosterQuery;
  if(key === "ledger") return ledgerQuery;
  if(key === "diary") return diaryQuery;
  if(key === "advisor") return advisorQuery;
  return "";
}

/* 搜索用的字段清单 */
var ADMIN_SEARCH_FIELDS = {
  courses: ["title", "desc", "intro", "tags", "time", "date"],
  papers:  ["title", "desc", "abstract", "tags", "status", "year", "time", "date"],
  notices: ["title", "source", "content", "tags", "date", "time"],
  "class": ["title", "type", "content", "tags", "date", "time"],
  roster:  ["studentId", "name", "gender", "className", "college", "major", "dorm", "advisor",
            "ethnicity", "political", "birthday", "phone", "email", "idCard", "homeAddress", "note", "time", "date"],
  ledger:  ["type", "amount", "category", "desc", "date", "time"],
  diary:   ["title", "content", "tags", "date", "time"],
  advisor: ["content", "tags", "count", "date", "time"]
};

/* 取某面板搜索用的字段；搜索正文（HTML / Markdown）时先转成纯文本 */
function adminSearchFields(key, item){
  var base = ADMIN_SEARCH_FIELDS[key] || [];
  return base.map(function(f){
    var v = item ? item[f] : "";
    if(f === "content" || f === "intro" || f === "abstract") return stripMd(v);
    return v;
  });
}

/* 列表的搜索框：统一生成，样式和后台其它输入框保持一致 */
function adminSearchInput(key, placeholder, id){
  var ph = esc(placeholder);
  return '<div style="margin:0 0 10px">'
    + '<input type="text" id="' + esc(id) + '" value="' + esc(adminQueryOf(key)) + '" placeholder="' + ph + '" '
    + 'style="width:100%;max-width:420px;box-sizing:border-box;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:.88rem" '
    + 'oninput="adminQueryInput(\'' + key + '\', this.value)">'
    + '</div>';
}

/* 排序 + 过滤，返回 [{i, item}] —— 渲染函数统一用它 */
function adminVisible(key, arr){
  var rows = adminSortNewest(arr);
  var q = adminQueryOf(key);
  if(!String(q || "").trim()) return rows;
  return rows.filter(function(r){
    return adminMatch({ v: adminSearchFields(key, r.item) }, ["v"], q);
  });
}

/* 空状态：搜索没命中时给一句人话 */
function adminEmptyBox(key, emptyText){
  if(String(adminQueryOf(key) || "").trim()){
    return '<div style="color:#94a3b8;font-size:.85rem">没有找到匹配的内容</div>';
  }
  return '<div style="color:#94a3b8;font-size:.85rem">' + (emptyText || "暂无") + '</div>';
}

function showToast(msg, type){
  const t=document.createElement("div");
  t.className="toast "+(type||"success");
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), type==="error"?5000:3000);
}
function fmtSize(bytes){
  if(!bytes && bytes!==0) return "";
  if(bytes < 1024) return bytes+" B";
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1)+" KB";
  return (bytes/1024/1024).toFixed(2)+" MB";
}
function getPwd(){ return localStorage.getItem(PWD_KEY) || ADMIN_PWD; }
function getStoredToken(){ return (localStorage.getItem(TOKEN_KEY)||"").trim(); }
