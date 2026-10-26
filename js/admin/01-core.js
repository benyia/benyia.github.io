/* ============================================================
   配置
   ============================================================ */
const GH_OWNER = "benyia";
const GH_REPO  = "benyia.github.io";
const GH_BRANCH = "main";
const DATA_PATH = "data.json";
const FILES_DIR = "files";
// 新增：Cloudflare Worker 反代 GitHub API 地址
const GH_API_BASE = "https://github-api-proxy.s3069988193.workers.dev";
  
/* 默认管理密码（仅首次使用；可在站点设置里修改，改后的密码存在本浏览器） */
const ADMIN_PWD = "syj3008338";
const PWD_KEY = "benyia_admin_pwd";
const TOKEN_KEY = "benyia_gh_token";
/* 刚保存过的时间戳：前台看到这个标记就绕过 Pages 的 CDN 缓存直接读 API */
const FRESH_KEY = "benyia_data_fresh";

/* 上传单个文件的建议上限（GitHub contents API 限制，超过请用 Git LFS 或网盘） */
const MAX_FILE_MB = 100;

const DEFAULT_DATA = {
  siteConfig:{title:"思齐个人主页",subtitle:"钟爱奥迪A6",about:"你好，我是思齐，控制工程研究生。\n\n热爱技术，记录学习与生活。",avatar:"思",name:"思齐",bio:"控制工程研究生",coverPan:true,coverPanSec:3},
  categories:[
    {icon:"📚",name:"课程学习",section:"courses"},
    {icon:"📝",name:"论文",section:"papers"},
    {icon:"🔔",name:"学校通知",section:"notices"},
    {icon:"👥",name:"班级事务",section:"class"}
  ],
  tags:["控制工程","深度学习","FPGA","Python"],
  quickLinks:[
    {icon:"☁️",title:"百度网盘",url:"https://pan.baidu.com"},
    {icon:"🚄",title:"12306",url:"https://www.12306.cn"},
    {icon:"🐙",title:"GitHub",url:"https://github.com"},
    {icon:"💡",title:"知乎",url:"https://www.zhihu.com"}
  ],
  friendLinks:[],
  friendApplies:[],
  courses:[],papers:[],notices:[],classItems:[],lifeServices:[],apps:[],
  ledger:[],ledgerCategories:{expense:["吃饭","买东西","生活用品","交通","娱乐","学习","医疗","其他"],income:["工资","奖学金","补贴","红包","其他"]},media:[],roster:[],rosterConfig:{showSensitive:false},diary:[],advisor:[],logs:[]
};

/* ============================================================
   全局状态
   ============================================================ */
let blogData = null;
let dataSha = "";
let saving = false;

/* 编辑态：null 表示新增，数字表示正在编辑的下标 */
const editing = {course:null, paper:null, class:null};
/* 表单里已上传的文件列表 */
const drafts  = {course:[], paper:[], class:[], life:[], media:[], dmedia:[], nf:[], adv:[]};

/* ============================================================
   小工具
   ============================================================ */
function $(id){ return document.getElementById(id); }
var imgModalCtx = null;

