/* ============================================================
   标签聚合：把课程/论文/通知/班级/日记/导师里的标签汇到一个视图
   ============================================================ */
function tagIndex(){
  var map = {};
  /* 兼容两种写法：tags: ["a","b"] 或 tags: "a,b" */
  function norm(tags){
    if(Array.isArray(tags)) return tags.map(function(x){ return String(x||"").trim(); }).filter(Boolean);
    if(typeof tags === "string") return tags.split(/[,，、;；\s]+/).map(function(x){ return x.trim(); }).filter(Boolean);
    return [];
  }
  function add(tags, item){
    norm(tags).forEach(function(t){
      if(!t) return;
      if(!map[t]) map[t] = { items: [] };
      map[t].items.push(item);
    });
  }
  (blogData.courses||[]).forEach(function(c,i){
    add(c.tags, { kind:"课程", icon:"📚", title:c.title,
      desc:(c.desc||"") + (c.intro ? " " + mdText(c.intro) : ""),
      body:c.intro || c.desc || "",
      time:c.time||c.date||"", click:"openCourse("+i+")" });
  });
  (blogData.papers||[]).forEach(function(p,i){
    add(p.tags, { kind:"论文", icon:"📝", title:p.title, desc:p.abstract||p.desc||"",
      body:p.abstract || p.desc || "",
      time:p.time||p.date||"", click:"openPaper("+i+")" });
  });
  (blogData.notices||[]).forEach(function(n,i){
    add(n.tags, { kind:"通知", icon:"🔔", title:n.title, desc:mdText(n.content),
      body:n.content || "",
      time:n.time||n.date||"", click:"openNotice("+i+")" });
  });
  (blogData.classItems||[]).forEach(function(c,i){
    add(c.tags, { kind:"班级", icon:"👥", title:c.title, desc:mdText(c.content),
      body:c.content || "",
      time:c.time||c.date||"", click:"openClass("+i+")" });
  });
  (blogData.diary||[]).forEach(function(d,i){
    add(d.tags, { kind:"日记", icon:"📖", title:d.title||autoTitle(d.content, d.date),
      desc:mdText(d.content), body:d.content || "",
      time:d.time||d.date||"", click:"openDiary("+i+")" });
  });
  (blogData.advisor||[]).forEach(function(a,i){
    add(a.tags, { kind:"导师指导", icon:"🎓", title:(a.count?("第 "+a.count+" 次指导"):"指导记录"),
      desc:mdText(a.content), body:a.content || "",
      time:a.time||a.date||"", click:"openAdvisor("+i+")" });
  });
  Object.keys(map).forEach(function(k){ map[k].items.sort(byTimeDesc); });
  /* 标签排序：内容多的排前面，其次按原配置顺序 */
  var order = blogData.tags || [];
  map = Object.keys(map).sort(function(a,b){
    var d = map[b].items.length - map[a].items.length;
    if(d) return d;
    var ia = order.indexOf(a), ib = order.indexOf(b);
    if(ia < 0) ia = 999; if(ib < 0) ib = 999;
    return ia - ib || a.localeCompare(b);
  }).reduce(function(acc, k){ acc[k] = map[k]; return acc; }, {});
  return map;
}
/* 抽出文章里的小标题，做成分层目录（像参考站那样：1 / 1.1 / 1.1.1）
   直接用正则扫 HTML，不依赖 DOM 查询，任何环境下结果都一致 */
