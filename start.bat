@echo off
chcp 65001 >nul
title 幻想写作系统 - 环境自动安装
color 0A

cd /d "%~dp0"

echo ===================================================
echo       🛠️ 幻想写作系统 环境安装向导
echo ===================================================
echo.

:: 1. 检查 Node.js 环境
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [⚠️ 警告] 未检测到 Node.js 运行环境！
    echo 正在为您自动下载安装包（约30MB）...
    echo 请在弹出的安装界面中一路点击 Next 完成安装。
    echo.
    pause
    
    curl -L -# -o node-installer.msi https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi
    if exist node-installer.msi (
        start /wait node-installer.msi
        echo.
        echo ✅ 安装完成！请【关闭本窗口】，然后重新双击 一键启动.vbs。
        pause
        del node-installer.msi
        exit
    ) else (
        echo ❌ 下载失败！请检查网络。
        pause
        exit
    )
)

:: 2. 检查依赖包
if not exist "node_modules" (
    echo [⚠️ 提示] 首次运行，正在为您自动下载依赖库（大概需要1-3分钟）...
    :: 自动切换国内镜像源加速，防止卡死
    call npm config set registry https://registry.npmmirror.com
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败，请检查网络后重试。
        pause
        exit
    )
)

echo.
echo ===================================================
echo 🎉 环境与依赖已经全部准备就绪！
echo 请【关闭本窗口】，以后直接双击 "一键启动.vbs" 即可瞬间进入系统。
echo ===================================================
pause