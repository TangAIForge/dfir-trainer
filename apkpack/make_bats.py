# -*- coding: utf-8 -*-
"""生成项目根目录的 Windows 批处理（ASCII 内容 + CRLF，cmd 兼容）"""
import os, sys
sys.stdout.reconfigure(encoding="utf-8")
root = os.path.dirname(os.path.abspath(__file__))

pkg = r"""@echo off
cd /d "%~dp0"
echo [1/2] sync app + data to D:\apkdfir ...
if not exist "D:\apkdfir\bt\android-14\aapt2.exe" (
  echo [ERROR] build env D:\apkdfir not found. See apkpack\README.txt
  pause
  exit /b 1
)
robocopy app D:\apkdfir\app /MIR >nul
robocopy data D:\apkdfir\data /MIR >nul
copy /y apkpack\build_data.py D:\apkdfir\ >nul
copy /y apkpack\app.js.patch D:\apkdfir\ >nul 2>nul
echo [2/2] build APK ...
pushd D:\apkdfir
call build_apk.bat
popd
copy /y D:\apkdfir\DFIR-Trainer.apk "%~dp0DFIR-Trainer.apk" >nul
echo.
echo DONE. New APK: DFIR-Trainer.apk
pause
"""

start = r"""@echo off
title DFIR Trainer
cd /d "%~dp0"
echo Starting local training server...
python server.py 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] python not found. Please install Python 3 first.
  pause
)
"""

def w(name, content):
    p = os.path.join(root, name)
    with open(p, "wb") as f:
        f.write(content.replace("\n", "\r\n").encode("ascii"))
    print("written:", p)

w("打包APK.bat", pkg)
w("启动特训.bat", start)