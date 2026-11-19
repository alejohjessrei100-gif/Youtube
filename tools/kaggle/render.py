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
for c in cfg["comps"]:
    out = f"/kaggle/working/{c['file']}"
    # angle = the GPU path when a GPU is present, else software; 2 renders in parallel is the safe default
    sh(f'npx remotion render src/index.ts {c["id"]} "{out}" --gl=angle --concurrency=4 --timeout=240000 --log=warn', cwd=W)
    print(f"[{c['id']}] done, {os.path.getsize(out)/1e6:.1f} MB, elapsed {time.time()-t0:.0f}s", flush=True)
shutil.rmtree(W, ignore_errors=True)   # keep /kaggle/working to the mp4s only
print(sorted(os.listdir("/kaggle/working")))
