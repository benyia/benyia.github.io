/* ---------- 前台图片上传（直接传到仓库的 files/ 目录） ---------- */
function cleanFrontUploadName(name){
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
function frontUploadPath(folder, name, attempt){
  var safe = cleanFrontUploadName(name);
  if(attempt > 1){
    var dot = safe.lastIndexOf(".");
    safe = dot > 0
      ? safe.slice(0, dot) + "-" + attempt + safe.slice(dot)
      : safe + "-" + attempt;
  }
  return (folder || "files") + "/" + safe;
}
async function uploadFrontFile(file, folder){
  var token = frontToken();
  if(!token) throw new Error("需要先在后台「站点设置」保存 GitHub Token");
  var buf = new Uint8Array(await file.arrayBuffer());
  var bin = "", CHUNK = 0x8000;
  for(var i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CHUNK));
  var payload = JSON.stringify({ message: "上传文件：" + cleanFrontUploadName(file.name), content: btoa(bin), branch: "main" });
  var lastError = "";
  var nameAttempt = 1;
  for(var attempt = 1; attempt <= 4; attempt++){
    var repoPath = frontUploadPath(folder, file.name, nameAttempt);
    var apiPath = repoPath.split("/").map(encodeURIComponent).join("/");
    var res = await fetch("https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/" + apiPath, {
      method: "PUT",
      headers: { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "Content-Type": "application/json" },
      body: payload
    });
    if(res.ok) return repoPath;
    lastError = "HTTP " + res.status;
    try { var j = await res.json(); if(j.message) lastError += "：" + j.message; } catch(e){}
    if(res.status !== 422 || attempt === 4) break;
    nameAttempt++;
    await new Promise(function(resolve){ setTimeout(resolve, 250 * attempt); });
  }
  throw new Error(lastError);
}
async function onFrontImagePick(e){
  var files = Array.prototype.slice.call((e.target && e.target.files) || []);
  if(e.target) e.target.value = "";
  if(!files.length) return;
  if(!frontToken()){ sayStatus("fdStatus", "上传图片需要先在后台「站点设置」保存 GitHub Token", "#ef4444"); return; }
  sayStatus("fdStatus", "上传中（" + files.length + " 张）…");
  var editor = document.getElementById("fdContent");
  try{
    var urls = [];
    for(var i = 0; i < files.length; i++){
      var p = await uploadFrontFile(files[i], "files");
      urls.push(p);
    }
    if(editor){
      editor.focus();
      document.execCommand("insertHTML", false, urls.map(function(u){
        return '<img src="' + esc(u) + '" alt="">';
      }).join(""));
    }
    sayStatus("fdStatus", "✅ 已插入 " + urls.length + " 张图片（GitHub Pages 发布后加载，稍等 1 分钟）", "var(--primary-dark)");
  }catch(err){
    sayStatus("fdStatus", "图片上传失败：" + err.message, "#ef4444");
  }
}
/* 前台只读：不显示任何内容写入表单。
   记账、课程、合辑、日记、导师指导等全部在管理后台维护。 */
function initFrontForms(){
  var hasToken = !!frontToken();
  var ownerOnly = ["ledgerFormBox", "ledgerHint"];
  ownerOnly.forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    el.setAttribute("hidden", "");
  });
  var stats = document.getElementById("ledgerStatsBox");
  if(stats) stats.removeAttribute("hidden");
  var visitorHint = document.getElementById("visitorLedgerNote");
  if(visitorHint) visitorHint.style.display = hasToken ? "none" : "";
}

