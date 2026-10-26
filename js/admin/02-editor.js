/* ============================================================
   可视化富文本编辑器（所见即所得）
   通知 / 日记 / 班级事务 共用；正文按 HTML 存，老数据仍是 Markdown，两种都能编辑
   ============================================================ */
/* 文件路径里的空格 / 括号在 Markdown 里会截断链接，这里做最小转义 */
function mdUrl(u){ return String(u||"").replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29"); }

var RICH_KEYS = {
  course: { editor: "cIntro", bar: "rteBar_course", mode: "rteMode_course" },
  paper:  { editor: "pAbstract", bar: "rteBar_paper", mode: "rteMode_paper" },
  notice: { editor: "nContent", bar: "rteBar_notice", mode: "rteMode_notice" },
  diary:  { editor: "diaryContent", bar: "rteBar_diary", mode: "rteMode_diary" },
  advisor:{ editor: "advContent", bar: "rteBar_advisor", mode: "rteMode_advisor" },
  "class":{ editor: "clContent", bar: "rteBar_class", mode: "rteMode_class" }
};
/* 逗号/顿号分隔的标签输入 → 数组（去重、去空） */
function parseTagsInput(v){
  var out = [];
  String(v == null ? "" : v).split(/[,，、;；]+/).forEach(function(t){
    t = t.trim();
    if(t && out.indexOf(t) < 0) out.push(t);
  });
  return out;
}

/* ============================================================
   拖拽上传：把文件拖到任意「上传框」即可，不用先点按钮
   ============================================================ */
var UPLOAD_BOXES = [
  { box: "cUploadBox",   input: "cFileInput",   handler: "onCourseFiles",  label: "课程文件" },
  { box: "pUploadBox",   input: "pFileInput",   handler: "onPaperFiles",   label: "论文文件" },
  { box: "nfUploadBox",  input: "nfFileInput",  handler: "onNoticeFiles",  label: "通知附件" },
  { box: "clUploadBox",  input: "clFileInput",  handler: "onClassFiles",   label: "班级附件" },
  { box: "dmediaUploadBox", input: "dmediaFileInput", handler: "onDmediaFiles", label: "日记影音" },
  { box: "advUploadBox", input: "advFileInput", handler: "onAdvisorFiles", label: "指导附件" }
];
function initDropZones(){
  UPLOAD_BOXES.forEach(function(cfg){
    var box = $(cfg.box);
    if(!box || box.getAttribute("data-drop")) return;
    box.setAttribute("data-drop", "1");
    ["dragenter", "dragover"].forEach(function(ev){
      box.addEventListener(ev, function(e){
        e.preventDefault(); e.stopPropagation();
        box.classList.add("dragover");
      });
    });
    ["dragleave", "dragend"].forEach(function(ev){
      box.addEventListener(ev, function(e){
        e.preventDefault();
        box.classList.remove("dragover");
      });
    });
    box.addEventListener("drop", function(e){
      e.preventDefault(); e.stopPropagation();
      box.classList.remove("dragover");
      var files = e.dataTransfer && e.dataTransfer.files;
      handleDroppedFiles(cfg, files);
    });
  });
}
/* 拖入文件后的处理：优先塞进对应的 input 再走既有上传流程 */
function handleDroppedFiles(cfg, files){
  if(!files || !files.length){ showToast("没有拿到文件", "error"); return false; }
  var input = $(cfg.input);
  if(!input){ showToast("页面元素缺失：" + cfg.input, "error"); return false; }
  try {
    var dt = new DataTransfer();
    Array.prototype.forEach.call(files, function(f){ dt.items.add(f); });
    input.files = dt.files;
  } catch(err){
    /* 老浏览器不支持给 input.files 赋值：直接调用处理函数 */
    var fake = { target: { files: files, value: "" } };
    if(typeof window[cfg.handler] === "function") window[cfg.handler](fake);
    else { showToast("这个浏览器不支持拖拽赋值，请点按钮选择文件", "error"); return false; }
    showToast("正在上传 " + files.length + " 个文件（" + cfg.label + "）");
    return true;
  }
  if(typeof window[cfg.handler] === "function") window[cfg.handler]({ target: input });
  showToast("正在上传 " + files.length + " 个文件（" + cfg.label + "）");
  return true;
}
function uploadBoxCfgByBoxId(boxId){
  for(var i = 0; i < UPLOAD_BOXES.length; i++){ if(UPLOAD_BOXES[i].box === boxId) return UPLOAD_BOXES[i]; }
  return null;
}
/* 页面上任何地方拖入文件都不让浏览器直接打开它 */
["dragover", "drop"].forEach(function(ev){
  document.addEventListener(ev, function(e){
    if(!e.target.closest || !e.target.closest(".upload-box")) e.preventDefault();
  });
});

/* ============================================================
   统一输入弹窗：替代浏览器自带 prompt（就是截图里「输入图片地址」那种框）
   ============================================================ */
var dlgState = { onOk: null, onFile: null, before: "", uploadLabel: "选择文件上传", uploading: false, expectUrl: false };

function dlgErr(text){
  var err = $("dlgErr");
  if(err) err.textContent = text || "";
}
function dlgShow(){
  var box = $("inputDialog");
  if(!box) return;
  box.classList.add("show");
  dlgErr("");
  var inp = $("dlgInput");
  if(inp){
    inp.value = dlgState.before || "";
    setTimeout(function(){ try { inp.focus(); inp.select(); } catch(e){} }, 30);
  }
}
function closeInputDialog(){
  var box = $("inputDialog");
  if(box) box.classList.remove("show");
  var f = $("dlgFile");
  if(f) f.value = "";
  dlgState = { onOk: null, onFile: null, before: "", uploadLabel: "选择文件上传", uploading: false, expectUrl: false };
}
function dlgPickFile(){
  if(dlgState.uploading) return;
  var f = $("dlgFile");
  if(f) f.click();
}
/* 选好文件：交给 onFile 上传，成功后把地址填回输入框 */
async function onDlgFilePicked(e){
  var files = Array.prototype.slice.call((e.target && e.target.files) || []);
  if(e.target) e.target.value = "";
  if(!files.length || !dlgState.onFile) return;
  dlgState.uploading = true;
  var btn = $("dlgUpload");
  var old = btn ? btn.textContent : "";
  if(btn){ btn.disabled = true; btn.textContent = "上传中…"; }
  try{
    var urls = await dlgState.onFile(files);
    var list = Array.isArray(urls) ? urls.filter(Boolean) : (urls ? [urls] : []);
    if(list.length){
      var inp = $("dlgInput");
      if(inp) inp.value = list.join("\n");
      dlgErr("✅ 已上传 " + list.length + " 个，点「" + ($("dlgOk") ? $("dlgOk").textContent : "确定") + "」插入");
    }
  }catch(err){
    dlgErr("上传失败：" + err.message);
  }
  dlgState.uploading = false;
  if(btn){ btn.disabled = false; btn.textContent = old || "选择文件上传"; }
}
function openInputDialog(opt){
  opt = opt || {};
  dlgState.onOk = opt.onOk || null;
  dlgState.onFile = opt.onFile || null;
  dlgState.before = opt.value || "";
  dlgState.uploadLabel = opt.uploadLabel || "选择文件上传";
  $("dlgTitle").textContent = opt.title || "输入";
  $("dlgHint").textContent = opt.hint || "";
  $("dlgInput").value = opt.value || "";
  $("dlgInput").placeholder = opt.placeholder || "";
  $("dlgInput2").placeholder = opt.placeholder2 || "";
  $("dlgRow2").style.display = opt.secondInput ? "" : "none";
  $("dlgInput2").value = "";
  $("dlgOk").textContent = opt.okText || "确定";
  var up = $("dlgUpload");
  up.style.display = opt.onFile ? "" : "none";
  up.textContent = dlgState.uploadLabel;
  dlgShow();
}
function submitInputDialog(){
  if(dlgState.uploading) return;
  if(!dlgState.onOk) return closeInputDialog();
  var res = dlgState.onOk($("dlgInput").value.trim(), $("dlgInput2").value.trim());
  if(res === false) return;   /* 校验没过就不关弹窗 */
  closeInputDialog();
}

/* 插入图片：网址 + 可选「选择文件上传」（和截图一致） */
function insertImageViaDialog(key, after){
  if(key) lastRteKey = key;
  openInputDialog({
    title: "插入图片",
    hint: "图片地址（也可以直接粘贴图床链接）\n先点「选择文件上传」也行，上传完地址会自动填进来",
    placeholder: "https://",
    okText: "插入",
    onFile: async function(files){
      var out = [];
      for(var i = 0; i < files.length; i++){
        var meta = await uploadFile(files[i], "img");
        out.push(meta.url);
      }
      return out;
    },
    onOk: function(url){
      var list = String(url || "").split("\n").map(function(s){ return s.trim(); }).filter(Boolean);
      if(!list.length){ dlgErr("请输入图片地址，或先上传一张"); return false; }
      for(var i = 0; i < list.length; i++){
        if(!/^(https?:\/\/|files\/|\/)/i.test(list[i])){ dlgErr("地址要以 https:// 开头（或站内 files/ 路径）：" + list[i]); return false; }
      }
      rteInsertHTML(list.map(function(u){ return '<img src="' + esc(u) + '" alt="">'; }).join(""), key);
      if(after) after();
      showToast("已插入 " + list.length + " 张图片，记得点保存");
      return true;
    }
  });
}

/* 百度网盘等外链：和截图一致的「粘贴网盘分享链接」弹窗 */
function addExternalFileViaDialog(kind){
  openInputDialog({
    title: "添加网盘外链",
    hint: "粘贴网盘分享链接（百度网盘/阿里云盘等）\n有提取码建议直接写在链接里，方便自己识别",
    placeholder: "https://pan.baidu.com/s/...",
    secondInput: true,
    placeholder2: "显示名称（留空就用链接末段）",
    okText: "确定",
    onOk: function(url, name){
      var lines = String(url || "").split("\n").map(function(s){ return s.trim(); }).filter(Boolean);
      if(!lines.length){ dlgErr("链接不能为空"); return false; }
      for(var i = 0; i < lines.length; i++){
        if(!/^https?:\/\//i.test(lines[i])){ dlgErr("链接需要以 http:// 或 https:// 开头"); return false; }
      }
      drafts[kind] = drafts[kind] || [];
      lines.forEach(function(u, i){
        var nm = (lines.length === 1 && name) ? name : "";
        if(!nm){
          var seg = String(u).split("?")[0].split("/").filter(Boolean);
          try { nm = decodeURIComponent(seg[seg.length - 1] || u); } catch(e){ nm = seg[seg.length - 1] || u; }
          nm = String(nm).slice(0, 40) || u;
        }
        var extMatch = String(nm).match(/\.([a-zA-Z0-9]{1,5})$/);
        drafts[kind].push({ name: nm, url: u, type: extMatch ? extMatch[1].toUpperCase() : "链接", size: 0, folder: "", external: true });
      });
      renderDraftFiles(kind);
      showToast("已添加 " + lines.length + " 个外链，别忘了点保存");
      return true;
    }
  });
}
var editorState = {};
(function initEditorState(){
  Object.keys(RICH_KEYS).forEach(function(k){ editorState[k] = { mode: "rich", savedSel: null }; });
})();

function looksRichHTML(s){
  return /<\/?(p|div|h[1-6]|br|ul|ol|li|strong|b|em|i|u|s|a|img|table|blockquote|pre|code|span|font|figure|hr|sub|sup)\b[^>]*>/i.test(String(s || ""));
}

/* ---- Markdown → HTML：只在打开富文本时用，仅支持常用语法（够日常排版） ---- */
function mdEscape(s){ return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function inlineMdToHtml(s){
  var out = mdEscape(s);
  out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, function(m, alt, url){ return '<img src="' + mdUrl(url) + '" alt="' + alt + '">'; });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, function(m, txt, url){ return '<a href="' + mdUrl(url) + '" target="_blank" rel="noopener">' + txt + "</a>"; });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  return out;
}
/* Markdown 表格的行拆分 */
function mdSplitRow(s){
  return String(s == null ? "" : s).trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function(c){ return c.trim(); });
}
/* 表格的分隔行：| --- | :--: | 这种 */
function isMdTableSep(s){
  s = String(s == null ? "" : s);
  return s.indexOf("|") >= 0 && /^[\s|:-]*-[\s|:-]*$/.test(s);
}
function mdToHtmlLite(src){
  var lines = String(src == null ? "" : src).replace(/\r\n?/g, "\n").split("\n");
  var out = [], i = 0;
  while(i < lines.length){
    var line = lines[i];
    if(!line.trim()){ i++; continue; }
    if(/^\s*```/.test(line)){
      i++;
      var code = [];
      while(i < lines.length && !/^\s*```/.test(lines[i])){ code.push(lines[i]); i++; }
      i++;
      out.push("<pre><code>" + mdEscape(code.join("\n")) + "</code></pre>");
      continue;
    }
    /* Markdown 表格（前台 mdRender 也支持，这里对齐） */
    if(/^\s*\|/.test(line) && i + 1 < lines.length && isMdTableSep(lines[i + 1])){
      var head = mdSplitRow(line);
      i += 2;
      var body = [];
      while(i < lines.length && /^\s*\|/.test(lines[i])){ body.push(mdSplitRow(lines[i])); i++; }
      out.push("<table><thead><tr>"
        + head.map(function(c){ return "<th>" + inlineMdToHtml(c) + "</th>"; }).join("")
        + "</tr></thead><tbody>"
        + body.map(function(r){ return "<tr>" + r.map(function(c){ return "<td>" + inlineMdToHtml(c) + "</td>"; }).join("") + "</tr>"; }).join("")
        + "</tbody></table>");
      continue;
    }
    var h = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if(h){
      var lv = Math.min(3, h[1].length);
      out.push("<h" + lv + ">" + inlineMdToHtml(h[2].replace(/\s+#+\s*$/, "")) + "</h" + lv + ">");
      i++; continue;
    }
    if(/^\s*>\s?/.test(line)){
      var q = [];
      while(i < lines.length && /^\s*>\s?/.test(lines[i])){ q.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      out.push("<blockquote>" + inlineMdToHtml(q.join(" ")) + "</blockquote>");
      continue;
    }
    if(/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)){ out.push("<hr>"); i++; continue; }
    if(/^\s*([-*+]|\d+[.)])\s+/.test(line)){
      var ordered = /^\s*\d/.test(line), items = [];
      while(i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])){
        items.push("<li>" + inlineMdToHtml(lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, "")) + "</li>");
        i++;
      }
      out.push((ordered ? "<ol>" : "<ul>") + items.join("") + (ordered ? "</ol>" : "</ul>"));
      continue;
    }
    var para = [];
    while(i < lines.length && lines[i].trim() && !/^\s*(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|\|)/.test(lines[i])){ para.push(lines[i]); i++; }
    /* 每行单独转义再拼真 <br>：以前是先 join("<br>") 再转义，<br> 会变成字面量 &lt;br&gt; */
    out.push("<p>" + para.map(inlineMdToHtml).join("<br>") + "</p>");
  }
  return out.join("") || "<p></p>";
}
/* 纯文本（老数据没有 Markdown 标记）转成段落 */
function plainToHtml(s){
  return String(s == null ? "" : s).split(/\n{2,}/).map(function(p){
    return "<p>" + mdEscape(p).replace(/\n/g, "<br>") + "</p>";
  }).join("") || "<p></p>";
}

