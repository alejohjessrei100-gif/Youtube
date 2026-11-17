"""Blender look test: Henry in front of "Girl in Yellow" in the night gallery (the museum short, scene 4), built
entirely from code, rendered as one 1080x1920 still in EEVEE and in Cycles for a side-by-side with the three.js look.
    blender -b -P gallery_test.py -- <engine: eevee|cycles> <out.png> <painting.png>
Blender is Z-up: a three.js point (x, y, z) is (x, -z, y) here."""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["cycles", "/tmp/out.png", "/tmp/june.png"]
ENGINE, OUT, PAINT_IMG = argv[0], argv[1], argv[2]


def V(x, y, z):
    return Vector((x, -z, y))


# ------------------------------------------------------------------ clean scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
col = sc.collection


def mat(name, color, rough=0.6, metal=0.0, spec=0.4, emit=None, emit_k=0.0, tex=None, bump=0.0, sss=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = spec
    if sss > 0 and "Subsurface Weight" in b.inputs:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (0.9, 0.35, 0.2)
        b.inputs["Subsurface Scale"].default_value = 0.02
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = emit_k
    if tex == "checker":
        t = nt.nodes.new("ShaderNodeTexChecker")
        t.inputs["Scale"].default_value = 8
        t.inputs["Color1"].default_value = (0.82, 0.78, 0.7, 1)
        t.inputs["Color2"].default_value = (0.03, 0.03, 0.04, 1)
        nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    if tex == "image":
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(PAINT_IMG)
        nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    if bump > 0:
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = 60
        bn = nt.nodes.new("ShaderNodeBump")
        bn.inputs["Strength"].default_value = bump
        nt.links.new(n.outputs["Fac"], bn.inputs["Height"])
        nt.links.new(bn.outputs["Normal"], b.inputs["Normal"])
    return m


def obj(mesh_op, name, loc, scale=(1, 1, 1), rot=(0, 0, 0), m=None, smooth=False, bevel=0.0, subsurf=0, **kw):
    mesh_op(location=loc, rotation=rot, **kw)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    if m:
        o.data.materials.append(m)
    if bevel > 0:
        md = o.modifiers.new("bevel", "BEVEL")
        md.width = bevel
        md.segments = 3
    if subsurf:
        md = o.modifiers.new("sub", "SUBSURF")
        md.levels = subsurf
        md.render_levels = subsurf
    if smooth:
        bpy.ops.object.shade_smooth()
    return o


box = bpy.ops.mesh.primitive_cube_add
cyl = bpy.ops.mesh.primitive_cylinder_add
sph = bpy.ops.mesh.primitive_uv_sphere_add
tor = bpy.ops.mesh.primitive_torus_add

# ------------------------------------------------------------------ materials
M = {
    "wall": mat("wall", (0.07, 0.2, 0.2), rough=0.85, bump=0.15),
    "wood": mat("wood", (0.22, 0.1, 0.04), rough=0.45, bump=0.05),
    "trim": mat("trim", (0.72, 0.66, 0.52), rough=0.6),
    "floor": mat("floor", (1, 1, 1), rough=0.22, spec=0.6, tex="checker"),
    "gold": mat("gold", (0.85, 0.6, 0.22), rough=0.28, metal=1.0),
    "paint": mat("paint", (1, 1, 1), rough=0.75, tex="image"),
    "velvet": mat("velvet", (0.35, 0.02, 0.05), rough=0.9),
    "hoodie": mat("hoodie", (0.11, 0.12, 0.15), rough=0.95, bump=0.3),
    "jeans": mat("jeans", (0.05, 0.08, 0.16), rough=0.9, bump=0.2),
    "skin": mat("skin", (0.8, 0.52, 0.38), rough=0.55, sss=0.15),
    "hair": mat("hair", (0.85, 0.84, 0.82), rough=0.7),
    "shoe": mat("shoe", (0.2, 0.09, 0.04), rough=0.4),
    "black": mat("black", (0.01, 0.01, 0.01), rough=0.3),
    "white": mat("white", (0.95, 0.95, 0.95), rough=0.3),
    "glass": mat("glassframe", (0.15, 0.1, 0.07), rough=0.3, metal=0.5),
    "bench": mat("bench", (0.18, 0.08, 0.03), rough=0.5),
    "cushion": mat("cushion", (0.3, 0.03, 0.06), rough=0.9),
    "paper": mat("paper", (0.9, 0.87, 0.8), rough=0.9),
}

# ------------------------------------------------------------------ the gallery (x in [-5.2,5.2], z in [-6.4,6.4], h 5.2)
GX, GZ, GH = 5.2, 6.4, 5.2
obj(bpy.ops.mesh.primitive_plane_add, "floor", V(0, 0, 0), (GX, GZ, 1), m=M["floor"], size=2)
for name, loc, sc_, rot in [
    ("back", V(0, GH / 2, -GZ), (GX, 0.05, GH / 2), (0, 0, 0)),
    ("left", V(-GX, GH / 2, 0), (0.05, GZ, GH / 2), (0, 0, 0)),
    ("right", V(GX, GH / 2, 0), (0.05, GZ, GH / 2), (0, 0, 0)),
    ("front", V(0, GH / 2, GZ), (GX, 0.05, GH / 2), (0, 0, 0)),
]:
    obj(box, name, loc, sc_, m=M["wall"], size=2)
obj(box, "ceiling", V(0, GH, 0), (GX, GZ, 0.05), m=M["trim"], size=2)
# wainscot, chair rail, baseboard, crown along the back and side walls
for z0, axis in [(-GZ + 0.05, "x"), (None, "l"), (None, "r")]:
    if axis == "x":
        obj(box, "wain_b", V(0, 0.52, -GZ + 0.06), (GX, 0.03, 0.52), m=M["wood"], size=2, bevel=0.01)
        obj(box, "rail_b", V(0, 1.06, -GZ + 0.09), (GX, 0.05, 0.03), m=M["wood"], size=2, bevel=0.01)
        obj(box, "crown_b", V(0, GH - 0.12, -GZ + 0.09), (GX, 0.08, 0.11), m=M["trim"], size=2, bevel=0.02)
        for k in range(8):
            obj(box, f"panel_b{k}", V(-GX + 0.65 + k * 1.3, 0.54, -GZ + 0.1), (0.45, 0.01, 0.31), m=M["wood"], size=2, bevel=0.015)
    else:
        s = -1 if axis == "l" else 1
        obj(box, f"wain_{axis}", V(s * (GX - 0.06), 0.52, 0), (0.03, GZ, 0.52), m=M["wood"], size=2, bevel=0.01)
        obj(box, f"rail_{axis}", V(s * (GX - 0.09), 1.06, 0), (0.05, GZ, 0.03), m=M["wood"], size=2, bevel=0.01)
        obj(box, f"crown_{axis}", V(s * (GX - 0.09), GH - 0.12, 0), (0.08, GZ, 0.11), m=M["trim"], size=2, bevel=0.02)

# THE painting: canvas, gilt frame, picture light
PX, PY, PZ, PW, PH = 0.0, 2.05, -GZ + 0.12, 1.05, 1.36
cv = obj(bpy.ops.mesh.primitive_plane_add, "canvas", V(PX, PY, PZ + 0.02), (PW / 2, PH / 2, 1), rot=(math.pi / 2, 0, 0), m=M["paint"], size=2)
fw = 0.09
for name, x, y, w, h in [("ft", 0, PH / 2 + fw / 2, PW + 2 * fw, fw), ("fb", 0, -PH / 2 - fw / 2, PW + 2 * fw, fw), ("fl", -PW / 2 - fw / 2, 0, fw, PH), ("fr", PW / 2 + fw / 2, 0, fw, PH)]:
    obj(box, name, V(PX + x, PY + y, PZ + 0.03), (w / 2, 0.045, h / 2), m=M["gold"], size=2, bevel=0.02)
obj(box, "plight", V(PX, PY + PH / 2 + 0.42, PZ + 0.22), (0.26, 0.15, 0.03), m=M["gold"], size=2, bevel=0.01)
bpy.ops.object.light_add(type="SPOT", location=V(PX, PY + PH / 2 + 0.38, PZ + 0.32))
pl = bpy.context.active_object
pl.data.energy = 60
pl.data.color = (1.0, 0.85, 0.6)
pl.data.spot_size = math.radians(70)
pl.data.spot_blend = 0.6
pl.rotation_euler = (math.radians(25), 0, 0)
# placard, stanchions and a velvet rope, the bench
obj(box, "placard", V(PX + 1.0, 1.42, -GZ + 0.07), (0.21, 0.01, 0.13), m=M["paper"], size=2)
for x in (-1.2, 1.2):
    obj(cyl, f"post{x}", V(x, 0.48, -GZ + 1.0), (0.03, 0.03, 0.48), m=M["gold"], smooth=True, vertices=16)
    obj(cyl, f"base{x}", V(x, 0.025, -GZ + 1.0), (0.17, 0.17, 0.025), m=M["gold"], smooth=True, vertices=24)
    obj(sph, f"knob{x}", V(x, 0.98, -GZ + 1.0), (0.055, 0.055, 0.055), m=M["gold"], smooth=True)
rope = obj(tor, "rope", V(0, 0.82, -GZ + 1.0), (1, 1, 1), rot=(math.pi / 2, 0, 0), m=M["velvet"], smooth=True, major_radius=1.2, minor_radius=0.035, major_segments=64, minor_segments=12)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="DESELECT")
bpy.ops.object.mode_set(mode="OBJECT")
for vtx in rope.data.vertices:
    if vtx.co.y > 0.0:  # (torus local y = up after rotation) drop the upper half: a hanging loop
        vtx.select = True
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.delete(type="VERT")
bpy.ops.object.mode_set(mode="OBJECT")
obj(box, "bench", V(0, 0.46, -2.6), (1.0, 0.3, 0.06), m=M["bench"], size=2, bevel=0.02)
obj(box, "cushion", V(0, 0.54, -2.6), (0.95, 0.26, 0.04), m=M["cushion"], size=2, bevel=0.03)
for x in (-0.85, 0.85):
    obj(box, f"leg{x}", V(x, 0.21, -2.6), (0.06, 0.25, 0.21), m=M["bench"], size=2, bevel=0.01)

