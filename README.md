# DFIR Trainer - 应急响应每日特训

> 数字取证与应急响应（DFIR）培训工具，纯离线运行，支持 Windows / Linux 双平台命令训练。

## 项目简介

DFIR Trainer 是一款面向安全运营人员、DFIR 工程师和应急响应队员的每日训练工具。它把理论知识、命令速查和仿真实操场景整合在一个纯离线应用中，帮助你在没有网络、没有测试环境的情况下保持手感。

### 核心数据

| 模块 | 数量 |
|------|------|
| 选择题 | 92+ |
| 填空题 | 58+ |
| 仿真实操场景 | 24 |
| Linux 命令手册 | 160+ |
| Windows 命令手册 | 130+ |
| 回显对比练习 | 22 组 |

## 功能特性

### 每日仪表盘
- 连续打卡统计（热力图）
- 每日训练目标（选择题 10 题 / 填空题 5 题 / 实操 1 个）
- 分类掌握度展示

### 选择题训练
- 学习模式：即时显示对错和解析
- 考试模式：随机出题、限时答题、交卷后统一复盘
- 支持按操作系统和分类筛选

### 填空题训练
- 命令默写，不区分大小写、忽略空格
- 提示功能（首字符 + 长度）
- 参考答案多等价写法判分

### 仿真实操场景
- 24 个真实应急响应场景
- 内置终端模拟器，输入真实命令获取模拟回显
- 支持 Linux / Windows 双平台场景

### 命令速查手册
- 290+ 条应急响应常用命令
- 按分类索引
- 每条命令附带使用示例和风险等级标注

### 错题本（艾宾浩斯遗忘曲线）
- 答错自动收录
- 1/3/7/15/30 天间隔复习提醒
- 连对 3 次自动移出错题本

### 数据中心
- 近 30 天训练趋势图
- 分类掌握度三色分级
- 12 枚成就勋章
- 自动生成周报文案

### 结业认证考试
- 40 题混合卷（选择 30 + 填空 10）
- 限时 40 分钟，80 分及格
- 通过后生成电子证书

### 数据备份
- 一键导出全部学习进度为 JSON
- 支持合并 / 覆盖两种导入模式
- 自定义题库管理

## 快速开始

### 方式一：桌面版（推荐）

1. 下载 `server.py`
2. 确保已安装 Python 3.7+
3. 在项目根目录运行：`python server.py`
4. 浏览器自动打开 http://localhost:8000

### 方式二：直接打开 HTML

双击 `app/index.html` 即可在浏览器中使用（离线模式）。

### 方式三：Android APK

从 Releases 下载 `应急特训.apk`，安装到 Android 设备即可。

## 目录结构

```
.
├── server.py              # 本地 HTTP 服务器（桌面版入口）
├── validate_data.py       # 数据校验脚本
├── 启动特训.bat           # Windows 一键启动
├── app/
│   ├── index.html         # 主页面
│   ├── app.js             # 核心应用逻辑
│   ├── pro.js             # 企业版扩展
│   ├── workbench.js       # 终端模拟器
│   ├── echo.js            # 回显对比模块
│   └── style.css          # 暗色科技风样式
├── data/
│   ├── mcq.json           # 选择题题库
│   ├── fill.json          # 填空题题库
│   ├── scenarios.json     # 实操场景
│   ├── worlds_linux.json  # Linux 场景虚拟文件系统
│   ├── worlds_win.json     # Windows 场景虚拟文件系统
│   ├── commands_linux.json # Linux 命令手册
│   └── commands_windows.json # Windows 命令手册
└── apkpack/               # Android 打包资源
```

## 构建说明

### 构建 APK

1. 确保已安装 Android SDK 和 build-tools
2. 设置环境变量 `%KS_PASS%`（签名密钥密码）
3. 运行 `apkpack/build_apk.bat`

### 重新生成内嵌数据

```bash
python apkpack/build_data.py
```

会从 `data/*.json` 生成 `app/data.js`。

## 使用指南

### 每日训练流程

1. 打开仪表盘 -> 查看今日打卡目标
2. 选择题练习 -> 完成 10 题（学习模式）
3. 填空题默写 -> 完成 5 题命令默写
4. 实操场景 -> 完成 1 个仿真场景
5. 打卡 -> 点击"立即打卡"按钮

### 终端模拟器操作

在实操场景中，底部终端支持真实命令输入：

```bash
# Linux 场景
ls -la /var/log/auth.log
ps aux | grep suspicious
netstat -antp

# Windows 场景
tasklist /svc
ipconfig /all
netstat -an
```

输入 `help` 查看完整命令列表，输入 `exit` 返回场景列表。

## 安全说明

- 本工具纯离线运行，不联网、不上传任何数据
- 所有学习数据存储在浏览器 localStorage 中
- 题库中的 IP、域名、路径均为教学示例，非真实环境

## 许可证

MIT License