function imgModalError(el){
  var msg = document.getElementById("imgModalMsg");
  var ctx = imgModalCtx || {};
  var raw = ctx.rawUrl || "";
  /* 新上传的文件：GitHub Pages 还在发布，自动重试（最多 12 次，每次 3 秒） */
  if(raw && freshFiles[raw]){
    ctx._retry = (ctx._retry || 0) + 1;
    if(ctx._retry <= 12){
      msg.style.color = "#d97706";
      msg.textContent = "⏳ 这张图刚上传，GitHub 还在发布中…自动重试 " + ctx._retry + "/12";
      setTimeout(function(){
        var u = raw + (raw.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now();
        document.getElementById("imgModalBig").src = u;
      }, 3000);
      return;
    }
  }
  /* 换回原始（相对）路径再试一次 */
  if(!el._retried){
    el._retried = true;
    if(raw && raw !== el.getAttribute("src")){
      msg.style.color = "#d97706";
      msg.textContent = "绝对地址加载失败，改用原始路径重试…";
      el.src = raw;
      return;
    }
  }
  msg.style.color = "#ef4444";
  msg.textContent = "❌ 图片加载失败。尝试过：" + el.getAttribute("src") + (el.src !== el.getAttribute("src") ? ("  /  " + el.src) : "");
  var u = document.getElementById("imgModalUrl");
  if(u) u.innerHTML = '地址：<a href="'+esc(el.src)+'" target="_blank">'+esc(el.src)+'</a>';
}
function openImgModal(url, opt){
  opt = opt || {};
  var abs = "";
  try { abs = url ? new URL(url, location.href).href : ""; } catch(e) { abs = String(url||""); }
  imgModalCtx = { url: abs, rawUrl: String(url||""), inputId: opt.inputId || null, draftKey: opt.draftKey || null, draftIdx: (opt.draftIdx === undefined ? null : opt.draftIdx), rowKind: opt.rowKind || null, rowIdx: (opt.rowIdx === undefined ? null : opt.rowIdx), imgIdx: (opt.imgIdx === undefined ? null : opt.imgIdx) };
  clearCrop();
  document.getElementById("imgModalTitle").textContent = opt.title || "图片预览";
  var bigEl = document.getElementById("imgModalBig");
  bigEl._retried = false;
  imgModalCtx._retry = 0;
  bigEl.src = previewSrc(abs);
  document.getElementById("imgModalPreview").innerHTML = '<img src="'+esc(previewSrc(abs))+'" style="width:100%;height:100%;object-fit:cover;display:block">';
  document.getElementById("imgModalOpen").href = abs;
  document.getElementById("imgModalUrl").innerHTML = abs ? ('原图地址：<a href="'+esc(abs)+'" target="_blank">'+esc(abs)+'</a>') : "（没有图片地址）";
  document.getElementById("imgModalMsg").textContent = abs ? "" : "⚠️ 没有拿到图片地址，请重新上传";
  document.getElementById("imgModal").style.display = "flex";
  setTimeout(initCropDrag, 30);
}
function closeImgModal(){
  document.getElementById("imgModal").style.display = "none";
  imgModalCtx = null;
}
function openImgFrom(el){
  openImgModal(el.getAttribute("data-url"), {
    title: el.getAttribute("data-title") || "图片预览",
    inputId: el.getAttribute("data-input") || null,
    draftKey: el.getAttribute("data-dkey") || null,
    draftIdx: el.getAttribute("data-didx") !== null ? parseInt(el.getAttribute("data-didx"), 10) : null,
    rowKind: el.getAttribute("data-rkind") || null,
    rowIdx: el.getAttribute("data-ridx") !== null ? parseInt(el.getAttribute("data-ridx"), 10) : null,
    imgIdx: el.getAttribute("data-iidx") !== null ? parseInt(el.getAttribute("data-iidx"), 10) : null
  });
  return false;
}
var cropStart = null, cropBox = null;
function clearCrop(){
  cropStart = null; cropBox = null;
  var r = document.getElementById("cropRect");
  if(r){ r.style.display = "none"; r.style.width = "0px"; r.style.height = "0px"; }
}
function updateCropRect(){
  var img = document.getElementById("imgModalBig");
  var box = document.getElementById("cropRect");
  if(!box || !cropBox){ return; }
  if(cropBox.w < 4 || cropBox.h < 4){ box.style.display = "none"; return; }
  box.style.display = "block";
  box.style.left = cropBox.x + "px";
  box.style.top = cropBox.y + "px";
  box.style.width = cropBox.w + "px";
  box.style.height = cropBox.h + "px";
  cropBox.dispW = img.clientWidth;
  cropBox.dispH = img.clientHeight;
}
function initCropDrag(){
  var img = document.getElementById("imgModalBig");
  if(!img || img._cropBound) return;
  img._cropBound = true;
  img.addEventListener("mousedown", function(e){
    var r = img.getBoundingClientRect();
    var sx = e.clientX - r.left, sy = e.clientY - r.top;
    cropStart = { x: sx, y: sy };
    cropBox = { x: sx, y: sy, w: 0, h: 0, dispW: r.width, dispH: r.height };
    updateCropRect();
    e.preventDefault();
  });
  document.addEventListener("mousemove", function(e){
    if(!cropStart) return;
    var r = img.getBoundingClientRect();
    var x = Math.max(0, Math.min(r.width, e.clientX - r.left));
    var y = Math.max(0, Math.min(r.height, e.clientY - r.top));
    cropBox = { x: Math.min(cropStart.x, x), y: Math.min(cropStart.y, y), w: Math.abs(x - cropStart.x), h: Math.abs(y - cropStart.y), dispW: r.width, dispH: r.height };
    updateCropRect();
  });
  document.addEventListener("mouseup", function(){ cropStart = null; });
}
/* 把处理好的图片上传并替换掉原来的引用 */
async function applyEditedBlob(blob, note){
  var file = new File([blob], "edited.png", { type: "image/png" });
  var meta = await uploadFile(file, "img");
  var newUrl = meta.url;
  var ctx = imgModalCtx;
  if(ctx.inputId){
    document.getElementById(ctx.inputId).value = newUrl;
    refreshIconPrev(ctx.inputId);
  }
  if(ctx.draftKey !== null && ctx.draftIdx !== null && imgDrafts[ctx.draftKey]){
    imgDrafts[ctx.draftKey][ctx.draftIdx].url = newUrl;
    renderImgDrafts(ctx.draftKey);
  }
  if(ctx.rowKind && ctx.rowIdx !== null && ctx.imgIdx !== null && blogData[ctx.rowKind] && blogData[ctx.rowKind][ctx.rowIdx]){
    var arr = blogData[ctx.rowKind][ctx.rowIdx].images || [];
    if(arr[ctx.imgIdx]){ arr[ctx.imgIdx].url = newUrl; arr[ctx.imgIdx].name = "edited.png"; }
    blogData[ctx.rowKind][ctx.rowIdx].images = arr;
    saveData(note || "编辑图片");
    renderAll();
  }
  imgModalCtx.url = newUrl;
  var abs2 = newUrl;
  try { abs2 = new URL(newUrl, location.href).href; } catch(e) {}
  freshFiles[newUrl] = Date.now();
  document.getElementById("imgModalBig").src = previewSrc(abs2);
  document.getElementById("imgModalPreview").innerHTML = '<img src="'+esc(abs2)+'" style="width:100%;height:100%;object-fit:cover;display:block">';
  document.getElementById("imgModalOpen").href = abs2;
  document.getElementById("imgModalUrl").innerHTML = '原图地址：<a href="'+esc(abs2)+'" target="_blank">'+esc(abs2)+'</a>';
  clearCrop();
  return newUrl;
}
async function cropModalImage(){
  var msg = document.getElementById("imgModalMsg");
  if(!imgModalCtx) return;
  if(!cropBox || cropBox.w < 5 || cropBox.h < 5){
    msg.style.color = "#d97706";
    msg.textContent = "请先在左边的图片上按住鼠标拖动，框出要保留的区域";
    return;
  }
  msg.style.color = "#64748b";
  msg.textContent = "正在裁剪并上传…";
  try{
    var img = await loadImgEl(imgModalCtx.url);
    var dw = cropBox.dispW || document.getElementById("imgModalBig").clientWidth;
    var dh = cropBox.dispH || document.getElementById("imgModalBig").clientHeight;
    var sx = cropBox.x * (img.naturalWidth / dw);
    var sy = cropBox.y * (img.naturalHeight / dh);
    var sw = cropBox.w * (img.naturalWidth / dw);
    var sh = cropBox.h * (img.naturalHeight / dh);
    var cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(sw));
    cv.height = Math.max(1, Math.round(sh));
    cv.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    var blob = await new Promise(function(res){ cv.toBlob(res, "image/png"); });
    if(!blob) throw new Error("canvas 导出失败");
    await applyEditedBlob(blob, "裁剪图片");
    msg.style.color = "#059669";
    msg.textContent = "✅ 裁剪完成（" + cv.width + "×" + cv.height + "），别忘了点「保存」！";
  }catch(e){
    msg.style.color = "#ef4444";
    msg.textContent = "❌ 裁剪失败：" + e.message;
  }
}

