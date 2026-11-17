@echo off
chcp 936 >nul
setlocal EnableDelayedExpansion
title 幻想域设定集 - 安装与更新
color 0B

set "APPDIR=%~dp0"
if "%APPDIR:~-1%"=="\" set "APPDIR=%APPDIR:~0,-1%"
set "APPNAME=幻想域设定集"
set "AUTO=0"
set "FORCE_MODE="
if /i "%~1"=="/check" set "AUTO=1"
if /i "%~1"=="/y" set "AUTO=2"
if /i "%~1"=="/install" ( set "AUTO=2" & set "FORCE_MODE=1" )
if /i "%~1"=="/update" ( set "AUTO=2" & set "FORCE_MODE=2" )

set "UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
set "B_GITEE=https://gitee.com/amspace/wuzhiyun8296.github.io/raw/main"
set "B_GITHUB=https://raw.githubusercontent.com/wuzhiyun8296/wuzhiyun8296.github.io/main"
set "B_JSD=https://cdn.jsdelivr.net/gh/wuzhiyun8296/wuzhiyun8296.github.io@main"

:MAIN
cls
echo.
echo  ==============================================================
echo                幻想域设定集 - 安装 / 更新
echo  ==============================================================
echo    当前所在： %APPDIR%
echo.
echo    [1] 全新安装     复制到指定目录，装依赖，建桌面快捷方式
echo    [2] 更新已有版本 从 GitHub / Gitee 下载最新代码覆盖
echo    [3] 只检测环境   检查 Node.js / npm / 网络，不做修改
echo    [0] 退出
echo.

if "%AUTO%"=="2" (
  if defined FORCE_MODE ( set "MODE=%FORCE_MODE%" ) else ( set "MODE=2" )
  goto :RUN
)
if "%AUTO%"=="1" (
  set "MODE=3"
  goto :RUN
)

choice /c 1203 /n /m "  请选择 [1/2/0/3]: "
if errorlevel 4 set "MODE=3" & goto :RUN
if errorlevel 3 set "MODE=0" & goto :RUN
if errorlevel 2 set "MODE=2" & goto :RUN
if errorlevel 1 set "MODE=1" & goto :RUN
goto :MAIN

:RUN
if "%MODE%"=="0" exit /b 0

echo.
echo  [环境检测] ...

set "HASNODE=0"
where node >nul 2>nul && set "HASNODE=1"
if "%HASNODE%"=="0" goto :NODE_MISSING

set "NV="
for /f "delims=" %%v in ('node -v 2^>nul') do set "NV=%%v"
set "NV=!NV:v=!"
for /f "tokens=1 delims=." %%a in ("!NV!") do set "NMAJOR=%%a"
if not defined NMAJOR set "NMAJOR=0"
set "NPMV="
for /f "delims=" %%v in ('npm -v 2^>nul') do set "NPMV=%%v"

echo        [OK] Node.js : v!NV!
echo        [OK] npm     : v!NPMV!
if !NMAJOR! LSS 18 (
  echo        [!] 版本偏低，建议 18 以上，否则可能装不上依赖。
)

if "%MODE%"=="3" goto :CHECK_DONE
if "%MODE%"=="1" goto :INSTALL
if "%MODE%"=="2" goto :UPDATE
goto :MAIN

rem ============================================================
rem  模式 1：全新安装
rem ============================================================
:INSTALL
echo.
echo  [1/4] 选择安装位置
echo.
echo        默认： !LOCALAPPDATA!\!APPNAME!
echo        直接回车用默认，或粘贴别的路径（如 D:\FantasyWorld）
echo.

set "TARGET="
if "%AUTO%"=="2" (
  if defined INSTALL_DIR set "TARGET=%INSTALL_DIR%"
  goto :DIR_READY
)
set /p "TARGET=        安装到: "
:DIR_READY
if not defined TARGET set "TARGET=!LOCALAPPDATA!\!APPNAME!"
set "TARGET=!TARGET:"=!"
if "!TARGET:~-1!"=="\" set "TARGET=!TARGET:~0,-1!"

