/* ============================================================
   渲染
   ============================================================ */
function renderAll(){
  const sc = blogData.siteConfig || DEFAULT_DATA.siteConfig;
  $("cfgTitle").value = sc.title || "";
  $("cfgSub").value   = sc.subtitle || "";
  $("cfgAbout").value = sc.about || "";
  $("cfgAvatar").value = sc.avatar || "";
  $("cfgDefaultImage").value = sc.defaultImage || "";
  $("cfgColumns").value = sc.columns || "1";
  $("cfgDefaultAvatar").value = sc.defaultAvatar || "";
  $("cfgLoginHint").value = (sc.loginHint === undefined ? "" : sc.loginHint);
  $("cfgCoverPan").checked = (sc.coverPan !== false);
  $("cfgCoverPanSec").value = (sc.coverPanSec || 3);
  $("cfgName").value   = sc.name || "";
  $("cfgBio").value    = sc.bio || "";
  $("tagsInput").value = (blogData.tags||[]).join(",");
  renderCatManage();
  renderQuickLinkManage();
  renderFriendManage();
  renderHomeManage();
  updateLgCategories();
  refreshAllIconPrevs();

  let fileCount = 0;
  ["courses","papers","classItems"].forEach(k=>{
    (blogData[k]||[]).forEach(it=>{ 
      if(Array.isArray(it.files)) fileCount += it.files.length;
      if(it.file) fileCount += 1;
    });
  });
  $("statC").textContent=(blogData.courses||[]).length;
  $("statP").textContent=(blogData.papers||[]).length;
  $("statN").textContent=(blogData.notices||[]).length;
  $("statF").textContent=fileCount;
  refreshMdInsertBtn();

  renderCourses();renderPapers();renderNotices();renderClass();renderLife();renderAppsManage();renderMedia();
  renderRoster();
  $("rShowSensitive").checked = !!(blogData.rosterConfig && blogData.rosterConfig.showSensitive);
  renderLedger();renderDiary();renderAdvisor();renderLogs();
}

/* 列表里显示图片缩略图 */
function imgRows(images, kind, idx){
  var arr = images||[];
  if(!arr.length) return "";
  return '<div style="margin-top:6px">'+arr.map(function(f,i){
    return '<span style="display:inline-block;position:relative;margin:2px"><img src="'+esc(previewSrc(f.url))+'" data-url="'+esc(f.url)+'" data-rkind="'+esc(kind)+'" data-ridx="'+idx+'" data-iidx="'+i+'" data-title="预览 / 编辑图片" onclick="openImgFrom(this)" style="width:60px;height:60px;object-fit:cover;border-radius:6px;vertical-align:middle;border:1px solid #e2e8f0;cursor:zoom-in"><button class="btn btn-ghost btn-sm" style="position:absolute;top:-8px;right:-8px;padding:0 5px" data-imgkind="'+esc(kind)+'" data-imgrow="'+idx+'" data-imgidx="'+i+'" onclick="delImageBtn(this)">×</button></span>';
  }).join("")+'</div>';
}
function delImageBtn(btn){
  var kind = btn.getAttribute("data-imgkind");
  var idx = parseInt(btn.getAttribute("data-imgrow"),10);
  var i = parseInt(btn.getAttribute("data-imgidx"),10);
  if(!blogData[kind] || !blogData[kind][idx]) return;
  var arr = blogData[kind][idx].images||[];
  arr.splice(i,1);
  blogData[kind][idx].images = arr;
  saveData("移除图片");
  renderAll();
}

/* 列表里显示文件行（已保存的） */
function fileRows(files, kind, idx){
  const arr = files||[];
  if(!arr.length) return "";
  return `<div style="margin-top:6px">`+arr.map((f,i)=>`
    <span class="tag-chip">📄 ${esc(f.name)}</span>
    <button class="btn btn-ghost btn-sm" style="margin:0 6px 2px 0" onclick="delFile('${kind}',${idx},${i})">×</button>
  `).join("")+`</div>`;
}

async function delFile(kind, idx, fileIdx){
  if(!confirm("确定从列表中移除这个文件吗？（GitHub 上的文件本身不会被删除）")) return;
  const arr = blogData[kind][idx].files||[];
  arr.splice(fileIdx,1);
  blogData[kind][idx].files = arr;
  if(kind==="papers" && arr.length){
    blogData[kind][idx].file = arr[0].url; blogData[kind][idx].fileName = arr[0].name;
  }
  if(kind==="classItems" && arr.length){
    blogData[kind][idx].file = arr[0].url; blogData[kind][idx].fileName = arr[0].name;
  }
  renderAll();
  await saveData("移除文件");
}

