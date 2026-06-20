@echo off
chcp 65001 >nul
echo ========================================
echo    一键上传代码到 GitHub
echo ========================================
echo.
cd /d "%~dp0"
echo [1/4] 正在检查 Git...
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
:: 获取当前时间作为提交信息
for /f "tokens=2 delims==" %%i in ('wmic os get localdatetime /value') do set datetime=%%i
set datetime=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2% %datetime:~8,2%:%datetime:~10,2%
echo [2/4] 正在添加修改...
git add .
echo [3/4] 正在提交修改...
git commit -m "更新：%datetime%"
if %errorlevel% neq 0 (
    echo.
    echo [错误] 没有检测到新的修改，提交失败
    echo.
    pause
    exit /b 1
)
echo.
echo [4/4] 正在推送到 GitHub...
echo.
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    [成功] 上传成功！
    echo ========================================
    echo.
    echo 提交时间：%datetime%
) else (
    echo.
    echo ========================================
    echo    [错误] 上传失败！
    echo ========================================
    echo.
    echo 可能的原因：
    echo 1. 网络问题
    echo 2. 远程仓库有更新，请先运行 一键拉取.bat
    echo 3. Git 权限问题
    echo.
    echo 提示：请先运行 一键拉取.bat 同步后再上传
)
echo.
pause