# ------------------------------------------------------------------ Henry, 81: grey hoodie (hood back), white hair, round glasses
HX, HZ = 0.15, -4.75
FACE = 0.15  # body turned slightly toward the lens (rad)


def part(fn, name, x, y, z, s, m, **kw):
    o = obj(fn, name, V(HX + x, y, HZ + z), s, m=m, smooth=True, **kw)
    return o


# legs and shoes
for sx in (-0.1, 0.1):
    part(cyl, f"leg{sx}", sx, 0.42, 0, (0.075, 0.075, 0.38), M["jeans"], vertices=24)
    part(sph, f"shoe{sx}", sx, 0.05, 0.06, (0.085, 0.14, 0.055), M["shoe"])
# torso: a soft pear, the hoodie's pocket, drawstrings
t = part(sph, "torso", 0, 1.05, 0, (0.26, 0.2, 0.36), M["hoodie"], segments=48, ring_count=24)
part(box, "pocket", 0, 0.9, 0.18, (0.16, 0.02, 0.07), M["hoodie"], size=2)
for sx in (-0.04, 0.04):
    part(cyl, f"string{sx}", sx, 1.25, 0.2, (0.006, 0.006, 0.08), M["white"], vertices=8)
# arms hanging, hands
for sx in (-1, 1):
    a = part(cyl, f"arm{sx}", sx * 0.3, 1.02, 0.02, (0.06, 0.06, 0.3), M["hoodie"], vertices=20)
    a.rotation_euler = (0, sx * math.radians(8), 0)
    part(sph, f"hand{sx}", sx * 0.34, 0.7, 0.03, (0.055, 0.05, 0.06), M["skin"])
