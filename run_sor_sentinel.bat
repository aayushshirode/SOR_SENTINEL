@echo off
title SOR SENTINEL - Development Launcher
echo ===================================================
echo   SOR SENTINEL - Complete Local Launcher
echo ===================================================
echo.
echo [1/2] Launching FastAPI Backend on port 8010...
start "SOR SENTINEL Backend (8010)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8010"

echo [2/2] Launching Frontend Development Server on port 5173...
start "SOR SENTINEL Frontend (5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   SOR SENTINEL is now running locally!
echo   * Web App:    http://localhost:5173
echo   * Sign In:    http://localhost:5173/signin
echo   * Backend:    http://127.0.0.1:8010
echo   * API Docs:   http://127.0.0.1:8010/docs
echo   * Database:   Oracle Database 21c XE (localhost:1521)
echo ===================================================
echo.
pause