/* ---------- 课程 ---------- */
function saveCourse(){
  var title=$("cTitle").value.trim();
  if(!title){ showToast("请输入课程名称","error"); return; }
  var item = {
    icon: $("cIcon").value.trim() || "📚",
    title: title,
    desc: $("cDesc").value.trim(),
    intro: getRich("course"),
    introIsHTML: isRichMode("course"),
    tags: parseTagsInput($("cTags").value),
    progress: parseInt($("cProgress").value)||0,
    files: drafts.course.slice(),
    images: (imgDrafts.course||[]).slice(),
    time: nowStr()
  };
  if(editing.course===null){
    blogData.courses.push(item);
    saveData("添加课程："+title);
  }else{
    blogData.courses[editing.course] = Object.assign({}, blogData.courses[editing.course], item);
    saveData("编辑课程："+title);
  }
  cancelEdit("course");
  renderAll();
}
function editCourse(i){
  var c = blogData.courses[i];
  editing.course = i;
  $("cIcon").value=c.icon||""; $("cTitle").value=c.title||"";
  $("cDesc").value=c.desc||"";
  loadRich("course", c.intro||"");
  $("cTags").value = (c.tags||[]).join(",");
  $("cProgress").value=c.progress||0;
  drafts.course = (c.files||[]).slice();
  setImgDrafts("course", c.images);
  renderDraftFiles("course");
  $("courseFormTitle").textContent="编辑课程："+c.title;
  $("courseEditBar").classList.add("on");
  $("cSubmit").textContent="保存修改";
  $("cCancel").style.display="inline-block";
  $("panel-courses").scrollIntoView({behavior:"smooth"});
}
function renderCourses(){
  var rows = adminVisible("courses", blogData.courses);
  $("courseList").innerHTML = adminSearchInput("courses", "搜索课程：标题 / 简介 / 标签 / 正文", "courseSearch")
    + (rows.map(function(r){
    var c = r.item, i = r.i;
    var nfiles = (c.files||[]).length;
    var folders = {};
    (c.files||[]).forEach(function(f){ if(f.folder) folders[f.folder] = 1; });
    var nf = Object.keys(folders).length;
    return '<div class="item-row"><div class="info"><div class="title">'+iconThumb(c.icon,26)+' '+esc(c.title)+'</div><div class="desc">'+esc(c.desc)+' · 进度 '+(c.progress||0)+'% · '+nfiles+' 个文件'+(nf?(' · '+nf+' 个文件夹'):'')+'</div>'+fileRows(c.files,"courses",i)+imgRows(c.images,"courses",i)+'</div><div class="actions"><button class="btn btn-ghost btn-sm" onclick="editCourse('+i+')">编辑</button><button class="btn btn-danger btn-sm" onclick="delCourse('+i+')">删除</button></div></div>';
  }).join("") || adminEmptyBox("courses", "暂无"));
}
function delCourse(i){
  if(!confirm("确定删除「"+blogData.courses[i].title+"」？")) return;
  if(editing.course===i) cancelEdit("course");
  blogData.courses.splice(i,1);
  saveData("删除课程");
  renderAll();
}

/* ---------- 论文 ---------- */
function savePaper(){
  var title=$("pTitle").value.trim();
  if(!title){ showToast("请输入论文标题","error"); return; }
  var tags=[].slice.call(document.querySelectorAll(".paper-tag:checked")).map(function(c){return c.value;});
  /* 文本框里的自定义标签和上面勾选的标签合并去重 */
  parseTagsInput($("pTags").value).forEach(function(t){ if(tags.indexOf(t) < 0) tags.push(t); });
  var files = drafts.paper.slice();
  var item = {
    title: title,
    status:$("pStatus").value,
    year:$("pYear").value.trim(),
    desc:$("pDesc").value.trim(),
    abstract:getRich("paper"),
    abstractIsHTML:isRichMode("paper"),
    tags: tags,
    files: files,
    images: (imgDrafts.paper||[]).slice(),
    file: files.length?files[0].url:"",
    fileName: files.length?files[0].name:"",
    time: nowStr()
  };
  if(editing.paper===null){
    blogData.papers.push(item);
    saveData("添加论文："+title);
  }else{
    blogData.papers[editing.paper] = Object.assign({}, blogData.papers[editing.paper], item);
    saveData("编辑论文："+title);
  }
  cancelEdit("paper");
  renderAll();
}
function editPaper(i){
  var p=blogData.papers[i];
  editing.paper=i;
  $("pTitle").value=p.title||""; $("pStatus").value=p.status||"在投";
  $("pYear").value=p.year||""; $("pDesc").value=p.desc||"";
  loadRich("paper", p.abstract||"");
  $("pTags").value=(p.tags||[]).join(",");
  document.querySelectorAll(".paper-tag").forEach(function(c){c.checked=(p.tags||[]).indexOf(c.value)>=0;});
  drafts.paper=(p.files||[]).slice();
  setImgDrafts("paper", p.images);
  renderDraftFiles("paper");
  $("paperFormTitle").textContent="编辑论文："+p.title;
  $("paperEditBar").classList.add("on");
  $("pSubmit").textContent="保存修改";
  $("pCancel").style.display="inline-block";
  $("panel-papers").scrollIntoView({behavior:"smooth"});
}
function renderPapers(){
  var rows = adminVisible("papers", blogData.papers);
  $("paperList").innerHTML = adminSearchInput("papers", "搜索论文：标题 / 备注 / 摘要 / 标签 / 状态", "paperSearch")
    + (rows.map(function(r){
    var p = r.item, i = r.i;
    return `
    <div class="item-row">
      <div class="info">
        <div class="title">${esc(p.title)}</div>
        <div class="desc">${esc(p.status)} · ${esc(p.year||"")} ${(p.tags||[]).map(t=>`<span class="tag-chip">${esc(t)}</span>`).join("")}</div>
        ${fileRows(p.files,"papers",i)}${imgRows(p.images,"papers",i)}
      </div>
      <div class="actions">
        <button class="btn btn-ghost btn-sm" onclick="editPaper(${i})">编辑</button>
        <button class="btn btn-danger btn-sm" onclick="delPaper(${i})">删除</button>
      </div>
    </div>`;
  }).join("") || adminEmptyBox("papers", "暂无"));
}
function delPaper(i){
  if(!confirm("确定删除「"+blogData.papers[i].title+"」？")) return;
  if(editing.paper===i) cancelEdit("paper");
  blogData.papers.splice(i,1);
  saveData("删除论文");
  renderAll();
}

