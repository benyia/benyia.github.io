/* ============================================================
   🎵 音乐播放器（首页「前面板」 + 右下角迷你条）
   · 歌单直接读后台「影音」里 type=music 的条目，不用另外维护一份数据
   · 想显示歌词：给那条影音填多行「备注」，或加 "lyrics" 字段（支持 [mm:ss] 时间轴）
   · 纯新增：不改动任何已有函数的行为，只在 renderAll 里多调一次 renderMusic()
   ============================================================ */
var MP_MODE_NAMES = ["列表循环", "单曲循环", "随机播放"];
var MP_ICON = {
  repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12V9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v1"/><path d="m18.5 3.5 2.5 2.5-2.5 2.5"/><path d="M20 12v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-1"/><path d="m5.5 20.5-2.5-2.5 2.5-2.5"/></svg>',
  repeatOne: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12V9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v1"/><path d="m18.5 3.5 2.5 2.5-2.5 2.5"/><path d="M20 12v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-1"/><path d="m5.5 20.5-2.5-2.5 2.5-2.5"/><text x="12" y="15" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" stroke="none">1</text></svg>',
  shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h4l10 12h4"/><path d="M3 18h4l2.6-3.1"/><path d="M13.4 9.1 17 6h4"/><path d="m18.6 3.6 2.4 2.4-2.4 2.4"/><path d="m18.6 15.6 2.4 2.4-2.4 2.4"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2.3v12H6z"/><path d="M19 6v12L9.4 12z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M15.7 6H18v12h-2.3z"/><path d="M5 6l9.6 6L5 18z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.2 19 12 8 18.8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M4 9h3l4-3.6v13.2L7 15H4z"/><path d="M14.4 8.6a5 5 0 0 1 0 6.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h3l4-3.6v13.2L7 15H4z"/><path d="m15 9.6 5 4.8m0-4.8-5 4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  toTop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6"/><path d="m5.5 12.5 6.5-6.5 6.5 6.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="m7 7 10 10M17 7 7 17"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M20 3.5v10.2a3.1 3.1 0 1 1-1.8-2.8V6.2l-7.4 1.7v9.1a3.1 3.1 0 1 1-1.8-2.8V5.9z"/></svg>'
};

var mpAudio = null, mpReady = false, mpBound = false;
var mpTracks = [], mpIndex = -1;
var mpMode = 0, mpSheetOn = false, mpQuery = "";
var mpMiniClosed = false, mpRafPending = false, mpDragging = false;
var mpMuted = false, mpLastVol = 80;