function mdInlineText(s){
  return String(s == null ? "" : s)
    .replace(/<[^>]*>/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
function outlineOfContent(content){
  var src = String(content || "");
  if(!src.trim()) return [];
  var html = looksHTML(src) ? src : mdRender(src);
  /* 取出所有 h1~h4（带 id 的记下来，方便点击跳转） */
  var re = /<h([1-4])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  var raw = [], m;
  while((m = re.exec(html))){
    var lvl = parseInt(m[1], 10);
    var idM = String(m[2] || "").match(/\bid\s*=\s*"([^"]+)"/);
    var txt = mdInlineText(m[3]);
    if(txt) raw.push({ lvl: lvl, txt: txt, id: idM ? idM[1] : "" });
  }
  if(!raw.length) return [];
  /* 文章里最小的一级标题当作第 1 层：这样「## 一、…」就是 1，而不会变成 1.1 */
  var base = Math.min.apply(null, raw.map(function(h){ return h.lvl; }));
  var heads = raw.map(function(h){ return { lvl: h.lvl - base + 1, txt: h.txt, id: h.id }; });
  /* 按层级编号：1 / 1.1 / 1.1.1 */
  var counters = [0, 0, 0, 0, 0, 0];
  heads.forEach(function(h){
    var i = h.lvl - 1;
    if(i < 0) i = 0;
    counters[i] = (counters[i] || 0) + 1;
    for(var j = i + 1; j < counters.length; j++) counters[j] = 0;
    var parts = [];
    for(var k = 0; k <= i; k++) parts.push(counters[k] || (k === 0 ? 1 : 0));
    h.no = parts.join(".");
  });
  return heads;
}
/* 一篇文章的目录卡片：有锚点就做成可点跳转的链接 */
function outlineHTML(item){
  var heads = outlineOfContent(item.body);
  if(heads.length < 2) return "";
  var jumpable = heads.some(function(h){ return h.id; });
  var list = heads.slice(0, 24).map(function(h){
    var cls = "tag-toc-lv" + Math.min(5, h.lvl);
    var label = '<span class="tag-toc-no">'+esc(h.no)+'</span> ' + esc(h.txt);
    if(jumpable && h.id){
      return '<a class="'+cls+'" href="#'+esc(h.id)+'" onclick="jumpTo(event,&quot;'+esc(h.id)+'&quot;)">'+label+'</a>';
    }
    return '<span class="'+cls+'">'+label+'</span>';
  }).join("");
  var more = heads.length > 24 ? '<div class="tag-toc-more">…还有 '+(heads.length - 24)+' 个小标题</div>' : '';
  return '<div class="tag-toc" onclick="event.stopPropagation()">'
    + '<div class="tag-toc-head">📑 文章目录</div>'
    + '<div class="tag-toc-list">'+list+more+'</div>'
    + '</div>';
}
function renderTagView(active){
  var idx = tagIndex();
  var keys = Object.keys(idx);
  var cloud = keys.map(function(t){
    var on = (t === active) ? ' style="background:var(--primary);color:#fff"' : "";
    return '<span class="tag-chip"'+on+' onclick="openTag(\''+esc(t).replace(/'/g,"\\'")+'\')">'+esc(t)+'</span>';
  }).join("");
  document.getElementById("tagCloudBox").innerHTML = keys.length
    ? '<div class="info-card"><h3>🏷️ 全部标签</h3><div class="tag-cloud">'+cloud+'</div></div>'
    : '<div class="empty">还没有任何标签</div>';

  var box = document.getElementById("tagPostsBox");
  if(!active){
    box.innerHTML = '<div class="tag-count">点上面的标签，查看全部相关内容。</div>';
    return;
  }
  var entry = idx[active];
  if(!entry){ box.innerHTML = '<div class="tag-count">没有找到标签「'+esc(active)+'」</div>'; return; }
  var byKind = {};
  entry.items.forEach(function(it){ (byKind[it.kind] = byKind[it.kind] || []).push(it); });
  var html = '<div class="tag-count">标签「<b>'+esc(active)+'</b>」下的内容</div>';
  Object.keys(byKind).forEach(function(kind){
    html += '<div class="tag-group-title"><span>'+esc(byKind[kind][0].icon)+' '+esc(kind)+'</span></div>';
    html += '<div class="list-cols cols-1">' + byKind[kind].map(function(it){
      return '<div class="article-card" onclick="'+it.click+'"><div class="article-body">'
        + '<div class="article-title">'+esc(it.title)+'</div>'
        + '<div class="chip-row">'+(it.time?'<span class="info-chip">🕐 '+esc(it.time)+'</span>':"")
        + '<span class="info-chip green">'+esc(it.kind)+'</span></div>'
        + (it.desc?'<div class="article-desc" style="margin-top:10px">'+esc(it.desc.slice(0,110))+'</div>':"")
        + outlineHTML(it)
        + '</div></div>';
    }).join("") + '</div>';
  });
  box.innerHTML = html;
}
function openTag(t){
  currentTag = String(t || "");
  setPageTitle("tags", "标签：" + currentTag, "该标签下的全部内容");
  renderToc([]);
  showSection("tags");
  renderTagView(currentTag);
  setActiveNav("tags");
  window.scrollTo(0, 0);
}

/* 快速链接：默认只显示前 N 个，其余收起来，避免右侧栏太长 */
var QUICK_LINKS_VISIBLE = 4;
var quickLinksExpanded = false;
function renderQuickLinks(){
  var list = blogData.quickLinks || [];
  document.getElementById("quickLinks").innerHTML = list.map(function(l, i){
    var ic = isImgUrl(l.icon) ? '<img src="'+esc(l.icon)+'" style="width:16px;height:16px;object-fit:cover;border-radius:4px;vertical-align:-3px">' : esc(l.icon||"");
    var extra = i >= QUICK_LINKS_VISIBLE ? " extra" : "";
    return '<div class="quick-link'+extra+'"><a href="'+esc(l.url)+'" target="_blank" rel="noopener"><span>'+ic+' '+esc(l.title)+'</span><span>→</span></a></div>';
  }).join("") || '';
  applyQuickLinksCollapse();
}
function applyQuickLinksCollapse(){
  var box = document.getElementById("quickLinks");
  var btn = document.getElementById("quickLinksToggle");
  if(!box || !btn) return;
  var total = (blogData.quickLinks||[]).length;
  var hidden = Math.max(0, total - QUICK_LINKS_VISIBLE);
  box.classList.toggle("collapsed", !quickLinksExpanded);
  btn.hidden = hidden === 0;
  btn.textContent = quickLinksExpanded ? "收起 ▲" : ("展开更多（还有 " + hidden + " 个）▼");
}
function toggleQuickLinks(){
  quickLinksExpanded = !quickLinksExpanded;
  applyQuickLinksCollapse();
}

function renderFilters(){
  document.getElementById("paperFilters").innerHTML = PAPER_FILTERS.map(function(f){
    return '<button class="'+(paperFilter===f.key?"active":"")+'" onclick="setPaperFilter(\''+f.key+'\')">'+f.label+'</button>';
  }).join("");
  var types = ["all"].concat(CLASS_TYPES);
  document.getElementById("classFilters").innerHTML = types.map(function(t){
    return '<button class="'+(classFilter===t?"active":"")+'" onclick="setClassFilter(\''+t+'\')">'+(t==="all"?"全部":t)+'</button>';
  }).join("");
  /* 音乐只在右侧的歌曲播放器里出现，生活服务页不再重复列一遍 */
  var mf = [["all","全部"],["video","视频"],["image","图片"]];
  document.getElementById("mediaFilters").innerHTML = mf.map(function(x){
    return '<button class="'+(mediaFilter===x[0]?"active":"")+'" onclick="setMediaFilter(\''+x[0]+'\')">'+x[1]+'</button>';
  }).join("");
}

function setPaperFilter(k){ paperFilter = k; renderFilters(); renderPapers(); }
/* 换筛选条件时回到第 1 页，否则可能停在一个不存在的页码上 */
function setClassFilter(k){ classFilter = k; pageState["class"] = 1; renderFilters(); renderClass(); }

function applyColumns(){
  var n = String((blogData.siteConfig && blogData.siteConfig.columns) || "1");
  if(["1","2","3"].indexOf(n) < 0) n = "1";
  ["homeList","coursesList","papersList","noticesList","classList"].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.className = "list-cols cols-" + n;
  });
}
/* 按图片比例自动决定往哪个方向滑：图片比框更"高"就纵向滑，否则横向滑 */
function initCoverPan(){
  var els = document.querySelectorAll(".article-cover.cover-pan");
  Array.prototype.forEach.call(els, function(el){
    if(el.getAttribute("data-pan-axis")) return;
    var url = el.getAttribute("data-bg");
    if(!url) return;
    var boxW = el.clientWidth, boxH = el.clientHeight;
    if(!boxW || !boxH) return;              /* 还在隐藏的栏目里，等显示后再算 */
    var im = new Image();
    im.onload = function(){
      var ia = im.naturalWidth / im.naturalHeight;
      var ba = boxW / boxH;
      var axis = (ia < ba) ? "pan-y" : "pan-x";
      el.classList.add(axis);
      el.setAttribute("data-pan-axis", axis);
    };
    im.onerror = function(){
      el.classList.add("pan-y");
      el.setAttribute("data-pan-axis", "pan-y");
    };
    im.src = url;
  });
}

