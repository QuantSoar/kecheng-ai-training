# 云端部署说明

## 方式一：直接上传 `site/`（任意静态托管）

1. 本地执行 `build-static.bat`（或 `sync-data.bat` + `cd frontend && npm run build:site`）
2. 将 **`site/` 目录内全部文件** 上传到服务器根目录
3. 访问 `https://你的域名/index.html`，大屏入口：`/#/demo`

`site/data/` 需包含：

- `courses.xlsx` — 课程
- `faculty.xlsx` — 师资
- `jobs.xlsx` — 岗位映射
- `certs.xlsx` — 竞赛·证书
- `curriculum-design.xlsx` — 实训室课程体系设计
- `data-config.json` — 数据路径配置

`site/templates/` 为上传模板（可选，数据管理页也可浏览器内下载）。

## 更新 Excel 数据

**推荐流程（本地）：**

1. 将 Excel 放到项目根目录（或使用 `*课程*`、`*师资*`、`*岗位*`、`*竞赛*`、`*课程体系*` 等文件名）
2. 运行 `sync-data.bat` — 同步到 `frontend/public/data/` 与 `site/data/`
3. 运行 `build-static.bat` — 重新打包前端到 `site/`
4. 上传 `site/` 全部文件到服务器（或 push 触发 GitHub Actions）

**浏览器内上传（临时）：** 在「数据管理」页上传 Excel 可即时替换全站数据；静态部署下刷新或点「重新加载」会恢复为 `site/data/` 中的文件，持久化仍需 sync + 部署。

## 本地预览静态站

```bat
serve-site.bat
```

浏览器打开 http://localhost:8080/#/demo
