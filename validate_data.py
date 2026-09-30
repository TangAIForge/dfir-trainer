# -*- coding: utf-8 -*-
"""全量校验 data/ 下所有数据文件的 JSON 合法性与数量"""
import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

base = os.path.dirname(os.path.abspath(__file__))
ok = True
for f in ["commands_linux", "commands_windows", "mcq", "fill", "scenarios",
          "scenarios_extra", "scenarios_extra2", "worlds_linux", "worlds_win", "echo_lab"]:
    p = os.path.join(base, "data", f + ".json")
    if not os.path.exists(p):
        print(f, "MISSING")
        continue
    try:
        d = json.load(open(p, encoding="utf-8"))
        items = d.get("items", [])
        extra = ""
        if f.startswith("scenarios"):
            extra = " steps=%d" % sum(len(i.get("steps", [])) for i in items)
        elif f.startswith("worlds"):
            items = d.get("worlds", {})
            extra = " worlds=%d" % len(items)
        print(f, "OK items=%d%s" % (len(items), extra))
    except Exception as e:
        print(f, "FAIL", e)
        ok = False
sys.exit(0 if ok else 1)
