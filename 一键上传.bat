@echo off
chcp 65001 >nul
echo ========================================
echo    📤 一键上传代码到 GitHub main分支
echo ========================================
echo.

:: 切换到脚本所在目录
cd /d "%~dp0"

echo 🔍 正在检查 Git 环境...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Git！请先安装 Git。
    echo 下载地址：https://git-scm.com/downloads
    echo.
    pause
    exit /b 1
)
echo ✅ Git 环境就绪
echo.

:: 生成时间戳提交信息
for /f "tokens=2 delims==" %%i in ('wmic os get localdatetime /value') do set datetime=%%i
set datetime=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2% %datetime:~8,2%:%datetime:~10,2%

echo 📥 第一步：拉取远程最新代码，避免冲突
git pull origin main
if %errorlevel% neq 0 (
    echo ⚠️ 拉取远程代码失败，存在代码冲突，请手动处理！
    echo.
    pause
    exit /b 1
)
echo ✅ 远程代码同步完成
echo.

echo 📝 第二步：添加全部本地修改文件
git add .

echo 💾 第三步：提交本地变更（时间戳备注）
git commit -m "自动更新：%datetime%"
:: 无文件修改时commit会报错，不中断脚本，跳过推送判断
if %errorlevel% equ 0 (
    set HAS_CHANGE=1
) else (
    set HAS_CHANGE=0
    echo ⚠️ 未检测到任何文件修改，无需推送
)

echo.
if %HAS_CHANGE% equ 1 (
    echo 🚀 第四步：推送至 GitHub main 分支
    git push origin main
    if %errorlevel% equ 0 (
        echo.
        echo ========================================
        echo    ✅ 代码上传成功！
        echo    提交时间：%datetime%
        echo ========================================
    ) else (
        echo.
        echo ========================================
        echo    ❌ 推送GitHub失败！
        echo ========================================
        echo 排查方向：
        echo 1. 网络连接GitHub超时，切换热点重试
        echo 2. SSH密钥未配置，无法鉴权
        echo 3. 远程仓库存在强制提交，需手动合并
    )
)

echo.
pause
