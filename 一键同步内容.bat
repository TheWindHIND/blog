@echo off
chcp 936 >nul
echo ========================================
echo    一键同步控制面板内容到博客
echo ========================================
echo.
cd /d "%~dp0"

echo 正在同步...
echo.

:: 同步站点配置
echo   [1/6] 同步站点配置...
copy /y "my-blog-manager\siteConfig.ts" "XHBlogs\siteConfig.ts" >nul

:: 同步关于页面
echo   [2/6] 同步关于页面...
if exist "my-blog-manager\app\about\about.md" (
    copy /y "my-blog-manager\app\about\about.md" "XHBlogs\app\about\about.md" >nul
)

:: 同步文章（先清空再复制，确保删除的内容也同步）
echo   [3/6] 同步文章...
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

:: 同步说说（先清空再复制）
echo   [4/6] 同步说说...
if exist "XHBlogs\moments" (
    del /q "XHBlogs\moments\*.md" 2>nul
)
if exist "my-blog-manager\moments" (
    xcopy /e /y /q "my-blog-manager\moments\*" "XHBlogs\moments\" >nul 2>nul
)

:: 同步杂谈（先清空再复制）
echo   [5/6] 同步杂谈...
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
echo   [6/6] 同步数据文件...
if exist "my-blog-manager\data" (
    xcopy /e /y /q "my-blog-manager\data\*" "XHBlogs\data\" >nul 2>nul
)

echo.
echo ========================================
echo    [成功] 同步完成！
echo ========================================
echo.
echo 已同步的内容：
echo   - 站点配置（siteConfig.ts）
echo   - 关于页面（about.md）
echo   - 文章（posts）
echo   - 说说（moments）
echo   - 杂谈（chatters）
echo   - 数据文件（data）
echo.
echo 注意：同步后需要重新构建部署才能在网站上看到更新
echo 可以双击"一键部署网站.bat"来完成构建和部署
echo.
pause
