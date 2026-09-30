@echo off
title DFIR Trainer
cd /d "%~dp0"
echo Starting local training server...
python server.py 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] python not found. Please install Python 3 first.
  pause
)
