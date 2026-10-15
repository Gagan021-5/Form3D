@echo off
echo ===================================================
echo           Starting Qibo3D Servers
echo ===================================================
echo Backend API : http://localhost:4000
echo Frontend Web: http://localhost:5173
echo ===================================================
echo.

start "Qibo3D Backend API [Port 4000]" cmd /k "npm run dev:api"
timeout /t 3 /nobreak >nul
start "Qibo3D Frontend Web [Port 5173]" cmd /k "npm run dev:web"
timeout /t 2 /nobreak >nul

echo Opening Qibo3D in your browser...
start http://localhost:5173
echo.
echo Both servers are running in their respective windows!