/* ---------- 通知 ---------- */
let editingNotice = null;
function addNotice(){
  var title=$("nTitle").value.trim();
  if(!title){ showToast("请输入标题","error"); return; }
  var files = (drafts.nf||[]).slice();
  var rich = isRichMode("notice");
  var item = {
    title: title,
    source:$("nSource").value.trim(),
    date:$("nDate").value||todayStr(),
    level:"normal",
    content:getRich("notice"),
    contentIsHTML: rich,
    tags: parseTagsInput($("nTags").value),
    images:(imgDrafts.notice||[]).slice(),
    files: files,
    time: nowStr()
  };
  blogData.notices = blogData.notices || [];
  if(editingNotice === null){
    blogData.notices.push(item);
    saveData("发布通知："+title);
  }else{
    blogData.notices[editingNotice] = item;
    saveData("编辑通知："+title);
  }
  cancelNoticeEdit();
  renderAll();
}
function editNotice(i){
  var n = blogData.notices[i];
  editingNotice = i;
  $("nTitle").value = n.title||""; $("nSource").value = n.source||"";
  $("nDate").value = n.date||todayStr();
  loadRich("notice", n.content||"");
  $("nTags").value = (n.tags||[]).join(",");
  setImgDrafts("notice", n.images);
  drafts.nf = (n.files||[]).slice();
  renderDraftFiles("nf");
  $("noticeFormTitle").textContent = "编辑通知：" + (n.title||"");
  $("noticeEditBar").classList.add("on");
  $("nSubmit").textContent = "保存修改";
  $("nCancel").style.display = "inline-block";
  var box = document.getElementById("panel-notices");
  if(box && box.scrollIntoView) box.scrollIntoView({behavior:"smooth"});
}
function cancelNoticeEdit(){
  editingNotice = null;
  $("nTitle").value = ""; $("nSource").value = "";
  loadRich("notice", "");
  $("nTags").value = "";
  $("nDate").value = todayStr();
  setImgDrafts("notice", []);
  drafts.nf = []; renderDraftFiles("nf");
  $("noticeFormTitle").textContent = "发布通知";
  $("noticeEditBar").classList.remove("on");
  $("nSubmit").textContent = "发布通知";
  $("nCancel").style.display = "none";
}
function renderNotices(){
  var rows = adminVisible("notices", blogData.notices);
  $("noticeList").innerHTML = adminSearchInput("notices", "搜索通知：标题 / 来源 / 正文 / 标签 / 日期", "noticeSearch")
    + (rows.map(function(r){
    var n = r.item, i = r.i;
    var full = stripMd(n.content).replace(/\n/g," ");
    var brief = full.slice(0,60);
    return '<div class="item-row"><div class="info"><div class="title">'+esc(n.title)+'</div><div class="desc">'+esc(n.source||"")+' · '+esc(n.date||"")+'</div>'+(brief?'<div class="desc">'+esc(brief)+(full.length>60?"…":"")+'</div>':"")+fileRows(n.files,"notices",i)+imgRows(n.images,"notices",i)+'</div><div class="actions"><button class="btn btn-ghost btn-sm" onclick="editNotice('+i+')">编辑</button><button class="btn btn-danger btn-sm" onclick="delNotice('+i+')">删除</button></div></div>';
  }).join("") || adminEmptyBox("notices", "暂无"));
}
function delNotice(i){
  if(!confirm("确定删除？")) return;
  if(editingNotice === i) cancelNoticeEdit();
  blogData.notices.splice(i,1);
  saveData("删除通知");
  renderAll();
}

