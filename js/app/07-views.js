/* ============================================================
   没有独立详情页的内容（名单 / 生活服务 / 影音 / 记账）：
   点搜索结果要「落到那一条」——切到它所在的栏目、滚到它、闪一下高亮，
   而不是只跳到栏目顶部让人自己找。
   ============================================================ */
function flashAndScroll(el){
  if(!el) return;
  if(el.scrollIntoView) el.scrollIntoView({behavior:"smooth", block:"center"});
  el.classList.add("flash-item");
  setTimeout(function(){ el.classList.remove("flash-item"); }, 1700);
}
function focusItem(tab, elemId){
  switchTab(tab);
  flashAndScroll(document.getElementById(elemId));
}
/* 生活服务：有网址就直接打开；没有网址就定位到那张卡片 */
function openService(i){
  var x = (blogData.lifeServices||[])[i];
  if(!x) return;
  if(x.url){ window.open(x.url, "_blank", "noopener"); return; }
  focusItem("life", "lifeCard-" + i);
}
/* 影音：定位到那一张卡片（音乐条目列表里没有卡片，就定位到影音区 / 播放器） */
function openMedia(i){
  var m = (blogData.media||[])[i];
  if(!m) return;
  switchTab("life");
  var el = document.getElementById("mediaCard-" + i) || document.getElementById("lifeMediaBox") || document.getElementById("mpCard");
  flashAndScroll(el);
}
/* 快速链接：直接打开 */
function openQuickLink(i){
  var l = (blogData.quickLinks||[])[i];
  if(l && l.url) window.open(l.url, "_blank", "noopener");
}

function renderRoster(){
  var FIELDS = [
    ["studentId","学号"], ["name","姓名"], ["gender","性别"], ["className","班级"],
    ["college","学院"], ["major","专业"], ["dorm","宿舍号"], ["advisor","导师"],
    ["ethnicity","民族"], ["political","政治面貌"], ["birthday","出生日期"],
    ["phone","电话"], ["email","邮箱"], ["idCard","身份证号"], ["homeAddress","家庭住址"], ["note","备注"]
  ];
  var SENSITIVE = ["idCard", "homeAddress", "phone", "email", "birthday"];
  var list = (blogData.roster||[]).filter(function(r){ return r.show !== false; });
  var globalShow = !!(blogData.rosterConfig && blogData.rosterConfig.showSensitive);
  document.getElementById("rosterList").innerHTML = list.map(function(r, ri){
    var hide = r.hide || [];
    var photoSrc = r.photo || (blogData.siteConfig && blogData.siteConfig.defaultAvatar) || "files/default-avatar.png";
    var photo = '<div class="roster-photo"><img src="'+esc(photoSrc)+'" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=&#39;none&#39;;var n=this.nextElementSibling;if(n){n.style.display=&#39;flex&#39;;}"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:1.4rem">'+esc((r.name||"?").slice(0,1))+'</span></div>';
    var rows = FIELDS.filter(function(f){
      var k = f[0];
      if(!r[k]) return false;
      if(hide.indexOf(k) >= 0) return false;
      if(SENSITIVE.indexOf(k) >= 0 && !globalShow) return false;
      return true;
    }).map(function(f){
      return '<div class="roster-row"><span class="k">'+f[1]+'</span><span class="v">'+esc(r[f[0]])+'</span></div>';
    }).join("");
    return '<div class="roster-card" id="rosterCard-'+ri+'">'+photo+'<div class="roster-info">'+rows+'</div>'+galleryHTML(r)+'</div>';
  }).join("") || '<div class="empty">暂无名单</div>';
}

