# -*- coding: utf-8 -*-
"""
应急响应每日特训 - 本地临时服务
仅监听 127.0.0.1，不对外网开放。Ctrl+C 或关闭窗口即停止服务。
"""
import json
import os
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8899
ROOT = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(ROOT, "app")
DATA_DIR = os.path.join(ROOT, "data")

DATA_FILES = ["commands_linux", "commands_windows", "mcq", "fill", "scenarios",
              "scenarios_extra", "scenarios_extra2", "worlds_linux", "worlds_win", "echo_lab"]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def log_message(self, fmt, *args):
        pass  # 静默访问日志

    def end_headers(self):
        # 本地服务始终返回最新文件，避免浏览器缓存旧版 js/css
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path.split("?")[0] == "/api/data":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            payload = {}
            for name in DATA_FILES:
                path = os.path.join(DATA_DIR, name + ".json")
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        payload[name] = json.load(f)
                except Exception as e:
                    payload[name] = {"items": [], "error": str(e)}
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
        else:
            super().do_GET()


def main():
    if not os.path.isdir(APP_DIR):
        print("[!] 缺少 app 目录: %s" % APP_DIR)
        sys.exit(1)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    url = "http://127.0.0.1:%d" % PORT
    print("=" * 56)
    print("  应急响应每日特训系统 已启动")
    print("  本地访问地址: %s" % url)
    print("  仅本机可访问，关闭本窗口或按 Ctrl+C 即停止")
    print("=" * 56)
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止。")


if __name__ == "__main__":
    main()
