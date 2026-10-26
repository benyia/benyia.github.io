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
/* 欢迎页的显示 / 计时 / 关闭都在 index.html 的内联脚本里（第一帧就完整，不用等数据）；
   这里只做三件事：后台关掉时收起、后台重新打开时放出来、用后台配置覆盖文案 */
function initWelcome(){
  if(wkInited) return;
  wkInited = true;
  var wk = document.getElementById("wk");
  if(!wk) return;
  var sc = (blogData && blogData.siteConfig) || {};
  var cfg = sc.welcome || {};
  if(cfg.on === false){
    try{ localStorage.setItem("wk_off", "1"); }catch(e){ /* 忽略 */ }
    wk.classList.add("hide", "gone", "wk-pre");
    document.body.classList.remove("wk-lock");
    wkDone = true;
    return;
  }
  try{ localStorage.removeItem("wk_off"); }catch(e){ /* 忽略 */ }
  var txt = function(id, v){ var e = document.getElementById(id); if(e && v != null && v !== "") e.textContent = v; };
  txt("wkTop", cfg.top);
  txt("wkNameA", cfg.name || sc.name || sc.title);
  txt("wkSuffix", cfg.suffix);
  var mid = document.getElementById("wkMid");
  if(mid) mid.textContent = (cfg.mid === undefined ? "の" : cfg.mid);
  var tip = document.getElementById("wkTip");
  if(tip) tip.textContent = wkGreeting(cfg.tip || "很高兴与你相遇");
  var bg = document.getElementById("wkBg");
  if(bg && cfg.bg){
    var url = String(cfg.bg).trim();
    if(url){ try{ bg.style.backgroundImage = 'url("' + encodeURI(url) + '")'; }catch(e){ /* 忽略 */ } }
  }
  /* 之前因为「后台关过」藏起来了，现在后台又开了：放出来重新计时 */
  if(window.__wkWasOff && wk.classList.contains("wk-pre")){
    wk.classList.remove("wk-pre", "gone", "hide");
    document.body.classList.add("wk-lock");
    wkStartAt = Date.now();
    wkDone = false;
    wkDeadline = wkStartAt + (Number(cfg.sec) > 0 ? Number(cfg.sec) : 3.5) * 1000;
    wkTick();
    setTimeout(wkClose, 12000);
  }
}

initSiteChrome();
loadData();
