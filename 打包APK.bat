@echo off
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
echo [2/2] build APK ...
pushd D:\apkdfir
call build_apk.bat
popd
copy /y D:\apkdfir\DFIR-Trainer.apk "%~dp0DFIR-Trainer.apk" >nul
echo.
echo DONE. New APK: DFIR-Trainer.apk
pause