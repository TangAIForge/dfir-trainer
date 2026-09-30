# -*- coding: utf-8 -*-
"""用 Python 标准库重写 APK ZIP（最大 Android 兼容性）并注入 classes.dex
用法: python repack.py <unsigned.apk> <classes.dex>
"""
import os
import sys
import zipfile

def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    src, dex = sys.argv[1], sys.argv[2]
    tmp = src + ".tmp"

    with zipfile.ZipFile(src, "r") as zin:
        entries = []
        for info in zin.infolist():
            if info.is_dir():
                continue
            entries.append((info.filename, zin.read(info.filename)))
    with zipfile.ZipFile(dex, "r") if dex.endswith(".zip") else open(dex, "rb") as f:
        dex_data = f.read()

    with zipfile.ZipFile(tmp, "w") as zo:
        for name, data in entries:
            if name == "resources.arsc":
                zo.writestr(name, data, zipfile.ZIP_STORED)
            else:
                zo.writestr(name, data, zipfile.ZIP_DEFLATED)
        zo.writestr("classes.dex", dex_data, zipfile.ZIP_DEFLATED)

    os.replace(tmp, src)
    z = zipfile.ZipFile(src)
    ok = "assets/www/index.html" in z.namelist() and "classes.dex" in z.namelist()
    print("repack done, entries:", len(z.namelist()), "check:", "OK" if ok else "FAIL")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()