function renderAll(){
  renderProfile();
  renderCategories();
  renderTags();
  renderQuickLinks();
  renderFilters();
  initWelcome();
  renderNotice();
  renderHome();
  renderCourses();
  renderPapers();
  renderNotices();
  renderClass();
  renderLife();
  renderApps();
  renderMedia();
  renderRoster();
  renderLedger();
  renderDiary();
  renderAdvisor();
  renderFriends();
  renderMusic();
  renderTagView(currentTag);
  initFrontForms();
  applyColumns();
  setTimeout(initCoverPan, 60);

  /* 交互增强：懒加载图片、给各列表挂入场动画、应用站点配置 */
  lazyImages(document);
  ["homeList", "coursesList", "papersList", "noticesList", "classList", "lifeList", "appList", "mediaList", "diaryList", "advisorList", "ledgerList", "rosterList"]
    .forEach(function(id){ markReveal(document.getElementById(id), ":scope > *"); });
  markReveal(document.querySelector(".left-col"), ":scope > *");
  applySiteConfig();

  document.getElementById("aboutContent").textContent = blogData.siteConfig.about || "暂无介绍";
  renderStats();
  enhanceCodeBlocks(document);      /* 正文里裸着的 <pre> 也补上代码块样式 */
}

/* ============================================================
   课程「未完成」标记：进度不到 100% 就标出来（纯前端推导，不用改数据）
   ============================================================ */
