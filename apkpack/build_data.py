# -*- coding: utf-8 -*-
"""把 data/*.json 打包成 app/data.js（APK/离线模式的内嵌数据源）"""
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
FILES = ["commands_linux", "commands_windows", "mcq", "fill", "scenarios",
         "scenarios_extra", "scenarios_extra2", "worlds_linux", "worlds_win", "echo_lab"]

payload = {}
for name in FILES:
    p = os.path.join(ROOT, "data", name + ".json")
    if os.path.exists(p):
        try:
            payload[name] = json.load(open(p, encoding="utf-8"))
        except Exception as e:
            print("[skip]", name, e)

out = "window.EMBEDDED_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";"
with open(os.path.join(ROOT, "app", "data.js"), "w", encoding="utf-8") as f:
    f.write(out)
print("data.js generated:", ", ".join(payload.keys()))