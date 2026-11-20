"""Pack each fetched model into one self-contained model.json (glTF JSON with its buffers and textures as data: URIs),
so the phone page can serve it (it serves .json, not .gltf/.bin). GLTFLoader parses it regardless of the extension.
    python3 -I tools/assets/embed.py public/assets/<film>"""
import base64, json, mimetypes, os, sys
root = sys.argv[1]
for name in sorted(os.listdir(root)):
    d = os.path.join(root, name); f = os.path.join(d, "model.gltf")
    if not os.path.exists(f): continue
    g = json.load(open(f))
    for b in g.get("buffers", []):
        if b.get("uri") and not b["uri"].startswith("data:"):
            b["uri"] = "data:application/octet-stream;base64," + base64.b64encode(open(os.path.join(d, b["uri"]), "rb").read()).decode()
    for im in g.get("images", []):
        u = im.get("uri")
        if u and not u.startswith("data:"):
            p = os.path.join(d, u)
            if os.path.exists(p):
                mt = mimetypes.guess_type(p)[0] or "image/png"
                im["uri"] = f"data:{mt};base64," + base64.b64encode(open(p, "rb").read()).decode()
    json.dump(g, open(os.path.join(d, "model.json"), "w"))
    for r, _, fs in os.walk(d, topdown=False):
        for x in fs:
            if x != "model.json": os.remove(os.path.join(r, x))
        if r != d and not os.listdir(r): os.rmdir(r)
    print(f"{name}: {os.path.getsize(os.path.join(d, 'model.json')) / 1e6:.2f} MB")
