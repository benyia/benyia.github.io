/* ============================================================
   GitHub API
   ============================================================ */
function ghHeaders(){
  return { "Authorization":"Bearer "+getStoredToken(), "Accept":"application/vnd.github+json" };
}

/**
 * 统一的 GitHub API 请求。返回 {ok, status, json}
 * 失败时不抛异常，由调用方根据 status 决定提示文案。
 */
async function ghApi(path, options){
  const opt = options || {};
  const url = GH_API_BASE + "/repos/"+GH_OWNER+"/"+GH_REPO+"/contents/"+path+(opt.query||"");
  const headers = Object.assign({}, ghHeaders(), opt.headers||{});
  const res = await fetch(url, {method:opt.method||"GET", headers, body:opt.body, cache:"no-store"});
  let json = null;
  try { json = await res.json(); } catch(e){ json = null; }
  return {ok:res.ok, status:res.status, json};
}

function ghErrorText(status, json){
  const msg = json && json.message ? json.message : "";
  if(status===401) return "Token 无效或已过期，请到「站点设置」重新设置 Token";
  if(status===403) return "Token 权限不足（需要 repo 权限）或触发限流："+msg;
  if(status===404) return "找不到仓库，请确认 Token 有 repo 权限："+msg;
  if(status===409 || status===422) return "文件冲突，正在重试…";
  return "GitHub 返回 "+status+(msg?("："+msg):"");
}

/* 取 data.json 最新的 sha（保存前必须拿最新的，否则会 409 冲突） */
async function fetchDataSha(){
  const r = await ghApi(DATA_PATH, {query:"?ref="+GH_BRANCH+"&t="+Date.now()});
  if(r.ok && r.json && r.json.sha){ dataSha = r.json.sha; return dataSha; }
  return "";
}

/* ============================================================
   登录 / 密码
   ============================================================ */
function togglePwdView(){
  var i = document.getElementById("pwdInput");
  var b = document.getElementById("pwdToggle");
  if(!i || !b) return;
  var show = (i.type === "password");
  i.type = show ? "text" : "password";
  b.textContent = show ? "隐藏" : "显示";
}
/* 登录页提示文字：从 data.json 的 siteConfig.loginHint 读取（公开，无需登录） */
(async function loadLoginHint(){
  try{
    var r = await fetch("data.json?t=" + Date.now(), { cache: "no-store" });
    if(!r.ok) return;
    var d = await r.json();
    var h = d && d.siteConfig ? d.siteConfig.loginHint : null;
    var box = document.getElementById("loginHint");
    if(box && h !== null && h !== undefined) box.textContent = h;
    else if(box && !box.textContent) box.textContent = "";
  }catch(e){}
})();

function isLogged(){ try{ return localStorage.getItem("benyia_logged")==="1" || sessionStorage.getItem("benyia_logged")==="1"; }catch(e){ return false; } }
function login(){
  var p = $("pwdInput").value;
  if(p === getPwd()){
    try{
      if($("keepLogin") && $("keepLogin").checked) localStorage.setItem("benyia_logged","1");
      else sessionStorage.setItem("benyia_logged","1");
    }catch(e){}
    $("loginScreen").style.display="none";
    $("mainPanel").style.display="block";
    initPanel();
  } else {
    showToast("密码错误", "error");
  }
}
function forgotPwd(){
  showToast("密码保存在你本浏览器里；忘记可在代码里把 ADMIN_PWD 改回默认值，或清除浏览器数据", "info");
}
function logout(){
  try{ sessionStorage.removeItem("benyia_logged"); localStorage.removeItem("benyia_logged"); }catch(e){}
  location.reload();
}
function changePwd(){
  const a=$("pwdNew").value, b=$("pwdNew2").value;
  const st=$("pwdStatus");
  if(!a || a.length<4){ st.className="status-msg err"; st.textContent="密码至少 4 位"; return; }
  if(a!==b){ st.className="status-msg err"; st.textContent="两次输入不一致"; return; }
  localStorage.setItem(PWD_KEY, a);
  $("pwdNew").value=""; $("pwdNew2").value="";
  st.className="status-msg ok"; st.textContent="✅ 密码已修改（保存在本浏览器）";
}

/* ============================================================
   Token 管理
   ============================================================ */
function toggleTokenView(){
  const i=$("ghToken");
  const show = i.type==="password";
  i.type = show ? "text" : "password";
  $("tokenViewBtn").textContent = show ? "隐藏" : "显示";
}
function tokenFingerprint(t){
  /* 只显示首尾各 4 位 + 长度，不泄露完整 Token */
  if(!t) return "(空)";
  if(t.length<=12) return t.slice(0,2)+"…"+t.slice(-2)+" (长度 "+t.length+")";
  return t.slice(0,4)+"…"+t.slice(-4)+" (长度 "+t.length+")";
}
function saveToken(){
  const raw=$("ghToken").value;
  const t=raw.replace(/\s+/g,"");   /* 去掉粘贴时混进来的空格/换行/制表符 */
  const st=$("tokenStatus");
  if(!t){ st.className="status-msg err"; st.textContent="请先粘贴 Token"; return; }
  if(!/^(ghp_|github_pat_)/.test(t)){
    st.className="status-msg err";
    st.textContent="这不像 GitHub Token（应以 ghp_ 或 github_pat_ 开头），你粘的是："+tokenFingerprint(t);
    return;
  }
  const removed = raw.length - t.length;
  localStorage.setItem(TOKEN_KEY, t);
  st.className="status-msg ok";
  st.textContent="✅ 已保存 "+tokenFingerprint(t)+(removed?("，并自动去掉了 "+removed+" 个空白字符"):"")+"。建议点「测试连接」确认可用。";
  showToast("Token 已保存");
}

