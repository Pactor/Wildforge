@echo off
setlocal
title Wildforge Launcher

set "PROJECT_DIR=%~dp0"
set "WILDFORGE_PORT=7000"

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [Wildforge] Node.js was not found in PATH.
  echo Install or restore Node.js, then run this file again.
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [Wildforge] npm was not found in PATH.
  echo Install or restore Node.js, then run this file again.
  pause
  exit /b 1
)

powershell.exe -NoProfile -Command "$listener = Get-NetTCPConnection -State Listen -LocalPort %WILDFORGE_PORT% -ErrorAction SilentlyContinue; if ($listener) { exit 2 }"
if errorlevel 2 (
  echo [Wildforge] Port %WILDFORGE_PORT% is already in use.
  echo If Wildforge is already running, open:
  echo http://localhost:%WILDFORGE_PORT%/?seed=wildforge^&playtest=1
  echo Otherwise run Stop-Wildforge.bat only after confirming it is this project.
  pause
  exit /b 2
)

if not exist "%PROJECT_DIR%node_modules\vite\bin\vite.js" (
  echo [Wildforge] Dependencies are missing. Running npm install...
  pushd "%PROJECT_DIR%"
  call npm install
  if errorlevel 1 (
    popd
    echo [Wildforge] npm install failed.
    pause
    exit /b 1
  )
  popd
)

echo [Wildforge] Starting the dedicated server on port %WILDFORGE_PORT%...
start "Wildforge Server - Port %WILDFORGE_PORT%" /D "%PROJECT_DIR%" cmd.exe /c "npm run dev"

echo [Wildforge] Server window launched.
echo Playtest URL: http://localhost:%WILDFORGE_PORT%/?seed=wildforge^&playtest=1
timeout /t 2 /nobreak >nul
exit /b 0
