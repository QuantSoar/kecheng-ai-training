@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo ========================================
echo   AI 领域课程图谱 - 本地开发
echo ========================================
echo.

echo [0/3] 同步 Excel 到 frontend/public/data ...
call "%~dp0sync-data.bat"
echo.

echo [1/3] 启动后端 API (端口 8000)...
start "Kecheng-API" cmd /k "cd /d %~dp0backend && py -3.12 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/3] 启动前端 (端口 5173)...
start "Kecheng-Web" cmd /k "cd /d %~dp0frontend && npm run dev"

echo       等待前端就绪（最多 30 秒）...
set READY=0
for /L %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 1).StatusCode | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
  if !errorlevel!==0 (
    set READY=1
    goto :open_browser
  )
  timeout /t 1 /nobreak >nul
)

:open_browser
if !READY!==1 (
  echo [3/3] 前端已就绪，打开浏览器...
  start "" "http://localhost:5173/"
) else (
  echo [3/3] 前端尚未就绪，请查看「Kecheng-Web」窗口是否有报错
  echo       就绪后手动访问: http://localhost:5173/
)

echo.
echo ========================================
echo   开发模式（原项目）
echo ========================================
echo   总览:     http://localhost:5173/
echo   岗位图谱: http://localhost:5173/#/jobs
echo   大屏:     http://localhost:5173/#/demo
echo   后端文档: http://127.0.0.1:8000/docs
echo.
echo   若 5173 无法访问:
echo     1. 看「Kecheng-Web」窗口是否显示 VITE ready
echo     2. 或改用静态预览: serve-site.bat （8080 端口）
echo.
echo   上线: build-static.bat → 上传 site/ 目录
echo ========================================
echo.
pause
endlocal