/* ---- 工具条 ---- */
var RTE_FONTS = [["", "字体"], ["arial", "Arial"], ["georgia", "Georgia"], ["impact", "Impact"], ["tahoma", "Tahoma"], ["宋体", "宋体"], ["微软雅黑", "微软雅黑"], ["楷体", "楷体"], ["黑体", "黑体"]];
function rteOpts(list, val){
  return list.map(function(x){
    if(x.length === 2 && typeof x[1]["indexOf"] === "function"){
      return '<option value="' + esc(x[0]) + '"' + (x[0] === val ? " selected" : "") + ">" + esc(x[1]) + "</option>";
    }
    return "";
  }).join("");
}
function rteToolbarHTML(){
  var h = "";
  h += '<button type="button" title="撤销" onmousedown="return rteCmd(event,\'undo\')">↺</button>';
  h += '<button type="button" title="重做" onmousedown="return rteCmd(event,\'redo\')">↻</button>';
  h += '<span class="rte-sep"></span>';
  h += '<select title="段落样式" onchange="rteCmd(this.value);this.selectedIndex=0">'
     + rteOpts([["", "段落"], ["h1", "标题 1"], ["h2", "标题 2"], ["h3", "标题 3"], ["h4", "标题 4"], ["p", "正文"]])
     + "</select>";
  h += '<select title="字体" onchange="rteFont(this.value)">' + rteOpts(RTE_FONTS) + "</select>";
  h += '<select title="字号" onchange="rteFontSize(this.value)">'
     + rteOpts([["", "16px"], ["12pt", "12px"], ["14pt", "14px"], ["16pt", "16px"], ["18pt", "18px"], ["24pt", "24px"], ["32pt", "32px"]])
     + "</select>";
  h += '<span class="rte-sep"></span>';
  h += '<button type="button" title="加粗" onmousedown="return rteCmd(event,\'bold\')"><b>B</b></button>';
  h += '<button type="button" title="斜体" onmousedown="return rteCmd(event,\'italic\')"><i>I</i></button>';
  h += '<button type="button" title="下划线" onmousedown="return rteCmd(event,\'underline\')"><u>U</u></button>';
  h += '<button type="button" title="文字颜色" onmousedown="return rtePickColor(event,\'foreColor\')"><span style="border-bottom:3px solid #10b981">A</span></button>';
  h += '<button type="button" title="背景颜色" onmousedown="return rtePickColor(event,\'hiliteColor\')">🖍️</button>';
  h += '<button type="button" title="清除格式" onmousedown="return rteCmd(event,\'removeFormat\')">T<sub>x</sub></button>';
  h += '<span class="rte-sep"></span>';
  h += '<button type="button" title="左对齐" onmousedown="return rteCmd(event,\'justifyLeft\')">≡</button>';
  h += '<button type="button" title="居中" onmousedown="return rteCmd(event,\'justifyCenter\')">≣</button>';
  h += '<button type="button" title="右对齐" onmousedown="return rteCmd(event,\'justifyRight\')">⋮≡</button>';
  h += '<button type="button" title="两端对齐" onmousedown="return rteCmd(event,\'justifyFull\')">☰</button>';
  h += '<span class="rte-sep"></span>';
  h += '<button type="button" title="无序列表" onmousedown="return rteCmd(event,\'insertUnorderedList\')">•≡</button>';
  h += '<button type="button" title="有序列表" onmousedown="return rteCmd(event,\'insertOrderedList\')">1≡</button>';
  h += '<button type="button" title="减少缩进" onmousedown="return rteCmd(event,\'outdent\')">⇤</button>';
  h += '<button type="button" title="增加缩进" onmousedown="return rteCmd(event,\'indent\')">⇥</button>';
  h += '<span class="rte-sep"></span>';
  h += '<button type="button" title="插入链接" onmousedown="return rteLink(event)">🔗</button>';
  h += '<button type="button" title="插入图片（网址）" onmousedown="return rteImage(event)">🖼️</button>';
  h += '<button type="button" title="插入表格" onmousedown="return rteTable(event)">▦</button>';
  h += '<button type="button" title="插入分隔线" onmousedown="return rteCmd(event,\'insertHorizontalRule\')">—</button>';
  h += '<button type="button" title="插入音乐" onmousedown="return rteMedia(event,\'audio\')">🎵</button>';
  h += '<button type="button" title="插入视频" onmousedown="return rteMedia(event,\'video\')">🎬</button>';
  h += '<button type="button" title="插入公式占位（Beta）" onmousedown="return rteMath(event)">π<span class="rte-beta">beta</span></button>';
  return h;
}