/* ---------- 班级事务 ---------- */
function saveClass(){
  var title=$("clTitle").value.trim();
  if(!title){ showToast("请输入标题","error"); return; }
  var files=drafts["class"].slice();
  var item={
    title: title,
    type:$("clType").value,
    date:$("clDate").value||todayStr(),
    content:getRich("class"),
    contentIsHTML: isRichMode("class"),
    tags: parseTagsInput($("clTags").value),
    files: files,
    images:(imgDrafts["class"]||[]).slice(),
    file: files.length?files[0].url:"",
    fileName: files.length?files[0].name:"",
    time: nowStr()
  };
  if(editing["class"]===null){
    blogData.classItems.push(item);
    saveData("添加班级事务："+title);
  }else{
    blogData.classItems[editing["class"]] = Object.assign({}, blogData.classItems[editing["class"]], item);
    saveData("编辑班级事务："+title);
  }
  cancelEdit("class");
  renderAll();
}
function editClass(i){
  var c=blogData.classItems[i];
  editing["class"]=i;
  $("clTitle").value=c.title||""; $("clType").value=c.type||"通知";
  $("clDate").value=c.date||todayStr();
  loadRich("class", c.content||"");
  $("clTags").value = (c.tags||[]).join(",");
  drafts["class"]=(c.files||[]).slice();
  setImgDrafts("class", c.images);
  renderDraftFiles("class");
  $("classFormTitle").textContent="编辑班级事务："+c.title;
  $("classEditBar").classList.add("on");
  $("clSubmit").textContent="保存修改";
  $("clCancel").style.display="inline-block";
  $("panel-class").scrollIntoView({behavior:"smooth"});
}
function renderClass(){
  var rows = adminVisible("class", blogData.classItems);
  $("classList").innerHTML = adminSearchInput("class", "搜索班级事务：标题 / 类型 / 正文 / 标签 / 日期", "classSearch")
    + (rows.map(function(r){
    var c = r.item, i = r.i;
    return `
    <div class="item-row">
      <div class="info">
        <div class="title">${esc(c.title)}</div>
        <div class="desc">${esc(c.type)} · ${esc(c.date)}</div>
        ${fileRows(c.files,"classItems",i)}${imgRows(c.images,"classItems",i)}
      </div>
      <div class="actions">
        <button class="btn btn-ghost btn-sm" onclick="editClass(${i})">编辑</button>
        <button class="btn btn-danger btn-sm" onclick="delClass(${i})">删除</button>
      </div>
    </div>`;
  }).join("") || adminEmptyBox("class", "暂无"));
}
function delClass(i){
  if(!confirm("确定删除？")) return;
  if(editing["class"]===i) cancelEdit("class");
  blogData.classItems.splice(i,1);
  saveData("删除班级事务");
  renderAll();
}

/* ---------- 生活服务 ---------- */
function addLife(){
  var title=$("lsTitle").value.trim();
  var url=$("lsUrl").value.trim();
  var files=(drafts.life||[]).slice();
  if(!title || (!url && !files.length)){ showToast("请输入名称，并填写链接或上传文件","error"); return; }
  var item = {icon:$("lsIcon").value.trim()||"🔗", title:title, desc:$("lsDesc").value.trim(), url:url, files:files, images:(imgDrafts.life||[]).slice()};
  blogData.lifeServices = blogData.lifeServices || [];
  if(editingLife === null){
    blogData.lifeServices.push(item);
    saveData("添加生活服务："+title);
  }else{
    blogData.lifeServices[editingLife] = item;
    saveData("编辑生活服务："+title);
  }
  cancelLifeEdit();
  renderAll();
}
function renderLife(){
  $("lifeList").innerHTML=(blogData.lifeServices||[]).map(function(it,i){
    return '<div class="item-row"><div class="info"><div class="title">'+iconThumb(it.icon,24)+' '+esc(it.title)+'</div><div class="desc">'+esc(it.desc)+(it.url?' · <a href="'+esc(it.url)+'" target="_blank">打开</a>':"")+'</div>'+fileRows(it.files,"lifeServices",i)+imgRows(it.images,"lifeServices",i)+'</div><div class="actions"><button class="btn btn-ghost btn-sm" onclick="editLife('+i+')">编辑</button><button class="btn btn-danger btn-sm" onclick="delLife('+i+')">删除</button></div></div>';
  }).join("")||'<div style="color:#94a3b8;font-size:.85rem">暂无</div>';
}
function delLife(i){
  if(!confirm("确定删除？")) return;
  blogData.lifeServices.splice(i,1);
  saveData("删除生活服务");
  renderAll();
}

/* ---------- 精选应用（前台「精选应用」+ 应用详情页的数据来源） ---------- */
let editingApp = null;
let appFeatRows = [], appDlRows = [], appSocialRows = [];

