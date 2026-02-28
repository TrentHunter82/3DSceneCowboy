@echo off
title 3D Scene Cowboy
echo ========================================
echo   3D Scene Cowboy - Starting...
echo ========================================
echo.
cd /d "%~dp0app"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  echo.
)
echo Starting dev server...
call npx vite --open
pause
