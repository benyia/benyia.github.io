/* ---------- Markdown（通知正文：文字 + 图片混排） ---------- */
function mdInline(s){
  s = String(s == null ? "" : s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function(m, alt, url){
    return '<img src="' + esc(url) + '" alt="' + esc(alt) + '" loading="lazy">';
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function(m, txt, url){
    var ex = /^https?:\/\//i.test(url);
    return '<a href="' + esc(url) + '"' + (ex ? ' target="_blank" rel="noopener"' : "") + '>' + txt + '</a>';
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return s;
}
function mdSplitRow(line){
  var t = String(line).trim();
  if(t.charAt(0) === "|") t = t.slice(1);
  if(t.charAt(t.length - 1) === "|") t = t.slice(0, -1);
  return t.split("|").map(function(c){ return c.trim(); });
}
var _codeSeq = 0;
function highlightCode(code){
  var KW = ['def','class','import','from','return','if','else','elif','for','while','in','not','and','or','is','None','True','False','try','except','with','as','lambda','print','self','module','endmodule','always','assign','reg','wire','input','output','begin','end','initial','posedge','negedge','case','endcase','int','float','void','const','struct','typedef','include','define'];
  return esc(code).split(String.fromCharCode(10)).map(function(line){
    var cut = -1;
    for(var i = 0; i < line.length; i++){
      var c = line.charAt(i);
      if(c === '#'){ cut = i; break; }
      if(c === '/' && line.charAt(i + 1) === '/'){ cut = i; break; }
    }
    var body = cut >= 0 ? line.slice(0, cut) : line;
    var cmt = cut >= 0 ? line.slice(cut) : "";
    body = body.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, function(m){
      return KW.indexOf(m) >= 0 ? '<span class="kw">' + m + '</span>' : m;
    });
    body = body.replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
    body = body.replace(/&#39;.*?&#39;/g, function(m){ return '<span class="str">' + m + '</span>'; });
    body = body.replace(/&quot;.*?&quot;/g, function(m){ return '<span class="str">' + m + '</span>'; });
    return body + (cmt ? '<span class="cmt">' + cmt + '</span>' : "");
  }).join(String.fromCharCode(10));
}
function codeBlockHTML(item){
  _codeSeq++;
  var id = 'code' + _codeSeq;
  var lang = (item && item.lang) ? item.lang : 'code';
  var code = (item && item.code) ? item.code : '';
  return '<div class="code-wrap"><div class="code-head"><span>' + esc(lang) + '</span>'
    + '<button class="code-copy" data-target="' + id + '" onclick="copyCode(this)">复制</button></div>'
    + '<pre id="' + id + '"><code>' + highlightCode(code) + '</code></pre></div>';
}
function copyCode(btn){
  var el = document.getElementById(btn.getAttribute('data-target'));
  if(!el) return;
  var text = el.innerText || el.textContent || "";
  var done = function(){ btn.textContent = '已复制 ✓'; setTimeout(function(){ btn.textContent = '复制'; }, 1600); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(function(){ fallbackCopy(text, done); });
  } else fallbackCopy(text, done);
}
/* 正文里直接躺着的 <pre>（后台富文本存成 HTML 的情况）也补上「语言 + 复制」头，
   这样不管正文是 Markdown 围栏还是 HTML，代码块长得都一样、都能一键复制 */
function enhanceCodeBlocks(root){
  if(!root || !root.querySelectorAll) return;
  var pres;
  try{ pres = root.querySelectorAll("pre"); }catch(e){ return; }
  for(var i = 0; i < pres.length; i++){
    var pre = pres[i];
    if(!pre) continue;
    /* 只在真的 <pre> 上动手：DOM 桩里 querySelectorAll 可能返回一堆无关元素 */
    if(String(pre.tagName || pre._tag || "").toLowerCase() !== "pre") continue;
    var parent = pre.parentNode;
    if(!parent || typeof parent.replaceChild !== "function") continue;
    if(parent.className && String(parent.className).indexOf("code-wrap") >= 0) continue;
    var code = pre.querySelector ? pre.querySelector("code") : null;
    var cls = String((code && code.className) || pre.className || "");
    var m = cls.match(/language-([\w+#.-]+)/i) || cls.match(/lang-([\w+#.-]+)/i);
    _codeSeq++;
    pre.id = "code" + _codeSeq;
    var wrap = document.createElement("div");
    wrap.className = "code-wrap";
    var head = document.createElement("div");
    head.className = "code-head";
    head.innerHTML = "<span>" + esc(m ? m[1] : "code") + "</span>";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.setAttribute("data-target", pre.id);
    btn.textContent = "复制";
    btn.onclick = function(){ copyCode(this); };
    head.appendChild(btn);
    parent.replaceChild(wrap, pre);
    wrap.appendChild(head);
    wrap.appendChild(pre);
  }
}
function fallbackCopy(text, done){
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch(e){}
  ta.remove();
}
function jumpTo(e, id){
  e.preventDefault();
  var el = document.getElementById(id);
  if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function applyTheme(t){
  var dark = (t === 'dark');
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  var b = document.getElementById('themeBtn');
  if(b) b.textContent = dark ? '☀️' : '🌙';
}
function toggleTheme(){
  var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  var next = (cur === 'dark') ? 'light' : 'dark';
  try { localStorage.setItem('benyia_theme', next); } catch(e){}
  applyTheme(next);
}
(function(){
  var t = 'light';
  try { t = localStorage.getItem('benyia_theme') || 'light'; } catch(e){}
  if(t !== 'dark') t = 'light';
  applyTheme(t);
})();

var _mdDepth = 0;
/* 混排渲染开关：为 true 时 mdRender 会保留 HTML 标签
   （用于「HTML + Markdown 混排」的正文，比如直接粘 GitHub README） */
var _mdPreserveHTML = false;
function mdRenderPreserve(src){
  var prev = _mdPreserveHTML;
  _mdPreserveHTML = true;
  try{ return mdRender(src); } finally { _mdPreserveHTML = prev; }
}
/* 正文里是否夹着块级 Markdown（标题 / 代码块 / 表格分隔行）——决定要不要走混排渲染 */
function looksMdBlock(s){
  s = String(s || "");
  return /^\s{0,3}#{1,6}\s+\S/m.test(s)
      || /```/.test(s)
      || /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/m.test(s);
}
function mdRender(src){
  _mdDepth++;
  var heads = [];
  var text = String(src == null ? "" : src).replace(/\r\n?/g, "\n");
  if(!text.trim()) return "";
  var codes = [];
  text = text.replace(/```([^\n]*)\n([\s\S]*?)```/g, function(m, lang, c){ codes.push({ lang: String(lang||"").trim(), code: c }); return "\u0000C" + (codes.length - 1) + "\u0000"; });
  text = text.replace(/```([\s\S]*?)```/g, function(m, c){ codes.push({ lang: "", code: c }); return "\u0000C" + (codes.length - 1) + "\u0000"; });
  var inlineCodes = [];
  /* 混排模式（粘 GitHub README 这种 HTML + Markdown 的内容）：
     先把 HTML 标签占位，免得被下面的 esc() 转义成看得见的 <div> 文字；
     正文输出前再还原回去。代码块里的 HTML 不受影响（上面已先抽走）。 */
  var keepHTML = _mdPreserveHTML ? [] : null;
  if(keepHTML){
    text = text.replace(/<\/?[a-zA-Z][^>]*>/g, function(m){ keepHTML.push(m); return "\u0000H" + (keepHTML.length - 1) + "\u0000"; });
  }
  text = esc(text);
  text = text.replace(/`([^`\n]+)`/g, function(m, c){ inlineCodes.push(c); return "\u0000I" + (inlineCodes.length - 1) + "\u0000"; });
  var lines = text.split("\n");
  var out = [];
  var para = [];
  function flushPara(){
    if(!para.length) return;
    var joined = para.join("\n");
    inlineCodes.forEach(function(c, i){ joined = joined.split("\u0000I" + i + "\u0000").join("<code>" + c + "</code>"); });
    out.push("<p>" + mdInline(joined).replace(/\n/g, "<br>") + "</p>");
    para = [];
  }
  function isTableStart(i){
    if(!/\|/.test(lines[i]) || i + 1 >= lines.length) return false;
    return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1]);
  }
  for(var i = 0; i < lines.length; i++){
    var line = lines[i];
    if(/^\s*$/.test(line)){ flushPara(); continue; }
    var ph = line.match(/^\u0000C(\d+)\u0000\s*$/);
    if(ph){ flushPara(); out.push(codeBlockHTML(codes[parseInt(ph[1], 10)])); continue; }
    /* 混排模式：整行就是一个块级 HTML 标签时，原样放出来（div/details/table…），
       这样夹在中间的文字仍然是正常段落，标签也不会被 <p> 包住 */
    var hph = line.match(/^\s*\u0000H(\d+)\u0000\s*$/);
    if(hph){
      var rawTag = keepHTML ? keepHTML[parseInt(hph[1], 10)] : "";
      if(rawTag && /^<\/?(div|p|table|thead|tbody|tr|td|th|ul|ol|li|blockquote|pre|figure|figcaption|details|summary|section|h[1-6]|hr)\b/i.test(rawTag)){
        flushPara(); out.push(rawTag); continue;
      }
    }
    var h = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if(h){ flushPara(); var _lv = h[1].length; var _ht = mdInline(h[2].replace(/\s+#+\s*$/, "")); var _id = "sec" + (heads.length + 1); heads.push({ lvl: _lv, txt: _ht, id: _id }); out.push("<h" + _lv + " id=\"" + _id + "\">" + _ht + "</h" + _lv + ">"); continue; }
    if(/^\s{0,3}([-*_])\s*(\1\s*){2,}$/.test(line)){ flushPara(); out.push("<hr>"); continue; }
    if(/^\s*&gt;\s?/.test(line)){
      flushPara();
      var quote = [];
      while(i < lines.length && /^\s*&gt;\s?/.test(lines[i])){ quote.push(lines[i].replace(/^\s*&gt;\s?/, "")); i++; }
      i--;
      out.push("<blockquote>" + mdRender(quote.join("\n")) + "</blockquote>");
      continue;
    }
    if(isTableStart(i)){
      flushPara();
      var head = mdSplitRow(line);
      i += 2;
      var rows = [];
      while(i < lines.length && /\|/.test(lines[i]) && !/^\s*$/.test(lines[i])){ rows.push(mdSplitRow(lines[i])); i++; }
      i--;
      var tb = "<table><thead><tr>" + head.map(function(c){ return "<th>" + mdInline(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
      rows.forEach(function(r){
        tb += "<tr>";
        for(var k = 0; k < head.length; k++) tb += "<td>" + mdInline(r[k] === undefined ? "" : r[k]) + "</td>";
        tb += "</tr>";
      });
      out.push(tb + "</tbody></table>");
      continue;
    }
    var li = line.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
    if(li){
      flushPara();
      var ordered = /\d/.test(li[1].charAt(0));
      var items = [];
      while(i < lines.length){
        var m = lines[i].match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
        if(!m) break;
        items.push("<li>" + mdInline(m[2]) + "</li>");
        i++;
      }
      i--;
      out.push((ordered ? "<ol>" : "<ul>") + items.join("") + (ordered ? "</ol>" : "</ul>"));
      continue;
    }
    para.push(line);
  }
  flushPara();
  _mdDepth--;
  var htmlOut = out.join("");
  /* 混排模式：把占位的 HTML 标签原样还原 */
  if(keepHTML){ htmlOut = htmlOut.replace(/\u0000H(\d+)\u0000/g, function(m, i){ return keepHTML[parseInt(i, 10)] || ""; }); }
  /* 正文里不再插文内目录卡片：目录统一由 buildToc() 放到文章右边的侧栏里 */
  return htmlOut;
}
/* 去掉 Markdown 记号，用于列表摘要与搜索 */
function stripMd(s){
  return String(s == null ? "" : s)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*([-*+]|\d+[.)])\s+/gm, "")
    .replace(/\*\*|__|~~/g, "")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, " ")
    /* 表格：去掉分隔行，单元格竖线换成空格（摘要 / 搜索词里不再是一堆 |） */
    .replace(/^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/gm, " ")
    .replace(/\s*\|\s*/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/* ============================================================
   正文格式：兼容「富文本 HTML」与「旧 Markdown」
   后台的新编辑器存 HTML，老数据还是 Markdown，两种都要能正常显示
   ============================================================ */
function looksHTML(s){
  return /<\/?(p|div|h[1-6]|br|ul|ol|li|strong|b|em|i|u|s|a|img|table|thead|tbody|tr|td|th|blockquote|pre|code|span|font|figure|figcaption|hr|sub|sup)\b[^>]*>/i.test(String(s || ""));
}
/* 把正文统一渲染成 HTML（HTML 原样输出，Markdown 走 mdRender） */
function mdRenderHTML(src){
  var s = String(src == null ? "" : src);
  if(!s.trim()) return "";
  if(looksHTML(s)){
    /* 粘 GitHub README 这类「HTML + Markdown 混排」的正文：
       HTML 标签保留原样，同时把里面的 Markdown 也渲染出来（以前会原样输出，于是 #、** 变成字面字符） */
    return looksMdBlock(s) ? mdRenderPreserve(s) : s;
  }
  return mdRender(s);
}
/* 列表摘要 / 搜索用：去掉所有记号 */
function mdText(s){
  var t = String(s == null ? "" : s);
  if(looksHTML(t)){
    var stripped = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    /* HTML 正文里常常还夹着 Markdown（比如粘贴 GitHub README）：
       剥完标签还要再清一遍记号，否则列表摘要里会露出 #、** 和图片地址 */
    return stripMd(stripped);
  }
  return stripMd(t);
}

/* ============================================================
   文章目录：桌面端是右侧栏里跟着文章走的卡片；手机上点底部按钮弹出
   ============================================================ */
function slugifyToc(text, i){
  var s = String(text || "").replace(/<[^>]+>/g, "").trim().toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "");
  return "sec-" + (s || "h") + "-" + (i + 1);
}
/* 把容器里的 h1~h4 收成目录（HTML 正文没有 id 时补一个，锚点才能跳）
   可以传一个容器，也可以传一组容器（比如论文的「摘要 + 备注」） */
function buildToc(container){
  var boxes = Array.isArray(container) ? container : [container];
  var heads = [];
  boxes.forEach(function(box){
    if(!box) return;
    var hs = box.querySelectorAll("h1,h2,h3,h4");
    Array.prototype.forEach.call(hs, function(h, i){
      if(!h.id) h.id = slugifyToc(h.textContent, i);
      heads.push({ id: h.id, txt: h.textContent || "", lvl: Math.min(4, parseInt(h.tagName.slice(1), 10) || 2) });
    });
  });
  renderToc(heads);
}
/* 目录链接 HTML：右侧栏卡片和窄屏抽屉共用同一份内容 */
function tocLinksHTML(heads){
  return heads.map(function(h){
    return '<a href="#' + esc(h.id) + '" data-toc="' + esc(h.id) + '" class="toc-lv' + h.lvl + '" onclick="jumpTo(event,&quot;' + esc(h.id) + '&quot;)">' + esc(h.txt) + '</a>';
  }).join("");
}
/* 目录有两处出口：
   ① 桌面端右侧栏的「文章目录」卡片（跟着文章走，主要入口）
   ② 窄屏时右栏被挤到正文下面，用底部悬浮按钮弹出抽屉兜底 */
function renderToc(heads){
  var card = document.getElementById("tocCard");
  var cardList = document.getElementById("tocCardList");
  var drawer = document.getElementById("rtocPanel");
  var drawerList = document.getElementById("rtocList");
  var fab = document.getElementById("rtocFab");
  var mask = document.getElementById("rtocMask");

  closeToc();

  var has = heads && heads.length >= 2;
  /* 有目录时给 body 打个标记：右侧栏那一块才会粘住跟着文章走 */
  document.body.classList.toggle("toc-on", !!has);
  /* 右侧栏目录卡片 */
  if(card && cardList){
    if(has){
      cardList.innerHTML = tocLinksHTML(heads);
      card.style.display = "";
    }else{
      cardList.innerHTML = "";
      card.style.display = "none";
    }
  }
  /* 抽屉内容 */
  if(drawerList) drawerList.innerHTML = has ? tocLinksHTML(heads) : "";
  /* 悬浮按钮只在窄屏出现，且要有目录内容 */
  if(fab) fab.classList.toggle("show", !!(has && window.innerWidth <= 760));
  if(drawer && !has) drawer.classList.remove("show");
  if(mask) mask.classList.remove("show");
}
/* 760px 以下才需要抽屉兜底，和 CSS 里的 @media(max-width:760px) 对齐 */
function tocDocked(){ return window.innerWidth > 760; }
function openToc(){
  var drawer = document.getElementById("rtocPanel");
  var mask = document.getElementById("rtocMask");
  if(drawer) drawer.classList.add("show");
  if(tocDocked()){
    if(mask) mask.classList.remove("show");
  }else{
    if(mask) mask.classList.add("show");
  }
  updateTocActive();
}
function closeToc(){
  var drawer = document.getElementById("rtocPanel");
  var mask = document.getElementById("rtocMask");
  if(drawer) drawer.classList.remove("show");
  if(mask) mask.classList.remove("show");
  document.body.classList.remove("toc-open");
}
/* 滚动时高亮当前章节：卡片和抽屉同步高亮 */
function updateTocActive(){
  var links = document.querySelectorAll("#tocCardList a[data-toc], #rtocList a[data-toc]");
  if(!links.length) return;
  var cur = "";
  Array.prototype.forEach.call(links, function(a){
    var el = document.getElementById(a.getAttribute("data-toc"));
    if(el && el.getBoundingClientRect().top <= 130) cur = a.getAttribute("data-toc");
  });
  if(!cur) cur = links[0].getAttribute("data-toc");
  if(cur === tocActiveId) return;
  tocActiveId = cur;
  var curLink = null;
  Array.prototype.forEach.call(links, function(a){
    var on = a.getAttribute("data-toc") === cur;
    a.classList.toggle("on", on);
    if(on) curLink = a;
  });
  /* 目录比容器高时，让高亮那一项自己滚进可视范围，不然高亮会跑到看不见的地方 */
  if(curLink){
    var box = curLink.parentNode;
    if(box && box.scrollHeight > box.clientHeight + 4 && curLink.scrollIntoView){
      try { curLink.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch(e){}
    }
  }
}
window.addEventListener("scroll", function(){ window.requestAnimationFrame(updateTocActive); }, { passive: true });
window.addEventListener("resize", function(){
  /* 宽度变化会切换入口（卡片 / 悬浮抽屉），按当前是否有目录重算一次 */
  var has = document.querySelectorAll("#tocCardList a[data-toc]").length >= 2;
  var fab = document.getElementById("rtocFab");
  if(fab) fab.classList.toggle("show", !!(has && window.innerWidth <= 760));
  if(tocDocked()) closeToc();
});