for %%a in ("!APPDIR!") do set "SRCL=%%~fa"
for %%a in ("!TARGET!") do set "TGL=%%~fa"
if /i "!SRCL!"=="!TGL!" (
  echo        [x] 不能装到安装包所在目录本身。
  goto :FAIL
)
set "SLEN=0"
for /l %%i in (1,1,120) do if not "!SRCL:~%%i,1!"=="" set "SLEN=%%i"
if /i "!TGL:~0,%SLEN%!"=="!SRCL!" (
  echo        [x] 不能装到安装包目录里面。
  goto :FAIL
)
echo        安装到： !TGL!

echo.
echo  [2/4] 复制程序文件 ...
if not exist "!TGL!" mkdir "!TGL!" >nul 2>nul
if not exist "!TGL!" (
  echo        [x] 目录创建失败，可能需要管理员权限。
  goto :FAIL
)
robocopy "!SRCL!" "!TGL!" /E /IS /IT /XD ".git" ".vitepress\cache" ".update_backup" /NFL /NDL /NJH /NJS /NP >nul
if not exist "!TGL!\一键启动.vbs" (
  echo        [x] 复制失败，目标目录里没有「一键启动.vbs」。
  goto :FAIL
)
echo        [OK] 文件已就位

echo.
echo  [3/4] 处理依赖 ...
if exist "!TGL!\node_modules\express" (
  echo        [OK] 依赖已随文件复制完成
  goto :INSTALL_LNK
)
echo        正在联网安装依赖（首次 1-3 分钟）...
call :PICK_REG
pushd "!TGL!"
call npm install --registry="!REG!" --no-audit --no-fund
popd
if exist "!TGL!\node_modules\express" (
  echo        [OK] 依赖安装完成
) else (
  echo        [!] 依赖可能没装全，稍后可手动执行：
  echo            cd /d "!TGL!" ^&^& npm install --registry=!REG!
)

:INSTALL_LNK
echo.
echo  [4/4] 创建桌面快捷方式 ...
call :MAKE_LNK "!TGL!"
echo.
echo  ==============================================================
echo                        安装完成
echo  ==============================================================
echo    安装目录： !TGL!
echo    启动方式： 桌面上的「%APPNAME%」快捷方式
echo.
if "%AUTO%"=="2" goto :THEEND
choice /c YN /n /m "  现在启动? [Y/N] "
if errorlevel 2 goto :THEEND
start "" "!TGL!\一键启动.vbs"
goto :THEEND

rem ============================================================
rem  模式 2：更新已有版本
rem ============================================================
:UPDATE
echo.
echo  [1/4] 选择要更新的程序目录
echo        直接回车 = 当前目录（%APPDIR%）
echo.

set "TARGET="
if "%AUTO%"=="2" (
  if defined UPDATE_DIR set "TARGET=%UPDATE_DIR%"
  goto :UP_DIR_READY
)
set /p "TARGET=        目录: "
:UP_DIR_READY
if not defined TARGET set "TARGET=!APPDIR!"
set "TARGET=!TARGET:"=!"
if "!TARGET:~-1!"=="\" set "TARGET=!TARGET:~0,-1!"
for %%a in ("!TARGET!") do set "TGL=%%~fa"

if not exist "!TGL!\server.js" (
  echo        [x] 这个目录里没有 server.js，不像是程序目录。
  goto :FAIL
)
if exist "!TGL!\.git" (
  echo.
  echo        [!] 这个目录带 .git，是开发者本地仓库。
  echo            更新会用仓库版本覆盖本地改动，建议先提交代码。
  if "%AUTO%"=="2" goto :UP_GO
  choice /c YN /n /m "        仍要继续? [Y/N] "
  if errorlevel 2 goto :FAIL
)
:UP_GO
echo        更新目录： !TGL!

