/* ============================================================
   所有「需要上传」的入口都走同一个弹窗：
   弹窗里既能填网址，也能点「选择文件上传」，和截图保持一致
   ============================================================ */
/* 添加图片：弹窗（网址 / 上传 / 选已上传的）+ 之后仍会把图收进「图片」区（第一张当封面） */
function pickImgs(key){
  imgKey = key;
  lastRteKey = RICH_KEYS[key] ? key : lastRteKey;
  openImgPicker(key, function(){
    renderImgDrafts(key);
    refreshMdInsertBtn();
    showToast("图片已收进「图片」区，记得点保存");
  });
}
/* 图标 / 头像 / 照片：弹窗（网址 / 上传），选好后自动填回输入框 */
function iconUploadOptions(inputId){
  if(inputId === "cfgFavicon"){
    return {square:true, maxEdge:256, format:"image/png", quality:0.92, force:true, minBytes:0};
  }
  if(["cfgAvatar","cfgDefaultAvatar","catIcon","qlIcon","cIcon","collIcon","lsIcon","apIcon","frAvatar","rPhoto"].indexOf(inputId) >= 0){
    return {square:true, maxEdge:256, format:"image/webp", quality:0.88, force:true, minBytes:0};
  }
  return {};
}
function pickIcon(inputId){
  var current = ($(inputId) && $(inputId).value ? $(inputId).value.trim() : "");
  var isFavicon = inputId === "cfgFavicon";
  openInputDialog({
    title: isFavicon ? "设置浏览器标签图标" : "设置图片",
    hint: isFavicon
      ? "上传照片或 Logo，会自动居中裁成正方形、压缩为 256×256 PNG。\n也可以直接粘贴图片地址。"
      : "图片地址（也可以直接粘贴图床链接）\n先点「选择文件上传」也行，上传完地址会自动填进来",
    placeholder: "https://",
    value: current,
    okText: "使用这张",
    onFile: async function(files){
      if(!files.length) return [];
      var meta = await uploadFile(files[0], "img", iconUploadOptions(inputId));
      return [meta.url];
    },
    onOk: function(url){
      url = String(url || "").split("\n").map(function(s){ return s.trim(); }).filter(Boolean)[0] || "";
      if(!url){ dlgErr("请输入图片地址，或先上传一张"); return false; }
      if(!/^(https?:\/\/|files\/|\/)/i.test(url)){ dlgErr("地址要以 https:// 开头（或站内 files/ 路径）"); return false; }
      if($(inputId)) $(inputId).value = url;
      refreshIconPrev(inputId);
      showToast("已设置，记得点保存");
      return true;
    }
  });
}

async function onImgFiles(e){
  var files = Array.prototype.slice.call(e.target.files||[]);
  e.target.value = "";
  if(!files.length || !imgKey) return;
  var key = imgKey;
  imgDrafts[key] = imgDrafts[key] || [];
  for(var i=0;i<files.length;i++){
    try{
      showToast("正在上传图片…");
      var meta = await uploadFile(files[i], "img");
      imgDrafts[key].push(meta);
      renderImgDrafts(key);
    }catch(err){ showToast("图片上传失败："+err.message, "error"); return; }
  }
  showToast("图片已上传，记得点保存");
}

/* 图标上传已统一走弹窗（pickIcon → 选择文件上传），这里不再需要单独入口 */

function renderImgDrafts(key){
  var box = $("imgList_"+key);
  if(key === "notice") refreshMdInsertBtn();
  if(!box) return;
  box.innerHTML = (imgDrafts[key]||[]).map(function(f,i){
    return '<span style="display:inline-block;position:relative;margin:4px"><img src="'+esc(previewSrc(f.url))+'" data-url="'+esc(f.url)+'" data-dkey="'+esc(key)+'" data-didx="'+i+'" data-title="预览 / 编辑图片" onclick="openImgFrom(this)" style="width:88px;height:88px;object-fit:cover;border-radius:8px;vertical-align:middle;border:1px solid #e2e8f0;cursor:zoom-in"><button class="btn btn-danger btn-sm" style="position:absolute;top:-8px;right:-8px;padding:1px 6px" data-imgkey="'+esc(key)+'" data-imgidx="'+i+'" onclick="removeImgBtn(this)">×</button></span>';
  }).join("") || '<span style="font-size:.8rem;color:#94a3b8">还没有图片</span>';
}
function removeImgBtn(btn){
  var key = btn.getAttribute("data-imgkey");
  var i = parseInt(btn.getAttribute("data-imgidx"),10);
  if(imgDrafts[key]){ imgDrafts[key].splice(i,1); renderImgDrafts(key); }
}
function setImgDrafts(key, arr){
  imgDrafts[key] = (arr||[]).slice();
  renderImgDrafts(key);
}