function apFeatAdd(){ appFeatRows.push({title:"", desc:""}); apFeatRender(); }
function apFeatDel(i){ appFeatRows.splice(i,1); apFeatRender(); }
function apFeatRender(){
  $("apFeatBox").innerHTML = appFeatRows.map(function(f,i){
    return '<div class="form-row" style="align-items:flex-start;margin-bottom:6px">'
      + '<input type="text" placeholder="特色标题（如：自动故障转移）" value="'+esc(f.title)+'" oninput="appFeatRows['+i+'].title=this.value" style="flex:1">'
      + '<input type="text" placeholder="特色说明" value="'+esc(f.desc)+'" oninput="appFeatRows['+i+'].desc=this.value" style="flex:2.4">'
      + '<button class="btn btn-danger btn-sm" onclick="apFeatDel('+i+')">删除</button></div>';
  }).join("") || '<div style="font-size:.8rem;color:#94a3b8">还没有特色条目，点右上角「+ 添加特色」</div>';
}
function apDlAdd(){ appDlRows.push({platform:"", desc:"", url:"", label:"下载"}); apDlRender(); }
function apDlDel(i){ appDlRows.splice(i,1); apDlRender(); }
function apDlRender(){
  $("apDlBox").innerHTML = appDlRows.map(function(d,i){
    return '<div class="form-row" style="margin-bottom:6px">'
      + '<input type="text" placeholder="平台（Windows）" value="'+esc(d.platform)+'" oninput="appDlRows['+i+'].platform=this.value" style="flex:1">'
      + '<input type="text" placeholder="说明（PC 桌面客户端）" value="'+esc(d.desc)+'" oninput="appDlRows['+i+'].desc=this.value" style="flex:1.4">'
      + '<input type="text" placeholder="下载链接 https://..." value="'+esc(d.url)+'" oninput="appDlRows['+i+'].url=this.value" style="flex:2">'
      + '<input type="text" placeholder="按钮文字" value="'+esc(d.label)+'" oninput="appDlRows['+i+'].label=this.value" style="flex:0.6">'
      + '<button class="btn btn-danger btn-sm" onclick="apDlDel('+i+')">删除</button></div>';
  }).join("") || '<div style="font-size:.8rem;color:#94a3b8">还没有下载地址</div>';
}
function apSocialAdd(){ appSocialRows.push({name:"", url:""}); apSocialRender(); }
function apSocialDel(i){ appSocialRows.splice(i,1); apSocialRender(); }
function apSocialRender(){
  $("apSocialBox").innerHTML = appSocialRows.map(function(s,i){
    return '<div class="form-row" style="margin-bottom:6px">'
      + '<input type="text" placeholder="名称（X / Telegram）" value="'+esc(s.name)+'" oninput="appSocialRows['+i+'].name=this.value" style="flex:1">'
      + '<input type="text" placeholder="链接 https://..." value="'+esc(s.url)+'" oninput="appSocialRows['+i+'].url=this.value" style="flex:2.4">'
      + '<button class="btn btn-danger btn-sm" onclick="apSocialDel('+i+')">删除</button></div>';
  }).join("") || '<div style="font-size:.8rem;color:#94a3b8">还没有社交平台</div>';
}

function addApp(){
  var name = $("apName").value.trim();
  if(!name){ showToast("请填写应用名称","error"); return; }
  var item = {
    name: name,
    icon: $("apIcon").value.trim() || "🧩",
    summary: $("apSummary").value.trim(),
    cover: $("apCover").value.trim(),
    tags: $("apTags").value.split(/[,，]/).map(function(t){ return t.trim(); }).filter(Boolean),
    intro: $("apIntro").value,
    features: appFeatRows.filter(function(f){ return f.title.trim() || f.desc.trim(); })
                        .map(function(f){ return {title:f.title.trim(), desc:f.desc.trim()}; }),
    developer: $("apDeveloper").value.trim(),
    website: $("apWebsite").value.trim(),
    github: $("apGithub").value.trim(),
    social: appSocialRows.filter(function(s){ return s.name.trim() || s.url.trim(); })
                         .map(function(s){ return {name:s.name.trim(), url:s.url.trim()}; }),
    downloads: appDlRows.filter(function(d){ return d.platform.trim() || d.url.trim(); })
                        .map(function(d){ return {platform:d.platform.trim(), desc:d.desc.trim(), url:d.url.trim(), label:(d.label||"").trim()||"下载"}; }),
    images: (imgDrafts.apps||[]).slice(),
    files: [],
    time: $("apTime").value || todayStr(),
    author: $("apAuthor").value.trim(),
    views: parseInt($("apViews").value,10) || 0
  };
  blogData.apps = blogData.apps || [];
  if(editingApp === null){
    blogData.apps.push(item);
    saveData("添加应用："+name);
  }else{
    blogData.apps[editingApp] = item;
    saveData("编辑应用："+name);
  }
  cancelAppEdit();
  renderAll();
}
function renderAppsManage(){
  $("appManageList").innerHTML = (blogData.apps||[]).map(function(a,i){
    return '<div class="item-row"><div class="info"><div class="title">'+iconThumb(a.icon,24)+' '+esc(a.name)+'</div>'
      + '<div class="desc">'+esc(a.summary||"")+' · 特色 '+(a.features||[]).length+' 条 · 下载 '+(a.downloads||[]).length+' 个'+(a.time?(' · '+esc(a.time)):"")+'</div>'
      + imgRows(a.images,"apps",i)+'</div>'
      + '<div class="actions"><button class="btn btn-ghost btn-sm" onclick="editApp('+i+')">编辑</button><button class="btn btn-danger btn-sm" onclick="delApp('+i+')">删除</button></div></div>';
  }).join("") || '<div style="color:#94a3b8;font-size:.85rem">暂无应用</div>';
}
function delApp(i){
  if(!confirm("确定删除这个应用？")) return;
  blogData.apps.splice(i,1);
  saveData("删除应用");
  renderAll();
}
function editApp(i){
  var a = blogData.apps[i];
  if(!a) return;
  editingApp = i;
  $("apIcon").value = a.icon||"";       $("apName").value = a.name||"";
  $("apSummary").value = a.summary||""; $("apTags").value = (a.tags||[]).join(",");
  $("apIntro").value = a.intro||"";
  $("apDeveloper").value = a.developer||""; $("apWebsite").value = a.website||""; $("apGithub").value = a.github||"";
  $("apCover").value = a.cover||"";     $("apTime").value = a.time||"";
  $("apAuthor").value = a.author||"";   $("apViews").value = a.views||"";
  appFeatRows = (a.features||[]).map(function(f){ return {title:f.title||"", desc:f.desc||""}; });
  appDlRows = (a.downloads||[]).map(function(d){ return {platform:d.platform||"", desc:d.desc||"", url:d.url||"", label:d.label||"下载"}; });
  appSocialRows = (a.social||[]).map(function(s){ return {name:s.name||"", url:s.url||""}; });
  apFeatRender(); apDlRender(); apSocialRender();
  setImgDrafts("apps", a.images);
  $("appFormTitle").textContent = "✏️ 编辑应用：" + (a.name||"");
  refreshAllIconPrevs();
  var box = document.getElementById("panel-apps");
  if(box && box.scrollIntoView) box.scrollIntoView({behavior:"smooth"});
}
function cancelAppEdit(){
  editingApp = null;
  ["apIcon","apName","apSummary","apTags","apIntro","apDeveloper","apWebsite","apGithub","apCover","apTime","apAuthor","apViews"]
    .forEach(function(id){ if($(id)) $(id).value = ""; });
  appFeatRows = []; appDlRows = []; appSocialRows = [];
  apFeatRender(); apDlRender(); apSocialRender();
  setImgDrafts("apps", []);
  $("appFormTitle").textContent = "添加应用";
  refreshAllIconPrevs();
}

