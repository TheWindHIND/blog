@echo off
chcp 936 >nul
echo ========================================
echo    一键部署网站到 GitHub Pages
echo ========================================
echo.
cd /d "%~dp0"

:: 检查 Node.js
echo [1/6] 正在检查 Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js！
    echo 下载地址：https://nodejs.org/  建议下载 LTS 版本
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js 已安装
echo.

:: 检查 Git
echo [2/6] 正在检查 Git...
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

:: 同步控制面板内容到博客前端
echo [3/6] 正在同步控制面板内容...
echo.

:: 同步站点配置
echo   同步站点配置...
copy /y "my-blog-manager\siteConfig.ts" "XHBlogs\siteConfig.ts" >nul

:: 同步关于页面
echo   同步关于页面...
if exist "my-blog-manager\app\about\about.md" (
    copy /y "my-blog-manager\app\about\about.md" "XHBlogs\app\about\about.md" >nul
)

:: 同步文章（先清空再复制，确保删除的内容也同步）
echo   同步文章...
if exist "XHBlogs\posts" (
    del /q "XHBlogs\posts\*.md" 2>nul
)
if exist "my-blog-manager\posts" (
    xcopy /e /y /q "my-blog-manager\posts\*" "XHBlogs\posts\" >nul 2>nul
)

:: 同步说说（先清空再复制）
echo   同步说说...
if exist "XHBlogs\moments" (
    del /q "XHBlogs\moments\*.md" 2>nul
)
if exist "my-blog-manager\moments" (
    xcopy /e /y /q "my-blog-manager\moments\*" "XHBlogs\moments\" >nul 2>nul
)

:: 同步杂谈（先清空再复制）
echo   同步杂谈...
if exist "XHBlogs\chatters" (
    del /q "XHBlogs\chatters\*.md" 2>nul
)
if exist "my-blog-manager\chatters" (
    xcopy /e /y /q "my-blog-manager\chatters\*" "XHBlogs\chatters\" >nul 2>nul
)

:: 检查杂谈目录是否为空，如果为空则创建一个占位文件
if not exist "XHBlogs\chatters\*.md" (
    echo --- > "XHBlogs\chatters\welcome.md"
    echo title: 欢迎来到云端杂谈 >> "XHBlogs\chatters\welcome.md"
    echo date: "2026-06-20" >> "XHBlogs\chatters\welcome.md"
    echo tags: >> "XHBlogs\chatters\welcome.md"
    echo   - 杂谈 >> "XHBlogs\chatters\welcome.md"
    echo   - 欢迎 >> "XHBlogs\chatters\welcome.md"
    echo --- >> "XHBlogs\chatters\welcome.md"
    echo. >> "XHBlogs\chatters\welcome.md"
    echo 这里是藏枫的云端杂谈，以后会在这里分享一些日常和想法~ >> "XHBlogs\chatters\welcome.md"
)

:: 同步数据文件（相册、友链、项目等）
echo   同步数据文件...
if exist "my-blog-manager\data" (
    xcopy /e /y /q "my-blog-manager\data\*" "XHBlogs\data\" >nul 2>nul
)

echo.
echo [OK] 同步完成
echo.

:: 进入 XHBlogs 目录
echo [4/6] 进入博客目录...
cd XHBlogs

:: 安装依赖
if not exist "node_modules" (
    echo.
    echo [提示] 正在安装依赖，第一次运行需要几分钟...
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
echo [5/6] 正在构建网站...
echo.
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo    [错误] 构建失败！
    echo ========================================
    echo.
    echo 请查看上面的错误信息，或联系开发者
    echo.
    pause
    exit /b 1
)
echo.
echo [OK] 构建成功！
echo.

:: 进入 out 目录，部署
echo [6/6] 正在部署到 GitHub Pages...
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
    echo    [成功] 部署完成！
    echo ========================================
    echo.
    echo 你的博客访问地址：
    echo https://TheWindHIND.github.io/blog/
    echo.
    echo 注意：GitHub Pages 可能需要几分钟才能生效
    echo 如果没看到更新，按 Ctrl+F5 强制刷新浏览器
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