/* ---------- 名单 ---------- */
const ROSTER_FIELDS = [
  ["studentId","学号"], ["name","姓名"], ["gender","性别"], ["className","班级"],
  ["college","学院"], ["major","专业"], ["dorm","宿舍号"], ["advisor","导师"],
  ["ethnicity","民族"], ["political","政治面貌"], ["birthday","出生日期"],
  ["phone","电话"], ["email","邮箱"], ["idCard","身份证号"], ["homeAddress","家庭住址"], ["note","备注"]
];
function renderRosterFields(){
  var box = document.getElementById("rosterFields");
  if(!box) return;
  box.innerHTML = ROSTER_FIELDS.map(function(f){
    return '<label style="display:flex;align-items:center;gap:4px;white-space:nowrap"><input type="checkbox" class="rfield" value="'+f[0]+'" checked> '+f[1]+'</label>';
  }).join("");
}
function getHiddenFields(){
  return Array.prototype.slice.call(document.querySelectorAll(".rfield")).filter(function(c){ return !c.checked; }).map(function(c){ return c.value; });
}

let editingRoster = null;
function saveRoster(){
  var name = $("rName").value.trim();
  if(!name){ showToast("请输入姓名","error"); return; }
  var item = {
    studentId:$("rStudentId").value.trim(), name:name, gender:$("rGender").value,
    className:$("rClass").value.trim(), college:$("rCollege").value.trim(), major:$("rMajor").value.trim(),
    dorm:$("rDorm").value.trim(), phone:$("rPhone").value.trim(), email:$("rEmail").value.trim(),
    idCard:$("rIdCard").value.trim(), birthday:$("rBirthday").value.trim(), ethnicity:$("rEthnicity").value.trim(),
    advisor:$("rAdvisor").value.trim(), political:$("rPolitical").value.trim(),
    homeAddress:$("rAddress").value.trim(), note:$("rNote").value.trim(),
    photo:$("rPhoto").value.trim(), images:(imgDrafts.roster||[]).slice(), show: $("rShow").checked, hide: getHiddenFields()
  };
  blogData.roster = blogData.roster || [];
  if(editingRoster===null){ blogData.roster.push(item); saveData("添加名单："+name); }
  else { blogData.roster[editingRoster] = item; saveData("编辑名单："+name); }
  cancelRosterEdit();
  renderAll();
}
function editRoster(i){
  var r = blogData.roster[i];
  editingRoster = i;
  $("rStudentId").value=r.studentId||""; $("rName").value=r.name||""; $("rGender").value=r.gender||"";
  $("rClass").value=r.className||""; $("rCollege").value=r.college||""; $("rMajor").value=r.major||"";
  $("rDorm").value=r.dorm||""; $("rPhone").value=r.phone||""; $("rEmail").value=r.email||"";
  $("rIdCard").value=r.idCard||""; $("rBirthday").value=r.birthday||""; $("rEthnicity").value=r.ethnicity||"";
  $("rAdvisor").value=r.advisor||""; $("rPolitical").value=r.political||"";
  $("rAddress").value=r.homeAddress||""; $("rNote").value=r.note||""; $("rPhoto").value=r.photo||"";
  $("rShow").checked = (r.show !== false);
  var hid = r.hide || [];
  Array.prototype.slice.call(document.querySelectorAll(".rfield")).forEach(function(c){ c.checked = (hid.indexOf(c.value) < 0); });
  setImgDrafts("roster", r.images);
  $("rosterFormTitle").textContent = "编辑名单：" + (r.name||"");
  $("rosterEditBar").classList.add("on");
  $("rSubmit").textContent = "保存修改";
  $("rCancel").style.display = "inline-block";
  $("panel-roster").scrollIntoView({behavior:"smooth"});
}
function cancelRosterEdit(){
  editingRoster = null;
  ["rStudentId","rName","rClass","rCollege","rMajor","rDorm","rPhone","rEmail","rIdCard","rBirthday","rEthnicity","rAdvisor","rPolitical","rAddress","rNote","rPhoto"].forEach(function(id){ $(id).value=""; });
  $("rGender").value = ""; $("rShow").checked = true;
  Array.prototype.slice.call(document.querySelectorAll(".rfield")).forEach(function(c){ c.checked = true; });
  setImgDrafts("roster", []);
  $("rosterFormTitle").textContent = "添加名单成员";
  $("rosterEditBar").classList.remove("on");
  $("rSubmit").textContent = "添加成员";
  $("rCancel").style.display = "none";
}
function delRoster(i){
  if(!confirm("确定删除？")) return;
  if(editingRoster===i) cancelRosterEdit();
  blogData.roster.splice(i,1);
  saveData("删除名单");
  renderAll();
}
function renderRoster(){
  var rows = adminVisible("roster", blogData.roster);
  $("rosterList").innerHTML = adminSearchInput("roster", "搜索名单：学号 / 姓名 / 班级 / 专业 / 学院 / 宿舍 / 导师 / 电话 / 邮箱", "rosterSearch")
    + (rows.map(function(r){
    var r0 = r.item, i = r.i;
    var parts = [];
    if(r0.studentId) parts.push("学号 "+esc(r0.studentId));
    if(r0.gender) parts.push(esc(r0.gender));
    if(r0.className) parts.push(esc(r0.className));
    if(r0.college) parts.push(esc(r0.college));
    if(r0.dorm) parts.push("宿舍 "+esc(r0.dorm));
    if(r0.advisor) parts.push("导师 "+esc(r0.advisor));
    var on = (r0.show !== false);
    var hid = r0.hide || [];
    var fieldBoxes = ROSTER_FIELDS.map(function(f){
      var vis = (hid.indexOf(f[0]) < 0);
      return '<label style="display:inline-flex;align-items:center;gap:3px;white-space:nowrap;color:'+(vis?"#475569":"#cbd5e1")+'"><input type="checkbox" '+(vis?"checked":"")+' data-ri="'+i+'" data-field="'+f[0]+'" onclick="toggleRosterField(this)"> '+f[1]+'</label>';
    }).join("");
    return '<div class="item-row"><div class="info"><div class="title">'+esc(r0.name)+(on?"":' <span style="font-size:.72rem;color:#ef4444">（前台隐藏）</span>')+'</div><div class="desc">'+parts.join(" · ")+'</div>'
      + '<div style="margin-top:8px;font-size:.76rem;display:flex;flex-wrap:wrap;gap:6px 12px;padding-top:8px;border-top:1px dashed #e2e8f0">'+fieldBoxes+'</div>'
      + '</div><div class="actions"><label style="font-size:.8rem;display:flex;align-items:center;gap:4px"><input type="checkbox" '+(on?"checked":"")+' data-ri="'+i+'" onclick="toggleRosterShow(this)"> 整条显示</label><button class="btn btn-ghost btn-sm" onclick="editRoster('+i+')">编辑</button><button class="btn btn-danger btn-sm" onclick="delRoster('+i+')">删除</button></div></div>';
  }).join("") || adminEmptyBox("roster", "暂无名单"));
}
function toggleRosterField(cb){
  var i = parseInt(cb.getAttribute("data-ri"),10);
  var key = cb.getAttribute("data-field");
  var r = blogData.roster[i];
  if(!r) return;
  r.hide = r.hide || [];
  var idx = r.hide.indexOf(key);
  if(cb.checked){ if(idx >= 0) r.hide.splice(idx,1); }
  else { if(idx < 0) r.hide.push(key); }
  saveData("名单字段可见性：" + key + (cb.checked ? " 显示" : " 隐藏"));
  renderRoster();
}
function toggleRosterShow(cb){
  var i = parseInt(cb.getAttribute("data-ri"),10);
  if(!blogData.roster[i]) return;
  blogData.roster[i].show = cb.checked;
  saveData(cb.checked ? "名单：前台显示" : "名单：前台隐藏");
  renderRoster();
}
function toggleRosterSensitive(){
  blogData.rosterConfig = blogData.rosterConfig || {};
  blogData.rosterConfig.showSensitive = $("rShowSensitive").checked;
  saveData(blogData.rosterConfig.showSensitive ? "名单：公开敏感信息" : "名单：隐藏敏感信息");
}
function exportRoster(){ downloadJSON("roster-"+todayStr()+".json", blogData.roster||[]); showToast("已导出名单 JSON"); }

