/* ============================================================
   友链：关于页展示 + 访客申请（投稿）
   ============================================================ */
function friendCardHTML(f){
  var name = String(f.name || "未命名");
  var initial = esc(name.slice(0, 1));
  var av = f.avatar ? '<img src="' + esc(f.avatar) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">' : "";
  return '<a class="friend-card" href="' + esc(f.url || "#") + '" target="_blank" rel="noopener">'
    + '<div class="friend-avatar">' + initial + av + '</div>'
    + '<div class="friend-meta"><div class="friend-name">' + esc(name) + '</div>'
    + '<div class="friend-desc">' + esc(f.desc || "") + '</div></div></a>';
}
function renderFriends(){
  var list = (blogData.friendLinks || []).filter(function(f){ return f && f.url; });
  var about = document.getElementById("aboutFriendList");
  if(about) about.innerHTML = list.length ? '<div class="friend-grid">' + list.map(friendCardHTML).join("") + '</div>' : "";
  var aboutWrap = document.getElementById("aboutFriends");
  if(aboutWrap) aboutWrap.style.display = list.length ? "block" : "none";

  var side = document.getElementById("friendSideList");
  var sideWrap = document.getElementById("friendSideCard");
  if(side && sideWrap){
    var top = list.slice(0, 6);
    side.innerHTML = top.map(function(f){
      var ic = f.avatar ? '<img src="' + esc(f.avatar) + '" style="width:16px;height:16px;object-fit:cover;border-radius:50%;vertical-align:-3px">' : "🔗";
      return '<div class="quick-link"><a href="' + esc(f.url) + '" target="_blank" rel="noopener"><span>' + ic + ' ' + esc(f.name || "") + '</span><span>→</span></a></div>';
    }).join("");
    sideWrap.style.display = top.length ? "block" : "none";
  }
}
/* 访客申请友链：没有后端，优先走配置好的表单地址，否则回退到 GitHub Issue */
/* 友链申请：先直接写进 data.json 的 friendApplies（访客不用 GitHub 账号，也不需要 Token），
   同时开一个 GitHub Issue 当通知；后台「友链」面板能看到并一键转为正式友链。 */
function submitFriendApply(e){
  if(e && e.preventDefault) e.preventDefault();
  var g = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ""; };
  var name = g("ffName"), url = g("ffUrl"), desc = g("ffDesc"), avatar = g("ffAvatar");
  var st = document.getElementById("ffStatus");
  var say = function(msg, color){ if(st){ st.textContent = msg; st.style.color = color || "var(--text2)"; } };
  if(!name || !url){ say("请先填写网站名称和网址", "var(--primary-dark)"); return false; }
  if(!/^https?:\/\//i.test(url)){ say("网址要以 http:// 或 https:// 开头", "var(--primary-dark)"); return false; }

  var apply = {
    name: name, url: url, desc: desc, avatar: avatar,
    time: nowStr(), from: "前台友链申请表"
  };

  /* ① 站点设置里配了接收地址：先 POST 过去（自建接口的情况） */
  var endpoint = (blogData.siteConfig && blogData.siteConfig.friendApplyUrl) || "";

  /* ② 打开 GitHub Issue 链接（同时给出，作为备份通知渠道） */
  var repo = (blogData.siteConfig && blogData.siteConfig.friendIssueRepo) || (GH_OWNER + "/" + GH_REPO);
  var issueTitle = "[友链申请] " + name;
  var issueBody = "**网站名称**：" + name + "\n\n**网站地址**：" + url
    + "\n\n**网站简介**：" + (desc || "（未填写）")
    + "\n\n**头像/Logo**：" + (avatar || "（未填写）")
    + "\n\n**提交时间**：" + apply.time
    + "\n\n---\n由博客「关于我」页面的友链申请表提交";
  var issueLink = "https://github.com/" + repo + "/issues/new?labels=%E5%8F%8B%E9%93%BE%E7%94%B3%E8%AF%B7&title="
    + encodeURIComponent(issueTitle) + "&body=" + encodeURIComponent(issueBody);

  var finish = function(){
    say("✅ 已提交！站长审核后就会出现在上面的友链里。", "var(--primary-dark)");
    try { window.open(issueLink, "_blank", "noopener"); } catch(err){}
  };

  if(endpoint){
    say("提交中…");
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apply)
    }).then(function(r){
      if(r.ok){ finish(); }
      else { say("提交失败（HTTP " + r.status + "），请直接到 GitHub 提 Issue。", "#ef4444"); }
    }).catch(function(){ say("提交失败，请直接到 GitHub 提 Issue。", "#ef4444"); });
    return false;
  }

  /* ③ 有 Token（站长自己浏览器）：直接写进 data.json，后台立刻能看到 */
  if(frontToken()){
    say("提交中…");
    pushDataChange(function(d){
      d.friendApplies = d.friendApplies || [];
      d.friendApplies.push(apply);
    }, "友链申请：" + name).then(function(){
      say("✅ 已存入后台「友链申请」列表，去后台点一下就能加上。", "var(--primary-dark)");
      try { window.open(issueLink, "_blank", "noopener"); } catch(err){}
    }).catch(function(err){
      say("写入失败：" + err.message + "（已打开 GitHub 申请页作为备选）", "#ef4444");
      try { window.open(issueLink, "_blank", "noopener"); } catch(e2){}
    });
    return false;
  }

  /* ④ 普通访客：打开 GitHub 申请页（仓库里的 Action 会自动收进后台列表） */
  window.open(issueLink, "_blank", "noopener");
  say("已打开申请页：登录 GitHub 后点「Submit new issue」提交即可，我这边会自动收到。", "var(--primary-dark)");
  return false;
}