function loadImgEl(url){
  return new Promise(function(res, rej){
    var im = new Image();
    im.onload = function(){ res(im); };
    im.onerror = function(){ rej(new Error("图片加载失败（外站图片可能不支持编辑）")); };
    im.src = url;
  });
}
async function rotateModalImage(deg){
  if(!imgModalCtx) return;
  var msg = document.getElementById("imgModalMsg");
  msg.style.color = "#64748b";
  msg.textContent = "正在旋转并重新上传…";
  try{
    var img = await loadImgEl(imgModalCtx.url);
    var swap = (deg === 90 || deg === -90 || deg === 270);
    var cv = document.createElement("canvas");
    cv.width = swap ? img.naturalHeight : img.naturalWidth;
    cv.height = swap ? img.naturalWidth : img.naturalHeight;
    var c2 = cv.getContext("2d");
    c2.translate(cv.width / 2, cv.height / 2);
    c2.rotate(deg * Math.PI / 180);
    c2.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    var blob = await new Promise(function(res){ cv.toBlob(res, "image/png"); });
    if(!blob) throw new Error("canvas 导出失败");
    await applyEditedBlob(blob, "旋转图片");
    msg.style.color = "#059669";
    msg.textContent = "✅ 已旋转并上传为" + cv.width + "×" + cv.height + "，别忘了点「保存」！";
  }catch(e){
    msg.style.color = "#ef4444";
    msg.textContent = "❌ 失败：" + e.message;
  }
}
function deleteModalImage(){
  if(!imgModalCtx) return;
  if(!confirm("从当前内容里移除这张图片？（GitHub 上的文件不会被删）")) return;
  var ctx = imgModalCtx;
  if(ctx.inputId){
    document.getElementById(ctx.inputId).value = "";
    refreshIconPrev(ctx.inputId);
  }
  if(ctx.draftKey !== null && ctx.draftIdx !== null && imgDrafts[ctx.draftKey]){
    imgDrafts[ctx.draftKey].splice(ctx.draftIdx, 1);
    renderImgDrafts(ctx.draftKey);
  }
  if(ctx.rowKind && ctx.rowIdx !== null && ctx.imgIdx !== null && blogData[ctx.rowKind] && blogData[ctx.rowKind][ctx.rowIdx]){
    var arr = blogData[ctx.rowKind][ctx.rowIdx].images || [];
    arr.splice(ctx.imgIdx, 1);
    blogData[ctx.rowKind][ctx.rowIdx].images = arr;
    saveData("删除图片");
    renderAll();
  }
  closeImgModal();
  showToast("已移除（记得保存）");
}

