"""Shared helpers for the Voggle pipeline."""
import json, os, re, subprocess, sys
from pathlib import Path

try:  # Windows consoles default to cp1252; our reports use · – → and emoji
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SKILL = Path(__file__).resolve().parent.parent
ENGINE = SKILL / "engine"
MODELS = SKILL / "models"
# Where video projects live: $VOGGLE_PROJECTS, or "Voggle Projects" in your home folder
PROJECTS = Path(os.environ.get("VOGGLE_PROJECTS") or (Path.home() / "Voggle Projects"))
FPS = 24
W, H = 1080, 1920

# Project sub-folders (created by new_project.py)
DIRS = {
    "title": "00_title",
    "script": "01_script",
    "voice": "02_voice",
    "timing": "03_timing",
    "beats": "04_beats",
    "prompts": "05_prompts",
    "images": "06_images",      # user drops generated images here
    "layers": "07_layers",      # processed cutouts / plates + faces.json
    "render": "08_render",
    "publish": "09_publish",
}


def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        sys.exit(f"command failed: {' '.join(map(str, cmd))}\n{r.stderr[-2000:]}")
    return r


def load_json(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def save_json(p, data):
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    Path(p).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def project_dir(arg):
    p = Path(arg)
    if not p.is_absolute() and not p.exists():
        p = PROJECTS / arg
    if not p.exists():
        sys.exit(f"project not found: {p}")
    return p


def d(project, key):
    p = Path(project) / DIRS[key]
    p.mkdir(parents=True, exist_ok=True)
    return p


def norm_word(t):
    return re.sub(r"[^a-z0-9']", "", t.lower().replace("’", "'"))


def script_tokens(text):
    """Narration tokens exactly as captions will show them (one word each).
    Lines starting with '#' or '[' (headings / notes) are ignored."""
    lines = [l for l in text.splitlines() if l.strip() and not l.lstrip().startswith(("#", "[", ">"))]
    return [t for t in " ".join(lines).split() if norm_word(t) or t in ("...",)]
