# -*- coding: utf-8 -*-
"""生成 launcher 图标 PNG（无 PIL 依赖，纯 zlib 手写 PNG）"""
import struct, zlib, os

W = H = 192
px = []
for y in range(H):
    row = [0]
    for x in range(W):
        r, g, b = 10, 16, 28
        cx, cy = W / 2, H / 2 - 6
        dx, dy = abs(x - cx), (y - cy)
        inside = False
        top, bottom = cy - 52, cy + 62
        halfw = 44 + (18 * (dy - (-52)) / 114 if dy > 0 else 0)
        if top <= y <= bottom and dx <= halfw:
            inside = True
        if inside:
            r, g, b = 0, 60, 70
            if abs(dx - halfw) < 4 or abs(y - top) < 4 or abs(y - bottom) < 4:
                r, g, b = 0, 229, 255
            if 58 <= y <= 108:
                t = (y - 58) / 50
                lx = cx - 20 + t * 26
                rx = cx + 14 - t * 30
                if abs(x - lx) < 5 or (y > 78 and abs(x - rx) < 5):
                    r, g, b = 0, 255, 157
        else:
            if x % 24 < 2 or y % 24 < 2:
                r, g, b = 14, 24, 40
        row += [r, g, b, 255]
    px.append(row)

raw = b"".join(bytes(p) for p in px)

def chunk(tag, data):
    c = tag + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(raw, 9))
png += chunk(b"IEND", b"")

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "res", "mipmap-anydpi", "ic_launcher.png")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "wb") as f:
    f.write(png)
print("icon written:", out, len(png), "bytes")