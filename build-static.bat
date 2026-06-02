@echo off
chcp 65001 >nul
echo ========================================
echo   生成静态网站（可直接部署）
echo ========================================
echo.

cd /d "%~dp0frontend"

echo [1/4] 同步 Excel 数据...
call "%~dp0sync-data.bat"
echo.

echo [2/4] 生成 Excel 模板...
py -3.12 "%~dp0backend\generate_templates.py" 2>nul
if errorlevel 1 echo [提示] 模板生成跳过，可在数据管理页浏览器内下载
echo [3/4] 构建前端...
call npm run build
if errorlevel 1 (
  echo 构建失败
  pause
  exit /b 1
)

echo [4/4] 打包到 site 目录...
node scripts/prepare-site.mjs
if errorlevel 1 (
  echo 打包失败
  pause
  exit /b 1
)

echo.
echo ========================================
echo   静态站已就绪: %~dp0site
echo ========================================
echo   本地预览: serve-site.bat
echo   线上部署: 上传 site 目录全部文件
echo.
echo 云端数据（刷新后自动加载）:
echo   site\data\courses.xlsx           — 课程
echo   site\data\faculty.xlsx           — 师资
echo   site\data\jobs.xlsx              — 岗位映射
echo   site\data\certs.xlsx             — 竞赛·证书
echo   site\data\curriculum-design.xlsx — 课程体系设计
echo   site\data\data-config.json       — 数据配置
pause
