const GH_OWNER = "benyia";
const GH_REPO = "benyia.github.io";

/* 列表分页：每页条数（课程 / 通知 / 班级） */
const PAGE_SIZE = 6;
/* 首页内容卡片每页条数 */
const HOME_PAGE_SIZE = 10;
/* 首页默认显示哪几类内容（后台「首页」里可勾选） */
const HOME_SECTIONS = [
  { key: "courses",    name: "课程",   icon: "📚" },
  { key: "collections",name: "合辑",   icon: "📦" },
  { key: "papers",     name: "论文",   icon: "📝" },
  { key: "notices",    name: "通知",   icon: "🔔" },
  { key: "classItems", name: "班级",   icon: "👥" },
  { key: "diary",      name: "日记",   icon: "📖" }
];
const HOME_SECTIONS_DEFAULT = ["courses", "papers", "notices", "classItems"];

const PAGE_TITLES = {
  home: ["思齐个人主页", "钟爱奥迪A6"],
  courses: ["我的课程", "课程资料与学习资源"],
  collections: ["合辑", "系列教程与资源收藏"],
  papers: ["论文", "学术论文与研究进展"],
  notices: ["学校通知", "重要通知与公告"],
  class: ["班级事务", "通知、名单与活动"],
  roster: ["班级名单", "同学个人信息"],
  life: ["生活服务", "常用网站与工具"],
  media: ["影音", "音乐 / 视频 / 图片"],
  ledger: ["生活记账", "记录每一笔开销"],
  diary: ["日记", "记录生活点滴"],
  diaryDetail: ["日记", "记录生活点滴"],
  tags: ["标签", "按标签聚合全部内容"],
  advisor: ["导师指导", "与导师交流记录"],
  advisorDetail: ["导师指导", "与导师交流记录"],
  about: ["关于我", "了解更多关于思齐"],
  courseDetail: ["课程详情", ""],
  collectionDetail: ["合辑详情", ""],
  paperDetail: ["论文详情", ""],
  noticeDetail: ["通知详情", ""],
  classDetail: ["班级事务详情", ""],
  appDetail: ["应用详情", ""]
};

const DEFAULT_DATA = {
  siteConfig: {title:"思齐个人主页", subtitle:"钟爱奥迪A6", about:"", avatar:"思", favicon:"", name:"思齐", bio:"控制工程研究生", defaultImage:"files/default-cover.jpg", defaultAvatar:"files/default-avatar.png", coverPan:true, coverPanSec:3, adminTitle:"", adminTitleSync:true,
    startDate:"2026-09-01",
    notice:"欢迎来到我的小站 🌿\n这里记录我的课程、论文、学习笔记和生活随笔。\n公告内容可以在后台「首页」里改。",
    noticeBtn:"", noticeUrl:"",
    welcome:{on:true, top:"欢迎来到", name:"", mid:"の", suffix:"小站", tip:"很高兴与你相遇", bg:"", sec:3.5}},
  /* 首页卡片面板：默认把我现有的内容「只读」展示一份，随时可在后台改动 */
  homePanels: [
    {type:"articles", on:true, span:2, icon:"📄", title:"最新文章", desc:"课程 / 论文 / 通知 / 班级 的最新记录", btn:"查看全部", limit:6},
    {type:"profile",  on:true, span:1, icon:"👤", title:"个人名片", desc:"", limit:5},
    {type:"stats",    on:true, span:1, icon:"📊", title:"站点统计", desc:"", limit:5},
    {type:"courses",  on:true, span:1, icon:"📚", title:"课程进度", desc:"最近的几门课", btn:"全部课程", limit:4},
    {type:"diary",    on:true, span:1, icon:"📖", title:"最近日记", desc:"", btn:"全部日记", limit:4},
    {type:"media",    on:true, span:1, icon:"🎵", title:"影音收藏", desc:"", btn:"影音", limit:4},
    {type:"cats",     on:true, span:1, icon:"🗂️", title:"内容分类", desc:"", limit:8},
    {type:"tags",     on:true, span:1, icon:"🏷️", title:"标签", desc:"", limit:24},
    {type:"friends",  on:true, span:1, icon:"🔗", title:"友情链接", desc:"", limit:5},
    {type:"quick",    on:true, span:1, icon:"⚡", title:"快速链接", desc:"", limit:6}
  ],
  categories: [
    {icon:"📚", name:"课程学习", section:"courses"},
    {icon:"📝", name:"论文", section:"papers"},
    {icon:"🔔", name:"学校通知", section:"notices"},
    {icon:"👥", name:"班级事务", section:"class"}
  ],
  tags: ["控制工程","深度学习","FPGA","Python"],
  quickLinks: [
    {icon:"☁️", title:"百度网盘", url:"https://pan.baidu.com"},
    {icon:"🚄", title:"12306", url:"https://www.12306.cn"},
    {icon:"🐙", title:"GitHub", url:"https://github.com"},
    {icon:"💡", title:"知乎", url:"https://www.zhihu.com"}
  ],
  courses: [], papers: [], notices: [], classItems: [], collections: [], lifeServices: [],
  friendLinks: [],
  friendApplies: [],
  ledger: [],
  ledgerCategories: {expense:["吃饭","买东西","生活用品","交通","娱乐","学习","医疗","其他"], income:["工资","奖学金","补贴","红包","其他"]},
  diary: [], advisor: [], logs: []
};

