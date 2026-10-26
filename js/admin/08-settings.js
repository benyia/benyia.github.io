/* ============================================================
   站点设置 / 导出
   ============================================================ */
function saveSiteConfig(){
  blogData.siteConfig = {
    title: $("cfgTitle").value.trim() || "思齐个人主页",
    subtitle: $("cfgSub").value.trim(),
    about: $("cfgAbout").value,
    avatar: $("cfgAvatar").value.trim() || "思",
    defaultImage: $("cfgDefaultImage").value.trim(),
    columns: $("cfgColumns").value || "1",
    defaultAvatar: $("cfgDefaultAvatar").value.trim(),
    loginHint: $("cfgLoginHint").value,
    coverPan: $("cfgCoverPan").checked,
    coverPanSec: parseInt($("cfgCoverPanSec").value, 10) || 3,
    name: $("cfgName").value.trim() || "思齐",
    bio: $("cfgBio").value.trim(),
    /* 欢迎页 / 公告 / 建站日期由「首页」面板单独保存，这里必须原样带过去，否则会被覆盖掉 */
    welcome: (blogData.siteConfig && blogData.siteConfig.welcome) || undefined,
    startDate: (blogData.siteConfig && blogData.siteConfig.startDate) || undefined,
    notice: (blogData.siteConfig && blogData.siteConfig.notice) || undefined,
    noticeBtn: (blogData.siteConfig && blogData.siteConfig.noticeBtn) || undefined,
    noticeUrl: (blogData.siteConfig && blogData.siteConfig.noticeUrl) || undefined,
    homeSections: (blogData.siteConfig && Array.isArray(blogData.siteConfig.homeSections)) ? blogData.siteConfig.homeSections : undefined
  };
  saveData("修改站点设置");
  renderAll();
}
/* ---------- 生活服务：编辑 ---------- */
let editingLife = null;
function editLife(i){
  var it = blogData.lifeServices[i];
  editingLife = i;
  $("lsIcon").value = it.icon||""; $("lsTitle").value = it.title||"";
  $("lsDesc").value = it.desc||""; $("lsUrl").value = it.url||"";
  drafts.life = (it.files||[]).slice();
  setImgDrafts("life", it.images);
  renderDraftFiles("life");
  $("lifeFormTitle").textContent = "编辑生活服务：" + (it.title||"");
  var box = document.getElementById("panel-life");
  if(box && box.scrollIntoView) box.scrollIntoView({behavior:"smooth"});
}
function cancelLifeEdit(){
  editingLife = null;
  ["lsIcon","lsTitle","lsDesc","lsUrl"].forEach(function(id){ $(id).value=""; });
  drafts.life = []; renderDraftFiles("life"); setImgDrafts("life", []);
  $("lifeFormTitle").textContent = "添加生活服务链接";
}

/* ---------- 快速链接：编辑 ---------- */
let editingQL = null;
function editQuickLink(i){
  var l = blogData.quickLinks[i];
  editingQL = i;
  $("qlIcon").value = l.icon||""; $("qlTitle").value = l.title||""; $("qlUrl").value = l.url||"";
  $("qlFormTitle").textContent = "✏️ 编辑快速链接：" + (l.title||"");
  var box = document.getElementById("panel-site");
  if(box && box.scrollIntoView) box.scrollIntoView({behavior:"smooth"});
}
function cancelQuickLinkEdit(){
  editingQL = null;
  ["qlIcon","qlTitle","qlUrl"].forEach(function(id){ $(id).value=""; });
  $("qlFormTitle").textContent = "🔗 快速链接管理（首页右侧）";
}