# the hood pushed back: a bunched roll behind the neck
part(tor, "hood", 0, 1.42, -0.06, (1, 0.75, 1), M["hoodie"], major_radius=0.17, minor_radius=0.07)
# head: a squircle-ish rounded box, white hair at the sides and back, ears, glasses, a face
hd = part(box, "head", 0, 1.62, 0.02, (0.17, 0.155, 0.17), M["skin"], size=2, subsurf=3)
hd.modifiers["sub"].levels = 2
for sx in (-1, 1):
    part(sph, f"hair{sx}", sx * 0.15, 1.6, -0.03, (0.05, 0.12, 0.1), M["hair"])
    part(sph, f"ear{sx}", sx * 0.175, 1.6, 0.0, (0.025, 0.045, 0.035), M["skin"])
part(sph, "hairback", 0, 1.58, -0.12, (0.15, 0.08, 0.1), M["hair"])
for sx in (-1, 1):
    part(sph, f"eyew{sx}", sx * 0.06, 1.65, 0.168, (0.035, 0.012, 0.042), M["white"])
    part(sph, f"pupil{sx}", sx * 0.06, 1.645, 0.178, (0.017, 0.006, 0.02), M["black"])
    part(tor, f"lens{sx}", sx * 0.06, 1.65, 0.185, (1, 1, 1), M["glass"], major_radius=0.045, minor_radius=0.005).rotation_euler = (math.pi / 2, 0, 0)
    part(sph, f"brow{sx}", sx * 0.062, 1.715, 0.17, (0.035, 0.008, 0.01), M["hair"])