/* ---------- 记账 ---------- */
function addLedger(){
  var amount=parseFloat($("lgAmount").value);
  if(isNaN(amount)||amount<=0){ showToast("请输入正确的金额","error"); return; }
  blogData.ledger.push({
    type:$("lgType").value,
    amount:amount,
    date:$("lgDate").value||todayStr(),
    time:$("lgTime").value||"",
    desc:$("lgDesc").value.trim(),
    category:$("lgCategory").value||"其他",
    images:(imgDrafts.ledger||[]).slice()
  });
  saveData("记账：¥"+amount.toFixed(2));
  renderAll();
  $("lgAmount").value=""; $("lgDesc").value="";
  setImgDrafts("ledger", []);
}
function renderLedger(){
  var rows = adminVisible("ledger", blogData.ledger);
  var income=0, expense=0;
  (blogData.ledger||[]).forEach(function(r){
    var a=parseFloat(r.amount)||0;
    if(r.type==="income") income+=a; else expense+=a;
  });
  $("lgIn").textContent=income.toFixed(2);
  $("lgOut").textContent=expense.toFixed(2);
  $("lgNet").textContent=(income-expense).toFixed(2);
  $("ledgerList").innerHTML = adminSearchInput("ledger", "搜索记账：分类 / 备注 / 金额 / 日期 / 时间", "ledgerSearch")
    + (rows.map(function(row){
    var r = row.item, realIdx = row.i;
    return '<div class="item-row"><div class="info"><div class="title">'+(r.type==="income"?"收入":"支出")+' ¥'+(parseFloat(r.amount)||0).toFixed(2)+'</div><div class="desc">'+esc(r.date)+(r.time?(' '+esc(r.time)):"")+' · '+esc(r.category||"其他")+' · '+esc(r.desc||"")+'</div>'+imgRows(r.images,"ledger",realIdx)+'</div><button class="btn btn-danger btn-sm" onclick="delLedger('+realIdx+')">删除</button></div>';
  }).join("") || adminEmptyBox("ledger", "暂无"));
}
function delLedger(realIdx){
  if(!confirm("确定删除？")) return;
  blogData.ledger.splice(realIdx,1);
  saveData("删除记账");
  renderAll();
}

