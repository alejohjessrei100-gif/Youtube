"""Blender (bpy) version of the 5 s test, rendered with Cycles.

Usage:
  python3 scene.py --frames 30,80,130 --scale 50 --samples 32 --out frames/
  python3 scene.py --frames all --scale 100 --samples 64 --out frames/

Coordinates: positions are written in the three.js layout (x right, y up,
z toward camera) and converted with P() to Blender (z up, -y = front).
"""
import argparse
import math
import os
import random

import bpy
import bmesh
from mathutils import Vector
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
DUR = 5.0


def P(x, y, z):
    return Vector((x, -z, y))


def ease(x):
    t = min(1.0, max(0.0, x))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


# ------------------------------------------------------------------ materials
def nodes_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    return m, nt, out


def principled(name, color, rough=0.7, emission=None, strength=0.0, metal=0.0):
    m, nt, out = nodes_mat(name)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1)
        b.inputs["Emission Strength"].default_value = strength
    nt.links.new(b.outputs[0], out.inputs[0])
    return m


def emissive(name, color, strength):
    m, nt, out = nodes_mat(name)
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs[0].default_value = (*color, 1)
    e.inputs[1].default_value = strength
    nt.links.new(e.outputs[0], out.inputs[0])
    return m


def hexc(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x ** 2.2 for x in c)  # sRGB -> linear