/* ============================================================
   课程资料库：文件夹路径工具
   数据约定：
   · course.folders = ["课件", "通知", "考试", "资料", "课件/第1章"]
   · file.folder    = "" 或 "课件/第1章"
   旧课程只有 files 也能自动推导出目录，不需要迁移数据。
   ============================================================ */
function coursePathNorm(path){
  return String(path == null ? "" : path)
    .replace(/\\/g, "/")
    .split("/")
    .map(function(s){ return s.trim(); })
    .filter(function(s){ return s && s !== "." && s !== ".."; })
    .join("/");
}
function coursePathParent(path){
  var p = coursePathNorm(path);
  var i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}
function coursePathLeaf(path){
  var p = coursePathNorm(path);
  var i = p.lastIndexOf("/");
  return i < 0 ? p : p.slice(i + 1);
}
function coursePathJoin(parent, child){
  var a = coursePathNorm(parent), b = coursePathNorm(child);
  return a && b ? (a + "/" + b) : (a || b);
}
function coursePathUnder(path, parent){
  var p = coursePathNorm(path), root = coursePathNorm(parent);
  if(!root) return true;
  return p === root || p.indexOf(root + "/") === 0;
}
function courseFolderUnique(list){
  var seen = {}, out = [];
  (list || []).forEach(function(path){
    var p = coursePathNorm(path);
    if(p && !seen[p]){ seen[p] = 1; out.push(p); }
  });
  return out;
}
function courseFolderListFrom(files, folders){
  var seen = {}, out = [];
  function add(path){
    var p = coursePathNorm(path);
    if(!p) return;
    var parts = p.split("/");
    for(var i = 1; i <= parts.length; i++){
      var one = parts.slice(0, i).join("/");
      if(!seen[one]){ seen[one] = 1; out.push(one); }
    }
  }
  (folders || []).forEach(add);
  (files || []).forEach(function(f){ if(f) add(f.folder); });
  return out;
}
function courseFolderList(){
  return courseFolderListFrom(drafts.course, courseDraftFolders);
}
function courseFolderAdd(path){
  var p = coursePathNorm(path);
  if(!p) return "";
  var parts = p.split("/");
  for(var i = 1; i <= parts.length; i++){
    var one = parts.slice(0, i).join("/");
    if(courseDraftFolders.indexOf(one) < 0) courseDraftFolders.push(one);
  }
  courseDraftFolders = courseFolderUnique(courseDraftFolders);
  return p;
}
function courseFolderChildren(path, all){
  var parent = coursePathNorm(path);
  return (all || courseFolderList()).filter(function(p){
    return coursePathParent(p) === parent;
  });
}
function courseFolderStats(path){
  var p = coursePathNorm(path);
  var all = courseFolderList();
  var dirCount = all.filter(function(x){
    return x !== p && coursePathUnder(x, p);
  }).length;
  var files = (drafts.course || []).filter(function(f){
    return coursePathUnder(coursePathNorm(f.folder), p);
  });
  return {dirs:dirCount, files:files.length};
}
function courseFileIcon(f){
  var name = String((f && f.name) || "").toLowerCase();
  var type = String((f && f.type) || "").toLowerCase();
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
  if(f && f.external) return "🔗";
  return "📄";
}
function isImageFileMeta(f){
  var name = String((f && f.name) || "").toLowerCase();
  var type = String((f && f.type) || "").toLowerCase();
  return type.indexOf("image/") === 0 || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(name);
}
function adminFileThumb(f, cls){
  if(isImageFileMeta(f) && f && f.url){
    return '<span class="' + cls + ' has-img"><img src="' + esc(previewSrc(f.url)) + '" data-url="' + esc(f.url) + '" data-title="查看图片" onclick="openImgFrom(this)" alt=""></span>';
  }
  return '<span class="' + cls + '">' + courseFileIcon(f) + '</span>';
}
function courseFolderCrumbHTML(path){
  var current = coursePathNorm(path);
  var html = '<button type="button" class="course-crumb" data-folder="" onclick="courseFolderOpenBtn(this)">课程根目录</button>';
  var acc = "";
  if(current){
    current.split("/").forEach(function(part){
      acc = acc ? (acc + "/" + part) : part;
      html += '<span class="course-crumb-sep">›</span>'
        + '<button type="button" class="course-crumb" data-folder="' + esc(acc) + '" onclick="courseFolderOpenBtn(this)">' + esc(part) + '</button>';
    });
  }
  return html;
}
function courseFolderOpenBtn(btn){
  courseCurrentFolder = coursePathNorm(btn.getAttribute("data-folder"));
  renderCourseFileManager();
}
function courseFolderOpenEl(el){
  courseCurrentFolder = coursePathNorm(el.getAttribute("data-folder"));
  renderCourseFileManager();
}
function courseFolderOpenKey(event, el){
  if(event.target !== el) return;
  if(event.key === "Enter" || event.key === " "){
    event.preventDefault();
    courseFolderOpenEl(el);
  }
}
function courseFolderCreate(){
  var parent = courseCurrentFolder;
  openInputDialog({
    title: "新建课程文件夹",
    hint: parent
      ? "会在「" + parent + "」里新建。也可以输入「第1章/课件」一次建两级。\n文件夹只用于整理课程资料，文件类型不限。"
      : "会在课程根目录新建。也可以输入「课件/第1章」一次建两级。\n常用结构：课件、通知、考试、资料。",
    placeholder: "例如：课件",
    okText: "新建",
    onOk: function(name){
      var raw = String(name || "").trim();
      if(!raw){ dlgErr("文件夹名称不能为空"); return false; }
      if(/[\\:*?"<>|]/.test(raw)){ dlgErr("文件夹名称不能包含 \\ : * ? \" < > |"); return false; }
      var parts = raw.replace(/\\/g, "/").split("/");
      if(parts.some(function(p){ return p.trim() === "." || p.trim() === ".."; })){
        dlgErr("文件夹名称不能是 . 或 ..");
        return false;
      }
      var rel = coursePathNorm(raw);
      if(!rel){ dlgErr("文件夹名称不能为空"); return false; }
      var full = coursePathJoin(parent, rel);
      if(courseFolderList().indexOf(full) >= 0){
        dlgErr("这个文件夹已经存在");
        return false;
      }
      courseFolderAdd(full);
      courseCurrentFolder = full;
      renderCourseFileManager();
      showToast("已新建文件夹「" + full + "」");
      return true;
    }
  });
}
function courseQuickFolder(name){
  var full = coursePathJoin(courseCurrentFolder, name);
  if(!full || courseFolderList().indexOf(full) >= 0) return;
  courseFolderAdd(full);
  renderCourseFileManager();
  showToast("已添加文件夹「" + full + "」");
}
function courseFolderRenameBtn(btn){
  if(window.event) window.event.stopPropagation();
  courseFolderRename(btn.getAttribute("data-folder"));
}
function courseFolderRename(path){
  var oldPath = coursePathNorm(path);
  var leaf = coursePathLeaf(oldPath);
  var parent = coursePathParent(oldPath);
  openInputDialog({
    title: "重命名文件夹",
    hint: "只修改当前文件夹名称；里面的子文件夹和文件会一起移动。",
    placeholder: "文件夹名称",
    value: leaf,
    okText: "重命名",
    onOk: function(name){
      var next = coursePathNorm(name);
      if(!next){ dlgErr("文件夹名称不能为空"); return false; }
      if(next.indexOf("/") >= 0){ dlgErr("这里只需填写当前文件夹的名称"); return false; }
      if(/[\\:*?"<>|]/.test(next)){ dlgErr("文件夹名称不能包含 \\ : * ? \" < > |"); return false; }
      var full = coursePathJoin(parent, next);
      if(courseFolderList().indexOf(full) >= 0){
        dlgErr("同一位置已经有同名文件夹");
        return false;
      }
      function relocate(p){
        p = coursePathNorm(p);
        if(!coursePathUnder(p, oldPath)) return p;
        return p === oldPath ? full : (full + p.slice(oldPath.length));
      }
      courseDraftFolders = courseFolderUnique(courseDraftFolders.map(relocate));
      (drafts.course || []).forEach(function(f){
        if(f.folder) f.folder = relocate(f.folder);
      });
      if(courseCurrentFolder && coursePathUnder(courseCurrentFolder, oldPath)){
        courseCurrentFolder = relocate(courseCurrentFolder);
      }
      renderCourseFileManager();
      showToast("文件夹已重命名（记得点保存）");
      return true;
    }
  });
}
function courseFolderDeleteBtn(btn){
  if(window.event) window.event.stopPropagation();
  courseFolderDelete(btn.getAttribute("data-folder"));
}
function courseFolderDelete(path){
  var target = coursePathNorm(path);
  if(!target) return;
  var stats = courseFolderStats(target);
  if(!confirm("删除文件夹「" + target + "」及其中的 " + stats.dirs + " 个子文件夹、" + stats.files + " 个文件？\n只从课程目录移除，不会删除 GitHub 上已经上传的文件。记得点保存。")) return;
  drafts.course = (drafts.course || []).filter(function(f){
    return !coursePathUnder(coursePathNorm(f.folder), target);
  });
  courseDraftFolders = courseDraftFolders.filter(function(p){ return !coursePathUnder(p, target); });
  if(courseCurrentFolder && coursePathUnder(courseCurrentFolder, target)){
    courseCurrentFolder = coursePathParent(target);
  }
  renderCourseFileManager();
  showToast("文件夹已从草稿中删除（记得点保存）");
}
function courseFolderDragOver(event, el){
  event.preventDefault();
  event.stopPropagation();
  el.classList.add("is-drop");
}
function courseFolderDragLeave(event, el){
  event.preventDefault();
  el.classList.remove("is-drop");
}
function courseFolderDrop(event, el){
  event.preventDefault();
  event.stopPropagation();
  el.classList.remove("is-drop");
  var files = event.dataTransfer && event.dataTransfer.files;
  if(files && files.length) handleFiles(files, "course", el.getAttribute("data-folder") || "");
}
function courseMoveFileFromSelect(sel){
  var i = parseInt(sel.getAttribute("data-fi"), 10);
  if(!drafts.course || !drafts.course[i]) return;
  var dest = sel.value;
  if(!dest) return;
  dest = dest === "__root__" ? "" : coursePathNorm(dest);
  drafts.course[i].folder = dest;
  if(dest) courseFolderAdd(dest);
  renderCourseFileManager();
  showToast("文件已移动到「" + (dest || "根目录") + "」（记得点保存）");
}
function courseFolderEmptyHTML(){
  var common = ["课件", "通知", "考试", "资料"];
  return '<div class="course-fm-empty">'
    + '<div class="course-fm-empty-ico">📚</div>'
    + '<div><b>课程资料库还是空的</b><span>先建几个文件夹，再进入文件夹上传课件、通知、试卷或其他任何文件。</span></div>'
    + '<div class="course-fm-quick">'
    + common.map(function(n){
        return '<button type="button" class="btn btn-ghost btn-sm" onclick="courseQuickFolder(\'' + n + '\')">+ ' + n + '</button>';
      }).join("")
    + '<button type="button" class="btn btn-ghost btn-sm" onclick="courseFolderCreate()">+ 自定义</button>'
    + '</div></div>';
}
function renderCourseFileManager(){
  var box = $("courseFileManager");
  if(!box) return;
  var all = courseFolderList();
  if(courseCurrentFolder && all.indexOf(courseCurrentFolder) < 0) courseCurrentFolder = "";
  var current = courseCurrentFolder;
  var children = courseFolderChildren(current, all);
  var allFiles = drafts.course || [];
  var direct = allFiles.map(function(f, i){ return {f:f, i:i}; }).filter(function(it){
    return coursePathNorm(it.f.folder) === current;
  }).sort(function(a, b){
    return String(a.f.name || "").localeCompare(String(b.f.name || ""), "zh-CN", {numeric:true});
  });
  var stats = courseFolderStats(current);

  var html = '<div class="course-fm-bar">'
    + '<div class="course-fm-crumbs">' + courseFolderCrumbHTML(current) + '</div>'
    + '<div class="course-fm-count">' + stats.dirs + ' 个文件夹 · ' + stats.files + ' 个文件</div>'
    + '</div>';

  if(!all.length && !allFiles.length){
    html += courseFolderEmptyHTML();
  }else{
    if(current){
      html += '<button type="button" class="course-fm-up" data-folder="' + esc(coursePathParent(current)) + '" onclick="courseFolderOpenBtn(this)">↩ 上一级</button>';
    }
    if(children.length){
      html += '<div class="course-fm-grid">';
      children.forEach(function(path){
        var st = courseFolderStats(path);
        html += '<div class="course-fm-card" role="button" tabindex="0" data-folder="' + esc(path) + '"'
          + ' onclick="courseFolderOpenEl(this)" onkeydown="courseFolderOpenKey(event,this)"'
          + ' ondragover="courseFolderDragOver(event,this)" ondragleave="courseFolderDragLeave(event,this)" ondrop="courseFolderDrop(event,this)">'
          +   '<div class="course-fm-card-main"><span class="course-fm-folder">📁</span><div><b>' + esc(coursePathLeaf(path)) + '</b>'
          +   '<span>' + (st.files ? (st.files + ' 个文件') : '空文件夹') + (st.dirs ? (' · ' + st.dirs + ' 个子文件夹') : '') + '</span></div></div>'
          +   '<div class="course-fm-card-actions">'
          +     '<button type="button" class="btn btn-ghost btn-sm" data-folder="' + esc(path) + '" onclick="courseFolderRenameBtn(this)" title="重命名文件夹">改名</button>'
          +     '<button type="button" class="btn btn-danger btn-sm" data-folder="' + esc(path) + '" onclick="courseFolderDeleteBtn(this)" title="删除文件夹">删除</button>'
          +   '</div>'
          + '</div>';
      });
      html += '</div>';
    }
    if(direct.length){
      var moveOptions = ['<option value="">移动到…</option>', '<option value="__root__">课程根目录</option>'].concat(
        all.filter(function(p){ return p !== current; }).map(function(p){
          return '<option value="' + esc(p) + '">' + esc(p) + '</option>';
        })
      ).join("");
      html += '<div class="course-fm-files">';
      direct.forEach(function(it){
        var f = it.f;
        html += '<div class="course-fm-file">'
          +   adminFileThumb(f, "course-fm-file-ico")
          +   '<div class="course-fm-file-main"><b>' + esc(f.name || "未命名文件") + '</b>'
          +     '<span>' + esc(f.type || "文件") + (f.size ? (" · " + fmtSize(f.size)) : "") + (f.external ? " · 外部链接" : "") + '</span></div>'
          +   '<select class="course-fm-move" data-fi="' + it.i + '" onchange="courseMoveFileFromSelect(this)" title="移动到其他文件夹">' + moveOptions + '</select>'
          +   '<button type="button" class="btn btn-danger btn-sm" data-fkind="course" data-fidx="' + it.i + '" onclick="removeDraftFileBtn(this)">移除</button>'
          + '</div>';
      });
      html += '</div>';
    }
    if(!children.length && !direct.length){
      html += '<div class="course-fm-empty small"><div class="course-fm-empty-ico">📂</div>'
        + '<div><b>这个文件夹是空的</b><span>点上面的「上传文件」，或把文件直接拖到这个页面；也可以先新建子文件夹。</span></div></div>';
    }
  }

  box.innerHTML = html;
  var hint = $("cUploadHint");
  if(hint){
    hint.textContent = "点击选择文件，或拖到文件夹 / 这里上传到"
      + (current ? ("「" + coursePathLeaf(current) + "」") : "课程根目录")
      + "（PDF / PPT / Word / 图片 / 音视频 / 压缩包等任意类型）";
  }
}

