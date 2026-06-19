@echo off
chcp 65001 >nul
echo ========================================
echo    📥 一键拉取最新代码
echo ========================================
echo.

cd /d "%~dp0"

echo 🔍 正在检查 Git...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Git！请先安装 Git。
    echo 下载地址：https://git-scm.com/downloads
    echo.
    pause
    exit /b 1
)

echo ✅ Git 已就绪
echo.
echo 📥 正在拉取最新代码...
echo.

git pull origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    ✅ 拉取成功！
    echo ========================================
) else (
    echo.
    echo ========================================
    echo    ❌ 拉取失败！
    echo ========================================
    echo.
    echo 可能的原因：
    echo 1. 网络问题
    echo 2. 本地有未提交的修改
    echo 3. Git 配置问题
    echo.
    echo 如果有未提交的修改，可以先运行 push.bat 上传
)

echo.
pause
