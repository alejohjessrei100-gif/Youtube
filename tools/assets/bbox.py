"""Print each model's world-space bounding box (metres) after its node transforms: python3 -I tools/assets/bbox.py public/assets/<film>"""
import json, os, struct, sys
import numpy as np
def trs(n):
    if "matrix" in n: return np.array(n["matrix"], dtype=float).reshape(4, 4).T
    T = np.eye(4); T[:3, 3] = n.get("translation", [0, 0, 0])
    x, y, z, w = n.get("rotation", [0, 0, 0, 1])
    R = np.eye(4); R[:3, :3] = [[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]]
    S = np.diag(list(n.get("scale", [1, 1, 1])) + [1])
    return T @ R @ S
for name in sorted(os.listdir(sys.argv[1])):
    f = os.path.join(sys.argv[1], name, "model.gltf")
    if not os.path.exists(f): continue
    g = json.load(open(f)); lo = np.full(3, 1e9); hi = -lo.copy(); tris = 0
    def walk(i, M):
        global lo, hi, tris
        n = g["nodes"][i]; M2 = M @ trs(n)
        if "mesh" in n:
            for p in g["meshes"][n["mesh"]]["primitives"]:
                a = g["accessors"][p["attributes"]["POSITION"]]
                mn, mx = np.array(a["min"]), np.array(a["max"])
                for c in [[x, y, z] for x in (mn[0], mx[0]) for y in (mn[1], mx[1]) for z in (mn[2], mx[2])]:
                    w = M2 @ np.array(c + [1.0]); lo = np.minimum(lo, w[:3]); hi = np.maximum(hi, w[:3])
                ia = p.get("indices"); tris += (g["accessors"][ia]["count"] // 3) if ia is not None else a["count"] // 3
        for c in n.get("children", []): walk(c, M2)
    sc = g["scenes"][g.get("scene", 0)]
    for r in sc["nodes"]: walk(r, np.eye(4))
    sz = hi - lo
    print(f"{name:12s} size {sz[0]:.3f} x {sz[1]:.3f} x {sz[2]:.3f}  min {np.round(lo,3)}  tris {tris}")
