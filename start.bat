@echo off
rem ===================================================
rem Delhi Bus Project - Easy Run Script
rem 1st Year B.Tech CSE Project
rem Double click this file to start the website!
rem ===================================================
title Delhi Bus Project Server
cd /d "%~dp0"
echo Starting Python backend server...
echo Please wait while server is loading...
start http://127.0.0.1:8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pause
