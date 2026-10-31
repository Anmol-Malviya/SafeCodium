@echo off
title Safe Vibe AI - Development Launcher
color 0B

echo ===============================================================================
echo                SAFE VIBE AI — DEVELOPMENT LAUNCHER (PHASE 1)
echo ===============================================================================
echo Active Workspace: %~dp0..
echo.

if not exist "%~dp0..\.env" (
    echo [.env] Creating local .env from .env.example...
    copy "%~dp0..\.env.example" "%~dp0..\.env"
)

echo [OK] Ready for Phase 2 implementation.
echo ===============================================================================
pause

 