/* 立即验证 Token 是否真的能用，错误当场暴露 */
async function testToken(){
  const st=$("tokenStatus");
  const btn=$("tokenTestBtn");
  const t=($("ghToken").value||"").replace(/\s+/g,"") || getStoredToken();
  if(!t){ st.className="status-msg err"; st.textContent="输入框是空的，请先粘贴 Token"; return; }
  if(btn){ btn.disabled=true; btn.textContent="测试中…"; }
  st.className="status-msg"; st.textContent="正在连接 GitHub…";
  try{
    const res = await fetch(GH_API_BASE + "/repos/"+GH_OWNER+"/"+GH_REPO,{
      headers:{"Authorization":"Bearer "+t,"Accept":"application/vnd.github+json"},
      cache:"no-store"
    });
    if(res.ok){
      const j = await res.json();
      const canPush = j.permissions && j.permissions.push;
      st.className = canPush ? "status-msg ok" : "status-msg warn";
      st.textContent = canPush
        ? "✅ Token 可用：仓库 "+j.full_name+"，有写入权限"
        : "⚠️ Token 能读仓库但没有写入权限，请确认勾选了 repo";
    } else if(res.status===401){
      const who = await fetch(GH_API_BASE + "/user",{headers:{"Authorization":"Bearer "+t}}).then(r=>r.status).catch(()=>0);
      st.className="status-msg err";
      st.textContent = who===401
        ? "❌ GitHub 不认识这串 Token（401）。你输入的："+tokenFingerprint(t)+" —— 请确认完整复制、没有漏字符"
        : "❌ 401：Token 有效但无权访问该仓库";
    } else {
      st.className="status-msg err";
      st.textContent = "❌ 测试失败：HTTP "+res.status;
    }
  }catch(e){
    st.className="status-msg err";
    st.textContent="❌ 网络错误："+e.message;
  }finally{
    if(btn){ btn.disabled=false; btn.textContent="测试连接"; }
  }
}
function clearToken(){
  localStorage.removeItem(TOKEN_KEY);
  $("ghToken").value="";
  $("tokenStatus").className="status-msg warn";
  $("tokenStatus").textContent="Token 已清除。请重新粘贴后再点「保存 Token」。";
}

/* ============================================================
   启动
   ============================================================ */
async function initPanel(){
  $("ghToken").value = getStoredToken();
  $("tokenStatus").textContent = getStoredToken()
    ? "已保存 Token：" + tokenFingerprint(getStoredToken()) + "（存在本浏览器）"
    : "尚未设置 Token，保存和上传会失败";
  $("tokenStatus").className = "status-msg " + (getStoredToken() ? "ok" : "err");
  $("nDate").value = todayStr();
  $("clDate").value = todayStr();
  $("lgDate").value = todayStr();
  if($("diaryDate")) $("diaryDate").value = todayStr();
  if($("advDate")) $("advDate").value = todayStr();
  renderRosterFields();
  /* 富文本编辑器先建好工具条，切到对应面板就能直接用（课程/论文/通知/班级/日记） */
  Object.keys(RICH_KEYS).forEach(function(k){ initRte(k); });
  /* 上传框支持拖拽 */
  initDropZones();
  await syncNow(true);
}

/* ============================================================
   读线上 data.json
   ⚠️ 权威来源必须是 GitHub API，不能是 Pages 上的 data.json：
      GitHub Pages 的 CDN 缓存 data.json 时【忽略查询字符串】，同一份副本最多发 10 分钟。
      用 Pages 当来源会导致「刚保存成功、刷新一下又变回旧内容」。
      API 不做这种缓存，而且顺手能把 sha 一起拿到。
   ============================================================ */
async function readRemoteData(){
  if(getStoredToken()){
    try{
      const r = await ghApi(DATA_PATH, {query:"?ref="+GH_BRANCH+"&t="+Date.now()});
      if(r.ok && r.json && r.json.sha){
        /* ⚠️ 坑：contents API 对 >1MB 的文件不回正文（content 为空、encoding:"none"）。
           本站 data.json 已经 4MB，所以必须改走 git/blobs 按 sha 取，
           否则这里会静默失败、退回下面那条 Pages 缓存分支 —— 表现就是「保存成功但刷新后还是不显示」。 */
        let b64 = (r.json.content && r.json.encoding === "base64") ? r.json.content : "";
        if(!b64){
          const bres = await fetch(GH_API_BASE + "/repos/" + GH_OWNER + "/" + GH_REPO + "/git/blobs/" + r.json.sha,
                                   { headers: ghHeaders(), cache: "no-store" });
          const bjson = await bres.json();
          if(bres.ok && bjson && bjson.content) b64 = bjson.content;
        }
        if(b64){
          const bin = atob(String(b64).replace(/\s/g, ""));
          const bytes = new Uint8Array(bin.length);
          for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
          return { data: JSON.parse(new TextDecoder().decode(bytes)), sha: r.json.sha || "", via: "api" };
        }
      }
    }catch(e){}
  }
  /* 没设 Token（或 API 失败）才退回 Pages；这时可能拿到最多 10 分钟前的副本 */
  const res = await fetch(DATA_PATH+"?v="+Date.now(), {cache:"no-store"});
  if(!res.ok) throw new Error("HTTP "+res.status);
  return { data: await res.json(), sha: "", via: "pages" };
}

