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
  (blogData.collections||[]).forEach(function(c,i){
    add(c.tags, { kind:"合辑", icon:c.icon||"📦", title:c.title,
      desc:(c.desc||"") + (c.intro ? " " + mdText(c.intro) : ""),
      body:c.intro || c.desc || "",
      time:c.time||c.created||"", click:"openCollection("+i+")" });
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
  infoSubtab = "tags";
  setPageTitle("tags", "标签：" + currentTag, "该标签下的全部内容");
  renderToc([]);
  showSection("tags");
  renderTagView(currentTag);
  setActiveNav("tags");
  document.querySelectorAll("[data-info-tab]").forEach(function(btn){
    btn.classList.toggle("active", btn.getAttribute("data-info-tab") === "tags");
  });
  window.scrollTo(0, 0);
  syncEntryRoute("tags", currentTag);
}

/* 快速链接：默认只显示前 N 个，其余收起来，避免右侧栏太长 */
var QUICK_LINKS_VISIBLE = 4;
var quickLinksExpanded = false;
function renderQuickLinks(){
  var list = blogData.quickLinks || [];
  document.getElementById("quickLinks").innerHTML = list.map(function(l, i){
    var ic = isImgUrl(l.icon) ? '<img src="'+esc(l.icon)+'" alt="" width="16" height="16" style="width:16px;height:16px;object-fit:cover;border-radius:4px;vertical-align:-3px">' : esc(l.icon||"");
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
  renderCollections();
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
  /* 浏览器标签图标优先用单独设置；没设置时兼容旧配置，沿用头像图片 */
  applyFavicon(sc.favicon || sc.avatar);
  var brand = document.querySelector(".nav-brand");
  if(brand) brand.innerHTML = '<span class="dot"></span>' + esc((sc.name || "思齐") + "的博客");
}
/* 把后台设置的图标同步成浏览器标签 / iOS 桌面图标；不是图片地址就恢复内置 favicon */
var FAVICON_DEFAULT = {
  svg: "assets/favicon.svg",
  ico: "assets/favicon.ico",
  apple: "assets/apple-touch-icon.png"
};
function faviconMime(s){
  if(/\.svg($|[?#])/i.test(s)) return "image/svg+xml";
  if(/\.jpe?g($|[?#])/i.test(s)) return "image/jpeg";
  if(/\.webp($|[?#])/i.test(s)) return "image/webp";
  if(/\.ico($|[?#])/i.test(s)) return "image/x-icon";
  return "image/png";
}
function restoreDefaultFavicon(){
  var svg = document.getElementById("siteFaviconSvg");
  var ico = document.getElementById("siteFaviconIco");
  var apple = document.getElementById("siteAppleTouchIcon");
  if(!svg){
    svg = document.createElement("link");
    svg.id = "siteFaviconSvg";
    svg.rel = "icon";
    document.head.appendChild(svg);
  }
  svg.href = FAVICON_DEFAULT.svg;
  svg.type = "image/svg+xml";
  svg.removeAttribute("sizes");
  if(!ico){
    ico = document.createElement("link");
    ico.id = "siteFaviconIco";
    ico.rel = "icon";
    if(svg.parentNode) svg.parentNode.insertBefore(ico, svg.nextSibling);
    else document.head.appendChild(ico);
  }
  ico.href = FAVICON_DEFAULT.ico;
  ico.removeAttribute("type");
  ico.sizes = "any";
  if(!apple){
    apple = document.createElement("link");
    apple.id = "siteAppleTouchIcon";
    apple.rel = "apple-touch-icon";
    document.head.appendChild(apple);
  }
  apple.href = FAVICON_DEFAULT.apple;
  try{ localStorage.removeItem("benyia_site_favicon"); }catch(e){}
}
function applyFavicon(v){
  var s = String(v == null ? "" : v).trim();
  var oldDyn = document.getElementById("dynFavicon");
  var oldDynApple = document.getElementById("dynAppleTouchIcon");
  if(oldDyn && oldDyn.parentNode) oldDyn.parentNode.removeChild(oldDyn);
  if(oldDynApple && oldDynApple.parentNode) oldDynApple.parentNode.removeChild(oldDynApple);
  if(!isImgUrl(s)){
    restoreDefaultFavicon();
    return;
  }

  try{ localStorage.setItem("benyia_site_favicon", s); }catch(e){}
  var type = faviconMime(s);
  var svg = document.getElementById("siteFaviconSvg");
  var ico = document.getElementById("siteFaviconIco");
  var apple = document.getElementById("siteAppleTouchIcon");
  if(ico && ico.parentNode) ico.parentNode.removeChild(ico);
  if(!svg){
    svg = document.createElement("link");
    svg.id = "siteFaviconSvg";
    svg.rel = "icon";
    document.head.appendChild(svg);
  }
  /* 替换节点而不只是改 href：Chrome / Edge 对标签图标的缓存很顽固 */
  if(svg.getAttribute("href") !== s || svg.type !== type){
    var parent = svg.parentNode;
    var fresh = svg.cloneNode(false);
    fresh.href = s;
    fresh.type = type;
    fresh.sizes = "any";
    if(parent) parent.replaceChild(fresh, svg);
    else document.head.appendChild(fresh);
    svg = fresh;
  }
  if(!apple){
    apple = document.createElement("link");
    apple.id = "siteAppleTouchIcon";
    apple.rel = "apple-touch-icon";
    document.head.appendChild(apple);
  }
  apple.href = s;
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
  var map = { home: renderHome, courses: renderCourses, collections: renderCollections, notices: renderNotices, "class": renderClass };
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
  return { courses: on.indexOf("courses") >= 0, collections: on.indexOf("collections") >= 0, papers: on.indexOf("papers") >= 0, notices: on.indexOf("notices") >= 0, classItems: on.indexOf("classItems") >= 0, diary: on.indexOf("diary") >= 0 };
}
function homeItems(){
  var out = [], on = homeSectionsOn();
  function add(type, obj, icon, title, text, click, route, routeTitle){
    var full = stripMd(plainText(text)).replace(/\s+/g, " ").trim();
    var created = (obj && (obj.time || obj.date)) || "";
    var updated = (obj && (obj.updated || obj.updatedAt || obj.time || obj.date)) || created;
    out.push({
      type: type, item: obj, icon: icon, title: title, desc: full,
      words: full.replace(/\s/g, "").length,
      tags: hpTagsOf(obj && obj.tags).slice(0, 4),
      top: !!(obj && (obj.top === true || obj.pinned === true)),
      time: created,
      updated: updated,
      click: click,
      path: route || (type === "课程" ? "/courses/" : type === "论文" ? "/papers/" : type === "通知" ? "/notices/" : type === "班级" ? "/class/" : type === "合辑" ? "/collections/" : type === "日记" ? "/diary/" : "/") + encodeURIComponent(routeSlug(routeTitle || title || "")),
      key: type + "|" + (title || "") + "|" + created
    });
  }
  if(on.courses)    (blogData.courses||[]).forEach(function(c,i){ add("课程", c, c.icon||"📚", c.title, c.intro||c.desc, "openCourse("+i+")"); });
  if(on.collections)(blogData.collections||[]).forEach(function(c,i){ add("合辑", c, c.icon||"📦", c.title, c.intro||c.desc, "openCollection("+i+")"); });
  if(on.papers)     (blogData.papers||[]).forEach(function(p,i){ add("论文", p, "📝", p.title, p.abstract||p.desc, "openPaper("+i+")"); });
  if(on.notices)    (blogData.notices||[]).forEach(function(n,i){ add("通知", n, "🔔", n.title, n.content, "openNotice("+i+")"); });
  if(on.classItems) (blogData.classItems||[]).forEach(function(c,i){ add("班级", c, "👥", c.title, c.content, "openClass("+i+")"); });
  if(on.diary)      (blogData.diary||[]).forEach(function(d,i){ add("日记", d, "📖", d.title || "无标题", d.content, "openDiary("+i+")", "", d.title || autoTitle(d.content, d.date)); });
  out.sort(byTimeDesc);          /* 最新的排最前面 */
  return out;
}
/* ============================================================
   首页互动：点赞 / 收藏 / 分享 / 评论 / 浏览量
   静态站没有多人后端，这些状态保存在当前浏览器；
   分享会调用系统分享或复制链接。
   ============================================================ */
const ENGAGEMENT_KEY = "benyia_engagement_v1";
var engagementState = (function(){
  try{ return JSON.parse(localStorage.getItem(ENGAGEMENT_KEY) || "{}") || {}; }catch(e){ return {}; }
})();
var engagementCommentKey = "";
function engagementEntry(key, create){
  if(!key) return null;
  if(!engagementState[key] && create) engagementState[key] = { liked:false, favorite:false, views:0, comments:[] };
  return engagementState[key] || null;
}
function saveEngagement(){
  try{ localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(engagementState)); }catch(e){}
}
function homeEngagementCounts(a){
  var e = engagementEntry(a.key, false) || {};
  return {
    views: Number(a.item && a.item.views || 0) + Number(e.views || 0),
    likes: Number(a.item && a.item.likes || 0) + (e.liked ? 1 : 0),
    favorites: Number(a.item && a.item.favorites || 0) + (e.favorite ? 1 : 0),
    comments: Number(a.item && a.item.comments || 0) + ((e.comments || []).length)
  };
}
function homeCardHTML(a){
  var sc = blogData.siteConfig || {};
  var imgs = collectImages(a.item || {});
  var bg = (imgs[0] && imgs[0].url) || a.item.cover || "";
  var cover = bg ? '<div class="ac-cover" style="background-image:url(' + esc(bg) + ')" aria-hidden="true"></div>' : "";
  var nf = collectFiles(a.item || {}).length;
  var counts = homeEngagementCounts(a);
  var e = engagementEntry(a.key, false) || {};
  var typeIcon = isImgUrl(a.icon) ? '<img src="' + esc(a.icon) + '" alt="">' : esc(a.icon || "📄");
  return '<article class="article-card ac-card' + (cover ? ' has-cover' : ' no-cover') + '" tabindex="0" role="link" data-open="' + esc(a.click) + '" data-ek="' + esc(a.key) + '" data-title="' + esc(a.title) + '" data-path="' + esc(a.path) + '" data-base-views="' + Number(a.item && a.item.views || 0) + '" data-base-likes="' + Number(a.item && a.item.likes || 0) + '" data-base-favorites="' + Number(a.item && a.item.favorites || 0) + '" data-base-comments="' + Number(a.item && a.item.comments || 0) + '">'
    + '<div class="ac-body">'
    +   '<div class="ac-top">' + (a.top ? '<span class="ac-badge top">置顶</span>' : "") + '<span class="ac-badge"><span class="ac-type-icon">' + typeIcon + '</span>' + esc(a.type) + '</span></div>'
    +   '<h3 class="ac-title">' + esc(a.title) + '</h3>'
    +   (a.tags.length ? '<div class="ac-tags">' + a.tags.map(function(t){ return "<span># " + esc(t) + "</span>"; }).join("") + '</div>' : "")
    +   (a.desc ? '<p class="ac-desc">' + esc(a.desc.slice(0, 150)) + '</p>' : "")
    +   '<div class="ac-meta">'
    +     (a.updated ? '<span>🕒 更新 ' + esc(String(a.updated).slice(0, 10)) + '</span>' : "")
    +     '<span>✍ ' + a.words + ' 字</span>'
    +     '<span>⏱ ' + Math.max(1, Math.round(a.words / 400)) + ' 分钟</span>'
    +     (nf ? '<span>📎 ' + nf + ' 个文件</span>' : "")
    +   '</div>'
    +   '<div class="ac-actions">'
    +     '<span class="ac-act is-static" title="浏览量">👁 <span data-count="views">' + counts.views + '</span></span>'
    +     '<button type="button" class="ac-act' + (e.liked ? ' on' : '') + '" data-eng="like" title="点赞">👍 <span data-count="like">' + counts.likes + '</span></button>'
    +     '<button type="button" class="ac-act' + (e.favorite ? ' on' : '') + '" data-eng="favorite" title="收藏">⭐ <span data-count="favorite">' + counts.favorites + '</span></button>'
    +     '<button type="button" class="ac-act" data-eng="comment" title="评论">💬 <span data-count="comment">' + counts.comments + '</span></button>'
    +     '<button type="button" class="ac-act" data-eng="share" title="分享">↗ 分享</button>'
    +   '</div>'
    + '</div>' + cover + '</article>';
}
function refreshEngagementCard(card){
  if(!card) return;
  var key = card.getAttribute("data-ek");
  var e = engagementEntry(key, false) || {};
  var views = Number(card.getAttribute("data-base-views") || 0) + Number(e.views || 0);
  var likes = Number(card.getAttribute("data-base-likes") || 0) + (e.liked ? 1 : 0);
  var favorites = Number(card.getAttribute("data-base-favorites") || 0) + (e.favorite ? 1 : 0);
  var comments = Number(card.getAttribute("data-base-comments") || 0) + (e.comments || []).length;
  function setCount(name, value){
    var el = card.querySelector('[data-count="' + name + '"]');
    if(el) el.textContent = value;
  }
  setCount("views", views);
  setCount("like", likes);
  setCount("favorite", favorites);
  setCount("comment", comments);
  var likeBtn = card.querySelector('[data-eng="like"]');
  var favBtn = card.querySelector('[data-eng="favorite"]');
  if(likeBtn) likeBtn.classList.toggle("on", !!e.liked);
  if(favBtn) favBtn.classList.toggle("on", !!e.favorite);
}
function shareEngagement(card){
  if(!card) return;
  var path = card.getAttribute("data-path") || location.pathname;
  var url = /^https?:/i.test(path) ? path : (location.origin + path);
  var title = card.getAttribute("data-title") || document.title;
  if(navigator.share){
    navigator.share({title:title, url:url}).catch(function(){});
    return;
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(function(){ showToast("链接已复制，可以直接分享"); }).catch(function(){ showToast(url, "info"); });
    return;
  }
  try{
    var input = document.createElement("textarea");
    input.value = url;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    showToast("链接已复制，可以直接分享");
  }catch(e){ showToast(url, "info"); }
}
function renderEngagementComments(){
  var list = document.getElementById("engCommentsList");
  if(!list) return;
  var e = engagementEntry(engagementCommentKey, true) || {};
  var comments = e.comments || [];
  list.innerHTML = comments.length ? comments.map(function(c){
    return '<div class="eng-comment"><p>' + esc(c.text) + '</p><span>' + esc(c.time || '') + '</span></div>';
  }).join("") : '<div class="empty">还没有评论，来说两句吧。</div>';
}
function openEngagementComments(card){
  if(!card) return;
  engagementCommentKey = card.getAttribute("data-ek");
  var title = document.getElementById("engDialogTitle");
  if(title) title.textContent = "评论 · " + (card.getAttribute("data-title") || "");
  renderEngagementComments();
  var dialog = document.getElementById("engDialog");
  if(dialog) dialog.classList.add("show");
  var input = document.getElementById("engCommentInput");
  if(input){ input.value = ""; setTimeout(function(){ input.focus(); }, 40); }
}
function closeEngagementDialog(){
  var dialog = document.getElementById("engDialog");
  if(dialog) dialog.classList.remove("show");
  engagementCommentKey = "";
}
function submitEngagementComment(){
  if(!engagementCommentKey) return;
  var input = document.getElementById("engCommentInput");
  var text = input ? input.value.trim() : "";
  if(!text){ showToast("先写点内容再发布", "error"); return; }
  var e = engagementEntry(engagementCommentKey, true);
  e.comments = e.comments || [];
  e.comments.push({text:text, time:nowStr ? nowStr() : new Date().toLocaleString()});
  saveEngagement();
  renderEngagementComments();
  if(input) input.value = "";
  var cards = document.querySelectorAll(".ac-card");
  for(var i = 0; i < cards.length; i++){
    if(cards[i].getAttribute("data-ek") === engagementCommentKey){ refreshEngagementCard(cards[i]); break; }
  }
  showToast("评论已保存（当前浏览器）");
}
function initHomeEngagement(){
  if(window.__homeEngagementBound) return;
  window.__homeEngagementBound = true;
  document.addEventListener("click", function(e){
    var act = e.target.closest("[data-eng]");
    if(act){
      e.preventDefault();
      e.stopPropagation();
      var card = act.closest(".ac-card");
      if(!card) return;
      var key = card.getAttribute("data-ek");
      var kind = act.getAttribute("data-eng");
      if(kind === "share"){ shareEngagement(card); return; }
      if(kind === "comment"){ openEngagementComments(card); return; }
      var entry = engagementEntry(key, true);
      if(kind === "like") entry.liked = !entry.liked;
      if(kind === "favorite") entry.favorite = !entry.favorite;
      saveEngagement();
      refreshEngagementCard(card);
      return;
    }
    var card = e.target.closest(".ac-card[data-open]");
    if(card){
      e.preventDefault();
      var entry = engagementEntry(card.getAttribute("data-ek"), true);
      entry.views = Number(entry.views || 0) + 1;
      saveEngagement();
      refreshEngagementCard(card);
      var code = card.getAttribute("data-open");
      if(code){ try{ (new Function(code))(); }catch(err){} }
    }
  });
  document.addEventListener("keydown", function(e){
    if(e.key !== "Enter" && e.key !== " ") return;
    var focused = document.activeElement;
    if(focused && focused !== document.body && focused.closest && focused.closest("button,a,input,textarea,select")) return;
    var card = focused && focused.closest ? focused.closest(".ac-card[data-open]") : null;
    if(!card) return;
    e.preventDefault();
    card.click();
  });
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

/* ============================================================
   课程资料库：前台文件夹浏览
   兼容旧数据：没有 course.folders 时，从 files[].folder 自动推导。
   ============================================================ */
function cfsNorm(path){
  return String(path == null ? "" : path)
    .replace(/\\/g, "/")
    .split("/")
    .map(function(s){ return s.trim(); })
    .filter(function(s){ return s && s !== "." && s !== ".."; })
    .join("/");
}
function cfsParent(path){
  var p = cfsNorm(path);
  var i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}
function cfsLeaf(path){
  var p = cfsNorm(path);
  var i = p.lastIndexOf("/");
  return i < 0 ? p : p.slice(i + 1);
}
function cfsUnder(path, parent){
  var p = cfsNorm(path), root = cfsNorm(parent);
  if(!root) return true;
  return p === root || p.indexOf(root + "/") === 0;
}
function cfsFolderList(course){
  var seen = {}, out = [];
  function add(path){
    var p = cfsNorm(path);
    if(!p) return;
    var parts = p.split("/");
    for(var i = 1; i <= parts.length; i++){
      var one = parts.slice(0, i).join("/");
      if(!seen[one]){ seen[one] = 1; out.push(one); }
    }
  }
  (course && course.folders || []).forEach(add);
  collectFiles(course).forEach(function(f){ add(f.folder); });
  return out;
}
function cfsFolderStats(course, path, all){
  var current = cfsNorm(path);
  all = all || cfsFolderList(course);
  var dirs = all.filter(function(p){ return p !== current && cfsUnder(p, current); }).length;
  var files = collectFiles(course).filter(function(f){ return cfsUnder(cfsNorm(f.folder), current); });
  return {dirs:dirs, files:files.length};
}
function cfsFileIcon(file){
  var name = String(file && file.name || "").toLowerCase();
  var type = String(file && file.type || "").toLowerCase();
  var ext = (name.match(/\.([a-z0-9]{1,8})$/) || [])[1] || type;
  if(/^(pdf)$/.test(ext)) return "📕";
  if(/^(ppt|pptx|key)$/.test(ext)) return "📊";
  if(/^(doc|docx|wps|odt)$/.test(ext)) return "📝";
  if(/^(xls|xlsx|csv|ods)$/.test(ext)) return "📈";
  if(/^(zip|rar|7z|tar|gz)$/.test(ext)) return "🗜️";
  if(/^(png|jpg|jpeg|gif|webp|svg|bmp|tif|tiff)$/.test(ext)) return "🖼️";
  if(/^(mp3|wav|flac|aac|m4a|ogg)$/.test(ext)) return "🎵";
  if(/^(mp4|mkv|mov|avi|webm)$/.test(ext)) return "🎬";
  if(/^(js|ts|py|c|cpp|h|java|go|rs|json|xml|html|css)$/.test(ext)) return "⌨️";
  if(file && file.external) return "🔗";
  return "📄";
}
function cfsCrumbHTML(path, idx){
  var current = cfsNorm(path);
  var html = '<button type="button" class="cfs-crumb" data-folder="" data-ci="' + idx + '" onclick="cfsOpenBtn(this)">全部资料</button>';
  var acc = "";
  if(current){
    current.split("/").forEach(function(part){
      acc = acc ? (acc + "/" + part) : part;
      html += '<span class="cfs-crumb-sep">›</span>'
        + '<button type="button" class="cfs-crumb" data-folder="' + esc(acc) + '" data-ci="' + idx + '" onclick="cfsOpenBtn(this)">' + esc(part) + '</button>';
    });
  }
  return html;
}
function cfsContentHTML(course, path, idx){
  var all = cfsFolderList(course);
  var current = cfsNorm(path);
  if(current && all.indexOf(current) < 0) current = "";
  var children = all.filter(function(p){ return cfsParent(p) === current; });
  var files = collectFiles(course);
  var direct = files.map(function(f, i){ return {f:f, i:i}; }).filter(function(it){
    return cfsNorm(it.f.folder) === current;
  }).sort(function(a, b){
    return String(a.f.name || "").localeCompare(String(b.f.name || ""), "zh-CN", {numeric:true});
  });
  var stats = cfsFolderStats(course, current, all);
  var html = '<div class="cfs-bar">'
    + '<div class="cfs-crumbs">' + cfsCrumbHTML(current, idx) + '</div>'
    + '<div class="cfs-count">' + stats.dirs + ' 个文件夹 · ' + stats.files + ' 个文件</div>'
    + '</div>';

  if(current){
    html += '<button type="button" class="cfs-up" data-folder="' + esc(cfsParent(current)) + '" data-ci="' + idx + '" onclick="cfsOpenBtn(this)">↩ 返回上一级</button>';
  }
  if(children.length){
    html += '<div class="cfs-folder-grid">';
    children.forEach(function(folder){
      var st = cfsFolderStats(course, folder, all);
      html += '<button type="button" class="cfs-folder" data-folder="' + esc(folder) + '" data-ci="' + idx + '" onclick="cfsOpenBtn(this)">'
        +   '<span class="cfs-folder-ico" aria-hidden="true">📁</span>'
        +   '<span class="cfs-folder-main"><b>' + esc(cfsLeaf(folder)) + '</b>'
        +   '<span>' + (st.files ? (st.files + ' 个文件') : '空文件夹') + (st.dirs ? (' · ' + st.dirs + ' 个子文件夹') : '') + '</span></span>'
        +   '<span class="cfs-folder-arrow" aria-hidden="true">›</span>'
        + '</button>';
    });
    html += '</div>';
  }
  if(direct.length){
    html += '<div class="cfs-files">';
    direct.forEach(function(it){
      var f = it.f;
      html += '<div class="cfs-file">'
        +   '<span class="cfs-file-ico" aria-hidden="true">' + cfsFileIcon(f) + '</span>'
        +   '<span class="cfs-file-main"><b>' + esc(f.name || "未命名文件") + '</b>'
        +   '<span>' + esc(f.type || "文件") + (f.size ? (" · " + fmtSize(f.size)) : "") + (f.external ? " · 外部链接" : "") + '</span></span>'
        +   fileActionHTML(f.url, f.name)
        + '</div>';
    });
    html += '</div>';
  }
  if(!children.length && !direct.length){
    html += '<div class="cfs-empty">'
      + '<span class="cfs-empty-ico" aria-hidden="true">📂</span>'
      + '<div><b>' + (current ? '这个文件夹还是空的' : '这门课还没有上传资料') + '</b>'
      + '<span>' + (current ? '可以回到上一级，或到后台往这个文件夹上传文件。' : '后台支持先建文件夹，再往文件夹里上传任意类型的文件。') + '</span></div>'
      + '</div>';
  }
  return html;
}
function courseLibraryHTML(course, path){
  var idx = blogData.courses ? blogData.courses.indexOf(course) : currentCourseIdx;
  return '<div class="course-fs" id="courseFileBrowser">' + cfsContentHTML(course, path, idx) + '</div>';
}
function hasCourseLibrary(course){
  return cfsFolderList(course).length > 0 || collectFiles(course).length > 0;
}
function cfsOpenBtn(btn){
  var idx = parseInt(btn.getAttribute("data-ci"), 10);
  if(isNaN(idx) || !blogData.courses[idx]) idx = currentCourseIdx;
  cfsOpen(btn.getAttribute("data-folder") || "", idx);
}
function cfsOpen(path, idx){
  var course = blogData.courses[idx];
  var box = document.getElementById("courseFileBrowser");
  if(!course || !box) return;
  currentCourseFolder = cfsNorm(path);
  box.innerHTML = cfsContentHTML(course, currentCourseFolder, idx);
}

/* ============================================================
   合辑：系列资料集合（任意文件类型）
   ============================================================ */
function collectionCover(c){
  var imgs = collectImages(c || {});
  return (imgs[0] && imgs[0].url) || c.cover || (blogData.siteConfig && blogData.siteConfig.defaultImage) || "";
}
function collectionCardHTML(c, idx){
  var cover = collectionCover(c);
  var files = collectFiles(c);
  return '<article class="coll-card" onclick="openCollection(' + idx + ')">'
    +   '<div class="coll-card-cover' + (cover ? '' : ' none') + '"' + (cover ? ' style="background-image:url(' + esc(cover) + ')"' : '') + '>'
    +     (cover ? '' : (isImgUrl(c.icon) ? '<img src="' + esc(c.icon) + '" alt="">' : esc(c.icon || '📦')))
    +   '</div>'
    +   '<div class="coll-card-body">'
    +     '<div class="coll-card-top"><span class="ac-badge">合辑</span>' + ((c.tags || []).length ? '<span class="coll-card-tag">#' + esc((c.tags || [])[0]) + '</span>' : '') + '</div>'
    +     '<h3>' + esc(c.title || '未命名合辑') + '</h3>'
    +     (c.desc ? '<p>' + esc(c.desc) + '</p>' : '')
    +     '<div class="coll-card-meta"><span>📎 ' + files.length + ' 个文件</span>' + (c.time ? '<span>🕒 ' + esc(String(c.time).slice(0,10)) + '</span>' : '') + (c.author ? '<span>✍ ' + esc(c.author) + '</span>' : '') + '</div>'
    +   '</div></article>';
}
function renderCollections(){
  var arr = (blogData.collections || []).map(function(c, i){ return {c:c, i:i}; });
  arr.sort(function(a, b){ return byTimeDesc(a.c, b.c); });
  renderPaged("collections", "collectionList", "collectionPager", arr, function(it){
    return collectionCardHTML(it.c, it.i);
  }, "暂无合辑", 8);
}
function collFileExt(f){
  var name = String((f && f.name) || '').toLowerCase();
  var m = name.match(/\.([a-z0-9]{1,10})$/);
  return m ? m[1] : String((f && f.type) || '').toLowerCase();
}
function collFileKind(f){
  var e = collFileExt(f);
  if(/^(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(e)) return 'image';
  if(/^(mp3|wav|flac|aac|m4a|ogg)$/.test(e)) return 'audio';
  if(/^(mp4|webm|mov|mkv|avi)$/.test(e)) return 'video';
  if(/^(md|markdown|txt)$/.test(e)) return 'doc';
  if(/^(html?|htm)$/.test(e)) return 'html';
  if(e === 'pdf') return 'pdf';
  return 'file';
}
function collFileTitle(f){
  return '<span class="coll-file-icon">' + (function(){
    var k = collFileKind(f);
    return k === 'image' ? '🖼️' : k === 'audio' ? '🎵' : k === 'video' ? '🎬' : k === 'doc' ? '📝' : k === 'html' ? '🌐' : k === 'pdf' ? '📕' : (f.external ? '🔗' : '📎');
  })() + '</span><b>' + esc(f.name || '未命名文件') + '</b>';
}
function collFileBlock(f){
  var kind = collFileKind(f);
  var name = esc(f.name || '未命名文件');
  var url = esc(f.url || '');
  if(kind === 'image'){
    return '<figure class="coll-media coll-image"><a href="' + url + '" target="_blank" rel="noopener"><img src="' + url + '" alt="' + name + '" loading="lazy"></a><figcaption><span>' + name + '</span>' + fileActionHTML(f.url, f.name) + '</figcaption></figure>';
  }
  if(kind === 'audio'){
    return '<div class="coll-media coll-audio"><div class="coll-media-head">' + collFileTitle(f) + fileActionHTML(f.url, f.name) + '</div><audio controls preload="metadata" src="' + url + '"></audio></div>';
  }
  if(kind === 'video'){
    return '<div class="coll-media coll-video"><div class="coll-media-head">' + collFileTitle(f) + fileActionHTML(f.url, f.name) + '</div><video controls preload="metadata" src="' + url + '"></video></div>';
  }
  if(kind === 'html'){
    return '<div class="coll-doc coll-html"><div class="coll-doc-head">' + collFileTitle(f) + '<a href="' + url + '" target="_blank" rel="noopener">新窗口打开</a></div><iframe src="' + url + '" loading="lazy" sandbox="allow-scripts allow-forms allow-popups" title="' + name + '"></iframe><div class="coll-doc-foot">' + fileActionHTML(f.url, f.name) + '</div></div>';
  }
  if(kind === 'doc'){
    return '<div class="coll-doc coll-md" data-coll-doc-url="' + url + '" data-coll-doc-kind="' + (collFileExt(f) === 'txt' ? 'text' : 'markdown') + '"><div class="coll-doc-head">' + collFileTitle(f) + fileActionHTML(f.url, f.name) + '</div><div class="coll-doc-body">正在加载预览…</div></div>';
  }
  return '<div class="coll-file"><div class="coll-file-main">' + collFileTitle(f) + '<span>' + esc(f.type || '文件') + (f.size ? (' · ' + fmtSize(f.size)) : '') + '</span></div>' + fileActionHTML(f.url, f.name) + '</div>';
}
function collectionFilesHTML(c){
  var files = collectFiles(c || {});
  if(!files.length) return '<div class="info-card"><h3>📎 系列资料</h3><div class="empty">这个合辑还没有上传文件</div></div>';
  return '<div class="info-card collection-library"><h3>📎 系列资料 <span class="coll-count">' + files.length + '</span></h3><div class="coll-file-grid">' + files.map(collFileBlock).join('') + '</div></div>';
}
function hydrateCollectionDocs(root){
  if(!root) return;
  root.querySelectorAll('[data-coll-doc-url]').forEach(function(box){
    var url = box.getAttribute('data-coll-doc-url');
    var kind = box.getAttribute('data-coll-doc-kind');
    var body = box.querySelector('.coll-doc-body');
    if(!url || !body) return;
    fetch(url, {cache:'no-store'}).then(function(res){
      if(!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function(text){
      if(text.length > 240000) text = text.slice(0, 240000) + '\n\n…（预览已截断，完整内容请下载文件）';
      if(kind === 'text'){
        body.innerHTML = '<pre class="coll-text-preview">' + esc(text) + '</pre>';
      }else{
        body.innerHTML = mdRenderHTML(text) || '<div class="empty">文件内容为空</div>';
        body.classList.add('md-body');
        enhanceCodeBlocks(body);
      }
    }).catch(function(err){
      body.innerHTML = '<div class="empty">暂时无法预览：' + esc(err.message || '文件可能还未发布') + '</div>';
    });
  });
}
function openCollection(idx){
  rememberOrigin();
  currentCollectionIdx = idx;
  var c = blogData.collections[idx];
  if(!c) return;
  if(typeof setActiveNav === "function") setActiveNav("collections");
  var icon = document.getElementById('colDetailIcon');
  var iconVal = c.icon || '📦';
  icon.innerHTML = isImgUrl(iconVal) ? '<img src="' + esc(iconVal) + '" alt="">' : esc(iconVal);
  document.getElementById('colDetailTitle').textContent = c.title || '合辑';
  document.getElementById('colDetailDesc').textContent = c.desc || '';
  var files = collectFiles(c);
  document.getElementById('colDetailChips').innerHTML =
      '<span class="info-chip green">📎 <b>' + files.length + '</b> 个文件</span>'
    + (c.time ? '<span class="info-chip">🕒 ' + esc(c.time) + '</span>' : '')
    + (c.author ? '<span class="info-chip">✍ ' + esc(c.author) + '</span>' : '')
    + (c.tags || []).map(function(t){ return '<span class="info-chip" style="cursor:pointer" onclick="openTag(\'' + esc(String(t).replace(/'/g, "\\'")) + '\')">🏷 ' + esc(t) + '</span>'; }).join('');
  var intro = document.getElementById('colDetailIntro');
  intro.innerHTML = mdRenderHTML(c.intro || c.desc || '') || '<div class="empty">暂无系列介绍</div>';
  intro.className = 'md-body';
  document.getElementById('colDetailFiles').innerHTML = galleryHTML(c) + collectionFilesHTML(c);
  showSideInfo('📦 合辑信息',
      '<div class="kv"><span class="k">系列名称</span><span class="v">' + esc(c.title || '') + '</span></div>'
    + '<div class="kv"><span class="k">资料数量</span><span class="v">' + files.length + ' 个</span></div>'
    + (c.author ? '<div class="kv"><span class="k">整理人</span><span class="v">' + esc(c.author) + '</span></div>' : '')
    + (c.time ? '<div class="kv"><span class="k">更新时间</span><span class="v">' + esc(c.time) + '</span></div>' : ''));
  setPageTitle('collectionDetail', c.title || '合辑', '');
  showSection('collectionDetail');
  buildToc(intro);
  renderPnNav('colPn', blogData.collections || [], idx, 'openCollection');
  syncEntryRoute('collections', c.title || '合辑');
  hydrateCollectionDocs(document.getElementById('colDetailFiles'));
}
function backToCollections(){ currentCollectionIdx = -1; backToOrigin('collections'); }

function renderCourses(){
  var arr = (blogData.courses||[]).map(function(c,i){ return {c:c, i:i}; });
  arr.sort(function(a,b){ return byTimeDesc(a.c, b.c); });
  renderPaged("courses", "coursesList", "coursesPager", arr, function(it){
    var c = it.c, i = it.i;
    var nf = collectFiles(c).length, nd = cfsFolderList(c).length, pg = Number(c.progress || 0);
    var done = courseDone(c);
    return '<div class="article-card'+(done?"":" course-todo")+'" onclick="openCourse('+i+')">'+coverHTML(c, c.icon||"📐")
      + '<div class="article-body">'
      +   '<div class="article-title">'+esc(c.title)+'</div>'
      +   '<div class="chip-row">'+courseBadgeHTML(c)+'<span class="info-chip green">📎 '+nf+' 个资料</span>'
      +   (nd?'<span class="info-chip">📁 '+nd+' 个文件夹</span>':"")
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
  currentCourseFolder = "";
  var banner = document.getElementById("cdIcon");
  var icVal = c.icon || "📐";
  /* 顶部横幅：图标是图片就铺满，否则显示大图标 */
  banner.innerHTML = isImgUrl(icVal) ? '<img src="'+esc(icVal)+'" alt="">' : esc(icVal);
  document.getElementById("cdName").textContent = c.title;

  var files = collectFiles(c);
  var folderCount = cfsFolderList(c).length;
  var progress = c.progress || 0;
  /* 关键信息做成小圆片，一眼能看完 */
  document.getElementById("cdChips").innerHTML =
      '<span class="info-chip green">📎 <b>'+files.length+'</b> 个资料</span>'
    + '<span class="info-chip">📁 <b>'+folderCount+'</b> 个文件夹</span>'
    + '<span class="info-chip">📈 进度 <b>'+progress+'%</b></span>'
    + (c.time ? '<span class="info-chip">🕐 '+esc(c.time)+'</span>' : '');

  /* 课程信息 → 右侧栏「文章信息」卡片 */
  showSideInfo("📊 课程信息",
      '<div class="kv"><span class="k">课程名称</span><span class="v">'+esc(c.title)+'</span></div>'
    + '<div class="kv"><span class="k">资料数量</span><span class="v">'+files.length+' 个</span></div>'
    + '<div class="kv"><span class="k">文件夹</span><span class="v">'+folderCount+' 个</span></div>'
    + '<div class="kv"><span class="k">学习进度</span><span class="v">'+progress+'%</span></div>'
    + (c.time ? '<div class="kv"><span class="k">更新时间</span><span class="v">'+esc(c.time)+'</span></div>' : ''));

  /* 课程介绍按 Markdown 渲染，写了 ## 小标题就会自动生成目录 */
  var introBox = document.getElementById("cdIntro");
  introBox.innerHTML = mdRenderHTML(c.intro) || '<div class="empty">暂无课程介绍</div>';
  introBox.className = "md-body";
  document.getElementById("cdProgressBar").style.width = progress+"%";
  document.getElementById("cdProgressText").innerHTML = "学习进度：<b>"+progress+"%</b>";
  /* 资料/附件 → 正文下面（没有资料就不显示这张卡） */
  var filesHtml = galleryHTML(c) + (hasCourseLibrary(c) ? courseLibraryHTML(c, "") : "");
  var hasFiles = !!filesHtml;
  showSideFiles("courseDetail", hasFiles ? "📎 课程资料库" : "", hasFiles ? filesHtml : "");
  setPageTitle("courseDetail", c.title, "");
  showSection("courseDetail");
  /* 目录要在 showSection 之后生成，否则会被里面的 renderToc([]) 清掉 */
  buildToc(introBox);
  /* 上一篇 / 下一篇：按列表（时间倒序）取相邻的课程 */
  renderPnNav("cdPn", blogData.courses||[], idx, "openCourse");
  syncEntryRoute("courses", c.title);
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
  syncEntryRoute("papers", p.title);
}
function backToPapers(){ currentPaperIdx = -1; backToOrigin("papers"); }
