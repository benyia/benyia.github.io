/* ============================================================
   ✨ 入场欢迎页（内容在后台「首页」里改）
   ============================================================ */
var wkStartAt = Date.now(), wkTimer = null, wkDeadline = 0, wkDone = false, wkInited = false;
var wkHiddenByCache = false;   /* 是否是被 localStorage 判定「后台已关」才藏起来的 */

function wkGreeting(tail){
  var now = new Date(), h = now.getHours();
  var period = h < 6 ? "凌晨" : h < 9 ? "早上" : h < 12 ? "上午" : h < 14 ? "中午" : h < 18 ? "下午" : "晚上";
  var hour = h <= 12 ? h : h - 12;
  var min = now.getMinutes();
  return now.getFullYear() + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日" + period + hour + "点"
    + (min > 0 ? min + "分" : "") + "，" + (tail || "很高兴与你相遇");
}
function wkSchedule(sec){
  wkDeadline = Date.now() + Math.max(0.8, Number(sec) || 3.5) * 1000;
  wkTick();
}
function wkTick(){
  clearTimeout(wkTimer);
  var left = wkDeadline - Date.now();
  if(left <= 0){ wkClose(); return; }
  wkTimer = setTimeout(wkTick, left);
}
function wkClose(){
  if(wkDone) return;
  wkDone = true;
  clearTimeout(wkTimer);
  var wk = document.getElementById("wk");
  document.body.classList.remove("wk-lock");
  if(!wk) return;
  wk.classList.add("hide");
  setTimeout(function(){ wk.classList.add("gone"); }, 850);
}
/* 后台关掉欢迎页后，下次打开就不再闪一下（用本地缓存先判断） */
function wkCachedOff(){
  try{ return localStorage.getItem("wk_off") === "1"; }catch(e){ return false; }
}
/* 数据和背景图准备就绪才显示；准备慢就直接看内容，不让人干等一块黑屏 */
function wkShow(wk, cfg){
  var url = String(cfg.bg || "").trim();
  var sec = Number(cfg.sec); if(!(sec > 0)) sec = 3.5;
  var shown = false;
  var start = function(){
    if(shown) return;
    shown = true;
    wk.classList.remove("wk-pre", "gone", "hide");
    document.body.classList.add("wk-lock");
    wk.addEventListener("click", wkClose);
    wkStartAt = Date.now();
    wkDone = false;
    wkDeadline = wkStartAt + sec * 1000;
    wkTick();
    setTimeout(wkClose, (sec + 5) * 1000);       /* 保险：到点没关就强制关 */
  };
  if(!url){ start(); return; }
  var img = new Image(), t = setTimeout(start, 800);   /* 图片慢就不等了 */
  img.onload = function(){ clearTimeout(t); start(); };
  img.onerror = function(){ clearTimeout(t); start(); };
  try{ img.src = url; }catch(e){ clearTimeout(t); start(); }
}

function initWelcome(){
  if(wkInited) return;
  wkInited = true;
  var wk = document.getElementById("wk");
  if(!wk) return;
  var sc = (blogData && blogData.siteConfig) || {};
  var cfg = sc.welcome || {};
  if(cfg.on === false){
    try{ localStorage.setItem("wk_off", "1"); }catch(e){ /* 忽略 */ }
    wk.classList.add("gone", "wk-pre");
    document.body.classList.remove("wk-lock");
    wkDone = true;
    return;
  }
  try{ localStorage.removeItem("wk_off"); }catch(e){ /* 忽略 */ }
  /* 数据来晚了（>2.5 秒）：这次直接看内容，不为一个欢迎页让人多等 */
  if(Date.now() - wkStartAt > 2500){
    wk.classList.add("wk-pre");
    wkDone = true;
    return;
  }
  var txt = function(id, v){ var e = document.getElementById(id); if(e && v != null && v !== "") e.textContent = v; };
  txt("wkTop", cfg.top);
  txt("wkNameA", cfg.name || sc.name || sc.title);
  txt("wkSuffix", cfg.suffix);
  var mid = document.getElementById("wkMid");
  if(mid) mid.textContent = (cfg.mid === undefined ? "の" : cfg.mid);
  var tip = document.getElementById("wkTip");
  if(tip) tip.textContent = wkGreeting(cfg.tip || "很高兴与你相遇");
  var bg = document.getElementById("wkBg");
  if(bg){
    var url = String(cfg.bg || "").trim() || "assets/image1.png";
    try{ bg.style.backgroundImage = 'url("' + encodeURI(url) + '")'; }catch(e){ /* 忽略 */ }
  }
  wkShow(wk, cfg);
}

/* 欢迎页：先藏着（HTML 上是 .wk-pre），数据 + 背景图都就绪再放出来 */
(function(){
  var wk = document.getElementById("wk");
  if(wkCachedOff()){
    wkHiddenByCache = true;
    if(wk) wk.classList.add("gone", "wk-pre");
  }
  document.addEventListener("keydown", function(e){
    if(wkDone) return;
    if(e.key === "Escape" || e.key === " " || e.key === "Enter") wkClose();
  });
})();

initSiteChrome();
loadData();
