@echo off
chcp 65001 >nul
REM 将项目根目录 Excel 同步到 frontend/public/data（开发）与 site/data（静态站）
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "PUB=%~dp0frontend\public\data"
set "SITE=%~dp0site\data"
mkdir "%PUB%" 2>nul
mkdir "%SITE%" 2>nul

set SYNCED=0

if exist "%~dp0courses.xlsx" (
  copy /Y "%~dp0courses.xlsx" "%PUB%\courses.xlsx" >nul
  if exist "%SITE%" copy /Y "%~dp0courses.xlsx" "%SITE%\courses.xlsx" >nul
  echo [同步] courses.xlsx
  set SYNCED=1
)

for %%F in ("%~dp0courses_*.xlsx") do (
  set "FN=%%~nxF"
  if not "!FN!"=="~$*" (
    if not "!FN:~0,2!"=="~$" (
      copy /Y "%%F" "%PUB%\courses.xlsx" >nul
      if exist "%SITE%" copy /Y "%%F" "%SITE%\courses.xlsx" >nul
      echo [同步] courses.xlsx ^<- %%~nxF
      set SYNCED=1
    )
  )
)

for %%F in ("%~dp0*课程*.xlsx") do (
  set "FN=%%~nxF"
  if "!FN:课程体系设计=!"=="!FN!" (
    if not "!FN!"=="~$*" (
      if not "!FN:~0,2!"=="~$" (
        copy /Y "%%F" "%PUB%\courses.xlsx" >nul
        if exist "%SITE%" copy /Y "%%F" "%SITE%\courses.xlsx" >nul
        echo [同步] courses.xlsx ^<- %%~nxF
        set SYNCED=1
      )
    )
  )
)

if exist "%~dp0faculty.xlsx" (
  copy /Y "%~dp0faculty.xlsx" "%PUB%\faculty.xlsx" >nul
  if exist "%SITE%" copy /Y "%~dp0faculty.xlsx" "%SITE%\faculty.xlsx" >nul
  echo [同步] faculty.xlsx
  set SYNCED=1
)

for %%F in ("%~dp0faculty_*.xlsx") do (
  set "FN=%%~nxF"
  if not "!FN!"=="~$*" (
    if not "!FN:~0,2!"=="~$" (
      copy /Y "%%F" "%PUB%\faculty.xlsx" >nul
      if exist "%SITE%" copy /Y "%%F" "%SITE%\faculty.xlsx" >nul
      echo [同步] faculty.xlsx ^<- %%~nxF
      set SYNCED=1
    )
  )
)

for %%F in ("%~dp0*师资*.xlsx") do (
  set "FN=%%~nxF"
  if not "!FN!"=="~$*" (
    if not "!FN:~0,2!"=="~$" (
      copy /Y "%%F" "%PUB%\faculty.xlsx" >nul
      if exist "%SITE%" copy /Y "%%F" "%SITE%\faculty.xlsx" >nul
      echo [同步] faculty.xlsx ^<- %%~nxF
      set SYNCED=1
    )
  )
)

if exist "%~dp0jobs.xlsx" (
  copy /Y "%~dp0jobs.xlsx" "%PUB%\jobs.xlsx" >nul
  if exist "%SITE%" copy /Y "%~dp0jobs.xlsx" "%SITE%\jobs.xlsx" >nul
  echo [同步] jobs.xlsx
  set SYNCED=1
)

for %%F in ("%~dp0*岗位*.xlsx") do (
  set "FN=%%~nxF"
  if not "!FN!"=="~$*" (
    if not "!FN:~0,2!"=="~$" (
      copy /Y "%%F" "%PUB%\jobs.xlsx" >nul
      if exist "%SITE%" copy /Y "%%F" "%SITE%\jobs.xlsx" >nul
      echo [同步] jobs.xlsx ^<- %%~nxF
      set SYNCED=1
    )
  )
)

if exist "%~dp0certs.xlsx" (
  copy /Y "%~dp0certs.xlsx" "%PUB%\certs.xlsx" >nul
  if exist "%SITE%" copy /Y "%~dp0certs.xlsx" "%SITE%\certs.xlsx" >nul
  echo [同步] certs.xlsx
  set SYNCED=1
)

for %%F in ("%~dp0*竞赛*.xlsx") do (
  set "FN=%%~nxF"
  if not "!FN!"=="~$*" (
    if not "!FN:~0,2!"=="~$" (
      copy /Y "%%F" "%PUB%\certs.xlsx" >nul
      if exist "%SITE%" copy /Y "%%F" "%SITE%\certs.xlsx" >nul
      echo [同步] certs.xlsx ^<- %%~nxF
      set SYNCED=1
    )
  )
)

for %%F in ("%~dp0*证书*.xlsx") do (
  set "FN=%%~nxF"
  if not "!FN!"=="~$*" (
    if not "!FN:~0,2!"=="~$" (
      copy /Y "%%F" "%PUB%\certs.xlsx" >nul
      if exist "%SITE%" copy /Y "%%F" "%SITE%\certs.xlsx" >nul
      echo [同步] certs.xlsx ^<- %%~nxF
      set SYNCED=1
    )
  )
)

if exist "%~dp0curriculum-design.xlsx" (
  copy /Y "%~dp0curriculum-design.xlsx" "%PUB%\curriculum-design.xlsx" >nul
  if exist "%SITE%" copy /Y "%~dp0curriculum-design.xlsx" "%SITE%\curriculum-design.xlsx" >nul
  echo [同步] curriculum-design.xlsx
  set SYNCED=1
)

for %%F in ("%~dp0*课程体系设计*.xlsx") do (
  set "FN=%%~nxF"
  if not "!FN!"=="~$*" (
    if not "!FN:~0,2!"=="~$" (
      copy /Y "%%F" "%PUB%\curriculum-design.xlsx" >nul
      if exist "%SITE%" copy /Y "%%F" "%SITE%\curriculum-design.xlsx" >nul
      echo [同步] curriculum-design.xlsx ^<- %%~nxF
      set SYNCED=1
    )
  )
)

if exist "%PUB%\data-config.json" (
  if exist "%SITE%" copy /Y "%PUB%\data-config.json" "%SITE%\data-config.json" >nul
)

if %SYNCED%==0 (
  echo [提示] 根目录未找到 courses / faculty / jobs / certs / curriculum-design 等 Excel
  echo        可将 Excel 放到项目根目录后重新运行
)

endlocal
