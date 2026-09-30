@echo off
cd /d "%~dp0"
set BT=%cd%\bt\android-14
set PLAT=%cd%\pl\android-34\android.jar
set JDK=D:\Base\apps\microsoft17-jdk\current\bin
set SZ=D:\Base\apps\7zip\current\7z.exe

echo [1/9] generate data.js ...
python build_data.py || goto :err

echo [2/9] stage assets ...
if exist assets rmdir /s /q assets
mkdir assets\www
copy app\index.html assets\www\ >nul
copy app\style.css assets\www\ >nul
copy app\app.js assets\www\ >nul
copy app\workbench.js assets\www\ >nul
copy app\echo.js assets\www\ >nul
copy app\data.js assets\www\ >nul

echo [3/9] compile resources ...
if exist res.zip del res.zip
"%BT%\aapt2.exe" compile --dir res -o res.zip || goto :err

echo [4/9] javac ...
if exist classes rmdir /s /q classes
"%JDK%\javac.exe" -encoding UTF-8 -source 8 -target 8 -bootclasspath "%PLAT%" -d classes src\com\dfir\trainer\MainActivity.java || goto :err

echo [5/9] d8 ...
if exist dexout rmdir /s /q dexout
mkdir dexout
call "%BT%\d8.bat" --lib "%PLAT%" --release --output dexout classes\com\dfir\trainer\MainActivity.class || goto :err

echo [6/9] aapt2 link ...
if exist unsigned.apk del unsigned.apk
"%BT%\aapt2.exe" link -o unsigned.apk -I "%PLAT%" --manifest AndroidManifest.xml -A assets res.zip --min-sdk-version 24 --target-sdk-version 34 || goto :err

echo [7/9] repack dex (python zip) ...
python repack.py unsigned.apk dexout\classes.dex || goto :err

echo [8/9] zipalign ...
if exist aligned.apk del aligned.apk
"%BT%\zipalign.exe" -f 4 unsigned.apk aligned.apk || goto :err

echo [9/9] sign ...
rem keystore password comes from env KS_PASS (never hardcode secrets in repo)
if "%KS_PASS%"=="" (
  echo [ERROR] KS_PASS not set. Example: set KS_PASS=your_keystore_password
  goto :err
)
if not exist debug.keystore "%JDK%\keytool.exe" -genkeypair -keystore debug.keystore -alias dfir -keyalg RSA -keysize 2048 -validity 10000 -storepass "%KS_PASS%" -keypass "%KS_PASS%" -dname "CN=DFIR Trainer" 2>nul
if exist aligned-signed.apk del aligned-signed.apk
call "%BT%\apksigner.bat" sign --ks debug.keystore --ks-pass pass:%KS_PASS% --out aligned-signed.apk aligned.apk || goto :err

copy /y aligned-signed.apk DFIR-Trainer.apk >nul
echo.
echo BUILD OK: DFIR-Trainer.apk
exit /b 0

:err
echo BUILD FAILED
exit /b 1