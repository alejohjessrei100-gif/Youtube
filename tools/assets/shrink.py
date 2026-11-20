"""Downscale every embedded texture in public/assets/<film>/*/model.json to <= N px (phones run out of memory on big
textures). python3 -I tools/assets/shrink.py public/assets/<film> [512]"""
import base64, io, json, os, sys
from PIL import Image
root, N = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 512
for name in sorted(os.listdir(root)):
    f = os.path.join(root, name, "model.json")
    if not os.path.exists(f): continue
    g = json.load(open(f))
    for im in g.get("images", []):
        u = im.get("uri", "")
        if not u.startswith("data:image"): continue
        head, b64 = u.split(",", 1)
        img = Image.open(io.BytesIO(base64.b64decode(b64)))
        if max(img.size) <= N: continue
        img.thumbnail((N, N))
        out = io.BytesIO()
        if img.mode in ("RGBA", "LA", "P"):
            img.save(out, "PNG", optimize=True); mt = "image/png"
        else:
            img.convert("RGB").save(out, "JPEG", quality=86); mt = "image/jpeg"
        im["uri"] = f"data:{mt};base64," + base64.b64encode(out.getvalue()).decode()
    json.dump(g, open(f, "w"))
    print(f"{name}: {os.path.getsize(f) / 1e6:.2f} MB")
