"""Create a new video project folder.

Usage: python new_project.py "<Title with emoji>" <short|long>
Prints the project path.
"""
import re, sys, unicodedata
from pathlib import Path
from common import PROJECTS, DIRS, save_json


def slugify(title):
    t = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:60]


def main():
    title, fmt = sys.argv[1], sys.argv[2].lower()
    if fmt not in ("short", "long"):
        sys.exit("format must be short or long")
    root = PROJECTS / slugify(title)
    for sub in DIRS.values():
        (root / sub).mkdir(parents=True, exist_ok=True)
    save_json(root / DIRS["title"] / "project.json", {"title": title, "format": fmt})
    print(root)


if __name__ == "__main__":
    main()
