@echo off
chcp 936 >nul
echo ========================================
echo    一键构建并部署到 GitHub Pages
echo ========================================
echo.

cd /d "%~dp0"

:: 检查 Node.js
echo [1/5] 正在检查 Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js！请先安装 Node.js。
    echo 下载地址：https://nodejs.org/（建议下载 LTS 版本）
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js 已就绪
echo.

:: 检查 Git
echo [2/5] 正在检查 Git...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Git！请先安装 Git。
    echo 下载地址：https://git-scm.com/downloads
    echo.
    pause
    exit /b 1
)

echo [OK] Git 已就绪
echo.

:: 进入 XHBlogs 目录
echo [3/5] 进入博客目录...
cd XHBlogs

:: 检查依赖
if not exist "node_modules" (
    echo.
    echo [警告] 正在安装依赖（第一次运行需要几分钟）...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 依赖安装失败！
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [OK] 依赖安装完成
    echo.
)

:: 构建
echo [4/5] 正在构建博客...
echo.
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo    [错误] 构建失败！
    echo ========================================
    echo.
    echo 请检查错误信息，或者联系开发者
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] 构建成功！
echo.

:: 进入 out 目录并部署
echo [5/5] 正在部署到 GitHub Pages...
echo.

cd out

:: 初始化 git
if not exist ".git" (
    git init
    git config user.email "blog@example.com"
    git config user.name "Blog Owner"
)

git add .
git commit -m "部署更新"

:: 设置远程仓库地址
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    git remote add origin https://github.com/TheWindHIND/blog.git
)

git branch -M gh-pages
git push -u origin gh-pages --force

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    [成功] 部署成功！
    echo ========================================
    echo.
    echo 你的博客地址：
    echo https://TheWindHIND.github.io/blog/
    echo.
    echo 注意：GitHub Pages 可能需要几分钟才能生效
    echo 如果看不到更新，请按 Ctrl+F5 强制刷新浏览器
) else (
    echo.
    echo ========================================
    echo    [错误] 部署失败！
    echo ========================================
    echo.
    echo 可能的原因：
    echo 1. 网络问题
    echo 2. Git 权限问题（需要配置 token）
    echo 3. 仓库地址错误
    echo.
    echo 如果是权限问题，请参考 Git Token 配置教程
)

echo.
pause
