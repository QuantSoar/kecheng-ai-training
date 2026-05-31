@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   发布到 GitHub
echo ========================================
echo.

where gh >nul 2>&1
if errorlevel 1 (
  echo [错误] 未找到 GitHub CLI，请先安装: winget install GitHub.cli
  pause
  exit /b 1
)

gh auth status >nul 2>&1
if errorlevel 1 (
  echo 请先登录 GitHub（浏览器会打开授权页）...
  gh auth login --hostname github.com --git-protocol ssh --web
  if errorlevel 1 (
    echo 登录失败，请重试
    pause
    exit /b 1
  )
)

set REPO=kecheng-ai-training
echo 将创建/更新仓库: QuantSoar/%REPO%
echo.

gh repo view QuantSoar/%REPO% >nul 2>&1
if errorlevel 1 (
  echo [1/2] 创建远程仓库...
  gh repo create %REPO% --public --source=. --remote=origin --description "人工智能实训基地 · 课程图谱与培养资源匹配系统"
) else (
  echo [1/2] 远程仓库已存在，绑定 origin...
  git remote remove origin 2>nul
  git remote add origin git@github.com:QuantSoar/%REPO%.git
)

echo [2/2] 推送 main 分支...
git push -u origin main
if errorlevel 1 (
  echo 推送失败
  pause
  exit /b 1
)

echo.
echo ========================================
echo   完成
echo ========================================
echo   代码: https://github.com/QuantSoar/%REPO%
echo   启用 Pages: Settings - Pages - Source 选 GitHub Actions
echo   站点地址: https://quantsoar.github.io/%REPO%/
echo   大屏演示: https://quantsoar.github.io/%REPO%/#/demo
echo.
pause
