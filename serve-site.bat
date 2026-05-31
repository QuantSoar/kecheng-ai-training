@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

cd /d "%~dp0"

if not exist "site\index.html" (
  echo [错误] 未找到 site\index.html
  echo 请先运行 build-static.bat 生成静态站点
  pause
  exit /b 1
)

set PORT=8080

echo ========================================
echo   AI 课程图谱 - 本地静态预览
echo ========================================
echo.
echo 说明: 不能直接双击 index.html（file:// 会被浏览器拦截）
echo       本脚本会先启动 HTTP 服务，再打开浏览器
echo.

REM 先在新窗口启动服务器，避免浏览器抢在服务就绪前打开
set "SERVER_CMD="
where py >nul 2>&1
if !errorlevel!==0 set "SERVER_CMD=py -3.12 -m http.server %PORT% --directory "%~dp0site""

if not defined SERVER_CMD (
  where python >nul 2>&1
  if !errorlevel!==0 set "SERVER_CMD=cd /d "%~dp0site" && python -m http.server %PORT%""
)

if not defined SERVER_CMD (
  where npx >nul 2>&1
  if !errorlevel!==0 set "SERVER_CMD=npx --yes serve "%~dp0site" -l %PORT%""
)

if not defined SERVER_CMD (
  echo [错误] 未找到 Python 或 Node.js，无法启动本地服务器
  pause
  exit /b 1
)

echo [1/2] 启动 HTTP 服务 http://127.0.0.1:%PORT% ...
start "Kecheng-Static-Server" cmd /k "%SERVER_CMD%"

echo [2/2] 等待服务就绪...
timeout /t 2 /nobreak >nul

echo       打开浏览器...
start "" "http://127.0.0.1:%PORT%/"

echo.
echo 完成！
echo   地址: http://127.0.0.1:%PORT%/
echo   岗位图谱: http://127.0.0.1:%PORT%/#/jobs
echo.
echo 若仍打不开，等 2 秒后手动访问上面地址
echo 停止服务: 关闭标题为「Kecheng-Static-Server」的黑色窗口
echo.
pause
endlocal
