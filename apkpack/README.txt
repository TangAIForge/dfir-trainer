APK 打包说明（应急特训 → DFIR-Trainer.apk）
=============================================

本目录存放 APK 打包的全部源文件，构建环境在 D:\apkdfir（纯 ASCII 路径，因 aapt2 无法处理中文路径）。

⚠️ 踩坑记录（改打包流程前必读）
---------------------------------------------
1. 【安装报错 -2 / 解析失败】Android 11+ 硬性要求 resources.arsc 必须以
   不压缩（STORED）方式写入 APK。绝对不能用 7z/python 把它重新压缩！
   repack.py 已特殊处理：resources.arsc 用 ZIP_STORED，其余 DEFLATE。
2. 【aapt2 无法处理中文路径】所有构建输入必须在纯 ASCII 路径（D:\apkdfir）。
3. 【cmd 批处理编码】含中文或 LF 换行的 .bat 会解析错乱，必须 ASCII+CRLF；
   javac 编译含中文注释的 java 源码必须加 -encoding UTF-8。
4. 【多行 python -c 不可用】本机 shell 环境会截断多行 -c，一律写成 .py 文件运行。
5. 【自检诊断条】MainActivity 顶部有 assets/www 自检显示，手机打不开页面时
   先看这行字：assets/www OK = 资产在包内；EMPTY/红色 = 打包问题。

目录结构
--------
apkpack/
├── AndroidManifest.xml      应用清单（包名 com.dfir.trainer，label 应急特训）
├── src/com/dfir/trainer/    MainActivity.java（WebView 壳 + 资产自检，加载 assets/www）
├── res/mipmap-anydpi/       应用图标 ic_launcher.png（make_icon.py 生成）
├── build_data.py            把 data/*.json 内嵌为 app/data.js
├── repack.py                用 python 重写 ZIP 并注入 classes.dex（保证 arsc 不压缩）
├── make_bat.py              重新生成 build_apk.bat（ASCII+CRLF）
├── make_icon.py             重新生成图标
└── make_bats.py             重新生成根目录的批处理

一键打包
--------
双击项目根目录的「打包APK.bat」即可：
  1. 同步 app/ 和 data/ 到 D:\apkdfir
  2. 生成内嵌数据 data.js（含全部题库/命令/场景/仿真世界/回显对比）
  3. javac 编译 WebView 壳 → d8 转 dex → aapt2 打包 → zipalign → apksigner 签名
  4. 输出 DFIR-Trainer.apk

手动重打包（在 D:\apkdfir 下）
------------------------------
  call build_apk.bat

重建构建环境（换机器时）
------------------------
  1. 下载 build-tools: https://mirrors.cloud.tencent.com/AndroidSDK/build-tools_r34-windows.zip
  2. 下载 platform: https://mirrors.cloud.tencent.com/AndroidSDK/platform-34-ext7_r03.zip
  3. 需要 JDK 8+ 和 7-Zip（按本机实际安装路径修改脚本中的 BT/JDK/SZ 变量）

⚠️ 本仓库中所有绝对路径（D:\apkdfir、D:\Base\apps\... 等）都是原作者机器的
   配置示例，使用前请按你本机的实际安装路径修改。

签名密钥
--------
· build_apk.bat 从环境变量 KS_PASS 读取 keystore 口令，示例：
      set KS_PASS=你的口令
      build_apk.bat
· 首次构建会自动生成 debug.keystore（alias: dfir）。正式发布请务必
  换成你自己的正式密钥，切勿使用示例 keystore 对外分发。
· 任何密钥文件（.keystore/.jks/.pem）与口令都不要提交到仓库。

安装使用
--------
把 DFIR-Trainer.apk 传到 Android 手机（Android 7.0+）安装即可。
完全离线运行：题库/命令/场景全部内嵌，不依赖服务器，无需任何权限。