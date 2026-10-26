const GH_OWNER = "benyia";
const GH_REPO = "benyia.github.io";

/* 列表分页：每页条数（课程 / 通知 / 班级） */
const PAGE_SIZE = 6;
/* 首页内容卡片每页条数 */
const HOME_PAGE_SIZE = 10;
/* 首页默认显示哪几类内容（后台「首页」里可勾选） */
const HOME_SECTIONS = [
  { key: "courses",    name: "课程",   icon: "📚" },
  { key: "papers",     name: "论文",   icon: "📝" },
  { key: "notices",    name: "通知",   icon: "🔔" },
  { key: "classItems", name: "班级",   icon: "👥" },
  { key: "diary",      name: "日记",   icon: "📖" }
];
const HOME_SECTIONS_DEFAULT = ["courses", "papers", "notices", "classItems"];

const PAGE_TITLES = {
  home: ["思齐个人主页", "钟爱奥迪A6"],
  courses: ["我的课程", "课程资料与学习资源"],
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
  paperDetail: ["论文详情", ""],
  noticeDetail: ["通知详情", ""],
  classDetail: ["班级事务详情", ""],
  appDetail: ["应用详情", ""]
};

const DEFAULT_DATA = {
  siteConfig: {title:"思齐个人主页", subtitle:"钟爱奥迪A6", about:"", avatar:"思", name:"思齐", bio:"控制工程研究生", defaultImage:"files/default-cover.jpg", defaultAvatar:"files/default-avatar.png", coverPan:true, coverPanSec:3,
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
  courses: [], papers: [], notices: [], classItems: [], lifeServices: [],
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
let currentDiaryIdx = -1;
let currentAdvisorIdx = -1;
let currentNoticeIdx = -1;
let currentPaperIdx = -1;
let currentClassIdx = -1;
let paperFilter = "all";
let classFilter = "all";
let mediaFilter = "all";
/* 分页当前页：首页 / 课程 / 通知 / 班级 各记各的 */
const pageState = { home: 1, courses: 1, notices: 1, class: 1 };
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
    return '<a href="'+esc(f.url)+'" target="_blank" rel="noopener"><img src="'+esc(f.url)+'" alt=""></a>';
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
function fileActionHTML(url, name){
  if(!url) return "<span>待上传</span>";
  if(isExternalFile(url)){
    return '<a class="file-open" href="'+esc(url)+'" target="_blank" rel="noopener">打开</a>';
  }
  return '<a class="file-open" href="'+esc(url)+'" download="'+esc(name||"")+'" target="_blank" rel="noopener">下载</a>';
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
