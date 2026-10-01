@echo off
rem Starts the Library app on http://localhost:3000 and opens it in the browser.
rem Optional: start.bat 3001  (use another port)
cd /d "%~dp0"
set PORT=3000
if not "%~1"=="" set PORT=%~1
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\server.ps1" -Port %PORT%
pause
