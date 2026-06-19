@echo off
chcp 65001 >nul
echo ========================================
echo    📤 一键上传代码到 GitHub
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

:: 获取当前时间作为提交信息
for /f "tokens=2 delims==" %%i in ('wmic os get localdatetime /value') do set datetime=%%i
set datetime=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2% %datetime:~8,2%:%datetime:~10,2%

echo 📝 正在添加修改...
git add .

echo 💾 正在提交修改...
git commit -m "更新：%datetime%"

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  没有检测到新的修改，或者提交失败
    echo.
    pause
    exit /b 1
)

echo.
echo 🚀 正在推送到 GitHub...
echo.

git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    ✅ 上传成功！
    echo ========================================
    echo.
    echo 提交时间：%datetime%
) else (
    echo.
    echo ========================================
    echo    ❌ 上传失败！
    echo ========================================
    echo.
    echo 可能的原因：
    echo 1. 网络问题
    echo 2. 远程仓库有更新，先运行"一键拉取.bat"
    echo 3. Git 权限问题
    echo.
    echo 建议：先运行"一键拉取.bat"更新本地代码
)

echo.
pause