var ICON_FIELDS = ["cfgAvatar","cIcon","lsIcon","catIcon","qlIcon","rPhoto","cfgDefaultImage","cfgDefaultAvatar","frAvatar","wkBg","apIcon","apCover"];
function refreshIconPrev(id){
  var inp = $(id), box = $("prev_" + id);
  if(!inp || !box) return;
  var v = String(inp.value||"").trim();
  if(isAdminImg(v)){
    box.innerHTML = '<img src="'+esc(previewSrc(v))+'" data-url="'+esc(v)+'" data-input="'+esc(id)+'" data-title="图标预览" onclick="openImgFrom(this)" style="width:38px;height:38px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;vertical-align:middle;margin-left:4px;cursor:zoom-in">';
  }else if(v){
    box.innerHTML = '<span style="font-size:1.3rem;margin-left:4px;vertical-align:middle">'+esc(v)+'</span>';
  }else{
    box.innerHTML = '';
  }
}
function refreshAllIconPrevs(){ ICON_FIELDS.forEach(refreshIconPrev); }

function isAdminImg(v){
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
function iconThumb(v, size){
  size = size || 28;
  if(isAdminImg(v)) return '<img src="'+esc(v)+'" style="width:'+size+'px;height:'+size+'px;object-fit:cover;border-radius:6px;vertical-align:middle">';
  return esc(v||"");
}

function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