const PAPER_STATUSES = ["阅读中","撰写中","在投","审稿中","已接收","已发表"];
const PAPER_FILTERS = [
  {key:"all", label:"全部"},
  {key:"阅读", label:"阅读", match: function(s){return s==="阅读中";}},
  {key:"撰写", label:"撰写", match: function(s){return s==="撰写中";}},
  {key:"已投", label:"已投", match: function(s){return ["在投","审稿中","已接收","已发表"].indexOf(s)>=0;}},
  {key:"未投", label:"未投", match: function(s){return ["阅读中","撰写中"].indexOf(s)>=0;}}
];
const CLASS_TYPES = ["通知","名单","作业","考试","活动"];

let blogData = null;
let currentCourseIdx = -1;
let currentCourseFolder = "";
let currentCollectionIdx = -1;
let currentDiaryIdx = -1;
let currentAdvisorIdx = -1;
let currentNoticeIdx = -1;
let currentPaperIdx = -1;
let currentClassIdx = -1;
let paperFilter = "all";
let classFilter = "all";
let classSubtab = "items";
let recordSubtab = "ledger";
let infoSubtab = "tags";
let mediaFilter = "all";
/* 分页当前页：首页 / 课程 / 通知 / 班级 各记各的 */
const pageState = { home: 1, courses: 1, collections: 1, notices: 1, class: 1 };
/* 标签聚合当前选中的标签 */
let currentTag = "";
/* 悬浮目录当前高亮的标题 id */
let tocActiveId = "";

