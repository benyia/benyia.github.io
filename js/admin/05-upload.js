/* ============================================================
   文件上传
   ============================================================ */
function fileToBase64(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(String(reader.result).split(",")[1]);
    reader.onerror = ()=>reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   图片上传前优化：缩放、居中裁切、转成更适合网页的格式
   · 普通照片：最长边最多 2400px，统一转为 JPEG；头像/图标转为 WebP
   · 头像、图标：居中裁成正方形，默认最长边 256px
   · SVG 与 GIF 保持原样，避免破坏矢量图和动图
   ============================================================ */
const IMAGE_MAX_EDGE = 2400;
const IMAGE_ICON_MAX_EDGE = 256;
const IMAGE_QUALITY = 0.86;

function isRasterUpload(file){
  var type = String((file && file.type) || "").toLowerCase();
  return type.indexOf("image/") === 0 && type !== "image/svg+xml" && type !== "image/gif";
}

async function loadUploadImage(file){
  if(window.createImageBitmap){
    try{
      var bitmap = await createImageBitmap(file, {imageOrientation:"from-image"});
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: function(){ if(bitmap.close) bitmap.close(); }
      };
    }catch(e){}
  }
  var url = URL.createObjectURL(file);
  try{
    var img = await new Promise(function(resolve, reject){
      var el = new Image();
      el.onload = function(){ resolve(el); };
      el.onerror = function(){ reject(new Error("图片解码失败")); };
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      close: function(){
        try{ URL.revokeObjectURL(url); }catch(e){}
      }
    };
  }catch(e){
    try{ URL.revokeObjectURL(url); }catch(e2){}
    throw e;
  }
}

function canvasToBlob(canvas, type, quality){
  return new Promise(function(resolve){
    canvas.toBlob(resolve, type, quality);
  });
}

async function prepareImageForUpload(file, options){
  options = options || {};
  if(!isRasterUpload(file)) return {file:file, optimized:false};

  var square = !!options.square;
  var maxEdge = options.maxEdge || (square ? IMAGE_ICON_MAX_EDGE : IMAGE_MAX_EDGE);
  var minBytes = options.minBytes === undefined ? 160 * 1024 : options.minBytes;
  if(!square && !options.force && file.size <= minBytes && /image\/(jpeg|webp)/i.test(file.type)){
    return {file:file, optimized:false};
  }

  var loaded;
  try{
    loaded = await loadUploadImage(file);
  }catch(e){
    return {file:file, optimized:false, error:e.message};
  }

  try{
    var srcW = loaded.width;
    var srcH = loaded.height;
    if(!srcW || !srcH) return {file:file, optimized:false};

    var sx = 0, sy = 0, sw = srcW, sh = srcH;
    var targetW, targetH;
    if(square){
      var side = Math.min(srcW, srcH);
      sx = Math.round((srcW - side) / 2);
      sy = Math.round((srcH - side) / 2);
      sw = side;
      sh = side;
      targetW = targetH = Math.max(1, Math.min(maxEdge, side));
    }else{
      var scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
      targetW = Math.max(1, Math.round(srcW * scale));
      targetH = Math.max(1, Math.round(srcH * scale));
    }

    var resized = targetW !== srcW || targetH !== srcH || square;
    if(!resized && file.size <= minBytes && !options.force){
      return {file:file, optimized:false};
    }

    var outputType = options.format || (square ? "image/webp" : "image/jpeg");
    var quality = options.quality === undefined ? IMAGE_QUALITY : options.quality;
    var canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    var ctx = canvas.getContext("2d");
    if(!ctx) return {file:file, optimized:false};
    if(outputType === "image/jpeg"){
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(loaded.source, sx, sy, sw, sh, 0, 0, targetW, targetH);

    var blob = await canvasToBlob(canvas, outputType, quality);
    if(!blob) return {file:file, optimized:false};
    if(!resized && !options.force && blob.size >= file.size){
      return {file:file, optimized:false};
    }

    var ext = outputType === "image/png" ? "png" : (outputType === "image/webp" ? "webp" : "jpg");
    var base = String(file.name || "image").replace(/\.[^.]+$/, "") || "image";
    var outFile = new File([blob], base + "." + ext, {
      type: outputType,
      lastModified: Date.now()
    });
    return {
      file: outFile,
      optimized: true,
      originalSize: file.size,
      size: blob.size,
      width: targetW,
      height: targetH,
      type: outputType
    };
  }finally{
    loaded.close();
  }
}

/* 保留原文件名；只有重名时才追加 -2、-3 这样的短后缀 */
function cleanUploadName(name){
  var raw = String(name || "file").trim();
  var dot = raw.lastIndexOf(".");
  var ext = "";
  if(dot > 0 && raw.length - dot <= 12){
    ext = raw.slice(dot).replace(/[^.A-Za-z0-9]/g, "");
    raw = raw.slice(0, dot);
  }
  raw = raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
           .replace(/\s+/g, " ")
           .replace(/^[ ._-]+|[ ._-]+$/g, "");
  if(!raw || raw === "." || raw === "..") raw = "file";
  if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(raw)) raw = "_" + raw;
  if(raw.length > 80) raw = raw.slice(0, 80);
  return raw + ext;
}
function buildFilePath(name, attempt){
  var safe = cleanUploadName(name);
  if(attempt > 1){
    var dot = safe.lastIndexOf(".");
    safe = dot > 0
      ? safe.slice(0, dot) + "-" + attempt + safe.slice(dot)
      : safe + "-" + attempt;
  }
  return FILES_DIR + "/" + safe;
}

/* 后台元素命名兼容：课程用 c 前缀、论文 p、班级 cl */
var KIND_PREFIX = { course:"c", paper:"p", "class":"cl", life:"life", media:"media" };
function kindEl(kind, suffix){
  var p = KIND_PREFIX[kind] || kind;
  return $(p + suffix) || $(kind + suffix);
}

function setProgress(kind, pct){
  var t = kindEl(kind,"ProgressTrack"), b = kindEl(kind,"ProgressBar");
  if(t) t.classList.add("on");
  if(b) b.style.width = pct+"%";
}
function hideProgress(kind){
  var t = kindEl(kind,"ProgressTrack"), b = kindEl(kind,"ProgressBar");
  if(t) t.classList.remove("on");
  if(b) b.style.width = "0%";
}

/* ---------- 上传进度条 ---------- */
function showUploadProgress(name){
  var box = document.getElementById("upProgressBox");
  if(!box) return;
  document.getElementById("upProgressName").textContent = "正在上传：" + name;
  document.getElementById("upProgressBar").style.width = "0%";
  document.getElementById("upProgressPct").textContent = "0%";
  document.getElementById("upProgressText").textContent = "准备中…";
  box.style.display = "block";
}
function setUploadProgress(pct, loaded, total){
  var b = document.getElementById("upProgressBar");
  var p = document.getElementById("upProgressPct");
  var t = document.getElementById("upProgressText");
  if(b) b.style.width = pct + "%";
  if(p) p.textContent = pct + "%";
  if(t && loaded !== undefined) t.textContent = fmtSize(loaded) + " / " + fmtSize(total);
}
function finishUploadProgress(ok, msg){
  var b = document.getElementById("upProgressBar");
  var p = document.getElementById("upProgressPct");
  var t = document.getElementById("upProgressText");
  if(ok){
    if(b) b.style.width = "100%";
    if(p) p.textContent = "100%";
    if(t) t.textContent = msg || "上传完成 ✅";
  }else{
    if(t) t.textContent = msg || "上传失败 ❌";
  }
  setTimeout(function(){
    var box = document.getElementById("upProgressBox");
    if(box) box.style.display = "none";
  }, ok ? 1200 : 4000);
}

/* 刚上传的文件：GitHub Pages 还没发布，预览时加时间戳绕过缓存 */
var freshFiles = {};
var LOCAL_PREVIEW_KEY = "benyia_local_previews";
var localPreviewMap = (function(){
  try{ return JSON.parse(sessionStorage.getItem(LOCAL_PREVIEW_KEY) || "{}") || {}; }catch(e){ return {}; }
})();
function saveLocalPreviewStore(){
  try{
    var keys = Object.keys(localPreviewMap);
    if(keys.length > 24){
      for(var i = 0; i < keys.length - 24; i++) delete localPreviewMap[keys[i]];
    }
    sessionStorage.setItem(LOCAL_PREVIEW_KEY, JSON.stringify(localPreviewMap));
  }catch(e){}
}
function rememberLocalPreview(path, file){
  try{
    if(!path || !file || String(file.type||"").indexOf("image/") !== 0) return;
    var objectUrl = URL.createObjectURL(file);
    localPreviewMap[path] = objectUrl;
    /* 再生成一张小尺寸 JPEG 存到 sessionStorage：刷新页面后、Pages 尚未发布时也看得到 */
    var img = new Image();
    img.onload = function(){
      try{
        var edge = 360;
        var scale = Math.min(1, edge / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
        c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
        var ctx = c.getContext("2d");
        if(ctx){
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          var data = c.toDataURL("image/jpeg", 0.82);
          localPreviewMap[path] = data;
          saveLocalPreviewStore();
        }
      }catch(e){}
    };
    img.src = objectUrl;
  }catch(e){}
}
function previewSrc(path){
  var p = String(path || "");
  if(!p) return p;
  if(localPreviewMap[p]) return localPreviewMap[p];
  try{
    var u = new URL(p, location.href);
    var rel = u.pathname.replace(/^\//, "");
    if(localPreviewMap[rel]) return localPreviewMap[rel];
  }catch(e){}
  if(freshFiles[p]) return p + (p.indexOf("?") >= 0 ? "&" : "?") + "t=" + freshFiles[p];
  return p;
}

/* ============================================================
   上传前去重：同一份内容只存一份
   · 用 git 的 blob 指纹 sha1("blob <长度>\0" + 内容) 判断内容是否已在仓库里
   · 命中就直接复用已有路径，不再新建副本
   （以前「保存没显示 → 又传一遍」会堆出几十份重复文件，这里从根上堵住）
   ============================================================ */
var _blobIndex = null;      /* { blobSha1 -> 仓库路径 }，整个会话缓存一次 */
function isLegacyUploadPath(path){
  return /^files\/\d{10,}_\d+_[a-z0-9]+_/i.test(String(path || ""));
}
async function repoBlobIndex(force){
  if(_blobIndex && !force) return _blobIndex;
  try{
    var res = await fetch(GH_API_BASE + "/repos/"+GH_OWNER+"/"+GH_REPO+"/git/trees/"+GH_BRANCH+"?recursive=1",
                          { headers: ghHeaders(), cache: "no-store" });
    var j = await res.json();
    var map = {};
    if(res.ok && j && j.tree) j.tree.forEach(function(t){ if(t.type === "blob") map[t.sha] = t.path; });
    _blobIndex = map;
  }catch(e){ if(!_blobIndex) _blobIndex = {}; }
  return _blobIndex;
}
/* 本地算出与 git 一致的内容指纹 */
async function gitBlobSha1(file){
  try{
    if(!(window.crypto && crypto.subtle && crypto.subtle.digest)) return "";
    var buf = new Uint8Array(await file.arrayBuffer());
    var head = new TextEncoder().encode("blob " + buf.length + "\u0000");
    var all = new Uint8Array(head.length + buf.length);
    all.set(head, 0); all.set(buf, head.length);
    var d = await crypto.subtle.digest("SHA-1", all);
    return Array.prototype.map.call(new Uint8Array(d), function(b){ return ("0"+b.toString(16)).slice(-2); }).join("");
  }catch(e){ return ""; }
}

async function uploadFile(file, kind, imageOptions){
  var originalSize = file.size;
  var wasOptimized = false;
  if(!getStoredToken()) throw new Error("请先在「站点设置」里填写 GitHub Token");

  try{
    var prepared = await prepareImageForUpload(file, imageOptions);
    if(prepared && prepared.file){
      file = prepared.file;
      wasOptimized = !!prepared.optimized;
    }
  }catch(e){}

  if(file.size > MAX_FILE_MB*1024*1024){
    throw new Error("「"+file.name+"」有 "+fmtSize(file.size)+"，超过 GitHub 单文件上限 "+MAX_FILE_MB+"MB。大文件请先传到网盘，再用「外链地址」粘链接。");
  }

  var status = kindEl(kind, "UpStatus");

  /* —— 去重：内容指纹一致就直接复用仓库里已有的文件 —— */
  var blobSha1 = "";
  try{
    blobSha1 = await gitBlobSha1(file);
    if(blobSha1){
      var idx = await repoBlobIndex();
      var exist = idx[blobSha1];
      if(exist && exist.indexOf("files/") === 0 && !isLegacyUploadPath(exist)){
        if(status) status.textContent = "内容已存在，直接复用：" + exist;
        finishUploadProgress(true, "已复用仓库里已有的文件（没有重复上传）");
        showToast("这个文件内容和已上传的一模一样，已直接复用，没有重复占空间");
        rememberLocalPreview(exist, file);
        return { name: exist.split("/").pop(), url: exist, type: (exist.split(".").pop()||"file").toUpperCase(), size: file.size };
      }
    }
  }catch(e){}

  showUploadProgress(file.name);
  if(status){ status.textContent = "正在编码 " + file.name + " …"; }
  setUploadProgress(0);
  if(file.size > 2*1024*1024){ await new Promise(function(r){ setTimeout(r, 50); }); }

  var content = await fileToBase64(file);
  var totalSize = file.size;
  setUploadProgress(0, 0, totalSize);

  var lastErr = "";
  var lastStatus = 0;
  var nameAttempt = 1;
  for(var attempt=1; attempt<=4; attempt++){
    var safe = buildFilePath(file.name, nameAttempt);
    var apiPath = safe.split("/").map(encodeURIComponent).join("/");
    var body = JSON.stringify({message:"Upload: "+file.name, content:content, branch:GH_BRANCH});
    if(attempt > 1){
      if(status) status.textContent = "上传冲突，正在重试（"+attempt+"/4）…";
      document.getElementById("upProgressText").textContent = "重试 " + attempt + "/4…";
      setUploadProgress(0, 0, totalSize);
      await new Promise(function(r){ setTimeout(r, 700*attempt); });
    }
    try{
      await new Promise(function(resolve, reject){
        var xhr = new XMLHttpRequest();
        xhr.open("PUT", GH_API_BASE + "/repos/"+GH_OWNER+"/"+GH_REPO+"/contents/"+apiPath);
        var hh = ghHeaders();
        Object.keys(hh).forEach(function(k){ xhr.setRequestHeader(k, hh[k]); });
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.timeout = 600000;
        xhr.upload.onprogress = function(e){
          if(!e.lengthComputable) return;
          var pct = Math.round(e.loaded / e.total * 100);
          if(pct > 99) pct = 99;                       /* 99% 留给服务端处理 */
          setUploadProgress(pct, Math.round(totalSize * pct / 100), totalSize);
          if(status) status.textContent = "上传中 " + pct + "%　" + file.name;
        };
        xhr.onload = function(){
          if(xhr.status >= 200 && xhr.status < 300){ resolve(); return; }
          var m = "HTTP " + xhr.status;
          try{ var j = JSON.parse(xhr.responseText); if(j.message) m += "：" + j.message; }catch(e){}
          var err = new Error(m);
          err.status = xhr.status;
          reject(err);
        };
        xhr.onerror = function(){ reject(new Error("网络错误")); };
        xhr.ontimeout = function(){ reject(new Error("上传超时")); };
        xhr.send(body);
      });

      freshFiles[safe] = Date.now();
      rememberLocalPreview(safe, file);
      if(blobSha1 && _blobIndex) _blobIndex[blobSha1] = safe;   /* 同一份内容再传就直接命中 */
      setUploadProgress(100, totalSize, totalSize);
      var savedText = wasOptimized
        ? " · 已优化 " + fmtSize(originalSize) + " → " + fmtSize(totalSize)
        : "";
      finishUploadProgress(true, "上传完成 ✅ " + fmtSize(totalSize) + savedText);
      if(status) status.textContent = "✅ 已上传：" + file.name + "（记得点保存）";
      return {
        name:file.name,
        url:safe,
        type:(file.name.split(".").pop()||"file").toUpperCase(),
        size:file.size,
        originalSize:originalSize,
        optimized:wasOptimized
      };
    }catch(e){
      lastErr = e.message;
      lastStatus = e.status || 0;
      if(lastStatus === 422) nameAttempt++;
      if(attempt < 4 && (lastStatus === 409 || lastStatus === 422 || lastStatus >= 500 || !lastStatus)){
        continue;
      }
      break;
    }
  }
  finishUploadProgress(false, "上传失败 ❌ " + lastErr);
  if(status) status.textContent = "❌ 上传失败：" + lastErr;
  throw new Error(lastErr);
}

/* ---------- 通用图片 / 图标上传 ---------- */
const imgDrafts = {};
let imgKey = null;
let iconTarget = null;