/* 把前台的“所有东西”建成一张可搜索的表 */
function buildSearchIndex(){
  var idx = [];
  function push(type, title, parts, click){
    idx.push({type:type, title:String(title||""), text:parts.filter(Boolean).join("  "), click:click||""});
  }
  function fileNames(x){ return collectFiles(x).map(function(f){ return f.name; }).join(" "); }

  (blogData.courses||[]).forEach(function(c,i){
    push("课程", c.title, [c.title, c.desc, c.intro, (c.tags||[]).join(" "), fileNames(c), (c.progress||0)+"%"], "openCourse(" + i + ")");
  });
  (blogData.papers||[]).forEach(function(p,i){
    push("论文", p.title, [p.title, p.abstract, p.desc, (p.tags||[]).join(" "), p.year, p.status, fileNames(p)], "openPaper(" + i + ")");
  });
  (blogData.notices||[]).forEach(function(n,i){
    push("通知", n.title, [n.title, n.source, stripMd(n.content), n.date, fileNames(n)], "openNotice(" + i + ")");
  });
  (blogData.classItems||[]).forEach(function(c,i){
    push("班级", c.title, [c.title, c.type, c.content, c.date, fileNames(c)], "openClass(" + i + ")");
  });
  (blogData.diary||[]).forEach(function(d, i){
    var t = d.title || autoTitle(d.content, d.date);
    push("日记", t, [t, d.content, d.date, (d.media||[]).map(function(m){ return m.name; }).join(" ")], "openDiary(" + i + ")");
  });
  (blogData.advisor||[]).forEach(function(a, i){
    push("导师指导", (a.count ? ("第" + a.count + "次指导 · ") : "") + (a.date || ""), [a.content, a.date, String(a.count || "")], "openAdvisor(" + i + ")");
  });

  /* 名单：只索引前台真正可见的字段，隐藏的不进索引 */
  var SENS = ["idCard", "homeAddress", "phone", "email", "birthday"];
  var gShow = !!(blogData.rosterConfig && blogData.rosterConfig.showSensitive);
  var RF = [["studentId","学号"],["name","姓名"],["gender","性别"],["className","班级"],["college","学院"],["major","专业"],["dorm","宿舍号"],["advisor","导师"],["ethnicity","民族"],["political","政治面貌"],["birthday","出生日期"],["phone","电话"],["email","邮箱"],["idCard","身份证号"],["homeAddress","家庭住址"],["note","备注"]];
  (blogData.roster||[]).filter(function(r){ return r.show !== false; }).forEach(function(r, ri){
    var hid = r.hide || [];
    var parts = [];
    RF.forEach(function(f){
      var k = f[0];
      if(!r[k]) return;
      if(hid.indexOf(k) >= 0) return;
      if(SENS.indexOf(k) >= 0 && !gShow) return;
      parts.push(r[k]);
    });
    push("名单", r.name, parts, "focusItem('roster','rosterCard-" + ri + "')");
  });

  (blogData.lifeServices||[]).forEach(function(x, i){
    push("生活服务", x.title, [x.title, x.desc, x.url, fileNames(x)], "openService(" + i + ")");
  });
  /* 精选应用：点搜索结果直接打开那款应用的详情页 */
  (blogData.apps||[]).forEach(function(a, i){
    var txt = [a.name, a.summary, a.developer, (a.tags||[]).join(" "), a.intro];
    (a.features||[]).forEach(function(f){ txt.push(f.title, f.desc); });
    (a.downloads||[]).forEach(function(d){ txt.push(d.platform, d.desc); });
    push("精选应用", a.name, txt, "openApp(" + i + ")");
  });
  (blogData.media||[]).forEach(function(m, i){
    push("影音", m.title, [m.title, m.desc, m.type, fileNames(m)], "openMedia(" + i + ")");
  });
  (blogData.quickLinks||[]).forEach(function(l, i){
    push("快速链接", l.title, [l.title, l.url], "openQuickLink(" + i + ")");
  });
  (blogData.categories||[]).forEach(function(c){
    push("分类", c.name, [c.name], "switchTab('" + (c.section || "home") + "')");
  });
  (blogData.tags||[]).forEach(function(t){
    push("标签", t, [t], "openTag('" + String(t).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "')");
  });
  (blogData.ledger||[]).forEach(function(r, i){
    push("记账", (r.category || "其他") + " ¥" + (parseFloat(r.amount) || 0).toFixed(2), [r.desc, r.category, r.date, String(r.amount || "")], "focusItem('ledger','ledgerItem-" + i + "')");
  });

  idx.forEach(function(x){ x.tl = x.title.toLowerCase(); x.xl = x.text.toLowerCase(); });
  return idx;
}

/* 命中位置前后截一小段做预览 */
function snippetOf(r, q){
  var pos = r.xl.indexOf(q);
  if(pos < 0) return "";
  var start = Math.max(0, pos - 16);
  var txt = r.text.slice(start, start + 58);
  if(start > 0) txt = "…" + txt;
  if(start + 58 < r.text.length) txt = txt + "…";
  var safe = esc(txt);
  var qi = safe.toLowerCase().indexOf(esc(q).toLowerCase());
  if(qi >= 0) safe = safe.slice(0, qi) + "<b>" + safe.slice(qi, qi + q.length) + "</b>" + safe.slice(qi + q.length);
  return safe;
}

