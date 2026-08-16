@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo      Rebuild Admin Panel (.next)
echo ========================================
echo.
echo  After rebuild, restart "backend.bat" to see changes.
echo.

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)
echo  OK.

echo.
echo [2/3] Cleaning old build (.next)...
if exist ".next" (
    rmdir /s /q ".next"
    if exist ".next" (
        echo [WARN] Could not delete .next, continuing anyway...
    ) else (
        echo  Cleaned.
    )
) else (
    echo  No cache, skip.
)

echo.
echo [3/3] Building... (please wait 1-2 min)
echo.
call npx next build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Done! Restart "backend.bat" now.
echo ========================================
pause