def textured(name, kind, c1, c2, scale=1.0, bump=0.3, rough=0.8, c3=None):
    """Procedural surface: wood planks, stone bricks, dirt, roof tiles, grass."""
    m, nt, out = nodes_mat(name)
    N = nt.nodes.new
    L = nt.links.new
    tc = N("ShaderNodeTexCoord")
    mp = N("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale)
    L(tc.outputs["Object"], mp.inputs[0])
    b = N("ShaderNodeBsdfPrincipled")
    b.inputs["Roughness"].default_value = rough
    noise = N("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 6
    noise.inputs["Detail"].default_value = 8
    L(mp.outputs[0], noise.inputs[0])
    col = N("ShaderNodeMix")
    col.data_type = "RGBA"
    col.inputs[6].default_value = (*c1, 1)
    col.inputs[7].default_value = (*c2, 1)
    height = noise.outputs["Fac"]
    if kind == "wood":
        brick = N("ShaderNodeTexBrick")
        brick.inputs["Scale"].default_value = 1.0
        brick.inputs["Mortar Size"].default_value = 0.012
        brick.inputs["Brick Width"].default_value = 2.4
        brick.inputs["Row Height"].default_value = 0.28
        brick.inputs["Color1"].default_value = (*c1, 1)
        brick.inputs["Color2"].default_value = (*c2, 1)
        brick.inputs["Mortar"].default_value = (0.02, 0.01, 0.005, 1)
        L(mp.outputs[0], brick.inputs[0])
        wave = N("ShaderNodeTexWave")
        wave.inputs["Scale"].default_value = 3
        wave.inputs["Distortion"].default_value = 6
        wave.inputs["Detail"].default_value = 4
        wave.bands_direction = "Z"
        L(mp.outputs[0], wave.inputs[0])
        mul = N("ShaderNodeMix")
        mul.data_type = "RGBA"
        mul.blend_type = "MULTIPLY"
        mul.inputs[0].default_value = 0.35
        L(brick.outputs["Color"], mul.inputs[6])
        L(wave.outputs["Color"], mul.inputs[7])
        L(mul.outputs[2], b.inputs["Base Color"])
        height = brick.outputs["Fac"]
    elif kind in ("stone", "roof"):
        brick = N("ShaderNodeTexBrick")
        brick.inputs["Scale"].default_value = 1.0
        brick.inputs["Mortar Size"].default_value = 0.03 if kind == "stone" else 0.015
        brick.inputs["Brick Width"].default_value = 0.6 if kind == "stone" else 0.35
        brick.inputs["Row Height"].default_value = 0.3 if kind == "stone" else 0.22
        brick.inputs["Color1"].default_value = (*c1, 1)
        brick.inputs["Color2"].default_value = (*c2, 1)
        brick.inputs["Mortar"].default_value = (*(c3 or (0.03, 0.03, 0.03)), 1)
        L(mp.outputs[0], brick.inputs[0])
        L(brick.outputs["Color"], b.inputs["Base Color"])
        height = brick.outputs["Fac"]
    else:  # dirt / grass: noise + voronoi pebbles
        L(noise.outputs["Fac"], col.inputs[0])
        vor = N("ShaderNodeTexVoronoi")
        vor.inputs["Scale"].default_value = 40
        L(mp.outputs[0], vor.inputs[0])
        mix2 = N("ShaderNodeMix")
        mix2.data_type = "RGBA"
        mix2.blend_type = "OVERLAY"
        mix2.inputs[0].default_value = 0.35
        L(col.outputs[2], mix2.inputs[6])
        L(vor.outputs["Color"], mix2.inputs[7])
        L(mix2.outputs[2], b.inputs["Base Color"])
        height = vor.outputs["Distance"]
    bp = N("ShaderNodeBump")
    bp.inputs["Strength"].default_value = bump
    L(height, bp.inputs["Height"])
    L(bp.outputs[0], b.inputs["Normal"])
    L(b.outputs[0], out.inputs[0])
    return m


def fabric(name, base, stripe, accent):
    """Woven robe: fine vertical stripes, accent hem, dark belt with buckle."""
    m, nt, out = nodes_mat(name)
    N = nt.nodes.new
    L = nt.links.new
    tc = N("ShaderNodeTexCoord")
    sep = N("ShaderNodeSeparateXYZ")
    L(tc.outputs["Object"], sep.inputs[0])
    wave = N("ShaderNodeTexWave")
    wave.bands_direction = "X"
    wave.inputs["Scale"].default_value = 28
    wave.inputs["Distortion"].default_value = 0.5
    L(tc.outputs["Object"], wave.inputs[0])
    ramp = N("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*base, 1)
    ramp.color_ramp.elements[1].color = (*stripe, 1)
    ramp.color_ramp.elements[0].position = 0.55
    ramp.color_ramp.elements[1].position = 0.6
    L(wave.outputs["Fac"], ramp.inputs[0])
    # bands by height (object Z): belt + hem
    band = N("ShaderNodeValToRGB")
    band.color_ramp.interpolation = "CONSTANT"
    el = band.color_ramp.elements
    el[0].position = 0.0
    el[0].color = (*accent, 1)
    el[1].position = 0.08
    el[1].color = (0, 0, 0, 0)
    e = el.new(0.47)
    e.color = (0.03, 0.018, 0.01, 1)
    e = el.new(0.53)
    e.color = (0, 0, 0, 0)
    mr = N("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -0.65
    mr.inputs["From Max"].default_value = 0.65
    L(sep.outputs["Z"], mr.inputs["Value"])
    L(mr.outputs[0], band.inputs[0])
    mix = N("ShaderNodeMix")
    mix.data_type = "RGBA"
    L(band.outputs["Alpha"], mix.inputs[0])
    L(ramp.outputs[0], mix.inputs[6])
    L(band.outputs[0], mix.inputs[7])
    b = N("ShaderNodeBsdfPrincipled")
    b.inputs["Roughness"].default_value = 0.9
    b.inputs["Sheen Weight"].default_value = 0.4
    L(mix.outputs[2], b.inputs["Base Color"])
    bp = N("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.15
    L(wave.outputs["Fac"], bp.inputs["Height"])
    L(bp.outputs[0], b.inputs["Normal"])
    L(b.outputs[0], out.inputs[0])
    return m


def outline_mat():
    """Inverted-hull ink: only the flipped (back-facing) shell shows, in black."""
    m, nt, out = nodes_mat("ink")
    N = nt.nodes.new
    geo = N("ShaderNodeNewGeometry")
    tr = N("ShaderNodeBsdfTransparent")
    em = N("ShaderNodeEmission")
    em.inputs[0].default_value = (0.004, 0.004, 0.004, 1)
    mix = N("ShaderNodeMixShader")
    # Ink only for camera rays hitting the far (front-facing) side of the
    # flipped shell. Shadow / bounce rays pass straight through, otherwise the
    # shell would put the whole character in its own shadow.
    lp = N("ShaderNodeLightPath")
    notcam = N("ShaderNodeMath")
    notcam.operation = "SUBTRACT"
    notcam.inputs[0].default_value = 1.0
    nt.links.new(lp.outputs["Is Camera Ray"], notcam.inputs[1])
    mx = N("ShaderNodeMath")
    mx.operation = "MAXIMUM"
    nt.links.new(geo.outputs["Backfacing"], mx.inputs[0])
    nt.links.new(notcam.outputs[0], mx.inputs[1])
    nt.links.new(mx.outputs[0], mix.inputs[0])
    # flipped shell: the far side faces the camera (front-facing) -> ink;
    # the near side is back-facing -> transparent so the body shows through
    nt.links.new(em.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m


# ---------------------------------------------------------------------- faces
def face_png(kind):
    path = os.path.join(HERE, f"face_{kind}.png")
    if os.path.exists(path):
        return path
    W, H = 2048, 1024
    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)
    X = lambda x: 512 + 0.5 * x  # same layout as the three.js canvas
    Y = lambda y: 512 + 1.0 * y
    k = "#101010"
    ex, ey = 200, -90

    def ell(cx, cy, rx, ry, fill):
        d.ellipse([X(cx - rx), Y(cy - ry), X(cx + rx), Y(cy + ry)], fill=fill)

    def line(pts, w):
        d.line([(X(a), Y(b)) for a, b in pts], fill=k, width=w, joint="curve")
        for a, b in (pts[0], pts[-1]):
            d.ellipse([X(a) - w / 2, Y(b) - w / 2, X(a) + w / 2, Y(b) + w / 2], fill=k)

    def quad(p0, c, p1, n=24):
        return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
                 (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1])
                for t in [i / n for i in range(n + 1)]]

    if kind == "laugh":
        for x in (-ex, ex):
            line([(x - 62, ey + 26), (x, ey - 34), (x + 62, ey + 26)], 26)
        mouth = quad((-150, 70), (0, 330), (150, 70))
        d.polygon([(X(a), Y(b)) for a, b in mouth], fill=k)
        ell(0, 190, 74, 40, "#d9475b")
        d.rectangle([X(-110), Y(72), X(110), Y(106)], fill="white")
    else:
        for x in (-ex, ex):
            ell(x, ey, 40, 58, k)
            ell(x + 12, ey - 20, 12, 14, "white")
        if kind == "determined":
            line([(-ex - 80, ey - 150), (-ex + 60, ey - 100)], 22)
            line([(ex + 80, ey - 150), (ex - 60, ey - 100)], 22)
            line(quad((-70, 130), (10, 150), (90, 110)), 22)
        else:
            line(quad((-ex - 60, ey - 130), (-ex, ey - 160), (-ex + 60, ey - 130)), 22)
            line(quad((ex - 60, ey - 130), (ex, ey - 160), (ex + 60, ey - 130)), 22)
            line(quad((-90, 110), (0, 190), (90, 110)), 22)
    im.save(path)
    return path


def head_mat(kind):
    m, nt, out = nodes_mat("head_" + kind)
    N = nt.nodes.new
    tc = N("ShaderNodeTexCoord")
    img = N("ShaderNodeTexImage")
    img.image = bpy.data.images.load(face_png(kind))
    img.projection = "SPHERE"
    img.interpolation = "Cubic"
    mp = N("ShaderNodeMapping")
    # sphere projection wants coords in 0..1 centred at 0.5 (head radius 0.5)
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(float(os.environ.get("FACEROT", "90"))))
    mp.inputs["Location"].default_value = (0.5, 0.5, 0.5)
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    nt.links.new(mp.outputs[0], img.inputs[0])
    b = N("ShaderNodeBsdfPrincipled")
    b.inputs["Roughness"].default_value = 0.55
    b.inputs["Subsurface Weight"].default_value = 0.08
    b.inputs["Subsurface Radius"].default_value = (0.2, 0.15, 0.12)
    nt.links.new(img.outputs[0], b.inputs["Base Color"])
    nt.links.new(b.outputs[0], out.inputs[0])
    return m


# ------------------------------------------------------------------- objects
def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def mesh_obj(name, bm, mat=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    if mat:
        ob.data.materials.append(mat)
    return link(ob)


def sphere(name, r, mat, loc=(0, 0, 0), scale=(1, 1, 1), seg=48, rings=24):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    ob = mesh_obj(name, bm, mat)
    ob.location = loc
    ob.scale = scale
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def cyl(name, r1, r2, h, mat, loc=(0, 0, 0), seg=16):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    ob = mesh_obj(name, bm, mat)
    ob.location = loc
    for p in ob.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return ob


def box(name, size, mat, loc=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    ob = mesh_obj(name, bm, mat)
    ob.scale = size
    ob.location = loc
    return ob


def capsule(name, r, h, mat):
    """Tube body with rounded ends (cylinder + hemispheres)."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=r)
    for v in bm.verts:
        v.co.z += h / 2 if v.co.z > 0 else -h / 2
    ob = mesh_obj(name, bm, mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


INK = None


def ink(ob, thickness):
    """Bold black outline via solidify inverted hull."""
    if os.environ.get("NOINK"):
        return ob
    ob.data.materials.append(INK)
    mod = ob.modifiers.new("ink", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 1
    mod.use_flip_normals = True
    mod.use_rim = False
    mod.material_offset = len(ob.data.materials) - 1
    return ob


def parent(child, par):
    child.parent = par
    return child


def empty(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    return link(e)


# ---------------------------------------------------------------- characters
BLACK = None


class Character:
    def __init__(self, name, pos3, rotY, robe, face, hair=None):
        self.root = empty(name)
        self.base = P(*pos3)
        self.root.location = self.base
        self.root.rotation_euler = (0, 0, rotY)
        self.faces = {}
        L = 0.98
        for x in (-0.11, 0.11):
            leg = cyl(name + "_leg", 0.032, 0.032, L, BLACK, loc=(x, 0, 1.0 - L / 2))
            parent(leg, self.root)
            foot = sphere(name + "_foot", 0.09, BLACK, loc=(x * 1.15, -0.05, 0.05), scale=(1, 1.6, 0.55))
            parent(foot, self.root)
        body = capsule(name + "_body", 0.22, 0.86, fabric(name + "_robe", *robe))
        body.location = (0, 0, 1.45)
        ink(body, 0.045)
        parent(body, self.root)
        self.shoulderZ = 1.78
        self.armL = empty(name + "_armL", (0.24, -0.02, self.shoulderZ))
        self.armR = empty(name + "_armR", (-0.24, -0.02, self.shoulderZ))
        for a in (self.armL, self.armR):
            parent(a, self.root)
            parent(cyl(a.name + "_s", 0.032, 0.032, 0.8, BLACK, loc=(0, 0, -0.4)), a)
        parent(cyl(name + "_neck", 0.03, 0.03, 0.2, BLACK, loc=(0, 0, 2.12)), self.root)
        self.head = empty(name + "_head", (0, 0, 2.62))
        parent(self.head, self.root)
        for kind in face:
            h = sphere(name + "_face_" + kind, 0.5, head_mat(kind), seg=64, rings=32)
            ink(h, 0.045)
            parent(h, self.head)
            self.faces[kind] = h
        if hair == "bun":
            parent(ink(sphere(name + "_bun", 0.17, principled("hair", hexc("#24170f"), 0.45), loc=(0, 0.1, 0.55)), 0.03), self.head)
        if hair == "cap":
            parent(ink(sphere(name + "_cap", 0.5, principled("cap", hexc("#b3261e"), 0.6), loc=(0, 0.02, 0.22), scale=(1.04, 1.04, 0.62)), 0.03), self.head)

    def pose(self, armL=0.22, armR=-0.22, bounce=0.0, tilt=0.0, turn=0.0, face=None):
        self.root.location = self.base + Vector((0, 0, bounce))
        self.armL.rotation_euler = (0, -armL, 0)
        self.armR.rotation_euler = (0, -armR, 0)
        self.head.rotation_euler = (tilt, 0, turn)
        for k, h in self.faces.items():
            h.hide_render = (k != face) if face else False

    def hand(self, armR):
        L = 0.8
        return Vector((-0.24 + math.sin(armR) * L, -0.02, self.shoulderZ - math.cos(armR) * L))


# ----------------------------------------------------------------- set pieces
def flame(name, loc, s, strength=1.0):
    outer = sphere(name, 0.16 * s, emissive(name + "_o", (1.0, 0.16, 0.01), 2.2 * strength), loc=loc, scale=(1, 1, 2.2))
    inner = sphere(name + "_i", 0.09 * s, emissive(name + "_i", (1.0, 0.42, 0.05), 3.5 * strength), loc=loc + Vector((0, 0, -0.05 * s)), scale=(1, 1, 1.8))
    return outer, inner


def point_light(name, loc, color, power, radius=0.1):
    ld = bpy.data.lights.new(name, "POINT")
    ld.color = color
    ld.energy = power
    ld.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    return link(ob)


def torch(name, pos3, wood):
    base = P(*pos3)
    cyl(name + "_pole", 0.05, 0.065, 2.2, wood, loc=base + Vector((0, 0, 1.1)))
    cyl(name + "_cup", 0.07, 0.12, 0.2, principled("iron", (0.03, 0.03, 0.03), 0.4, metal=0.8), loc=base + Vector((0, 0, 2.25)))
    flame(name + "_fl", base + Vector((0, 0, 2.5)), 0.8)
    return point_light(name + "_L", base + Vector((0, 0, 2.6)), (1.0, 0.55, 0.22), 220, 0.15)


def house(name, pos3, rotY, w, d, h, wall, roof, stone, beam):
    root = empty(name, P(*pos3))
    root.rotation_euler = (0, 0, rotY)
    parent(box(name + "_base", (w + 0.15, d + 0.15, 0.5), stone, (0, 0, 0.25)), root)
    parent(box(name + "_walls", (w, d, h - 0.5), wall, (0, 0, 0.5 + (h - 0.5) / 2)), root)
    # gabled roof prism with overhang
    bm = bmesh.new()
    ow, oh, dd = w / 2 + 0.35, 1.5, d / 2 + 0.35
    vs = [bm.verts.new(v) for v in [(-ow, -dd, 0), (ow, -dd, 0), (0, -dd, oh), (-ow, dd, 0), (ow, dd, 0), (0, dd, oh)]]
    for f in [(0, 1, 2), (5, 4, 3), (0, 2, 5, 3), (2, 1, 4, 5), (0, 3, 4, 1)]:
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    r = mesh_obj(name + "_roof", bm, roof)
    r.location = (0, 0, h)
    sol = r.modifiers.new("t", "SOLIDIFY")
    sol.thickness = 0.12
    parent(r, root)
    # gable walls
    bm = bmesh.new()
    for yy in (-d / 2, d / 2):
        vs = [bm.verts.new(v) for v in [(-w / 2, yy, 0), (w / 2, yy, 0), (0, yy, 1.35)]]
        bm.faces.new(vs)
    g = mesh_obj(name + "_gable", bm, wall)
    g.location = (0, 0, h)
    parent(g, root)
    for x in (-1, 1):
        for y in (-1, 1):
            parent(box(name + "_beam", (0.18, 0.18, h - 0.5), beam, (x * w / 2, y * d / 2, h / 2 + 0.25)), root)
    win = emissive(name + "_win", (1.0, 0.45, 0.1), 2.2)
    frame = principled("frame", hexc("#2b1a0e"), 0.8)
    for x in (-w / 4, w / 4):
        parent(box(name + "_wf", (0.8, 0.06, 0.9), frame, (x, -d / 2 - 0.01, 1.65)), root)
        parent(box(name + "_wg", (0.62, 0.02, 0.72), win, (x, -d / 2 - 0.05, 1.65)), root)
        parent(box(name + "_wm", (0.05, 0.03, 0.72), frame, (x, -d / 2 - 0.07, 1.65)), root)
        parent(box(name + "_wn", (0.62, 0.03, 0.05), frame, (x, -d / 2 - 0.07, 1.65)), root)
        parent(box(name + "_sill", (0.9, 0.25, 0.08), beam, (x, -d / 2 - 0.12, 1.15)), root)
    parent(box(name + "_door", (0.85, 0.06, 1.4), textured(name + "_dw", "wood", hexc("#4a2c18"), hexc("#3a2010"), 2.0, 0.4), (0, -d / 2 - 0.03, 1.05)), root)
    parent(box(name + "_chim", (0.45, 0.45, 1.3), stone, (w / 4, d / 6, h + 1.3)), root)
    lt = point_light(name + "_wl", (0, -d / 2 - 1.3, 1.7), (1.0, 0.6, 0.3), 60, 0.4)
    parent(lt, root)
    return root


def rock(name, loc, s, mat):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1)
    random.seed(hash(name) % 1000)
    for v in bm.verts:
        v.co *= 0.8 + random.random() * 0.35
    ob = mesh_obj(name, bm, mat)
    ob.location = loc
    ob.scale = s
    return ob


def barrel(name, loc, wood, iron):
    cyl(name, 0.38, 0.38, 1.0, wood, loc=loc + Vector((0, 0, 0.5)), seg=24)
    for z in (0.15, 0.85):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.39, minor_radius=0.025, location=loc + Vector((0, 0, z)))
        bpy.context.object.data.materials.append(iron)


# --------------------------------------------------------------------- shots
SHOTS = [
    (0.0, dict(pos=(1.6, 2.9, 11.5), look=(0, 1.6, 0), fov=40), dict(pos=(0.7, 2.6, 7.4), look=(0, 1.8, 0), fov=38)),
    (2.09, dict(pos=(-0.7, 2.3, 4.6), look=(-0.5, 3.0, 0), fov=46), dict(pos=(-0.55, 2.4, 3.7), look=(-0.5, 3.1, 0), fov=44)),
    (3.21, dict(pos=(14.2, 3.3, 10.5), look=(12, 1.6, -3), fov=44), dict(pos=(13.2, 3.0, 8.0), look=(12, 1.7, -3), fov=42)),
]


def camera_at(cam, t):
    i = len(SHOTS) - 1
    while i > 0 and t < SHOTS[i][0]:
        i -= 1
    start, a, b = SHOTS[i]
    end = SHOTS[i + 1][0] if i + 1 < len(SHOTS) else DUR
    u = ease((t - start) / (end - start))
    pos = P(*[lerp(a["pos"][k], b["pos"][k], u) for k in range(3)])
    look = P(*[lerp(a["look"][k], b["look"][k], u) for k in range(3)])
    cam.location = pos
    cam.rotation_euler = (look - pos).to_track_quat("-Z", "Y").to_euler()
    # three.js fov is vertical; Blender sensor fit vertical
    cam.data.sensor_fit = "VERTICAL"
    cam.data.angle = math.radians(lerp(a["fov"], b["fov"], u))


# --------------------------------------------------------------------- build
def build():
    global INK, BLACK
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    INK = outline_mat()
    BLACK = principled("black", (0.006, 0.006, 0.006), 0.6)

    wood = textured("wood", "wood", hexc("#8a5a34"), hexc("#6e4426"), 1.6, 0.5)
    wood2 = textured("wood2", "wood", hexc("#a06a3c"), hexc("#7a4c2a"), 1.6, 0.5)
    beam = textured("beam", "wood", hexc("#3d2616"), hexc("#2c1a0e"), 2.5, 0.4)
    pole = textured("pole", "wood", hexc("#5b3a22"), hexc("#3d2616"), 4.0, 0.3)
    stone = textured("stone", "stone", hexc("#8a837a"), hexc("#6b655e"), 1.4, 0.8, 0.9, c3=(0.02, 0.02, 0.02))
    roofR = textured("roofR", "roof", hexc("#8a3428"), hexc("#6e2a20"), 1.3, 0.6, 0.7, c3=(0.03, 0.01, 0.01))
    roofB = textured("roofB", "roof", hexc("#3f4f7a"), hexc("#33405f"), 1.3, 0.6, 0.7, c3=(0.01, 0.01, 0.02))
    dirt = textured("dirt", "dirt", hexc("#7a5a3c"), hexc("#4e3622"), 0.35, 0.5, 0.95)
    grassm = textured("grassg", "dirt", hexc("#3f5a24"), hexc("#2c4218"), 0.25, 0.15, 0.95)
    rockm = principled("rock", hexc("#6b6660"), 0.9)
    iron = principled("iron2", (0.03, 0.03, 0.03), 0.4, metal=0.8)

    # ground + mound with grass strands
    bpy.ops.mesh.primitive_plane_add(size=300)
    bpy.context.object.data.materials.append(dirt)
    mound = sphere("mound", 1.0, grassm, loc=(0, 0, -0.55), scale=(5.2, 5.2, 0.65), seg=64, rings=32)
    # bake the scale into the mesh so hair length/radius are in real metres
    from mathutils import Matrix
    mound.data.transform(Matrix.Diagonal((5.2, 5.2, 0.65, 1.0)))
    mound.scale = (1, 1, 1)
    ps_mod = mound.modifiers.new("grass", "PARTICLE_SYSTEM")
    ps = ps_mod.particle_system.settings
    ps.type = "HAIR"
    ps.count = 30000
    ps.use_advanced_hair = True
    ps.radius_scale = 1.0
    ps.root_radius = 0.006
    ps.tip_radius = 0.0
    ps.use_hair_bspline = False
    ps.render_step = 2
    ps.factor_random = 0.4
    ps.normal_factor = 0.16
    ps.factor_random = 0.04
    ps.child_type = "NONE"
    mound.data.materials.append(principled("blades", hexc("#4a6a28"), 0.7))
    ps.material = 2
    for i, (p, s) in enumerate([((-1.6, 0.2, 1.2), (0.35, 0.3, 0.25)), ((1.9, 0.15, 0.6), (0.25, 0.25, 0.2))]):
        rock(f"rock{i}", P(*p), s, rockm)

    # far hills
    for i, (p, s, c) in enumerate([((-30, -3, -60), (40, 18, 14), "#1c2a3a"), ((25, -3, -70), (45, 20, 18), "#18243a"), ((-5, -2, -48), (26, 12, 8), "#22324a")]):
        sphere(f"hill{i}", 1, principled(f"hillm{i}", hexc(c), 1.0), loc=P(*p), scale=s)

    # moon (emissive) + moonlight (sun) + rim
    sphere("moon", 2.3, emissive("moonm", (1.0, 0.96, 0.88), 3), loc=P(-4, 13, -45), seg=48)
    sun = bpy.data.lights.new("moonlight", "SUN")
    sun.energy = 0.55
    sun.color = (0.62, 0.7, 1.0)
    sun.angle = math.radians(2.5)
    so = link(bpy.data.objects.new("moonlight", sun))
    so.rotation_euler = (P(0, 0, 0) - P(-6, 14, -10)).to_track_quat("-Z", "Y").to_euler()

    # world: night sky with clouds, used as ambient light too
    world = bpy.data.worlds.new("night")
    sc.world = world
    world.use_nodes = True
    nt = world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    N, L = nt.nodes.new, nt.links.new
    out = N("ShaderNodeOutputWorld")
    tc = N("ShaderNodeTexCoord")
    sep = N("ShaderNodeSeparateXYZ")
    L(tc.outputs["Generated"], sep.inputs[0])
    grad = N("ShaderNodeValToRGB")
    els = grad.color_ramp.elements
    els[0].position, els[0].color = 0.0, (*hexc("#5c6687"), 1)
    els[1].position, els[1].color = 0.6, (*hexc("#121a33"), 1)
    e = els.new(0.18)
    e.color = (*hexc("#2e3a5e"), 1)
    L(sep.outputs["Z"], grad.inputs[0])
    # cloud plane projection: dir / (z + 0.15)
    add = N("ShaderNodeMath")
    add.operation = "ADD"
    add.inputs[1].default_value = 0.15
    L(sep.outputs["Z"], add.inputs[0])
    comb = N("ShaderNodeCombineXYZ")
    L(add.outputs[0], comb.inputs[0])
    L(add.outputs[0], comb.inputs[1])
    L(add.outputs[0], comb.inputs[2])
    div = N("ShaderNodeVectorMath")
    div.operation = "DIVIDE"
    L(tc.outputs["Generated"], div.inputs[0])
    L(comb.outputs[0], div.inputs[1])
    cn = N("ShaderNodeTexNoise")
    cn.inputs["Scale"].default_value = 1.6
    cn.inputs["Detail"].default_value = 10
    cn.inputs["Roughness"].default_value = 0.6
    L(div.outputs[0], cn.inputs[0])
    cr = N("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].position = 0.5
    cr.color_ramp.elements[0].color = (0, 0, 0, 1)
    cr.color_ramp.elements[1].position = 0.72
    cr.color_ramp.elements[1].color = (1, 1, 1, 1)
    L(cn.outputs["Fac"], cr.inputs[0])
    horizon = N("ShaderNodeMapRange")
    horizon.inputs["From Min"].default_value = 0.0
    horizon.inputs["From Max"].default_value = 0.12
    L(sep.outputs["Z"], horizon.inputs["Value"])
    mulc = N("ShaderNodeMath")
    mulc.operation = "MULTIPLY"
    L(cr.outputs[0], mulc.inputs[0])
    L(horizon.outputs[0], mulc.inputs[1])
    mix = N("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs[7].default_value = (*hexc("#6a7290"), 1)
    L(mulc.outputs[0], mix.inputs[0])
    L(grad.outputs[0], mix.inputs[6])
    bg = N("ShaderNodeBackground")
    bg.inputs[1].default_value = 0.8
    L(mix.outputs[2], bg.inputs[0])
    L(bg.outputs[0], out.inputs[0])

    # hero + torches
    torch("torchA", (-2.4, 0, -1.6), pole)
    torch("torchB", (2.6, 0, -2.2), pole)
    hero = Character("hero", (0, 0.08, 0), 0.12, (hexc("#2f9e8a"), hexc("#3fc0a8"), hexc("#e8d27a")), ["calm", "determined"], "bun")
    lantern = empty("lantern")
    cyl("lan_glass", 0.11, 0.11, 0.26, emissive("langlass", (1.0, 0.42, 0.08), 1.6), seg=6).parent = lantern
    for z in (0.14, -0.14):
        c = cyl("lan_cap", 0.13, 0.13, 0.04, iron, seg=6)
        c.location = (0, 0, z)
        c.parent = lantern
    ll = point_light("lan_L", (0, -0.25, -0.2), (1.0, 0.62, 0.28), 25, 0.08)
    ll.parent = lantern

    # far village behind hero
    house("farA", (-7, 0, -20), 0.5, 3.4, 3, 2.7, wood, roofR, stone, beam)
    house("farB", (-1.5, 0, -24), 0.1, 4.0, 3, 2.7, wood2, roofB, stone, beam)
    house("farC", (4.5, 0, -21), -0.4, 3.4, 3, 2.7, wood, roofR, stone, beam)
    house("farD", (10, 0, -27), -0.2, 3.4, 3, 2.7, wood2, roofR, stone, beam)

    # village square
    house("hA", (8.2, 0, -8.5), 0.35, 3.4, 3, 2.7, wood, roofR, stone, beam)
    house("hB", (12.4, 0, -9.6), 0.0, 3.8, 3, 2.7, wood2, roofB, stone, beam)
    house("hC", (16.6, 0, -8.4), -0.35, 3.4, 3, 2.7, wood, roofR, stone, beam)
    torch("torchC", (9.4, 0, -2.6), pole)
    torch("torchD", (14.8, 0, -2.8), pole)
    # fire pit
    fp = P(9.8, 0, -0.2)
    for i in range(9):
        a = i / 9 * math.tau
        rock(f"pit{i}", fp + Vector((math.cos(a) * 0.75, math.sin(a) * 0.75, 0.1)), (0.2, 0.18, 0.15), rockm)
    for i, a in enumerate((0, 1.2, 2.4)):
        lg = cyl(f"log{i}", 0.06, 0.06, 0.9, principled("log", hexc("#2c1a0f"), 0.9, emission=(1, 0.25, 0.05), strength=0.6), loc=fp + Vector((0, 0, 0.12)))
        lg.rotation_euler = (math.pi / 2 - 0.25, 0, a)
    flame("fire", fp + Vector((0, 0, 0.45)), 1.6, 1.3)
    point_light("fireL", fp + Vector((0, 0, 0.9)), (1.0, 0.5, 0.18), 420, 0.3)
    barrel("barrelA", P(9.6, 0, -6.4), wood2, iron)
    barrel("barrelB", P(10.3, 0, -6.9), wood2, iron)
    for i, (p, s, r) in enumerate([((15.2, 0, -6.2), 0.8, 0.3), ((15.3, 0.8, -6.2), 0.6, 0.8), ((16.0, 0, -5.6), 0.7, -0.2)]):
        cr_ = box(f"crate{i}", (s, s, s), wood2, P(*p) + Vector((0, 0, s / 2)))
        cr_.rotation_euler = (0, 0, r)

    villagers = []
    for i, (x, robe, hair, ph) in enumerate([
        (10.8, ("#a8673a", "#d9b48a", "#2a2f5a"), "cap", 0.0),
        (12.0, ("#4f3a78", "#8a7ab0", "#c9a24a"), None, 1.7),
        (13.2, ("#8e2f2c", "#d8b08a", "#1d2a5a"), "bun", 3.1),
    ]):
        c = Character(f"v{i}", (x, 0, -1.9), -0.12, tuple(hexc(h) for h in robe), ["laugh"], hair)
        villagers.append((c, ph))

    cam = link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    sc.camera = cam
    return hero, lantern, villagers, cam


def setup_render(scale, samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.03
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 3
    sc.cycles.glossy_bounces = 2
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.use_light_tree = True
    sc.cycles.blur_glossy = 1.0
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.render.use_persistent_data = True
    sc.render.resolution_x = 1080
    sc.render.resolution_y = 1920
    sc.render.resolution_percentage = scale
    sc.render.image_settings.file_format = "PNG"
    # PBR Neutral keeps fire / window colours saturated (AgX turns them pastel)
    try:
        sc.view_settings.view_transform = "Khronos PBR Neutral"
    except Exception:
        sc.view_settings.view_transform = "Filmic"
    sc.view_settings.exposure = float(os.environ.get("EXPOSURE", "0.4"))
    sc.render.threads_mode = "AUTO"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", default="30,80,130")
    ap.add_argument("--scale", type=int, default=50)
    ap.add_argument("--samples", type=int, default=32)
    ap.add_argument("--out", default=os.path.join(HERE, "frames"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    hero, lantern, villagers, cam = build()
    setup_render(a.scale, a.samples)
    frames = range(int(FPS * DUR)) if a.frames == "all" else [int(f) for f in a.frames.split(",")]
    import time
    for f in frames:
        path = os.path.join(a.out, f"f{f:04d}.png")
        if a.frames == "all" and os.path.exists(path):
            continue
        t = f / FPS
        raise_ = ease((t - 2.1) / 0.55)
        armR = lerp(-0.35, -2.05, raise_)
        hero.pose(armR=armR, tilt=-0.38 * raise_, turn=-0.15 * raise_, face="calm" if t < 2.09 else "determined")
        lantern.location = hero.root.matrix_world @ hero.hand(armR) + Vector((0, 0, -0.22))
        for c, ph in villagers:
            c.pose(armL=0.55 + 0.3 * math.sin(t * 14 + ph), armR=-0.55 - 0.3 * math.sin(t * 14 + ph),
                   bounce=abs(math.sin(t * 9 + ph)) * 0.1, tilt=-0.18 + 0.05 * math.sin(t * 9 + ph), face="laugh")
        for ob in bpy.data.objects:  # torch / fire flicker
            if ob.type == "LIGHT" and ob.name.startswith(("torch", "fireL", "lan_L")):
                base = ob.get("base") or ob.data.energy
                ob["base"] = base
                ob.data.energy = base * (0.85 + 0.15 * math.sin(t * 19 + len(ob.name)) * math.sin(t * 6.3 + len(ob.name)))
        camera_at(cam, t)
        bpy.context.view_layer.update()
        bpy.context.scene.render.filepath = path
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"frame {f} rendered in {time.time() - t0:.1f}s", flush=True)


if __name__ == "__main__":
    main()