/* ---- 编辑器初始化 / 读写 ---- */
function initRte(key){
  var cfg = RICH_KEYS[key];
  if(!cfg) return;
  var bar = $(cfg.bar), editor = $(cfg.editor);
  if(!bar || !editor) return;
  if(!bar.getAttribute("data-ready")){
    bar.innerHTML = rteToolbarHTML();
    bar.setAttribute("data-ready", "1");
    editor.addEventListener("keyup", function(){ saveRteSel(key); });
    editor.addEventListener("mouseup", function(){ saveRteSel(key); });
    editor.addEventListener("blur", function(){ saveRteSel(key); });
    editor.addEventListener("paste", function(e){
      /* 从 Word / 网页粘进来的样式太脏，统一按纯文本插入 */
      var t = e.clipboardData ? e.clipboardData.getData("text/plain") : "";
      if(!t) return;
      e.preventDefault();
      document.execCommand("insertText", false, t);
    });
  }
  editor.addEventListener("input", function(){ updateRteCount(key); });
  buildRteModeBar(key);
  updateRteCount(key);
}
function saveRteSel(key){
  var editor = $(RICH_KEYS[key].editor);
  if(!editor) return;
  var sel = window.getSelection();
  if(sel && sel.rangeCount && editor.contains(sel.anchorNode)){
    editorState[key].savedSel = sel.getRangeAt(0).cloneRange();
  }
}
function restoreRteSel(key){
  var editor = $(RICH_KEYS[key].editor);
  var r = editorState[key] && editorState[key].savedSel;
  if(!editor) return;
  editor.focus();
  if(!r) return;
  try {
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  } catch(e){}
}
/* 载入内容：HTML 直接放进去，Markdown 先转成 HTML */
/* ============================================================
   正文编辑器：三种模式都保留
     rich —— 可视化（所见即所得，存 HTML）
     md   —— Markdown 源码（存 Markdown，前台用 mdRender 渲染）
     html —— HTML 源码（原样存 HTML，表达力最强，带实时预览）
   ============================================================ */