async function handleFiles(fileList, kind, folder){
  var files = Array.prototype.slice.call(fileList||[]);
  if(!files.length) return;
  var status = kindEl(kind,"UpStatus");
  var done = 0;
  for(var i=0;i<files.length;i++){
    var f = files[i];
    try{
      if(status) status.textContent = "上传中（"+(done+1)+"/"+files.length+"）："+f.name;
      var meta = await uploadFile(f, kind);
      meta.folder = coursePathNorm(folder || "");
      if(kind === "course" && meta.folder) courseFolderAdd(meta.folder);
      drafts[kind].push(meta);
      done++;
      renderDraftFiles(kind);
    }catch(e){
      if(status) status.textContent = "❌ 上传失败："+e.message;
      showToast("上传失败："+e.message, "error");
      hideProgress(kind);
      renderDraftFiles(kind);
      return;
    }
  }
  hideProgress(kind);
  if(status) status.textContent = "✅ 已上传 "+done+" 个文件（记得点下方按钮保存）";
  showToast("已上传 "+done+" 个文件，别忘了点保存");
  renderDraftFiles(kind);
}

function removeDraftFileBtn(btn){
  var kind = btn.getAttribute("data-fkind");
  var i = parseInt(btn.getAttribute("data-fidx"),10);
  if(drafts[kind]){ drafts[kind].splice(i,1); renderDraftFiles(kind); }
}
function renderDraftFiles(kind){
  if(kind === "course"){ renderCourseFileManager(); return; }
  var box = kindEl(kind,"Files");
  if(!box) return;
  var list = drafts[kind]||[];
  if(!list.length){ box.innerHTML = '<div style="font-size:.82rem;color:#94a3b8">还没有文件</div>'; return; }
  var groups = {}, order = [];
  list.forEach(function(f,i){
    var g = f.folder || "";
    if(!groups[g]){ groups[g] = []; order.push(g); }
    groups[g].push({f:f, i:i});
  });
  var hasFolders = order.some(function(g){ return !!g; });
  var html = "";
  order.forEach(function(g){
    if(hasFolders || g){
      html += '<div style="margin:8px 0 4px;font-size:.85rem;font-weight:600">' + (g ? ('📁 '+esc(g)) : '📄 根目录（未归类）');
    }
    if(g){
      html += ' <button class="btn btn-ghost btn-sm" data-fk="'+esc(kind)+'" data-fn="'+esc(g)+'" onclick="renameFolderBtn(this)">重命名</button>';
      html += ' <button class="btn btn-danger btn-sm" data-fk="'+esc(kind)+'" data-fn="'+esc(g)+'" onclick="deleteFolderBtn(this)">删除文件夹</button>';
    }
    if(hasFolders || g) html += '</div>';
    groups[g].forEach(function(it){
      html += '<div class="file-item">'+adminFileThumb(it.f,"file-thumb")+'<span class="fname">'+esc(it.f.name)+'</span><span class="fsize">'+esc(it.f.type||"")+(it.f.size?(" · "+fmtSize(it.f.size)):"")+'</span><button class="btn btn-danger btn-sm" data-fkind="'+esc(kind)+'" data-fidx="'+it.i+'" onclick="removeDraftFileBtn(this)">移除</button></div>';
    });
  });
  box.innerHTML = html;
}
function renameFolderBtn(btn){ renameFolder(btn.getAttribute("data-fk"), btn.getAttribute("data-fn")); }
function deleteFolderBtn(btn){ deleteFolderDraft(btn.getAttribute("data-fk"), btn.getAttribute("data-fn")); }
function renameFolder(kind, name){
  openInputDialog({
    title: "重命名文件夹",
    hint: "给文件夹「" + name + "」换个名字（记得最后点保存）",
    placeholder: "文件夹名称",
    value: name,
    okText: "重命名",
    onOk: function(nn){
      nn = String(nn || "").trim();
      if(!nn){ dlgErr("名称不能为空"); return false; }
      (drafts[kind]||[]).forEach(function(f){ if((f.folder||"") === name) f.folder = nn; });
      renderDraftFiles(kind);
      showToast("文件夹已重命名（记得点保存）");
      return true;
    }
  });
}
function deleteFolderDraft(kind, name){
  var n = (drafts[kind]||[]).filter(function(f){ return (f.folder||"") === name; }).length;
  if(!confirm("删除文件夹「"+name+"」及其中 "+n+" 个文件？（记得点保存才生效）")) return;
  drafts[kind] = (drafts[kind]||[]).filter(function(f){ return (f.folder||"") !== name; });
  renderDraftFiles(kind);
  showToast("文件夹已删除（记得点保存）");
}
function removeDraftFileBtn(btn){
  var kind = btn.getAttribute("data-fkind");
  var i = parseInt(btn.getAttribute("data-fidx"),10);
  if(drafts[kind]){ drafts[kind].splice(i,1); renderDraftFiles(kind); }
}

function onCourseFiles(e){
  var v = e.target.files;
  handleFiles(v, "course", courseCurrentFolder);
  e.target.value = "";
}
function onCollectionFiles(e){
  handleFiles(e.target.files, "collection");
  e.target.value = "";
}
function onDmediaFiles(e){ var v=e.target.files; handleFiles(v,"dmedia"); e.target.value=""; }
function onNoticeFiles(e){ var v=e.target.files; handleFiles(v,"nf"); e.target.value=""; }
function onPaperFiles(e){ const v=e.target.files; handleFiles(v,"paper"); e.target.value=""; }
function onClassFiles(e){ const v=e.target.files; handleFiles(v,"class"); e.target.value=""; }
function onLifeFiles(e){ const v=e.target.files; handleFiles(v,"life"); e.target.value=""; }
function onMediaFiles(e){ const v=e.target.files; handleFiles(v,"media"); e.target.value=""; }
function onAdvisorFiles(e){ const v=e.target.files; handleFiles(v,"adv"); e.target.value=""; }

/* ---------- 网盘外链文件（跳过 GitHub 上传，适合大 PDF / 音频 / 视频）---------- */
function addExternalFileBtn(kind){
  addExternalFileViaDialog(kind);
}
