import json
def back(u, v, H, z=1.5):
    h = max(800.0, z * H - 1920 * (z - 1))
    return [round(540 + z * (u - 540)), round(960 + z * (v - 960)), round(h)]
def king(**k): return dict(dict(id="king", type="king", z=1.0, face=0), **k)
KNIGHT = dict(id="knight", type="knight", z=1.0, face=0.3, dir=1)
GUARD = dict(type="knight", z=1.0, face=0.3, dir=1, torso="#2f5a9a", scale=1.1, y=1640, expr="deadpan", pose="stand")
SURV = back(292, 480, 1180)
sb = {"title": "The king who banned Tuesdays", "fps": 30, "end_pad": 0.7, "lowercase": True, "scenes": [
 {"id": "decree", "start_word": 0, "set": "throne_room", "mood": "day", "set_args": {"calendars": "wall"},
  "cast": [king(x=640, y=1620, scale=1.15, pose="hips", expr="smug"),
           dict(KNIGHT, x=200, y=1640, scale=1.1, pose="stand", expr="sad")],
  "keys": [{"w": 0, "frame": back(540, 520, 1180)}, {"w": 2, "frame": [700, 1250, 1100]}, {"w": 4, "frame": "king:face"}, {"w": 7, "frame": "wide"},
           {"w": 10, "frame": [440, 1260, 1600]}, {"w": 13, "frame": [170, 1222, 836]}, {"w": 16, "frame": [1040, 1185, 810]}, {"w": 21, "frame": [740, 1183, 874]}],
  "acts": [{"w": 4, "who": "king", "pose": "point"}, {"w": 7, "who": "king", "pose": "hips"},
           {"w": 12, "who": "knight", "pose": "shrug", "talk": True}, {"w": 15, "who": "knight", "talk": False},
           {"w": 16, "who": "king", "pose": "point", "expr": "angry", "talk": True}, {"w": 25, "who": "king", "talk": False}]},
 {"id": "stopped", "start_word": 26, "set": "throne_room", "mood": "night", "set_args": {"calendars": "bare"},
  "cast": [king(x=640, y=1620, scale=1.15, pose="point", expr="angry")],
  "keys": [{"w": 26, "frame": "king"}, {"w": 29, "frame": "king:face"}, {"w": 32, "frame": SURV}, {"w": 35, "frame": "king:face"}],
  "acts": [{"w": 26, "who": "king", "talk": True}, {"w": 31, "who": "king", "talk": False}, {"w": 33, "who": "king", "expr": "shocked", "pose": "stand"}]},
 {"id": "soup", "start_word": 36, "set": "kitchen", "mood": "interior",
  "cast": [dict(id="cook", type="cook", x=360, y=1560, scale=1.1, z=1.0, face=0.3, dir=1, pose="hold", expr="deadpan")],
  "keys": [{"w": 36, "frame": "cook:face"}, {"w": 39, "frame": back(450, 540, 1180, z=1.3)}]},
 {"id": "guards", "start_word": 41, "set": "throne_room", "mood": "day", "set_args": {"calendars": "bare"},
  "cast": [king(x=540, y=1460, scale=1.05, pose="stand", expr="angry"),
           dict(GUARD, id="guardB", x=945, y=1720, scale=1.0, dir=-1, face=-0.2), dict(GUARD, id="guardA", x=135, y=1780, scale=1.0, dir=1, face=0.2)],
  "keys": [{"w": 41, "frame": "wide"}, {"w": 47, "frame": [540, 1061, 800]}, {"w": 52, "frame": "wide"}],
  "acts": [{"w": 41, "who": "guardA", "x": 945, "dur": 1.5}, {"w": 41, "who": "guardB", "x": 135, "dur": 1.5},
           {"w": 47, "who": "king", "pose": "cheer", "talk": True}, {"w": 51, "who": "king", "talk": False},
           {"w": 52, "who": "king", "pose": "stand", "expr": "sad"}]},
 {"id": "bed", "start_word": 54, "set": "bedchamber", "mood": "night", "set_args": {"day": "MON"},
  "cast": [dict(KNIGHT, x=150, y=1720, scale=1.0, pose="stand", expr="deadpan"), king(x=540, y=1460, scale=0.95, pose="sit", expr="sly")],
  "keys": [{"w": 54, "frame": "wide"}, {"w": 59, "frame": "knight:face"}, {"w": 66, "frame": "king:face"}, {"w": 71, "frame": "wide"},
           {"w": 78, "frame": back(650, 400, 1250)}, {"w": 81, "frame": "king:face"}],
  "acts": [{"w": 59, "who": "knight", "talk": True, "pose": "shrug"}, {"w": 65, "who": "knight", "talk": False, "pose": "stand"},
           {"w": 66, "who": "king", "talk": True}, {"w": 70, "who": "king", "talk": False}, {"w": 80, "who": "king", "expr": "sad"}, {"w": 83, "who": "king", "expr": "deadpan"}]},
 {"id": "explain", "start_word": 85, "set": "bedchamber", "mood": "golden", "set_args": {"day": "MON"}, "calm": True, "bloom": 0.6,
  "cast": [king(x=540, y=1460, scale=0.95, pose="sit", expr="deadpan")],
  "keys": [{"w": 85, "frame": back(540, 420, 1250)}, {"w": 92, "frame": back(560, 400, 1180)}, {"w": 100, "frame": back(805, 365, 1180)}, {"w": 103, "frame": "king:face"}]},
 {"id": "end", "start_word": 105, "set": "bedchamber", "mood": "dawn", "set_args": {"day": "MON"}, "calm": True,
  "cast": [king(x=540, y=1460, scale=0.95, pose="sit", expr="happy"),
           dict(id="cook", type="cook", x=1300, y=1700, scale=1.0, z=1.0, face=-0.3, dir=-1, pose="stand", expr="deadpan")],
  "keys": [{"w": 105, "frame": "wide"}, {"w": 117, "frame": "king:face"}, {"w": 121, "frame": [740, 1250, 1250]}, {"w": 126, "frame": "cook:face"}],
  "acts": [{"w": 117, "who": "king", "pose": "cheer"}, {"w": 120, "who": "cook", "x": 1010, "dur": 1.0},
           {"w": 121, "who": "king", "expr": "shocked", "pose": "sit"}, {"w": 122, "who": "cook", "pose": "shrug", "talk": True}]},
]}
json.dump(sb, open('/tmp/claude-0/work/short2/storyboard.json', 'w'), indent=1)
