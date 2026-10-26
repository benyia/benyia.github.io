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

/* 清理文件名并生成存放路径 */
let _upSeq = 0;
function buildFilePath(name){
  _upSeq++;
  const safe = String(name).replace(/[^\w.\-\u4e00-\u9fa5]/g, "_").slice(-60);
  const rnd = Math.random().toString(36).slice(2, 10);
  return FILES_DIR + "/" + Date.now() + "_" + _upSeq + "_" + rnd + "_" + safe;
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
function previewSrc(path){
  var p = String(path || "");
  if(!p) return p;
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

async function uploadFile(file, kind){
  if(file.size > MAX_FILE_MB*1024*1024){
    throw new Error("「"+file.name+"」有 "+fmtSize(file.size)+"，超过 GitHub 单文件上限 "+MAX_FILE_MB+"MB。大文件请先传到网盘，再用「外链地址」粘链接。");
  }
  if(!getStoredToken()) throw new Error("请先在「站点设置」里填写 GitHub Token");

  var status = kindEl(kind, "UpStatus");

  /* —— 去重：内容指纹一致就直接复用仓库里已有的文件 —— */
  var blobSha1 = "";
  try{
    blobSha1 = await gitBlobSha1(file);
    if(blobSha1){
      var idx = await repoBlobIndex();
      var exist = idx[blobSha1];
      if(exist && exist.indexOf("files/") === 0){
        if(status) status.textContent = "内容已存在，直接复用：" + exist;
        finishUploadProgress(true, "已复用仓库里已有的文件（没有重复上传）");
        showToast("这个文件内容和已上传的一模一样，已直接复用，没有重复占空间");
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
  for(var attempt=1; attempt<=4; attempt++){
    var safe = buildFilePath(file.name);
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
      if(blobSha1 && _blobIndex) _blobIndex[blobSha1] = safe;   /* 同一份内容再传就直接命中 */
      setUploadProgress(100, totalSize, totalSize);
      finishUploadProgress(true, "上传完成 ✅ " + fmtSize(totalSize));
      if(status) status.textContent = "✅ 已上传：" + file.name + "（记得点保存）";
      return {name:file.name, url:safe, type:(file.name.split(".").pop()||"file").toUpperCase(), size:file.size};
    }catch(e){
      lastErr = e.message;
      lastStatus = e.status || 0;
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