/* ---------- 日记 ---------- */
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
/* ---------- 日记 ---------- */
let editingDiary = null;
function addDiary(){
  var content=getRich("diary");
  var title=$("diaryTitle").value.trim();
  if(!content && !title){ showToast("请写点内容","error"); return; }
  if(!title) title = autoTitle(stripMd(content), todayStr());
  var item = {
    date: $("diaryDate").value || todayStr(),
    title: title,
    content: content,
    contentIsHTML: isRichMode("diary"),
    tags: parseTagsInput($("diaryTags").value),
    images: (imgDrafts.diary||[]).slice(),
    media: (drafts.dmedia||[]).slice(),
    time: nowStr()
  };
  blogData.diary = blogData.diary || [];
  if(editingDiary === null){
    blogData.diary.push(item);
    saveData("写日记："+title);
  }else{
    /* 编辑时保留原来的创建时间，只更新内容 */
    item.time = blogData.diary[editingDiary].time || item.time;
    blogData.diary[editingDiary] = item;
    saveData("编辑日记："+title);
  }
  cancelDiaryEdit();
  renderAll();
}
function editDiary(i){
  var d = blogData.diary[i];
  editingDiary = i;
  $("diaryTitle").value = d.title || "";
  $("diaryDate").value = d.date || todayStr();
  $("diaryTags").value = (d.tags||[]).join(",");
  loadRich("diary", d.content || "");
  setImgDrafts("diary", d.images);
  drafts.dmedia = (d.media||[]).slice();
  renderDraftFiles("dmedia");
  $("diaryFormTitle").textContent = "编辑日记：" + (d.title || d.date || "");
  $("diaryEditBar").classList.add("on");
  $("diarySubmit").textContent = "保存修改";
  $("diaryCancel").style.display = "inline-block";
  $("panel-diary").scrollIntoView({behavior:"smooth"});
}
function cancelDiaryEdit(){
  editingDiary = null;
  loadRich("diary", "");
  $("diaryTitle").value = ""; $("diaryTags").value = "";
  $("diaryDate").value = todayStr();
  setImgDrafts("diary", []);
  drafts.dmedia = []; renderDraftFiles("dmedia");
  $("diaryFormTitle").textContent = "写日记";
  $("diaryEditBar").classList.remove("on");
  $("diarySubmit").textContent = "保存日记";
  $("diaryCancel").style.display = "none";
}
function renderDiary(){
  var rows = adminVisible("diary", blogData.diary);
  $("diaryList").innerHTML = adminSearchInput("diary", "搜索日记：标题 / 正文 / 标签 / 日期", "diarySearch")
    + (rows.map(function(row){
    var d = row.item, realIdx = row.i;
    var tg = (d.tags||[]).map(function(t){ return '<span class="tag-chip">'+esc(t)+'</span>'; }).join("");
    return '<div class="item-row"><div class="info"><div class="title">'+esc(d.title||d.date)+'</div><div class="desc">'+esc(stripMd(d.content).slice(0,120))+'</div><div class="desc">'+esc(d.date)+' · '+((d.media||[]).length)+' 个影音'+(tg?(' · '+tg):"")+'</div>'+imgRows(d.images,"diary",realIdx)+fileRows(d.media,"diary",realIdx)+'</div><div class="actions"><button class="btn btn-ghost btn-sm" onclick="editDiary('+realIdx+')">编辑</button><button class="btn btn-danger btn-sm" onclick="delDiary('+realIdx+')">删除</button></div></div>';
  }).join("") || adminEmptyBox("diary", "暂无"));
}
function delDiary(realIdx){
  if(!confirm("确定删除？")) return;
  if(editingDiary === realIdx) cancelDiaryEdit();
  blogData.diary.splice(realIdx,1);
  saveData("删除日记");
  renderAll();
}