var rtePreviewOn = {};          /* 每个编辑器各自的预览开关 */

/* 模式切换条：注在原来那个「切换到源码/Markdown」链接的位置上 */
function buildRteModeBar(key){
  var a = $(RICH_KEYS[key].mode);
  if(!a || !a.parentNode) return;
  var host = a.parentNode;
  if(host.getAttribute("data-modebar")) return;
  host.setAttribute("data-modebar", "1");
  host.innerHTML =
    '<span class="rte-modes" id="rteModes_' + key + '">'
    + '<button type="button" data-m="rich" onclick="setRichMode(\'' + key + '\',\'rich\')" title="所见即所得">可视化</button>'
    + '<button type="button" data-m="md" onclick="setRichMode(\'' + key + '\',\'md\')" title="Markdown 源码">Markdown</button>'
    + '<button type="button" data-m="html" onclick="setRichMode(\'' + key + '\',\'html\')" title="HTML 源码，表达能力最强">HTML</button>'
    + '<button type="button" class="rte-eye" data-m="preview" onclick="toggleRtePreview(\'' + key + '\')" title="看渲染后的样子">👁 预览</button>'
    + '</span>';
  paintRteModeBar(key);
}
function paintRteModeBar(key){
  var box = $("rteModes_" + key);
  if(!box) return;
  var m = getRichMode(key);
  /* 源码模式下工具栏是失效的，藏起来免得白点 */
  var bar = $(RICH_KEYS[key].bar);
  if(bar) bar.style.display = (m === "rich") ? "" : "none";
  var btns = box.querySelectorAll("button[data-m]");
  for(var i = 0; i < btns.length; i++){
    var bm = btns[i].getAttribute("data-m");
    if(bm === "preview"){
      var usable = (m !== "rich");
      btns[i].disabled = !usable;
      btns[i].classList.toggle("on", usable && !!rtePreviewOn[key]);
      btns[i].title = usable ? "看渲染后的样子" : "可视化模式本身就是所见即所得";
    }else{
      btns[i].classList.toggle("on", bm === m);
    }
  }
}
/* 切模式：内容在几种表示之间自动转换 */
function setRichMode(key, next){
  var cfg = RICH_KEYS[key];
  if(!cfg) return;
  var editor = $(cfg.editor);
  if(!editor) return;
  var cur = getRichMode(key);
  if(cur === next){ return; }

  if(cur === "rich"){
    /* 可视化 → 源码：Markdown 走 htmlToMd，HTML 原样带过去 */
    var html = getRich(key);
    editor.removeAttribute("contenteditable");
    editor.style.display = "none";
    var old = $("rtePlain_" + key);
    if(old) old.parentNode.removeChild(old);
    var oldPv = $("rtePreview_" + key);
    if(oldPv) oldPv.parentNode.removeChild(oldPv);
    var ta = document.createElement("textarea");
    ta.className = "rte-plain";
    ta.id = "rtePlain_" + key;
    ta.spellcheck = false;
    ta.value = (next === "md") ? (looksRichHTML(html) ? htmlToMd(html) : html) : html;
    editor.parentNode.insertBefore(ta, editor.nextSibling);
    var pv = document.createElement("div");
    pv.className = "rte-preview";
    pv.id = "rtePreview_" + key;
    pv.style.display = "none";
    ta.parentNode.insertBefore(pv, ta.nextSibling);
    ta.addEventListener("input", function(){ refreshRtePreview(key); });
    editorState[key].mode = next;
    ta.focus();
    showToast(next === "md"
      ? "已切到 Markdown 源码：只支持 Markdown 语法，复杂排版建议用 HTML 模式"
      : "已切到 HTML 源码：可以直接写任意 HTML，点「👁 预览」看效果");
  }else if(next === "rich"){
    /* 源码 → 可视化 */
    var ta2 = $("rtePlain_" + key);
    var src = ta2 ? ta2.value : "";
    var asHtml = (cur === "md") ? mdToHtmlLite(src) : src;
    if(ta2) ta2.parentNode.removeChild(ta2);
    var pv2 = $("rtePreview_" + key);
    if(pv2) pv2.parentNode.removeChild(pv2);
    editor.style.display = "";
    editor.setAttribute("contenteditable", "true");
    editor.innerHTML = asHtml;
    editorState[key].mode = "rich";
    editorState[key].savedSel = null;
    updateRteCount(key);
    showToast("已切回可视化编辑");
  }else{
    /* 源码内部 Markdown ↔ HTML 互转 */
    var ta3 = $("rtePlain_" + key);
    if(ta3) ta3.value = (next === "html") ? mdToHtmlLite(ta3.value) : htmlToMd(ta3.value);
    editorState[key].mode = next;
  }
  paintRteModeBar(key);
  refreshRtePreview(key);
}
/* 兼容老的调用（万一还有地方引用）：按 可视化 → Markdown → HTML → 可视化 轮换 */
function toggleRichMode(key){
  var m = getRichMode(key);
  setRichMode(key, m === "rich" ? "md" : (m === "md" ? "html" : "rich"));
}
/* 预览开关 */
function toggleRtePreview(key){
  if(getRichMode(key) === "rich"){ showToast("可视化模式本身就是所见即所得，不用预览", "info"); return; }
  rtePreviewOn[key] = !rtePreviewOn[key];
  refreshRtePreview(key);
}
function refreshRtePreview(key){
  var pv = $("rtePreview_" + key);
  var ta = $("rtePlain_" + key);
  if(!pv || !ta) return;
  var on = !!rtePreviewOn[key];
  pv.style.display = on ? "" : "none";
  paintRteModeBar(key);
  if(!on) return;
  var mode = getRichMode(key);
  pv.innerHTML = (mode === "md") ? mdToHtmlLite(ta.value) : ta.value;
  /* 预览里的代码块也套上「语言 + 复制」的样式，和前台一致 */
  var pres = pv.querySelectorAll("pre");
  for(var i = 0; i < pres.length; i++){
    var pre = pres[i], wrap = document.createElement("div");
    wrap.className = "rte-prev-code";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
  }
}
function setModeLink(key, text){
  var a = $(RICH_KEYS[key].mode);
  if(a) a.textContent = text;
}

