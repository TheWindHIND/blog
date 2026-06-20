@echo off
chcp 65001 >nul
echo ========================================
echo    一键部署网站到 GitHub Pages
echo    （完整同步 + 构建 + 部署 + 推送源码）
echo ========================================
echo.
cd /d "%~dp0"

:: 检查 Node.js
echo [1/8] 正在检查 Node.js...
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
echo [2/8] 正在检查 Git...
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

:: ========================================
:: 同步控制面板内容到博客前端
:: ========================================
echo [3/8] 正在同步控制面板内容...
echo.

:: 1. 同步站点配置
echo   [1/10] 同步站点配置...
copy /y "my-blog-manager\siteConfig.ts" "XHBlogs\siteConfig.ts" >nul

:: 2. 同步关于页面
echo   [2/10] 同步关于页面...
if exist "my-blog-manager\app\about\about.md" (
    copy /y "my-blog-manager\app\about\about.md" "XHBlogs\app\about\about.md" >nul
)

:: 3. 同步文章（先清空再复制，确保删除的内容也同步）
echo   [3/10] 同步文章...
if exist "XHBlogs\posts" (
    del /q "XHBlogs\posts\*.md" 2>nul
)
if exist "my-blog-manager\posts" (
    xcopy /e /y /q "my-blog-manager\posts\*" "XHBlogs\posts\" >nul 2>nul
)

:: 检查文章目录是否为空，如果为空则创建一个占位文件
if not exist "XHBlogs\posts\*.md" (
    echo --- > "XHBlogs\posts\welcome.md"
    echo title: 欢迎来到藏枫的博客 >> "XHBlogs\posts\welcome.md"
    echo date: "2026-06-20" >> "XHBlogs\posts\welcome.md"
    echo tags: >> "XHBlogs\posts\welcome.md"
    echo   - 欢迎 >> "XHBlogs\posts\welcome.md"
    echo   - 博客 >> "XHBlogs\posts\welcome.md"
    echo cover:  >> "XHBlogs\posts\welcome.md"
    echo description: 欢迎来到藏枫の猫窝 >> "XHBlogs\posts\welcome.md"
    echo --- >> "XHBlogs\posts\welcome.md"
    echo. >> "XHBlogs\posts\welcome.md"
    echo # 欢迎来到藏枫的博客 >> "XHBlogs\posts\welcome.md"
    echo. >> "XHBlogs\posts\welcome.md"
    echo 你好，我是藏在风里的猫，欢迎来到我的小博客！ >> "XHBlogs\posts\welcome.md"
)

:: 4. 同步说说（先清空再复制）
echo   [4/10] 同步说说...
if exist "XHBlogs\moments" (
    del /q "XHBlogs\moments\*.md" 2>nul
)
if exist "my-blog-manager\moments" (
    xcopy /e /y /q "my-blog-manager\moments\*" "XHBlogs\moments\" >nul 2>nul
)

:: 5. 同步杂谈（先清空再复制）
echo   [5/10] 同步杂谈...
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

:: 6. 同步数据文件（相册、友链、项目等）
echo   [6/10] 同步数据文件...
if exist "my-blog-manager\data" (
    xcopy /e /y /q "my-blog-manager\data\*" "XHBlogs\data\" >nul 2>nul
)

:: 7. 同步静态资源（public 目录 - 图片等）
echo   [7/10] 同步静态资源（图片等）...
if exist "my-blog-manager\public" (
    xcopy /e /y /q "my-blog-manager\public\*" "XHBlogs\public\" >nul 2>nul
)

:: 8. 同步后台管理页面样式（如果有自定义）
echo   [8/10] 检查后台管理页面...
:: （后台管理页面是单独的，不需要同步）

:: 9. 同步组件修改（如果有自定义组件）
echo   [9/10] 检查自定义组件...
:: （组件是代码级别的，不需要自动同步）

:: 10. 同步其他配置
echo   [10/10] 同步完成！

echo.
echo [OK] 所有内容同步完成
echo.

:: ========================================
:: 构建网站
:: ========================================
echo [4/8] 进入博客目录...
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
echo [5/8] 正在构建网站...
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

:: ========================================
:: 部署到 GitHub Pages
:: ========================================
echo [6/8] 正在部署到 GitHub Pages...
echo.
cd out

:: 初始化 git
if not exist ".git" (
    git init
    git config user.email "blog@example.com"
    git config user.name "Blog Owner"
)
git add .
git commit -m "部署更新：%date:~0,4%-%date:~5,2%-%date:~8,2% %time:~0,2%:%time:~3,2%" 2>nul

:: 设置远程仓库地址
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    git remote add origin https://github.com/TheWindHIND/blog.git
)
git branch -M gh-pages
git push -u origin gh-pages --force

if %errorlevel% equ 0 (
    echo.
    echo [OK] GitHub Pages 部署成功！
) else (
    echo.
    echo [警告] GitHub Pages 部署可能失败，请检查网络或权限
)

cd ..
cd ..

:: ========================================
:: 推送源码到 main 分支
:: ========================================
echo.
echo [7/8] 正在推送源码到 GitHub...
echo.

git add -A
git commit -m "更新：%date:~0,4%-%date:~5,2%-%date:~8,2% %time:~0,2%:%time:~3,2%" 2>nul
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo [OK] 源码推送成功！
) else (
    echo.
    echo [警告] 源码推送可能失败，请检查 Git 配置
)

:: ========================================
:: 完成
:: ========================================
echo.
echo [8/8] 全部完成！
echo.

:: ========================================
:: 显示仓库最新更改日期
:: ========================================
echo ========================================
echo    📅 仓库最新更新信息
echo ========================================
echo.

:: 获取 main 分支最新提交日期
for /f "delims=" %%a in ('git log -1 --format^=%%ci main 2^>nul') do set MAIN_DATE=%%a
if defined MAIN_DATE (
    echo   📝 源码（main分支）：
    echo      %MAIN_DATE%
) else (
    echo   ⚠️  无法获取源码更新日期
)

echo.

:: 获取 gh-pages 分支最新提交日期
for /f "delims=" %%a in ('git log -1 --format^=%%ci origin/gh-pages 2^>nul') do set PAGES_DATE=%%a
if defined PAGES_DATE (
    echo   🌐 网站（gh-pages分支）：
    echo      %PAGES_DATE%
) else (
    echo   ⚠️  无法获取网站更新日期
)

echo.
echo ========================================
echo    [成功] 部署完成！
echo ========================================
echo.
echo 你的博客访问地址：
echo https://TheWindHIND.github.io/blog/
echo.
echo 同步的内容包括：
echo   - 站点配置
echo   - 关于页面
echo   - 文章（新增/修改/删除）
echo   - 说说（新增/修改/删除）
echo   - 杂谈（新增/修改/删除）
echo   - 数据文件（相册、友链、项目）
echo   - 静态资源（图片等）
echo.
echo 注意：
echo   1. GitHub Pages 可能需要几分钟才能生效
echo   2. 如果没看到更新，按 Ctrl+F5 强制刷新浏览器
echo   3. 源码已推送到 main 分支
echo.
pause