/* ---------- 导师指导 ---------- */
let editingAdvisor = null;
function addAdvisor(){
  var content=getRich("advisor");
  if(!content){ showToast("请写点内容","error"); return; }
  var item = {
    date: $("advDate").value || todayStr(),
    time: $("advTime").value || "",
    count: parseInt($("advCount").value,10) || 0,
    content: content,
    contentIsHTML: isRichMode("advisor"),
    tags: parseTagsInput($("advTags").value),
    images: (imgDrafts.advisor||[]).slice(),
    files: (drafts.adv||[]).slice()
  };
  blogData.advisor = blogData.advisor || [];
  if(editingAdvisor === null){
    blogData.advisor.push(item);
    saveData("添加导师指导记录");
  }else{
    blogData.advisor[editingAdvisor] = Object.assign({}, blogData.advisor[editingAdvisor], item);
    saveData("编辑导师指导记录");
  }
  cancelAdvisorEdit();
  renderAll();
}
function editAdvisor(i){
  var d = blogData.advisor[i];
  editingAdvisor = i;
  $("advDate").value = d.date || todayStr();
  $("advTime").value = d.time || "";
  $("advCount").value = d.count || "";
  $("advTags").value = (d.tags||[]).join(",");
  loadRich("advisor", d.content || "");
  setImgDrafts("advisor", d.images);
  drafts.adv = (d.files||[]).slice();
  renderDraftFiles("adv");
  $("advisorFormTitle").textContent = "编辑指导记录";
  $("advisorEditBar").classList.add("on");
  $("advSubmit").textContent = "保存修改";
  $("advCancel").style.display = "inline-block";
  $("panel-advisor").scrollIntoView({behavior:"smooth"});
}
function cancelAdvisorEdit(){
  editingAdvisor = null;
  $("advDate").value = todayStr(); $("advTime").value = ""; $("advCount").value = "";
  $("advTags").value = "";
  loadRich("advisor", "");
  setImgDrafts("advisor", []);
  drafts.adv = []; renderDraftFiles("adv");
  $("advisorFormTitle").textContent = "导师指导记录";
  $("advisorEditBar").classList.remove("on");
  $("advSubmit").textContent = "保存记录";
  $("advCancel").style.display = "none";
}
function renderAdvisor(){
  var rows = adminVisible("advisor", blogData.advisor);
  $("advisorList").innerHTML = adminSearchInput("advisor", "搜索指导记录：正文 / 标签 / 第几次 / 日期", "advisorSearch")
    + (rows.map(function(row){
    var d = row.item, realIdx = row.i;
    var tg = (d.tags||[]).map(function(t){ return '<span class="tag-chip">'+esc(t)+'</span>'; }).join("");
    return '<div class="item-row"><div class="info"><div class="title">'+(d.count?('第 '+d.count+' 次指导 · '):"")+esc(d.date)+(d.time?(' '+esc(d.time)):"")+'</div><div class="desc">'+esc(stripMd(d.content).slice(0,120))+'</div>'+(tg?'<div class="desc">'+tg+'</div>':"")+imgRows(d.images,"advisor",realIdx)+fileRows(d.files,"advisor",realIdx)+'</div><div class="actions"><button class="btn btn-ghost btn-sm" onclick="editAdvisor('+realIdx+')">编辑</button><button class="btn btn-danger btn-sm" onclick="delAdvisor('+realIdx+')">删除</button></div></div>';
  }).join("") || adminEmptyBox("advisor", "暂无"));
}
function delAdvisor(realIdx){
  if(!confirm("确定删除？")) return;
  if(editingAdvisor === realIdx) cancelAdvisorEdit();
  blogData.advisor.splice(realIdx,1);
  saveData("删除导师记录");
  renderAll();
}

/* ---------- 日志 ---------- */
/* ---------- 影音（音乐/视频/图片） ---------- */
function saveMedia(){
  var type=$("mType").value;
  var title=$("mTitle").value.trim();
  var files=(drafts.media||[]).slice();
  var url=$("mUrl").value.trim();
  if(!title || (!files.length && !url)){ showToast("请输入标题，并上传文件或填写外链","error"); return; }
  blogData.media = blogData.media || [];
  blogData.media.push({type:type, title:title, desc:$("mDesc").value.trim(), url:url, files:files, images:(imgDrafts.media||[]).slice(), file:files.length?files[0].url:"", fileName:files.length?files[0].name:"", time:nowStr()});
  saveData("添加"+(type==="music"?"音乐":type==="video"?"视频":"图片")+"："+title);
  drafts.media=[];
  renderAll();
  $("mTitle").value=""; $("mDesc").value=""; $("mUrl").value="";
  renderDraftFiles("media");
  setImgDrafts("media", []);
}
function renderMedia(){
  $("mediaList").innerHTML=(blogData.media||[]).map(function(m,i){
    return '<div class="item-row"><div class="info"><div class="title">'+(m.type==="music"?"🎵":m.type==="video"?"🎬":"🖼️")+' '+esc(m.title)+'</div><div class="desc">'+esc(m.desc)+'</div>'+fileRows(m.files,"media",i)+imgRows(m.images,"media",i)+'</div><button class="btn btn-danger btn-sm" onclick="delMedia('+i+')">删除</button></div>';
  }).join("")||'<div style="color:#94a3b8;font-size:.85rem">暂无</div>';
}
function delMedia(i){
  if(!confirm("确定删除？")) return;
  blogData.media.splice(i,1);
  saveData("删除影音");
  renderAll();
}

/* ---------- 导出 / 导入 ---------- */
function downloadJSON(filename, obj){
  var blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href);},3000);
}
function exportLedger(){ downloadJSON("ledger-"+todayStr()+".json", blogData.ledger||[]); showToast("已导出记账 JSON"); }
function exportDiary(){ downloadJSON("diary-"+todayStr()+".json", blogData.diary||[]); showToast("已导出日记 JSON"); }
function importJSON(file, target){
  if(!file) return;
  var reader=new FileReader();
  reader.onload=function(){
    try{
      var arr=JSON.parse(String(reader.result));
      if(!Array.isArray(arr)) throw new Error("格式应为数组");
      blogData[target]=(blogData[target]||[]).concat(arr);
      saveData("导入"+target);
      renderAll();
      showToast("已导入 "+arr.length+" 条");
    }catch(e){ showToast("导入失败："+e.message,"error"); }
  };
  reader.readAsText(file);
}

function renderLogs(){
  $("logList").innerHTML=(blogData.logs||[]).map(l=>`
    <div class="log-item"><b>${esc(l.time)}</b> — ${esc(l.action)}</div>`).join("")||'<div style="color:#94a3b8">暂无日志</div>';
}
