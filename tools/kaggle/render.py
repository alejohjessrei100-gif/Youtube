"""Kaggle script: render the Remotion compositions listed in render.json (from the 'youtube-shorts-project' dataset).
Outputs go to /kaggle/working/*.mp4 (named by the YouTube title). Needs: Internet ON (npm + Chromium). GPU optional."""
import glob, json, os, shutil, subprocess, sys, tarfile, time

def sh(cmd, cwd=None, check=True):
    print("$", cmd, flush=True)
    r = subprocess.run(cmd, shell=True, cwd=cwd, executable="/bin/bash")
    if check and r.returncode: sys.exit(f"FAILED ({r.returncode}): {cmd}")

src = glob.glob("/kaggle/input/**/project.tgz", recursive=True)[0]
cfg = json.load(open(os.path.join(os.path.dirname(src), "render.json"), encoding="utf-8"))
W = "/kaggle/working/proj"; shutil.rmtree(W, ignore_errors=True); os.makedirs(W)
tarfile.open(src).extractall(W)
sh("node --version || true", check=False)
if subprocess.run("node --version", shell=True).returncode or int(subprocess.run("node -p 'process.versions.node.split(\".\")[0]'", shell=True, capture_output=True, text=True).stdout or 0) < 18:
    sh("curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs")
sh("nvidia-smi -L || echo 'no GPU'", check=False)
sh("npm ci --no-audit --no-fund", cwd=W)
sh("npx remotion browser ensure", cwd=W, check=False)
t0 = time.time()
# Headless Chrome on Kaggle has no WebGL under --gl=angle ("GL_VENDOR = Disabled"). Probe one frame per mode; use the first that works.
first = cfg["comps"][0]["id"]
GL = None
for mode in ["egl", "angle-egl", "vulkan", "swangle"]:
    if os.path.exists("/tmp/probe.jpg"): os.remove("/tmp/probe.jpg")
    r = subprocess.run(f'npx remotion still src/index.ts {first} /tmp/probe.jpg --frame=30 --gl={mode} --timeout=120000 --log=error', shell=True, cwd=W, executable="/bin/bash")
    ok = r.returncode == 0 and os.path.exists("/tmp/probe.jpg")
    print(f"[probe] --gl={mode}: {'OK' if ok else 'failed'}", flush=True)
    if ok:
        GL = mode; break
if not GL: sys.exit("no working --gl mode")
print("using --gl=" + GL, flush=True)
for c in cfg["comps"]:
    out = f"/kaggle/working/{c['file']}"
    sh(f'npx remotion render src/index.ts {c["id"]} "{out}" --gl={GL} --concurrency=4 --timeout=240000 --log=warn', cwd=W)
    print(f"[{c['id']}] done, {os.path.getsize(out)/1e6:.1f} MB, elapsed {time.time()-t0:.0f}s", flush=True)
shutil.rmtree(W, ignore_errors=True)   # keep /kaggle/working to the mp4s only
print(sorted(os.listdir("/kaggle/working")))
