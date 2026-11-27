#!/usr/bin/env bash
# One-time setup on macOS / Linux. Run from the skill folder:  bash setup/setup.sh
# Needs: Python 3.10+ and Node.js 18+ installed.
set -e
cd "$(dirname "$0")/.."
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r setup/requirements.txt
mkdir -p models
[ -f models/face_landmarker.task ] || curl -L -o models/face_landmarker.task \
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
(cd engine && npm install)
echo "Setup done. The speech and cut-out models download automatically on first use."