function mpEl(id){ return document.getElementById(id); }
function mpFmt(sec){
  var s = Math.floor(isFinite(sec) && sec > 0 ? sec : 0);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function mpIsPlaying(){ return !!(mpAudio && !mpAudio.paused && !mpAudio.ended); }
function mpStore(key, val){
  try{
    if(val === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, String(val));
  }catch(e){ /* 隐私模式等：忽略 */ }
  return null;
}
function mpVolumeNow(){
  if(mpAudio && typeof mpAudio.volume === "number") return Math.round(mpAudio.volume * 100);
  return mpLastVol;
}

/* 文件名「歌手 - 歌名.mp3」里没有单独的歌手字段时，自动拆一下 */
function mpParseTrack(m, idx, f){
  var fileName = String(m.fileName || "").replace(/\.[^.\\/]+$/, "");
  var title = String(m.title || "").trim() || fileName || ("歌曲 " + (idx + 1));
  var artist = String(m.artist || "").trim();
  if(!artist){
    var parts = fileName.split(/\s+[-–—]\s+/);
    if(parts.length > 1 && parts[0].trim()) artist = parts[0].trim();
  }
  if(!artist) artist = "未知歌手";
  var desc = String(m.desc || "").trim();
  var imgs = collectImages(m);
  var t = {
    title: title, artist: artist, src: String(f.url || ""),
    cover: imgs.length ? String(imgs[0].url || "") : "",
    producer: desc
  };
  /* 搜索关键词：歌名 + 歌手 + 原始文件名 + 备注，全部小写 */
  t.key = (t.title + " " + t.artist + " " + fileName + " " + desc + " " + String(f.name || "")).toLowerCase();
  return t;
}
/* 关键词匹配：空格分开的多个词要全部命中（AND），空词忽略 */
function mpMatch(t, q){
  if(!q) return true;
  var parts = q.split(/\s+/).filter(Boolean);
  for(var i = 0; i < parts.length; i++){ if(t.key.indexOf(parts[i]) < 0) return false; }
  return true;
}

/* ---- 初始化 ---- */
function mpInit(){
  if(mpReady) return;
  mpReady = true;
  try{
    mpAudio = document.createElement("audio");
    mpAudio.preload = "metadata";
    if(mpAudio && mpAudio.addEventListener){
      mpAudio.addEventListener("timeupdate", mpPaintProgress);
      mpAudio.addEventListener("loadedmetadata", mpPaintProgress);
      mpAudio.addEventListener("durationchange", mpPaintProgress);
      mpAudio.addEventListener("ended", mpOnEnded);
      mpAudio.addEventListener("error", mpOnError);
      mpAudio.addEventListener("play", mpPaint);
      mpAudio.addEventListener("pause", mpPaint);
    }
  }catch(e){ mpAudio = null; }

  var vol = mpStore("mp_volume"), mode = mpStore("mp_mode");
  mpLastVol = 80;
  var v0 = vol === null ? 80 : Math.max(0, Math.min(100, Math.round(Number(vol) || 0)));
  if(v0 > 0) mpLastVol = v0;
  mpMode = mode === null ? 0 : Math.max(0, Math.min(2, Math.round(Number(mode) || 0)));
  try{ mpMiniClosed = sessionStorage.getItem("mp_mini_closed") === "1"; }catch(e){ mpMiniClosed = false; }

  applyVolume(v0);
  mpPaintIcons();
  mpBindBar();
  mpBindImgFallback();
  mpBindGlobal();
}
/* 歌曲列表界面：封面加载失败换音符图标（error 不冒泡，用捕获监听）；行支持回车/空格 */
function mpBindImgFallback(){
  var box = mpEl("mpSheetBody");
  if(!box || !box.addEventListener || box.getAttribute("data-mp-fb")) return;
  box.setAttribute("data-mp-fb", "1");
  box.addEventListener("error", function(e){
    var img = e.target;
    if(!img || String(img.tagName).toUpperCase() !== "IMG") return;
    var host = img.parentNode;
    if(host && host.className && String(host.className).indexOf("mp-thumb") >= 0) host.innerHTML = MP_ICON.note;
  }, true);
  box.addEventListener("keydown", function(e){
    if(e.key !== "Enter" && e.key !== " ") return;
    var row = e.target && e.target.closest ? e.target.closest(".mp-row") : null;
    if(!row) return;
    e.preventDefault();
    mpPlayAt(Number(row.getAttribute("data-i")));
  });
}

/* ---- 渲染 ---- */
function renderMusic(){
  try{ mpInit(); }catch(e){ return; }
  var media = (blogData && blogData.media) || [];
  var list = [];
  media.forEach(function(m, i){
    if(!m || m.type !== "music") return;
    var f = collectFiles(m)[0];
    if(!f || !f.url) return;
    var t = mpParseTrack(m, i, f);
    if(t.src) list.push(t);
  });
  var curSrc = (mpIndex >= 0 && mpTracks[mpIndex]) ? mpTracks[mpIndex].src : "";
  var keep = -1;
  for(var i = 0; i < list.length; i++){ if(list[i].src === curSrc){ keep = i; break; } }
  var changed = list.length !== mpTracks.length
    || list.some(function(t, j){ return !mpTracks[j] || mpTracks[j].src !== t.src; });
  mpTracks = list;
  if(changed){
    mpIndex = keep >= 0 ? keep : (list.length ? 0 : -1);
    if(mpIndex >= 0) mpSetSrc(mpIndex);
  } else if(mpIndex < 0 && list.length){
    mpIndex = 0;
    mpSetSrc(0);
  }
  mpPaint();
  mpUpdateMini();
}
function mpSetSrc(i){
  var t = mpTracks[i];
  if(!mpAudio || !t) return;
  try{ mpAudio.src = t.src; mpAudio.load(); }catch(e){ /* 忽略 */ }
}
function mpPaint(){
  var t = mpTracks[mpIndex] || null;
  var title = mpEl("mpTitle"), artist = mpEl("mpArtist"), art = mpEl("mpDiscArt");
  if(title) title.textContent = t ? t.title : "还没有音乐";
  if(artist) artist.textContent = t ? t.artist : "去后台「影音」上传一首吧";
  if(art){
    if(t && t.cover){
      art.innerHTML = '<img src="' + esc(t.cover) + '" alt="">';
      var im = art.querySelector("img");
      if(im) im.onerror = function(){ art.innerHTML = MP_ICON.note; };
    } else {
      art.innerHTML = MP_ICON.note;
    }
  }
  var playing = mpIsPlaying();
  var disc = mpEl("mpDisc"); if(disc) disc.classList.toggle("playing", playing);
  var card = mpEl("mpCard"); if(card) card.classList.toggle("playing", playing);
  var eq = mpEl("mpEq"); if(eq) eq.classList.toggle("playing", playing);
  mpPaintIcons();
  mpPaintFront();
  mpPaintCount();
  mpPaintSheet();
  mpPaintProgress();
  mpSyncMediaSession();
}
function mpPaintIcons(){
  var playing = mpIsPlaying();
  var set = function(id, html){ var b = mpEl(id); if(b) b.innerHTML = html; };
  set("mpPlay", playing ? MP_ICON.pause : MP_ICON.play);
  set("mpMiniPlay", playing ? MP_ICON.pause : MP_ICON.play);
  set("mpPrev", MP_ICON.prev);
  set("mpNext", MP_ICON.next);
  set("mpMiniPrev", MP_ICON.prev);
  set("mpMiniNext", MP_ICON.next);
  set("mpMiniTop", MP_ICON.toTop);
  set("mpMiniClose", MP_ICON.close);
  set("mpMode", mpMode === 1 ? MP_ICON.repeatOne : (mpMode === 2 ? MP_ICON.shuffle : MP_ICON.repeat));
  var muted = mpMuted || mpVolumeNow() === 0;
  set("mpMute", muted ? MP_ICON.mute : MP_ICON.vol);
  var mb = mpEl("mpMode");
  if(mb){ mb.title = MP_MODE_NAMES[mpMode]; mb.setAttribute("aria-label", MP_MODE_NAMES[mpMode]); }
  var pb = mpEl("mpPlay"); if(pb) pb.setAttribute("aria-label", playing ? "暂停" : "播放");
  var p2 = mpEl("mpMiniPlay"); if(p2) p2.setAttribute("aria-label", playing ? "暂停" : "播放");
  var mm = mpEl("mpMute"); if(mm) mm.setAttribute("aria-label", muted ? "取消静音" : "静音");
}
/* 前面板那行绿色小字 */
function mpPaintFront(){
  var t = mpTracks[mpIndex] || null;
  var el = mpEl("mpLyric");
  if(!el) return;
  var total = mpTracks.length, line;
  if(!t) line = total ? ("共 " + total + " 首 · 点击播放") : "还没有音乐 · 去后台「影音」上传一首";
  else if(t.producer) line = t.producer;
  else line = "共 " + total + " 首 · 点击播放";
  el.textContent = line;
}
/* 搜索命中的歌曲下标 */
function mpFiltered(){
  var out = [];
  for(var i = 0; i < mpTracks.length; i++){ if(mpMatch(mpTracks[i], mpQuery)) out.push(i); }
  return out;
}
/* 弹层标题上的数量 + 搜索页签文字 */
function mpPaintCount(){
  var c = mpEl("mpSheetCount");
  if(c) c.textContent = mpFiltered().length;
  var label = mpEl("mpSheetLabel");
  if(label) label.textContent = mpQuery ? "搜索结果" : "歌曲";
}
/* 搜索命中的字标黄：先在原文上匹配、再逐段转义，避免注入 */
function mpHi(s){
  var raw = String(s == null ? "" : s);
  if(!mpQuery) return esc(raw);
  var parts = mpQuery.split(/\s+/).filter(Boolean);
  if(!parts.length) return esc(raw);
  var re;
  try{
    re = new RegExp("(" + parts.map(function(p){ return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "gi");
  }catch(e){ return esc(raw); }
  var out = "", last = 0, m;
  while((m = re.exec(raw))){
    out += esc(raw.slice(last, m.index)) + "<mark>" + esc(m[0]) + "</mark>";
    last = m.index + m[0].length;
    if(m[0] === "") re.lastIndex++;
  }
  return out + esc(raw.slice(last));
}
function mpListHTML(){
  if(!mpTracks.length) return '<div class="mp-empty">歌单还是空的<br>去后台「影音」上传一首吧 🎵</div>';
  var list = mpFiltered();
  if(!list.length) return '<div class="mp-empty">没找到和「' + esc(mpQuery) + '」有关的歌<br><br>换个歌名或歌手再试试</div>';
  var playing = mpIsPlaying();
  return '<div class="mp-list">' + list.map(function(i){
    var t = mpTracks[i];
    var on = i === mpIndex;
    var thumb = t.cover
      ? '<span class="mp-thumb"><img src="' + esc(t.cover) + '" alt=""></span>'
      : '<span class="mp-thumb">' + MP_ICON.note + '</span>';
    var idx = on && playing ? "♪" : String(i + 1).padStart(2, "0");
    return '<div class="mp-row' + (on ? " on" : "") + '" data-i="' + i + '" onclick="mpPlayAt(' + i + ')" role="button" tabindex="0" title="播放 ' + esc(t.title) + '">'
      + '<span class="mp-idx">' + idx + '</span>'
      + thumb
      + '<div class="mp-row-txt"><div class="mp-row-name">' + mpHi(t.title) + '</div><div class="mp-row-artist">' + mpHi(t.artist) + '</div></div>'
      + '<span class="mp-row-act">' + (on && playing ? MP_ICON.pause : MP_ICON.play) + '</span>'
      + '</div>';
  }).join("") + '</div>';
}
/* 独立的歌曲列表界面 */
function mpPaintSheet(){
  var sheet = mpEl("mpSheet"), mask = mpEl("mpSheetMask"), body = mpEl("mpSheetBody"), foot = mpEl("mpSheetFoot");
  if(!sheet || !mask) return;
  sheet.classList.toggle("show", !!mpSheetOn);
  mask.classList.toggle("show", !!mpSheetOn);
  if(!mpSheetOn) return;
  var t = mpTracks[mpIndex] || null;
  var keep = body ? body.scrollTop : 0;
  if(body) body.innerHTML = mpListHTML();
  if(body && keep && !mpQuery) body.scrollTop = keep;   /* 重渲染别丢滚动位置 */
  if(foot){
    foot.innerHTML = t
      ? ('当前播放：<b>' + esc(t.title) + '</b> · ' + esc(t.artist))
      : "还没有音乐";
  }
  var inp = mpEl("mpSearch");
  if(inp && inp.value !== mpQuery) inp.value = mpQuery;
  var clr = mpEl("mpSearchClear");
  if(clr) clr.hidden = !mpQuery;
  mpPaintCount();
}
function mpOpenSheet(){
  mpInit();
  mpSheetOn = true;
  mpQuery = "";
  var inp = mpEl("mpSearch");
  if(inp) inp.value = "";
  var body = mpEl("mpSheetBody");
  if(body) body.scrollTop = 0;
  mpPaintSheet();
  document.body.style.overflow = "hidden";
}
function mpCloseSheet(){
  if(!mpSheetOn) return;
  mpSheetOn = false;
  mpPaintSheet();
  document.body.style.overflow = "";
}
function mpDoSearch(v){
  mpQuery = String(v == null ? "" : v).trim().toLowerCase();
  var body = mpEl("mpSheetBody");
  if(body) body.scrollTop = 0;
  mpPaintSheet();
}
function mpClearSearch(){
  mpQuery = "";
  var inp = mpEl("mpSearch");
  if(inp){
    inp.value = "";
    if(inp.focus){ try{ inp.focus(); }catch(e){ /* 忽略 */ } }
  }
  mpPaintSheet();
}
function mpPaintProgress(){
  var cur = 0, dur = 0;
  if(mpAudio){
    cur = mpAudio.currentTime || 0;
    dur = isFinite(mpAudio.duration) ? mpAudio.duration : 0;
  }
  var pct = dur > 0 ? Math.min(100, cur / dur * 100) : 0;
  var fill = mpEl("mpFill"); if(fill) fill.style.width = pct + "%";
  var dot = mpEl("mpDot"); if(dot) dot.style.left = pct + "%";
  var c = mpEl("mpCur"); if(c) c.textContent = mpFmt(cur);
  var d = mpEl("mpDur"); if(d) d.textContent = mpFmt(dur);
  var bar = mpEl("mpBar"); if(bar) bar.setAttribute("aria-valuenow", String(Math.round(pct)));
}
function mpSyncMediaSession(){
  try{
    if(!navigator.mediaSession || typeof MediaMetadata !== "function") return;
    var t = mpTracks[mpIndex];
    if(!t) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title, artist: t.artist, album: "思齐的博客",
      artwork: t.cover ? [{ src: t.cover }] : []
    });
  }catch(e){ /* 浏览器不支持就算了 */ }
}

/* ---- 播放控制 ---- */
function mpPlayAt(i){
  mpInit();
  if(i < 0 || i >= mpTracks.length) return;
  if(i === mpIndex && mpIsPlaying()){ mpPause(); return; }
  mpIndex = i;
  mpSetSrc(i);
  mpPlay();
  mpPaint();
  mpUpdateMini();
}
function mpPlay(){
  mpInit();
  if(mpIndex < 0){
    if(!mpTracks.length){ mpPaint(); return; }
    mpIndex = 0;
    mpSetSrc(0);
  }
  if(mpAudio){
    var p = null;
    try{ p = mpAudio.play(); }catch(e){ p = null; }
    if(p && typeof p.catch === "function") p.catch(function(){ mpPaint(); });
  }
  mpPaint();
  mpRequestMini();
}
function mpPause(){
  if(mpAudio){ try{ mpAudio.pause(); }catch(e){ /* 忽略 */ } }
  mpPaint();
  mpRequestMini();
}
function mpToggle(){ mpIsPlaying() ? mpPause() : mpPlay(); }
function mpNext(fromEnd){
  mpInit();
  if(!mpTracks.length) return;
  if(mpTracks.length === 1){
    if(mpAudio){ try{ mpAudio.currentTime = 0; }catch(e){ /* 忽略 */ } }
    mpPlay();
    return;
  }
  var i;
  if(mpMode === 2){
    do { i = Math.floor(Math.random() * mpTracks.length); } while(i === mpIndex);
  } else {
    i = (mpIndex + 1) % mpTracks.length;
  }
  void fromEnd;
  mpIndex = i;
  mpSetSrc(i);
  mpPlay();
  mpPaint();
  mpUpdateMini();
}
function mpPrev(){
  mpInit();
  if(!mpTracks.length) return;
  if(mpAudio && (mpAudio.currentTime || 0) > 3){       /* 播过 3 秒：回到开头 */
    try{ mpAudio.currentTime = 0; }catch(e){ /* 忽略 */ }
    mpPaintProgress();
    return;
  }
  var i = mpTracks.length === 1 ? mpIndex : (mpIndex - 1 + mpTracks.length) % mpTracks.length;
  if(i === mpIndex && mpTracks.length === 1){
    if(mpAudio){ try{ mpAudio.currentTime = 0; }catch(e){ /* 忽略 */ } }
    mpPlay();
    return;
  }
  mpIndex = i;
  mpSetSrc(i);
  mpPlay();
  mpPaint();
  mpUpdateMini();
}
function mpOnEnded(){
  if(mpMode === 1 && mpAudio){                          /* 单曲循环 */
    try{ mpAudio.currentTime = 0; }catch(e){ /* 忽略 */ }
    var p = mpAudio.play();
    if(p && typeof p.catch === "function") p.catch(function(){ mpPaint(); });
    mpPaint();
    return;
  }
  if(!mpTracks.length || mpIndex < 0) return;
  mpNext(true);
}
function mpOnError(){
  var front = mpEl("mpLyric");
  if(front) front.textContent = "这首歌加载失败（音频文件可能还没上传成功）";
  var d = mpEl("mpDur"); if(d) d.textContent = "0:00";
  mpPaintIcons();
}
function mpCycleMode(){
  mpInit();
  mpMode = (mpMode + 1) % 3;
  mpStore("mp_mode", mpMode);
  mpPaintIcons();
}
function applyVolume(n){
  n = Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  if(n > 0) mpLastVol = n;
  mpMuted = n === 0;
  if(mpAudio){
    try{ mpAudio.volume = n / 100; mpAudio.muted = n === 0; }catch(e){ /* 忽略 */ }
  }
  var r = mpEl("mpVol");
  if(r && String(r.value) !== String(n)) r.value = String(n);
  mpStore("mp_volume", n);
  mpPaintIcons();
}
function mpSetVolume(v){ mpInit(); applyVolume(v); }
function mpToggleMute(){
  mpInit();
  if(mpMuted || mpVolumeNow() === 0) applyVolume(mpLastVol > 0 ? mpLastVol : 80);
  else applyVolume(0);
}
function mpGoHome(){
  mpCloseSheet();
  if(typeof switchTab === "function") switchTab("home");
  var card = mpEl("mpCard");
  if(card && card.scrollIntoView){
    try{ card.scrollIntoView({ behavior: "smooth", block: "center" }); }catch(e){ card.scrollIntoView(); }
  }
  mpUpdateMini();
}
function mpHideMini(){
  mpMiniClosed = true;
  try{ sessionStorage.setItem("mp_mini_closed", "1"); }catch(e){ /* 忽略 */ }
  mpUpdateMini();
}

/* ---- 进度条：拖动 / 点击 / 键盘 ---- */
function mpBarPct(e){
  var bar = mpEl("mpBar");
  if(!bar || !bar.getBoundingClientRect) return 0;
  var r = bar.getBoundingClientRect();
  var w = r.width || 1;
  return Math.max(0, Math.min(1, ((e.clientX == null ? 0 : e.clientX) - r.left) / w));
}
function mpSeekTo(pct){
  if(!mpAudio || !isFinite(mpAudio.duration) || !mpAudio.duration) return;
  try{ mpAudio.currentTime = pct * mpAudio.duration; }catch(e){ /* 忽略 */ }
  mpPaintProgress();
}
function mpBindBar(){
  var bar = mpEl("mpBar");
  if(!bar || !bar.addEventListener) return;
  if(window.PointerEvent){
    bar.addEventListener("pointerdown", function(e){
      mpDragging = true;
      bar.classList.add("dragging");
      if(bar.setPointerCapture){ try{ bar.setPointerCapture(e.pointerId); }catch(err){ /* 忽略 */ } }
      mpSeekTo(mpBarPct(e));
      if(e.preventDefault) e.preventDefault();
    });
    bar.addEventListener("pointermove", function(e){ if(mpDragging) mpSeekTo(mpBarPct(e)); });
    var stop = function(){ mpDragging = false; bar.classList.remove("dragging"); };
    bar.addEventListener("pointerup", stop);
    bar.addEventListener("pointercancel", stop);
  } else {
    bar.addEventListener("click", function(e){ mpSeekTo(mpBarPct(e)); });
  }
  bar.addEventListener("keydown", function(e){
    if(!mpAudio || !isFinite(mpAudio.duration) || !mpAudio.duration) return;
    if(e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    var step = e.key === "ArrowRight" ? 5 : -5;
    try{ mpAudio.currentTime = Math.max(0, Math.min(mpAudio.duration, (mpAudio.currentTime || 0) + step)); }catch(err){ /* 忽略 */ }
    mpPaintProgress();
  });
}

/* ---- 迷你条：首页播放器滚出屏幕 / 切到别的栏目时才出现 ---- */
function mpRequestMini(){
  if(mpRafPending) return;
  mpRafPending = true;
  var run = function(){ mpRafPending = false; mpUpdateMini(); };
  if(window.requestAnimationFrame) window.requestAnimationFrame(run);
  else setTimeout(run, 50);
}
function mpMiniShouldShow(){
  /* 切到别的栏目，或者播放器卡片滚出屏幕，就弹迷你条 */
  if(typeof currentTab === "function" && currentTab() !== "home") return true;
  var card = mpEl("mpCard");
  if(!card || !card.getBoundingClientRect) return false;
  var r = card.getBoundingClientRect();
  var vh = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 800;
  return r.bottom < 90 || r.top > vh - 40;
}
function mpFabVisible(){
  var fab = document.querySelector(".rtoc-fab");
  if(!fab || !window.getComputedStyle) return false;
  try{ return window.getComputedStyle(fab).display !== "none"; }catch(e){ return false; }
}
function mpUpdateMini(){
  var mini = mpEl("mpMini");
  if(!mini) return;
  mini.classList.toggle("show", mpTracks.length > 0 && !mpMiniClosed && mpMiniShouldShow());
  mini.classList.toggle("up", mpFabVisible());
  var t = mpTracks[mpIndex] || null;
  var txt = mpEl("mpMiniText");
  if(txt) txt.textContent = t ? (t.title + " · " + t.artist) : "未在播放";
  var eq = mpEl("mpEq"); if(eq) eq.classList.toggle("playing", mpIsPlaying());
  var card = mpEl("mpCard"); if(card) card.classList.toggle("playing", mpIsPlaying());
  var disc = mpEl("mpDisc"); if(disc) disc.classList.toggle("playing", mpIsPlaying());
  mpPaintIcons();
}
function mpBindGlobal(){
  if(mpBound) return;
  mpBound = true;
  var onMove = function(){ mpRequestMini(); };
  window.addEventListener("scroll", onMove, { passive: true });
  window.addEventListener("resize", onMove);
  document.addEventListener("click", onMove);
  window.addEventListener("hashchange", onMove);
  window.addEventListener("popstate", onMove);
  document.addEventListener("keydown", function(e){
    if(e.key !== "Escape" || !mpSheetOn) return;
    if(mpQuery){ mpClearSearch(); return; }        /* 先清搜索词，再关界面 */
    mpCloseSheet();
  });
}
