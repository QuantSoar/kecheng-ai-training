@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ========================================
echo   用系统浏览器打开开发站点
echo   （请勿使用 Cursor 内嵌预览，会报 iframe 错误）
echo ========================================
echo.

set READY=0
for /L %%i in (1,1,20) do (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 2).StatusCode | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
  if !errorlevel!==0 (
    set READY=1
    goto :open
  )
  if %%i==1 (
    echo [提示] 5173 未就绪，正在尝试启动前端...
    start "Kecheng-Web" cmd /k "cd /d %~dp0frontend && npm run dev"
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing -TimeoutSec 2).StatusCode | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if !errorlevel! neq 0 (
      start "Kecheng-API" cmd /k "cd /d %~dp0backend && py -3.12 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
    )
  )
  timeout /t 1 /nobreak >nul
)

:open
if !READY!==1 (
  echo [OK] 正在用默认浏览器打开 http://127.0.0.1:5173/
  start "" "http://127.0.0.1:5173/"
) else (
  echo [失败] 5173 仍无法访问。请检查「Kecheng-Web」窗口是否有报错。
  echo        或改用静态预览: serve-site.bat （8080 端口）
)

echo.
pause
endlocal