function renderNotices(){
  var arr = (blogData.notices||[]).map(function(n,i){ return {n:n, i:i}; });
  arr.sort(function(a,b){ return byTimeDesc(a.n, b.n); });
  renderPaged("notices", "noticesList", "noticesPager", arr, function(it){
    var n = it.n, i = it.i;
    var body = mdText(n.content);
    var nf = collectFiles(n).length;
    return '<div class="article-card" onclick="openNotice('+i+')">'+coverHTML(n, "🔔")
      + '<div class="article-body">'
      +   '<div class="article-title">'+esc(n.title)+'</div>'
      +   '<div class="chip-row">'
      +     (n.source?'<span class="info-chip">🏛 '+esc(n.source)+'</span>':"")
      +     (n.date?'<span class="info-chip">📅 '+esc(n.date)+'</span>':"")
      +     (nf?'<span class="info-chip green">📎 '+nf+' 个附件</span>':"")
      +   '</div>'
      +   (body?'<div class="article-desc" style="margin-top:10px">'+esc(body.slice(0,110))+'</div>':'<div class="article-desc" style="margin-top:10px;color:var(--text3)">（暂无正文）</div>')
      +   imgStrip(n)
      + '</div></div>';
  }, "暂无通知");
}
function openNotice(idx){
  rememberOrigin();
  currentNoticeIdx = idx;
  var n = blogData.notices[idx];
  document.getElementById("ndTitle").textContent = n.title;
  var files = collectFiles(n);
  /* 标题下面只留一排小圆片，详细信息去右侧栏 */
  document.getElementById("ndChips").innerHTML =
      (n.source ? '<span class="info-chip">🏛 '+esc(n.source)+'</span>' : '')
    + (n.date ? '<span class="info-chip">📅 '+esc(n.date)+'</span>' : '')
    + (n.time ? '<span class="info-chip">🕐 '+esc(n.time)+'</span>' : '')
    + '<span class="info-chip green">📎 <b>'+files.length+'</b> 个附件</span>';
  /* 基本信息 → 右侧栏「文章信息」卡片 */
  showSideInfo("ℹ️ 基本信息",
      '<div class="kv"><span class="k">来源</span><span class="v">'+esc(n.source||"未注明")+'</span></div>'
    + '<div class="kv"><span class="k">日期</span><span class="v">'+esc(n.date||"—")+'</span></div>'
    + (n.time ? '<div class="kv"><span class="k">发布时间</span><span class="v">'+esc(n.time)+'</span></div>' : '')
    + '<div class="kv"><span class="k">附件数量</span><span class="v">'+files.length+' 个</span></div>'
    + ((n.tags||[]).length ? '<div class="kv"><span class="k">标签</span><span class="v">'+n.tags.map(function(t){return '<a href="javascript:;" onclick="openTag(\''+esc(t).replace(/'/g,"\\'")+'\')" style="color:var(--primary-dark);text-decoration:none">'+esc(t)+'</a>';}).join("、")+'</span></div>' : ''));
  var box = document.getElementById("ndContent");
  box.innerHTML = mdRenderHTML(n.content) || '<div class="empty">这条通知还没有正文</div>';
  box.className = "md-body";
  /* 附件 → 正文下面（没有附件就不显示这张卡） */
  var nHasFiles = collectFiles(n).length > 0;
  showSideFiles("noticeDetail", nHasFiles ? "📎 附件" : "", nHasFiles ? (galleryHTML(n) + fileListGrouped(n)) : "");
  setPageTitle("noticeDetail", n.title, "");
  showSection("noticeDetail");
  /* 目录要在 showSection 之后生成，否则会被里面的 renderToc([]) 清掉 */
  buildToc(box);
  /* 上一篇 / 下一篇 */
  renderPnNav("ndPn", blogData.notices||[], idx, "openNotice");
}
function backToNotices(){ currentNoticeIdx = -1; backToOrigin("notices"); }

function renderClass(){
  var all = blogData.classItems||[];
  var list = classFilter==="all" ? all.slice() : all.filter(function(c){return c.type===classFilter;});
  list.sort(byTimeDesc);
  renderPaged("class", "classList", "classPager", list, function(c){
    var idx = all.indexOf(c);
    return '<div class="article-card" onclick="openClass('+idx+')">'+coverHTML(c, "👥")+'<div class="article-body"><div class="article-title">'+esc(c.title)+'</div><div class="article-meta"><span>'+esc(c.type)+'</span><span>'+esc(c.date||"")+'</span>'+(c.time?'<span class="time">🕐 '+esc(c.time)+'</span>':"")+'</div><div class="article-desc">'+esc(mdText(c.content).slice(0,100))+'</div>'+imgStrip(c)+'</div></div>';
  }, "暂无内容");
}
function openClass(idx){
  rememberOrigin();
  currentClassIdx = idx;
  var c = blogData.classItems[idx];
  document.getElementById("clDetailTitle").textContent = c.title;
  document.getElementById("clDetailMeta").textContent = (c.type||"") + " · " + (c.date||"");
  var box = document.getElementById("clDetailContent");
  box.innerHTML = mdRenderHTML(c.content);
  box.className = "intro md-body";
  document.getElementById("clDetailFiles").innerHTML = galleryHTML(c) + fileListGrouped(c);
  setPageTitle("classDetail", c.title, "");
  showSection("classDetail");
  /* 目录要在 showSection 之后生成，否则会被里面的 renderToc([]) 清掉 */
  buildToc(box);
  /* 上一篇 / 下一篇：在当前类型筛选结果里走 */
  var cAll = blogData.classItems || [];
  var cList = (classFilter === "all") ? cAll : cAll.filter(function(x){ return x.type === classFilter; });
  if(cList.indexOf(c) < 0) cList = cAll;
  renderPnNav("clPn", cList, cList.indexOf(c), "openClass", { full: cAll });
}
function backToClass(){ currentClassIdx = -1; backToOrigin("class"); }

function setMediaFilter(k){ mediaFilter = k; renderFilters(); renderMedia(); }
function renderMedia(){
  /* 「音乐」这一类的条目只在右侧歌曲播放器里展示；生活服务页只列视频和图片 */
  var all = (blogData.media||[]).filter(function(m){ return m && m.type !== "music"; });
  var wrap = document.getElementById("lifeMediaBox");
  if(wrap) wrap.style.display = all.length ? "" : "none";   /* 没有视频/图片就整块不显示 */
  if(!all.length){ document.getElementById("mediaList").innerHTML = ""; return; }
  var f = mediaFilter === "music" ? "all" : mediaFilter;
  var list = f === "all" ? all : all.filter(function(m){ return m.type === f; });
  document.getElementById("mediaList").innerHTML = list.map(function(m){
    var f0 = collectFiles(m)[0];
    var icon = m.type === "video" ? "🎬" : "🖼️";
    var player = "";
    if(f0 && f0.url){
      var nm = String(f0.name||"");
      var dot = nm.lastIndexOf(".");
      var ext = dot >= 0 ? nm.slice(dot+1).toLowerCase() : "";
      if(["mp4","webm","mov","mkv","avi","m4v"].indexOf(ext) >= 0){
        player = '<video controls preload="metadata" src="'+esc(f0.url)+'" style="width:100%;border-radius:10px;margin-bottom:10px"></video>';
      }else if(["mp3","wav","m4a","ogg","flac","aac","wma"].indexOf(ext) >= 0){
        player = '<audio controls preload="metadata" src="'+esc(f0.url)+'" style="width:100%;max-width:420px;margin-bottom:10px"></audio>';
      }else if(m.type === "image"){
        player = '<img src="'+esc(f0.url)+'" style="width:100%;border-radius:8px;margin-bottom:10px" alt="">';
      }
    }
    var dl = (f0 && f0.url) ? '<div style="margin-top:8px">'+fileActionHTML(f0.url, f0.name)+'</div>' : '';
    if(m.url) dl += '<div style="margin-top:8px"><a class="btn" href="'+esc(m.url)+'" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block;font-size:.78rem">打开链接</a></div>';
    return '<div class="article-card" id="mediaCard-'+(blogData.media||[]).indexOf(m)+'"><div class="article-body">'+player+'<div class="article-title">'+icon+' '+esc(m.title)+'</div>'+(m.desc?'<div class="article-desc">'+esc(m.desc)+'</div>':"")+dl+'</div></div>';
  }).join("") || '<div class="empty">暂无内容</div>';
}

function renderLife(){
  document.getElementById("lifeList").innerHTML = (blogData.lifeServices||[]).map(function(s, si){
    var files = collectFiles(s);
    var fileLinks = files.map(function(f){
      return '<div style="margin-top:6px">'+fileActionHTML(f.url, f.name)+'</div>';
    }).join("");
    var ic = isImgUrl(s.icon) ? '<img src="'+esc(s.icon)+'" style="width:48px;height:48px;object-fit:cover;border-radius:10px">' : '<span style="font-size:2rem">'+esc(s.icon||"🔗")+'</span>';
    var open = s.url ? '<a href="'+esc(s.url)+'" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">' : '<div>';
    var close = s.url ? '</a>' : '</div>';
    return open+'<div class="article-card" id="lifeCard-'+si+'" style="margin-bottom:0"><div class="article-body" style="text-align:center"><div style="margin-bottom:8px">'+ic+'</div><div class="article-title">'+esc(s.title)+'</div><div class="article-desc">'+esc(s.desc)+'</div>'+fileLinks+imgStrip(s)+'</div></div>'+close;
  }).join("") || '<div class="empty">暂无</div>';
}

/* ============================================================
   🧩 精选应用：生活服务里的应用卡片 + 点开的详情页
   · 数据来自 data.json 的 apps 数组（后台「精选应用」里维护）
   · 字段：name / icon / summary / cover / tags[] / intro(Markdown)
          features[{title,desc}] / developer / website / github
          social[{name,url}] / downloads[{platform,desc,url,label}]
          images[] / files[] / time / author / views
   ============================================================ */
var currentAppIdx = -1;
function appIconHTML(a, big){
  var ic = (a && a.icon) ? a.icon : "🧩";
  return isImgUrl(ic) ? '<img src="'+esc(ic)+'" alt="">' : esc(ic);
}
function appCardHTML(a, idx){
  var tags = (a.tags||[]).slice(0,4).map(function(t){ return '<span class="app-chip">'+esc(t)+'</span>'; }).join("");
  return '<div class="app-card" onclick="openApp('+idx+')">'
    + '<div class="app-head"><div class="app-icon">'+appIconHTML(a)+'</div>'
    + '<div style="min-width:0"><div class="app-name">'+esc(a.name||"未命名应用")+'</div></div></div>'
    + '<div class="app-sum">'+esc(a.summary||"")+'</div>'
    + (tags ? '<div class="app-chips">'+tags+'</div>' : "")
    + '<div class="app-dl">⬇ 下载地址</div>'
    + '</div>';
}
function renderApps(){
  var list = blogData.apps || [];
  var box = document.getElementById("appsBox");
  if(box) box.style.display = list.length ? "" : "none";
  var el = document.getElementById("appList");
  if(el) el.innerHTML = list.map(function(a, i){ return appCardHTML(a, i); }).join("");
  /* 没有常用网站就把标题也收起来 */
  var t = document.getElementById("lifeLinksTitle");
  if(t) t.style.display = (blogData.lifeServices||[]).length ? "" : "none";
}
function openApp(idx){
  var a = (blogData.apps||[])[idx];
  if(!a) return;
  rememberOrigin();
  currentAppIdx = idx;
  document.getElementById("adIcon").innerHTML = appIconHTML(a);
  document.getElementById("adTitle").textContent = a.name || "未命名应用";
  var meta = [];
  if(a.time) meta.push("发布时间：" + a.time);
  if(a.author) meta.push("作者：" + a.author);
  if(a.views) meta.push("阅读：" + a.views);
  document.getElementById("adMeta").textContent = meta.join(" · ");
  document.getElementById("adSummary").textContent = a.summary || "";
  document.getElementById("adTags").innerHTML = (a.tags||[]).map(function(t){
    return '<span class="app-chip">'+esc(t)+'</span>';
  }).join("");
  /* 封面大图 */
  var cov = document.getElementById("adCover");
  if(a.cover){ cov.style.display = ""; cov.innerHTML = '<img src="'+esc(a.cover)+'" alt="" loading="lazy">'; }
  else { cov.style.display = "none"; cov.innerHTML = ""; }
  /* 正文介绍：支持 Markdown，也兼容直接写 HTML */
  var intro = document.getElementById("adIntro");
  if(a.intro){ intro.style.display = ""; intro.className = "md-body"; intro.innerHTML = mdRenderHTML(a.intro); }
  else { intro.style.display = "none"; intro.innerHTML = ""; }
  /* 应用特色 */
  var feats = a.features || [];
  document.getElementById("adFeatures").innerHTML = feats.map(function(f){
    return '<div class="app-feature"><h4>'+esc(f.title||"")+'</h4>'+(f.desc ? '<p>'+esc(f.desc)+'</p>' : "")+'</div>';
  }).join("");
  document.getElementById("adFeatTitle").style.display = feats.length ? "" : "none";
  /* 应用信息（和右侧栏共用一份 kv 结构） */
  var rows = [];
  if(a.developer) rows.push('<div class="kv"><span class="k">开发厂商</span><span class="v">'+esc(a.developer)+'</span></div>');
  if(a.website) rows.push('<div class="kv"><span class="k">官方网站</span><span class="v"><a href="'+esc(a.website)+'" target="_blank" rel="noopener" style="color:var(--primary-dark);text-decoration:none">'+esc(a.website)+'</a></span></div>');
  if(a.github) rows.push('<div class="kv"><span class="k">GitHub</span><span class="v"><a href="'+esc(a.github)+'" target="_blank" rel="noopener" style="color:var(--primary-dark);text-decoration:none">'+esc(a.github)+'</a></span></div>');
  if((a.social||[]).length) rows.push('<div class="kv"><span class="k">社交平台</span><span class="v">'
    + a.social.map(function(s){ return '<a href="'+esc(s.url)+'" target="_blank" rel="noopener" style="color:var(--primary-dark);text-decoration:none">'+esc(s.name||"链接")+'</a>'; }).join("、")
    + '</span></div>');
  var infoHTML = rows.join("") || '<div style="font-size:.84rem;color:var(--text3)">暂无信息</div>';
  document.getElementById("adInfo").innerHTML = infoHTML;
  /* 下载地址 */
  var dls = a.downloads || [];
  document.getElementById("adDownloads").innerHTML = dls.map(function(d){
    return '<div class="app-dl-card"><div><div class="plat">'+esc(d.platform||"下载")+'</div>'
      + (d.desc ? '<div class="pdesc">'+esc(d.desc)+'</div>' : "")+'</div>'
      + '<a class="app-dl-btn" href="'+esc(d.url||"#")+'" target="_blank" rel="noopener">'+esc(d.label||"下载")+'</a></div>';
  }).join("") || '<div style="font-size:.84rem;color:var(--text3)">暂无下载地址</div>';
  document.getElementById("adDlTitle").style.display = dls.length ? "" : "none";
  /* 附件 / 截图 */
  var extra = "";
  if(collectFiles(a).length) extra += '<h3 class="app-sec-title">📎 相关下载</h3>' + fileListGrouped(a);
  extra += galleryHTML(a);
  document.getElementById("adFiles").innerHTML = extra;
  /* 右侧栏「应用信息」跟着切换 */
  showSideInfo("🧩 应用信息", infoHTML);
  /* 猜你喜欢 */
  var others = (blogData.apps||[]).map(function(x, i){ return {a:x, i:i}; }).filter(function(o){ return o.i !== idx; }).slice(0, 4);
  document.getElementById("adMore").innerHTML = others.map(function(o){ return appCardHTML(o.a, o.i); }).join("");
  document.getElementById("adMoreTitle").style.display = others.length ? "" : "none";
  /* 上一篇 / 下一篇：只显示存在的那一侧（应用按自己的排列顺序） */
  renderPnNav("adPn", blogData.apps || [], idx, "openApp", { raw: true });
  setPageTitle("appDetail", a.name, a.summary || "");
  showSection("appDetail");
  /* 目录要在 showSection 之后生成，否则会被里面的 renderToc([]) 清掉 */
  buildToc(document.getElementById("adIntro"));
}
function backToApps(){ currentAppIdx = -1; backToOrigin("life"); }

/* ============================================================
   上一篇 / 下一篇（精选应用、课程、论文、通知 共用）
   · 只画存在的那一侧，两侧都没有就整块隐藏（不再出现「没有了」占位）
   · 默认按列表顺序（时间倒序）：上一篇 = 列表里更靠上的一条
   · opts.raw = true 表示按原始数组顺序（精选应用用这个）
   · opts.full = 打开函数真正接收下标的完整数组（当 arr 是筛选后的子集时用）
   · opts.title 可自定义取标题的方式
   ============================================================ */
function renderPnNav(boxId, arr, idx, fn, opts){
  var box = document.getElementById(boxId);
  if(!box) return;
  opts = opts || {};
  var list = arr || [];
  var full = opts.full || list;
  var titleOf = opts.title || function(x){ return (x && x.title) || ""; };
  var prev = null, next = null;
  if(opts.raw){
    prev = list[idx-1] || null;
    next = list[idx+1] || null;
  }else{
    var sorted = list.slice().sort(byTimeDesc);
    var pos = sorted.indexOf(list[idx]);
    if(pos > 0) prev = sorted[pos-1];
    if(pos >= 0 && pos < sorted.length-1) next = sorted[pos+1];
  }
  var h = "";
  if(prev) h += '<a href="javascript:;" onclick="'+fn+'('+full.indexOf(prev)+')"><span class="lbl">上一篇</span>'+esc(titleOf(prev))+'</a>';
  if(next) h += '<a href="javascript:;" onclick="'+fn+'('+full.indexOf(next)+')"><span class="lbl">下一篇</span>'+esc(titleOf(next))+'</a>';
  box.innerHTML = h;
  box.style.display = h ? "" : "none";
}
/* 日记：打开独立的详情页（只显示这一篇，列表不再原地展开） */
function openDiary(idx){
  var src = blogData.diary || [];
  var d = src[idx];
  if(!d) return;
  rememberOrigin();
  currentDiaryIdx = idx;
  var title = d.title || autoTitle(d.content, d.date);
  document.getElementById("ddTitle").textContent = title;
  document.getElementById("ddChips").innerHTML =
      '<span class="info-chip">🕐 '+esc(diaryStamp(d))+'</span>'
    + ((d.tags||[]).length ? d.tags.map(function(t){ return '<span class="info-chip" style="cursor:pointer" onclick="openTag(\''+esc(t).replace(/'/g,"\\'")+'\')">🏷 '+esc(t)+'</span>'; }).join("") : "");
  var box = document.getElementById("ddContent");
  box.innerHTML = mdRenderHTML(d.content) || '<div class="empty">这篇日记没有正文</div>';
  box.className = "md-body";
  document.getElementById("ddFiles").innerHTML = galleryHTML(d) + diaryMediaHTML(d);
  setPageTitle("diaryDetail", title, diaryStamp(d));
  showSection("diaryDetail");
  /* 目录要在 showSection 之后生成，否则会被里面的 renderToc([]) 清掉 */
  buildToc(box);
  /* 上一篇 / 下一篇：按日记列表的显示顺序（最新在前），raw 保证下标是原始数组下标 */
  var ordered = src.map(function(x){ return x; }).reverse();
  renderPnNav("ddPn", ordered, ordered.indexOf(d), "openDiary", { raw: true, full: src });
}
function backToDiary(){ currentDiaryIdx = -1; backToOrigin("diary"); }

function updateLgCategories(){
  var type = document.getElementById("lgType").value;
  var cats = (blogData.ledgerCategories||{})[type] || ["其他"];
  document.getElementById("lgCategory").innerHTML = cats.map(function(c){return '<option>'+esc(c)+'</option>';}).join("");
}
function renderLedger(){
  var records = blogData.ledger||[];
  var ym = todayStr().slice(0,7);
  var inc=0, exp=0;
  records.forEach(function(r){ if(String(r.date||"").indexOf(ym)===0){ r.type==="income"?inc+=parseFloat(r.amount):exp+=parseFloat(r.amount); }});
  document.getElementById("statInc").textContent = "¥"+inc.toFixed(0);
  document.getElementById("statExp").textContent = "¥"+exp.toFixed(0);
  document.getElementById("statBal").textContent = "¥"+(inc-exp).toFixed(0);
  document.getElementById("ledgerList").innerHTML = records.slice().reverse().map(function(r){
    var imgs = collectImages(r);
    var bills = imgs.length ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+imgs.map(function(f){ return '<a href="'+esc(f.url)+'" target="_blank" rel="noopener"><img src="'+esc(f.url)+'" style="width:64px;height:64px;object-fit:cover;border-radius:8px" alt=""></a>'; }).join("")+'</div>' : "";
    return '<div class="ledger-item" id="ledgerItem-'+records.indexOf(r)+'" style="border-left-color:'+(r.type==="income"?"#10b981":"#ef4444")+'"><div style="flex:1;min-width:180px"><div class="date">'+esc(r.date)+(r.time?(' '+esc(r.time)):"")+' · '+esc(r.category||"其他")+'</div><div>'+esc(r.desc||"无备注")+'</div>'+bills+'</div><div class="amount" style="color:'+(r.type==="income"?"#10b981":"#ef4444")+'">'+(r.type==="income"?"+":"-")+'¥'+(parseFloat(r.amount)||0).toFixed(2)+'</div></div>';
  }).join("") || '<div class="empty">暂无记录</div>';
  updateLgCategories();
}
async function addLedgerFromFront(){
  var amt = parseFloat(document.getElementById("lgAmt").value);
  var desc = document.getElementById("lgDesc").value.trim();
  var type = document.getElementById("lgType").value;
  var category = document.getElementById("lgCategory").value;
  var hint = document.getElementById("lgHint");
  if(!amt || amt<=0){ if(hint){ hint.textContent="请输入金额"; hint.style.color="#ef4444"; } return; }
  if(!frontToken()){ if(hint){ hint.textContent="记账需要在管理后台「站点设置」里保存 GitHub Token（仅你自己的浏览器）"; hint.style.color="#ef4444"; } return; }
  hint.textContent = "保存中…"; hint.style.color = "#64748b";
  try{
    /* 和日记/指导记录走同一套：读最新 → 改 → 提交，冲突自动重试 */
    await pushDataChange(function(d){
      d.ledger = d.ledger || [];
      d.ledger.push({ date: todayStr(), type: type, amount: amt, desc: desc, category: category });
    }, "记账");
    document.getElementById("lgAmt").value=""; document.getElementById("lgDesc").value="";
    renderLedger();
    hint.textContent = "✅ 已记一笔，稍等约 1 分钟前台生效"; hint.style.color = "#059669";
  }catch(e){ hint.textContent = "保存失败："+e.message; hint.style.color = "#ef4444"; }
}

/* ============================================================
   前台写入（和「记一笔」同一套）：拉线上最新 data.json → 改 → 提交
   需要浏览器里存过 GitHub Token（后台「站点设置」保存一次即可）
   ============================================================ */
function frontToken(){
  try { return (localStorage.getItem("benyia_gh_token") || "").trim(); } catch(e){ return ""; }
}
/* 读线上最新 data.json（写入前必须先读，避免覆盖别人的改动） */
async function readRemoteData(h){
  var res = await fetch("https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/data.json?ref=main&t=" + Date.now(), { headers: h, cache: "no-store" });
  if(!res.ok) throw new Error("读取线上数据失败（HTTP " + res.status + "），请检查 Token 是否有效");
  var meta = await res.json();
  return { data: JSON.parse(decodeURIComponent(escape(atob(String(meta.content || "").replace(/\s/g, ""))))), sha: meta.sha };
}
function b64EncodeUtf8(obj){
  var bytes = new TextEncoder().encode(JSON.stringify(obj, null, 2));
  var bin = "", CHUNK = 0x8000;
  for(var i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}
/* 写入线上 data.json：遇到 409/422（别人刚改过）自动重读并重试一次，
   重试时会用全新数据重新执行 mutate，所以不会丢改动、也不会重复添加 */
async function pushDataChange(mutate, commitMessage){
  var token = frontToken();
  if(!token) throw new Error("需要先在管理后台「站点设置」里保存 GitHub Token（只存在你自己的浏览器里）");
  var h = { "Authorization":"Bearer "+token, "Accept":"application/vnd.github+json", "Content-Type":"application/json" };
  var lastErr = null;
  for(var attempt = 0; attempt < 2; attempt++){
    var remote = await readRemoteData(h);
    var latest = remote.data;
    mutate(latest);                       /* 每次都用最新数据重新执行，避免覆盖与重复 */
    var put = await fetch("https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/data.json", {
      method: "PUT", headers: h,
      body: JSON.stringify({ message: commitMessage || "前台更新", content: b64EncodeUtf8(latest), branch: "main", sha: remote.sha })
    });
    if(put.ok){ blogData = latest; return latest; }   /* 本地立即生效，不用等 Pages 构建 */
    var msg = "HTTP " + put.status;
    try { var j = await put.json(); if(j.message) msg += "：" + j.message; } catch(e){}
    lastErr = new Error(msg);
    /* sha 过期（有人同时写）→ 重读一次再试；其它错误直接抛 */
    if(put.status !== 409 && put.status !== 422) throw lastErr;
    await new Promise(function(r){ setTimeout(r, 600); });
  }
  throw new Error((lastErr ? lastErr.message : "") + "（刚有人同时修改，已重试一次仍冲突，请再点一次保存）");
}
function sayStatus(id, text, color){
  var el = document.getElementById(id);
  if(!el) return;
  el.textContent = text;
  el.style.color = color || "var(--text3)";
}
function parseTagsText(v){
  var out = [];
  String(v == null ? "" : v).split(/[,，、;；]+/).forEach(function(t){
    t = t.trim();
    if(t && out.indexOf(t) < 0) out.push(t);
  });
  return out;
}

/* ============================================================
   前台富文本（轻量版）：写日记用
   工具栏比后台精简，够「像写博客一样写」：标题、加粗、列表、引用、链接、插图
   ============================================================ */
var FRONT_RICH = {
  fd: { editor: "fdContent", bar: "fdToolbar", mode: "fdMode" }
};
var frontRichMode = { fd: "rich" };

function frontToolbarHTML(){
  var h = "";
  h += '<button type="button" title="撤销" data-cmd="undo">↺</button>';
  h += '<button type="button" title="重做" data-cmd="redo">↻</button>';
  h += '<span class="rt-sep"></span>';
  h += '<select title="段落样式" data-style="1">'
     + '<option value="">正文</option><option value="h2">标题 2</option>'
     + '<option value="h3">标题 3</option><option value="p">段落</option></select>';
  h += '<span class="rt-sep"></span>';
  h += '<button type="button" title="加粗" data-cmd="bold"><b>B</b></button>';
  h += '<button type="button" title="斜体" data-cmd="italic"><i>I</i></button>';
  h += '<button type="button" title="下划线" data-cmd="underline"><u>U</u></button>';
  h += '<button type="button" title="删除线" data-cmd="strikeThrough"><s>S</s></button>';
  h += '<span class="rt-sep"></span>';
  h += '<button type="button" title="无序列表" data-cmd="insertUnorderedList">•≡</button>';
  h += '<button type="button" title="有序列表" data-cmd="insertOrderedList">1≡</button>';
  h += '<button type="button" title="引用" data-cmd="formatBlock" data-val="blockquote">❝</button>';
  h += '<button type="button" title="清除格式" data-cmd="removeFormat">Tx</button>';
  h += '<span class="rt-sep"></span>';
  h += '<button type="button" title="插入链接" data-act="link">🔗</button>';
  h += '<button type="button" title="插入图片" data-act="img">🖼️</button>';
  h += '<button type="button" title="插入表格" data-act="table">▦</button>';
  return h;
}
/* ============================================================
   前台轻量弹窗：和后台一致，不再用浏览器自带的 prompt
   ============================================================ */
var fdlgState = { onOk: null, onFile: null, uploading: false };
function fdlgErr(t){ var e = document.getElementById("fdlgErr"); if(e) e.textContent = t || ""; }
function closeFdlg(){
  var m = document.getElementById("fdlgMask");
  if(m) m.classList.remove("show");
  var f = document.getElementById("fdlgFile");
  if(f) f.value = "";
  fdlgState = { onOk: null, onFile: null, uploading: false };
}
function fdlgPickFile(){ if(!fdlgState.uploading){ var f = document.getElementById("fdlgFile"); if(f) f.click(); } }
async function onFdlgFile(e){
  var files = Array.prototype.slice.call((e.target && e.target.files) || []);
  if(e.target) e.target.value = "";
  if(!files.length || !fdlgState.onFile) return;
  fdlgState.uploading = true;
  var btn = document.getElementById("fdlgUp");
  var old = btn ? btn.textContent : "";
  if(btn){ btn.disabled = true; btn.textContent = "上传中…"; }
  try{
    var urls = await fdlgState.onFile(files);
    var list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
    if(list.length){
      var inp = document.getElementById("fdlgInput");
      if(inp) inp.value = list.join("\n");
      fdlgErr("✅ 已上传 " + list.length + " 个，点「确定」插入");
    }
  }catch(err){
    fdlgErr("上传失败：" + err.message);
  }
  fdlgState.uploading = false;
  if(btn){ btn.disabled = false; btn.textContent = old || "选择文件上传"; }
}
function openFdlg(opt){
  opt = opt || {};
  fdlgState.onOk = opt.onOk || null;
  fdlgState.onFile = opt.onFile || null;
  document.getElementById("fdlgTitle").textContent = opt.title || "输入";
  document.getElementById("fdlgHint").textContent = opt.hint || "";
  document.getElementById("fdlgInput").value = opt.value || "";
  document.getElementById("fdlgInput").placeholder = opt.placeholder || "";
  document.getElementById("fdlgInput2").placeholder = opt.placeholder2 || "";
  document.getElementById("fdlgRow2").style.display = opt.secondInput ? "" : "none";
  document.getElementById("fdlgInput2").value = "";
  var up = document.getElementById("fdlgUp");
  up.style.display = opt.onFile ? "" : "none";
  up.textContent = opt.uploadLabel || "选择文件上传";
  fdlgErr("");
  document.getElementById("fdlgMask").classList.add("show");
  setTimeout(function(){ try { document.getElementById("fdlgInput").focus(); document.getElementById("fdlgInput").select(); } catch(e){} }, 30);
}
function submitFdlg(){
  if(fdlgState.uploading) return;
  if(!fdlgState.onOk) return closeFdlg();
  if(fdlgState.onOk(document.getElementById("fdlgInput").value.trim(), document.getElementById("fdlgInput2").value.trim()) !== false) closeFdlg();
}
/* 把图片/链接插到前台编辑器光标处 */
function frontInsertHTML(html){
  var ed = document.getElementById("fdContent");
  if(!ed) return;
  ed.focus();
  try { document.execCommand("insertHTML", false, html); }
  catch(e){ ed.innerHTML += html; }
}
/* 插入图片弹窗：填网址 或 上传（上传后自动回填地址） */
function frontInsertImage(){
  openFdlg({
    title: "插入图片",
    hint: "图片地址（也可以直接粘贴图床链接）\n先点「选择文件上传」也行，上传完地址会自动填进来",
    placeholder: "https://",
    okText: "插入",
    onFile: async function(files){
      if(!frontToken()) throw new Error("需要先在后台「站点设置」保存 GitHub Token");
      var out = [];
      for(var i = 0; i < files.length; i++) out.push(await uploadFrontFile(files[i], "files"));
      return out;
    },
    onOk: function(url){
      var list = String(url || "").split("\n").map(function(s){ return s.trim(); }).filter(Boolean);
      if(!list.length){ fdlgErr("请输入图片地址，或先上传一张"); return false; }
      for(var i = 0; i < list.length; i++){
        if(!/^(https?:\/\/|files\/|\/)/i.test(list[i])){ fdlgErr("地址要以 https:// 开头（或站内 files/ 路径）"); return false; }
      }
      frontInsertHTML(list.map(function(u){ return '<img src="' + esc(u) + '" alt="">'; }).join(""));
      sayStatus("fdStatus", "✅ 已插入 " + list.length + " 张图片（刚上传的要等 Pages 发布约 1 分钟）", "var(--primary-dark)");
      return true;
    }
  });
}
/* 插入链接弹窗 */
function frontInsertLink(){
  openFdlg({
    title: "插入链接",
    hint: "链接地址（https://...）",
    placeholder: "https://",
    secondInput: true,
    placeholder2: "显示文字（可留空）",
    okText: "插入",
    onOk: function(url, text){
      if(!/^https?:\/\//i.test(url)){ fdlgErr("链接要以 http:// 或 https:// 开头"); return false; }
      var label = text || url;
      frontInsertHTML('<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>&nbsp;');
      return true;
    }
  });
}
/* 插入表格弹窗（和参考站那种表格一样，写学习笔记很常用） */
function frontInsertTable(){
  openFdlg({
    title: "插入表格",
    hint: "填行数和列数（例如 3 行 4 列），插入后可以直接在表格里打字",
    placeholder: "行数，如 3",
    secondInput: true,
    placeholder2: "列数，如 4",
    okText: "插入表格",
    onOk: function(rows, cols){
      var r = Math.min(20, Math.max(1, parseInt(rows, 10) || 3));
      var c = Math.min(8, Math.max(1, parseInt(cols, 10) || 3));
      var html = '<table><tbody>';
      for(var i = 0; i < r; i++){
        html += "<tr>";
        for(var j = 0; j < c; j++) html += "<td><br></td>";
        html += "</tr>";
      }
      html += "</tbody></table><p><br></p>";
      frontInsertHTML(html);
      return true;
    }
  });
}
function initFrontRich(key){
  var cfg = FRONT_RICH[key];
  if(!cfg) return;
  var bar = document.getElementById(cfg.bar);
  var editor = document.getElementById(cfg.editor);
  if(!bar || !editor || bar.getAttribute("data-ready")) return;
  bar.innerHTML = frontToolbarHTML();
  bar.setAttribute("data-ready", "1");
  Array.prototype.forEach.call(bar.querySelectorAll("button"), function(btn){
    btn.addEventListener("mousedown", function(ev){
      ev.preventDefault();
      var act = btn.getAttribute("data-act");
      var cmd = btn.getAttribute("data-cmd");
      editor.focus();
      if(act === "link"){
        frontInsertLink();
      }else if(act === "img"){
        frontInsertImage();
      }else if(act === "table"){
        frontInsertTable();
      }else if(cmd){
        document.execCommand(cmd, false, btn.getAttribute("data-val") || null);
      }
    });
  });
  Array.prototype.forEach.call(bar.querySelectorAll("select"), function(sel){
    sel.addEventListener("change", function(){
      editor.focus();
      var v = sel.value;
      if(v) document.execCommand("formatBlock", false, v);
      sel.selectedIndex = 0;
    });
  });
  editor.addEventListener("paste", function(e){
    var t = e.clipboardData ? e.clipboardData.getData("text/plain") : "";
    if(!t) return;
    e.preventDefault();
    document.execCommand("insertText", false, t);
  });
}
/* 源码 / 可视化 互切 */
function toggleFrontRich(key){
  var cfg = FRONT_RICH[key];
  if(!cfg) return;
  var editor = document.getElementById(cfg.editor);
  var bar = document.getElementById(cfg.bar);
  var link = document.getElementById(cfg.mode);
  var plain = document.getElementById(key + "Source");
  if(frontRichMode[key] === "rich"){
    /* 转源码：把 HTML 转成简单 Markdown */
    var html = String(editor.innerHTML || "").trim();
    frontRichMode[key] = "plain";
    editor.style.display = "none";
    bar.style.display = "none";
    if(!plain){
      plain = document.createElement("textarea");
      plain.id = key + "Source";
      plain.style.cssText = "width:100%;min-height:240px;padding:14px 16px;border:1px solid var(--border);border-radius:10px;font-family:ui-monospace,Consolas,monospace;font-size:.86rem;line-height:1.8;resize:vertical";
      editor.parentNode.insertBefore(plain, editor.nextSibling);
    }
    plain.value = htmlToSimpleMd(html);
    plain.style.display = "";
    if(link) link.textContent = "切换回可视化编辑";
  }else{
    var src = plain ? plain.value : "";
    frontRichMode[key] = "rich";
    if(plain){ plain.remove(); }
    editor.style.display = "";
    bar.style.display = "";
    editor.innerHTML = !src.trim() ? "" : (looksHTML(src) ? src : mdRender(src));
    if(link) link.textContent = "切换到源码 / Markdown";
  }
}
/* 极简 HTML → Markdown（只在切源码时用） */
function htmlToSimpleMd(html){
  var d = document.createElement("div");
  d.innerHTML = String(html || "");
  function inline(node){
    var s = "";
    Array.prototype.forEach.call(node.childNodes, function(n){
      if(n.nodeType === 3){ s += n.nodeValue; return; }
      if(n.nodeType !== 1) return;
      var tag = n.tagName.toLowerCase(), inner = inline(n);
      if(tag === "br"){ s += "\n"; return; }
      if(tag === "strong" || tag === "b"){ s += "**" + inner + "**"; return; }
      if(tag === "em" || tag === "i"){ s += "*" + inner + "*"; return; }
      if(tag === "s" || tag === "strike" || tag === "del"){ s += "~~" + inner + "~~"; return; }
      if(tag === "a"){ s += "[" + inner + "](" + (n.getAttribute("href") || "") + ")"; return; }
      if(tag === "img"){ s += "![" + (n.getAttribute("alt") || "") + "](" + (n.getAttribute("src") || "") + ")"; return; }
      s += inner;
    });
    return s;
  }
  var out = [];
  Array.prototype.forEach.call(d.childNodes, function(n){
    if(n.nodeType === 3){ var t = n.nodeValue.trim(); if(t) out.push(t); return; }
    if(n.nodeType !== 1) return;
    var tag = n.tagName.toLowerCase();
    if(/^h[1-6]$/.test(tag)){ out.push("#".repeat(parseInt(tag.slice(1), 10)) + " " + inline(n).trim()); return; }
    if(tag === "ul" || tag === "ol"){
      var items = [];
      Array.prototype.forEach.call(n.children, function(li){ items.push(inline(li).trim()); });
      out.push(items.map(function(it, i){ return (tag === "ol" ? (i + 1) + ". " : "- ") + it; }).join("\n"));
      return;
    }
    if(tag === "blockquote"){ out.push(inline(n).split("\n").map(function(l){ return "> " + l; }).join("\n")); return; }
    if(tag === "pre"){ out.push("```\n" + (n.textContent || "").replace(/\n+$/, "") + "\n```"); return; }
    var t2 = inline(n).trim();
    if(t2) out.push(t2);
  });
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
/* 读前台编辑器内容（自动按模式取） */
function getFrontRich(key){
  var cfg = FRONT_RICH[key];
  if(!cfg) return "";
  if(frontRichMode[key] === "plain"){
    var ta = document.getElementById(key + "Source");
    return ta ? ta.value.trim() : "";
  }
  var editor = document.getElementById(cfg.editor);
  if(!editor) return "";
  var html = String(editor.innerHTML || "").trim();
  if(html === "<br>" || html === "<p></p>" || html === "<div><br></div>") html = "";
  return html;
}
function isFrontRich(key){ return frontRichMode[key] !== "plain"; }
