"""Builds and pushes the Kaggle render job for blender/gallery_test.py (private notebook, GPU + internet on).
    python blender/kaggle_job.py <painting.jpg> <slug-owner>   (the Kaggle API key is injected by the network proxy)"""
import base64, json, sys
import requests

img_path, owner = sys.argv[1], sys.argv[2]
img = base64.b64encode(open(img_path, "rb").read()).decode()
scene = open("blender/gallery_test.py").read()
JOB = r'''# Blender look test on Kaggle GPU: downloads Blender 4.2 LTS, builds the gallery scene from code, renders one
# 1080x1920 still in Cycles and in EEVEE, and times both. Outputs land in /kaggle/working.
import base64, os, subprocess, time, pathlib
W = pathlib.Path("/kaggle/working"); W.mkdir(exist_ok=True)
T = pathlib.Path("/kaggle/tmp"); T.mkdir(exist_ok=True)
subprocess.run(["nvidia-smi"], check=False)
(T / "june.jpg").write_bytes(base64.b64decode(IMG))
(T / "gallery_test.py").write_text(SCENE)
url = "https://download.blender.org/release/Blender4.2/blender-4.2.3-linux-x64.tar.xz"
t0 = time.time()
subprocess.run("cd /kaggle/tmp && wget -q " + url + " -O b.tar.xz && tar -xf b.tar.xz && rm b.tar.xz", shell=True, check=True)
print("blender downloaded in", round(time.time() - t0), "s", flush=True)
subprocess.run("apt-get install -y -qq libegl1 libxkbcommon0 libsm6 libxi6 libxrender1 libxfixes3 libgl1 > /dev/null 2>&1", shell=True)
B = "/kaggle/tmp/blender-4.2.3-linux-x64/blender"
KEYS = ("engine", "devices", "done", "Error", "error", "Saved", "EGL", "GPU", "Traceback")
for eng in ("cycles", "eevee"):
    t0 = time.time()
    r = subprocess.run([B, "-b", "-P", str(T / "gallery_test.py"), "--", eng, str(W / ("gallery_" + eng + ".png")), str(T / "june.jpg")], capture_output=True, text=True)
    dt = time.time() - t0
    print("=== " + eng + ": exit " + str(r.returncode) + " in " + str(round(dt, 1)) + " s", flush=True)
    lines = [l for l in (r.stdout + r.stderr).splitlines() if any(k in l for k in KEYS)]
    print(chr(10).join(lines[-40:]), flush=True)
    (W / ("log_" + eng + ".txt")).write_text(r.stdout[-20000:] + chr(10) + "---" + chr(10) + r.stderr[-20000:])
print(sorted(os.listdir(W)))
'''
text = "IMG = " + json.dumps(img) + "\nSCENE = " + json.dumps(scene) + "\n" + JOB
compile(text, "job", "exec")  # syntax check before pushing
body = {"slug": owner + "/blender-gallery-look-test", "newTitle": "Blender Gallery Look Test", "text": text, "language": "python", "kernelType": "script", "isPrivate": True,
        "enableGpu": True, "enableTpu": False, "enableInternet": True, "datasetDataSources": [], "competitionDataSources": [], "kernelDataSources": [], "modelDataSources": [], "categoryIds": []}
r = requests.post("https://www.kaggle.com/api/v1/kernels/push", json=body, headers={"Authorization": "Bearer proxy-injected"}, timeout=120)
print(r.status_code, r.text[:300])