part(cyl, "bridge", 0, 1.655, 0.186, (0.003, 0.003, 0.02), M["glass"], vertices=6).rotation_euler = (0, math.pi / 2, 0)
part(sph, "nose", 0, 1.6, 0.18, (0.022, 0.03, 0.02), M["skin"])
part(sph, "mouth", 0, 1.54, 0.17, (0.025, 0.012, 0.008), M["black"])

# ------------------------------------------------------------------ lights: moonlit skylight, two flashlights, a warm fill
bpy.ops.object.light_add(type="AREA", location=V(-0.4, GH - 0.2, -1.6))
sky = bpy.context.active_object
sky.data.shape = "RECTANGLE"
sky.data.size, sky.data.size_y = 2.6, 4.2
sky.data.energy = 900
sky.data.color = (0.55, 0.65, 1.0)
for name, p, tgt in [("torchD", V(1.7, 1.25, -2.9), V(HX, 1.35, HZ)), ("torchM", V(-1.45, 1.35, -3.0), V(HX, 1.45, HZ))]:
    bpy.ops.object.light_add(type="SPOT", location=p)
    L = bpy.context.active_object
    L.name = name
    L.data.energy = 140
    L.data.color = (1.0, 0.93, 0.8)
    L.data.spot_size = math.radians(30)
    L.data.spot_blend = 0.5
    L.data.shadow_soft_size = 0.03
    d = (tgt - p).normalized()
    L.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.light_add(type="POINT", location=V(0.5, 1.8, -2.6))
fill = bpy.context.active_object
fill.data.energy = 25
fill.data.color = (1.0, 0.8, 0.6)
fill.data.shadow_soft_size = 0.6
world = bpy.data.worlds.new("w")
sc.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.01, 0.012, 0.025, 1)

# ------------------------------------------------------------------ camera: the shot just after "eighty-one", pulling back
bpy.ops.object.camera_add(location=V(0.25, 1.6, -1.9))
cam = bpy.context.active_object
sc.camera = cam
d = (V(0.15, 1.42, -4.75) - cam.location).normalized()
cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
cam.data.lens_unit = "FOV"
cam.data.angle = math.radians(46 * 9 / 16 * 1.25)
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = (V(0.15, 1.5, -4.75) - cam.location).length
cam.data.dof.aperture_fstop = 2.8

# ------------------------------------------------------------------ render settings
r = sc.render
r.resolution_x, r.resolution_y, r.resolution_percentage = 1080, 1920, 100
r.filepath = OUT
r.image_settings.file_format = "PNG"
sc.view_settings.view_transform = "AgX" if "AgX" in [i.identifier for i in sc.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"
sc.view_settings.look = "None"
if ENGINE == "cycles":
    r.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
            if any(dv.type == kind for dv in prefs.devices):
                break
        except Exception:
            continue
    for dv in prefs.devices:
        dv.use = dv.type != "CPU"
    print("cycles devices:", [(dv.name, dv.type, dv.use) for dv in prefs.devices], "->", prefs.compute_device_type)
    sc.cycles.device = "GPU"
    sc.cycles.samples = 256
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
else:
    engines = [e.identifier for e in r.bl_rna.properties["engine"].enum_items]
    r.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    ee = sc.eevee
    for attr, val in (("taa_render_samples", 64), ("use_raytracing", True), ("use_shadows", True), ("use_gtao", True), ("use_bloom", True), ("use_soft_shadows", True)):
        if hasattr(ee, attr):
            setattr(ee, attr, val)
if os.environ.get("PREVIEW"):  # a quick low-res CPU check before spending GPU time
    r.resolution_percentage = 30
    if ENGINE == "cycles":
        sc.cycles.device = "CPU"
        sc.cycles.samples = 24
print("engine:", r.engine, "->", OUT)
bpy.ops.render.render(write_still=True)
print("done", OUT)
