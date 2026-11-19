"""Create/update the dataset (project.tgz + render.json) and the render script on Kaggle, then print the status.
   python3 tools/kaggle/push.py [--run]    (run tools/kaggle/pack.sh first)
Auth comes from the session's network proxy (no key on disk). The script is private; GPU + Internet must be enabled in the
notebook settings (kernel-metadata asks for both)."""
import json, os, shutil, subprocess, sys
os.chdir(os.path.join(os.path.dirname(__file__), "../.."))
env = {**os.environ, "KAGGLE_USERNAME": "alejohjessrei", "KAGGLE_KEY": "proxy-injected", "KAGGLE_API_TOKEN": "proxy-injected"}
def kg(*a): print("$ kaggle", *a, flush=True); return subprocess.run(["kaggle", *a], env=env).returncode
ds = "out/kaggle/dataset"
st = subprocess.run(["kaggle", "datasets", "status", "alejohjessrei/youtube-shorts-project"], env=env, capture_output=True, text=True).stdout.strip()
kg(*(["datasets", "version", "-p", ds, "-m", "update", "--dir-mode", "zip"] if st and "404" not in st and "ot found" not in st else ["datasets", "create", "-p", ds, "--dir-mode", "zip"]))
K = "out/kaggle/kernel"; shutil.rmtree(K, ignore_errors=True); os.makedirs(K)
shutil.copy("tools/kaggle/render.py", K)
json.dump({"id": "alejohjessrei/shorts-render", "title": "shorts-render", "code_file": "render.py", "language": "python", "kernel_type": "script",
           "is_private": True, "enable_gpu": True, "enable_internet": True, "dataset_sources": ["alejohjessrei/youtube-shorts-project"]},
          open(f"{K}/kernel-metadata.json", "w"), indent=1)
sys.exit(kg("kernels", "push", "-p", K))
