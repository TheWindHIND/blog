@echo off
chcp 65001 >nul
echo ========================================
echo    一键拉取最新代码
echo ========================================
echo.
cd /d "%~dp0"
echo [1/3] 正在检查 Git...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Git，请先安装 Git！
    echo 下载地址：https://git-scm.com/downloads
    echo.
    pause
    exit /b 1
)
echo [OK] Git 已安装
echo.
echo [2/3] 正在拉取最新代码...
echo.
git pull origin main
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    [成功] 拉取成功！
    echo ========================================
) else (
    echo.
    echo ========================================
    echo    [错误] 拉取失败！
    echo ========================================
    echo.
    echo 可能的原因：
    echo 1. 网络问题
    echo 2. 本地有未提交的修改
    echo 3. Git 配置问题
    echo.
    echo 如果有未提交的修改，请先运行 一键上传.bat
)
echo.
pause
