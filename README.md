# 思齐个人主页

🎓 控制工程研究生的个人主页与学习记录站 —— 纯静态，托管在 GitHub Pages，用 GitHub API 当「伪后端」。

- 前台：https://benyia.github.io
- 后台：https://benyia.github.io/admin.html

> 想知道每个文件是干什么的、要不要发布、能不能删？看 **[文件说明.md](文件说明.md)**。

## ✨ 功能

### 内容
- 📚 **课程**：资料（PDF/PPT/图片/压缩包）、学习进度、进度条与「已完成 / 进行中」标记
- 📝 **论文**：状态筛选（阅读/撰写/中文/英文/查重/投稿）、富文本摘要、附件
- 🔔 **学校通知** / 👥 **班级事务**：富文本正文 + 附件
- 📖 **日记**：富文本正文、图片、影音，也支持 Markdown
- 🎓 **导师指导**：每次记录、标签、附件
- ☁️ **生活服务** / 💰 **生活记账** / 👨‍🎓 **班级名单** / 🖼️ **影音**

### 浏览体验
- 🔍 **全站搜索**：课程、论文、通知、班级、日记、导师、名单、记账、标签、分类一起搜
- 🏷️ **标签聚合**：点任意标签，按类型分组看全部相关内容；每篇文章自带分层目录（1 / 1.1 / 1.1.1）
- 📑 **文章目录**：右侧栏层级目录，滚动高亮
- 📄 **分页**：首页 / 课程 / 通知 / 班级每页 6 条，底部数字页码
- 📱 **响应式**：手机/平板自动折叠导航（汉堡菜单 + 抽屉），三栏自适应
- 🌙 深色模式 · 磨砂玻璃卡片 · 滚动入场动画 · 图片懒加载
- 🔗 **友情链接**：后台管理，访客可在「关于我」页提交申请

## 🚀 本地运行

需要 Node.js 18+（只用于起本地服务器，站点本身零依赖、无构建）。

```
双击  启动本地预览.cmd         → http://127.0.0.1:8765/index.html
双击  启动本地上传工具.cmd     → http://127.0.0.1:8900/fix
```

命令行等价写法：

```
node _preview/serve.js --open          # 只读预览（可换端口：serve.js 9000）
node _preview/serve-upload.js --open   # 本地上传工具（直接把文件传到 GitHub）
```

> 不要直接双击 `index.html`：`fetch` 读 `data.json` 会被浏览器的 `file://` 安全策略拦掉，页面会是空的。

### 素材（`files/`）是怎么来的

工作区里没有 `files/` 目录（真实附件都在线上、体积大）。预览时服务器做两级回退：

1. 本地 `files/**` 有就直接返回；
2. 没有就去 `https://benyia.github.io/files/**` 取一次，**顺手缓存到本地 `files/`**。

第一次打开是「在线取」，之后本地秒开。想看纯本地效果，删掉 `files/` 即可。

## 🔑 后台维护（线上）

访问 `/admin.html`。首次需要在「站点设置」里粘贴一个 GitHub Token（**只存在你自己的浏览器里**，不会写进仓库）：

1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
2. 勾选 `repo`（想推送 Actions 工作流再加 `workflow`）
3. 生成后粘贴到后台「站点设置」并点保存

有了 Token 就能在后台增删改课程、论文、通知、班级、日记、导师指导、友链、标签、分类、快速链接；改动会直接提交到 `data.json`，约 1 分钟后线上生效。

## 📦 发布到线上

改完代码（html / css / js）都要发布一次才会上线，三种方式任选：

| 方式 | 适合场景 | 用法 |
| --- | --- | --- |
| 本地上传工具 | 本机访问 GitHub API 不顺（会自己走 DoH 绕开 DNS 问题） | 双击 `启动本地上传工具.cmd` → 粘 Token → 点「选中站点全部文件」→ 上传 |
| Git 推送 | 本机已装 git | `.\_preview\push.ps1`（先看改动再确认，`-Yes` 跳过确认） |
| GitHub API 推送 | 只有 Node、不想装 git | `$env:GH_TOKEN="ghp_xxx"; node _preview/push_api.mjs --yes` |

三个脚本的**发布清单都是自动读取**的：`index.html` / `admin.html` / `404.html` + 这两个页面引用的所有 `css`、`js`。
代码拆分后新增或改名模块，不用再改脚本。图片只被 CSS / JS 引用（如背景图 `assets/image1.png`）时，脚本里有一份 `EXTRA` 清单兜底。

**`data.json` 三条路径默认都不推**（它由线上后台维护；本地是旧快照，推上去会把线上内容回滚）。确实要推时：
- 上传工具：手动把 `data.json` 拖进文件框（服务端会再比一次大小，线上更新时直接拒绝）
- `push_api.mjs`：加 `--with-data`
- `push.ps1`：加 `-WithData`

推送后 GitHub Pages 约需 1~2 分钟重新构建。

