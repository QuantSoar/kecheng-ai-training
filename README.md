# 人工智能实训基地 · 课程图谱系统

基于 24 个实训室课程体系建设数据的本地/云端可视化系统，支持课程、师资、岗位三要素联动分析与培养资源匹配。

## 功能模块

| 模块 | 说明 |
|------|------|
| **总览** | KPI、课程类型分布、厂商统计、实训室概览 |
| **实训室全景** | 卡片浏览 + 课程分析 + 厂商课程（Tab 切换） |
| **课程能力图谱** | 跨实训室共享网络力导向图 |
| **师资分析** | 多维画像、实训室匹配、优先级推荐 |
| **综合匹配** | 实训室/岗位/要素对比/缺口诊断四 Tab |
| **岗位图谱** | 岗位 → 实训室 → 课程 → 师资 四步匹配流程 |
| **数据管理** | Excel 上传、模板下载、整表替换策略 |
| **大屏演示** | 全屏自动轮播，含综合匹配与培养流程展示 |

## 快速启动（开发模式）

### 1. 安装依赖

```bash
# 后端
cd backend
pip install -r requirements.txt

# 前端
cd ../frontend
npm install
```

### 2. 准备数据

将 Excel 放到**项目根目录**：

- `courses.xlsx` — 课程体系建设表
- `faculty.xlsx` — 师资多维分析表
- `jobs.xlsx`（或 `*岗位*.xlsx`）— 岗位-实训室-课程映射表

运行 `sync-data.bat` 可同步到 `frontend/public/data` 与 `site/data`。

### 3. 启动

双击 `start.bat`，或手动：

```bash
# 终端 1 - 后端
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# 终端 2 - 前端
cd frontend
npm run dev
```

### 4. 访问

- 主页：http://localhost:5173
- 大屏演示：http://localhost:5173/#/demo
- API 文档：http://127.0.0.1:8000/docs

## 云端静态部署

无需后端，将构建产物部署到任意静态 Web 服务器即可。

### 构建

```bash
# 一键：同步数据 → 构建前端 → 打包到 site/
build-static.bat

# 或手动
sync-data.bat
cd frontend
npm run build:site
```

### 部署

1. 上传 `site/` 目录**全部文件**到服务器根目录
2. 确保 `site/data/` 下有三类 xlsx（由 `sync-data.bat` 从根目录复制）
3. Apache 已含 `.htaccess`；Netlify 已含 `_redirects`

### 本地预览静态站

```bash
serve-site.bat
# 访问 http://localhost:8080/#/demo
```

### 数据更新策略

- 三类 Excel **独立整表替换**，上传或替换文件后不保留历史版本
- 静态站模式下数据从 `site/data/*.xlsx` 加载（见 `data/data-config.json`）
- 浏览器内上传仅内存生效，刷新后丢失；生产环境请直接更新服务器上的 xlsx 文件

## GitHub 发布

本地已初始化 Git 仓库并完成首次提交。发布步骤：

```bat
publish-github.bat
```

或手动：

1. 在 GitHub 创建空仓库 `kecheng-ai-training`（不要勾选 README）
2. 推送代码：

```bash
git remote add origin git@github.com:QuantSoar/kecheng-ai-training.git
git push -u origin main
```

3. **Settings → Pages → Source** 选择 **GitHub Actions**，自动部署 `site/`
4. 访问 `https://quantsoar.github.io/kecheng-ai-training/#/demo`

详细说明见 [DEPLOY.md](DEPLOY.md)。