function gotoSearchResult(el){
  document.getElementById("searchResults").classList.remove("show");
  document.getElementById("searchInput").value = "";
  var code = el.getAttribute("data-c");
  if(code){ try { (new Function(code))(); } catch(e) { } }
}

function doSearch(q){
  var box = document.getElementById("searchResults");
  q = String(q||"").trim().toLowerCase();
  if(!q){ box.classList.remove("show"); return; }

  var idx = buildSearchIndex();
  var hits = idx.filter(function(x){ return x.tl.indexOf(q) >= 0 || x.xl.indexOf(q) >= 0; });

  /* 标题命中的排前面，然后按类型归拢 */
  hits.sort(function(a, b){
    var at = a.tl.indexOf(q) >= 0 ? 0 : 1;
    var bt = b.tl.indexOf(q) >= 0 ? 0 : 1;
    if(at !== bt) return at - bt;
    return a.type.localeCompare(b.type);
  });

  var head = '<div class="search-result-item" style="color:var(--text3);font-size:.76rem;cursor:default">找到 ' + hits.length + ' 条相关内容</div>';
  var body = hits.slice(0, 40).map(function(r){
    var snip = (r.tl.indexOf(q) >= 0) ? "" : snippetOf(r, q);
    return '<div class="search-result-item" data-c="' + esc(r.click) + '" onclick="gotoSearchResult(this)">'
      + '<div class="type">' + r.type + '</div>'
      + '<div class="title">' + esc(r.title) + '</div>'
      + (snip ? '<div class="snip">' + snip + '</div>' : '')
      + '</div>';
  }).join("");
  box.innerHTML = head + (body || '<div class="search-result-item" style="color:var(--text3)">没找到，换个关键词试试</div>');
  box.classList.add("show");
}

function setPageTitle(key, h1, p){
  document.getElementById("titleH1").textContent = h1 || (PAGE_TITLES[key]?PAGE_TITLES[key][0]:"思齐个人主页");
  document.getElementById("titleP").textContent = p !== undefined ? p : (PAGE_TITLES[key]?PAGE_TITLES[key][1]:"");
}
/* ============================================================
   右侧栏：正文之外的一切（文章信息 / 目录 / 资料附件）
   ============================================================ */
function showSideInfo(title, html){
  var card = document.getElementById("sideInfoCard");
  var t = document.getElementById("sideInfoTitle");
  var b = document.getElementById("sideInfoBody");
  if(!card || !t || !b) return;
  if(!html){ card.style.display = "none"; b.innerHTML = ""; return; }
  t.textContent = title || "文章信息";
  b.innerHTML = html;
  card.style.display = "";
}
/* 资料/附件：紧跟在文章正文下面。
   注意：课程/通知/论文各有各的详情区，必须用各自的容器 id（曾经共用 id 导致附件只显示在课程里） */
var FILE_SECTIONS = ["courseDetail", "noticeDetail", "paperDetail"];
function showSideFiles(section, title, html){
  var box = document.getElementById("articleFiles_" + section);
  var t = document.getElementById("articleFilesTitle_" + section);
  var b = document.getElementById("articleFilesBody_" + section);
  if(!box || !t || !b) return;
  if(!html){ box.style.display = "none"; b.innerHTML = ""; return; }
  t.textContent = title || "📎 资料附件";
  b.innerHTML = html;
  box.style.display = "";
}
/* 回到列表页时把文章专属的侧栏卡片收起来 */
function clearSideArticle(){
  showSideInfo("", "");
  FILE_SECTIONS.forEach(function(sec){ showSideFiles(sec, "", ""); });
}

