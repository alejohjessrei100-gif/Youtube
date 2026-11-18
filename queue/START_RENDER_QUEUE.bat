@echo off
title AUTO RENDER QUEUE
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0render_queue.ps1"
pause
