/* ============================================================
   首屏优化：版权年份自动更新 + 背景图延迟加载
   背景图约 1MB，先让内容用渐变底渲染出来，空闲时再换上图片
   ============================================================ */
function initSiteChrome(){
  var y = document.getElementById("copyYear");
  if(y) y.textContent = new Date().getFullYear();
  loadBgLazy();
  initNavScroll();
}
function loadBgLazy(){
  var mark = function(){ document.body.classList.add("bg-ready"); };
  var img = new Image();
  img.onload = mark;
  img.onerror = mark;   /* 加载失败就保持渐变底，不影响阅读 */
  var go = function(){ img.src = "assets/image1.jpg"; };
  var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 800); };
  if(document.readyState === "complete") idle(go);
  else window.addEventListener("load", function(){ idle(go); });
}

/* ============================================================
   交互增强：图片懒加载淡入 / 滚动入场动画 / 常驻导航 / 骨架屏
   ============================================================ */
/* 图片进入视口才加载（把 src 暂存到 data-src），加载完淡入 */
function lazyImages(root){
  var box = root || document;
  var imgs = box.querySelectorAll("img:not([data-lazy-done])");
  Array.prototype.forEach.call(imgs, function(img){
    img.setAttribute("data-lazy-done", "1");
    var src = img.getAttribute("src");
    if(!src) return;
    img.classList.add("img-fade");
    img.setAttribute("data-src", src);
    img.removeAttribute("src");
    if(img.complete){ img.classList.add("img-loaded"); }
  });
  var list = box.querySelectorAll("img[data-src]:not([data-lazy-watch])");
  if(!("IntersectionObserver" in window)){
    Array.prototype.forEach.call(list, function(img){ swapLazy(img); });
    return;
  }
  lazyObserver = lazyObserver || new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      swapLazy(en.target);
      lazyObserver.unobserve(en.target);
    });
  }, { rootMargin: "200px 0px" });
  Array.prototype.forEach.call(list, function(img){
    img.setAttribute("data-lazy-watch", "1");
    lazyObserver.observe(img);
  });
}
var lazyObserver = null;
function swapLazy(img){
  var src = img.getAttribute("data-src");
  if(!src) return;
  img.onload = function(){ img.classList.add("img-loaded"); };
  img.onerror = function(){ img.classList.add("img-loaded"); };
  img.setAttribute("src", src);
  img.removeAttribute("data-src");
}
/* 滚动到视口才播放：轻微上浮 + 淡入（不做旋转/缩放/模糊） */
var revealObserver = null;
function observeReveal(){
  var els = document.querySelectorAll(".reveal:not([data-reveal-watch])");
  if(!els.length) return;
  if(!("IntersectionObserver" in window)){
    Array.prototype.forEach.call(els, function(el){ el.classList.add("in"); el.setAttribute("data-reveal-watch", "1"); });
    return;
  }
  revealObserver = revealObserver || new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      var el = en.target;
      /* 同一批卡片错开一点点，看起来更自然 */
      var i = parseInt(el.getAttribute("data-reveal-i") || "0", 10);
      el.style.transitionDelay = Math.min(i, 6) * 45 + "ms";
      el.classList.add("in");
      revealObserver.unobserve(el);
    });
  /* 底部往外扩 220px：卡片一露头就显示，别让首屏底部留一条空白带 */
  }, { rootMargin: "0px 0px 220px 0px", threshold: 0 });
  Array.prototype.forEach.call(els, function(el){
    el.setAttribute("data-reveal-watch", "1");
    revealObserver.observe(el);
  });
  /* 兜底：首屏（含底部外扩 220px）里的元素立刻显示，不等滚动 */
  var revealNow = function(){
    var limit = (window.innerHeight || 800) + 220;
    Array.prototype.forEach.call(document.querySelectorAll(".reveal:not(.in)"), function(el){
      if(!el.getClientRects().length) return;   /* display:none 的（隐藏标签页）不动 */
      if(el.getBoundingClientRect().top < limit){
        el.style.transitionDelay = "0ms";
        el.classList.add("in");
        if(revealObserver) revealObserver.unobserve(el);
      }
    });
  };
  revealNow();
  setTimeout(revealNow, 600);
}
/* 给容器里的直接子卡片挂上入场动画（列表重渲染后调用） */
function markReveal(container, selector){
  if(!container) return;
  var items = container.querySelectorAll(selector || ":scope > *");
  Array.prototype.forEach.call(items, function(el, i){
    if(el.classList.contains("reveal")) return;
    el.classList.add("reveal");
    el.setAttribute("data-reveal-i", String(i));
  });
  observeReveal();
}
/* 顶部导航：下滑 20px 后变实色 + 阴影 */
function initNavScroll(){
  var nav = document.querySelector(".topnav");
  if(!nav) return;
  var apply = function(){
    if((window.scrollY || window.pageYOffset || 0) > 20) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  apply();
  window.addEventListener("scroll", apply, { passive: true });
}
/* 首屏骨架屏：灰色占位块，数据到了再换成真实内容 */
function showSkeletons(){
  var card = function(n){
    var s = "";
    for(var i = 0; i < n; i++){
      s += '<div class="sk-card"><div class="sk sk-cover"></div><div class="sk-body">'
        + '<div class="sk sk-line w60"></div><div class="sk sk-line w85"></div><div class="sk sk-line w40"></div>'
        + '<div style="margin-top:12px"><span class="sk sk-chip"></span><span class="sk sk-chip"></span></div>'
        + '</div></div>';
    }
    return s;
  };
  ["homeList", "coursesList", "papersList", "noticesList", "classList", "diaryList", "advisorList"].forEach(function(id){
    var el = document.getElementById(id);
    if(el && !el.innerHTML.trim()) el.innerHTML = card(3);
  });
  var stats = document.getElementById("statList");
  if(stats && stats.parentNode && !stats.getAttribute("data-sk")){
    stats.setAttribute("data-sk", "1");
  }
  var tagBox = document.getElementById("tagList");
  if(tagBox && !tagBox.innerHTML.trim()){
    tagBox.innerHTML = '<span class="sk sk-chip"></span><span class="sk sk-chip"></span><span class="sk sk-chip"></span>';
  }
  var ql = document.getElementById("quickLinks");
  if(ql && !ql.innerHTML.trim()) ql.innerHTML = '<div class="sk sk-stat"></div><div class="sk sk-stat"></div>';
}
function clearSkeletons(){
  ["homeList", "coursesList", "papersList", "noticesList", "classList", "diaryList", "advisorList", "tagList", "quickLinks"].forEach(function(id){
    var el = document.getElementById(id);
    if(el && el.querySelector(".sk")) el.innerHTML = "";
  });
}

/* ============================================================
   读 data.json
   ⚠️ GitHub Pages 的 CDN 缓存 data.json 时【忽略查询字符串】，
      同一份副本最多发 10 分钟，所以 ?v=时间戳 是绕不过去的。
      站长刚在后台保存过（同一浏览器会留下标记）时，直接读 GitHub API，
      这样保存完刷前台马上就能看到，不用等 CDN 过期。普通访客不受影响。
   ============================================================ */
function dataJustSaved(){
  try{
    var t = parseInt(localStorage.getItem("benyia_data_fresh") || "0", 10);
    return t > Date.now();
  }catch(e){ return false; }
}
async function readFreshData(){
  if(!dataJustSaved()) return null;
  try{
    var r = await fetch("https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/data.json?ref=main&t=" + Date.now(), { cache: "no-store" });
    if(!r.ok) return null;
    var meta = await r.json();
    var bin = atob(String(meta.content || "").replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for(var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }catch(e){ return null; }   /* 拿不到就安静地退回 Pages */
}
async function loadData(){
  showSkeletons();          /* 先上骨架屏，别让首屏空着转圈 */
  try {
    var fresh = await readFreshData();
    if(fresh){ blogData = fresh; }
    else {
      /* 不带随机戳：10 分钟内重复进站直接用浏览器 / CDN 缓存，不用每次重下 596 KB；
         拿不到再绕过缓存重试一次 */
      var res = (window.__dataPromise ? await window.__dataPromise : null) || await fetch("data.json");
      if(!res || !res.ok) res = await fetch("data.json?v=" + Date.now());
      if(res.ok){ blogData = await res.json(); }
      else { blogData = JSON.parse(JSON.stringify(DEFAULT_DATA)); }
    }
  } catch(e) {
    blogData = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  clearSkeletons();
  for(var k in DEFAULT_DATA){ if(blogData[k]==null) blogData[k] = DEFAULT_DATA[k]; }
  if(!blogData.siteConfig || typeof blogData.siteConfig!=="object") blogData.siteConfig = {};
  blogData.siteConfig = Object.assign({}, DEFAULT_DATA.siteConfig, blogData.siteConfig);
  if(!Array.isArray(blogData.categories) || !blogData.categories.length) blogData.categories = DEFAULT_DATA.categories;
  if(!Array.isArray(blogData.tags)) blogData.tags = DEFAULT_DATA.tags;
  if(!Array.isArray(blogData.quickLinks)) blogData.quickLinks = DEFAULT_DATA.quickLinks;
  if(!blogData.ledgerCategories) blogData.ledgerCategories = DEFAULT_DATA.ledgerCategories;

  document.getElementById("titleH1").textContent = blogData.siteConfig.title || "思齐个人主页";
  document.getElementById("titleP").textContent = blogData.siteConfig.subtitle || "";
  renderAll();
}

function renderProfile(){
  var sc = blogData.siteConfig;
  document.getElementById("profileAvatar").innerHTML = iconHTML(sc.avatar || sc.defaultImage || "", "思");
  document.getElementById("profileName").textContent = sc.name || "思齐";
  document.getElementById("profileBio").textContent = sc.bio || "";
  var st = document.getElementById("profileStats");
  if(st){
    var arts = (blogData.courses||[]).length + (blogData.papers||[]).length + (blogData.notices||[]).length + (blogData.classItems||[]).length;
    st.innerHTML = '<span><b>' + arts + '</b>文章</span><span><b>' + (blogData.categories||[]).length + '</b>分类</span><span><b>' + (blogData.tags||[]).length + '</b>标签</span>';
  }
}
/* 建站天数：按 siteConfig.startDate 实时算，不再是写死的数字 */
function siteDays(){
  var sc = blogData.siteConfig || {};
  var m = String(sc.startDate || "2026-09-01").trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(!m) return 0;
  var now = new Date();
  var a = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  var b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var d = Math.floor((b - a) / 86400000) + 1;
  return d > 0 ? d : 0;
}
/* 公告（后台「首页」里写） */
function renderNotice(){
  var card = document.getElementById("noticeCard"), body = document.getElementById("noticeBody");
  if(!card || !body) return;
  var sc = blogData.siteConfig || {};
  var txt = String(sc.notice || "").trim();
  if(!txt){ card.style.display = "none"; body.innerHTML = ""; return; }
  card.style.display = "";
  body.innerHTML = '<div class="lc-notice-text">' + esc(txt) + '</div>'
    + (sc.noticeUrl ? '<a class="hp-btn" href="' + esc(sc.noticeUrl) + '" target="_blank" rel="noopener" style="margin-top:12px">' + esc(sc.noticeBtn || "了解更多") + ' →</a>' : "");
}
/* 统计：全是本地数量，不依赖任何外部服务 */
function renderStats(){
  var box = document.getElementById("statList");
  if(!box) return;
  var rows = [
    ["📄", "文章", (blogData.courses||[]).length + (blogData.papers||[]).length + (blogData.notices||[]).length + (blogData.classItems||[]).length],
    ["📌", "动态", (blogData.logs||[]).length],
    ["🗂️", "分类", (blogData.categories||[]).length],
    ["🏷️", "标签", (blogData.tags||[]).length],
    ["📖", "日记", (blogData.diary||[]).length],
    ["🎵", "影音", (blogData.media||[]).length],
    ["📅", "建站天数", siteDays()]
  ];
  box.innerHTML = rows.map(function(r){
    return '<div class="stat-row"><span class="sr-k">' + r[0] + " " + r[1] + '</span><span class="sr-v">' + r[2] + '</span></div>';
  }).join("");
}

function renderCategories(){
  var map = {courses:(blogData.courses||[]).length, papers:(blogData.papers||[]).length, notices:(blogData.notices||[]).length, class:(blogData.classItems||[]).length};
  document.getElementById("catList").innerHTML = (blogData.categories||[]).map(function(c){
    var ic = isImgUrl(c.icon) ? '<img src="'+esc(c.icon)+'" style="width:16px;height:16px;object-fit:cover;border-radius:4px;vertical-align:-3px">' : esc(c.icon||"");
    return '<div class="cat-item" onclick="switchTab(\''+esc(c.section||"home")+'\')"><span>'+ic+' '+esc(c.name)+'</span><span class="count">'+(map[c.section]||0)+'</span></div>';
  }).join("") || '';
}

function renderTags(){
  /* 标签后面不带数量，只显示标签本身 */
  document.getElementById("tagList").innerHTML = (blogData.tags||[]).map(function(t){
    return '<span class="tag-chip" onclick="openTag(\''+esc(t).replace(/'/g,"\\'")+'\')" title="查看该标签下的全部内容">'+esc(t)+'</span>';
  }).join("") || '';
}