/* 哪些栏目算「一篇文章」：打开它们时右侧栏只留目录/信息，不显示站点统计 */
var DETAIL_SECTIONS = ["courseDetail", "noticeDetail", "classDetail", "paperDetail", "appDetail", "diaryDetail", "advisorDetail"];
function isDetailSection(name){
  return DETAIL_SECTIONS.indexOf(name) >= 0;
}
function showSection(name){
  document.querySelectorAll(".section").forEach(function(s){s.classList.remove("active");});
  document.getElementById("sec-"+name).classList.add("active");
  /* 详情页：内容与目录由 openXxx() 在 showSection 之后填充，这里先清空上一个页面的目录 */
  renderToc([]);
  var detail = isDetailSection(name);
  /* 打开一篇文章时隐藏「站点统计」，右侧栏留给文章目录 */
  var statCard = document.getElementById("statCard");
  if(statCard) statCard.style.display = detail ? "none" : "";
  /* 打上 article-open：右侧栏「目录 + 快速链接」整块粘住，跟着文章滚动 */
  document.body.classList.toggle("article-open", detail);
  /* 只有文章详情页才显示「文章信息 / 目录 / 资料」这几张卡 */
  if(!detail){
    clearSideArticle();
  }
  window.scrollTo(0,0);
  setTimeout(initCoverPan, 60);
  /* 详情页正文是 showSection 之后才填的，推迟一拍再给 <pre> 补代码块样式 */
  setTimeout(function(){ enhanceCodeBlocks(document); }, 0);
  /* 切栏目后刷新一下迷你播放条（卡片可能已经不在视野里了） */
  if(typeof mpRequestMini === "function") mpRequestMini();
}
/* 有些视图没有自己的导航按钮，高亮要落到它所属的栏目上 */
var NAV_ALIAS = {};
function switchTab(t){
  setActiveNav(NAV_ALIAS[t] || t);
  /* 切栏目时清掉上一个页面的目录 */
  renderToc([]);
  setPageTitle(t);
  showSection(t);
  /* 标签聚合页需要按当前选中标签重画 */
  if(t === "tags") renderTagView(currentTag);
  closeDrawer();
}
/* 电脑导航和手机抽屉的高亮保持一致 */
function setActiveNav(t){
  document.querySelectorAll(".nav-links button, .nav-drawer-list button").forEach(function(b){
    b.classList.toggle("active", b.getAttribute("data-t") === t);
  });
}
/* ============================================================
   手机/平板导航抽屉
   ============================================================ */
function buildDrawer(){
  var list = document.getElementById("navDrawerList");
  if(!list) return;
  var buttons = document.querySelectorAll(".nav-links button");
  list.innerHTML = "";
  Array.prototype.forEach.call(buttons, function(btn){
    var b = document.createElement("button");
    b.type = "button";
    b.className = "nav-item";
    b.setAttribute("data-t", btn.getAttribute("data-t"));
    if(btn.classList.contains("active")) b.classList.add("active");
    b.textContent = btn.textContent;
    b.onclick = function(){ switchTab(btn.getAttribute("data-t")); };
    list.appendChild(b);
  });
}
function toggleDrawer(){ isDrawerOpen() ? closeDrawer() : openDrawer(); }
function isDrawerOpen(){
  var d = document.getElementById("navDrawer");
  return !!(d && d.classList.contains("show"));
}
function openDrawer(){
  var d = document.getElementById("navDrawer"), m = document.getElementById("navMask"), b = document.getElementById("navBurger");
  buildDrawer();
  setActiveNav(currentTab());
  if(d) d.classList.add("show");
  if(m) m.classList.add("show");
  if(b){ b.classList.add("open"); b.setAttribute("aria-expanded", "true"); }
  document.body.style.overflow = "hidden";
}
function closeDrawer(){
  var d = document.getElementById("navDrawer"), m = document.getElementById("navMask"), b = document.getElementById("navBurger");
  if(d) d.classList.remove("show");
  if(m) m.classList.remove("show");
  if(b){ b.classList.remove("open"); b.setAttribute("aria-expanded", "false"); }
  document.body.style.overflow = "";
}
/* 当前在哪个栏目：详情页归属它的列表栏目 */
function currentTab(){
  var active = document.querySelector(".section.active");
  if(!active) return "home";
  var map = { "sec-home": "home", "sec-courses": "courses", "sec-courseDetail": "courses",
    "sec-papers": "papers", "sec-paperDetail": "papers", "sec-notices": "notices",
    "sec-noticeDetail": "notices", "sec-class": "class", "sec-classDetail": "class",
    "sec-roster": "roster", "sec-life": "life", "sec-media": "life", "sec-ledger": "ledger",
    "sec-appDetail": "life",
    "sec-diary": "diary", "sec-diaryDetail": "diary", "sec-tags": "tags",
    "sec-advisor": "advisor", "sec-advisorDetail": "advisor", "sec-about": "about" };
  return map[active.id] || "home";
}
document.addEventListener("keydown", function(e){ if(e.key === "Escape") closeDrawer(); });
window.addEventListener("resize", function(){ if(window.innerWidth > 900) closeDrawer(); });

document.querySelectorAll(".nav-links button").forEach(function(btn){ btn.onclick = function(){switchTab(btn.dataset.t);}; });
buildDrawer();

document.addEventListener("click", function(e){
  if(!e.target.closest(".nav-search")) document.getElementById("searchResults").classList.remove("show");
});
