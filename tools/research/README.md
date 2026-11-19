# tools/research: watching reference videos properly

`watch.py` decodes EVERY frame of a video file and reports: cuts and shot lengths, camera motion per frame pair
(pan / tilt / zoom, fast moves), the look of each shot, the narration with word timings (faster-whisper "small"),
effect onsets outside speech and loudness. It writes `report.md`, `report.json`, first/middle/last-frame sheets per
shot and every frame +-3 around each cut.

Setup (once per machine):
    python3 -m venv <dir>/asrenv && <dir>/asrenv/bin/pip install faster-whisper opencv-python-headless Pillow
Run:
    <dir>/asrenv/bin/python -I tools/research/watch.py VIDEO.mp4 OUT_DIR

Validated on our own Crow render (2026-11-19): 11/11 cuts found within one frame, the narration word-perfect, fast
moves found where they were (the 11.5 s swoop, the 29 s whip pan). Limits: slow pushes read as small zooms;
effects in the music bed are not separated from music.

Inputs must be video files the user provides (screen recordings or files they obtained). This tool never fetches
anything from YouTube.