/* 从 GitHub 重新拉取 data.json（真源是仓库里的 data.json） */
async function syncNow(silent){
  setSyncState("加载中…");
  let via = "pages";
  try{
    const got = await readRemoteData();
    blogData = got.data;
    dataSha = got.sha;
    via = got.via;
  }catch(e){
    blogData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    dataSha = "";
    showToast("读取 data.json 失败："+e.message, "error");
  }
  /* 补齐缺失字段 */
  for(const k in DEFAULT_DATA){ if(blogData[k]==null) blogData[k] = DEFAULT_DATA[k]; }
  if(!blogData.siteConfig || typeof blogData.siteConfig!=="object"){
    blogData.siteConfig = Object.assign({}, DEFAULT_DATA.siteConfig);
  }

  if(!dataSha && getStoredToken()){ try{ await fetchDataSha(); }catch(e){} }

  renderAll();
  setSyncState(via === "api" ? "已就绪（API 直读）" : (getStoredToken() ? "已就绪" : "未设置 Token"));
  if(!silent) showToast(via === "api" ? "已从 GitHub 直接读取最新数据（绕过 CDN 缓存）" : "已从 GitHub 重新拉取数据");
}

function setSyncState(text){
  const el=$("syncState"); if(el) el.textContent = text;
}

/* ============================================================
   保存 data.json（带冲突自动重试）
   ============================================================ */
async function saveData(action){
  const token = getStoredToken();
  if(!token){
    showToast("请先在「站点设置」里填写 GitHub Token", "error");
    return false;
  }
  if(saving){
    showToast("上一次保存还在进行中，请稍候", "info");
    return false;
  }
  saving = true;
  setSyncState("保存中…");

  if(action){
    blogData.logs = blogData.logs || [];
    blogData.logs.unshift({time:nowStr(), action});
    if(blogData.logs.length>100) blogData.logs = blogData.logs.slice(0,100);
    renderLogs();
  }

  /* 保存前拉取最新数据：保留本页面不认识的顶层字段，避免旧页面把新加的字段覆盖掉。
     这里也必须走 API —— Pages 上的副本可能是 10 分钟前的 */
  try{
    const latest = (await readRemoteData()).data;
    for(const k in latest){ if(blogData[k]===undefined) blogData[k] = latest[k]; }
  }catch(e){}

  const body = JSON.stringify(blogData, null, 2);
  /* 用 TextEncoder + 分块避免超大字符串把 btoa 撑爆 */
  let content;
  try{
    const bytes = new TextEncoder().encode(body);
    let bin = "";
    const CHUNK = 0x8000;
    for(let i=0;i<bytes.length;i+=CHUNK){
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i+CHUNK));
    }
    content = btoa(bin);
  }catch(e){
    saving=false; setSyncState("保存失败");
    showToast("数据编码失败："+e.message, "error");
    return false;
  }

  let lastErr = "";
  for(let attempt=1; attempt<=3; attempt++){
    try{
      if(!dataSha) await fetchDataSha();
      const payload = {message:"Update: "+(action||"blog"), content, branch:GH_BRANCH};
      if(dataSha) payload.sha = dataSha;

      const r = await ghApi(DATA_PATH, {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });

      if(r.ok){
        dataSha = (r.json && r.json.content && r.json.content.sha) ? r.json.content.sha : "";
        saving = false;
        /* 告诉前台「刚保存过」：Pages 上的 data.json 还要最多 10 分钟才刷新，
           带上这个标记前台就会直接读 API，不用等 CDN */
        try{ localStorage.setItem(FRESH_KEY, String(Date.now() + 900000)); }catch(e){}
        setSyncState("已保存 "+nowStr());
        showToast("✅ 保存成功，稍等 1 分钟前台就会更新");
        return true;
      }

      lastErr = ghErrorText(r.status, r.json);
      /* 冲突：重新取 sha 再试 */
      if(r.status===409 || r.status===422){
        dataSha = "";
        await fetchDataSha();
        await new Promise(res=>setTimeout(res, 400*attempt));
        continue;
      }
      break;
    }catch(e){
      lastErr = "网络错误："+e.message;
      await new Promise(res=>setTimeout(res, 500*attempt));
    }
  }

  saving = false;
  setSyncState("保存失败");
  showToast("❌ 保存失败："+lastErr, "error");
  return false;
}