/* ---------- 首页：入场欢迎页 + 卡片面板 ---------- */
/* 读：没配过就返回空对象，但不写进 blogData（免得给 data.json 塞空壳） */
function wkRead(){
  return (blogData.siteConfig && blogData.siteConfig.welcome) || {};
}
/* 写：真正保存时才创建 */
function wkCfg(){
  if(!blogData.siteConfig) blogData.siteConfig = {};
  if(!blogData.siteConfig.welcome || typeof blogData.siteConfig.welcome !== "object") blogData.siteConfig.welcome = {};
  return blogData.siteConfig.welcome;
}
function renderHomeManage(){
  var w = wkRead();
  if(!$("wkOn")) return;
  $("wkOn").checked = (w.on !== false);
  $("wkSec").value = (w.sec || 3.5);
  /* 没配过的字段直接显示实际生效的默认值，别留空白让人以为没设置 */
  $("wkTop").value = (w.top || "欢迎来到");
  $("wkName").value = w.name || "";
  $("wkMid").value = (w.mid === undefined ? "の" : w.mid);
  $("wkSuffix").value = (w.suffix === undefined ? "小站" : w.suffix);
  $("wkTip").value = (w.tip || "很高兴与你相遇");
  $("wkBg").value = w.bg || "";
  /* 公告 + 建站日期 */
  if($("cfgStartDate")) $("cfgStartDate").value = (blogData.siteConfig.startDate || "2026-09-01");
  if($("cfgNotice")) $("cfgNotice").value = (blogData.siteConfig.notice || "");
  if($("cfgNoticeBtn")) $("cfgNoticeBtn").value = (blogData.siteConfig.noticeBtn || "");
  if($("cfgNoticeUrl")) $("cfgNoticeUrl").value = (blogData.siteConfig.noticeUrl || "");
  renderHomeSections();
}
function saveHomeInfo(){
  blogData.siteConfig.startDate = $("cfgStartDate").value || "";
  blogData.siteConfig.notice = $("cfgNotice").value;
  blogData.siteConfig.noticeBtn = $("cfgNoticeBtn").value.trim();
  blogData.siteConfig.noticeUrl = $("cfgNoticeUrl").value.trim();
  saveData("修改首页公告 / 建站日期");
  renderAll();
  showToast("已保存");
}
/* 首页显示哪几类内容 */
var HOME_SEC_OPTS = [
  { key: "courses",    name: "课程", icon: "📚" },
  { key: "papers",     name: "论文", icon: "📝" },
  { key: "notices",    name: "通知", icon: "🔔" },
  { key: "classItems", name: "班级", icon: "👥" },
  { key: "diary",      name: "日记", icon: "📖" }
];
var HOME_SEC_DEFAULT = ["courses", "papers", "notices", "classItems"];
function renderHomeSections(){
  var box = $("homeSectionBox");
  if(!box) return;
  var sc = blogData.siteConfig || {};
  var cur = Array.isArray(sc.homeSections) ? sc.homeSections.slice() : HOME_SEC_DEFAULT.slice();
  box.innerHTML = HOME_SEC_OPTS.map(function(o){
    var on = cur.indexOf(o.key) >= 0;
    return '<label style="font-size:.9rem;display:flex;align-items:center;gap:6px;cursor:pointer">'
      + '<input type="checkbox" class="homeSecChk" value="' + o.key + '"' + (on ? " checked" : "") + '> '
      + o.icon + " " + o.name + "</label>";
  }).join("");
}
function saveHomeSections(){
  var box = $("homeSectionBox");
  if(!box) return;
  var picked = [], chks = box.querySelectorAll(".homeSecChk");
  for(var i = 0; i < chks.length; i++){ if(chks[i].checked) picked.push(chks[i].value); }
  if(!picked.length){ showToast("至少要留一类内容，不然首页就空了", "error"); return; }
  if(!blogData.siteConfig) blogData.siteConfig = {};
  blogData.siteConfig.homeSections = picked;
  saveData("修改首页显示内容");
  renderAll();
  showToast("已保存，首页只显示这几类");
}
function saveWelcomeCfg(){
  var w = wkCfg();
  w.on = $("wkOn").checked;
  w.sec = parseFloat($("wkSec").value) || 3.5;
  w.top = $("wkTop").value.trim() || "欢迎来到";
  w.name = $("wkName").value.trim();
  w.mid = $("wkMid").value;
  w.suffix = $("wkSuffix").value;
  w.tip = $("wkTip").value.trim() || "很高兴与你相遇";
  w.bg = $("wkBg").value.trim();
  saveData("修改入场欢迎页");
  renderAll();
  showToast("欢迎页已保存");
}
/* ---------- 分类管理 ---------- */
function renderCatManage(){
  $("catManageList").innerHTML = (blogData.categories||[]).map(function(c,i){
    return '<div class="item-row"><div class="info"><div class="title">'+iconThumb(c.icon,22)+' '+esc(c.name)+'</div><div class="desc">指向：'+esc(c.section||"")+'</div></div><button class="btn btn-danger btn-sm" onclick="delCategory('+i+')">删除</button></div>';
  }).join("") || '<div style="color:#94a3b8;font-size:.85rem">暂无分类</div>';
}
function addCategory(){
  var name=$("catName").value.trim();
  if(!name){ showToast("请输入分类名","error"); return; }
  blogData.categories = blogData.categories || [];
  blogData.categories.push({icon:$("catIcon").value.trim()||"📁", name:name, section:$("catSection").value});
  saveData("添加分类："+name);
  renderAll();
  $("catName").value=""; $("catIcon").value="";
}
function delCategory(i){
  if(!confirm("确定删除？")) return;
  blogData.categories.splice(i,1);
  saveData("删除分类");
  renderAll();
}