echo.
echo  [2/4] 检测下载通道 ...
set "BASE1="
set "BASE2="
set "BASE3="
call :PROBE "!B_GITEE!/version.json"
if not errorlevel 1 set "BASE1=!B_GITEE!" & set "CH1=Gitee"
call :PROBE "!B_GITHUB!/version.json"
if not errorlevel 1 (
  if not defined BASE1 ( set "BASE1=!B_GITHUB!" & set "CH1=GitHub" ) else ( set "BASE2=!B_GITHUB!" & set "CH2=GitHub" )
)
call :PROBE "!B_JSD!/version.json"
if not errorlevel 1 (
  if not defined BASE1 ( set "BASE1=!B_JSD!" & set "CH1=jsDelivr" ) else (
    if not defined BASE2 ( set "BASE2=!B_JSD!" & set "CH2=jsDelivr" ) else ( set "BASE3=!B_JSD!" & set "CH3=jsDelivr" )
  )
)

if not defined BASE1 (
  echo        [x] Gitee / GitHub / jsDelivr 都连不上。
  echo            请检查网络后再试。
  goto :FAIL
)
echo        [OK] 主通道： !CH1!
if defined CH2 echo        备用： !CH2!
if defined CH3 echo        备用： !CH3!

echo.
echo  [3/4] 下载文件清单 ...
set "LIST=%TEMP%\fw_update_files.txt"
if exist "!LIST!" del /f /q "!LIST!" >nul 2>nul
call :FETCH "update-files.txt" "!LIST!"
if not exist "!LIST!" (
  echo        [x] 拿不到 update-files.txt，无法更新。
  goto :FAIL
)
for %%A in ("!LIST!") do if %%~zA LSS 50 (
  echo        [x] 文件清单内容异常。
  goto :FAIL
)
set /a TOTAL=0
for /f "usebackq delims=" %%C in ("!LIST!") do set /a TOTAL+=1
echo        [OK] 共 !TOTAL! 个文件

echo.
echo  [4/4] 备份并覆盖 ...
set "D=%DATE:~0,10%"
set "D=!D:/=-!"
set "D=!D:.=-!"
set "T=%TIME:~0,8%"
set "T=!T::=-!"
set "T=!T: =0!"
set "BK=!TGL!\_更新前备份_!D!_!T!"
mkdir "!BK!" >nul 2>nul
if exist "!TGL!\server.js"      copy /y "!TGL!\server.js"      "!BK!\" >nul
if exist "!TGL!\admin.html"     copy /y "!TGL!\admin.html"     "!BK!\" >nul
if exist "!TGL!\package.json"   copy /y "!TGL!\package.json"   "!BK!\" >nul
if exist "!TGL!\version.json"   copy /y "!TGL!\version.json"   "!BK!\" >nul
if exist "!TGL!\update-config.json" copy /y "!TGL!\update-config.json" "!BK!\" >nul
if exist "!TGL!\plugin" robocopy "!TGL!\plugin" "!BK!\plugin" /E /NJH /NJS /NDL /NC /NS /NP >nul
echo        已备份到： !BK!

pushd "!TGL!"
set /a OKN=0
set /a FAILN=0
for /f "usebackq delims=" %%F in ("!LIST!") do (
  if not "%%F"=="" (
    set "REL=%%F"
    set "REL=!REL:/=\!"
    for %%D in ("!REL!") do set "DIR=%%~dpD"
    if not "!DIR!"=="" if not exist "!DIR!" mkdir "!DIR!" >nul 2>nul
    set "GOT=0"
    if defined BASE1 call :GET1 "%%F" "!REL!" && set "GOT=1"
    if "!GOT!"=="0" if defined BASE2 call :GET2 "%%F" "!REL!" && set "GOT=1"
    if "!GOT!"=="0" if defined BASE3 call :GET3 "%%F" "!REL!" && set "GOT=1"
    if "!GOT!"=="0" (
      set /a FAILN+=1
      echo   [失败] %%F
    ) else (
      set /a OKN+=1
    )
  )
)
popd

echo.
echo  ==============================================================
echo                        更新完成
echo  ==============================================================
echo    成功： !OKN! 个文件
echo    失败： !FAILN! 个文件
echo    备份： !BK!
echo.
if exist "!TGL!\version.json" (
  echo    当前版本：
  type "!TGL!\version.json"
  echo.
)
echo    数据没有被改动：
echo      library\                  小说章节
echo      website\docs\public\      设定、人物、时间线
echo      update-config.json        更新源配置
echo.
echo    接下来：关掉正在运行的黑窗口，重新双击「一键启动.vbs」
echo    出问题就把备份文件夹里的东西复制回去回滚。
echo.
goto :THEEND

