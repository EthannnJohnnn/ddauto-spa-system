@echo off
setlocal
cd /d "%~dp0"

set "APP_URL=http://127.0.0.1:3000"

rem If DD Auto Spa is already running, just open it.
powershell -NoProfile -Command "try { Invoke-WebRequest '%APP_URL%' -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process '%APP_URL%'; exit 0 } catch { exit 1 }"

if not errorlevel 1 exit /b 0

rem Start the local server in a minimized window.
start "DD Auto Spa Server" /min node "apps\server\src\server.js"

rem Wait until the server is ready, then open the browser.
powershell -NoProfile -Command "$url='%APP_URL%'; for($attempt=0; $attempt -lt 30; $attempt++){ try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process $url; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; exit 1"

if errorlevel 1 (
    echo DD Auto Spa could not start.
    echo Make sure Node.js is installed and the setup was completed.
    pause
)

endlocal