function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]);}); }
function todayStr(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function nowStr(){ var d=new Date(); return todayStr()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }
function fmtSize(bytes){
  if(!bytes && bytes!==0) return "";
  if(bytes < 1024) return bytes+" B";
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1)+" KB";
  return (bytes/1024/1024).toFixed(2)+" MB";
}
function collectImages(item){
  if(!item || !Array.isArray(item.images)) return [];
  return item.images.filter(function(x){ return x && x.url; });
}
function isImgUrl(v){
  v = String(v||"").trim();
  if(!v) return false;
  if(v.indexOf("data:image") === 0) return true;
  if(v.indexOf("http://") === 0 || v.indexOf("https://") === 0) return true;
  if(v.indexOf("//") === 0) return true;
  if(v.indexOf("files/") === 0) return true;
  if(v.indexOf("/") === 0) return true;
  if(/[.](png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i.test(v)) return true;
  return false;
}
function iconHTML(icon, fallback){
  var v = String(icon||"").trim();
  var fb = esc(fallback || "📄");
  if(isImgUrl(v)){
    return '<img src="'+esc(v)+'" style="width:100%;height:100%;object-fit:cover" alt="" onerror="this.style.display=&#39;none&#39;;var n=this.nextElementSibling;if(n){n.style.display=&#39;inline-block&#39;;}"><span style="display:none;font-size:1.6rem">'+fb+'</span>';
  }
  return esc(v || fallback || "📄");
}
function coverHTML(item, iconFallback){
  var imgs = collectImages(item);
  var sc = blogData.siteConfig || {};
  var def = sc.defaultImage || "";
  var src = imgs.length ? imgs[0].url : def;
  if(src){
    var panOn = (sc.coverPan !== false);
    var sec = parseInt(sc.coverPanSec, 10);
    if(!sec || sec < 1) sec = 3;
    if(panOn){
      return '<div class="article-cover cover-pan" data-bg="' + esc(src) + '" style="background-image:url(' + esc(src) + ');--pan-dur:' + sec + 's"></div>';
    }
    return '<div class="article-cover" style="padding:0;overflow:hidden"><img src="'+esc(src)+'" style="width:100%;height:100%;object-fit:cover" alt=""></div>';
  }
  var ic = (item && item.icon) || iconFallback || "📄";
  return '<div class="article-cover">'+iconHTML(ic, "📄")+'</div>';
}
function imgStrip(item){
  var imgs = collectImages(item);
  if(!imgs.length) return "";
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+imgs.map(function(f){
    return '<img src="'+esc(f.url)+'" style="width:72px;height:72px;object-fit:cover;border-radius:8px" alt="">';
  }).join("")+'</div>';
}
function galleryHTML(item){
  var imgs = collectImages(item);
  if(!imgs.length) return "";
  return '<div class="gallery">'+imgs.map(function(f){
    return '<button type="button" class="gallery-item" data-file-preview="1" data-file-url="'+esc(f.url)+'" data-file-name="'+esc(f.name || "图片")+'"><img src="'+esc(f.url)+'" alt="'+esc(f.name || "")+'"></button>';
  }).join("")+'</div>';
}

function collectFiles(item){
  if(!item) return [];
  if(Array.isArray(item.files) && item.files.length) return item.files;
  if(item.file) return [{name:item.fileName||"附件", url:item.file, type:"文件"}];
  return [];
}
/* 文件条目右侧的按钮：
   —— 自己的文件（files/ 之类的站内路径）：浏览器能直接存，显示「下载」
   —— 网盘等外链：站外地址下载不了，显示「打开」（新窗口打开） */
function isExternalFile(url){
  var u = String(url || "").trim();
  if(!u) return false;
  if(/^(https?:)?\/\//i.test(u)){
    try {
      var host = new URL(u, location.href).hostname;
      var self = location.hostname;
      if(host === self || /(^|\.)github\.io$/i.test(host)) return false;
      return true;
    } catch(e){ return true; }
  }
  return false;
}
function filePreviewExt(name, url){
  var n = String(name || "").split(/[?#]/)[0];
  var m = n.match(/\.([a-z0-9]{1,10})$/i);
  if(m) return m[1].toLowerCase();
  try{
    var p = new URL(String(url || ""), document.baseURI).pathname;
    m = p.match(/\.([a-z0-9]{1,10})$/i);
    return m ? m[1].toLowerCase() : "";
  }catch(e){ return ""; }
}
function filePreviewKind(name, url){
  var ext = filePreviewExt(name, url);
  if(/^(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(ext)) return "image";
  if(ext === "pdf") return "pdf";
  if(/^(html?|htm)$/.test(ext)) return "html";
  if(/^(md|markdown)$/.test(ext)) return "markdown";
  if(/^(txt|log|json|csv|tsv|xml|ya?ml|ini|conf|cfg|js|mjs|cjs|ts|css|scss|less|py|c|cpp|h|hpp|java|go|rs|sql|sh|bat|ps1)$/.test(ext)) return "text";
  if(/^(mp3|wav|flac|aac|m4a|ogg|opus)$/.test(ext)) return "audio";
  if(/^(mp4|webm|mov|mkv|avi|ogv)$/.test(ext)) return "video";
  if(/^(doc|docx|ppt|pptx|xls|xlsx|odt|ods|odp)$/.test(ext)) return "office";
  return "other";
}
function isLocalUploadPath(url){
  var u = String(url || "").trim();
  if(!u) return false;
  if(/^(https?:)?\/\//i.test(u)){
    try{
      var parsed = new URL(u, location.href);
      if(parsed.hostname !== location.hostname) return false;
      return /^\/files\//i.test(parsed.pathname);
    }catch(e){ return false; }
  }
  return /^(\.\/)?files\//i.test(u) || /^\/files\//i.test(u);
}
function filePreviewIcon(kind){
  return kind === "image" ? "🖼️" : kind === "pdf" ? "📕" : kind === "html" ? "🌐" :
    kind === "markdown" ? "📝" : kind === "text" ? "📄" : kind === "audio" ? "🎵" :
    kind === "video" ? "🎬" : kind === "office" ? "📊" : "📎";
}
function openFilePreviewFromButton(btn){
  if(!btn) return;
  openFilePreview(btn.getAttribute("data-file-url") || "", btn.getAttribute("data-file-name") || "文件");
}
function fileActionHTML(url, name){
  if(!url) return "<span>待上传</span>";
  var local = isLocalUploadPath(url);
  var kind = filePreviewKind(name, url);
  if(local){
    var label = kind === "other" ? "打开" : "预览";
    return '<button type="button" class="file-open file-preview-trigger" data-file-preview="1" data-file-url="' + esc(url) + '" data-file-name="' + esc(name || "文件") + '">' + label + '</button>';
  }
  if(isExternalFile(url)){
    return '<a class="file-open" href="'+esc(url)+'" target="_blank" rel="noopener">打开</a>';
  }
  return '<a class="file-open" href="'+esc(url)+'" download="'+esc(name||"")+'" target="_blank" rel="noopener">下载</a>';
}

/* ============================================================
   通用文件预览器：站内上传的常见文件直接在页面内打开
   ============================================================ */
var fileViewerLoadId = 0;
function fileViewerAbsolute(url){
  try{ return new URL(url, document.baseURI).href; }catch(e){ return String(url || ""); }
}
function openFilePreview(url, name){
  if(!url) return;
  var box = document.getElementById("fileViewer");
  var body = document.getElementById("fileViewerBody");
  var nameEl = document.getElementById("fileViewerName");
  var metaEl = document.getElementById("fileViewerMeta");
  var iconEl = document.getElementById("fileViewerIcon");
  var openEl = document.getElementById("fileViewerOpen");
  var dlEl = document.getElementById("fileViewerDownload");
  if(!box || !body) return;
  var abs = fileViewerAbsolute(url);
  var ext = filePreviewExt(name, abs);
  var kind = filePreviewKind(name, abs);
  var loadId = ++fileViewerLoadId;
  name = name || "文件";
  if(nameEl) nameEl.textContent = name;
  if(metaEl) metaEl.textContent = (ext ? ext.toUpperCase() : "文件") + " · " + ({
    image:"图片预览", pdf:"PDF 文档", html:"HTML 页面", markdown:"Markdown 文档",
    text:"文本文件", audio:"音频", video:"视频", office:"Office 文档", other:"文件"
  }[kind] || "文件");
  if(iconEl) iconEl.textContent = filePreviewIcon(kind);
  if(openEl) openEl.href = abs;
  if(dlEl){ dlEl.href = abs; dlEl.setAttribute("download", name); }
  body.className = "file-viewer-body";
  body.innerHTML = "";

  if(kind === "image"){
    body.className += " is-image";
    body.innerHTML = '<img class="file-viewer-image" src="' + esc(abs) + '" alt="' + esc(name) + '">';
  }else if(kind === "pdf"){
    body.className += " is-frame";
    body.innerHTML = '<iframe class="file-viewer-frame" src="' + esc(abs) + '" title="' + esc(name) + '"></iframe>';
  }else if(kind === "html"){
    body.className += " is-frame";
    body.innerHTML = '<iframe class="file-viewer-frame" src="' + esc(abs) + '" title="' + esc(name) + '" sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"></iframe>';
  }else if(kind === "audio"){
    body.innerHTML = '<div class="file-viewer-media"><audio controls autoplay src="' + esc(abs) + '"></audio></div>';
  }else if(kind === "video"){
    body.innerHTML = '<div class="file-viewer-media"><video controls autoplay playsinline src="' + esc(abs) + '"></video></div>';
  }else if(kind === "office"){
    var localHost = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname);
    if(localHost){
      body.innerHTML = '<div class="file-viewer-fallback"><span>📊</span><h3>' + esc(name) + '</h3><p>Office 在线预览需要部署到公网后再打开；本地开发时请先下载查看。</p><div class="file-viewer-fallback-actions"><a class="file-open" href="' + esc(abs) + '" target="_blank" rel="noopener">打开</a><a class="file-open" href="' + esc(abs) + '" download="' + esc(name) + '">下载</a></div></div>';
    }else{
      body.className += " is-frame";
      body.innerHTML = '<iframe class="file-viewer-frame" src="https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(abs) + '" title="' + esc(name) + '"></iframe>';
    }
  }else if(kind === "markdown" || kind === "text"){
    body.innerHTML = '<div class="file-viewer-loading">正在读取文件…</div>';
    fetch(abs, {cache:"no-store"}).then(function(res){
      if(!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    }).then(function(text){
      if(loadId !== fileViewerLoadId) return;
      if(text.length > 500000) text = text.slice(0, 500000) + "\n\n…（预览已截断，完整内容请下载）";
      if(kind === "markdown"){
        body.className += " is-document";
        body.innerHTML = '<article class="file-viewer-document md-body">' + (mdRenderHTML(text) || '<div class="empty">文件内容为空</div>') + '</article>';
        if(typeof enhanceCodeBlocks === "function") enhanceCodeBlocks(body);
      }else{
        body.className += " is-document";
        body.innerHTML = '<pre class="file-viewer-text">' + esc(text) + '</pre>';
      }
    }).catch(function(err){
      if(loadId !== fileViewerLoadId) return;
      body.innerHTML = '<div class="file-viewer-fallback"><span>⚠️</span><h3>暂时无法读取预览</h3><p>' + esc(err.message || "文件可能尚未发布") + '</p><div class="file-viewer-fallback-actions"><a class="file-open" href="' + esc(abs) + '" target="_blank" rel="noopener">新窗口打开</a><a class="file-open" href="' + esc(abs) + '" download="' + esc(name) + '">下载</a></div></div>';
    });
  }else{
    body.innerHTML = '<div class="file-viewer-fallback"><span>' + filePreviewIcon(kind) + '</span><h3>' + esc(name) + '</h3><p>浏览器不能直接预览这个文件类型，可以在新窗口打开或下载。</p><div class="file-viewer-fallback-actions"><a class="file-open" href="' + esc(abs) + '" target="_blank" rel="noopener">打开</a><a class="file-open" href="' + esc(abs) + '" download="' + esc(name) + '">下载</a></div></div>';
  }

  box.classList.add("show");
  box.setAttribute("aria-hidden", "false");
  document.body.classList.add("file-viewer-open");
  setTimeout(function(){
    var close = document.getElementById("fileViewerClose");
    if(close) close.focus();
  }, 40);
}
function closeFilePreview(){
  fileViewerLoadId++;
  var box = document.getElementById("fileViewer");
  var body = document.getElementById("fileViewerBody");
  if(body) body.innerHTML = "";
  if(box){ box.classList.remove("show"); box.setAttribute("aria-hidden", "true"); }
  document.body.classList.remove("file-viewer-open");
}
function initFilePreview(){
  if(window.__filePreviewBound) return;
  window.__filePreviewBound = true;
  document.addEventListener("click", function(e){
    var trigger = e.target.closest("[data-file-preview], .file-preview-trigger");
    if(trigger){
      e.preventDefault();
      e.stopPropagation();
      openFilePreview(trigger.getAttribute("data-file-url") || trigger.getAttribute("href") || "",
        trigger.getAttribute("data-file-name") || trigger.textContent.trim());
      return;
    }
    var link = e.target.closest("a[href]");
    if(!link || link.closest("#fileViewer")) return;
    var href = link.getAttribute("href") || "";
    if(!isLocalUploadPath(href) || link.hasAttribute("download")) return;
    var ext = filePreviewExt("", href);
    if(!ext) return;
    e.preventDefault();
    e.stopPropagation();
    openFilePreview(href, link.getAttribute("data-file-name") || link.textContent.trim() || "文件");
  });
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape") closeFilePreview();
  });
}

function fileListGrouped(item){
  var files = collectFiles(item);
  if(!files.length) return '<div class="empty">暂无文件</div>';
  var groups = {}, order = [];
  files.forEach(function(f){
    var g = f.folder || "";
    if(!groups[g]){ groups[g] = []; order.push(g); }
    groups[g].push(f);
  });
  var html = "";
  order.forEach(function(g){
    html += '<div class="folder-title">' + (g ? ('📁 ' + esc(g)) : '📄 文件') + '</div>';
    groups[g].forEach(function(f){
      html += '<div class="file-item"><div><div class="name">'+esc(f.name)+'</div><div class="type">'+esc(f.type||"文件")+(f.size?" · "+fmtSize(f.size):"")+'</div></div>'+fileActionHTML(f.url, f.name)+'</div>';
    });
  });
  return html;
}

function fileListHTML(item){
  var files = collectFiles(item);
  return files.map(function(f){
    return '<div class="file-item"><div><div class="name">'+esc(f.name)+'</div><div class="type">'+esc(f.type||"文件")+(f.size?" · "+fmtSize(f.size):"")+'</div></div>'+fileActionHTML(f.url, f.name)+'</div>';
  }).join("") || '<div class="empty">暂无文件</div>';
}