rem ============================================================
rem  只检测环境
rem ============================================================
:CHECK_DONE
echo.
echo  [网络] 检测更新通道 ...
call :PROBE "!B_GITEE!/version.json"
if not errorlevel 1 (echo        [OK] Gitee 可用) else (echo        [--] Gitee 不可用)
call :PROBE "!B_GITHUB!/version.json"
if not errorlevel 1 (echo        [OK] GitHub 可用) else (echo        [--] GitHub 不可用)
call :PROBE "https://registry.npmmirror.com/express"
if not errorlevel 1 (echo        [OK] 国内 npm 镜像可用) else (echo        [--] 国内 npm 镜像不可用)
call :PROBE "https://registry.npmjs.org/express"
if not errorlevel 1 (echo        [OK] 官方 npm 源可用) else (echo        [--] 官方 npm 源不可用)
echo.
echo  环境检测完毕。
pause
exit /b 0

rem ============================================================
rem  子过程
rem ============================================================
:PROBE
curl -s -o NUL --max-time 6 -A "%UA%" "%~1" >nul 2>nul
exit /b %errorlevel%

:PICK_REG
set "REG=https://registry.npmmirror.com"
curl -s -o NUL --max-time 5 "https://registry.npmmirror.com/express" >nul 2>nul
if not errorlevel 1 exit /b 0
set "REG=https://registry.npmjs.org"
exit /b 0

:MAKE_LNK
set "LNKVBS=%TEMP%\__fw_mklink.vbs"
if exist "!LNKVBS!" del /f /q "!LNKVBS!" >nul 2>nul
>>"!LNKVBS!" echo Set ws = CreateObject("WScript.Shell")
>>"!LNKVBS!" echo desk = ws.SpecialFolders("Desktop")
>>"!LNKVBS!" echo Set lnk = ws.CreateShortcut(desk ^& "\%APPNAME%.lnk")
>>"!LNKVBS!" echo lnk.TargetPath = "%~1\一键启动.vbs"
>>"!LNKVBS!" echo lnk.WorkingDirectory = "%~1"
>>"!LNKVBS!" echo lnk.IconLocation = "%~1\icon3.ico,0"
>>"!LNKVBS!" echo lnk.Description = "%APPNAME% - 本地世界观写作系统"
>>"!LNKVBS!" echo lnk.Save
cscript //nologo "!LNKVBS!" >nul 2>nul
del /f /q "!LNKVBS!" >nul 2>nul
echo        [OK] 桌面快捷方式已创建
exit /b 0

rem 从任意可用通道取一个文件
:FETCH
set "GOT="
if defined BASE1 call :GET1 "%~1" "%~2" && set "GOT=1"
if not defined GOT if defined BASE2 call :GET2 "%~1" "%~2" && set "GOT=1"
if not defined GOT if defined BASE3 call :GET3 "%~1" "%~2" && set "GOT=1"
exit /b 0

:GET1
curl -L --fail --silent --show-error -A "%UA%" --connect-timeout 15 --max-time 90 -o "%~2" "!BASE1!/%~1" >nul 2>nul
exit /b %errorlevel%
:GET2
curl -L --fail --silent --show-error -A "%UA%" --connect-timeout 15 --max-time 90 -o "%~2" "!BASE2!/%~1" >nul 2>nul
exit /b %errorlevel%
:GET3
curl -L --fail --silent --show-error -A "%UA%" --connect-timeout 15 --max-time 90 -o "%~2" "!BASE3!/%~1" >nul 2>nul
exit /b %errorlevel%

rem ============================================================
rem  Node.js 缺失：自动下载安装包并打开
rem ============================================================
:NODE_MISSING
echo.
echo        [x] 没有检测到 Node.js，需要先装上它（本程序靠它跑起来）。
echo.
echo            [1] 自动下载并打开安装包（推荐，约 30MB）
echo            [2] 只打开官网下载页，我自己装
echo            [0] 退出
echo.

