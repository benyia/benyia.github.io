# 第三方预览组件

这些文件只在用户点击 Word / PPT 文件时按需加载，不参与首页首屏。

- `docx-preview.min.js`：docx-preview 0.4.1，Apache-2.0，见 `LICENSE-docx-preview.txt`
- `jszip.min.js`：JSZip 3.10.2，MIT，见 `LICENSE-jszip.txt`
- `pptx-preview.bundle.js`：由 pptx-preview 1.0.7 打包生成，ISC；内含 jszip / lodash / tslib / uuid / echarts
- `NOTICE-pptx-preview.md`：pptx-preview 原始说明
- `LICENSE-echarts.txt`、`LICENSE-lodash.txt`、`LICENSE-uuid.txt`：打包依赖的许可证

升级时保留原文件名，并同步更新 `js/app/01-core.js` 中的加载路径与 `index.html` 的缓存版本号。
