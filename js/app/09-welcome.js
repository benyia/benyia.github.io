/* ============================================================
   ✨ 入场欢迎页（内容在后台「首页」里改）
   ============================================================ */
var wkStartAt = Date.now(), wkTimer = null, wkDeadline = 0, wkDone = false, wkInited = false;

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
function initWelcome(){
  if(wkInited) return;
  wkInited = true;
  var wk = document.getElementById("wk");
  if(!wk) return;
  var sc = (blogData && blogData.siteConfig) || {};
  var cfg = sc.welcome || {};
  if(cfg.on === false){
    try{ localStorage.setItem("wk_off", "1"); }catch(e){ /* 忽略 */ }
    wk.classList.add("gone");
    document.body.classList.remove("wk-lock");
    wkDone = true;
    return;
  }
  try{ localStorage.removeItem("wk_off"); }catch(e){ /* 忽略 */ }
  /* 之前因为本地缓存判定为「已关闭」而藏起来了，现在后台又打开了，就重新放出来 */
  if(wk.classList.contains("gone")){
    wk.classList.remove("gone", "hide");
    wkStartAt = Date.now();
    wkDone = false;
    document.body.classList.add("wk-lock");
    wk.addEventListener("click", wkClose);
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
  /* 结束时间按「页面打开那一刻」算，数据加载慢也不会多显示一会儿 */
  var sec = Number(cfg.sec); if(!(sec > 0)) sec = 3.5;
  wkDeadline = wkStartAt + sec * 1000;
  wkTick();
}

/* 欢迎页：页面一进来就先显示并开始计时，数据到了再按后台设置刷新文案 */
(function(){
  var wk = document.getElementById("wk");
  if(wkCachedOff()){
    if(wk) wk.classList.add("gone");     /* 后台关过，先不闪；等数据确认后再决定 */
    return;
  }
  if(wk){
    document.body.classList.add("wk-lock");
    wk.addEventListener("click", wkClose);
  }
  document.addEventListener("keydown", function(e){
    if(wkDone) return;
    if(e.key === "Escape" || e.key === " " || e.key === "Enter") wkClose();
  });
  wkSchedule(3.5);
})();

initSiteChrome();
loadData();