/* ---------- 标签管理 ---------- */
function saveTags(){
  var raw=$("tagsInput").value;
  blogData.tags = raw.split(/[,，]/).map(function(t){return t.trim();}).filter(Boolean);
  saveData("修改标签");
  renderAll();
  showToast("标签已保存");
}

/* ---------- 快速链接管理 ---------- */
function renderQuickLinkManage(){
  $("quickLinkManageList").innerHTML = (blogData.quickLinks||[]).map(function(l,i){
    return '<div class="item-row"><div class="info"><div class="title">'+iconThumb(l.icon,22)+' '+esc(l.title)+'</div><div class="desc">'+esc(l.url)+'</div></div><div class="actions"><button class="btn btn-ghost btn-sm" onclick="editQuickLink('+i+')">编辑</button><button class="btn btn-danger btn-sm" onclick="delQuickLink('+i+')">删除</button></div></div>';
  }).join("") || '<div style="color:#94a3b8;font-size:.85rem">暂无链接</div>';
}
function addQuickLink(){
  var title=$("qlTitle").value.trim();
  var url=$("qlUrl").value.trim();
  if(!title||!url){ showToast("请输入名称和链接","error"); return; }
  blogData.quickLinks = blogData.quickLinks || [];
  var item = {icon:$("qlIcon").value.trim()||"🔗", title:title, url:url};
  if(editingQL === null){ blogData.quickLinks.push(item); saveData("添加快速链接："+title); }
  else { blogData.quickLinks[editingQL] = item; saveData("编辑快速链接："+title); }
  cancelQuickLinkEdit();
  renderAll();
}
function delQuickLink(i){
  if(!confirm("确定删除？")) return;
  blogData.quickLinks.splice(i,1);
  saveData("删除快速链接");
  renderAll();
}

