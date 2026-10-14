@echo off
setlocal
title Wildforge Server Stopper

set "PROJECT_DIR=%~dp0"
set "WILDFORGE_PORT=7000"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$project = [IO.Path]::GetFullPath('%PROJECT_DIR%').TrimEnd([IO.Path]::DirectorySeparatorChar);" ^
  "$listeners = @(Get-NetTCPConnection -State Listen -LocalPort %WILDFORGE_PORT% -ErrorAction SilentlyContinue);" ^
  "if ($listeners.Count -eq 0) { Write-Host '[Wildforge] No server is listening on port %WILDFORGE_PORT%.'; exit 0 };" ^
  "$stopped = 0;" ^
  "foreach ($listener in $listeners) {" ^
  "  $process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $listener.OwningProcess) -ErrorAction SilentlyContinue;" ^
  "  if (-not $process) { continue };" ^
  "  $command = [string]$process.CommandLine;" ^
  "  if ($process.Name -notmatch '^node(\.exe)?$' -or $command.IndexOf($project, [StringComparison]::OrdinalIgnoreCase) -lt 0) {" ^
  "    Write-Host ('[Wildforge] Refusing to stop PID ' + $listener.OwningProcess + ': port %WILDFORGE_PORT% is not owned by this project.');" ^
  "    exit 3" ^
  "  };" ^
  "  Stop-Process -Id $listener.OwningProcess -ErrorAction Stop;" ^
  "  Write-Host ('[Wildforge] Stopped server PID ' + $listener.OwningProcess + ' on port %WILDFORGE_PORT%.');" ^
  "  $stopped++" ^
  "};" ^
  "if ($stopped -eq 0) { Write-Host '[Wildforge] No matching Wildforge server process was found.'; exit 4 }"

set "STOP_RESULT=%ERRORLEVEL%"
if not "%STOP_RESULT%"=="0" (
  echo [Wildforge] Server was not stopped. No unrelated process was changed.
  pause
)
exit /b %STOP_RESULT%
