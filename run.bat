@echo off
cd /d "%~dp0"
call npm.cmd run dev > server_log.txt 2>&1