function courseDone(c){
  if(!c) return false;
  if(c.done === true) return true;
  if(String(c.status||"") === "已完成") return true;
  return Number(c.progress || 0) >= 100;
}
function courseBadgeHTML(c){
  var done = courseDone(c);
  var p = Number(c.progress || 0);
  return done
    ? '<span class="course-badge done">✓ 已完成</span>'
    : '<span class="course-badge">进行中 ' + p + '%</span>';
}

/* ============================================================
   站点配置 → 页面（标题文案统一在这里改；改内容请到管理后台）
   ============================================================ */
function applySiteConfig(){
  var sc = (blogData && blogData.siteConfig) || {};
  var title = sc.title || "思齐个人主页";
  /* 浏览器标签标题：只用「网站标题」，不再拼「XX的博客」后缀
     （标题在管理后台「站点设置 → 网站标题」里改） */
  var tab = title.length > 16 ? title.slice(0, 16) + "…" : title;
  document.title = tab;
  var h1 = document.getElementById("titleH1"); if(h1) h1.textContent = title;
  var p = document.getElementById("titleP"); if(p) p.textContent = sc.subtitle || "";
  /* 浏览器标签上的小图标 = 后台「头像」（填图片地址才替换，emoji 保留内置图标） */
  applyFavicon(sc.avatar);
  var brand = document.querySelector(".nav-brand");
  if(brand) brand.innerHTML = '<span class="dot"></span>' + esc((sc.name || "思齐") + "的博客");
}
/* 把后台设置的头像图片同步成浏览器标签图标；不是图片地址就恢复内置 favicon */
function applyFavicon(v){
  var s = String(v == null ? "" : v).trim();
  var link = document.getElementById("dynFavicon");
  if(!isImgUrl(s)){
    if(link && link.parentNode) link.parentNode.removeChild(link);
    return;
  }
  if(!link){
    link = document.createElement("link");
    link.id = "dynFavicon";
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = /[.]svg($|[?#])/i.test(s) ? "image/svg+xml" : "image/png";
  link.href = s;
}

function itemTime(x){
  return String((x && x.time) || (x && x.date) || "");
}
function byTimeDesc(a, b){
  var ta = itemTime(a), tb = itemTime(b);
  if(!ta && !tb) return 0;
  if(!ta) return 1;
  if(!tb) return -1;
  return tb.localeCompare(ta);
}

/* ============================================================
   分页：每页 PAGE_SIZE 条，底部数字页码 + 上一页/下一页
   ============================================================ */
function renderPaged(key, listId, pagerId, items, buildCard, emptyText, pageSize){
  var box = document.getElementById(listId);
  var pagerBox = document.getElementById(pagerId);
  if(!box) return;
  var size = Math.max(1, Number(pageSize) || PAGE_SIZE);
  var total = items.length;
  var pages = Math.max(1, Math.ceil(total / size));
  var page = pageState[key] || 1;
  if(page > pages) page = pages;
  if(page < 1) page = 1;
  pageState[key] = page;

  var slice = items.slice((page - 1) * size, page * size);
  box.innerHTML = slice.map(function(it, i){ return buildCard(it, (page - 1) * size + i); }).join("")
    || '<div class="empty">' + (emptyText || "暂无内容") + '</div>';
  /* 新渲染出来的卡片：进视口才淡入上浮，并让图片懒加载 */
  markReveal(box, ":scope > *");
  lazyImages(box);

  if(!pagerBox) return;
  if(pages <= 1){ pagerBox.innerHTML = ""; return; }

  /* 页码多了就折叠：1 … 4 5 6 … 12 */
  var nums = [];
  for(var p = 1; p <= pages; p++){
    if(p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if(nums[nums.length - 1] !== "…") nums.push("…");
  }
  var html = '<button type="button" ' + (page === 1 ? "disabled" : "") + ' onclick="goPage(\'' + key + "'," + (page - 1) + ')">← 上一页</button>';
  nums.forEach(function(n){
    if(n === "…"){ html += '<span class="pager-dots">…</span>'; return; }
    html += '<button type="button" class="' + (n === page ? "active" : "") + '" onclick="goPage(\'' + key + "'," + n + ')">' + n + '</button>';
  });
  html += '<button type="button" ' + (page === pages ? "disabled" : "") + ' onclick="goPage(\'' + key + "'," + (page + 1) + ')">下一页 →</button>';
  pagerBox.innerHTML = html;
}
function goPage(key, p){
  pageState[key] = p;
  var map = { home: renderHome, courses: renderCourses, notices: renderNotices, "class": renderClass };
  if(map[key]) map[key]();
  var sec = document.getElementById("sec-" + key);
  if(sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* 首页：分类筛选 + 宽内容卡片（封面 / 标签 / 摘要 / 字数 / 阅读时长） */
var homeFilterKey = "all";
function hpTagsOf(v){
  if(Array.isArray(v)) return v.filter(Boolean).map(String);
  return String(v || "").split(/[,，]/).map(function(s){ return s.trim(); }).filter(Boolean);
}
/* 摘要用的纯文本：先把 HTML 标签和实体去掉，再过一遍 Markdown 清理 */
function plainText(s){
  return String(s == null ? "" : s)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, "&");
}
/* 首页显示哪几类内容：后台「首页」里勾选，没配过就用默认四类 */
function homeSections(){
  var sc = blogData.siteConfig || {};
  var arr = sc.homeSections;
  if(!Array.isArray(arr)) arr = HOME_SECTIONS_DEFAULT;
  return HOME_SECTIONS.filter(function(s){ return arr.indexOf(s.key) >= 0; }).map(function(s){ return s.key; });
}
function homeSectionsOn(){
  var on = homeSections();
  return { courses: on.indexOf("courses") >= 0, papers: on.indexOf("papers") >= 0, notices: on.indexOf("notices") >= 0, classItems: on.indexOf("classItems") >= 0, diary: on.indexOf("diary") >= 0 };
}
function homeItems(){
  var out = [], on = homeSectionsOn();
  function add(type, obj, icon, title, text, click){
    var full = stripMd(plainText(text)).replace(/\s+/g, " ").trim();
    out.push({
      type: type, item: obj, icon: icon, title: title, desc: full,
      words: full.replace(/\s/g, "").length,
      tags: hpTagsOf(obj && obj.tags).slice(0, 4),
      top: !!(obj && (obj.top === true || obj.pinned === true)),
      time: (obj && (obj.time || obj.date)) || "",
      click: click
    });
  }
  if(on.courses)    (blogData.courses||[]).forEach(function(c,i){ add("课程", c, c.icon||"📚", c.title, c.intro||c.desc, "openCourse("+i+")"); });
  if(on.papers)     (blogData.papers||[]).forEach(function(p,i){ add("论文", p, "📝", p.title, p.abstract||p.desc, "openPaper("+i+")"); });
  if(on.notices)    (blogData.notices||[]).forEach(function(n,i){ add("通知", n, "🔔", n.title, n.content, "openNotice("+i+")"); });
  if(on.classItems) (blogData.classItems||[]).forEach(function(c,i){ add("班级", c, "👥", c.title, c.content, "openClass("+i+")"); });
  if(on.diary)      (blogData.diary||[]).forEach(function(d,i){ add("日记", d, "📖", d.title || "无标题", d.content, "openDiary("+i+")"); });
  out.sort(byTimeDesc);          /* 最新的排最前面 */
  return out;
}
function homeCardHTML(a){
  var sc = blogData.siteConfig || {};
  var imgs = collectImages(a.item || {});
  var bg = (imgs[0] && imgs[0].url) || sc.defaultImage || "";
  var cover = bg
    ? '<div class="ac-cover" style="background-image:url(' + esc(bg) + ')"></div>'
    : '<div class="ac-cover ac-cover-none">' + (isImgUrl(a.icon) ? '<img src="' + esc(a.icon) + '" alt="">' : esc(a.icon)) + '</div>';
  var nf = collectFiles(a.item || {}).length;
  return '<article class="article-card ac-card" onclick="' + a.click + '">'
    + '<div class="ac-body">'
    +   '<div class="ac-top">' + (a.top ? '<span class="ac-badge top">置顶</span>' : "") + '<span class="ac-badge">' + esc(a.type) + '</span></div>'
    +   '<h3 class="ac-title">' + esc(a.title) + '</h3>'
    +   (a.tags.length ? '<div class="ac-tags">' + a.tags.map(function(t){ return "<span># " + esc(t) + "</span>"; }).join("") + '</div>' : "")
    +   (a.desc ? '<p class="ac-desc">' + esc(a.desc.slice(0, 150)) + '</p>' : "")
    +   '<div class="ac-meta">'
    +     (a.time ? '<span>📅 ' + esc(a.time.slice(0, 10)) + '</span>' : "")
    +     '<span>✍ ' + a.words + ' 字</span>'
    +     '<span>⏱ ' + Math.max(1, Math.round(a.words / 400)) + ' 分钟</span>'
    +     (nf ? '<span>📎 ' + nf + ' 个文件</span>' : "")
    +   '</div>'
    + '</div>' + cover + '</article>';
}
function setHomeFilter(k){ homeFilterKey = k; pageState.home = 1; renderHome(); }
function renderHome(){
  var items = homeItems();
  var counts = { all: items.length };
  items.forEach(function(a){ counts[a.type] = (counts[a.type] || 0) + 1; });
  var bar = document.getElementById("homeFilter");
  if(bar){
    /* 只列「后台允许在首页显示」的类型 */
    var types = HOME_SECTIONS.filter(function(s){ return homeSections().indexOf(s.key) >= 0; }).map(function(s){ return s.name; });
    var keys = ["all"].concat(types.filter(function(k){ return counts[k]; }));
    if(homeFilterKey !== "all" && keys.indexOf(homeFilterKey) < 0) homeFilterKey = "all";
    bar.innerHTML = keys.map(function(k){
      return '<button class="hf-pill' + (homeFilterKey === k ? " on" : "") + '" type="button" onclick="setHomeFilter(\'' + k + '\')">'
        + (k === "all" ? "全部" : k) + "<em>" + (counts[k] || 0) + "</em></button>";
    }).join("");
  }
  var list = homeFilterKey === "all" ? items : items.filter(function(a){ return a.type === homeFilterKey; });
  renderPaged("home", "homeList", "homePager", list, homeCardHTML, "暂无内容", HOME_PAGE_SIZE);
}

function renderCourses(){
  var arr = (blogData.courses||[]).map(function(c,i){ return {c:c, i:i}; });
  arr.sort(function(a,b){ return byTimeDesc(a.c, b.c); });
  renderPaged("courses", "coursesList", "coursesPager", arr, function(it){
    var c = it.c, i = it.i;
    var nf = collectFiles(c).length, pg = Number(c.progress || 0);
    var done = courseDone(c);
    return '<div class="article-card'+(done?"":" course-todo")+'" onclick="openCourse('+i+')">'+coverHTML(c, c.icon||"📐")
      + '<div class="article-body">'
      +   '<div class="article-title">'+esc(c.title)+'</div>'
      +   '<div class="chip-row">'+courseBadgeHTML(c)+'<span class="info-chip green">📎 '+nf+' 个资料</span>'
      +   (c.time?'<span class="info-chip">🕐 '+esc(c.time)+'</span>':"")+'</div>'
      +   '<div class="progress-bar-wrap" style="margin:12px 0 10px"><div class="progress-bar" style="width:'+pg+'%"></div></div>'
      +   (c.desc?'<div class="article-desc">'+esc(c.desc)+'</div>':"")
      +   (c.intro?'<div class="article-desc" style="margin-top:6px;color:var(--text3)">'+esc(mdText(c.intro).slice(0,80))+'</div>':"")
      + '</div></div>';
  }, "暂无课程");
}
/* ============================================================
   「从哪儿来，就回哪儿去」
   打开详情页之前，记住来路（哪个栏目 + 当时滚到哪一行），
   点「← 返回」时原样回去 —— 而不是每次都回到栏目顶部。
   在详情页之间用「上一篇/下一篇」跳转时，不会覆盖最初的来路。
   ============================================================ */
var navOrigin = null;
function activeSectionId(){
  var a = document.querySelector(".section.active");
  return a ? a.id : "";
}
function rememberOrigin(){
  if(/Detail$/.test(activeSectionId())) return;   /* 已经在详情页里跳转，保持最初的来路 */
  navOrigin = { tab: currentTab(), y: (window.pageYOffset || document.documentElement.scrollTop || 0) };
}
function backToOrigin(fallbackTab){
  var o = navOrigin;
  navOrigin = null;
  switchTab((o && o.tab) ? o.tab : fallbackTab);
  if(o && typeof o.y === "number"){
    /* showSection 里会 scrollTo(0,0)，等它跑完再把位置还原 */
    setTimeout(function(){ window.scrollTo(0, o.y); }, 0);
  }
}

function openCourse(idx){
  rememberOrigin();
  currentCourseIdx = idx;
  var c = blogData.courses[idx];
  var banner = document.getElementById("cdIcon");
  var icVal = c.icon || "📐";
  /* 顶部横幅：图标是图片就铺满，否则显示大图标 */
  banner.innerHTML = isImgUrl(icVal) ? '<img src="'+esc(icVal)+'" alt="">' : esc(icVal);
  document.getElementById("cdName").textContent = c.title;

  var files = collectFiles(c);
  var progress = c.progress || 0;
  /* 关键信息做成小圆片，一眼能看完 */
  document.getElementById("cdChips").innerHTML =
      '<span class="info-chip green">📎 <b>'+files.length+'</b> 个资料</span>'
    + '<span class="info-chip">📈 进度 <b>'+progress+'%</b></span>'
    + (c.time ? '<span class="info-chip">🕐 '+esc(c.time)+'</span>' : '');

  /* 课程信息 → 右侧栏「文章信息」卡片 */
  showSideInfo("📊 课程信息",
      '<div class="kv"><span class="k">课程名称</span><span class="v">'+esc(c.title)+'</span></div>'
    + '<div class="kv"><span class="k">资料数量</span><span class="v">'+files.length+' 个</span></div>'
    + '<div class="kv"><span class="k">学习进度</span><span class="v">'+progress+'%</span></div>'
    + (c.time ? '<div class="kv"><span class="k">更新时间</span><span class="v">'+esc(c.time)+'</span></div>' : ''));

  /* 课程介绍按 Markdown 渲染，写了 ## 小标题就会自动生成目录 */
  var introBox = document.getElementById("cdIntro");
  introBox.innerHTML = mdRenderHTML(c.intro) || '<div class="empty">暂无课程介绍</div>';
  introBox.className = "md-body";
  document.getElementById("cdProgressBar").style.width = progress+"%";
  document.getElementById("cdProgressText").innerHTML = "学习进度：<b>"+progress+"%</b>";
  /* 资料/附件 → 正文下面（没有资料就不显示这张卡） */
  var filesHtml = galleryHTML(c) + fileListGrouped(c);
  var hasFiles = collectFiles(c).length > 0;
  showSideFiles("courseDetail", hasFiles ? "📎 课程资料" : "", hasFiles ? filesHtml : "");
  setPageTitle("courseDetail", c.title, "");
  showSection("courseDetail");
  /* 目录要在 showSection 之后生成，否则会被里面的 renderToc([]) 清掉 */
  buildToc(introBox);
  /* 上一篇 / 下一篇：按列表（时间倒序）取相邻的课程 */
  renderPnNav("cdPn", blogData.courses||[], idx, "openCourse");
}
function backToCourses(){ currentCourseIdx = -1; backToOrigin("courses"); }

function renderPapers(){
  var all = blogData.papers||[];
  var f = PAPER_FILTERS.filter(function(x){return x.key===paperFilter;})[0];
  var list = (f && f.match) ? all.filter(function(p){return f.match(p.status);}) : all;
  document.getElementById("papersList").innerHTML = list.map(function(p){
    var idx = all.indexOf(p);
    var nf = collectFiles(p).length;
    return '<div class="article-card" onclick="openPaper('+idx+')">'+coverHTML(p, "📝")
      + '<div class="article-body">'
      +   '<div class="article-title">'+esc(p.title)+'</div>'
      +   '<div class="chip-row">'
      +     (p.status?'<span class="info-chip green">'+esc(p.status)+'</span>':"")
      +     (p.year?'<span class="info-chip">📅 '+esc(p.year)+'</span>':"")
      +     (nf?'<span class="info-chip">📎 '+nf+' 个文件</span>':"")
      +     (p.time?'<span class="info-chip">🕐 '+esc(p.time)+'</span>':"")
      +   '</div>'
      +   '<div class="article-desc" style="margin-top:10px">'+esc(mdText(p.abstract||p.desc||"").slice(0,110))+'</div>'
      +   '<div class="article-tags">'+((p.tags||[]).map(function(t){return '<span class="tag-chip">'+esc(t)+'</span>';}).join(""))+'</div>'
      +   imgStrip(p)
      + '</div></div>';
  }).join("") || '<div class="empty">暂无匹配的论文</div>';
}
function openPaper(idx){
  rememberOrigin();
  currentPaperIdx = idx;
  var p = blogData.papers[idx];
  var files = collectFiles(p);
  var icVal = p.icon || "📝";
  var banner = document.getElementById("pdIcon");
  banner.innerHTML = isImgUrl(icVal) ? '<img src="'+esc(icVal)+'" alt="">' : esc(icVal);
  document.getElementById("pdTitle").textContent = p.title;
  /* 标题下只留小圆片，详细信息去右侧栏 */
  document.getElementById("pdChips").innerHTML =
      (p.status ? '<span class="info-chip green">'+esc(p.status)+'</span>' : '')
    + (p.year ? '<span class="info-chip">📅 '+esc(p.year)+'</span>' : '')
    + (files.length ? '<span class="info-chip">📎 <b>'+files.length+'</b> 个文件</span>' : '')
    + (p.time ? '<span class="info-chip">🕐 '+esc(p.time)+'</span>' : '');
  showSideInfo("📄 论文信息",
      '<div class="kv"><span class="k">标题</span><span class="v">'+esc(p.title)+'</span></div>'
    + '<div class="kv"><span class="k">状态</span><span class="v">'+esc(p.status||"—")+'</span></div>'
    + (p.year ? '<div class="kv"><span class="k">年份</span><span class="v">'+esc(p.year)+'</span></div>' : '')
    + '<div class="kv"><span class="k">文件数</span><span class="v">'+files.length+' 个</span></div>'
    + ((p.tags||[]).length ? '<div class="kv"><span class="k">标签</span><span class="v">'+p.tags.map(function(t){return '<a href="javascript:;" onclick="openTag(\''+esc(t).replace(/'/g,"\\'")+'\')" style="color:var(--primary-dark);text-decoration:none">'+esc(t)+'</a>';}).join("、")+'</span></div>' : '')
    + (p.time ? '<div class="kv"><span class="k">更新时间</span><span class="v">'+esc(p.time)+'</span></div>' : ''));
  /* 摘要按富文本/Markdown 渲染 —— 之前这里用 textContent，HTML 标签会当成文字显示出来 */
  var ab = document.getElementById("pdAbstract");
  ab.innerHTML = mdRenderHTML(p.abstract) || '<div class="empty">还没有填摘要</div>';
  ab.className = "md-body";
  var desc = document.getElementById("pdDesc");
  desc.innerHTML = mdRenderHTML(p.desc) || "";
  desc.style.display = (p.desc && String(p.desc).trim()) ? "" : "none";
  var hasFiles = files.length > 0;
  showSideFiles("paperDetail", hasFiles ? "📎 论文文件" : "", hasFiles ? (galleryHTML(p) + fileListGrouped(p)) : "");
  setPageTitle("paperDetail", p.title, "");
  showSection("paperDetail");
  /* 摘要 + 备注一起出目录；同样要放在 showSection 之后 */
  buildToc([ab, desc]);
  /* 上一篇 / 下一篇：在当前筛选结果里走（这样不会跳到被筛掉的文章上） */
  var pf = PAPER_FILTERS.filter(function(x){ return x.key === paperFilter; })[0];
  var pAll = blogData.papers || [];
  var pList = (pf && pf.match) ? pAll.filter(function(p){ return pf.match(p.status); }) : pAll;
  if(pList.indexOf(p) < 0) pList = pAll;
  renderPnNav("pdPn", pList, pList.indexOf(p), "openPaper", { full: pAll });
}
function backToPapers(){ currentPaperIdx = -1; backToOrigin("papers"); }