function loadRich(key, raw){
  var cfg = RICH_KEYS[key];
  if(!cfg) return;
  var editor = $(cfg.editor);
  if(!editor) return;
  initRte(key);
  var s = String(raw == null ? "" : raw);
  var mode = getRichMode(key);
  var ta = $("rtePlain_" + key);
  if(mode !== "rich"){
    /* 源码模式下：同步 textarea，别碰正在编辑的内容 */
    if(ta) ta.value = (mode === "md" && looksRichHTML(s)) ? htmlToMd(s) : s;
    editor.style.display = "none";
    refreshRtePreview(key);
    return;
  }
  editor.style.display = "";
  editor.setAttribute("contenteditable", "true");
  editor.innerHTML = !s.trim() ? "" : (looksRichHTML(s) ? s : mdToHtmlLite(s));
  editorState[key].savedSel = null;
  updateRteCount(key);
}
/* 读内容：rich / html 返回 HTML，md 返回 Markdown 源码 */
function getRich(key){
  var cfg = RICH_KEYS[key];
  if(!cfg) return "";
  var mode = getRichMode(key);
  if(mode !== "rich"){
    var ta = $("rtePlain_" + key);
    return ta ? ta.value.trim() : "";
  }
  var editor = $(cfg.editor);
  if(!editor) return "";
  var html = String(editor.innerHTML || "").trim();
  if(html === "<br>" || html === "<p></p>" || html === "<div><br></div>") html = "";
  return html.trim();
}
/* 存下去的是不是 HTML（只有 Markdown 模式存的是 Markdown） */
function isRichMode(key){ return getRichMode(key) !== "md"; }
function getRichMode(key){ return (editorState[key] && editorState[key].mode) || "rich"; }
function updateRteCount(key){
  var cfg = RICH_KEYS[key];
  if(!cfg) return;
  var mode = getRichMode(key);
  var editor = $(cfg.editor);
  var n = 0;
  if(mode !== "rich"){
    var ta = $("rtePlain_" + key);
    n = ta ? String(ta.value || "").replace(/\s+/g, "").length : 0;
  }else{
    n = editor ? (editor.textContent || "").replace(/\s+/g, "").length : 0;
  }
  var box = $("rteCount_" + key);
  if(box){
    var label = mode === "md" ? " Markdown" : (mode === "html" ? " HTML" : "");
    box.textContent = n ? ("约 " + n + " 字" + label) : "";
  }
}