function autoTitle(text, date){
  var s = String(text||"");
  var lines = s.split(String.fromCharCode(10));
  var first = "";
  for(var i=0;i<lines.length;i++){
    var t = lines[i].replace(/^[#>*\-\s]+/, "").trim();
    if(t){ first = t; break; }
  }
  first = first.split("  ").join(" ").trim();
  if(!first) return date || "无标题";
  if(first.length > 24) return first.slice(0, 24) + "…";
  return first;
}
/* 日期标题：2026-09-28 → 9月28日 */
function diaryDayLabel(date){
  var m = String(date||"").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(!m) return "未标日期";
  var y = String(new Date().getFullYear());
  return (m[1] === y ? "" : m[1] + "年") + parseInt(m[2],10) + "月" + parseInt(m[3],10) + "日";
}
/* 卡片上的完整时间戳：2026-09-28 10:08（参考说说那种写法） */
function diaryStamp(d){
  var t = String((d && d.time) || "");
  var m = t.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/);
  if(m) return m[1] + " " + m[2].padStart(2,"0") + ":" + m[3];
  return String((d && d.date) || "");
}
/* 日记列表卡片：整块可点，点进独立的日记详情页 */
function diaryItemHTML(d, rawIdx){
  var title = d.title || autoTitle(d.content, d.date);
  var preview = mdText(d.content).split(String.fromCharCode(10)).join(" ").trim();
  return '<div class="diary-item diary-card" onclick="openDiary('+rawIdx+')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \')openDiary('+rawIdx+')">'
    + '<div class="diary-summary">'
    +   '<span class="diary-dot"></span>'
    +   '<span class="diary-summary-main">'
    +     '<span class="diary-summary-time">'+esc(diaryStamp(d))+'</span>'
    +     '<span class="diary-summary-title">'+esc(title)+'</span>'
    +     (preview?'<span class="diary-summary-preview">'+esc(preview)+'</span>':"")
    +   '</span>'
    +   '<span class="diary-summary-arrow">›</span>'
    + '</div></div>';
}
/* 日记详情里的影音（音频 / 视频播放器） */
function diaryMediaHTML(d){
  return (d.media||[]).map(function(m){
    var url = esc(m.url);
    var nm = String(m.name||"");
    var dot = nm.lastIndexOf(".");
    var ext = dot >= 0 ? nm.slice(dot+1).toLowerCase() : "";
    var player = "";
    if(["mp4","webm","mov","mkv","avi","m4v"].indexOf(ext) >= 0) player = '<video controls preload="metadata" src="'+url+'" style="width:100%;border-radius:10px;margin-bottom:8px"></video>';
    else if(["mp3","wav","m4a","ogg","flac","aac","wma"].indexOf(ext) >= 0) player = '<audio controls preload="metadata" src="'+url+'" style="width:100%;max-width:420px;margin-bottom:8px"></audio>';
    return '<div class="diary-media">'+player+'<div>'+fileActionHTML(url, nm)+'</div></div>';
  }).join("");
}
function renderDiary(){
  var src = blogData.diary || [];
  /* 显示顺序：最新在前；同时记住它在原始数组里的下标，供「上一篇/下一篇」跳转使用 */
  var list = src.map(function(d, i){ return { d: d, i: i }; }).reverse();
  var box = document.getElementById("diaryList");
  if(!list.length){ box.innerHTML = '<div class="empty">暂无日记</div>'; return; }
  /* 按日期分组，做成时间线：日期标题 + 当天条数 */
  var groups = [], cur = null;
  list.forEach(function(it){
    var d = it.d;
    var day = String((d && d.date) || "").slice(0, 10);
    if(!cur || cur.day !== day){ cur = { day: day, html: [] }; groups.push(cur); }
    cur.html.push(diaryItemHTML(d, it.i));
  });
  box.innerHTML = groups.map(function(g){
    return '<div class="diary-group">'
      + '<div class="diary-day"><span class="diary-day-text">'+esc(diaryDayLabel(g.day))+'</span>'
      + '<span class="diary-day-n">'+g.html.length+' 条</span></div>'
      + g.html.join("")
      + '</div>';
  }).join("");
}
/* 日记：手风琴——展开一条就把其它条收起来（老浏览器不支持 details[name] 时的兜底）；
   展开哪一条，右侧栏就显示那一条的「文章目录」，并像打开文章一样让右栏粘住 */
var diaryAccBound = false;
/* 展开日记时，右栏按「文章详情」的规矩来：有目录才隐藏站点统计并让整块粘住 */
function diaryTocLayout(){
  var on = document.body.classList.contains("toc-on");
  document.body.classList.toggle("article-open", on);
  var stat = document.getElementById("statCard");
  if(stat) stat.style.display = on ? "none" : "";
}
function diaryAccBind(){
  if(diaryAccBound) return;
  var box = document.getElementById("diaryList");
  if(!box || !box.addEventListener) return;
  diaryAccBound = true;
  box.addEventListener("toggle", function(e){
    var d = e.target;
    if(!d || String(d.tagName || "").toUpperCase() !== "DETAILS") return;
    /* 只处理「日记条目」这一层。
       正文里自带的 <details>（例如粘进来的 GitHub README 的「常见问题」）不参与手风琴：
       监听器是 capture 模式，会收到所有层级的 toggle，早先没做区分，
       点里面的折叠就会把外层这条日记一起收掉 —— 表现就是「点一下展开，整页都没了」。 */
    if(!d.classList || !d.classList.contains("diary-item")) return;
    if(d.open){
      var all = box.querySelectorAll("details.diary-item");
      for(var i = 0; i < all.length; i++){ if(all[i] !== d && all[i].open) all[i].open = false; }
      /* 给刚展开这条生成目录（标题少于 2 个时目录卡自动隐藏，右栏也保持原样） */
      var body = d.querySelector(".diary-content") || d.querySelector(".diary-body");
      if(body && typeof buildToc === "function") buildToc(body);
      diaryTocLayout();
    }else{
      /* 全部收起了就把目录和右栏布局都还原 */
      var ds = box.querySelectorAll("details.diary-item"), anyOpen = false;
      for(var j = 0; j < ds.length; j++){ if(ds[j].open){ anyOpen = true; break; } }
      if(!anyOpen){
        if(typeof renderToc === "function") renderToc([]);
        diaryTocLayout();
      }
    }
  }, true);
}
/* ---------- 导师指导：列表卡片 + 独立详情页 ---------- */
function advisorTitleOf(a){
  var t = (a.count ? ("第 " + a.count + " 次指导") : "指导记录");
  if(a.date) t += " · " + a.date;
  if(a.time) t += " " + a.time;
  return t;
}
function advisorItemHTML(a, rawIdx){
  var preview = mdText(a.content).split(String.fromCharCode(10)).join(" ").trim();
  if(preview.length > 60) preview = preview.slice(0,60) + "…";
  return '<div class="diary-item diary-card" onclick="openAdvisor('+rawIdx+')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \')openAdvisor('+rawIdx+')">'
    + '<div class="diary-summary">'
    +   '<span class="diary-dot"></span>'
    +   '<span class="diary-summary-main">'
    +     '<span class="diary-summary-title">'+esc(advisorTitleOf(a))+'</span>'
    +     (preview?'<span class="diary-summary-preview">'+esc(preview)+'</span>':"")
    +   '</span>'
    +   '<span class="diary-summary-arrow">›</span>'
    + '</div></div>';
}
function renderAdvisor(){
  var src = blogData.advisor || [];
  /* 显示顺序：最新在前；带原始下标，供详情页跳转 */
  var list = src.map(function(a, i){ return { a: a, i: i }; }).reverse();
  document.getElementById("advisorList").innerHTML =
    list.map(function(it){ return advisorItemHTML(it.a, it.i); }).join("") || '<div class="empty">暂无记录</div>';
}
/* 打开独立的指导记录详情页（只显示这一次） */
function openAdvisor(idx){
  var src = blogData.advisor || [];
  var a = src[idx];
  if(!a) return;
  rememberOrigin();
  currentAdvisorIdx = idx;
  var title = advisorTitleOf(a);
  document.getElementById("avTitle").textContent = title;
  document.getElementById("avChips").innerHTML =
      (a.count ? '<span class="info-chip green">第 '+esc(String(a.count))+' 次</span>' : '')
    + (a.date ? '<span class="info-chip">📅 '+esc(a.date)+'</span>' : '')
    + (a.time ? '<span class="info-chip">🕐 '+esc(a.time)+'</span>' : '')
    + ((a.tags||[]).length ? a.tags.map(function(t){ return '<span class="info-chip" style="cursor:pointer" onclick="openTag(\''+esc(t).replace(/'/g,"\\'")+'\')">🏷 '+esc(t)+'</span>'; }).join("") : "");
  var box = document.getElementById("avContent");
  box.innerHTML = mdRenderHTML(a.content) || '<div class="empty">这次没有记录内容</div>';
  box.className = "md-body";
  var files = collectFiles(a).length ? ('<div class="info-card"><h3>📎 资料附件</h3>' + fileListGrouped(a) + '</div>') : "";
  document.getElementById("avFiles").innerHTML = galleryHTML(a) + files;
  setPageTitle("advisorDetail", title, a.date || "");
  showSection("advisorDetail");
  /* 目录要在 showSection 之后生成 */
  buildToc(box);
  /* 上一篇 / 下一篇：按列表显示顺序（最新在前） */
  var ordered = src.map(function(x){ return x; }).reverse();
  renderPnNav("avPn", ordered, ordered.indexOf(a), "openAdvisor", { raw: true, full: src });
  syncEntryRoute("advisor", title);
}
function backToAdvisor(){ currentAdvisorIdx = -1; backToOrigin("advisor"); }