上传工具里还有第 ③ 块**「清理线上多余文件」**：扫一遍线上仓库，把已经没有任何页面 / 样式 / 脚本引用的旧文件（比如图标搬家后留在根目录的那几份）列出来，勾选后删除；`files/` 里的素材永远不会被列为可删。

## 🧪 自检

```
node _preview/tools/check.mjs                # 静态检查：引用是否存在、css/js 里写死的路径是否命中、模块顺序
node _preview/tools/smoke.mjs                # 起临时服务器，实际请求首页 / 后台 / 拆分后的 css、js
```

其中「模块顺序」最要紧：样式和脚本都按文件名前缀顺序加载，**改名等于改加载顺序**。

### 友链申请自动入库（可选）
`.github/workflows/collect-friend-apply.yml` 会在收到带「友链申请」标签的 Issue 时，自动把申请写进 `data.json`。
没有它也不影响：后台「友链」面板点「⬇️ 从 GitHub 拉取申请」即可手动导入。

## 🛠️ 技术

- **纯 HTML / CSS / JS**，无框架、无构建步骤、无依赖；样式与脚本按模块拆分，用普通 `<link>` / `<script>` 按顺序加载
- **GitHub Pages** 托管，**GitHub API** 读写 `data.json` 持久化
- 内容存 `data.json`，附件存 `files/`
- 站点资源：`assets/` 下的 `favicon.svg` / `favicon.ico` / `apple-touch-icon.png` / `og-cover.png`（分享卡片）/ `image1.png`（整页背景），以及 `robots.txt` / `sitemap.xml` / `404.html`

## 🗂️ 代码结构

原来的 `css/style.css`、`css/admin.css`、`js/app.js`、`js/admin.js` 已按功能拆开，拆分只做「切分」不做改写；`tools/check.mjs` 会校验引用、css/js 里写死的资源路径、JS 语法和模块顺序。

加载顺序 = 文件名前缀顺序，**不要随意改名**；新增模块请用下一个序号。

```
css/
  site/01-base.css          重置 / 变量 / 布局 / 玻璃卡片 / 导航 / 目录 / 分页
  site/02-components.css    友链、卡片详情、标签聚合、交互细节
  site/03-media.css         音乐播放器 + 歌词弹层
  site/04-pages.css         入场欢迎页
  site/05-home.css          首页三栏 + 精选应用
  admin/01-base.css         后台骨架 + 登录页
  admin/02-editor.css       富文本编辑器
  admin/03-dialog.css       统一输入弹窗

js/
  app/01-core.js            配置 / 默认数据 / 通用工具（esc、日期格式化…）
  app/02-shell.js           首屏优化、懒加载与滚动动画、读 data.json
  app/03-content.js         标签聚合、课程进度、站点配置、分页
  app/04-markdown.js        Markdown 渲染、正文格式兼容、文章目录
  app/05-pages.js           友链、精选应用、上下篇、前台写入、轻量弹窗
  app/06-upload.js          前台图片上传、导师指导列表与详情
  app/07-views.js           搜索定位、右侧栏、手机导航抽屉
  app/08-music.js           音乐播放器（渲染 / 控制 / 进度条 / 迷你条）
  app/09-welcome.js         入场欢迎页 + 启动调用

  admin/01-core.js          配置 / 全局状态 / 小工具
  admin/02-editor.js        富文本编辑器（三种模式 + 工具栏 + Markdown 转 HTML）
  admin/03-list.js          列表工具（最新排前、关键词过滤）
  admin/04-api.js           GitHub API / 登录 / Token / 读写 data.json
  admin/05-upload.js        文件上传 + 进度条 + 去重
  admin/06-forms.js         图片/图标上传弹窗、名单、网盘外链
  admin/07-render.js        各板块渲染与保存
  admin/08-settings.js      站点设置 / 首页 / 分类标签 / 友链 / 记账分类
```

**改哪里**：调颜色和间距去 `css/site/01-base.css`；加一个新板块的页面逻辑放 `js/app/05-pages.js` 或新建 `10-xxx.js`；后台表单字段在 `js/admin/06-forms.js` + `js/admin/07-render.js`。

> 浏览器缓存：拆分后的文件都带版本号（`?v=20261026`），改完代码记得同步改版本号，否则访客可能仍用旧缓存。

## 📁 目录结构

```
index.html            前台（单页应用）
admin.html            管理后台
data.json             全部内容数据
files/                图片与附件（本地是预览缓存，线上为完整素材）
404.html              自定义 404
robots.txt            搜索引擎规则
sitemap.xml           站点地图
assets/               图标、分享图与整页背景图（favicon / og-cover / image1）
css/ js/              按模块拆分的样式与脚本（见上）
.github/              友链申请自动收录（workflow + 脚本）
_preview/             本地预览 / 上传工具 / 自检脚本（不发布）
文件说明.md            每个文件的用途、能否发布、能否删除
启动本地预览.cmd       双击起只读预览
启动本地上传工具.cmd   双击起上传工具
```

## 📄 License

MIT