/* HTML → Markdown：只为「切到源码模式」时能继续用 Markdown 编辑 */
function htmlToMd(html){
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
      if(tag === "u"){ s += "<u>" + inner + "</u>"; return; }
      if(tag === "s" || tag === "strike" || tag === "del"){ s += "~~" + inner + "~~"; return; }
      if(tag === "code" && n.parentNode.tagName.toLowerCase() !== "pre"){ s += "`" + inner + "`"; return; }
      if(tag === "a"){ s += "[" + inner + "](" + (n.getAttribute("href") || "") + ")"; return; }
      if(tag === "img"){ s += "![" + (n.getAttribute("alt") || "") + "](" + (n.getAttribute("src") || "") + ")"; return; }
      s += inner;
    });
    return s;
  }
  function block(node, depth){
    var out = [], listBuf = null;
    function flushList(){
      if(listBuf && listBuf.items.length){
        out.push(listBuf.items.map(function(it, i){ return (listBuf.ordered ? (i + 1) + ". " : "- ") + it; }).join("\n"));
      }
      listBuf = null;
    }
    Array.prototype.forEach.call(node.childNodes, function(n){
      if(n.nodeType === 3){
        var t = n.nodeValue.replace(/\s+/g, " ").trim();
        if(t){ flushList(); out.push(t); }
        return;
      }
      if(n.nodeType !== 1) return;
      var tag = n.tagName.toLowerCase();
      if(/^h[1-6]$/.test(tag)){ flushList(); out.push("#".repeat(parseInt(tag.slice(1), 10)) + " " + inline(n).trim()); return; }
      if(tag === "p" || tag === "div"){ flushList(); var tx = inline(n).trim(); if(tx) out.push(tx); return; }
      if(tag === "ul" || tag === "ol"){
        flushList();
        var items = [];
        Array.prototype.forEach.call(n.children, function(li){
          if(li.tagName && li.tagName.toLowerCase() === "li") items.push(inline(li).trim());
        });
        if(items.length) out.push(items.map(function(it, i){ return (tag === "ol" ? (i + 1) + ". " : "- ") + it; }).join("\n"));
        return;
      }
      if(tag === "blockquote"){ flushList(); out.push(inline(n).split("\n").map(function(l){ return "> " + l; }).join("\n")); return; }
      if(tag === "pre"){ flushList(); out.push("```\n" + (n.textContent || "").replace(/\n+$/, "") + "\n```"); return; }
      if(tag === "hr"){ flushList(); out.push("---"); return; }
      if(tag === "table"){
        flushList();
        var rows = [];
        Array.prototype.forEach.call(n.querySelectorAll("tr"), function(tr){
          var cells = [];
          Array.prototype.forEach.call(tr.children, function(td){ cells.push(inline(td).trim()); });
          rows.push("| " + cells.join(" | ") + " |");
        });
        if(rows.length){
          if(rows.length > 1){
            var cols = rows[0].split("|").length - 2;
            rows.splice(1, 0, "|" + new Array(Math.max(1, cols)).join(" --- |") + " --- |");
          }
          out.push(rows.join("\n"));
        }
        return;
      }
      if(tag === "audio"){ flushList(); out.push("[🎵 音乐](" + (n.getAttribute("src") || "") + ")"); return; }
      if(tag === "video"){ flushList(); out.push("[🎬 视频](" + (n.getAttribute("src") || "") + ")"); return; }
      flushList();
      var t2 = inline(n).trim();
      if(t2) out.push(t2);
    });
    flushList();
    return out.join("\n\n");
  }
  return block(d, 0).replace(/\n{3,}/g, "\n\n").trim();
}