if "%AUTO%"=="2" (
  set "NB=1"
) else (
  choice /c 120 /n /m "        请选择: "
  set "NB=!errorlevel!"
)

if "!NB!"=="3" goto :FAIL
if "!NB!"=="2" (
  start "" "https://npmmirror.com/mirrors/node/"
  echo.
  echo        下载页已打开，装好后重新运行本程序。
  pause
  exit /b 1
)

call :GET_NODE
if errorlevel 1 goto :FAIL
echo.
echo        Node.js 安装程序已打开，请一路「下一步」装完。
echo        装好后重新双击本程序继续（安装 / 更新）。
echo.
pause
exit /b 1

:GET_NODE
set "ARCH=x64"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARCH=arm64"
if /i "%PROCESSOR_ARCHITECTURE%"=="x86" set "ARCH=x86"
echo.
echo        [检测] 系统架构： !ARCH!
echo        [检测] 正在查找可用的 Node.js LTS 安装包 ...

set "NODEVER="
set "SRCNAME="
for %%v in (v22.20.0 v22.19.0 v22.18.0 v22.17.1 v22.16.0 v22.15.0 v20.18.1 v20.18.0) do (
  if not defined NODEVER (
    for /f %%c in ('curl -sL -r 0-0 -o NUL -w "%%{http_code}" --max-time 8 "https://npmmirror.com/mirrors/node/%%v/node-%%v-!ARCH!.msi" 2^>nul') do (
      if "%%c"=="206" ( set "NODEVER=%%v" & set "SRCNAME=国内镜像" )
    )
  )
)
if not defined NODEVER (
  for %%v in (v22.20.0 v22.19.0 v22.18.0 v22.17.1 v22.16.0 v22.15.0 v20.18.1 v20.18.0) do (
    if not defined NODEVER (
      for /f %%c in ('curl -sL -r 0-0 -o NUL -w "%%{http_code}" --max-time 8 "https://nodejs.org/dist/%%v/node-%%v-!ARCH!.msi" 2^>nul') do (
        if "%%c"=="206" ( set "NODEVER=%%v" & set "SRCNAME=官方源" )
      )
    )
  )
)
if not defined NODEVER (
  echo        [x] 没找到可下载的安装包，请手动到 https://nodejs.org/zh-cn 下载。
  exit /b 1
)

echo        [OK] 安装包： !NODEVER!  来源： !SRCNAME!
set "MSI=%TEMP%\node-!NODEVER!-!ARCH!.msi"
if "!SRCNAME!"=="国内镜像" set "U1=https://npmmirror.com/mirrors/node/!NODEVER!/node-!NODEVER!-!ARCH!.msi"
if "!SRCNAME!"=="官方源" set "U1=https://nodejs.org/dist/!NODEVER!/node-!NODEVER!-!ARCH!.msi"
if exist "!MSI!" del /f /q "!MSI!" >nul 2>nul

echo.
echo        正在下载（约 30MB，下面会显示进度条）...
curl -L --fail --progress-bar -A "%UA%" --connect-timeout 20 -o "!MSI!" "!U1!"
if not exist "!MSI!" (
  echo        [x] 下载失败，请检查网络后重试。
  exit /b 1
)
for %%A in ("!MSI!") do if %%~zA LSS 10000000 (
  del /f /q "!MSI!" >nul 2>nul
  echo        [x] 下载到的文件不完整，请重试。
  exit /b 1
)
echo        [OK] 下载完成，正在打开安装程序...
start "" "!MSI!"
exit /b 0

rem ============================================================
rem  异常出口
rem ============================================================
:FAIL
echo.
echo  --------------------------------------------------------------
echo   操作已中止（没有对系统做破坏性修改）。
echo  --------------------------------------------------------------
echo.
if "%AUTO%"=="2" exit /b 1
pause
exit /b 1

:THEEND
if "%AUTO%"=="2" exit /b 0
echo.
echo  按任意键关闭本窗口。
pause >nul
exit /b 0
