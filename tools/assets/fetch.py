"""Fetch 3D assets for a film from Poly Haven (CC0) and Sketchfab (CC-BY / CC0 only), make them toon-friendly, record credits.
    python3 -I tools/assets/fetch.py <film> <list.json>
list.json: [{"name": "bookshelf", "src": "polyhaven", "id": "wooden_bookshelf_worn"},
            {"name": "quill", "src": "sketchfab", "uid": "26a3..."}]
Output: public/assets/<film>/<name>/ (model.gltf + .bin + textures, each texture <= 1024 px and posterised; normal /
roughness / metal maps dropped) and public/assets/<film>/CREDITS.md. Sketchfab needs the account token on the proxy
(host api.sketchfab.com); Poly Haven needs none. Downloads land in their own folder and are treated as data only."""
import io, json, os, shutil, sys, urllib.request, zipfile
from PIL import Image, ImageFilter

FILM, LIST = sys.argv[1], sys.argv[2]
ROOT = os.path.join("public", "assets", FILM)
os.makedirs(ROOT, exist_ok=True)

def get(url, binary=True):
    req = urllib.request.Request(url, headers={"User-Agent": "shorts-asset-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    return data if binary else json.loads(data)

def toonify(path):
    im = Image.open(path).convert("RGB")
    if max(im.size) > 1024:
        im.thumbnail((1024, 1024))
    im = im.filter(ImageFilter.MedianFilter(5)).quantize(colors=14, method=Image.Quantize.MEDIANCUT).convert("RGB")
    im.save(path, quality=88)

DROP = ("nor", "normal", "rough", "arm", "metal", "spec", "ao", "occlusion", "disp", "height", "emission")

def clean_gltf(d):
    """keep only base-colour textures; strip PBR maps so the toon material gets a clean diffuse"""
    g = json.load(open(os.path.join(d, "model.gltf")))
    keep = set()
    for m in g.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        if "baseColorTexture" in pbr:
            keep.add(pbr["baseColorTexture"]["index"])
        for k in ["normalTexture", "occlusionTexture", "emissiveTexture"]:
            m.pop(k, None)
        pbr.pop("metallicRoughnessTexture", None)
        m.pop("extensions", None)
    used_imgs = {g["textures"][i]["source"] for i in keep} if "textures" in g else set()
    for i, img in enumerate(g.get("images", [])):
        p = os.path.join(d, img.get("uri", ""))
        if i in used_imgs and os.path.exists(p):
            toonify(p)
        elif os.path.exists(p) and img.get("uri"):
            os.remove(p)
    json.dump(g, open(os.path.join(d, "model.gltf"), "w"))

credits = []
for a in json.load(open(LIST)):
    d = os.path.join(ROOT, a["name"])
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    if a["src"] == "polyhaven":
        fl = get(f"https://api.polyhaven.com/files/{a['id']}", binary=False)
        if "gltf" not in fl:
            print(f"{a['name']}: no glTF on Poly Haven, skipped", flush=True); shutil.rmtree(d); continue
        files = fl["gltf"]["1k"]["gltf"]
        open(os.path.join(d, "model.gltf"), "wb").write(get(files["url"]))
        for rel, f in files["include"].items():
            if any(k in rel.lower() for k in DROP) and not rel.endswith(".bin"):
                continue
            p = os.path.join(d, rel)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, "wb").write(get(f["url"]))
        info = get(f"https://api.polyhaven.com/info/{a['id']}", binary=False)
        credits.append(f"- **{a['name']}**: \"{info.get('name', a['id'])}\" by {', '.join(info.get('authors', {}).keys())}, Poly Haven, CC0 — https://polyhaven.com/a/{a['id']}")
    else:
        meta = get(f"https://api.sketchfab.com/v3/models/{a['uid']}", binary=False)
        lic = (meta.get("license") or {}).get("slug", "")
        if lic not in ("by", "cc0"):
            sys.exit(f"{a['name']}: licence '{lic}' is not CC-BY or CC0; refusing")
        dl = get(f"https://api.sketchfab.com/v3/models/{a['uid']}/download", binary=False)
        z = zipfile.ZipFile(io.BytesIO(get(dl["gltf"]["url"])))
        for n in z.namelist():
            if n.endswith("/") or ".." in n or n.startswith("/"):
                continue
            p = os.path.join(d, n)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, "wb").write(z.read(n))
        if os.path.exists(os.path.join(d, "scene.gltf")):
            os.rename(os.path.join(d, "scene.gltf"), os.path.join(d, "model.gltf"))
        for junk in ["license.txt"]:
            if os.path.exists(os.path.join(d, junk)):
                os.remove(os.path.join(d, junk))
        credits.append(f"- **{a['name']}**: \"{meta['name']}\" by {meta['user']['displayName']} ({meta['user']['username']}), Sketchfab, {(meta.get('license') or {}).get('label', lic)} — https://sketchfab.com/3d-models/{a['uid']}")
    clean_gltf(d)
    size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(d) for f in fs)
    print(f"{a['name']}: {size / 1e6:.2f} MB", flush=True)
open(os.path.join(ROOT, "CREDITS.md"), "w").write(f"# 3D asset credits: {FILM}\n\nPaste the CC-BY lines into the YouTube description.\n\n" + "\n".join(credits) + "\n")
print(open(os.path.join(ROOT, "CREDITS.md")).read())
# pack every model into one served file (the phone page serves .json, not .gltf/.bin)
import subprocess
subprocess.run([sys.executable, "-I", os.path.join(os.path.dirname(__file__), "embed.py"), ROOT], check=True)