/* ---- 工具条动作 ---- */
function rteCmd(e, cmd, val){
  if(e && e.preventDefault) e.preventDefault();
  var key = (e && e.currentTarget && e.currentTarget.closest) ? currentRteKeyFromEl(e.currentTarget) : null;
  if(key) restoreRteSel(key);
  try { document.execCommand(cmd, false, val === undefined ? null : val); } catch(err){}
  if(key){ saveRteSel(key); updateRteCount(key); }
  return false;
}
function currentRteKeyFromEl(el){
  var bar = el.closest ? el.closest(".rte-toolbar") : null;
  if(!bar) return null;
  var id = bar.id.replace("rteBar_", "");
  return RICH_KEYS[id] ? id : null;
}
/* 文字颜色 / 背景色：用取色器，不再用浏览器 prompt */
var lastPickedColor = "#10b981";
function openColorPicker(title, cb){
  var m = $("colorMask");
  if(!m) return cb(lastPickedColor);
  $("colorTitle").textContent = title || "选择颜色";
  $("colorInput").value = /^#[0-9a-f]{6}$/i.test(lastPickedColor) ? lastPickedColor : "#10b981";
  $("colorHex").value = lastPickedColor;
  m.classList.add("show");
  $("colorOk").onclick = function(){
    var v = $("colorHex").value.trim() || $("colorInput").value;
    lastPickedColor = v;
    m.classList.remove("show");
    cb(v);
  };
  $("colorInput").oninput = function(){ $("colorHex").value = this.value; };
  setTimeout(function(){ try { $("colorInput").click(); } catch(e){} }, 40);
}
function closeColorPicker(){ var m = $("colorMask"); if(m) m.classList.remove("show"); }
function rteColorPick(cb){ openColorPicker("选择颜色", cb); }
/* 取色后再执行命令 */
function rtePickColor(e, cmd){
  if(e && e.preventDefault) e.preventDefault();
  var key = currentRteKeyFromEl(e.currentTarget) || lastFocusedRte();
  restoreRteSel(key);
  openColorPicker(cmd === "hiliteColor" ? "选择背景颜色" : "选择文字颜色", function(color){
    if(!color) return;
    restoreRteSel(key);
    try { document.execCommand("styleWithCSS", false, true); } catch(err){}
    try { document.execCommand(cmd, false, color); } catch(err){}
    saveRteSel(key);
    updateRteCount(key);
  });
  return false;
}
function rteFont(name){
  if(!name) return;
  var key = lastFocusedRte();
  if(key) restoreRteSel(key);
  try { document.execCommand("fontName", false, name); } catch(e){}
  if(key){ saveRteSel(key); updateRteCount(key); }
}
function rteFontSize(size){
  if(!size) return;
  var key = lastFocusedRte();
  if(key) restoreRteSel(key);
  /* 没有 fontSize 的 px 选项，用 styleWithCSS + fontSize 的 pt 值近似 */
  try {
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("fontSize", false, "7");
    var editor = key ? $(RICH_KEYS[key].editor) : null;
    if(editor){
      Array.prototype.forEach.call(editor.querySelectorAll('font[size="7"], span[style*="xxx-large"]'), function(el){
        if(el.tagName.toLowerCase() === "font"){ el.removeAttribute("size"); el.style.fontSize = size; }
        else el.style.fontSize = size;
      });
    }
  } catch(e){}
  if(key){ saveRteSel(key); updateRteCount(key); }
}
var lastRteKey = "notice";
function lastFocusedRte(){ return lastRteKey; }
Object.keys(RICH_KEYS).forEach(function(k){
  document.addEventListener("focusin", function(e){
    var editor = $(RICH_KEYS[k].editor);
    if(editor && (e.target === editor || (editor.contains && editor.contains(e.target)))) lastRteKey = k;
  });
});
function rteLink(e){
  if(e && e.preventDefault) e.preventDefault();
  var key = currentRteKeyFromEl(e.currentTarget) || lastFocusedRte();
  restoreRteSel(key);
  openInputDialog({
    title: "插入链接",
    hint: "链接地址（https://...）",
    placeholder: "https://",
    secondInput: true,
    placeholder2: "显示文字（可留空）",
    okText: "插入",
    onOk: function(url, text){
      if(!/^https?:\/\//i.test(url)){ dlgErr("链接要以 http:// 或 https:// 开头"); return false; }
      saveRteSel(key);
      document.execCommand("insertHTML", false,
        '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(text || url) + "</a>&nbsp;");
      return true;
    }
  });
  return false;
}
function rteImage(e){
  if(e && e.preventDefault) e.preventDefault();
  var key = currentRteKeyFromEl(e.currentTarget) || lastFocusedRte();
  insertImageViaDialog(key);
  return false;
}
function rteMedia(e, kind){
  if(e && e.preventDefault) e.preventDefault();
  var key = currentRteKeyFromEl(e.currentTarget) || lastFocusedRte();
  restoreRteSel(key);
  openInputDialog({
    title: kind === "audio" ? "插入音乐" : "插入视频",
    hint: kind === "audio" ? "音乐地址（mp3 / m4a 等）" : "视频地址（mp4 / webm 等）",
    placeholder: "https://",
    okText: "插入",
    onOk: function(url){
      if(!/^https?:\/\//i.test(url)){ dlgErr("地址要以 http:// 或 https:// 开头"); return false; }
      saveRteSel(key);
      var tag = kind === "audio" ? "audio" : "video";
      var extra = kind === "audio" ? "controls" : "controls style=\"max-width:100%\"";
      document.execCommand("insertHTML", false, "<" + tag + " " + extra + " src=\"" + esc(url) + "\"></" + tag + ">");
      return true;
    }
  });
  return false;
}
function rteTable(e){
  if(e && e.preventDefault) e.preventDefault();
  var key = currentRteKeyFromEl(e.currentTarget) || lastFocusedRte();
  restoreRteSel(key);
  openInputDialog({
    title: "插入表格",
    hint: "填行数和列数，插入后可以直接在表格里打字",
    placeholder: "行数，如 3",
    secondInput: true,
    placeholder2: "列数，如 4",
    okText: "插入表格",
    onOk: function(rows, cols){
      var r = Math.min(20, Math.max(1, parseInt(rows, 10) || 3));
      var c = Math.min(10, Math.max(1, parseInt(cols, 10) || 3));
      var html = "<table><tbody>";
      for(var i = 0; i < r; i++){
        html += "<tr>";
        for(var j = 0; j < c; j++) html += "<td><br></td>";
        html += "</tr>";
      }
      html += "</tbody></table><p><br></p>";
      saveRteSel(key);
      document.execCommand("insertHTML", false, html);
      return true;
    }
  });
  return false;
}
function rteMath(e){
  if(e && e.preventDefault) e.preventDefault();
  var key = currentRteKeyFromEl(e.currentTarget) || lastFocusedRte();
  restoreRteSel(key);
  openInputDialog({
    title: "插入公式",
    hint: "输入公式（会作为文字插入，也可以贴图片公式的地址后走「插入图片」）",
    placeholder: "E = mc^2",
    okText: "插入",
    onOk: function(f){
      if(!f){ dlgErr("请输入公式内容"); return false; }
      saveRteSel(key);
      document.execCommand("insertHTML", false, "<span style=\"font-style:italic\">" + esc(f) + "</span>");
      return true;
    }
  });
  return false;
}

/* ---- 插入「已上传的图片」到光标处 ---- */
/* 在光标处插入 HTML（默认插到当前聚焦的编辑器，也可以显式指定） */
function rteInsertHTML(html, key){
  key = key || lastFocusedRte();
  restoreRteSel(key);
  var ok = false;
  try { ok = document.execCommand("insertHTML", false, html); } catch(e){ ok = false; }
  if(!ok){
    var editor = $(RICH_KEYS[key].editor);
    if(editor){ editor.innerHTML += html; }
  }
  saveRteSel(key);
  updateRteCount(key);
}
function focusRich(key){
  var cfg = RICH_KEYS[key];
  if(!cfg) return;
  var editor = $(cfg.editor);
  if(!editor) return;
  lastRteKey = key;
  try { editor.focus(); } catch(e){}
  saveRteSel(key);
}
function mdCanInsertImg(){ return !!(imgDrafts.notice && imgDrafts.notice.length); }
function refreshMdInsertBtn(){
  var b = $("nInsertImgBtn");
  if(b) b.disabled = !mdCanInsertImg();
}
/* 「插入图片」统一入口：一个弹窗里既能填网址 / 上传，也能点刚上传的图
   —— 替代浏览器自带的 prompt */
function openImgPicker(key){
  key = key || lastFocusedRte();
  lastRteKey = key;
  var imgs = (imgDrafts[key] || []);
  var pills = imgs.map(function(f, i){
    return '<button type="button" class="dlg-thumb" onclick="pickDraftImg(\'' + esc(key) + "'," + i + ')" title="' + esc(f.name || "") + '">'
      + '<img src="' + esc(previewSrc(f.url)) + '" alt=""><span>' + esc(String(f.name || ("图片" + (i + 1))).slice(0, 10)) + "</span></button>";
  }).join("");
  openInputDialog({
    title: "插入图片",
    hint: "图片地址（也可以直接粘贴图床链接）\n先点「选择文件上传」也行，上传完地址会自动填进来"
      + (pills ? "\n\n也可以直接点下面已上传的图片：" : ""),
    placeholder: "https://",
    okText: "插入",
    onFile: async function(files){
      var out = [];
      for(var i = 0; i < files.length; i++){
        var meta = await uploadFile(files[i], "img");
        (imgDrafts[key] = imgDrafts[key] || []).push(meta);
        out.push(meta.url);
      }
      renderImgDrafts(key);
      refreshMdInsertBtn();
      return out;
    },
    onOk: function(url){
      var list = String(url || "").split("\n").map(function(s){ return s.trim(); }).filter(Boolean);
      if(!list.length){ dlgErr("请输入图片地址，或先上传一张"); return false; }
      for(var i = 0; i < list.length; i++){
        if(!/^(https?:\/\/|files\/|\/)/i.test(list[i])){ dlgErr("地址要以 https:// 开头（或站内 files/ 路径）：" + list[i]); return false; }
      }
      insertImagesToList(list, key);
      showToast("已插入 " + list.length + " 张图片，记得点保存");
      return true;
    }
  });
  /* 把「已上传图片」缩略图挂到弹窗里 */
  var box = $("dlgThumbs");
  if(box){
    box.innerHTML = pills;
    box.style.display = pills ? "" : "none";
  }
}
/* 按当前模式插入：可视化插 <img>，源码模式插 Markdown */
function insertImagesToList(list, key){
  var html = list.map(function(u){ return '<img src="' + esc(u) + '" alt="">'; }).join("");
  if(getRichMode(key) === "rich"){
    rteInsertHTML(html, key);
    return;
  }
  var ta = $("rtePlain_" + key);
  if(!ta) return;
  var pos = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
  var txt = list.map(function(u){ return "![" + "图片" + "](" + mdUrl(u) + ")"; }).join("\n");
  ta.value = ta.value.slice(0, pos) + txt + ta.value.slice(pos);
}
/* 点弹窗里的缩略图：直接把那张图插进正文 */
function pickDraftImg(key, i){
  var f = (imgDrafts[key] || [])[i];
  if(!f) return;
  insertImagesToList([f.url], key);
  closeInputDialog();
  showToast("已插入图片，记得点保存");
}
function closeImgPicker(){ closeInputDialog(); }
function pickMdImgFrom(btn){
  var key = $("mdImgPickerGrid") ? ($("mdImgPickerGrid").getAttribute("data-mk") || "notice") : "notice";
  var i = parseInt(btn.getAttribute("data-mi"), 10);
  pickDraftImg(key, i);
}
/* 预览 / 摘要：HTML 和 Markdown 都能处理 */
function stripMd(s){
  var t = String(s == null ? "" : s);
  if(looksRichHTML(t)){
    return t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ").replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
  }
  return t.replace(/!\[([^\]]*)\]\([^)]*\)/g,"$1").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/```[\s\S]*?```/g," ").replace(/`([^`]*)`/g,"$1").replace(/^\s{0,3}#{1,6}\s+/gm,"").replace(/^\s*>\s?/gm,"").replace(/^\s*([-*+]|\d+[.)])\s+/gm,"").replace(/\*\*|__|~~/g,"").replace(/[ \t]+/g," ").replace(/\n{2,}/g,"\n").trim();
}
function todayStr(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function nowStr(){ const d=new Date(); return todayStr()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }
