# 思齐个人主页

🎓 控制工程研究生的个人主页与学习记录站 —— 纯静态，托管在 GitHub Pages，用 GitHub API 当「伪后端」。

- 前台：https://benyia.github.io
- 后台：https://benyia.github.io/admin.html

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

## 🚀 使用

### 日常维护（后台）
访问 `/admin.html`。首次需要在「站点设置」里粘贴一个 GitHub Token（**只存在你自己的浏览器里**，不会写进仓库）：

1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
2. 勾选 `repo`（想推送 Actions 工作流再加 `workflow`）
3. 生成后粘贴到后台「站点设置」并点保存

有了 Token 就能在后台增删改课程、论文、通知、班级、日记、导师指导、友链、标签、分类、快速链接；改动会直接提交到 `data.json`，约 1 分钟后线上生效。

### 本地上传工具（可选）
本机网络访问 GitHub API 不顺时，可用本地工具传文件：

```
双击  启动本地上传工具.cmd
或    node _preview/serve-upload.js 8900
```

- 上传页面：http://127.0.0.1:8900/fix（选文件 → 上传；Token 只在浏览器里）
- 添加工作流：http://127.0.0.1:8900/add-action

### 友链申请自动入库（可选）
`.github/workflows/collect-friend-apply.yml` 会在收到带「友链申请」标签的 Issue 时，自动把申请写进 `data.json`。
没有它也不影响：后台「友链」面板点「⬇️ 从 GitHub 拉取申请」即可手动导入。

## 🛠️ 技术

- **纯 HTML / CSS / JS**，无框架、无构建步骤 —— `index.html`（前台）+ `admin.html`（后台）就是全部
- **GitHub Pages** 托管，**GitHub API** 读写 `data.json` 持久化
- 内容存 `data.json`，附件存 `files/`
- 站点资源：`favicon.svg` / `favicon.ico` / `apple-touch-icon.png` / `og-cover.png`（分享卡片）/ `robots.txt` / `sitemap.xml` / `404.html`

## 📁 目录结构

```
index.html            前台（单页应用）
admin.html            管理后台
data.json             全部内容数据
files/                上传的图片与附件
404.html              自定义 404
robots.txt            搜索引擎规则
sitemap.xml           站点地图
favicon.* og-cover.png apple-touch-icon.png
.github/workflows/    友链申请自动收录
_preview/             本地预览与上传工具
```

## 📄 License

MIT
