@echo off
:: 解决中文乱码输出
chcp 65001 >nul
:: 切换到当前 BAT 文件所在的根目录（防止找不到文件）
cd /d "%~dp0"

echo ========================================
echo      XHBlogs 后端控制中心启动器
echo ========================================
echo.

echo [步骤 1] 正在检查并补齐 Python 依赖...
pip install flask requests >nul 2>&1
echo  依赖环境已确认。

echo.
echo [步骤 2] 正在启动后端服务...
echo  【重要提示】：如果看到 "Running on http://127.0.0.1:xxxx"
echo  请立刻打开浏览器，访问这个网址即可打开控制中心。
echo.

:: 优先尝试 python 命令
python run_me.py
if %errorlevel% neq 0 (
    echo.
    echo [警告] 默认 Python 启动失败，尝试调用 py -3.10 ...
    py -3.10 run_me.py
)

echo.
echo 后端服务已停止运行。
pause