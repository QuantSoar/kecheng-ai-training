# 云端部署说明

## 方式一：直接上传 `site/`（任意静态托管）

1. 本地执行 `build-static.bat`（或 `sync-data.bat` + `cd frontend && npm run build:site`）
2. 将 **`site/` 目录内全部文件** 上传到服务器根目录
3. 访问 `https://你的域名/index.html`，大屏入口：`/#/demo`

`site/data/` 需包含：

- `courses.xlsx` / `faculty.xlsx` / `jobs.xlsx`
- `data-config.json`

## 方式二：GitHub Pages（本仓库已配置 Actions）

1. 推送代码到 GitHub 后，进入仓库 **Settings → Pages**
2. **Source** 选择 **GitHub Actions**
3. 推送 `main` 分支后，Workflow `Deploy site to GitHub Pages` 会自动构建并发布 `site/`
4. 访问 `https://<用户名>.github.io/<仓库名>/` ，大屏：`/#/demo`

更新 Excel：替换根目录或 `site/data/` 下 xlsx 后重新运行 `build-static.bat` 并 push。

## 本地预览静态站

```bat
serve-site.bat
```

浏览器打开 http://localhost:8080/#/demo
