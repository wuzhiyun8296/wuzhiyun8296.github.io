@echo off
chcp 65001 >nul

:: 1. 清理旧端口，防止残留进程卡死
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

:: 2. 记录当前文件夹的绝对路径
set "CURRENT_DIR=%~dp0"

:: 3. 💡 核心修复：强制进入当前目录后再启动服务，彻底解决找不到文件的问题
mshta vbscript:CreateObject("WScript.Shell").Run("cmd /c cd /d """ & CURRENT_DIR & """ && node server.js",0)(window.close)
mshta vbscript:CreateObject("WScript.Shell").Run("cmd /c cd /d """ & CURRENT_DIR & """ && npm run dev",0)(window.close)

:: 4. 瞬间打开加载页面
start "" "%CURRENT_DIR%loading.html"
exit