/* ---------- 友链申请：待处理列表 ---------- */
function renderFriendApplies(){
  var el = $("applyList");
  if(!el) return;
  var list = blogData.friendApplies || [];
  var cnt = $("applyCount");
  if(cnt) cnt.textContent = list.length ? ("（" + list.length + " 条待处理）") : "（暂无）";
  el.innerHTML = list.map(function(a, i){
    return '<div class="item-row"><div class="info">'
      + '<div class="title">'+iconThumb(a.avatar,22)+' '+esc(a.name||"未命名")+'</div>'
      + '<div class="desc"><a href="'+esc(a.url||"#")+'" target="_blank" rel="noopener">'+esc(a.url||"")+'</a></div>'
      + (a.desc?'<div class="desc">'+esc(a.desc)+'</div>':"")
      + (a.time?'<div class="desc">提交于 '+esc(a.time)+'</div>':"")
      + '</div><div class="actions">'
      + '<button class="btn btn-primary btn-sm" onclick="approveFriendApply('+i+')">通过</button>'
      + '<button class="btn btn-danger btn-sm" onclick="rejectFriendApply('+i+')">忽略</button>'
      + '</div></div>';
  }).join("") || '<div style="color:#94a3b8;font-size:.85rem">暂无待处理的申请。别人在前台提交后会出现在这里。</div>';
}
/* 通过：转成正式友链 */
function approveFriendApply(i){
  var a = (blogData.friendApplies||[])[i];
  if(!a) return;
  blogData.friendLinks = blogData.friendLinks || [];
  var dup = blogData.friendLinks.some(function(f){ return String(f.url||"") === String(a.url||""); });
  if(!dup){
    blogData.friendLinks.push({ name: a.name||"", url: a.url||"", avatar: a.avatar||"", desc: a.desc||"" });
  }
  blogData.friendApplies.splice(i, 1);
  saveData("通过友链申请：" + (a.name||a.url));
  renderAll();
  showToast(dup ? "这条已经在友链里了，已从申请列表移除" : "已加入友链：" + (a.name||""));
}
function rejectFriendApply(i){
  var a = (blogData.friendApplies||[])[i];
  if(!a) return;
  if(!confirm("忽略这条申请？（" + (a.name||a.url) + "）")) return;
  blogData.friendApplies.splice(i, 1);
  saveData("忽略友链申请");
  renderAll();
}
/* 从 GitHub Issues 拉取带「友链申请」标签的 Issue，解析后并入待处理列表 */
function parseApplyIssue(title, body){
  var b = String(body||"");
  function pick(label){
    var re = new RegExp("\\*\\*" + label + "\\*\\*\\s*[：:]\\s*([^\\n\\r]*)");
    var m = b.match(re);
    return m ? m[1].trim() : "";
  }
  var name = pick("网站名称") || String(title||"").replace(/^\s*\[友链申请\]\s*/, "").trim();
  var url = pick("网站地址");
  var desc = pick("网站简介");
  var avatar = pick("头像/Logo") || pick("头像") || "";
  function clean(v){ return (v === "（未填写）" || v === "(未填写)") ? "" : v; }
  return { name: name, url: url, desc: clean(desc), avatar: clean(avatar), time: "", from: "GitHub Issue" };
}
async function syncFriendApplies(){
  var st = $("applyStatus");
  var token = getStoredToken();
  if(!token){
    if(st){ st.className = "status-msg err"; st.textContent = "请先在「站点设置」里保存 GitHub Token，再回来拉取申请。"; }
    showToast("请先在「站点设置」里保存 GitHub Token", "error");
    return;
  }
  var btn = $("applySyncBtn");
  if(btn) btn.disabled = true;
  if(st){ st.className = "status-msg"; st.textContent = "正在从 GitHub 读取申请…"; }
  try{
    var r = await ghApiIssues();
    if(!r.ok) throw new Error(ghErrorText(r.status, r.json));
    var issues = Array.isArray(r.json) ? r.json : [];
    var mine = issues.filter(function(it){
      var labels = (it.labels||[]).map(function(l){ return typeof l === "string" ? l : (l && l.name) || ""; });
      return labels.indexOf("友链申请") >= 0 || /^\s*\[友链申请\]/.test(it.title||"");
    });
    blogData.friendApplies = blogData.friendApplies || [];
    var added = 0;
    mine.forEach(function(it){
      var a = parseApplyIssue(it.title, it.body);
      if(!a.url) return;
      var dup = blogData.friendApplies.some(function(x){ return String(x.url) === a.url; })
             || (blogData.friendLinks||[]).some(function(x){ return String(x.url) === a.url; });
      if(dup) return;
      a.time = (it.created_at || "").slice(0, 16).replace("T", " ");
      a.issue = it.number;
      blogData.friendApplies.push(a);
      added++;
    });
    if(added) await saveData("从 GitHub 导入 " + added + " 条友链申请");
    renderAll();
    if(st){ st.className = "status-msg ok"; st.textContent = "✅ 读取到 " + mine.length + " 条申请，新增 " + added + " 条"; }
    showToast(added ? ("已导入 " + added + " 条申请") : "没有新的申请");
  }catch(e){
    if(st){ st.className = "status-msg err"; st.textContent = "读取失败：" + e.message; }
  }
  if(btn) btn.disabled = false;
}
async function ghApiIssues(){
  var h = ghHeaders();
  var url = GH_API_BASE + "/repos/"+GH_OWNER+"/"+GH_REPO+"/issues?state=open&per_page=50&t="+Date.now();
  var res = await fetch(url, { headers: h, cache: "no-store" });
  var json = null;
  try { json = await res.json(); } catch(e){ json = null; }
  return { ok: res.ok, status: res.status, json: json };
}
/* 本地自测：造一条申请，验证「通过 → 变成友链」这条链路 */
function addSelfTestApply(){
  blogData.friendApplies = blogData.friendApplies || [];
  blogData.friendApplies.push({
    name: "测试友链申请", url: "https://example-friend.test/", desc: "这是一条测试申请",
    avatar: "", time: nowStr(), from: "后台自测"
  });
  saveData("添加一条测试友链申请");
  renderAll();
  showToast("已添加测试申请，点「通过」试试");
}

/* ---------- 友链管理（显示在「关于我」页 + 首页右侧） ---------- */
let editingFriend = null;
function renderFriendManage(){
  renderFriendApplies();
  var el = $("friendList");
  if(!el) return;
  el.innerHTML = (blogData.friendLinks||[]).map(function(f,i){
    return '<div class="item-row"><div class="info"><div class="title">'+iconThumb(f.avatar,22)+' '+esc(f.name)+'</div><div class="desc">'+esc(f.url)+'</div>'+(f.desc?'<div class="desc">'+esc(f.desc)+'</div>':"")+'</div><div class="actions"><button class="btn btn-ghost btn-sm" onclick="editFriend('+i+')">编辑</button><button class="btn btn-danger btn-sm" onclick="delFriend('+i+')">删除</button></div></div>';
  }).join("") || '<div style="color:#94a3b8;font-size:.85rem">还没有友链，上面添加一个试试</div>';
}
function saveFriend(){
  var name = $("frName").value.trim();
  var url = $("frUrl").value.trim();
  if(!name || !url){ showToast("请填写网站名称和网址","error"); return; }
  if(!/^https?:\/\//i.test(url)){ showToast("网址要以 http:// 或 https:// 开头","error"); return; }
  blogData.friendLinks = blogData.friendLinks || [];
  var item = {
    name: name,
    url: url,
    avatar: $("frAvatar").value.trim(),
    desc: $("frDesc").value.trim()
  };
  if(editingFriend === null){ blogData.friendLinks.push(item); saveData("添加友链："+name); }
  else { blogData.friendLinks[editingFriend] = item; saveData("编辑友链："+name); }
  cancelFriendEdit();
  renderAll();
}
function editFriend(i){
  var f = blogData.friendLinks[i];
  editingFriend = i;
  $("frName").value = f.name||""; $("frUrl").value = f.url||"";
  $("frAvatar").value = f.avatar||""; $("frDesc").value = f.desc||"";
  refreshIconPrev("frAvatar");
  $("friendFormTitle").textContent = "✏️ 编辑友链：" + (f.name||"");
  $("friendEditBar").classList.add("on");
  $("frSubmit").textContent = "保存修改";
  $("frCancel").style.display = "inline-block";
  $("panel-friends").scrollIntoView({behavior:"smooth"});
}
function cancelFriendEdit(){
  editingFriend = null;
  ["frName","frUrl","frAvatar","frDesc"].forEach(function(id){ var el=$(id); if(el) el.value=""; });
  refreshIconPrev("frAvatar");
  $("friendFormTitle").textContent = "🔗 添加友链";
  $("friendEditBar").classList.remove("on");
  $("frSubmit").textContent = "添加友链";
  $("frCancel").style.display = "none";
}
function delFriend(i){
  if(!confirm("确定删除这条友链？")) return;
  if(editingFriend === i) cancelFriendEdit();
  blogData.friendLinks.splice(i,1);
  saveData("删除友链");
  renderAll();
}

/* ---------- 记账分类下拉 ---------- */
function updateLgCategories(){
  var type=$("lgType").value;
  var cats=(blogData.ledgerCategories||{})[type]||["其他"];
  $("lgCategory").innerHTML = cats.map(function(c){return '<option>'+esc(c)+'</option>';}).join("");
}

function exportData(){
  const blob = new Blob([JSON.stringify(blogData,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data-"+todayStr()+".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 3000);
  showToast("已导出备份文件");
}
function cancelEdit(kind){
  editing[kind] = null;
  drafts[kind] = [];
  setImgDrafts(kind, []);
  if(kind==="course"){
    ["cIcon","cTitle","cDesc","cTags"].forEach(id=>$(id).value="");
    loadRich("course", "");
    $("cProgress").value=0;
    $("courseFormTitle").textContent="添加课程";
    $("courseEditBar").classList.remove("on");
    $("cSubmit").textContent="添加课程";
    $("cCancel").style.display="none";
    $("cUpStatus").textContent="支持多选；单个文件建议不超过 "+MAX_FILE_MB+"MB";
    renderDraftFiles("course");
  }
  if(kind==="paper"){
    $("pTitle").value=""; $("pYear").value=""; $("pDesc").value=""; $("pTags").value="";
    loadRich("paper", "");
    document.querySelectorAll(".paper-tag").forEach(c=>c.checked=false);
    $("paperFormTitle").textContent="添加论文";
    $("paperEditBar").classList.remove("on");
    $("pSubmit").textContent="添加论文";
    $("pCancel").style.display="none";
    $("pUpStatus").textContent="支持多选；单个文件建议不超过 "+MAX_FILE_MB+"MB";
    renderDraftFiles("paper");
  }
  if(kind==="class"){
    $("clTitle").value=""; $("clDate").value=todayStr(); $("clTags").value="";
    loadRich("class", "");
    $("classFormTitle").textContent="添加班级事务";
    $("classEditBar").classList.remove("on");
    $("clSubmit").textContent="添加";
    $("clCancel").style.display="none";
    $("clUpStatus").textContent="支持多选；单个文件建议不超过 "+MAX_FILE_MB+"MB";
    renderDraftFiles("class");
  }
}

/* ============================================================
   其它交互
   ============================================================ */
document.querySelectorAll(".tabs button").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    $("panel-"+btn.dataset.p).classList.add("active");
  };
});

/* 离开页面前提醒未保存 */
window.addEventListener("beforeunload", (e)=>{
  if(saving){ e.preventDefault(); e.returnValue=""; }
});

document.addEventListener("input", function(e){
  var t = e.target;
  if(t && t.id && ICON_FIELDS.indexOf(t.id) >= 0) refreshIconPrev(t.id);
});

/* 打开页面时如果本会话已登录过，直接进后台 */
(function boot(){
  if(isLogged()){
    $("loginScreen").style.display="none";
    $("mainPanel").style.display="block";
    initPanel();
  }
})();
