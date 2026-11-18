# ROBLOX SHORTS KIT — animation engine (library part).  Never run this file directly:
# tools/assemble.py glues  engine/anim_kit.py + <video>_section.py  into <video>_v1.py, which the render queue runs as
#   blender -b base_rig.blend -P <video>_v1.py -- final      (the <video>_mode.txt file picks stills:rN | build | final)
import bpy, bmesh, math, os, sys, time, json, random, traceback
from mathutils import Vector, Quaternion, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
MODE = 'preview'
if '--' in sys.argv:
    a = sys.argv[sys.argv.index('--') + 1:]
    if a: MODE = a[0]
LOG = os.path.join(HERE, 'log___VNAME__.txt')
_lines = []
def log(*a):
    s = ' '.join(str(x) for x in a); _lines.append(s); print(s)
    with open(LOG, 'w', encoding='utf-8') as f: f.write('\n'.join(_lines))

FPS = 30
DUR = __DUR__
VNAME = '__VNAME__'          # file prefix: <VNAME>_progress.txt, <VNAME>_scene.blend, <VNAME>_anchors.json
NF = int(DUR * FPS)
rng = random.Random(7)
D2R = math.pi / 180

def clamp(x, a=0., b=1.): return a if x < a else b if x > b else x
def prog(t, a, b): return clamp((t - a) / (b - a)) if b != a else (1. if t >= b else 0.)
def sm(x): return x * x * (3 - 2 * x)
def eio(x): return 4 * x * x * x if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def eo(x): return 1 - (1 - x) ** 3
def ei(x): return x * x * x
def back(x, s=1.7): return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2      # overshoot then settle
def lerp(a, b, t): return a + (b - a) * t
def noise1(t, seed=0.):  # smooth pseudo noise
    return (math.sin(t * 1.7 + seed) * .5 + math.sin(t * 2.9 + seed * 1.3) * .3 + math.sin(t * 5.3 + seed * 2.1) * .2)

T0 = time.time()
try:
    log('Blender', bpy.app.version_string, 'mode', MODE)
    sc = bpy.context.scene
    sc.render.fps = FPS; sc.frame_start = 1; sc.frame_end = NF
    COL = sc.collection

    # ===================================================== helpers: meshes/materials
    def mesh_cube():
        me = bpy.data.meshes.new('unit_cube'); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free(); return me
    def mesh_cyl(seg=16, r2=1.0):
        me = bpy.data.meshes.new('unit_cyl'); bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=1.0, radius2=r2, depth=1.0); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = True
        return me
    def mesh_sphere(u=20, v=12):
        me = bpy.data.meshes.new('unit_sph'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1.0); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = True
        return me
    def mesh_plane():
        me = bpy.data.meshes.new('unit_plane'); me.from_pydata([(-.5, -.5, 0), (.5, -.5, 0), (.5, .5, 0), (-.5, .5, 0)], [], [(0, 1, 2, 3)])
        me.uv_layers.new(name='UVMap'); return me
    CUBE, CYL, CONE, SPH, PLANE = mesh_cube(), mesh_cyl(), mesh_cyl(4, 0.0), mesh_sphere(), mesh_plane()
    CYL8 = mesh_cyl(8)
    MATS = {}
    def mat(name, rgb, rough=.6, metal=0., emit=None, es=0., alpha=None):
        if name in MATS: return MATS[name]
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
        if emit is not None:
            b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
        if alpha is not None:
            b.inputs['Alpha'].default_value = alpha
            try: m.surface_render_method = 'BLENDED'
            except Exception: pass
        MATS[name] = m; return m
    def checker_mat(name, c1, c2, scale, rough=.5):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
        tc = nt.nodes.new('ShaderNodeTexCoord'); ck = nt.nodes.new('ShaderNodeTexChecker')
        ck.inputs['Scale'].default_value = scale; ck.inputs['Color1'].default_value = (*c1, 1); ck.inputs['Color2'].default_value = (*c2, 1)
        nt.links.new(tc.outputs['Object'], ck.inputs['Vector']); nt.links.new(ck.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = rough; return m
    def obj(name, me, loc, scale=(1, 1, 1), rot=(0, 0, 0), m=None, parent=None, shadow=True):
        o = bpy.data.objects.new(name, me); COL.objects.link(o)
        if parent is not None: o.parent = parent
        o.location = loc; o.scale = scale; o.rotation_euler = Euler([r * D2R for r in rot])
        if m is not None and len(o.material_slots) > 0:
            o.material_slots[0].link = 'OBJECT'; o.material_slots[0].material = m
        try: o.visible_shadow = shadow
        except Exception: pass
        return o
    # make sure shared meshes have one (empty) material slot so object-linked materials work
    for me in (CUBE, CYL, CONE, SPH, PLANE, CYL8):
        me.materials.append(None)
    def box(name, size, loc, m, rot=(0, 0, 0), parent=None, shadow=True):
        return obj(name, CUBE, loc, size, rot, m, parent, shadow)
    def empty(name, loc=(0, 0, 0), parent=None, rot=(0, 0, 0)):
        e = bpy.data.objects.new(name, None); COL.objects.link(e); e.location = loc; e.rotation_euler = Euler([r * D2R for r in rot])
        if parent is not None: e.parent = parent
        return e
    def light(name, kind, loc, energy, color=(1, 1, 1), size=1., rot=(0, 0, 0), spot=None, shadow=True):
        ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = color
        if kind == 'AREA': ld.size = size
        elif kind in ('POINT', 'SPOT'): ld.shadow_soft_size = size
        if kind == 'SPOT' and spot: ld.spot_size = spot * D2R; ld.spot_blend = .4
        try: ld.use_shadow = shadow
        except Exception: pass
        o = bpy.data.objects.new(name, ld); COL.objects.link(o); o.location = loc; o.rotation_euler = Euler([r * D2R for r in rot]); return o

    # ===================================================== baking helpers (works with layered actions)
    def fcurve(idb, path, index=0):
        ad = idb.animation_data or idb.animation_data_create()
        if ad.action is None:
            ad.action = bpy.data.actions.new((getattr(idb, 'name', 'id')) + '_act')
        act = ad.action
        try:
            return act.fcurve_ensure_for_datablock(idb, path, index=index)
        except Exception:
            pass
        try:
            fc = act.fcurves.find(path, index=index)
            return fc or act.fcurves.new(path, index=index)
        except Exception as e:
            raise RuntimeError('cannot create fcurve %s: %s' % (path, e))
    INTERP = {'CONSTANT': 0, 'LINEAR': 1}
    def bake(idb, path, index, frames, values, interp='LINEAR'):
        fc = fcurve(idb, path, index)
        n = len(frames); kp = fc.keyframe_points; kp.add(n)
        co = [0.] * (2 * n)
        for i in range(n): co[2 * i] = frames[i]; co[2 * i + 1] = values[i]
        kp.foreach_set('co', co)
        try: kp.foreach_set('interpolation', [INTERP[interp]] * n)
        except Exception:
            for k in kp: k.interpolation = interp
        fc.update()
    FRAMES = list(range(1, NF + 1))
    def tsec(f): return (f - 1) / FPS

    # ===================================================== base scene cleanup
    arm0 = next(o for o in sc.objects if o.type == 'ARMATURE')
    for pb in arm0.pose.bones:
        for c in pb.constraints:
            if c.type in ('IK', 'COPY_ROTATION', 'COPY_TRANSFORMS', 'DAMPED_TRACK', 'TRACK_TO'): c.mute = True
    parts0 = [o for o in sc.objects if o.parent == arm0 or any(m.type == 'ARMATURE' and getattr(m, 'object', None) == arm0 for m in getattr(o, 'modifiers', []))]
    for o in list(sc.objects):
        if o != arm0 and o not in parts0: o.hide_render = True; o.hide_viewport = True
    for o in parts0:
        if o.name == 'Man Head': o.hide_render = True; o.hide_viewport = True
    parts0 = [o for o in parts0 if o.name != 'Man Head']
    log('Character parts:', [o.name for o in parts0])
    for o in parts0:
        log('  mats', o.name, [s.material.name if s.material else None for s in o.material_slots])

    # ===================================================== faces / character materials
    FACEDIR = os.path.join(HERE, 'faces')
    def face_material(name, skin, faces):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
        b.inputs['Roughness'].default_value = .55
        uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'Face'
        rgb = nt.nodes.new('ShaderNodeRGB'); rgb.outputs[0].default_value = (*skin, 1)
        cur = rgb.outputs[0]; W = {}
        for i, fn in enumerate(faces):
            img = bpy.data.images.load(os.path.join(FACEDIR, fn + '.png'), check_existing=True)
            tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img; tx.extension = 'CLIP'; tx.interpolation = 'Cubic'
            nt.links.new(uv.outputs[0], tx.inputs['Vector'])
            v = nt.nodes.new('ShaderNodeValue'); v.name = 'W_' + fn; v.outputs[0].default_value = 1. if i == 0 else 0.
            mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'
            nt.links.new(v.outputs[0], mu.inputs[0]); nt.links.new(tx.outputs['Alpha'], mu.inputs[1])
            mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
            fac = [s for s in mx.inputs if s.name == 'Factor' and s.type == 'VALUE'][0]
            A = [s for s in mx.inputs if s.name == 'A' and s.type == 'RGBA'][0]; B = [s for s in mx.inputs if s.name == 'B' and s.type == 'RGBA'][0]
            out = [s for s in mx.outputs if s.type == 'RGBA'][0]
            nt.links.new(mu.outputs[0], fac); nt.links.new(cur, A); nt.links.new(tx.outputs['Color'], B); cur = out
            W[fn] = v
        nt.links.new(cur, b.inputs['Base Color'])
        return m, W
    def outfit_material(name, stops):
        # stops: list of (position 0..1 along the part's height, rgb) using undeformed object-space height
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
        b.inputs['Roughness'].default_value = .62
        tc = nt.nodes.new('ShaderNodeTexCoord'); sx = nt.nodes.new('ShaderNodeSeparateXYZ'); mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = -1.0; mr.inputs['From Max'].default_value = 1.0
        cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.interpolation = 'CONSTANT'
        el = cr.color_ramp.elements
        el[0].position = 0.0; el[0].color = (*stops[0][1], 1)
        el[1].position = stops[1][0] if len(stops) > 1 else 1.0; el[1].color = (*(stops[1][1] if len(stops) > 1 else stops[0][1]), 1)
        for p, c in stops[2:]:
            e = el.new(p); e.color = (*c, 1)
        nt.links.new(tc.outputs['Object'], sx.inputs[0]); nt.links.new(sx.outputs['Y'], mr.inputs['Value'])
        nt.links.new(mr.outputs['Result'], cr.inputs['Fac']); nt.links.new(cr.outputs['Color'], b.inputs['Base Color'])
        return m

    # ===================================================== character duplication
    def dup_char(name):
        a = arm0.copy(); a.name = name; COL.objects.link(a); a.location = (0, 0, 0)   # (the template itself is parked below the world)
        if a.animation_data: a.animation_data_clear()
        out = {'arm': a, 'parts': {}}
        for p in parts0:
            q = p.copy(); q.name = name + '_' + p.name; COL.objects.link(q)
            if p.parent == arm0:
                q.parent = a; q.parent_type = p.parent_type; q.parent_bone = p.parent_bone; q.matrix_parent_inverse = p.matrix_parent_inverse.copy()
            for md in q.modifiers:
                if md.type == 'ARMATURE': md.object = a
            out['parts'][p.name] = q
        return out
    def char_from_orig():
        return {'arm': arm0, 'parts': {p.name: p for p in parts0}}
    def set_obj_mat(o, m):
        for s in o.material_slots: s.link = 'OBJECT'; s.material = m

    SK = {'yellow': (0.86, 0.68, 0.12), 'light': (0.85, 0.63, 0.45), 'tan': (0.62, 0.42, 0.26), 'brown': (0.34, 0.2, 0.12), 'pale': (0.72, 0.68, 0.62)}
    class Char:
        def __init__(self, c, faces, skin, scale=1.0):
            self.arm = c['arm']; self.parts = c['parts']; self.scale = scale
            self.arm.scale = (scale, scale, scale)
            hm, self.W = face_material(self.arm.name + '_face', skin, faces)
            set_obj_mat(self.parts['Head'], hm); self.facemat = hm; self.faces = faces
            self.P = self.arm.pose.bones
            self.rest = {pb.name: pb.bone.matrix_local.to_3x3().inverted() for pb in self.P}
            for pb in self.P: pb.rotation_mode = 'QUATERNION'
            self.loc = []; self.rot = []; self.pose = []; self.facek = []
        def dress(self, shirt, sleeve, skin, pants, shoes, hair=None):
            set_obj_mat(self.parts['Torso'], outfit_material(self.arm.name + '_torso', [(0, shirt)]))
            armm = outfit_material(self.arm.name + '_arm', [(0, skin), (.43, sleeve)])
            set_obj_mat(self.parts['Left Arm'], armm); set_obj_mat(self.parts['Right Arm'], armm)
            legm = outfit_material(self.arm.name + '_leg', [(0, shoes), (.17, pants)])
            set_obj_mat(self.parts['Left Leg'], legm); set_obj_mat(self.parts['Right Leg'], legm)
            if 'cap' in self.parts: self.parts['cap'].hide_render = True; self.parts['cap'].hide_viewport = True
            if 'hair' in self.parts:
                self.parts['hair'].hide_render = True; self.parts['hair'].hide_viewport = True
            if hair is not None:
                bpy.context.view_layer.update(); hair_round(self, 'r_short', hair)

    # three.js-convention axes -> armature space (char faces +Y, left = -X, up = +Z)
    AX = {'X': Vector((-1, 0, 0)), 'Y': Vector((0, 0, 1)), 'Z': Vector((0, 1, 0))}
    JN = {'low': 'Lowertorso', 'hips': 'Hips', 'sp': 'Uppertorso', 'hd': 'Head', 'uaL': 'Upperarm.L', 'laL': 'Lowerarm.L', 'hL': 'Hand.L',
          'uaR': 'Upperarm.R', 'laR': 'Lowerarm.R', 'hR': 'Hand.R', 'ulL': 'Upperleg.L', 'llL': 'Lowerleg.L', 'ftL': 'Foot.L',
          'ulR': 'Upperleg.R', 'llR': 'Lowerleg.R', 'ftR': 'Foot.R'}
    JOINTS = list(JN.keys())
    def pose_quats(ch, p):
        out = {}
        for j in JOINTS:
            q = Quaternion()
            for ax in ('Y', 'X', 'Z'):
                v = p.get(j + ax, 0.)
                if v:
                    a = ch.rest[JN[j]] @ AX[ax]
                    q = q @ Quaternion(a.normalized(), v * D2R)
            out[j] = q
        return out
    def add(*ps):
        o = {}
        for p in ps:
            for k, v in p.items(): o[k] = o.get(k, 0.) + v
        return o
    def lerpP(a, b, t):
        o = {}
        for k in set(a) | set(b): o[k] = a.get(k, 0.) + (b.get(k, 0.) - a.get(k, 0.)) * t
        return o
    def kp(lt, keys, fn=eio):
        if lt <= keys[0][0]: return keys[0][1]
        for i in range(len(keys) - 1):
            t0, a = keys[i][0], keys[i][1]; t1, b = keys[i + 1][0], keys[i + 1][1]
            if lt <= t1:
                f = keys[i + 1][2] if len(keys[i + 1]) > 2 else fn
                return lerpP(a, b, f(prog(lt, t0, t1)))
        return keys[-1][1]
    # ---------- pose library (degrees, three.js convention)
    P = {
        'idle': {'uaLZ': 3, 'uaRZ': -3},
        'scared': {'uaLX': -35, 'laLX': -70, 'uaRX': -35, 'laRX': -70, 'spX': 6, 'hdX': -6, 'uaLZ': 10, 'uaRZ': -10},
        'cower': {'uaLX': -95, 'laLX': -95, 'uaRX': -95, 'laRX': -95, 'uaLZ': -15, 'uaRZ': 15, 'spX': 18, 'hdX': 18},
        'pull': {'uaLX': -78, 'laLX': -8, 'uaRX': -78, 'laRX': -8, 'spX': -10, 'lowX': -6, 'ulLX': -18, 'ulRX': 12},
        'fall': {'uaLZ': 150, 'uaRZ': -150, 'laLX': -30, 'laRX': -30, 'ulLX': -35, 'llLX': 60, 'ulRX': 20, 'llRX': 40, 'hdX': -20},
        'sitbed': {'ulLX': -90, 'ulRX': -90},
        'gasp': {'ulLX': -90, 'ulRX': -90, 'uaLX': -20, 'uaRX': -20, 'uaLZ': 20, 'uaRZ': -20, 'laLX': -40, 'laRX': -40, 'spX': -6, 'hdX': -8},
        'crouch': {'ulLX': -100, 'llLX': 130, 'ftLX': -30, 'ulRX': -100, 'llRX': 130, 'ftRX': -30, 'spX': 30, 'hdX': -18,
                   'uaLX': -70, 'laLX': -70, 'uaRX': -70, 'laRX': -70, 'uaLZ': -12, 'uaRZ': 12},
        'wall': {'uaLZ': 22, 'uaRZ': -22, 'uaLX': 12, 'uaRX': 12, 'laLX': -10, 'laRX': -10, 'spX': -4, 'hdX': -10},
        'reach': {'uaRX': -70, 'laRX': -15, 'uaRZ': -30, 'spZ': -10},
        'lie': {},
        'hug': {'ulLX': -125, 'llLX': 140, 'ulRX': -125, 'llRX': 140, 'spX': 22, 'uaLX': -55, 'laLX': -60, 'uaRX': -55, 'laRX': -60, 'uaLZ': -18, 'uaRZ': 18},
        'reachL': {'uaLX': -70, 'laLX': -15, 'uaLZ': 30, 'spY': 10}
    }
    WAIST = 2.0
    def walk(ph, amp=35, arm=.85, knee=0., lean=0.):
        s = math.sin(ph); c = math.cos(ph)
        o = {'ulLX': -amp * s, 'ulRX': amp * s, 'uaLX': amp * arm * s, 'uaRX': -amp * arm * s, 'spX': lean, 'hdX': -lean * .5,
             'bob': .06 * abs(c) - .03, 'spY': amp * .12 * s}
        if knee:
            o['llLX'] = knee * max(0., math.sin(ph + 1.2)) ; o['llRX'] = knee * max(0., -math.sin(ph + 1.2))
            o['laLX'] = -knee * .9; o['laRX'] = -knee * .9
        return o
    def run(ph): return walk(ph, 48, 1.1, 75, 14)
    def breathe(t, k=1., seed=0.):
        b = math.sin(t * 2.2 + seed)
        return {'spX': b * 1.2 * k, 'uaLZ': 3 + b * 1.5 * k, 'uaRZ': -3 - b * 1.5 * k, 'hdX': noise1(t * .6, seed) * 3 * k, 'hdY': noise1(t * .35, seed + 3) * 5 * k}
    def pant(t, k=1.):   # heavy breathing (scared)
        b = math.sin(t * 9)
        return {'spX': 3 + b * 3 * k, 'hdX': -b * 3 * k, 'uaLZ': 6 + b * 2 * k, 'uaRZ': -6 - b * 2 * k}



    # =====================================================================================
    # ROBLOX KIT v3 — sky, clouds, scale chart, colorful props, crowd spacing solver
    # =====================================================================================
    # ---- SCALE CHART (character head-top ~5.2 units; everything sized from that)
    CHAR_H = 5.2
    def walkph(dist, stride=2.29): return dist / stride * math.pi
    SCALE = {'car_len': 13.0, 'car_w': 6.0, 'car_h': 4.8, 'door_h': 8.0, 'door_w': 4.4, 'floor_h': 10.0, 'bench_seat': 1.7,
             'table_h': 2.7, 'lamp_h': 14.0, 'tree_h': 15.0, 'curb': .45, 'sidewalk_w': 10.0, 'lane_w': 9.0}
    def bake_fn(idb, path, index, fn, interp='LINEAR', step=1):
        fr = FRAMES[::step]; bake(idb, path, index, fr, [fn(tsec(f)) for f in fr], interp)
    # ---- stylized sky: horizon/zenith gradient + sun glow + stars; colors are keyable per shot
    w = sc.world or bpy.data.worlds.new('World'); sc.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    tc = nt.nodes.new('ShaderNodeTexCoord'); nrm = nt.nodes.new('ShaderNodeVectorMath'); nrm.operation = 'NORMALIZE'; nt.links.new(tc.outputs['Generated'], nrm.inputs[0])
    sxyz = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(nrm.outputs[0], sxyz.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -.05; mr.inputs['From Max'].default_value = .65; nt.links.new(sxyz.outputs['Z'], mr.inputs['Value'])
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = .7; nt.links.new(mr.outputs['Result'], pw.inputs[0])
    def rgbnode(name, c):
        n = nt.nodes.new('ShaderNodeRGB'); n.name = name; n.outputs[0].default_value = (*c, 1); return n
    HOR = rgbnode('HOR', (.75, .88, 1.0)); ZEN = rgbnode('ZEN', (.18, .45, .95)); GLC = rgbnode('GLOW', (1, .9, .7))
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    fac = [s for s in mix.inputs if s.name == 'Factor' and s.type == 'VALUE'][0]; A_ = [s for s in mix.inputs if s.name == 'A' and s.type == 'RGBA'][0]; B_ = [s for s in mix.inputs if s.name == 'B' and s.type == 'RGBA'][0]
    mout = [s for s in mix.outputs if s.type == 'RGBA'][0]
    nt.links.new(pw.outputs[0], fac); nt.links.new(HOR.outputs[0], A_); nt.links.new(ZEN.outputs[0], B_)
    # sun glow
    sund = nt.nodes.new('ShaderNodeCombineXYZ'); sund.name = 'SUNDIR'; sund.inputs[0].default_value = .3; sund.inputs[1].default_value = .8; sund.inputs[2].default_value = .4
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; nt.links.new(nrm.outputs[0], dot.inputs[0]); nt.links.new(sund.outputs[0], dot.inputs[1])
    cl = nt.nodes.new('ShaderNodeMath'); cl.operation = 'MAXIMUM'; cl.inputs[1].default_value = 0.; nt.links.new(dot.outputs['Value'], cl.inputs[0])
    gp = nt.nodes.new('ShaderNodeMath'); gp.operation = 'POWER'; gp.inputs[1].default_value = 18.; nt.links.new(cl.outputs[0], gp.inputs[0])
    gs = nt.nodes.new('ShaderNodeValue'); gs.name = 'GLOWS'; gs.outputs[0].default_value = .9
    gm = nt.nodes.new('ShaderNodeMath'); gm.operation = 'MULTIPLY'; nt.links.new(gp.outputs[0], gm.inputs[0]); nt.links.new(gs.outputs[0], gm.inputs[1])
    gmix = nt.nodes.new('ShaderNodeMix'); gmix.data_type = 'RGBA'; gmix.blend_type = 'ADD'
    gf = [s for s in gmix.inputs if s.name == 'Factor' and s.type == 'VALUE'][0]; gA = [s for s in gmix.inputs if s.name == 'A' and s.type == 'RGBA'][0]; gB = [s for s in gmix.inputs if s.name == 'B' and s.type == 'RGBA'][0]
    nt.links.new(gm.outputs[0], gf); nt.links.new(mout, gA); nt.links.new(GLC.outputs[0], gB)
    # stars
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 420.; nt.links.new(nrm.outputs[0], vor.inputs['Vector'])
    st = nt.nodes.new('ShaderNodeMapRange'); st.inputs['From Min'].default_value = .0; st.inputs['From Max'].default_value = .045; st.inputs['To Min'].default_value = 1.; st.inputs['To Max'].default_value = 0.
    nt.links.new(vor.outputs['Distance'], st.inputs['Value'])
    sv = nt.nodes.new('ShaderNodeValue'); sv.name = 'STARS'; sv.outputs[0].default_value = 0.
    sm_ = nt.nodes.new('ShaderNodeMath'); sm_.operation = 'MULTIPLY'; nt.links.new(st.outputs['Result'], sm_.inputs[0]); nt.links.new(sv.outputs[0], sm_.inputs[1])
    up = nt.nodes.new('ShaderNodeMath'); up.operation = 'GREATER_THAN'; up.inputs[1].default_value = .05; nt.links.new(sxyz.outputs['Z'], up.inputs[0])
    sm2 = nt.nodes.new('ShaderNodeMath'); sm2.operation = 'MULTIPLY'; nt.links.new(sm_.outputs[0], sm2.inputs[0]); nt.links.new(up.outputs[0], sm2.inputs[1])
    smix = nt.nodes.new('ShaderNodeMix'); smix.data_type = 'RGBA'; smix.blend_type = 'ADD'
    sf = [s for s in smix.inputs if s.name == 'Factor' and s.type == 'VALUE'][0]; sA = [s for s in smix.inputs if s.name == 'A' and s.type == 'RGBA'][0]; sB = [s for s in smix.inputs if s.name == 'B' and s.type == 'RGBA'][0]
    nt.links.new(sm2.outputs[0], sf); nt.links.new([s for s in gmix.outputs if s.type == 'RGBA'][0], sA); sB.default_value = (1, 1, 1, 1)
    bg = nt.nodes.new('ShaderNodeBackground'); bg.name = 'BG'; nt.links.new([s for s in smix.outputs if s.type == 'RGBA'][0], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = .7
    nt.links.new(bg.outputs[0], out.inputs['Surface'])
    SKY = {'day': ((.5, .74, 1.0), (.008, .085, .48), (1, .95, .8), .6, 0., (.3, .8, .45)),
           'sunset': ((1.0, .55, .3), (.35, .25, .7), (1, .6, .25), 1.6, 0., (0, 1, .12)),
           'night': ((.06, .08, .22), (.01, .015, .06), (.6, .7, 1.0), .25, 1.0, (.4, .6, .5)),
           'golden': ((1.0, .78, .5), (.02, .14, .62), (1, .8, .5), 1.0, 0., (.2, .9, .25)),
           'indoor': ((1.0, .93, .82), (.72, .84, 1.0), (1, .88, .66), .5, 0., (.3, .8, .45)),
           'bednight': ((.12, .15, .34), (.04, .05, .14), (.6, .7, 1.0), .2, 1.0, (.4, .6, .5))}
    def sky_key(mode_fn):
        for i in range(3):
            bake_fn(nt, 'nodes["HOR"].outputs[0].default_value', i, lambda t, i=i: SKY[mode_fn(t)][0][i], 'CONSTANT')
            bake_fn(nt, 'nodes["ZEN"].outputs[0].default_value', i, lambda t, i=i: SKY[mode_fn(t)][1][i], 'CONSTANT')
            bake_fn(nt, 'nodes["GLOW"].outputs[0].default_value', i, lambda t, i=i: SKY[mode_fn(t)][2][i], 'CONSTANT')
            bake_fn(nt, 'nodes["SUNDIR"].inputs[%d].default_value' % i, 0, lambda t, i=i: SKY[mode_fn(t)][5][i], 'CONSTANT')
        bake_fn(nt, 'nodes["GLOWS"].outputs[0].default_value', 0, lambda t: SKY[mode_fn(t)][3], 'CONSTANT')
        bake_fn(nt, 'nodes["STARS"].outputs[0].default_value', 0, lambda t: SKY[mode_fn(t)][4], 'CONSTANT')
    # ---- puffy 3D clouds (sphere clusters) on a far dome; they drift
    CLOUD_M = mat('cloudm', (1, 1, 1), .9, 0, (1, 1, 1), 1.1)
    CLOUDS = []
    def clouds(cx, cy, n=18, rmin=180, rmax=320, zmin=55, zmax=110, seed=1):
        r = random.Random(seed)
        for i in range(n):
            ang = r.uniform(0, 2 * math.pi); d = r.uniform(rmin, rmax)
            e = empty('cloud', (cx + math.cos(ang) * d, cy + math.sin(ang) * d, r.uniform(zmin, zmax)))
            s = r.uniform(9, 18)
            for k in range(r.randint(5, 8)):
                obj('puff', SPH, (r.uniform(-1.6, 1.6) * s, r.uniform(-.6, .6) * s, r.uniform(-.2, .5) * s), (s * r.uniform(.6, 1.0),) * 2 + (s * r.uniform(.45, .7),), m=CLOUD_M, parent=e, shadow=False)
            CLOUDS.append(e)
    # ---- colorful palette
    PAL = {'red': (.95, .15, .15), 'orange': (1, .5, .08), 'yellow': (1, .85, .12), 'lime': (.45, .9, .15), 'green': (.1, .7, .3), 'teal': (.05, .75, .75),
           'sky': (.25, .65, 1.0), 'blue': (.12, .3, .95), 'purple': (.55, .2, .9), 'pink': (1, .4, .7), 'cream': (1, .93, .78), 'white': (.95, .95, .95),
           'brick': (.75, .28, .18), 'mint': (.6, .95, .8), 'peach': (1, .72, .55), 'lav': (.75, .65, 1)}
    def pm(name, rough=.55, metal=0.): return mat('pal_' + name + ('_m' if metal else ''), PAL[name], rough, metal)
    # ---- props at correct scale
    def car(x, y, heading, color):
        e = empty('car', (x, y, 0), rot=(0, 0, heading)); L, W_, H_ = SCALE['car_len'], SCALE['car_w'], SCALE['car_h']
        box('carbody', (L, W_, H_ * .45), (0, 0, H_ * .38), pm(color, .25), parent=e)
        box('carcab', (L * .55, W_ * .9, H_ * .38), (-L * .06, 0, H_ * .78), mat('carglass', (.2, .35, .5), .05, .3), parent=e)
        box('carroof', (L * .5, W_ * .92, .25), (-L * .06, 0, H_ * .98), pm(color, .25), parent=e)
        for sx in (-L * .32, L * .32):
            for sy in (-W_ * .48, W_ * .48): obj('tire', CYL, (sx, sy, H_ * .2), (H_ * .2, H_ * .2, .5), (90, 0, 0), mat('tire', (.03, .03, .03), .8), e)
        for sy in (-W_ * .3, W_ * .3): box('headl', (.15, 1.0, .5), (L / 2, sy, H_ * .45), mat('headl', (1, 1, .9), .3, 0, (1, .95, .8), 6.), parent=e, shadow=False)
        for sy in (-W_ * .3, W_ * .3): box('taill', (.15, .9, .4), (-L / 2, sy, H_ * .45), mat('taill', (1, .1, .1), .3, 0, (1, .05, .05), 4.), parent=e, shadow=False)
        e.rotation_mode = 'XYZ'; return e
    def bench(x, y, rz=0):
        e = empty('bench', (x, y, 0), rot=(0, 0, rz))
        box('seat', (5, 1.6, .3), (0, 0, SCALE['bench_seat'] - .15), pm('brick', .7), parent=e); box('back', (5, .3, 1.6), (0, .75, SCALE['bench_seat'] + .7), pm('brick', .7), parent=e)
        for sx in (-2.1, 2.1): box('leg', (.3, 1.4, SCALE['bench_seat'] - .3), (sx, 0, (SCALE['bench_seat'] - .3) / 2), mat('metal', (.4, .4, .42), .35, .8), parent=e)
    def tree(x, y, s=1., col='green'):
        h = SCALE['tree_h'] * s
        obj('trunk', CYL8, (x, y, h * .25), (.7 * s, .7 * s, h * .5), m=mat('trunk', (.36, .2, .08), .9))
        for dx, dy, dz, sz in ((0, 0, .62, 1.0), (.35, .2, .8, .7), (-.3, -.25, .75, .65), (.1, -.35, .55, .6)):
            obj('crown', SPH, (x + dx * h * .3, y + dy * h * .3, h * dz), (h * .26 * sz, h * .26 * sz, h * .22 * sz), m=pm(col, .85))
    def lamp(x, y):
        h = SCALE['lamp_h']; box('lpole', (.4, .4, h), (x, y, h / 2), mat('lampblack', (.08, .08, .1), .4, .6))
        box('lhead', (1.6, .9, .5), (x, y - .5, h), mat('lampblack', (.08, .08, .1), .4, .6)); box('lbulb', (1.2, .6, .12), (x, y - .5, h - .3), mat('bulb', (1, .95, .8), .3, 0, (1, .85, .6), 6.), shadow=False)
    def flowers(x, y, w_=6, d_=1.6):
        box('planter', (w_, d_, 1.0), (x, y, .5), pm('brick', .8)); box('soil', (w_ - .3, d_ - .3, .1), (x, y, 1.0), mat('soil', (.25, .15, .08), .95))
        r = random.Random(int(x * 7 + y * 13))
        for i in range(int(w_ * 2)):
            obj('flower', SPH, (x + r.uniform(-w_ / 2 + .4, w_ / 2 - .4), y + r.uniform(-d_ / 2 + .3, d_ / 2 - .3), 1.3), (.28, .28, .28), m=pm(r.choice(['pink', 'yellow', 'red', 'purple', 'white']), .6), shadow=False)
    def shop(x, y, width, floors, wall, awning, sign_txt=None, face=-1):
        """building facing -Y (face=-1) whose front sits at y; ground floor shop with awning + door."""
        H = floors * SCALE['floor_h'] + 2; d = 14
        cy = y - face * d / 2
        box('bld', (width, d, H), (x, cy, H / 2), pm(wall, .8))
        box('trim', (width + .4, d + .4, .8), (x, cy, H + .4), pm('white', .6))
        fy = y + face * .05
        for fl in range(1, floors):
            for k in range(max(1, int(width // 6))):
                wx = x - width / 2 + 3 + k * (width - 6) / max(1, int(width // 6) - 1) if int(width // 6) > 1 else x
                box('win', (2.6, .3, 3.6), (wx, fy, fl * SCALE['floor_h'] + 5), mat('winglass', (.35, .6, .9), .05, .2, (.9, .85, .6), 0.), shadow=False)
                box('winframe', (3.1, .2, 4.1), (wx, fy - face * .08, fl * SCALE['floor_h'] + 5), pm('white', .6), shadow=False)
        box('shopwin', (width * .55, .3, 4.8), (x + width * .12, fy, 3.6), mat('shopglass', (.5, .75, .95), .05, .1, (1, .9, .7), .6), shadow=False)
        box('door', (SCALE['door_w'], .4, SCALE['door_h']), (x - width * .3, fy, SCALE['door_h'] / 2), pm('blue' if wall != 'blue' else 'red', .5))
        aw = box('awning', (width * .9, 3.0, .35), (x, y + face * 1.4, 9.4), pm(awning, .7), (face * 14, 0, 0))
        if sign_txt:
            cu = bpy.data.curves.new('sign', 'FONT'); cu.body = sign_txt; cu.size = 1.8; cu.extrude = .15; cu.align_x = 'CENTER'
            o = bpy.data.objects.new('sign', cu); COL.objects.link(o); o.location = (x, fy + face * .3, 11.6); o.rotation_euler = Euler((math.pi / 2, 0, 0 if face < 0 else math.pi))
            o.data.materials.append(mat('signtxt', (1, 1, 1), .4, 0, (1, .95, .8), 1.5))
        return H

    # =====================================================================================
    _bake0 = bake
    def bake(idb, path, index, frames, values, interp='LINEAR'):
        """drop keys that equal both neighbours (exact for linear/constant curves) - keeps the scene light"""
        n = len(values)
        if n > 2:
            fr = [frames[0]]; vs = [values[0]]
            for i in range(1, n - 1):
                if values[i] != values[i - 1] or values[i] != values[i + 1]: fr.append(frames[i]); vs.append(values[i])
            fr.append(frames[-1]); vs.append(values[-1])
            frames, values = fr, vs
        _bake0(idb, path, index, frames, values, interp)
    SIT = {'ulLX': -90, 'ulRX': -90, 'llLX': 90, 'llRX': 90}
    P.update({
        'sit': SIT,
        'look_hands': {'uaLX': -62, 'laLX': -58, 'uaRX': -62, 'laRX': -58, 'uaLZ': -8, 'uaRZ': 8, 'hdX': 28, 'spX': 6},
        'point': {'uaRX': -85, 'laRX': -5, 'uaRZ': -6, 'spY': -8},
        'palms_up': {'uaLX': -55, 'laLX': -55, 'uaRX': -55, 'laRX': -55, 'uaLZ': 10, 'uaRZ': -10, 'hdX': 12},
        'flail': {'uaLZ': 120, 'uaRZ': -120, 'ulLX': -40, 'ulRX': 20, 'llLX': 40, 'spX': -20, 'hdX': -20},
        'cover': {'uaLX': -110, 'laLX': -100, 'uaRX': -110, 'laRX': -100, 'uaLZ': -20, 'uaRZ': 20, 'spX': 22, 'hdX': 20},
        'laugh': {'spX': -10, 'hdX': -18, 'uaLX': -40, 'laLX': -80, 'uaLZ': -10},
        'cheer': add(SIT, {'uaLZ': 150, 'uaRZ': -150, 'laLX': -25, 'laRX': -25}),
        'cup': {'uaRX': -60, 'laRX': -92, 'uaRZ': 26, 'spX': 10, 'hdX': 4},
        'cupL': {'uaLX': -60, 'laLX': -92, 'uaLZ': -26, 'spX': 10, 'hdX': 4},
        'offerR': {'uaRX': -64, 'laRX': -28, 'uaRZ': 4, 'hdX': 16},
        'offerL': {'uaLX': -64, 'laLX': -28, 'uaLZ': -4, 'hdX': 16},
        'cross': {'uaLX': -48, 'laLX': -98, 'uaLZ': -40, 'uaRX': -48, 'laRX': -98, 'uaRZ': 40, 'spX': -5, 'hdX': -5},
        'giggle': {'uaLX': -55, 'laLX': -95, 'uaLZ': -26, 'uaRX': -55, 'laRX': -95, 'uaRZ': 26, 'spX': 12, 'hdX': 6},
        'thumbs': {'uaRX': -72, 'laRX': -62, 'uaRZ': -4},
        'collar': {'uaRX': -40, 'laRX': -105, 'uaRZ': 30, 'uaLX': -40, 'laLX': -105, 'uaLZ': -30, 'hdX': -8, 'spX': -4},
        'read': {'uaLX': -58, 'laLX': -48, 'uaLZ': -14, 'uaRX': -58, 'laRX': -48, 'uaRZ': 14, 'hdX': 18},
        'raise': {'uaRX': -172, 'laRX': -4, 'hdX': -4},
        'mic': {'uaRX': -52, 'laRX': -98, 'uaRZ': 26, 'hdX': 2},
        'bottle': {'uaRX': -45, 'laRX': -100, 'uaRZ': 30, 'uaLX': -45, 'laLX': -100, 'uaLZ': -30},
        'hugbag': {'uaLX': -84, 'laLX': -34, 'uaLZ': -22, 'uaRX': -84, 'laRX': -34, 'uaRZ': 22, 'spX': 18, 'hdX': -8, 'ulLX': -20, 'llLX': 25, 'ulRX': -20, 'llRX': 25},
        'slump': {'spX': 16, 'hdX': 20, 'uaLZ': 2, 'uaRZ': -2, 'uaLX': 6, 'uaRX': 6},
        'scared': {'uaLX': -35, 'laLX': -70, 'uaRX': -35, 'laRX': -70, 'spX': -6, 'hdX': -6, 'uaLZ': 10, 'uaRZ': -10},
        'reachR': {'uaRX': -80, 'laRX': -10, 'uaRZ': 6, 'spX': 8},
        'pat': add(SIT, {'uaLX': -70, 'laLX': -20, 'spZ': 14, 'hdY': 22, 'hdX': 10}),
        'present': {'uaLX': -80, 'laLX': -40, 'uaLZ': -14, 'uaRX': -80, 'laRX': -40, 'uaRZ': 14},
        'salute': {'uaRX': -120, 'laRX': -120, 'uaRZ': 40},
        'pull': {'uaLX': -150, 'laLX': -10, 'uaRX': -110, 'laRX': -10, 'spX': -6},
        'wiggle': {'uaLZ': 112, 'laLX': -96, 'uaRZ': -112, 'laRX': -96, 'hdX': -6},
        'ground': {'uaLX': -150, 'uaRX': -150, 'uaLZ': 20, 'uaRZ': -20},
        'hero': {'uaLZ': 9, 'uaRZ': -9, 'spX': -4, 'hdX': -4, 'ulLX': -4, 'ulRX': 4},
    })
    def blink(face, closed, t, seed=0.):
        ph = (t + seed * 1.37) % 3.4
        return closed if ph < .12 else face
    def jitter(t, amp, seed=0.): return amp * (math.sin(t * 61 + seed) * .6 + math.sin(t * 43 + seed * 2) * .4)
    def face_to(x0, y0, x1, y1): return math.degrees(math.atan2(-(x1 - x0), y1 - y0))
    def dance(t, kind, seed=0.):
        w = t * 7.5 + seed
        s = math.sin(w); c = math.cos(w); s2 = math.sin(2 * w)
        if kind == 0:     # arms-up groove
            return {'uaLZ': 128 + 28 * s, 'uaRZ': -128 + 28 * s, 'laLX': -30, 'laRX': -30, 'spY': 12 * s, 'spZ': 8 * c, 'hdY': 10 * s, 'ulLX': -18 * max(0, s), 'ulRX': -18 * max(0, -s), 'llLX': 30 * max(0, s), 'llRX': 30 * max(0, -s), 'bob': .22 * abs(s2)}
        if kind == 1:     # chicken flap
            return {'uaLX': -20, 'uaRX': -20, 'laLX': -110, 'laRX': -110, 'uaLZ': 30 + 32 * abs(s2), 'uaRZ': -30 - 32 * abs(s2), 'hdX': 14 * s2, 'spX': 12, 'ulLX': -25 * max(0, s), 'llLX': 40 * max(0, s), 'ulRX': -25 * max(0, -s), 'llRX': 40 * max(0, -s), 'bob': .18 * abs(s2)}
        if kind == 2:     # side sway swing
            return {'spZ': 24 * s, 'uaLX': -45 * s, 'uaRX': 45 * s, 'uaLZ': 20, 'uaRZ': -20, 'laLX': -40, 'laRX': -40, 'hdY': -14 * s, 'spY': 8 * c, 'bob': .12 * abs(c)}
        if kind == 3:     # jumping jacks
            k = .5 + .5 * math.sin(w * 1.2)
            return {'uaLZ': 150 * k, 'uaRZ': -150 * k, 'ulLZ': -18 * k, 'ulRZ': 18 * k, 'bob': 1.2 * k * k}
        return add(P['flail'], {'spZ': 25 * s, 'hdY': 20 * c, 'bob': .3 * abs(s2)})
    def dance_bill(t, kind, seed=0.):   # dancing while waving a bill in the right hand
        p = dance(t, kind, seed)
        p['uaRZ'] = -150 + 15 * math.sin(t * 9 + seed); p['uaRX'] = 0; p['laRX'] = -15
        return p

    # ---------------- shared meshes / materials
    CONE16 = mesh_cyl(16, 0.0); CONE16.materials.append(None)
    def grid_mesh(nx=16, ny=8):
        me = bpy.data.meshes.new('grid'); bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=nx, y_segments=ny, size=.5, calc_uvs=True); bm.to_mesh(me); bm.free(); me.materials.append(None); return me
    def img_mat(name, fn, scale=(1, 1), rough=.6, spec=.5, emit=0., alpha=False):
        if name in MATS: return MATS[name]
        m = bpy.data.materials.new(name); m.use_nodes = True; nt_ = m.node_tree; b = nt_.nodes.get('Principled BSDF')
        tc_ = nt_.nodes.new('ShaderNodeTexCoord'); mp = nt_.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale[0], scale[1], 1)
        nt_.links.new(tc_.outputs['UV'], mp.inputs['Vector'])
        tx_ = nt_.nodes.new('ShaderNodeTexImage'); tx_.image = bpy.data.images.load(os.path.join(FACEDIR, fn), check_existing=True)
        nt_.links.new(mp.outputs['Vector'], tx_.inputs['Vector']); nt_.links.new(tx_.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = rough
        if emit: nt_.links.new(tx_.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = emit
        if alpha:
            nt_.links.new(tx_.outputs['Alpha'], b.inputs['Alpha'])
            try: m.surface_render_method = 'BLENDED'
            except Exception: pass
        MATS[name] = m; return m
    def plane(name, size, loc, m, rot=(0, 0, 0), parent=None, shadow=True):
        return obj(name, PLANE, loc, (size[0], size[1], 1), rot, m, parent, shadow)
    def text3d(name, txt, loc, size, m, rot=(90, 0, 0), extrude=.05, parent=None):
        cu = bpy.data.curves.new(name, 'FONT'); cu.body = txt; cu.size = size; cu.extrude = extrude; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
        try:
            fnt = bpy.data.fonts.load('C:/Windows/Fonts/arialbd.ttf', check_existing=True) if os.name == 'nt' else None
            if fnt: cu.font = fnt
        except Exception: pass
        o = bpy.data.objects.new(name, cu); COL.objects.link(o)
        if parent is not None: o.parent = parent
        o.location = loc; o.rotation_euler = Euler([r_ * D2R for r_ in rot]); o.data.materials.append(m); return o
    def bush(x, y, s=1., col='green', z=0.):
        r_ = random.Random(int(x * 31 + y * 17))
        for k_ in range(4):
            obj('bush', SPH, (x + r_.uniform(-.8, .8) * s, y + r_.uniform(-.8, .8) * s, z + 1.1 * s + r_.uniform(0, .4) * s), (1.5 * s,) * 2 + (1.25 * s,), m=pm(col, .8))
    def blossom(x, y, s=1.):
        h = 13 * s
        obj('trunk', CYL8, (x, y, h * .3), (.6 * s, .6 * s, h * .6), m=mat('trunk', (.36, .2, .08), .9))
        for dx, dy, dz, sz in ((0, 0, .72, 1.0), (.4, .2, .85, .7), (-.35, -.2, .8, .7)):
            obj('crown', SPH, (x + dx * h * .3, y + dy * h * .3, h * dz), (h * .3 * sz, h * .3 * sz, h * .24 * sz), m=pm('pink', .85))
    def trashcan(x, y, z=0.):
        obj('can', CYL, (x, y, z + 1.4), (.9, .9, 2.8), m=pm('lime', .5)); obj('canlid', CYL, (x, y, z + 2.9), (.95, .95, .2), m=pm('green', .5))
    def hills(cx, cy, n=9, seed=4):
        r_ = random.Random(seed)
        for i in range(n):
            ang = r_.uniform(0, 2 * math.pi); d = r_.uniform(240, 330); s = r_.uniform(60, 120)
            obj('hill', SPH, (cx + math.cos(ang) * d, cy + math.sin(ang) * d, -s * .35), (s, s, s * r_.uniform(.45, .7)), m=mat('hill', (.3, .7, .2), .9), shadow=False)
    def fountain(x, y):
        obj('fbase', CYL, (x, y, .6), (4.5, 4.5, 1.2), m=pm('white', .5)); obj('fwater', CYL, (x, y, 1.15), (4.1, 4.1, .1), m=mat('fwat', (.2, .65, 1.0), .05, 0, (.1, .4, .8), .6))
        obj('fpil', CYL, (x, y, 2.5), (.6, .6, 3), m=pm('white', .5)); obj('ftop', SPH, (x, y, 4.3), (1.2, 1.2, 1.2), m=pm('blue', .3))
    def bench2(x, y, rz=0, z=0., col='brick'):
        e = empty('bench', (x, y, z), rot=(0, 0, rz))
        box('seat', (5, 1.6, .3), (0, 0, SCALE['bench_seat'] - .15), pm(col, .7), parent=e); box('back', (5, .3, 1.6), (0, .75, SCALE['bench_seat'] + .7), pm(col, .7), parent=e)
        for sx in (-2.1, 2.1): box('leg', (.3, 1.4, SCALE['bench_seat'] - .3), (sx, 0, (SCALE['bench_seat'] - .3) / 2), mat('metal', (.4, .4, .42), .35, .8), parent=e)
        return e
    def chair(x, y, rz=0, z=0., col='blue'):
        """sitter faces local -Y (heading = 180 + rz)"""
        e = empty('chair', (x, y, z), rot=(0, 0, rz))
        box('cseat', (1.9, 1.8, .25), (0, 0, 1.58), pm(col, .45), parent=e); box('cback', (1.9, .25, 2.0), (0, .9, 2.6), pm(col, .45), parent=e)
        for sx in (-.8, .8):
            for sy in (-.75, .75): box('cleg', (.16, .16, 1.5), (sx, sy, .75), mat('metal', (.4, .4, .42), .35, .8), parent=e)
        return e
    def sit_root(x, y, hdg, seat_top=1.7, z0=0.):
        bx, by = math.sin(hdg * D2R), -math.cos(hdg * D2R)
        return (x + bx * .3, y + by * .3, z0 + seat_top - WAIST + .55)
    def table(x, y, z=0., col='white', h=2.7, r=1.7):
        obj('ttop', CYL, (x, y, z + h), (r, r, .22), m=pm(col, .35)); obj('tleg', CYL8, (x, y, z + h / 2), (.18, .18, h), m=mat('metal', (.4, .4, .42), .35, .8))
        obj('tfoot', CYL, (x, y, z + .06), (.9, .9, .12), m=mat('metal', (.4, .4, .42), .35, .8))
    def umbrella(x, y, z=0., col='red'):
        obj('upole', CYL8, (x, y, z + 5.5), (.12, .12, 11), m=pm('white', .4))
        obj('ucan', CONE16, (x, y, z + 10.8), (4.2, 4.2, 1.6), m=pm(col, .6))
        obj('ucan2', CONE16, (x, y, z + 10.82), (4.25, 4.25, .02), m=pm('white', .6))
    def window(x, y, z, w, h, rz, m_glass, frame='white', parent=None):
        e = empty('win', (x, y, z), rot=(0, 0, rz), parent=parent)
        box('wglass', (w, .12, h), (0, 0, 0), m_glass, parent=e, shadow=False)
        for sx in (-w / 2, 0, w / 2): box('wfr', (.3, .3, h + .3), (sx, -.1, 0), pm(frame, .5), parent=e)
        for sz in (-h / 2, 0, h / 2): box('wfr', (w + .3, .3, .3), (0, -.1, sz), pm(frame, .5), parent=e)
        return e
    def room(cx, cy, w, d, h, wall_m, floor_m, ceil_m=None, trim='white'):
        plane('floor', (w, d), (cx, cy, 0), floor_m)
        box('ceil', (w + 2, d + 2, .4), (cx, cy, h + .2), ceil_m or mat('ceilw', (.95, .95, .93), .9), shadow=True)
        for sx in (-1, 1): box('wallx', (.6, d + 1.2, h), (cx + sx * (w / 2 + .3), cy, h / 2), wall_m)
        for sy in (-1, 1): box('wally', (w + 1.2, .6, h), (cx, cy + sy * (d / 2 + .3), h / 2), wall_m)
        for sx in (-1, 1): box('basex', (.2, d, .6), (cx + sx * (w / 2 - .1), cy, .3), pm(trim, .5))
        for sy in (-1, 1): box('basey', (w, .2, .6), (cx, cy + sy * (d / 2 - .1), .3), pm(trim, .5))
    def wmat(name, fn, tile=8., rough=.85, emit=0.):
        """image texture mapped in world space (box projection) so any box size tiles evenly"""
        if name in MATS: return MATS[name]
        m = bpy.data.materials.new(name); m.use_nodes = True; nt_ = m.node_tree; b = nt_.nodes.get('Principled BSDF')
        geo = nt_.nodes.new('ShaderNodeNewGeometry'); vm = nt_.nodes.new('ShaderNodeVectorMath'); vm.operation = 'SCALE'; vm.inputs['Scale'].default_value = 1. / tile
        nt_.links.new(geo.outputs['Position'], vm.inputs[0])
        tx_ = nt_.nodes.new('ShaderNodeTexImage'); tx_.image = bpy.data.images.load(os.path.join(FACEDIR, fn), check_existing=True); tx_.projection = 'BOX'; tx_.projection_blend = .15
        nt_.links.new(vm.outputs['Vector'], tx_.inputs['Vector']); nt_.links.new(tx_.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
        if emit: nt_.links.new(tx_.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = emit
        MATS[name] = m; return m
    def wallmat(name, fn, sc_=(4, 2), rough=.85): return wmat(name, fn, 8., rough)
    def boxuv(name, size, loc, m, rot=(0, 0, 0), parent=None):   # cube with generated texture coords for image mats
        o = box(name, size, loc, m, rot, parent); return o
    SKYWIN = mat('skywin', (.6, .82, 1.0), .2, 0, (.62, .82, 1.0), 2.2)
    NIGHTWIN = mat('nightwin', (.05, .08, .25), .2, 0, (.08, .12, .35), 1.2)
    GLASSY = lambda nm, c, r_=.12: mat(nm, c, r_, 0.)
    for o in list(sc.objects):
        if o.type in ('LIGHT', 'CAMERA'): o.hide_render = True


    # =====================================================================================
    # ENV KIT v2 — detailed sets adapted from the reference Shorts
    #   procedural materials (tile, brick, wood planks, asphalt (wet), pavers, ceiling tiles, polka, stripes)
    #   detailed builders: city street, school hallway, classroom, hospital room, bedroom
    #   fx: rain, fire, sparks, smoke, fairy lights, bunting
    # needs from the header/kit: mat, obj, box, plane, empty, light, text3d, CUBE, CYL, CYL8, SPH, CONE, PLANE, MATS, PAL, pm, SCALE, bake_fn, D2R
    # =====================================================================================
    def text3d_(name, txt, loc, size, m, rot=(90, 0, 0), extrude=.05, parent=None):
        cu = bpy.data.curves.new(name, 'FONT'); cu.body = txt; cu.size = size; cu.extrude = extrude; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
        try:
            fp_ = 'C:/Windows/Fonts/arialbd.ttf' if os.name == 'nt' else '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
            if os.path.exists(fp_): cu.font = bpy.data.fonts.load(fp_, check_existing=True)
        except Exception: pass
        o = bpy.data.objects.new(name, cu); COL.objects.link(o)
        if parent is not None: o.parent = parent
        o.location = loc; o.rotation_euler = Euler([r_ * D2R for r_ in rot]); o.data.materials.append(m); return o
    def _sock(node, name, typ):
        return [s for s in node.inputs if s.name == name and s.type == typ][0]
    def _mix(nt_, fac, a, b, blend='MIX'):
        m_ = nt_.nodes.new('ShaderNodeMix'); m_.data_type = 'RGBA'; m_.blend_type = blend
        f_ = _sock(m_, 'Factor', 'VALUE'); A = _sock(m_, 'A', 'RGBA'); B = _sock(m_, 'B', 'RGBA')
        for s_, v_ in ((f_, fac), (A, a), (B, b)):
            if isinstance(v_, (int, float)): s_.default_value = v_
            elif isinstance(v_, tuple): s_.default_value = (*v_[:3], 1)
            else: nt_.links.new(v_, s_)
        return [s for s in m_.outputs if s.type == 'RGBA'][0]
    def _new(name, rough=.5, metal=0.):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt_ = m.node_tree; b = nt_.nodes.get('Principled BSDF')
        b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal; return m, nt_, b
    def _uv(nt_, axis='XY', scale=1.):
        """world-space 2D coords on the given plane: 'XY' floors, 'XZ' walls facing ±Y, 'YZ' walls facing ±X"""
        g = nt_.nodes.new('ShaderNodeNewGeometry'); s = nt_.nodes.new('ShaderNodeSeparateXYZ'); c = nt_.nodes.new('ShaderNodeCombineXYZ')
        nt_.links.new(g.outputs['Position'], s.inputs[0])
        nt_.links.new(s.outputs[axis[0]], c.inputs[0]); nt_.links.new(s.outputs[axis[1]], c.inputs[1])
        if scale != 1.:
            vm = nt_.nodes.new('ShaderNodeVectorMath'); vm.operation = 'SCALE'; vm.inputs['Scale'].default_value = scale
            nt_.links.new(c.outputs[0], vm.inputs[0]); return vm.outputs['Vector']
        return c.outputs[0]
    def _bump(nt_, b, height, strength=.25):
        bp = nt_.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = strength
        nt_.links.new(height, bp.inputs['Height']); nt_.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    def _brick(nt_, vec, c1, c2, mortar, bw, rh, msize=.04, offset=.5, bias=0.):
        t = nt_.nodes.new('ShaderNodeTexBrick'); t.offset = offset
        t.inputs['Scale'].default_value = 1.; t.inputs['Brick Width'].default_value = bw; t.inputs['Row Height'].default_value = rh
        t.inputs['Mortar Size'].default_value = msize; t.inputs['Mortar Smooth'].default_value = .1; t.inputs['Bias'].default_value = bias
        t.inputs['Color1'].default_value = (*c1, 1); t.inputs['Color2'].default_value = (*c2, 1); t.inputs['Mortar'].default_value = (*mortar, 1)
        nt_.links.new(vec, t.inputs['Vector']); return t
    def _noise(nt_, vec, scale, detail=4.):
        n = nt_.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
        nt_.links.new(vec, n.inputs['Vector']); return n

    def tile_mat(name, c1, c2, size=2.4, rough=.1, grout=(.62, .6, .56), axis='XY'):
        """glossy checker tiles with grout lines (school hallway / hospital / kitchen)"""
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, rough)
        v = _uv(nt_, axis); ck = nt_.nodes.new('ShaderNodeTexChecker'); ck.inputs['Scale'].default_value = 1. / size
        ck.inputs['Color1'].default_value = (*c1, 1); ck.inputs['Color2'].default_value = (*c2, 1); nt_.links.new(v, ck.inputs['Vector'])
        br = _brick(nt_, v, (1, 1, 1), (1, 1, 1), (0, 0, 0), size / 2, size / 2, .05, 0.)
        col = _mix(nt_, 1., grout, ck.outputs['Color'], 'MIX')
        # br.Color is white on tiles, black on grout -> use as factor
        sep = nt_.nodes.new('ShaderNodeSeparateColor'); nt_.links.new(br.outputs['Color'], sep.inputs[0])
        col = _mix(nt_, sep.outputs[0], grout, ck.outputs['Color'])
        nt_.links.new(col, b.inputs['Base Color'])
        try: b.inputs['Coat Weight'].default_value = .35; b.inputs['Coat Roughness'].default_value = .05
        except Exception: pass
        _bump(nt_, b, sep.outputs[0], .15)
        MATS[name] = m; return m
    def brick_mat(name, col, axis='XZ', mortar=(.82, .78, .72), bw=1.5, rh=.5, rough=.85):
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, rough)
        v = _uv(nt_, axis); c2 = tuple(c * .78 for c in col)
        br = _brick(nt_, v, col, c2, mortar, bw, rh, .06, .5, .1)
        nz = _noise(nt_, v, 1.8); col_ = _mix(nt_, .18, br.outputs['Color'], nz.outputs['Color'], 'MULTIPLY')
        nt_.links.new(col_, b.inputs['Base Color'])
        inv = nt_.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.; nt_.links.new(br.outputs['Fac'], inv.inputs[1])
        _bump(nt_, b, inv.outputs[0], .35)
        MATS[name] = m; return m
    def wood_mat(name, col=(.55, .33, .16), axis='XY', plank_w=1.1, plank_l=7., rough=.32, gloss=True):
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, rough)
        v = _uv(nt_, axis); c2 = tuple(min(1, c * 1.25) for c in col)
        br = _brick(nt_, v, col, c2, tuple(c * .4 for c in col), plank_l, plank_w, .03, .37, .4)
        # grain: stretched noise
        g = nt_.nodes.new('ShaderNodeNewGeometry'); mp = nt_.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (.15, 3., 1.) if axis == 'XY' else (.15, 1., 3.)
        nt_.links.new(g.outputs['Position'], mp.inputs['Vector']); nz = _noise(nt_, mp.outputs['Vector'], 2.5, 6.)
        col_ = _mix(nt_, .22, br.outputs['Color'], nz.outputs['Color'], 'MULTIPLY')
        nt_.links.new(col_, b.inputs['Base Color'])
        if gloss:
            try: b.inputs['Coat Weight'].default_value = .5; b.inputs['Coat Roughness'].default_value = .08
            except Exception: pass
        inv = nt_.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.; nt_.links.new(br.outputs['Fac'], inv.inputs[1])
        _bump(nt_, b, inv.outputs[0], .2)
        MATS[name] = m; return m
    def asphalt_mat(name, wet=0.):
        """dark asphalt with grain; wet>0 adds glossy puddles (night/rain scenes)"""
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, .85)
        v = _uv(nt_, 'XY'); nz = _noise(nt_, v, 3.5, 8.)
        col_ = _mix(nt_, nz.outputs['Fac'], (.2, .2, .215), (.34, .34, .35))
        if wet > 0:
            big = _noise(nt_, v, .06, 3.); rp = nt_.nodes.new('ShaderNodeMapRange')
            rp.inputs['From Min'].default_value = .5 - .1 * wet; rp.inputs['From Max'].default_value = .56 - .1 * wet
            nt_.links.new(big.outputs['Fac'], rp.inputs['Value'])
            rr = nt_.nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = .55; rr.inputs['To Max'].default_value = .03
            nt_.links.new(rp.outputs['Result'], rr.inputs['Value']); nt_.links.new(rr.outputs['Result'], b.inputs['Roughness'])
            col_ = _mix(nt_, rp.outputs['Result'], col_, (.02, .02, .025))
        nt_.links.new(col_, b.inputs['Base Color']); _bump(nt_, b, nz.outputs['Fac'], .08)
        MATS[name] = m; return m
    def paver_mat(name, col=(.62, .6, .57), size=3., rough=.7, wet=0.):
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, rough * (1 - .8 * wet))
        v = _uv(nt_, 'XY'); br = _brick(nt_, v, col, tuple(c * .88 for c in col), tuple(c * .55 for c in col), size, size * .5, .06, .5, .2)
        nz = _noise(nt_, v, 2.2); col_ = _mix(nt_, .2, br.outputs['Color'], nz.outputs['Color'], 'MULTIPLY')
        nt_.links.new(col_, b.inputs['Base Color'])
        inv = nt_.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.; nt_.links.new(br.outputs['Fac'], inv.inputs[1])
        _bump(nt_, b, inv.outputs[0], .3)
        MATS[name] = m; return m
    def ceiltile_mat(name, col=(.92, .91, .88), size=4.):
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, .9)
        v = _uv(nt_, 'XY'); br = _brick(nt_, v, col, tuple(c * .96 for c in col), (.55, .55, .55), size, size, .08, 0.)
        nz = _noise(nt_, v, 18., 2.); col_ = _mix(nt_, .12, br.outputs['Color'], nz.outputs['Color'], 'MULTIPLY')
        nt_.links.new(col_, b.inputs['Base Color']); MATS[name] = m; return m
    def plaster_mat(name, col, axis='XZ', rough=.8):
        """painted wall with subtle roller texture"""
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, rough); v = _uv(nt_, axis); nz = _noise(nt_, v, 6., 3.)
        col_ = _mix(nt_, .06, col, nz.outputs['Color'], 'MULTIPLY'); nt_.links.new(col_, b.inputs['Base Color']); _bump(nt_, b, nz.outputs['Fac'], .04)
        MATS[name] = m; return m
    def polka_mat(name, base, dot, size=.9, axis='XY'):
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, .85); v = _uv(nt_, axis); vo = nt_.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 1. / size
        try: vo.inputs['Randomness'].default_value = 0.
        except Exception: pass
        nt_.links.new(v, vo.inputs['Vector'])
        th = nt_.nodes.new('ShaderNodeMath'); th.operation = 'LESS_THAN'; th.inputs[1].default_value = .22; nt_.links.new(vo.outputs['Distance'], th.inputs[0])
        nt_.links.new(_mix(nt_, th.outputs[0], base, dot), b.inputs['Base Color']); MATS[name] = m; return m
    def stripe_mat(name, c1, c2, width=1., axis='XZ', direction=0, rough=.7):
        """stripes; direction 0 = vertical bands across the first axis, 1 = along the second"""
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, rough); v = _uv(nt_, axis)
        s = nt_.nodes.new('ShaderNodeSeparateXYZ'); nt_.links.new(v, s.inputs[0])
        d = nt_.nodes.new('ShaderNodeMath'); d.operation = 'DIVIDE'; d.inputs[1].default_value = width; nt_.links.new(s.outputs[direction], d.inputs[0])
        fl = nt_.nodes.new('ShaderNodeMath'); fl.operation = 'FLOOR'; nt_.links.new(d.outputs[0], fl.inputs[0])
        md = nt_.nodes.new('ShaderNodeMath'); md.operation = 'FLOORED_MODULO'; md.inputs[1].default_value = 2.; nt_.links.new(fl.outputs[0], md.inputs[0])
        nt_.links.new(_mix(nt_, md.outputs[0], c1, c2), b.inputs['Base Color']); MATS[name] = m; return m
    def glass_mat(name, tint=(.35, .5, .62), night=False):
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, .04); b.inputs['Base Color'].default_value = (*tint, 1)
        try: b.inputs['Specular IOR Level'].default_value = .9
        except Exception: pass
        if night:
            b.inputs['Emission Color'].default_value = (1, .78, .45, 1); b.inputs['Emission Strength'].default_value = 3.
        MATS[name] = m; return m
    def emit_mat(name, col, strength=4.):
        return mat(name, col, .5, 0, col, strength)
    METAL = lambda: mat('e2metal', (.55, .56, .6), .3, .9)
    DARKM = lambda: mat('e2dark', (.06, .06, .07), .4, .5)
    WHITE = lambda: mat('e2white', (.93, .93, .9), .45)

    # ---------------------------------------------------------------- small reusable props
    def label(txt, loc, size, col=(1, 1, 1), rot=(90, 0, 0), emit=0., parent=None, extrude=.04):
        m_ = mat('lbl_%d_%d_%d_%d' % (int(col[0] * 99), int(col[1] * 99), int(col[2] * 99), int(emit * 10)), col, .45, 0, col if emit else None, emit)
        return text3d_('lbl', txt, loc, size, m_, rot, extrude, parent)
    def pot_plant(x, y, z=0., s=1., seed=0):
        r_ = random.Random(seed + int(x * 13 + y * 7))
        obj('pot', CYL, (x, y, z + .6 * s), (.7 * s, .7 * s, 1.2 * s), m=mat('terracotta', (.72, .33, .18), .8))
        for k in range(5):
            obj('leaf', SPH, (x + r_.uniform(-.5, .5) * s, y + r_.uniform(-.5, .5) * s, z + (1.6 + r_.uniform(0, .9)) * s), (.6 * s, .6 * s, .8 * s), m=mat('leafg', (.12, .5, .16), .7))
    def books_row(x0, y, z, length, rz=0, seed=1, depth=.8, h=1.2):
        r_ = random.Random(seed); e = empty('books', (x0, y, z), rot=(0, 0, rz)); x = -length / 2
        cols = ['red', 'blue', 'yellow', 'green', 'orange', 'teal', 'purple', 'cream', 'white', 'brick']
        while x < length / 2 - .2:
            w = r_.uniform(.18, .34); hh = h * r_.uniform(.7, 1.0); tilt = r_.choice([0, 0, 0, 0, 8])
            box('book', (w, depth, hh), (x + w / 2, 0, hh / 2), pm(r_.choice(cols), .6), (0, tilt, 0), parent=e); x += w + .02
        return e
    def poster(x, y, z, w, h, rz, seed=0, parent=None, kind=None):
        """framed colorful poster with simple graphic"""
        r_ = random.Random(seed); e = empty('poster', (x, y, z), rot=(0, 0, rz), parent=parent)
        bgc = r_.choice([(1, .82, .3), (.3, .7, 1), (1, .45, .4), (.5, .9, .5), (.95, .95, .9), (.75, .55, 1)])
        box('pframe', (w + .2, .1, h + .2), (0, .02, 0), DARKM(), parent=e)
        box('pbg', (w, .08, h), (0, -.04, 0), mat('pbg_%d' % seed, bgc, .7), parent=e)
        k = kind if kind is not None else r_.randint(0, 3)
        acc = pm(r_.choice(['red', 'blue', 'green', 'purple', 'orange']), .6)
        if k == 0: obj('pcirc', CYL, (0, -.1, h * .1), (w * .3, .03, w * .3), (90, 0, 0), acc, e)
        elif k == 1:
            for i in range(3): box('pbar', (w * .15, .03, h * (.2 + .2 * i)), (-w * .25 + i * w * .25, -.1, -h * .3 + h * (.1 + .1 * i)), acc, parent=e)
        elif k == 2: obj('ptri', CONE, (0, -.1, 0), (w * .3, .03, w * .3), (90, 45, 0), acc, e)
        else: box('pstar', (w * .5, .03, w * .5), (0, -.1, h * .1), acc, (0, 45, 0), parent=e)
        box('ptxt', (w * .7, .03, h * .07), (0, -.1, -h * .36), DARKM(), parent=e)
        return e
    def wall_clock(x, y, z, rz=0):
        e = empty('clock', (x, y, z), rot=(0, 0, rz))
        obj('cring', CYL, (0, 0, 0), (1.0, 1.0, .25), (90, 0, 0), DARKM(), e); obj('cface', CYL, (0, -.08, 0), (.88, .88, .2), (90, 0, 0), WHITE(), e)
        box('chand', (.08, .05, .6), (0, -.2, .25), DARKM(), parent=e); box('chand2', (.45, .05, .08), (.2, -.2, 0), DARKM(), parent=e)
        return e
    def bunting(p0, p1, sag=1.5, n=14, seed=0, size=.9):
        """string of triangle flags between two points"""
        r_ = random.Random(seed); cols = ['red', 'yellow', 'blue', 'green', 'orange', 'purple', 'pink', 'teal']
        p0 = Vector(p0); p1 = Vector(p1); d = p1 - p0; L_ = d.length; ang = math.degrees(math.atan2(d.y, d.x))
        for i in range(n + 1):
            t = i / n; p = p0 + d * t; p.z -= sag * 4 * t * (1 - t)
            box('bstr', (L_ / n + .05, .05, .05), (p.x - d.x / n / 2, p.y - d.y / n / 2, p.z), DARKM(), (0, 0, ang), shadow=False) if i else None
            if 0 < i < n or n < 3:
                obj('flagt', CONE, (p.x, p.y, p.z - size * .55), (size * .55, .04, size * .6), (0, 180, ang), pm(r_.choice(cols), .7), shadow=False)
    def fairy_lights(p0, p1, sag=1.0, n=20, col=(1, .78, .4), strength=12.):
        p0 = Vector(p0); p1 = Vector(p1); d = p1 - p0; em = emit_mat('fairy_%d' % int(col[2] * 99), col, strength)
        for i in range(n + 1):
            t = i / n; p = p0 + d * t; p.z -= sag * 4 * t * (1 - t)
            obj('bulb', SPH, tuple(p), (.12, .12, .16), m=em, shadow=False)
    def car2(x, y, heading, color, wet=False):
        """parked car with windows, bumpers, wheels with rims, lights"""
        e = empty('car', (x, y, 0), rot=(0, 0, heading)); L_, W_, H_ = 13., 6., 4.8
        body = pm(color, .18)
        box('cbody', (L_, W_, H_ * .42), (0, 0, H_ * .42), body, parent=e)
        box('chood', (L_ * .26, W_ * .96, .3), (L_ * .34, 0, H_ * .64), body, (0, -4, 0), parent=e)
        cab = box('ccab', (L_ * .5, W_ * .9, H_ * .36), (-L_ * .05, 0, H_ * .8), body, parent=e)
        g = glass_mat('carglass2', (.12, .18, .25))
        box('cwf', (.2, W_ * .84, H_ * .3), (L_ * .2, 0, H_ * .8), g, (0, -28, 0), parent=e)
        box('cwr', (.2, W_ * .84, H_ * .3), (-L_ * .3, 0, H_ * .8), g, (0, 25, 0), parent=e)
        for sy in (-1, 1): box('cws', (L_ * .44, .1, H_ * .26), (-L_ * .05, sy * W_ * .455, H_ * .82), g, parent=e)
        for sx in (-1, 1): box('cbump', (.5, W_ * 1.0, .6), (sx * L_ / 2, 0, H_ * .3), DARKM(), parent=e)
        for sx in (-L_ * .31, L_ * .31):
            for sy in (-W_ * .47, W_ * .47):
                obj('tire', CYL, (sx, sy, 1.05), (1.05, 1.05, .8), (90, 0, 0), mat('tire2', (.03, .03, .03), .7), e)
                obj('rim', CYL, (sx, sy * 1.05, 1.05), (.55, .55, .82), (90, 0, 0), METAL(), e)
        for sy in (-W_ * .32, W_ * .32):
            box('headl', (.15, 1.0, .45), (L_ / 2 + .05, sy, H_ * .5), emit_mat('headl2', (1, .97, .88), 5.), parent=e, shadow=False)
            box('taill', (.15, .9, .4), (-L_ / 2 - .05, sy, H_ * .5), emit_mat('taill2', (1, .08, .05), 3.), parent=e, shadow=False)
        box('plate', (.05, 1.6, .5), (-L_ / 2 - .3, 0, H_ * .3), WHITE(), parent=e)
        return e
    def streetlamp(x, y, rz=0, on=False, h=15.):
        e = empty('slamp', (x, y, 0), rot=(0, 0, rz)); blk = mat('lampblk2', (.07, .08, .09), .35, .7)
        obj('slbase', CYL, (0, 0, .6), (.6, .6, 1.2), m=blk, parent=e); obj('slpole', CYL8, (0, 0, h / 2), (.22, .22, h), m=blk, parent=e)
        box('slarm', (2.6, .25, .25), (1.2, 0, h - .2), blk, parent=e)
        obj('slhead', CONE, (2.4, 0, h - .55), (.9, .9, .7), (0, 0, 45), blk, e)
        obj('slbulb', SPH, (2.4, 0, h - .95), (.45, .45, .3), m=emit_mat('slbulb', (1, .85, .6), 25. if on else 1.5), parent=e, shadow=False)
        if on:
            L_ = light('slpt', 'POINT', (0, 0, 0), 2500, (1, .72, .45), .5); L_.parent = e; L_.location = (2.4, 0, h - 1.3)
        return e
    def traffic_light(x, y, rz=0, state='red'):
        e = empty('tl', (x, y, 0), rot=(0, 0, rz)); blk = mat('tlblk', (.12, .12, .13), .4, .5)
        obj('tlpole', CYL8, (0, 0, 7), (.25, .25, 14), m=blk, parent=e); box('tlbox', (1.3, 1.2, 3.6), (0, -.6, 12), blk, parent=e)
        for i, (c, nm) in enumerate((((1, .1, .05), 'red'), ((1, .7, .05), 'amber'), ((.1, 1, .3), 'green'))):
            on = nm == state
            obj('tllamp', CYL, (0, -1.25, 13.1 - i * 1.1), (.4, .4, .1), (90, 0, 0), emit_mat('tl_' + nm + str(on), c if on else tuple(v * .15 for v in c), 12. if on else .2), e, shadow=False)
            box('tlvisor', (1.0, .5, .1), (0, -1.45, 13.5 - i * 1.1), blk, parent=e)
        return e
    def hydrant(x, y):
        r_ = pm('red', .35); obj('hyd', CYL, (x, y, 1.0), (.55, .55, 2.0), m=r_); obj('hydt', SPH, (x, y, 2.0), (.6, .6, .45), m=r_)
        obj('hydn', CYL8, (x, y, 1.3), (.25, .25, 1.6), (90, 0, 0), r_); obj('hydc', CYL, (x, y, .1), (.75, .75, .2), m=r_)
    def bin2(x, y):
        g_ = mat('bingreen', (.08, .35, .2), .45, .3)
        obj('bin', CYL, (x, y, 1.5), (.95, .95, 3.0), m=g_); obj('binlid', CYL, (x, y, 3.05), (1.05, 1.05, .2), m=DARKM())
        for k in range(8):
            a_ = k * 45 * D2R; box('binrib', (.12, .12, 2.8), (x + math.cos(a_) * .97, y + math.sin(a_) * .97, 1.5), DARKM())
    def bench3(x, y, rz=0):
        e = empty('bench', (x, y, 0), rot=(0, 0, rz)); w_ = wood_mat('benchwood', (.55, .3, .14), 'XY', .4, 3., .5, False); blk = mat('lampblk2', (.07, .08, .09), .35, .7)
        for i in range(3): box('bslat', (5.2, .45, .18), (0, -.6 + i * .55, 1.7), w_, parent=e)
        for i in range(3): box('bback', (5.2, .18, .45), (0, .85, 2.3 + i * .55), w_, (12, 0, 0), parent=e)
        for sx in (-2.2, 2.2):
            box('bleg', (.2, 1.6, .2), (sx, 0, 1.55), blk, parent=e); box('blegv', (.2, .2, 1.6), (sx, -.6, .8), blk, parent=e); box('blegv', (.2, .2, 3.3), (sx, .8, 1.65), blk, parent=e)
        return e
    def tree2(x, y, s=1., grate=True, autumn=False):
        r_ = random.Random(int(x * 3 + y * 5)); h = 14 * s
        obj('trunk', CYL8, (x, y, h * .3), (.55 * s, .55 * s, h * .6), m=mat('trunk2', (.3, .18, .09), .9))
        cols = [(.16, .55, .16), (.22, .62, .18), (.12, .45, .14)] if not autumn else [(.9, .45, .1), (.95, .65, .15), (.75, .25, .08)]
        for k in range(7):
            sz = r_.uniform(.18, .27) * h
            obj('crown', SPH, (x + r_.uniform(-.25, .25) * h, y + r_.uniform(-.25, .25) * h, h * r_.uniform(.62, .9)), (sz, sz, sz * .85), m=mat('crown%d' % (k % 3 + autumn * 3), cols[k % 3], .8))
        if grate:
            box('grate', (3.4, 3.4, .12), (x, y, .52), mat('grate', (.12, .12, .12), .5, .6)); box('grateh', (1.4, 1.4, .14), (x, y, .53), mat('soil', (.2, .12, .06), .95))
    def sandwich_board(x, y, rz=0, txt='OPEN'):
        e = empty('aboard', (x, y, 0), rot=(0, 0, rz))
        for s_ in (-1, 1): box('abp', (2.2, .12, 3.2), (0, s_ * .55, 1.6), mat('chalkb', (.07, .12, .09), .9), (s_ * 12, 0, 0), parent=e)
        label(txt, (0, -.75, 2.0), .55, (1, 1, 1), (78, 0, 0), parent=e)
        return e
    def ac_unit(x, y, z, face):
        box('ac', (2.4, 1.6, 1.6), (x, y + face * .8, z), mat('acgrey', (.78, .78, .76), .5))
        obj('acfan', CYL, (x - .3, y + face * 1.62, z), (.55, .55, .05), (90, 0, 0), DARKM(), shadow=False)

    # ---------------------------------------------------------------- CITY: detailed building facades
    BWALLS = [((.72, .3, .2), 'brick'), ((.95, .86, .7), 'plaster'), ((.62, .2, .16), 'brick'), ((.86, .55, .32), 'plaster'), ((.92, .92, .88), 'plaster'),
              ((.55, .6, .72), 'plaster'), ((.82, .48, .3), 'brick'), ((.96, .78, .52), 'plaster'), ((.58, .7, .55), 'plaster')]
    SHOPS = ['CAFE', 'BAKERY', 'SHOES', 'ICE CREAM', 'BOOKS', 'PHONES', 'PIZZA', 'FLOWERS', 'CITY BANK', 'GAMES', 'TOYS', 'DINER', 'MARKET', 'BURGERS']
    AWN = [((.9, .12, .12), (1, 1, 1)), ((.1, .45, .85), (1, 1, 1)), ((.1, .55, .25), (1, .95, .85)), ((.95, .6, .1), (1, 1, 1)), ((.15, .7, .75), (1, 1, 1)), ((.2, .2, .22), (.9, .8, .3))]
    def building2(x, y, width, floors, face=-1, seed=0, night=False, sign=None, depth=16., style=None):
        """detailed building whose front face sits at y and faces face*Y. x = centre."""
        r_ = random.Random(seed); FH = 10.; H = 13. + (floors - 1) * FH
        wc, kind = BWALLS[r_.randrange(len(BWALLS))] if style is None else BWALLS[style]
        wm = brick_mat('bw_%d' % (seed % 97), wc, 'XZ') if kind == 'brick' else plaster_mat('pw_%d' % (seed % 97), wc, 'XZ')
        wms = brick_mat('bws_%d' % (seed % 97), wc, 'YZ') if kind == 'brick' else plaster_mat('pws_%d' % (seed % 97), wc, 'YZ')
        trim = pm(r_.choice(['white', 'cream', 'white']), .5)
        cy = y - face * depth / 2
        sh = 11.; RD = 5.
        box('bfront', (width, .1, H - sh), (x, y + face * .01, sh + (H - sh) / 2), wm); box('bbody', (width - .1, depth, H - sh), (x, cy, sh + (H - sh) / 2), wms)
        box('bgbody', (width - .1, depth - RD, sh), (x, y - face * (RD + (depth - RD) / 2), sh / 2), wms)
        for sx_ in (-1, 1): box('bpier', (1.2, RD, sh), (x + sx_ * (width / 2 - .6), y - face * RD / 2, sh / 2), wm)
        # cornice + parapet + dentils
        box('cornice', (width + 1.2, 1.4, 1.0), (x, y + face * .5, H + .2), trim); box('parapet', (width, depth, 1.6), (x, cy, H + 1.3), wms)
        for k in range(int(width / 1.2)):
            box('dentil', (.5, .5, .5), (x - width / 2 + .6 + k * 1.2, y + face * .25, H - .55), trim, shadow=False)
        # ground floor storefront
        box('gfband', (width + .3, .8, 1.0), (x, y + face * .4, sh + .5), trim)
        for k in range(1, floors):
            box('band', (width + .1, .5, .5), (x, y + face * .25, sh + 1 + (k - 1) * FH + FH), trim, shadow=False) if k < floors - 1 else None
        g = glass_mat('shopglass2', (.28, .42, .5)); gn = glass_mat('shopglassN', (.4, .35, .25), True)
        sw = width - 2.4 - 4.6; sx0 = x - width / 2 + 1.2
        box('kick', (sw, .5, 1.6), (sx0 + sw / 2, y + face * .25, .8), DARKM())
        box('shopwin', (sw, .2, 6.6), (sx0 + sw / 2, y + face * .1, 4.9), gn if night or r_.random() < .3 else g, shadow=False)
        nm_ = int(sw / 3.5)
        for k in range(nm_ + 1): box('mull', (.25, .4, 6.8), (sx0 + k * sw / nm_, y + face * .25, 4.9), DARKM())
        box('transom', (sw, .4, .25), (sx0 + sw / 2, y + face * .25, 6.4), DARKM())
        # interior hint: shelves + warm light behind the glass
        box('shopceil', (width - 2.4, RD, .3), (x, y - face * RD / 2, sh - .15), WHITE())
        box('shopfloor', (width - 2.4, RD, .1), (x, y - face * RD / 2, .05), tile_mat('shopfl', (.9, .88, .82), (.6, .3, .25), 1.6, .15))
        light('shop_l', 'POINT', (x, y - face * RD / 2, sh - 1.2), 120 if not night else 500, (1, .78, .5), 1.)
        box('shopback', (width - 2.4, .2, sh), (x, y - face * (RD - .1), sh / 2), mat('shopin_%d' % (seed % 5), r_.choice([(.75, .6, .42), (.55, .45, .38), (.7, .55, .45)]), .8))
        for k in range(3): box('shopshelf', (sw * .9, 1.2, .2), (sx0 + sw / 2, y - face * (RD - .8), 2.5 + k * 1.6), wood_mat('shelfw', (.5, .32, .18), 'XY', .5, 3., .6, False))
        for k in range(int(sw / 1.2)):
            box('goods', (.6, .6, .8), (sx0 + .6 + k * 1.2, y - face * (RD - .8), 3.0 + (k % 3) * 1.6), pm(r_.choice(['red', 'yellow', 'blue', 'green', 'orange', 'pink']), .5), shadow=False)
        # door
        dx = x + width / 2 - 1.2 - 2.3
        box('doorfr', (4.6, .5, 8.8), (dx, y + face * .2, 4.4), DARKM())
        box('doorgl', (3.4, .1, 7.6), (dx, y + face * .35, 4.0), g, shadow=False); box('doorbar', (2.6, .3, .2), (dx, y + face * .55, 4.2), METAL())
        box('doormat', (4, 2, .06), (dx, y + face * 1.2, .53), mat('doormatm', (.3, .15, .1), .95), shadow=False)
        if r_.random() < .6: pot_plant(dx + face * 0 + 2.8, y + face * 1.2, .5, 1.1, seed)
        # awning (striped, sloped) + valance
        ac, ac2 = AWN[r_.randrange(len(AWN))]
        am = stripe_mat('awn_%d' % (seed % 6), ac, ac2, 1.0, 'XY', 0, .75)
        box('awning', (width * .86, 4.2, .2), (x, y + face * 2.0, 9.0), am, (face * -20, 0, 0))
        box('valance', (width * .86, .15, .9), (x, y + face * 3.95, 7.9), am)
        # sign board
        txt = sign or SHOPS[r_.randrange(len(SHOPS))]
        sb = r_.choice([(.1, .15, .3), (.95, .9, .8), (.15, .3, .2), (.5, .1, .1)])
        box('signb', (min(width * .7, len(txt) * 1.25 + 2.5), .4, 2.0), (x, y + face * .4, 12.3), mat('signb_%d' % (seed % 4), sb, .5))
        light_txt = (1, .95, .8) if sum(sb) < 1.5 else (.15, .1, .08)
        label(txt, (x, y + face * .65, 12.3), 1.4, light_txt, (90, 0, 0 if face < 0 else 180), 2.5 if (night and sum(sb) < 1.5) else 0., extrude=.08)
        # upper floors: windows with frames, sills, shutters / flower boxes, balconies, AC units
        nw = max(2, int(width / 6.5)); wstyle = r_.choice(['tall', 'tall', 'arch', 'wide']); shut = r_.random() < .45
        shc = pm(r_.choice(['green', 'blue', 'teal', 'brick', 'white']), .55); balc = r_.random() < .55
        for fl in range(1, floors):
            zc = sh + 1 + (fl - 1) * FH + FH / 2 + .5
            for k in range(nw):
                wx = x - width / 2 + (k + .5) * width / nw
                ww = 2.8 if wstyle != 'wide' else 3.8; wh = 5.0
                lit = night and r_.random() < .6
                gm = glass_mat('wing_%s' % ('n' if lit else 'd'), (.3, .45, .58) if not lit else (.5, .4, .25), lit)
                box('wrecess', (ww + .4, .4, wh + .4), (x if False else wx, y + face * .05, zc), DARKM(), shadow=False)
                box('wglass', (ww, .1, wh), (wx, y + face * .2, zc), gm, shadow=False)
                box('wframeT', (ww + 1., .5, .5), (wx, y + face * .3, zc + wh / 2 + .3), trim)
                box('wsill', (ww + 1.2, 1.0, .35), (wx, y + face * .45, zc - wh / 2 - .2), trim)
                for sx_ in (-1, 1): box('wframeS', (.3, .45, wh), (wx + sx_ * (ww / 2 + .1), y + face * .3, zc), trim, shadow=False)
                box('wmull', (.18, .4, wh), (wx, y + face * .3, zc), trim, shadow=False); box('wmullh', (ww, .4, .18), (wx, y + face * .3, zc + .6), trim, shadow=False)
                if wstyle == 'arch': obj('warch', CYL, (wx, y + face * .3, zc + wh / 2 + .3), (ww / 2 + .4, ww / 2 + .4, .5), (90, 0, 0), trim)
                if shut and not balc:
                    for sx_ in (-1, 1): box('shutter', (1.4, .25, wh), (wx + sx_ * (ww / 2 + .95), y + face * .3, zc), shc)
                if (k + fl) % 3 == 0 and not balc:
                    box('fbox', (ww + .6, .9, .7), (wx, y + face * .8, zc - wh / 2 + .1), pm('brick', .8))
                    for j in range(5): obj('fl', SPH, (wx - ww / 2 + .3 + j * ww / 4.5, y + face * .85, zc - wh / 2 + .6), (.35, .35, .3), m=pm(r_.choice(['pink', 'red', 'yellow', 'white', 'purple']), .6), shadow=False)
                if r_.random() < .12: ac_unit(wx, y, zc - wh / 2 - 1.2, face)
            if balc and fl % 1 == 0:
                bw_ = width * .8; blk = mat('railblk', (.06, .06, .07), .35, .6)
                box('balslab', (bw_, 2.6, .35), (x, y + face * 1.3, zc - 3.1), trim)
                box('balrail', (bw_, .12, .12), (x, y + face * 2.5, zc - 1.0), blk)
                for j in range(int(bw_ / .55)): box('balpost', (.08, .08, 2.0), (x - bw_ / 2 + j * .55, y + face * 2.5, zc - 2.0), blk, shadow=False)
                for sx_ in (-1, 1):
                    box('balrails', (.12, 2.4, .12), (x + sx_ * bw_ / 2, y + face * 1.3, zc - 1.0), blk)
                if r_.random() < .5: pot_plant(x + bw_ * .35, y + face * 1.6, zc - 2.9, .6, seed + fl)
        # rooftop clutter
        for k in range(r_.randint(1, 3)):
            box('roofbox', (r_.uniform(2, 4), r_.uniform(2, 4), r_.uniform(1.5, 3)), (x + r_.uniform(-width / 3, width / 3), cy + r_.uniform(-3, 3), H + 2), mat('roofgrey', (.6, .6, .6), .7))
        return H
    def city_street(ox, oy, length=180, night=False, wet=0., seed=3, signs=None):
        """street along X centred at (ox, oy): road, sidewalks, crosswalk, buildings both sides, props"""
        LW = 22.; SW = 11.
        box('road', (length, LW, .2), (ox, oy, -.1), asphalt_mat('asph_%d' % int(wet * 10), wet))
        for k in range(int(length / 8)):
            box('lane', (4, .35, .03), (ox - length / 2 + 4 + k * 8, oy, .02), mat('laneyel', (.95, .8, .2), .6), shadow=False)
        for k in range(9): box('zebra', (1.6, LW - 2, .03), (ox + 14 + k * 3.0, oy, .02), WHITE(), shadow=False)
        obj('manhole', CYL, (ox - 14, oy - 3, .01), (1.3, 1.3, .04), m=mat('manh', (.15, .15, .15), .4, .8), shadow=False)
        for s in (-1, 1):
            yc = oy + s * (LW / 2 + SW / 2)
            box('sidewalk', (length, SW, .5), (ox, yc, .25), paver_mat('paver_%d' % int(wet * 10), wet=wet))
            box('curb', (length, .6, .55), (ox, oy + s * (LW / 2 + .3), .27), mat('curb', (.7, .7, .68), .6))
            yf = oy + s * (LW / 2 + SW)
            x = ox - length / 2; i = 0
            while x < ox + length / 2:
                w = random.Random(seed * 100 + i * 7 + s).choice([16, 18, 20, 22, 24])
                fl = random.Random(seed * 50 + i * 3 + s).choice([3, 4, 4, 5, 6])
                sg = signs.pop(0) if signs else None
                building2(x + w / 2, yf, w, fl, -1 if s > 0 else 1, seed * 31 + i * 7 + (s > 0) * 3, night, sg)
                x += w + .3; i += 1
            # props along the sidewalk edge
            r_ = random.Random(seed + s)
            for k in range(int(length / 30)):
                px = ox - length / 2 + 10 + k * 30
                streetlamp(px, oy + s * (LW / 2 + 1.6), 90 if s < 0 else -90, night)
                tree2(px + 15, oy + s * (LW / 2 + 2.2), r_.uniform(.8, 1.05))
                if k % 2 == 0: bench3(px + 7, oy + s * (LW / 2 + SW - 3.5), 0 if s > 0 else 180)
                if k % 3 == 1: hydrant(px + 4, oy + s * (LW / 2 + 1.4))
                if k % 3 == 2: bin2(px + 4, oy + s * (LW / 2 + 1.6))
                if k % 4 == 3: sandwich_board(px + 10, oy + s * (LW / 2 + SW - 2.5), 0, r_.choice(['OPEN', 'SALE', 'COFFEE']))
                for j in range(2): obj('bollard', CYL8, (px + 22 + j * 2, oy + s * (LW / 2 + 1.2), .8), (.3, .3, 1.6), m=DARKM())
                if k % 2 == 1: pot_plant(px + 12, oy + s * (LW / 2 + SW - 1.5), .5, 1.2, k)
            # parked cars
            for k in range(int(length / 45)):
                car2(ox - length / 2 + 25 + k * 45 + r_.uniform(-5, 5), oy + s * (LW / 2 - 3.5), 0 if s < 0 else 180, r_.choice(['red', 'blue', 'white', 'yellow', 'teal', 'orange']))
        traffic_light(ox + 12, oy - LW / 2 - 1.5, 0, 'red'); traffic_light(ox + 28, oy + LW / 2 + 1.5, 180, 'green')
        # bunting + string lights across the street
        for k in range(3):
            bx = ox - 30 + k * 30
            bunting((bx, oy - LW / 2 - SW + .5, 15), (bx + 8, oy + LW / 2 + SW - .5, 15), 2.5, 22, k)
        if night:
            for k in range(3):
                bx = ox - 15 + k * 30; fairy_lights((bx, oy - LW / 2 - SW + .5, 17), (bx - 6, oy + LW / 2 + SW - .5, 17), 3.0, 40)

    # ---------------------------------------------------------------- SCHOOL HALLWAY
    def locker_bank(x0, y, n, face, col=(.15, .45, .8), seed=0):
        """row of lockers along X starting at x0, against the wall plane y, fronts facing face*Y"""
        lm = mat('locker_%d_%d_%d' % tuple(int(c * 99) for c in col), col, .35, .55); vent = DARKM(); r_ = random.Random(seed)
        for i in range(n):
            lx = x0 + i * 2.2 + 1.1
            box('locker', (2.1, 2.2, 8.4), (lx, y + face * 1.1, 4.6), lm)
            for v_ in range(4): box('lvent', (1.2, .05, .12), (lx, y + face * 2.22, 7.6 + v_ * .25), vent, shadow=False)
            box('lhandle', (.15, .2, .7), (lx + .65, y + face * 2.25, 4.6), METAL())
            box('lplate', (.6, .04, .3), (lx, y + face * 2.22, 6.8), METAL(), shadow=False)
            if r_.random() < .15: box('lsticker', (.6, .04, .6), (lx - .2, y + face * 2.23, 5.5), pm(r_.choice(['yellow', 'pink', 'lime']), .6), (0, r_.uniform(-20, 20), 0), shadow=False)
        box('lbase', (n * 2.2, 2.0, .4), (x0 + n * 1.1, y + face * 1.0, .2), DARKM()); box('ltop', (n * 2.2, 2.2, .3), (x0 + n * 1.1, y + face * 1.1, 8.95), lm)
    def _rz(face): return 0 if face < 0 else 180
    def class_door(x, y, face, num='104'):
        wd = wood_mat('doorwood', (.6, .4, .22), 'XZ', 1.6, 20., .45, False)
        box('dframe', (4.6, .4, 9.0), (x, y + face * .1, 4.5), WHITE()); box('door', (4.0, .3, 8.4), (x, y + face * .25, 4.2), wd)
        box('dwin', (1.2, .1, 2.6), (x - .8, y + face * .42, 5.8), glass_mat('doorglass', (.45, .6, .7)), shadow=False)
        box('dknob', (.3, .3, .3), (x + 1.5, y + face * .55, 4.0), METAL())
        box('dsign', (1.8, .1, .8), (x, y + face * .3, 9.7), WHITE()); label(num, (x, y + face * .38, 9.7), .5, (.1, .1, .15), (90, 0, _rz(face)))
    def bulletin(x, y, z, w, h, face, seed=0):
        r_ = random.Random(seed)
        box('bbframe', (w + .4, .3, h + .4), (x, y + face * .15, z), wood_mat('bbfr', (.45, .28, .14), 'XZ', .5, 3., .5, False))
        box('cork', (w, .3, h), (x, y + face * .3, z), mat('cork', (.72, .52, .3), .95))
        for k in range(int(w * h / 2.2)):
            px = x + r_.uniform(-w / 2 + .6, w / 2 - .6); pz = z + r_.uniform(-h / 2 + .6, h / 2 - .6)
            box('paper', (r_.uniform(.8, 1.4), .04, r_.uniform(1, 1.5)), (px, y + face * .48, pz), pm(r_.choice(['white', 'yellow', 'pink', 'sky', 'mint', 'white']), .8), (0, r_.uniform(-8, 8), 0), shadow=False)
            obj('pin', SPH, (px, y + face * .53, pz + .5), (.1, .1, .1), m=pm(r_.choice(['red', 'blue', 'green']), .3), shadow=False)
    def trophy_case(x, y, face):
        wd = wood_mat('tcw', (.4, .22, .1), 'XZ', .5, 3., .4)
        box('tcbase', (8, 2.4, 3), (x, y + face * 1.2, 1.5), wd); box('tcglass', (8, 2.2, 5), (x, y + face * 1.1, 5.5), glass_mat('tcg', (.6, .7, .75)), shadow=False)
        box('tctop', (8.2, 2.5, .4), (x, y + face * 1.2, 8.2), wd)
        gold = mat('gold', (1, .75, .25), .25, 1.)
        for i in range(4):
            tx = x - 3 + i * 2; obj('cupb', CYL, (tx, y + face * 1.1, 3.4), (.35, .35, .5), m=gold); obj('cup', CONE, (tx, y + face * 1.1, 4.4), (.6, .6, -1.2), m=gold)
            obj('cupst', CYL8, (tx, y + face * 1.1, 3.8), (.12, .12, .6), m=gold)
    def school_hallway(ox, oy, length=90, width=20., h=13., banner='SPIRIT WEEK!'):
        """corridor along X (ox-length/2 .. ox+length/2), walls at oy±width/2"""
        box('hfloor', (length, width, .2), (ox, oy, -.1), tile_mat('hallcheck', (.92, .9, .84), (.25, .32, .45), 2.6, .08))
        box('hceil', (length, width, .3), (ox, oy, h + .15), ceiltile_mat('hallceil'))
        lower = plaster_mat('hallwall_lo', (.25, .42, .62), 'XZ'); upper = plaster_mat('hallwall_up', (.96, .93, .84), 'XZ')
        for s in (-1, 1):
            yw = oy + s * (width / 2 + .3)
            box('hwall_lo', (length, .6, 4.8), (ox, yw, 2.4), lower); box('hwall_up', (length, .6, h - 4.8), (ox, yw, 4.8 + (h - 4.8) / 2), upper)
            box('hstripe', (length, .7, .4), (ox, yw, 4.9), pm('yellow', .5))
        box('hend', (.6, width + 1, h), (ox + length / 2 + .3, oy, h / 2), plaster_mat('hallend', (.96, .93, .84), 'YZ'))
        cols = [(.15, .45, .8), (.85, .2, .2)]
        for s in (-1, 1):
            yw = oy + s * width / 2; face = -s
            items = [('lock', 6), ('door', 0), ('lock', 5), ('board', 0), ('lock', 6), ('door', 0), ('lock', 4), ('fount', 0), ('lock', 6), ('door', 0), ('lock', 6)] if s > 0 else \
                    [('lock', 5), ('trophy', 0), ('lock', 6), ('door', 0), ('lock', 6), ('board', 0), ('lock', 5), ('door', 0), ('lock', 5), ('board', 0), ('lock', 6)]
            x_ = ox - length / 2 + 2
            for it, n in items:
                if x_ > ox + length / 2 - 6: break
                if it == 'lock': locker_bank(x_, yw, n, face, cols[(s + 1) // 2], int(x_)); x_ += n * 2.2 + .8
                elif it == 'door': class_door(x_ + 2.4, yw, face, str(100 + int(abs(x_)) % 40)); x_ += 5.6
                elif it == 'board': bulletin(x_ + 3.5, yw, 6.4, 6.5, 3.6, face, int(x_)); x_ += 7.6
                elif it == 'trophy': trophy_case(x_ + 4.1, yw, face); x_ += 8.8
                elif it == 'fount':
                    box('fountain', (2, 1.6, 1.0), (x_ + 1.2, yw + face * .8, 3.6), METAL()); box('fntleg', (.6, .6, 3.2), (x_ + 1.2, yw + face * .4, 1.6), METAL()); x_ += 3.0
            for k in range(2): poster(ox - 10 + k * 26, yw + face * .1, 10.2, 2.0, 2.4, _rz(face), k + 11 + s * 5)
        for k in range(int(length / 10)):
            lx = ox - length / 2 + 5 + k * 10
            box('lpanel', (2.2, 4.2, .12), (lx, oy, h - .06), emit_mat('lpanelm', (1, .95, .86), 5.), shadow=False)
            light('hall_l', 'AREA', (lx, oy, h - .4), 420, (1, .9, .78), 3.)
        bx = ox + length * .15
        box('banner', (.15, width * .7, 2.0), (bx, oy, h - 2.2), mat('bannerb', (.12, .25, .7), .6)); label(banner, (bx - .12, oy, h - 2.2), 1.2, (1, .9, .2), (90, 0, -90))
        bunting((ox + length * .02, oy - width / 2, h - .8), (ox + length * .02, oy + width / 2, h - .8), 1.2, 12, 5, .7)
        bunting((ox + length * .3, oy - width / 2, h - .8), (ox + length * .3, oy + width / 2, h - .8), 1.2, 12, 6, .7)
        box('exitsign', (.4, 2.2, .8), (ox + length / 2 - .2, oy, h - 1.4), emit_mat('exitg', (.1, 1, .3), 6.), shadow=False)
        wall_clock(ox + length / 2 - .1, oy + 5, h - 3.6, -90)
        box('fireext', (.6, .6, 1.6), (ox - 5, oy - width / 2 + .5, 3), pm('red', .3))

    # ---------------------------------------------------------------- CLASSROOM
    def desk2(x, y, rz=0, seed=0):
        r_ = random.Random(seed); e = empty('desk', (x, y, 0), rot=(0, 0, rz))
        box('dtop', (4.2, 2.8, .25), (0, 0, 3.0), wood_mat('desktop', (.78, .58, .36), 'XY', .7, 4., .4), parent=e)
        box('dbox', (3.8, 2.2, .9), (0, .1, 2.45), mat('deskbox', (.3, .32, .35), .5, .5), parent=e)
        for sx in (-1.9, 1.9):
            for sy in (-1.2, 1.2): box('dleg', (.18, .18, 2.9), (sx, sy, 1.45), METAL(), parent=e)
        if r_.random() < .7: box('dbook', (1.2, 1.6, .18), (r_.uniform(-1, 1), r_.uniform(-.4, .4), 3.22), pm(r_.choice(['red', 'blue', 'green', 'yellow']), .6), (0, 0, r_.uniform(-25, 25)), parent=e)
        if r_.random() < .6: box('dpaper', (1.3, 1.8, .03), (r_.uniform(-1, 1), r_.uniform(-.4, .4), 3.14), WHITE(), (0, 0, r_.uniform(-15, 15)), parent=e)
        if r_.random() < .5: obj('dpencil', CYL8, (r_.uniform(-1.2, 1.2), r_.uniform(-.6, .6), 3.18), (.06, .06, 1.1), (90, 0, r_.uniform(0, 180)), pm('yellow', .5), e)
        return e
    def chair2(x, y, rz=0, col='blue'):
        e = empty('chair', (x, y, 0), rot=(0, 0, rz)); p_ = pm(col, .4)
        box('cseat', (1.9, 1.8, .2), (0, 0, 1.6), p_, parent=e); box('cback', (1.9, .2, 1.4), (0, .95, 2.9), p_, (8, 0, 0), parent=e)
        for sx in (-.8, .8):
            for sy in (-.75, .75): box('cleg', (.14, .14, 1.55), (sx, sy, .78), METAL(), parent=e)
            box('cbk', (.12, .12, 1.4), (sx, .9, 2.2), METAL(), parent=e)
        return e
    def backpack(x, y, z=0., rz=0, col='red'):
        e = empty('bag', (x, y, z), rot=(0, 0, rz)); p_ = pm(col, .7)
        box('bagb', (1.4, .8, 1.8), (0, 0, .9), p_, parent=e); box('bagp', (1.0, .4, .8), (0, -.55, .6), p_, parent=e)
        obj('bagtop', CYL, (0, 0, 1.8), (.7, .4, .4), (0, 90, 0), p_, e); return e
    def classroom2(ox, oy, w=40., d=34., h=13., board_txt='Today: Fractions  1/2 + 1/4 = ?', sun=True):
        """room centred at ox,oy; board on the +Y wall (students face +Y); windows on +X wall"""
        box('cfloor', (w, d, .2), (ox, oy, -.1), wood_mat('classfloor', (.66, .45, .25), 'XY', 1.1, 8., .3))
        box('cceil', (w, d, .3), (ox, oy, h + .15), ceiltile_mat('classceil'))
        wy = plaster_mat('classwall_y', (.97, .92, .78), 'XZ'); wx = plaster_mat('classwall_x', (.97, .92, .78), 'YZ')
        lowy = wood_mat('wainscot_y', (.55, .36, .2), 'XZ', .9, 30., .5, False); lowx = wood_mat('wainscot_x', (.55, .36, .2), 'YZ', .9, 30., .5, False)
        for s in (-1, 1):
            box('cwall_y', (w + 1.2, .6, h), (ox, oy + s * (d / 2 + .3), h / 2), wy); box('cwain_y', (w, .2, 3.4), (ox, oy + s * (d / 2 - .05), 1.7), lowy)
        box('cwall_xL', (.6, d, h), (ox - w / 2 - .3, oy, h / 2), wx); box('cwain_xL', (.2, d, 3.4), (ox - w / 2 + .05, oy, 1.7), lowx)
        # window wall (+X) with 3 windows + blinds
        xw = ox + w / 2 + .3
        box('cwin_lo', (.6, d, 3.8), (xw, oy, 1.9), wx); box('cwin_hi', (.6, d, 2.2), (xw, oy, h - 1.1), wx)
        g = glass_mat('classglass', (.6, .8, .95))
        for k in range(4):
            box('cpier', (.6, (d - 3 * 7.5) / 4, h - 6), (xw, oy - d / 2 + (k + .5) * (d - 3 * 7.5) / 4 + k * 7.5, 3.8 + (h - 6) / 2), wx)
        for k in range(3):
            wyc = oy - d / 2 + (d - 3 * 7.5) / 4 * (k + 1) + 7.5 * k + 3.75
            box('cwglass', (.1, 7.5, h - 6), (xw + .2, wyc, 3.8 + (h - 6) / 2), g, shadow=False)
            box('cwsill', (1.4, 7.9, .3), (xw - .4, wyc, 3.85), WHITE())
            for j in range(9): box('blind', (.06, 7.4, .35), (xw - .5, wyc, h - 2.6 - j * .42), mat('blindm', (.95, .93, .88), .6), (0, 55, 0))
            box('cwframe', (.5, .3, h - 6), (xw - .1, wyc, 3.8 + (h - 6) / 2), WHITE())
            for j in range(2): pot_plant(xw - .8, wyc - 2 + j * 4, 4.0, .5, k * 3 + j)
        # outside: bright sky card + trees
        box('outside', (.2, d * 3, h * 3), (xw + 30, oy, h), mat('outsky', (.55, .78, 1), .5, 0, (.55, .78, 1.), 2.5), shadow=False)
        for k in range(4): tree2(xw + 14, oy - d / 2 + k * 11, 1.0, False)
        # chalkboard
        by = oy + d / 2 - .1
        box('cbframe', (20, .4, 8.4), (ox, by, 7.2), wood_mat('cbfr', (.5, .3, .15), 'XZ', .5, 3., .4))
        box('cboard', (19, .4, 7.4), (ox, by - .1, 7.2), mat('chalkboard', (.08, .2, .14), .85))
        box('ctray', (19, .9, .2), (ox, by - .5, 3.4), wood_mat('cbfr', (.5, .3, .15), 'XZ', .5, 3., .4))
        label(board_txt, (ox, by - .35, 8.6), .75, (.95, .95, .92), (90, 0, 0), extrude=.005)
        label('A  B  C', (ox - 6, by - .35, 6.4), .9, (1, .9, .4), (90, 0, 0), extrude=.005)
        for k in range(4): box('chalk', (.5, .15, .15), (ox - 6 + k * 1.2, by - .55, 3.6), pm(['white', 'yellow', 'pink', 'sky'][k], .8))
        # alphabet strip + posters + clock + flag
        for k in range(10): box('abc', (1.6, .1, 1.2), (ox - w / 2 + 3 + k * 1.9, by - .1, h - 1.0), pm(['red', 'blue', 'yellow', 'green', 'orange'][k % 5], .6))
        for k in range(3): poster(ox - w / 2 + .45, oy - d / 2 + 7 + k * 9, 7.5, 3.2, 4.2, 90, k + 1)
        wall_clock(ox + 13, by - .2, 10.5, 0)
        obj('flagpole', CYL8, (ox + w / 2 - 3, by - 1.2, 7), (.1, .1, 6), (20, 0, 0), METAL()); box('flagc', (2.6, .05, 1.6), (ox + w / 2 - 2.2, by - 1.6, 9.2), stripe_mat('flagm', (.9, .1, .1), (.95, .95, .95), .4, 'XZ', 1))
        # teacher desk with props
        tdx, tdy = ox - 8, by - 6
        box('tdesk', (7, 3.4, .3), (tdx, tdy, 3.2), wood_mat('tdeskw', (.45, .26, .12), 'XY', .7, 4., .35))
        box('tdeskb', (6.6, 3.0, 3.0), (tdx, tdy, 1.6), wood_mat('tdeskw', (.45, .26, .12), 'XY', .7, 4., .35))
        obj('apple', SPH, (tdx + 2.4, tdy - .6, 3.7), (.4, .4, .38), m=pm('red', .25)); box('appst', (.06, .06, .3), (tdx + 2.4, tdy - .6, 4.1), mat('trunk2', (.3, .18, .09), .9))
        obj('globeb', CYL, (tdx - 2.4, tdy, 3.5), (.4, .4, .2), m=METAL()); obj('globe', SPH, (tdx - 2.4, tdy, 4.6), (.9, .9, .9), m=stripe_mat('globem', (.2, .5, .95), (.3, .75, .3), .5, 'XZ', 1, .4))
        books_row(tdx, tdy + 1.0, 3.35, 2.4, 0, 9, .9, 1.0); obj('mug', CYL, (tdx + 1, tdy - .8, 3.75), (.3, .3, .7), m=pm('yellow', .3))
        # bookshelf on the left wall
        bx = ox - w / 2 + 1.2; shw = wood_mat('shelfw2', (.55, .35, .18), 'YZ', .5, 3., .5, False)
        box('bshelf', (2.2, 12, 8), (bx, oy - 6, 4), shw)
        for k in range(4): books_row(bx - .2, oy - 6, .6 + k * 1.9, 11, 90, 20 + k, 1.6, 1.4)
        # cubbies with backpacks on the back wall
        cy_ = oy - d / 2 + 1.2
        for k in range(6):
            box('cubby', (2.6, 2.2, 2.6), (ox - 8 + k * 2.8, cy_, 1.3), wood_mat('cubw', (.85, .7, .5), 'XY', .5, 3., .5, False))
            backpack(ox - 8 + k * 2.8, cy_ - .2, 2.6, 180, ['red', 'blue', 'yellow', 'green', 'purple', 'orange'][k])
        # student desks + chairs grid (students face +Y)
        sd = []
        for row in range(3):
            for colm in range(4):
                dx = ox - 13 + colm * 8.6; dy = oy + 4 - row * 7.5
                desk2(dx, dy, 0, row * 4 + colm); chair2(dx, dy - 2.4, 0, ['blue', 'red', 'green', 'orange'][(row + colm) % 4]); sd.append((dx, dy - 2.4))
        for k in range(3):
            box('clight', (6, 2, .15), (ox - 10 + k * 10, oy, h - .1), emit_mat('lpanelm', (1, .95, .86), 5.), shadow=False)
            light('class_l', 'AREA', (ox - 10 + k * 10, oy, h - .5), 380, (1, .9, .78), 4.)
        if sun:
            s_ = light('class_sun', 'SPOT', (xw + 14, oy - 4, h - 1.5), 60000, (1, .8, .55), .05)
            s_.data.spot_size = 50 * D2R; s_.rotation_mode = 'QUATERNION'; s_.rotation_quaternion = (Vector((ox - 4, oy + 2, 0)) - s_.location).to_track_quat('-Z', 'Y')
        return sd

    # ---------------------------------------------------------------- HOSPITAL ROOM
    def hospital_room(ox, oy, w=32., d=28., h=12.5):
        """bed against the +Y wall, head at +Y; window on -X wall"""
        box('hfloor2', (w, d, .2), (ox, oy, -.1), tile_mat('hospfloor', (.82, .8, .74), (.62, .66, .64), 2.2, .12))
        box('hceil2', (w, d, .3), (ox, oy, h + .15), ceiltile_mat('hospceil'))
        wy = plaster_mat('hospwall_y', (.9, .84, .72), 'XZ'); wx = plaster_mat('hospwall_x', (.9, .84, .72), 'YZ')
        for s in (-1, 1): box('hw_y', (w + 1.2, .6, h), (ox, oy + s * (d / 2 + .3), h / 2), wy)
        box('hw_xR', (.6, d, h), (ox + w / 2 + .3, oy, h / 2), wx)
        box('hstripe_y', (w, .3, .6), (ox, oy + d / 2 - .1, 3.6), mat('hstripe', (.3, .65, .7), .5)); box('hstripe_x', (.3, d, .6), (ox + w / 2 - .1, oy, 3.6), mat('hstripe', (.3, .65, .7), .5))
        # window wall (-X) with blinds
        xw = ox - w / 2 - .3; box('hw_xlo', (.6, d, 3.5), (xw, oy, 1.75), wx); box('hw_xhi', (.6, d, 2.5), (xw, oy, h - 1.25), wx)
        for s in (-1, 1): box('hw_xside', (.6, 7, h - 6), (xw, oy + s * (d / 2 - 3.5), 3.5 + (h - 6) / 2), wx)
        box('hglass', (.1, d - 14, h - 6), (xw - .2, oy, 3.5 + (h - 6) / 2), glass_mat('hospglass', (.7, .85, .95)), shadow=False)
        for j in range(10): box('hblind', (.05, d - 14.4, .4), (xw + .5, oy, h - 2.8 - j * .5), mat('blindm', (.95, .93, .88), .6), (0, -60, 0))
        box('hout', (.2, d * 3, h * 3), (xw - 25, oy, h), mat('outsky', (.55, .78, 1), .5, 0, (.55, .78, 1.), 2.5), shadow=False)
        # headwall panel with outlets + light
        hy = oy + d / 2 - .1
        box('headwall', (12, .4, 2.0), (ox, hy - .2, 6.5), mat('headwallm', (.8, .85, .86), .4, .3))
        for k in range(5): box('outlet', (.5, .1, .5), (ox - 4 + k * 2, hy - .45, 6.5), WHITE() if k % 2 else pm('teal', .4))
        box('bedlamp', (5, .5, .3), (ox, hy - .4, 7.6), emit_mat('bedlampm', (1, .95, .85), 5.), shadow=False)
        # bed
        bx, by = ox, hy - 7.5; frame = mat('bedframe', (.85, .87, .88), .3, .6)
        box('bbase', (5.6, 12, .8), (bx, by, 2.4), frame)
        for sx in (-2.4, 2.4):
            for sy in (-5.5, 5.5): obj('bwheel', CYL, (bx + sx, by + sy, .4), (.4, .4, .3), (0, 90, 0), DARKM()); box('bleg', (.3, .3, 1.8), (bx + sx, by + sy, 1.2), frame)
        box('mattress', (5.2, 11.6, .9), (bx, by, 3.25), WHITE())
        box('blanket', (5.5, 8.0, .35), (bx, by - 1.8, 3.8), polka_mat('blanketm', (.55, .75, .92), (.95, .97, 1), .9, 'XY'))
        box('blanketfold', (5.5, 1.0, .45), (bx, by + 2.1, 3.9), WHITE())
        box('pillow', (3.8, 2.2, .9), (bx, by + 4.6, 4.1), WHITE(), (12, 0, 0))
        box('bhead', (5.8, .4, 3.6), (bx, by + 6.1, 4.0), frame); box('bfoot', (5.8, .4, 2.6), (bx, by - 6.1, 3.5), frame)
        for s in (-1, 1):
            box('rail', (.15, 5.5, .15), (bx + s * 2.9, by + 2, 4.8), frame)
            for j in range(4): box('railv', (.12, .12, 1.4), (bx + s * 2.9, by + .2 + j * 1.2, 4.1), frame)
        # IV stand
        ivx, ivy = bx - 4.6, by + 3
        obj('ivbase', CYL, (ivx, ivy, .2), (1, 1, .2), m=frame); obj('ivpole', CYL8, (ivx, ivy, 5), (.1, .1, 10), m=frame)
        box('ivhook', (1.6, .1, .1), (ivx, ivy, 9.9), frame)
        box('ivbag', (.9, .35, 1.4), (ivx + .6, ivy, 9.0), mat('ivbagm', (.85, .92, 1), .1, 0, None, 0, .55), shadow=False)
        obj('ivtube', CYL8, (ivx + 1.6, ivy - 1, 6.0), (.04, .04, 6.5), (25, 25, 0), mat('ivtubem', (.9, .95, 1), .2, 0, None, 0, .6), shadow=False)
        # heart monitor on a stand
        mx, my = bx + 5.2, by + 4.4
        obj('monpole', CYL8, (mx, my, 3.5), (.15, .15, 7), m=frame); box('monitor', (2.8, 1.0, 2.0), (mx, my, 7.6), DARKM(), (0, 0, 25))
        box('monscreen', (2.4, .05, 1.6), (mx - .2, my - .5, 7.6), mat('monscr', (.02, .05, .04), .3), (0, 0, 25), shadow=False)
        gr = emit_mat('ecg', (.2, 1, .45), 12.); e = empty('ecg', (mx - .22, my - .55, 7.6), rot=(0, 0, 25))
        pts = [(-1, 0), (-.5, 0), (-.35, .3), (-.25, -.5), (-.1, .65), (0, 0), (.4, 0), (.55, .2), (.7, 0), (1, 0)]
        for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
            L_ = math.hypot(x1 - x0, z1 - z0); a_ = math.degrees(math.atan2(z1 - z0, x1 - x0))
            box('ecgseg', (L_ * 1.05, .02, .06), ((x0 + x1) / 2, 0, (z0 + z1) / 2 * .6), gr, (0, -a_, 0), parent=e, shadow=False)
        label('72', (mx + .7, my - .6, 8.15), .3, (.2, 1, .45), (90, 0, 25), 6.)
        # curtain on a ceiling track
        box('ctrack', (.15, 14, .15), (bx + 7.5, by, h - .3), METAL())
        cm = polka_mat('curtainm', (.62, .82, .8), (.75, .9, .88), 1.2, 'YZ')
        for j in range(14): box('curt', (.25, 1.05, h - 2.0), (bx + 7.5 + (.25 if j % 2 else -.25), by - 6.5 + j * 1.0, (h - 1.6) / 2 + .4), cm, (0, 0, 20 if j % 2 else -20))
        # side table + flowers + balloon + chair + cabinet + TV + clipboard + sink
        tx_, ty_ = bx - 4.6, by - 1.5
        box('stable', (2.6, 2.6, .2), (tx_, ty_, 3.4), WHITE()); box('stablel', (.3, .3, 3.3), (tx_, ty_, 1.65), frame)
        obj('vase', CYL, (tx_, ty_, 4.3), (.45, .45, 1.6), m=glass_mat('vaseg', (.5, .8, .9)))
        r_ = random.Random(5)
        for k in range(7):
            ang = k / 7 * 2 * math.pi; obj('flowerh', SPH, (tx_ + math.cos(ang) * .5, ty_ + math.sin(ang) * .5, 5.6 + r_.uniform(0, .5)), (.35, .35, .3), m=pm(r_.choice(['pink', 'red', 'yellow', 'white']), .6))
        obj('balloon', SPH, (tx_ + .8, ty_ + .5, 9.0), (.9, .9, 1.1), m=mat('balloonm', (1, .2, .35), .15)); obj('bstring', CYL8, (tx_ + .7, ty_ + .4, 6.4), (.02, .02, 4.4), m=WHITE(), shadow=False)
        label('GET WELL', (tx_ + .8, ty_ - .45, 9.0), .28, (1, 1, 1), (90, 0, 0))
        chair2(bx + 8.5, by - 3, 90, 'teal')
        box('cabinet', (3, 2.4, 5), (ox + w / 2 - 1.6, oy - d / 2 + 4, 2.5), mat('cabm', (.92, .92, .9), .4)); box('cabh', (.1, .2, 1), (ox + w / 2 - 3.15, oy - d / 2 + 4, 3.2), METAL())
        box('tv', (4.5, .3, 2.6), (ox + w / 2 - .4, oy - 2, 9.0), DARKM(), (0, 0, 90)); box('tvs', (4.2, .05, 2.3), (ox + w / 2 - .6, oy - 2, 9.0), mat('tvscr', (.05, .1, .2), .1, 0, (.2, .45, .8), 1.2), (0, 0, 90), shadow=False)
        box('clip', (1, .1, 1.4), (bx, by - 6.35, 4.4), mat('clipm', (.5, .32, .15), .6)); box('clipp', (.85, .05, 1.1), (bx, by - 6.42, 4.3), WHITE())
        box('sink', (3, 2, .6), (ox + w / 2 - 1.4, oy + 6, 3.4), WHITE()); obj('faucet', CYL8, (ox + w / 2 - .6, oy + 6, 4.1), (.12, .12, 1), m=METAL())
        box('mirror', (.1, 2.6, 2.8), (ox + w / 2 - .05, oy + 6, 6.2), mat('mirrorm', (.9, .9, .92), .02, 1.))
        for k in range(2):
            box('hlight', (6, 2, .15), (ox - 6 + k * 12, oy, h - .1), emit_mat('lpanelm', (1, .95, .86), 5.), shadow=False)
            light('hosp_l', 'AREA', (ox - 6 + k * 12, oy, h - .5), 300, (1, .9, .78), 4.)
        s_ = light('hosp_sun', 'SPOT', (xw - 14, oy + 2, h - 2), 45000, (1, .8, .55), .05); s_.data.spot_size = 50 * D2R
        s_.rotation_mode = 'QUATERNION'; s_.rotation_quaternion = (Vector((bx, by - 2, 2)) - s_.location).to_track_quat('-Z', 'Y')
        return (bx, by)

    # ---------------------------------------------------------------- BEDROOM
    def bedroom2(ox, oy, w=30., d=26., h=12., night=False, wall=(.35, .55, .75)):
        """bed against +Y wall; desk with PC on +X wall; window on -X wall"""
        box('bfloor', (w, d, .2), (ox, oy, -.1), wood_mat('bedfloor', (.6, .4, .22), 'XY', 1.0, 7., .28))
        box('bceil', (w, d, .3), (ox, oy, h + .15), plaster_mat('bceilm', (.95, .94, .9), 'XY'))
        wy = plaster_mat('bwall_y_%d' % int(wall[2] * 99), wall, 'XZ'); wx = plaster_mat('bwall_x_%d' % int(wall[2] * 99), wall, 'YZ')
        for s in (-1, 1): box('bw_y', (w + 1.2, .6, h), (ox, oy + s * (d / 2 + .3), h / 2), wy)
        box('bw_xR', (.6, d, h), (ox + w / 2 + .3, oy, h / 2), wx)
        for s in (-1, 1): box('bbase_y', (w, .25, .6), (ox, oy + s * (d / 2 - .1), .3), WHITE())
        xw = ox - w / 2 - .3; box('bw_xlo', (.6, d, 3.6), (xw, oy, 1.8), wx); box('bw_xhi', (.6, d, 2.4), (xw, oy, h - 1.2), wx)
        for s in (-1, 1): box('bw_xs', (.6, (d - 8) / 2, h - 6), (xw, oy + s * (d / 4 + 2), 3.6 + (h - 6) / 2), wx)
        box('bglass', (.1, 8, h - 6), (xw - .2, oy, 3.6 + (h - 6) / 2), glass_mat('bedglass', (.4, .55, .8)), shadow=False)
        box('bwfr', (.4, .25, h - 6), (xw + .1, oy, 3.6 + (h - 6) / 2), WHITE()); box('bwsill', (1.2, 8.6, .3), (xw + .5, oy, 3.7), WHITE())
        sky_c = (.05, .08, .25) if night else (.55, .78, 1.)
        box('bout', (.2, d * 3, h * 3), (xw - 25, oy, h), mat('bout_%d' % night, sky_c, .5, 0, sky_c, 1.5 if night else 2.5), shadow=False)
        cm = mat('curtb', (.95, .75, .3), .85)
        for s in (-1, 1):
            for j in range(5): box('bcurt', (.3, .7, h - 3.5), (xw + .9 + (.2 if j % 2 else 0), oy + s * (4.6 + j * .6), (h - 3.5) / 2 + 2), cm, (0, 0, 25 if j % 2 else -25))
        box('crod', (.15, 14, .15), (xw + .9, oy, h - 1.4), METAL())
        # bed
        bx, by = ox - 3, oy + d / 2 - 6.6
        wd = wood_mat('bedwood', (.45, .28, .15), 'XY', .6, 4., .4, False)
        box('bedframe2', (7.6, 12.4, 1.4), (bx, by, 1.0), wd); box('headb', (8, .6, 5.5), (bx, by + 6.3, 2.75), wd)
        box('mattress2', (7.2, 12, 1.1), (bx, by, 2.25), WHITE())
        box('duvet', (7.6, 8.4, .6), (bx, by - 1.9, 3.0), stripe_mat('duvetm', (.95, .5, .2), (1, .85, .55), .9, 'XY', 1))
        box('duvetf', (7.6, 1.2, .7), (bx, by + 2.6, 3.05), WHITE())
        for sx in (-1.7, 1.7): box('pillow2', (3.0, 1.9, .9), (bx + sx, by + 4.6, 3.2), WHITE(), (14, 0, 0))
        box('plushie', (1.0, .8, 1.2), (bx + 2.4, by + 3.4, 3.6), pm('lav', .8)); obj('plhead', SPH, (bx + 2.4, by + 3.4, 4.5), (.6, .6, .55), m=pm('lav', .8))
        # nightstand + lamp
        nx = bx + 5.6; box('nstand', (2.6, 2.4, 3.0), (nx, by + 4.8, 1.5), wd); box('ndraw', (2.2, .1, .9), (nx, by + 3.55, 2.0), mat('drawf', (.55, .36, .2), .5))
        obj('lampb', CYL, (nx, by + 4.8, 3.3), (.45, .45, .5), m=DARKM()); obj('lamps', CYL8, (nx, by + 4.8, 4.0), (.08, .08, 1.2), m=METAL())
        obj('lampshade', CONE, (nx, by + 4.8, 5.0), (.9, .9, -1.1), m=emit_mat('lampsh', (1, .85, .55), 4.))
        L_ = light('bedlamp_l', 'POINT', (nx, by + 4.6, 4.8), 260 if not night else 380, (1, .72, .42), .4)
        # desk + PC + gaming chair on +X wall
        dx = ox + w / 2 - 2.4; dy = oy - 2
        box('pcdesk', (4, 9, .3), (dx, dy, 3.2), wd)
        for sy in (-4.2, 4.2): box('pcdleg', (3.6, .3, 3.1), (dx, dy + sy, 1.55), wd)
        box('monitor2', (.3, 5.2, 3.0), (dx + .8, dy, 5.6), DARKM()); obj('monst', CYL8, (dx + 1, dy, 4.0), (.12, .12, 1.2), m=DARKM())
        box('monscr2', (.05, 4.9, 2.7), (dx + .6, dy, 5.6), stripe_mat('gamescr', (.2, .6, 1.), (.35, .9, .4), .8, 'YZ', 1, .3), shadow=False)
        try:
            MATS['gamescr'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 2.5
            nt_ = MATS['gamescr'].node_tree; b_ = nt_.nodes['Principled BSDF']; nt_.links.new(b_.inputs['Base Color'].links[0].from_socket, b_.inputs['Emission Color'])
        except Exception: pass
        light('screen_l', 'AREA', (dx - .5, dy, 5.6), 120, (.4, .7, 1.), 3., (0, 90, 0))
        box('keyb', (1.2, 3.4, .15), (dx - .6, dy, 3.4), DARKM()); box('mouse', (.6, .4, .15), (dx - .7, dy + 2.4, 3.4), DARKM())
        box('pctower', (1.6, 2.2, 3.4), (dx, dy - 5.6, 1.7), DARKM()); box('pcrgb', (.05, 1.8, 3.0), (dx - .82, dy - 5.6, 1.7), emit_mat('rgb', (.6, .2, 1), 6.), shadow=False)
        ge = empty('gchair', (dx - 4.2, dy, 0), rot=(0, 0, 90))
        box('gseat', (2.6, 2.6, .5), (0, 0, 1.9), pm('red', .4), parent=ge); box('gback', (2.6, .5, 4.2), (0, 1.2, 4.1), pm('red', .4), parent=ge)
        box('gback2', (1.6, .55, 3.6), (0, 1.15, 4.2), DARKM(), parent=ge); obj('gpole', CYL8, (0, 0, 1.0), (.2, .2, 1.6), m=METAL(), parent=ge)
        for k in range(5): box('gfoot', (1.6, .2, .2), (math.cos(k * 1.256) * .8, math.sin(k * 1.256) * .8, .2), DARKM(), (0, 0, k * 72), parent=ge)
        # shelves with books + figures on the +Y wall right of bed, posters, rug, wardrobe, clothes, ball, console
        for k in range(2):
            box('wshelf', (6, 1.4, .25), (ox + 8, oy + d / 2 - .8, 7 + k * 2.4), wd)
            books_row(ox + 7, oy + d / 2 - .8, 7.15 + k * 2.4, 3.6, 0, 40 + k, 1.0, 1.4)
            obj('figure', CYL8, (ox + 10, oy + d / 2 - .8, 7.8 + k * 2.4), (.35, .35, 1.2), m=pm(['green', 'orange'][k], .5))
        poster(bx + 9, oy + d / 2 - .05, 4.0, 3.0, 4.0, 0, 31, kind=0); poster(ox - 11, oy + d / 2 - .05, 8.5, 3.2, 2.4, 0, 32, kind=3)
        poster(ox + w / 2 - .05, oy + 5, 8.6, 3.0, 4.0, -90, 33, kind=1)
        obj('rug', CYL, (ox + 1, oy - 3, .02), (7, 5, .05), m=stripe_mat('rugm', (.2, .45, .8), (.95, .9, .78), .8, 'XY', 0, .95), shadow=False)
        box('wardrobe', (3.6, 6, 10), (ox - w / 2 + 2.4, oy - d / 2 + 4.2, 5), wd)
        box('wdoorline', (.1, .1, 9.4), (ox - w / 2 + 4.25, oy - d / 2 + 4.2, 5), DARKM()); box('wknob', (.2, .2, .2), (ox - w / 2 + 4.3, oy - d / 2 + 3.8, 5.2), METAL())
        for k in range(4): box('clothes', (1.6, 1.2, .5), (ox - 6 + k * .6, oy - d / 2 + 3.5, .3 + k * .4), pm(['blue', 'white', 'red', 'green'][k], .9), (0, 0, k * 30))
        obj('ball', SPH, (ox + 6, oy - d / 2 + 3, .9), (.9, .9, .9), m=pm('orange', .6))
        box('console', (2, 1.6, .4), (ox + 3, oy - 3, .3), WHITE()); box('ctrl', (1.0, .6, .2), (ox + 4.2, oy - 2.2, .2), DARKM(), (0, 0, 30))
        fairy_lights((xw + .8, oy - d / 2 + 1, h - .6), (xw + .8, oy + d / 2 - 1, h - .6), .8, 26) if False else fairy_lights((ox - w / 2 + 1, oy + d / 2 - .4, h - .7), (ox + w / 2 - 1, oy + d / 2 - .4, h - .7), 1.0, 30)
        if not night:
            s_ = light('bed_sun', 'SPOT', (xw - 14, oy - 1, h - 2), 40000, (1, .8, .55), .05); s_.data.spot_size = 50 * D2R
            s_.rotation_mode = 'QUATERNION'; s_.rotation_quaternion = (Vector((ox + 2, oy - 2, 0)) - s_.location).to_track_quat('-Z', 'Y')
        light('bed_fill', 'AREA', (ox, oy - 2, h - .5), 300 if not night else 80, (1, .9, .78), 8.)
        return (bx, by)

    # ---------------------------------------------------------------- FX: rain / fire / sparks / smoke
    def rain(cx, cy, w, d, h, n=1400, seed=3, speed=60.):
        """falling streaks inside a box; looped by animating two stacked layers"""
        r_ = random.Random(seed); rm = mat('rainm', (.85, .9, 1), .1, 0, (.75, .85, 1.), .8, .35)
        for layer in range(2):
            e = empty('rainL', (cx, cy, 0))
            for i in range(n // 2):
                obj('drop', CUBE, (r_.uniform(-w / 2, w / 2), r_.uniform(-d / 2, d / 2), r_.uniform(0, h)), (.03, .03, 1.1), (0, 8, 0), rm, e, shadow=False)
            bake_fn(e, 'location', 2, lambda t, L=layer: -((t * speed + L * h / 2) % h) + h * (L * 0), 'LINEAR')
            # second copy above so the column is always full
            e2 = empty('rainL2', (0, 0, h), parent=e)
            for i in range(n // 2):
                obj('drop', CUBE, (r_.uniform(-w / 2, w / 2), r_.uniform(-d / 2, d / 2), r_.uniform(0, h)), (.03, .03, 1.1), (0, 8, 0), rm, e2, shadow=False)
    def fire(x, y, z=0., s=1., seed=0, light_e=4000.):
        r_ = random.Random(seed)
        fm_in = mat('flame_in', (1, .85, .3), .5, 0, (1, .8, .25), 25.); fm_out = mat('flame_out', (1, .35, .05), .5, 0, (1, .3, .03), 18.)
        e = empty('fire', (x, y, z))
        for k in range(7):
            o = obj('flame', CONE if k % 2 else SPH, (r_.uniform(-.6, .6) * s, r_.uniform(-.6, .6) * s, (.6 + r_.uniform(0, .8)) * s), (.6 * s, .6 * s, (1.6 + r_.uniform(0, 1)) * s), m=fm_out if k < 4 else fm_in, parent=e, shadow=False)
            ph = r_.uniform(0, 6); sp = r_.uniform(9, 15)
            bake_fn(o, 'scale', 2, lambda t, ph=ph, sp=sp, b=o.scale[2]: b * (1 + .3 * math.sin(t * sp + ph) + .15 * math.sin(t * sp * 2.3 + ph)), 'LINEAR')
        L_ = light('firelight', 'POINT', (x, y, z + 2 * s), light_e, (1, .55, .2), .6)
        bake_fn(L_.data, 'energy', 0, lambda t, ph=seed: light_e * (1 + .35 * math.sin(t * 13 + ph) + .2 * math.sin(t * 29 + ph)), 'LINEAR')
        return e
    def sparks(x, y, z, n=24, seed=0, period=1.2, spread=6.):
        r_ = random.Random(seed); sm = mat('sparkm', (1, .7, .3), .5, 0, (1, .65, .2), 40.)
        for i in range(n):
            o = obj('spark', SPH, (x, y, z), (.07, .07, .07), m=sm, shadow=False)
            vx, vy, vz = r_.uniform(-1, 1) * spread, r_.uniform(-1, 1) * spread, r_.uniform(4, 10); off = r_.uniform(0, period)
            for ax, (p0, v) in enumerate(((x, vx), (y, vy), (z, vz))):
                bake_fn(o, 'location', ax, lambda t, p0=p0, v=v, ax=ax, off=off: p0 + v * ((t + off) % period) - (9.8 * ((t + off) % period) ** 2 if ax == 2 else 0), 'LINEAR')
    def smoke(x, y, z, s=6., dens=.08):
        m_ = bpy.data.materials.new('smoke'); m_.use_nodes = True; nt_ = m_.node_tree; nt_.nodes.clear()
        o_ = nt_.nodes.new('ShaderNodeOutputMaterial'); v_ = nt_.nodes.new('ShaderNodeVolumePrincipled')
        nz = nt_.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.5
        mr = nt_.nodes.new('ShaderNodeMapRange'); mr.inputs['To Max'].default_value = dens; nt_.links.new(nz.outputs['Fac'], mr.inputs['Value'])
        nt_.links.new(mr.outputs['Result'], v_.inputs['Density']); v_.inputs['Color'].default_value = (.35, .33, .32, 1)
        nt_.links.new(v_.outputs[0], o_.inputs['Volume'])
        obj('smoke', SPH, (x, y, z), (s, s, s * 1.3), m=m_, shadow=False)
    def police_tape(p0, p1, z=3.):
        p0 = Vector(p0); p1 = Vector(p1); d = p1 - p0; a_ = math.degrees(math.atan2(d.y, d.x))
        box('tape', (d.length, .05, .45), ((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, z), stripe_mat('tapem', (1, .85, .05), (.05, .05, .05), .8, 'XY', 0, .5), (0, 0, a_), shadow=False)
    def dof_cam(name, loc, target, lens=50, fstop=1.6, focus_obj=None):
        cd = bpy.data.cameras.new(name); cd.lens = lens; cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop
        co = bpy.data.objects.new(name, cd); COL.objects.link(co); co.location = loc
        co.rotation_mode = 'QUATERNION'; co.rotation_quaternion = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y')
        cd.dof.focus_distance = (Vector(target) - Vector(loc)).length
        if focus_obj is not None: cd.dof.focus_object = focus_obj
        return co
    log('env kit v2 loaded')

    # =====================================================================================
    # FACES v2 — layered face rig built from the RbxFacePanelRig pack (MrXen0)
    #   each head = skin -> EYES layer (eyes+brows+tears/sweat/blush) -> MOUTH layer
    #   expressions swap the eyes layer, lip-sync swaps the mouth layer from the VO envelope,
    #   automatic blinks.  Old face names ('ry_angry', 'npc_shock', ...) keep working.
    # =====================================================================================
    FACEDIR2 = os.path.join(HERE, 'faces2')
    EXPRS2 = ['neutral', 'blink', 'happy', 'soft', 'smirk', 'smug', 'squint', 'sad', 'cry', 'surprised', 'shock', 'scared', 'nervous',
              'angry', 'fierce', 'laugh', 'happycry', 'sleep', 'tired', 'stare', 'hollow', 'think', 'love', 'cringe']
    MOUTHS2 = ['flat', 'smile', 'smallsmile', 'smirk', 'smirkgrin', 'frown', 'wail', 'o', 'gasp', 'grit', 'gritbig', 'wavy', 'laugh', 'tiny',
               'frownflat', 'slant', 'grin', 'evil', 'tongue', 'v_rest', 'v_a', 'v_b', 'v_c', 'v_o', 'v_e', 'v_s']
    MOUTH_OF2 = {'neutral': 'flat', 'blink': 'flat', 'happy': 'smile', 'soft': 'smallsmile', 'smirk': 'smirk', 'smug': 'smirkgrin', 'squint': 'flat',
                 'sad': 'frown', 'cry': 'wail', 'surprised': 'o', 'shock': 'gasp', 'scared': 'grit', 'nervous': 'wavy', 'angry': 'grit',
                 'fierce': 'gritbig', 'laugh': 'laugh', 'happycry': 'laugh', 'sleep': 'tiny', 'tired': 'frownflat', 'stare': 'flat', 'hollow': 'frownflat',
                 'think': 'slant', 'love': 'smile', 'cringe': 'grit'}
    SPECIALS2 = ['goofy', 'gasp_cute', 'derp_wide', 'skeptical', 'smug_old', 'bored_blush', 'disgust', 'content', 'meh', 'creepy_grin', 'awe', 'evil_grin', 'suspicious', 'blank', 'confused', 'unimpressed', 'annoyed', 'terrified', 'worried_big', 'nervous2', 'tearful', 'crying_small', 'blank2', 'sly', 'tiny_o', 'shocked_frown', 'scream', 'horror', 'yell', 'wink_angry', 'dead_x', 'poker', 'nose', 'grin_big', 'smile_line', 'flat_line', 'calm', 'dots', 'sideeye_sweat', 'sideeye2', 'sad_classic', 'scream_cute', 'smile_dots', 'classic_smile', 'void_eyes', 'void_grin', 'roblox_smile', 'cheerful', 'cat_tongue', 'cat', 'pain_x', 'googly', 'drool', 'dizzy', 'mustache', 'drool2', 'tiny_smile', 'laugh_open', 'happy_teeth', 'uwu', 'rage', 'rage2', 'yell_v', 'freakout', 'stunned', 'exhausted', 'sad_long', 'weird', 'evil_laugh', 'smug_closed', 'smug_blush', 'beat_up', 'glasses', 'nerd', 'peaceful', 'sad_small', 'puppy_cry', 'starstruck', 'scream_big', 'skull', 'troll_grin', 'cool_smirk', 'shifty', 'bandaged', 'sunglasses', 'cheeky', 'scream_fang', 'teeth_grin', 'buck_teeth', 'visor', 'surprised_simple', 'grumpy', 'villain', 'pout', 'cheshire', 'rage_glasses', 'crazy', 'sideeye_flat', 'sideeye_flat2', 'smile_tiny', 'shout_happy', 'aghast', 'kiss', 'cry_scream', 'hmm', 'sleepy_drool', 'intense_blue', 'sobbing', 'cute_tongue', 'ooh', 'huge_grin', 'huge_grin2', 'lips', 'zigzag', 'sad_closed', 'nervous_teeth', 'smile_simple', 'stare_wide', 'tongue', 'happy_simple', 'angry_simple', 'confused_squiggle', 'cat_simple', 'money', 'dotted', 'blush_happy', 'joy', 'mischief', 'smirk_lip', 'cocky_grin', 'villain_smile', 'frown_angry', 'angry_frown', 'monster', 'sulk', 'weird2', 'gasp_small', 'bleh', 'ninja_grin', 'sneaky_smirk']   # full pack faces (S_<name>.png), shared by every character
    # old single-image face names -> (expression, mouth)
    ALIAS2 = {'shout': ('angry', 'v_c'), 'silly': ('happy', 'tongue'), 'derp': ('surprised', 'grin'), 'glow': ('smirk', 'smirk'),
              'smile': ('happy', 'smile'), 'sing': ('happy', 'v_b'), 'xd': ('laugh', 'laugh'), 'whisper': ('think', 'v_o'),
              'terrified': ('scared', 'wail'), 'worried': ('nervous', 'wavy'), 'surprise': ('surprised', 'o'), 'shocked': ('shock', 'gasp'),
              'evil': ('smug', 'evil'), 'grin': ('happy', 'grin')}
    BLINKABLE = {'neutral', 'soft', 'smirk', 'sad', 'surprised', 'scared', 'nervous', 'angry', 'fierce', 'think', 'stare', 'tired', 'smug', 'hollow'}
    TALK_V = ['v_a', 'v_b', 'v_c', 'v_o', 'v_e', 'v_b', 'v_a', 'v_s']

    def parse_face2(fc, fam):
        """'ry_angry' -> ('angry','grit'); 'ry_angry/v_c' -> explicit mouth"""
        mouth = None
        if '/' in fc: fc, mouth = fc.split('/', 1)
        e = fc.split('_', 1)[1] if ('_' in fc and fc.split('_', 1)[0] in ('ry', 'npc', 'pr', 'mom', 'tom', 'noah', 'x')) else fc
        if e[:2].lower() == 's:': e = e[2:]
        if e in SPECIALS2: return 'S:' + e, None
        if e in ALIAS2: e, m_ = ALIAS2[e]; mouth = mouth or m_
        if e not in EXPRS2: e = 'neutral'
        return e, (mouth or MOUTH_OF2[e])

    def face_material2(name, skin, fam, used=None):
        """used = iterable of (expr, mouth) pairs from face_track2; None = load everything"""
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
        b.inputs['Roughness'].default_value = .55
        uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'Face'
        rgb = nt.nodes.new('ShaderNodeRGB'); rgb.outputs[0].default_value = (*skin, 1)
        cur = rgb.outputs[0]; WE = {}; WM = {}
        def layer(fn, key, first):
            nonlocal cur
            img = bpy.data.images.load(os.path.join(FACEDIR2, fn + '.png'), check_existing=True)
            tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img; tx.extension = 'CLIP'; tx.interpolation = 'Cubic'
            nt.links.new(uv.outputs[0], tx.inputs['Vector'])
            v = nt.nodes.new('ShaderNodeValue'); v.name = 'W_' + key; v.outputs[0].default_value = 1. if first else 0.
            mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'
            nt.links.new(v.outputs[0], mu.inputs[0]); nt.links.new(tx.outputs['Alpha'], mu.inputs[1])
            mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
            fac = [s for s in mx.inputs if s.name == 'Factor' and s.type == 'VALUE'][0]
            A = [s for s in mx.inputs if s.name == 'A' and s.type == 'RGBA'][0]; B = [s for s in mx.inputs if s.name == 'B' and s.type == 'RGBA'][0]
            nt.links.new(mu.outputs[0], fac); nt.links.new(cur, A); nt.links.new(tx.outputs['Color'], B); cur = [s for s in mx.outputs if s.type == 'RGBA'][0]
            return v
        ue = EXPRS2 if used is None else [e for e in EXPRS2 if any(u[0] == e for u in used)] or ['neutral']
        um = MOUTHS2 if used is None else [mo for mo in MOUTHS2 if any(u[1] == mo for u in used)]
        us = [] if used is None else [x[0][2:] for x in set(used) if x[0].startswith('S:')]
        if not os.path.exists(os.path.join(FACEDIR2, 'E_%s_neutral.png' % fam)): fam = 'npc'
        for i, e in enumerate(ue): WE[e] = layer('E_%s_%s' % (fam, e), 'E_' + e, i == 0)
        for i, mo in enumerate(um): WM[mo] = layer('M_' + mo, 'M_' + mo, i == 0)
        for sp in us: WE['S:' + sp] = layer('S_' + sp, 'S_' + sp, False)   # specials sit on top of eyes+mouth
        nt.links.new(cur, b.inputs['Base Color'])
        return m, WE, WM

    # ---- VO loudness per frame (for lip sync).  TALK2 = [(char_name, t0, t1), ...] says who speaks when
    def vo_envelope(wav_path, fps=FPS):
        import wave, struct, array
        try:
            w = wave.open(wav_path, 'rb'); n = w.getnframes(); sr = w.getframerate(); ch_ = w.getnchannels(); sw = w.getsampwidth()
            raw = w.readframes(n); w.close()
            if sw != 2: return None
            a = array.array('h', raw)
            if ch_ > 1: a = a[::ch_]
            hop = sr / fps; out = []
            for f in range(int(len(a) / hop) + 1):
                seg = a[int(f * hop): int((f + 1) * hop)]
                out.append((sum(x * x for x in seg[::4]) / max(1, len(seg[::4]))) ** .5 / 32768. if len(seg) else 0.)
            pk = sorted(out)[int(len(out) * .97)] or 1.
            return [min(1., v / pk) for v in out]
        except Exception as ex:
            log('vo_envelope failed', ex); return None

    def face_track2(nm, fam, faces_per_frame, env=None, talk=(), seed=1):
        """returns per-frame (expr, mouth) after blinks and lip sync"""
        rnd = random.Random(seed * 7919 + len(nm)); out = []; nb = rnd.uniform(1.0, 3.0) * FPS; blink_until = -1
        talk_ = [(a, b) for (n_, a, b) in talk if n_ == nm]
        vis_i = 0; hold = 0; prev_m = None
        for fi, fc in enumerate(faces_per_frame):
            e, mo = parse_face2(fc or '%s_neutral' % fam, fam)
            t = fi / FPS
            if e.startswith('S:'):
                out.append((e, None)); continue
            # lip sync while this character is speaking
            if env is not None and any(a <= t < b for a, b in talk_):
                lv = env[fi] if fi < len(env) else 0.
                if lv < .12: mo = 'v_rest' if e not in ('happy', 'laugh', 'love') else 'smallsmile'
                else:
                    if hold <= 0:
                        vis_i = (vis_i + rnd.randint(1, 3)) % len(TALK_V); hold = rnd.randint(2, 3)
                    hold -= 1
                    mo = TALK_V[vis_i]
                    if lv > .7 and mo in ('v_a', 'v_s', 'v_e'): mo = 'v_c'
                    if lv < .3 and mo in ('v_c', 'v_b'): mo = 'v_a'
            # blinks
            if fi >= nb and e in BLINKABLE:
                blink_until = fi + max(2, round(.12 * FPS)); nb = fi + rnd.uniform(2.2, 4.5) * FPS
            if fi < blink_until and e in BLINKABLE: e = 'blink'
            out.append((e, mo))
        return out

    def bake_faces2(ch, track):
        nt_ = ch.facemat.node_tree
        for e, v in ch.WE.items():
            vals = [1. if x[0] == e else 0. for x in track]
            if any(vals): bake(nt_, 'nodes["%s"].outputs[0].default_value' % v.name, 0, FRAMES, vals, 'CONSTANT')
            else: v.outputs[0].default_value = 0.
        for mo, v in ch.WM.items():
            vals = [1. if x[1] == mo else 0. for x in track]
            if any(vals): bake(nt_, 'nodes["%s"].outputs[0].default_value' % v.name, 0, FRAMES, vals, 'CONSTANT')
            else: v.outputs[0].default_value = 0.


    # ===================================================== COMMON HELPERS
    def grouped(name, pivot, fn, *a, **k):
        before = set(bpy.data.objects)
        res = fn(*a, **k)
        e = empty(name, pivot); bpy.context.view_layer.update()
        inv = e.matrix_world.inverted()
        for o in bpy.data.objects:
            if o not in before and o.parent is None and o is not e:
                o.parent = e; o.matrix_parent_inverse = inv
        return e, res
    GOLD = mat('gold', (1, .75, .25), .25, 1.)
    SPARK_M = mat('sparkm', (1, .85, .4), .3, 0, (1, .78, .3), 9.)
    SPARK_B = mat('sparkb', (.6, .85, 1), .3, 0, (.45, .75, 1.), 12.)
    MARBLE = tile_mat('marble', (.93, .92, .9), (.8, .8, .82), 5., .08, (.55, .55, .58))
    def lawn_mat(name, c1=(.13, .42, .09), c2=(.3, .62, .16)):
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, .95); v = _uv(nt_, 'XY'); nz = _noise(nt_, v, .35, 6.); nz2 = _noise(nt_, v, 6., 3.)
        a1 = _mix(nt_, nz.outputs['Fac'], c1, c2); a2 = _mix(nt_, .25, a1, nz2.outputs['Color'], 'MULTIPLY')
        nt_.links.new(a2, b.inputs['Base Color']); _bump(nt_, b, nz2.outputs['Fac'], .25); MATS[name] = m; return m
    LAWN = lawn_mat('lawn')
    def mesh_torus(R=1., r=.12, seg=48, rseg=10):
        me = bpy.data.meshes.new('torus'); vs = []; fs = []
        for i in range(seg):
            a = i / seg * 2 * math.pi
            for j in range(rseg):
                b_ = j / rseg * 2 * math.pi
                vs.append(((R + r * math.cos(b_)) * math.cos(a), r * math.sin(b_), (R + r * math.cos(b_)) * math.sin(a)))
        for i in range(seg):
            for j in range(rseg):
                i2 = (i + 1) % seg; j2 = (j + 1) % rseg
                fs.append((i * rseg + j, i2 * rseg + j, i2 * rseg + j2, i * rseg + j2))
        me.from_pydata(vs, [], fs)
        for p in me.polygons: p.use_smooth = True
        me.materials.append(None); return me
    TORUS = mesh_torus(1., .09)
    TORUS2 = mesh_torus(1., .035)
    def mesh_disc(seg=40):
        me = bpy.data.meshes.new('disc'); vs = [(0, 0, 0)] + [(math.cos(i / seg * 2 * math.pi), 0, math.sin(i / seg * 2 * math.pi)) for i in range(seg)]
        fs = [(0, 1 + i, 1 + (i + 1) % seg) for i in range(seg)]; me.from_pydata(vs, [], fs); me.materials.append(None); return me
    DISC = mesh_disc()
    # ---- swirl material for the portal surface (blue/cyan only, never pink)
    def portal_mat(name):
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, .3)
        tc_ = nt_.nodes.new('ShaderNodeTexCoord'); mp = nt_.nodes.new('ShaderNodeMapping'); mp.name = 'SWIRL'
        nt_.links.new(tc_.outputs['Object'], mp.inputs['Vector'])
        wv = nt_.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'RINGS'; wv.inputs['Scale'].default_value = 1.6; wv.inputs['Distortion'].default_value = 6.
        try: wv.inputs['Detail'].default_value = 3.
        except Exception: pass
        nt_.links.new(mp.outputs['Vector'], wv.inputs['Vector'])
        cr = nt_.nodes.new('ShaderNodeValToRGB'); el = cr.color_ramp.elements
        el[0].position = .2; el[0].color = (.02, .18, .6, 1); el[1].position = .85; el[1].color = (.55, .95, 1., 1)
        nt_.links.new(wv.outputs['Fac'], cr.inputs['Fac'])
        nt_.links.new(cr.outputs['Color'], b.inputs['Base Color']); nt_.links.new(cr.outputs['Color'], b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = 3.5; b.inputs['Alpha'].default_value = .82
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
        MATS[name] = m; return m
    RINGM = mat('portal_ring', (.5, .9, 1.), .2, 0, (.45, .85, 1.), 14.)
    RINGM2 = mat('portal_ring2', (1, 1, 1), .2, 0, (.8, .95, 1.), 20.)
    PORTALS = {}
    def portal(name, x, y, z, rz, R=3.6):
        """vertical glowing ring; its surface faces local -Y (rz rotates it).  pivot at the ring centre"""
        e = empty('portal_' + name, (x, y, z), rot=(0, 0, rz))
        obj('p_ring', TORUS, (0, 0, 0), (R, R * 1.6, R), (0, 0, 0), RINGM, e, False)
        obj('p_ring2', TORUS2, (0, 0, 0), (R * .86, R, R * .86), (0, 0, 0), RINGM2, e, False)
        dsk = obj('p_disc', DISC, (0, 0, 0), (R * .97, 1, R * .97), (0, 0, 0), portal_mat('portal_swirl'), e, False)
        for k in range(10):
            a_ = k / 10 * 2 * math.pi
            obj('p_spark', SPH, (math.cos(a_) * R * 1.1, 0, math.sin(a_) * R * 1.1), (.12, .12, .12), m=SPARK_B, parent=e, shadow=False)
        L_ = light('p_light', 'POINT', (0, 0, 0), 0, (.45, .8, 1.), 1.2); L_.parent = e; L_.location = (0, -2.5, 0)
        PORTALS[name] = (e, L_, dsk); return e
    ASSETS = os.path.join(HERE, 'nme_assets')
    def card_mat(name, fn, fallback):
        p_ = os.path.join(ASSETS, fn)
        if not os.path.exists(p_): return mat(name, fallback, .6)
        m, nt_, b = _new(name, .45)
        uvn = nt_.nodes.new('ShaderNodeTexCoord'); tx_ = nt_.nodes.new('ShaderNodeTexImage'); tx_.image = bpy.data.images.load(p_, check_existing=True)
        tx_.extension = 'EXTEND'; nt_.links.new(uvn.outputs['UV'], tx_.inputs['Vector']); nt_.links.new(tx_.outputs['Color'], b.inputs['Base Color'])
        try: b.inputs['Coat Weight'].default_value = .25; b.inputs['Coat Roughness'].default_value = .2
        except Exception: pass
        MATS[name] = m; return m
    FACEPNG = lambda fn: os.path.join(FACEDIR2, fn + '.png')
    def face_plane_mat(name, fn):
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, .6)
        tc_ = nt_.nodes.new('ShaderNodeTexCoord'); tx_ = nt_.nodes.new('ShaderNodeTexImage'); tx_.image = bpy.data.images.load(FACEPNG(fn), check_existing=True)
        tx_.extension = 'CLIP'; nt_.links.new(tc_.outputs['UV'], tx_.inputs['Vector']); nt_.links.new(tx_.outputs['Color'], b.inputs['Base Color']); nt_.links.new(tx_.outputs['Alpha'], b.inputs['Alpha'])
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
        MATS[name] = m; return m
    EXF = [('npc', 'happy', 'smile'), ('npc', 'soft', 'smallsmile'), ('mom', 'happy', 'smile'), ('tom', 'surprised', 'o'), ('pr', 'happy', 'grin'), ('mom', 'laugh', 'laugh'), ('tom', 'happy', 'smile'), ('pr', 'soft', 'smallsmile')]
    EXSK = [(.86, .68, .12), (.85, .63, .45), (.62, .42, .26), (.34, .2, .12), (.72, .68, .62)]
    EXCOL = [(.85, .2, .2), (.2, .45, .85), (.15, .6, .35), (.95, .75, .15), (.55, .3, .8), (.95, .5, .15), (.1, .6, .65), (.95, .95, .95), (.15, .15, .2), (.85, .4, .55)]
    EXHAIR = [(.08, .06, .05), (.35, .2, .1), (.75, .35, .12), (.9, .8, .45), (.6, .6, .62), (.2, .12, .08)]
    def extra(x, y, rz, seed, z=0., sit=False, arms='down', scale=1.):
        """lightweight background person (blocks + pack face), varied colours / hair / accessories"""
        r_ = random.Random(seed); u = scale * r_.uniform(.86, 1.04)
        e = empty('extra', (x, y, z), rot=(0, 0, rz))
        sk = mat('ex_sk%d' % (seed % 5), EXSK[seed % 5], .55); top = mat('ex_t%d' % (seed % 10), EXCOL[seed % 10], .6)
        pants = mat('ex_p%d' % (seed % 4), [(.2, .25, .45), (.15, .15, .18), (.62, .55, .4), (.3, .35, .5)][seed % 4], .7)
        hb = 2.0 * u if not sit else 1.75 * u
        if sit:
            for sx in (-.5, .5):
                box('ex_thigh', (.95 * u, 2.0 * u, .95 * u), (sx * u, 1.0 * u, 1.75 * u), pants, parent=e); box('ex_shin', (.95 * u, .95 * u, 1.7 * u), (sx * u, 1.8 * u, .85 * u), pants, parent=e)
        else:
            for sx in (-.5, .5): box('ex_leg', (.95 * u, .95 * u, 2.0 * u), (sx * u, 0, 1.0 * u), pants, parent=e)
        box('ex_torso', (2.0 * u, 1.0 * u, 2.0 * u), (0, 0, hb + 1.0 * u), top, parent=e)
        for sx in (-1, 1):
            if arms == 'up' and (sx > 0 or r_.random() < .5): box('ex_arm', (.95 * u, .95 * u, 2.0 * u), (sx * 1.5 * u, 0, hb + 2.6 * u), sk if r_.random() < .5 else top, (0, sx * 12, 0), parent=e)
            else: box('ex_arm', (.95 * u, .95 * u, 2.0 * u), (sx * 1.5 * u, 0, hb + 1.0 * u), top, (r_.uniform(-12, 12), 0, 0), parent=e)
        hz = hb + 2.0 * u + .62 * u
        box('ex_head', (1.2 * u, 1.2 * u, 1.2 * u), (0, 0, hz), sk, parent=e)
        fam, ex, mo = EXF[seed % len(EXF)]
        plane('ex_eyes', (1.5 * u, 1.5 * u), (0, .62 * u, hz - .05 * u), face_plane_mat('exe_%s_%s' % (fam, ex), 'E_%s_%s' % (fam, ex)), (90, 0, 180), e, False)
        plane('ex_mouth', (1.5 * u, 1.5 * u), (0, .63 * u, hz - .05 * u), face_plane_mat('exm_' + mo, 'M_' + mo), (90, 0, 180), e, False)
        hc = mat('ex_h%d' % (seed % 6), EXHAIR[seed % 6], .55); st = r_.randint(0, 4)
        if st == 0: obj('ex_hair', SPH, (0, -.05 * u, hz + .42 * u), (.72 * u, .72 * u, .42 * u), m=hc, parent=e)
        elif st == 1: obj('ex_hair', SPH, (0, -.1 * u, hz + .3 * u), (.75 * u, .75 * u, .5 * u), m=hc, parent=e); obj('ex_hairb', SPH, (0, -.45 * u, hz - .3 * u), (.7 * u, .35 * u, .8 * u), m=hc, parent=e)
        elif st == 2: box('ex_cap', (1.3 * u, 1.3 * u, .45 * u), (0, 0, hz + .6 * u), top, parent=e); box('ex_brim', (1.1 * u, .7 * u, .1 * u), (0, .8 * u, hz + .42 * u), top, parent=e)
        elif st == 3: obj('ex_hair', SPH, (0, -.05 * u, hz + .35 * u), (.75 * u, .75 * u, .45 * u), m=hc, parent=e); obj('ex_bun', SPH, (0, -.4 * u, hz + .75 * u), (.32 * u, .32 * u, .3 * u), m=hc, parent=e)
        else: obj('ex_hair', SPH, (0, 0, hz + .4 * u), (.68 * u, .68 * u, .3 * u), m=hc, parent=e)
        if r_.random() < .25: obj('ex_balloon', SPH, (1.6 * u, 0, hz + 3.0 * u), (.8, .8, .95), m=pm(r_.choice(['blue', 'yellow', 'sky', 'white']), .15), parent=e, shadow=False); obj('ex_str', CYL8, (1.6 * u, 0, hz + .6 * u), (.02, .02, 4.4), m=WHITE(), parent=e, shadow=False)
        elif r_.random() < .2: box('ex_phone', (.5, .1, .9), (1.4 * u, .7 * u, hb + 3.0 * u), DARKM(), parent=e)
        return e
    def stall(x, y, rz, seed, title):
        e = empty('stall', (x, y, 0), rot=(0, 0, rz)); r_ = random.Random(seed)
        c1, c2 = [((.9, .15, .15), (1, 1, 1)), ((.15, .45, .85), (1, 1, 1)), ((.15, .6, .3), (1, .95, .8)), ((.95, .6, .1), (1, 1, 1))][seed % 4]
        wd = wood_mat('stallw', (.55, .35, .18), 'XY', .5, 3., .6, False)
        box('st_counter', (7, 2.4, 3.0), (0, 0, 1.5), wd, parent=e); box('st_top', (7.4, 2.8, .25), (0, 0, 3.1), WHITE(), parent=e)
        for sx in (-3.4, 3.4):
            for sy in (-1.1, 1.1): box('st_pole', (.2, .2, 8), (sx, sy, 4), METAL(), parent=e)
        box('st_awn', (7.8, 3.6, .2), (0, -.4, 8.0), stripe_mat('awn_st%d' % (seed % 4), c1, c2, .9, 'XY', 0, .7), (14, 0, 0), parent=e)
        box('st_val', (7.8, .12, .7), (0, -2.2, 7.4), stripe_mat('awn_st%d' % (seed % 4), c1, c2, .9, 'XY', 0, .7), parent=e)
        box('st_sign', (5, .2, 1.1), (0, -1.3, 6.4), mat('st_signm%d' % (seed % 3), [(.1, .15, .3), (.95, .9, .8), (.5, .1, .1)][seed % 3], .5), parent=e)
        label(title, (0, -1.42, 6.4), .55, (1, .95, .8) if seed % 3 != 1 else (.15, .1, .08), (90, 0, 180), 0., e, .02)
        for k in range(8): obj('st_goods', SPH if k % 2 else CUBE, (-3 + k * .85, -.4, 3.55), (.35, .35, .35), m=pm(r_.choice(['red', 'yellow', 'orange', 'lime', 'pink', 'sky']), .4), parent=e)
        for k in range(3): obj('st_jar', CYL, (-2.5 + k * 2.5, .6, 3.7), (.35, .35, .9), m=glass_mat('st_jarm', (.85, .7, .4)), parent=e)
        fairy_lights((x - 3.6, y - 2.0, 8.1), (x + 3.6, y - 2.0, 8.1), .5, 12) if rz == 0 else None
        return e

    # ===================================================== RICH BUILDINGS (v11): every face detailed, no plain boxes
    PAL.update({'navy': (.1, .15, .4), 'forest': (.1, .35, .2), 'charcoal': (.2, .2, .22), 'maroon': (.5, .1, .12), 'mustard': (.85, .65, .15)})
    def facade_mat(name, wall, kind='plaster', sp=3.2, fh=4.2, ww=.5, wh=.55, glass=(.2, .3, .42), lit=.12, litcol=(1, .78, .45), es=2.2,
                   frame=(.92, .9, .86), curtain=True, base=0.):
        """wall + window grid in world space (works on all four sides): u = x + y, v = z. Window cells vary: curtains, blinds, some lit."""
        if name in MATS: return MATS[name]
        m, nt_, b = _new(name, .75)
        g = nt_.nodes.new('ShaderNodeNewGeometry'); sxyz = nt_.nodes.new('ShaderNodeSeparateXYZ'); nt_.links.new(g.outputs['Position'], sxyz.inputs[0])
        def M(op, a, b_=None, v=None):
            n_ = nt_.nodes.new('ShaderNodeMath'); n_.operation = op
            for i_, x_ in enumerate((a, b_)):
                if x_ is None: continue
                if isinstance(x_, (int, float)): n_.inputs[i_].default_value = x_
                else: nt_.links.new(x_, n_.inputs[i_])
            return n_.outputs[0]
        u = M('ADD', sxyz.outputs['X'], sxyz.outputs['Y']); vz = M('SUBTRACT', sxyz.outputs['Z'], base)
        cu = M('DIVIDE', u, sp); cv = M('DIVIDE', vz, fh)
        fu = M('FRACT', cu); fv = M('FRACT', cv); iu = M('FLOOR', cu); iv = M('FLOOR', cv)
        # window rectangle inside each cell
        a1 = M('GREATER_THAN', fu, .5 - ww / 2); a2 = M('LESS_THAN', fu, .5 + ww / 2); a3 = M('GREATER_THAN', fv, .3); a4 = M('LESS_THAN', fv, .3 + wh)
        win = M('MULTIPLY', M('MULTIPLY', a1, a2), M('MULTIPLY', a3, a4))
        # frame ring slightly larger than the glass
        b1 = M('GREATER_THAN', fu, .5 - ww / 2 - .06); b2 = M('LESS_THAN', fu, .5 + ww / 2 + .06); b3 = M('GREATER_THAN', fv, .3 - .07); b4 = M('LESS_THAN', fv, .3 + wh + .09)
        frm = M('SUBTRACT', M('MULTIPLY', M('MULTIPLY', b1, b2), M('MULTIPLY', b3, b4)), win)
        sill = M('MULTIPLY', M('MULTIPLY', b1, b2), M('MULTIPLY', M('GREATER_THAN', fv, .3 - .12), M('LESS_THAN', fv, .3 - .05)))
        # per-cell random (white noise on the cell id)
        cid = nt_.nodes.new('ShaderNodeCombineXYZ'); nt_.links.new(iu, cid.inputs[0]); nt_.links.new(iv, cid.inputs[1]); cid.inputs[2].default_value = hash(name) % 997
        wn = nt_.nodes.new('ShaderNodeTexWhiteNoise'); wn.noise_dimensions = '3D'; nt_.links.new(cid.outputs[0], wn.inputs['Vector'])
        rnd = wn.outputs['Value']
        islit = M('LESS_THAN', rnd, lit)
        # glass colour: sky reflection gradient inside the pane + curtain colours per cell
        gcol = _mix(nt_, M('MULTIPLY', fv, 1.4), tuple(c * .55 for c in glass), tuple(min(1, c * 1.6) for c in glass))
        if curtain:
            cc = nt_.nodes.new('ShaderNodeValToRGB'); cr = cc.color_ramp; cr.interpolation = 'CONSTANT'
            cols = [(.85, .78, .62), (.75, .32, .28), (.35, .5, .7), (.9, .88, .82), (.45, .6, .4)]
            cr.elements[0].color = (*cols[0], 1); cr.elements[1].position = .2; cr.elements[1].color = (*cols[1], 1)
            for k_, c_ in enumerate(cols[2:]): el = cr.elements.new(.4 + k_ * .2); el.color = (*c_, 1)
            nt_.links.new(M('FRACT', M('MULTIPLY', rnd, 7.31)), cc.inputs[0])
            half = M('LESS_THAN', fu, .5 - ww / 2 + ww * .28)                            # curtain on the left part of some windows
            hascur = M('MULTIPLY', half, M('GREATER_THAN', M('FRACT', M('MULTIPLY', rnd, 3.7)), .45))
            gcol = _mix(nt_, hascur, gcol, cc.outputs[0])
        lcol = _mix(nt_, M('MULTIPLY', fv, .8), litcol, tuple(min(1, c * 1.15) for c in litcol))
        gcol = _mix(nt_, islit, gcol, lcol)
        # wall
        v2 = nt_.nodes.new('ShaderNodeCombineXYZ'); nt_.links.new(u, v2.inputs[0]); nt_.links.new(sxyz.outputs['Z'], v2.inputs[1])
        if kind == 'brick':
            br = _brick(nt_, v2.outputs[0], wall, tuple(c * .8 for c in wall), (.8, .76, .7), .9, .3, .035, .5, .1); wcol = br.outputs['Color']; hgt = br.outputs['Fac']
        elif kind == 'panel':
            br = _brick(nt_, v2.outputs[0], wall, tuple(c * .93 for c in wall), tuple(c * .7 for c in wall), sp, fh / 2, .02, 0., 0.); wcol = br.outputs['Color']; hgt = br.outputs['Fac']
        else:
            nz = _noise(nt_, v2.outputs[0], .9, 6.); wcol = _mix(nt_, .12, wall, nz.outputs['Color'], 'MULTIPLY'); hgt = nz.outputs['Fac']
        # grime toward the bottom of each floor band
        dirt = M('MULTIPLY', M('SUBTRACT', 1., M('MINIMUM', M('MULTIPLY', fv, 4.), 1.)), .12)
        wcol = _mix(nt_, dirt, wcol, (.15, .13, .12))
        col = _mix(nt_, frm, wcol, frame); col = _mix(nt_, sill, col, frame); col = _mix(nt_, win, col, gcol)
        nt_.links.new(col, b.inputs['Base Color'])
        rgh = _mix(nt_, win, (.8, .8, .8), (.08, .08, .08)); sr_ = nt_.nodes.new('ShaderNodeSeparateColor'); nt_.links.new(rgh, sr_.inputs[0]); nt_.links.new(sr_.outputs[0], b.inputs['Roughness'])
        try:
            em = nt_.nodes.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; nt_.links.new(M('MULTIPLY', win, islit), em.inputs[0]); em.inputs[1].default_value = es
            nt_.links.new(lcol, b.inputs['Emission Color']); nt_.links.new(em.outputs[0], b.inputs['Emission Strength'])
        except Exception: pass
        _bump(nt_, b, M('ADD', M('MULTIPLY', frm, .6), M('MULTIPLY', hgt, .3)), .25)
        MATS[name] = m; return m
    AWN = [((.85, .2, .2), (.96, .95, .9)), ((.15, .45, .3), (.95, .92, .82)), ((.95, .6, .1), (.98, .96, .9)), ((.2, .35, .7), (.95, .95, .95)), ((.55, .2, .5), (.98, .9, .95))]
    SHOPN = ['BAKERY', 'BOOKS', 'FLOWERS', 'CAFE', 'TOYS', 'PHARMACY', 'DELI', 'RECORDS', 'BIKES', 'NOODLES', 'TAILOR', 'GROCER', 'HARDWARE', 'PIZZA', 'SHOES']
    def roof_kit(x, y, w, d, top, r_, style):
        """parapet ring + clutter: water tank, AC units, vents, antenna, stair hut, sometimes a billboard / rooftop garden"""
        pm_ = mat('roofcap', (.62, .6, .58), .8)
        for sx_ in (-1, 1):
            box('parapet', (w + .4, .6, 2.0), (x, y + sx_ * (d / 2 + .05), top + 1.0), pm_); box('parapet', (.6, d + .4, 2.0), (x + sx_ * (w / 2 + .05), y, top + 1.0), pm_)
        box('roofdeck', (w, d, .15), (x, y, top + .08), mat('roofdeck', (.38, .37, .36), .9), shadow=False)
        if style in ('brick', 'deco') or r_.random() < .35:      # classic wooden water tank on legs
            tx, ty = x + r_.uniform(-w / 4, w / 4), y + r_.uniform(-d / 4, d / 4)
            for lx, ly in ((-1, -1), (1, -1), (-1, 1), (1, 1)): box('wt_leg', (.35, .35, 4.5), (tx + lx * 1.8, ty + ly * 1.8, top + 2.25), METAL())
            obj('wt_tank', CYL, (tx, ty, top + 7.0), (2.8, 2.8, 5.0), m=wood_mat('tankw', (.45, .3, .2), 'XZ', .4, 9., .7, False))
            obj('wt_roof', CONE16, (tx, ty, top + 10.4), (3.1, 3.1, 1.8), m=mat('tankroof', (.28, .26, .25), .7))
            for k_ in range(3): obj('wt_band', CYL, (tx, ty, top + 5.2 + k_ * 1.6), (2.88, 2.88, .1), m=METAL())
        for k_ in range(r_.randint(2, 4)):                          # AC units with fans
            ax, ay = x + r_.uniform(-w / 2 + 1.5, w / 2 - 1.5), y + r_.uniform(-d / 2 + 1.5, d / 2 - 1.5)
            box('ac', (3.2, 2.6, 2.2), (ax, ay, top + 1.2), mat('acm', (.82, .82, .8), .5)); obj('ac_fan', CYL, (ax, ay, top + 2.32), (1.0, 1.0, .06), m=DARKM())
        if r_.random() < .6:
            hx, hy = x + r_.uniform(-w / 3, w / 3), y + r_.uniform(-d / 3, d / 3)
            box('stairhut', (5.0, 5.4, 6.0), (hx, hy, top + 3.0), mat('hutm', (.7, .66, .6), .8)); box('hutdoor', (2.4, .1, 4.6), (hx, hy - 2.72, top + 2.3), pm('teal', .6))
        if r_.random() < .45: obj('antenna', CYL8, (x + w / 3, y + d / 4, top + 4), (.12, .12, 8), m=METAL()); obj('ant_red', SPH, (x + w / 3, y + d / 4, top + 8.1), (.3, .3, .3), m=emit_mat('antred', (1, .1, .05), 12.), shadow=False)
        for k_ in range(r_.randint(1, 3)): obj('vent', CYL8, (x + r_.uniform(-w / 2.5, w / 2.5), y + r_.uniform(-d / 2.5, d / 2.5), top + .6), (.4, .4, 1.2), m=METAL())
        if r_.random() < .2:                                        # rooftop garden
            for k_ in range(4): pot_plant(x + r_.uniform(-w / 3, w / 3), y + r_.uniform(-d / 3, d / 3), top + .15, 1.0, k_ + int(x))
    def fire_escape(x, y, face, w, floors, fh, z0):
        """zig-zag iron fire escape on a ±Y face"""
        fm = mat('fe_iron', (.12, .12, .13), .5, .6)
        for k_ in range(1, floors):
            z = z0 + k_ * fh; yy = y + face * 1.7
            box('fe_plat', (w, 3.2, .14), (x, yy, z), fm); box('fe_rail', (w, .1, .1), (x, yy + face * 1.55, z + 2.0), fm, shadow=False)
            for j in range(int(w / 1.0) + 1): box('fe_bar', (.08, .08, 2.0), (x - w / 2 + j * 1.0, yy + face * 1.55, z + 1.0), fm, shadow=False)
            for sx_ in (-1, 1): box('fe_side', (.1, 3.2, .1), (x + sx_ * w / 2, yy, z + 2.0), fm, shadow=False)
            if k_ < floors - 1: box('fe_ladder', (1.4, .1, fh * 1.08), (x + (w / 2 - .8) * (1 if k_ % 2 else -1), yy, z + fh / 2), fm, (0, (1 if k_ % 2 else -1) * 32, 0), shadow=False)
    def bld(x, y, w, d, floors, style='brick', seed=0, front=-1, night=False, shops=True, name=None, fh=8.0, z0=0.):
        """detailed building centred at (x, y), axis aligned.  front = -1 street on -Y side, +1 on +Y, 'x-'/'x+' on X sides.
        styles: brick (walk-up, fire escape, water tank), glass (curtain wall + fins + crown), deco (stone piers, stepped top),
        pastel (row house: bay windows, shutters, flower boxes), apt (concrete balconies, laundry, satellite dishes)."""
        r_ = random.Random(seed); sh_ = 9.0 if shops else 0.; U = 1.7      # U: human-scale details (characters are ~5.5 tall)
        H = sh_ + floors * fh; top = z0 + H
        WALLS = {'brick': [(.62, .3, .22), (.55, .34, .26), (.7, .42, .3), (.48, .25, .2)],
                 'glass': [(.55, .6, .66), (.5, .56, .6)], 'deco': [(.86, .82, .72), (.8, .75, .66), (.78, .8, .82)],
                 'pastel': [(.95, .78, .62), (.72, .86, .8), (.95, .88, .55), (.82, .74, .9), (.98, .7, .66), (.66, .8, .95)],
                 'apt': [(.82, .8, .76), (.74, .76, .78), (.88, .84, .74)]}
        wall = r_.choice(WALLS[style]); lit = (.55 if night else .1)
        kind = {'brick': 'brick', 'glass': 'panel', 'deco': 'plaster', 'pastel': 'plaster', 'apt': 'panel'}[style]
        sp = {'brick': 5.0, 'glass': 3.8, 'deco': 4.8, 'pastel': 5.6, 'apt': 6.0}[style]
        ww, wh = {'brick': (.46, .52), 'glass': (.86, .8), 'deco': (.42, .56), 'pastel': (.44, .52), 'apt': (.52, .46)}[style]
        gl = {'glass': (.25, .42, .58), 'deco': (.2, .28, .35)}.get(style, (.22, .3, .4))
        fm = facade_mat('fac_%s_%d_%d' % (style, int(wall[0] * 99), int(night)), wall, kind, sp, fh, ww, wh, gl, lit, base=z0 + sh_)
        trim = mat('trim_%s' % style, {'brick': (.85, .8, .72), 'glass': (.25, .27, .3), 'deco': (.95, .92, .85), 'pastel': (.97, .96, .93), 'apt': (.6, .6, .6)}[style], .5)
        body = box(name or 'bld', (w, d, H - sh_), (x, y, z0 + sh_ + (H - sh_) / 2), fm)
        # ledges on every floor (wrap all four sides) + cornice
        for k_ in range(1, floors):
            if style == 'glass' and k_ % 3: continue
            box('ledge', (w + .5, d + .5, .45), (x, y, z0 + sh_ + k_ * fh), trim, shadow=False)
        box('cornice', (w + 1.6, d + 1.6, 1.0), (x, y, top - .5), trim); box('cornice2', (w + .9, d + .9, .6), (x, y, top - 1.3), trim, shadow=False)
        # corner piers
        if style in ('brick', 'deco', 'pastel'):
            for sx_ in (-1, 1):
                for sy_ in (-1, 1): box('pier', (1.1, 1.1, H - sh_), (x + sx_ * (w / 2), y + sy_ * (d / 2), z0 + sh_ + (H - sh_) / 2), trim if style != 'brick' else mat('pierb', tuple(c * .85 for c in wall), .8))
        fy = y + (d / 2 if front == 1 else -d / 2); fs = 1 if front == 1 else -1
        if style == 'deco':        # vertical stone fins between window columns + stepped crown
            for k_ in range(int(w / sp) + 1):
                xx = x - w / 2 + k_ * sp + (sp / 2 - (x + y) % sp) % sp
                if abs(xx - x) < w / 2 - .5: box('fin', (.35, .5, H - sh_ - 1), (xx, fy + fs * .2, z0 + sh_ + (H - sh_) / 2), trim, shadow=False)
            box('crown1', (w * .7, d * .7, 3), (x, y, top + 1.5), mat('crownm', wall, .7)); box('crown2', (w * .4, d * .4, 3), (x, y, top + 4.5), mat('crownm', wall, .7))
            obj('spire', CONE16, (x, y, top + 8), (.8, .8, 3), m=trim); roof_top = top + 9
        elif style == 'glass':
            for k_ in range(int(w / 6.6)): box('gfin', (.25, .8, H - sh_), (x - w / 2 + 3.3 + k_ * 6.6, fy + fs * .4, z0 + sh_ + (H - sh_) / 2), trim, shadow=False)
            box('crownG', (w * .8, d * .8, 4), (x, y, top + 2), mat('crownGm', (.2, .24, .3), .3, .5)); roof_top = top + 4
            box('logo', (w * .4, .2, 2.2), (x, fy + fs * .5, top - 2.5), emit_mat('logom_%d' % (seed % 4), [(.3, .8, 1.), (1, .5, .2), (.6, 1, .5), (1, .3, .5)][seed % 4], 3.), shadow=False)
        else: roof_top = top
        roof_kit(x, y, w * (.7 if style in ('glass', 'deco') else 1.), d * (.7 if style in ('glass', 'deco') else 1.), roof_top if style not in ('glass', 'deco') else roof_top, r_, style) if style not in ('deco',) else None
        if style == 'brick' and floors >= 3: fire_escape(x + r_.uniform(-w / 5, w / 5), fy, fs, min(7., w * .4), floors, fh, z0 + sh_)
        if style == 'apt':         # balconies with railings, laundry, satellite dishes on the street side
            for k_ in range(1, floors):
                for j in range(max(1, int(w / 7.2))):
                    bx_ = x - w / 2 + 3.6 + j * 7.2; bz = z0 + sh_ + k_ * fh
                    box('balc', (5.6, 3.0, .35), (bx_, fy + fs * 1.5, bz), trim); box('balr', (5.6, .1, 2.0), (bx_, fy + fs * 2.95, bz + 1.15), glass_mat('balglass', (.5, .65, .7)), shadow=False)
                    box('balrt', (5.7, .2, .14), (bx_, fy + fs * 2.95, bz + 2.2), METAL(), shadow=False)
                    if r_.random() < .35: box('laundry', (2.6, .05, 1.2), (bx_ + .5, fy + fs * 2.4, bz + 2.6), pm(r_.choice(['white', 'sky', 'pink', 'yellow']), .8), shadow=False)
                    if r_.random() < .25: obj('dish', SPH, (bx_ - 2, fy + fs * 2.5, bz + 3.0), (.7, .25, .7), m=WHITE())
                    if r_.random() < .3: pot_plant(bx_ + 1.8, fy + fs * 2.0, bz + .2, .9, j + k_)
        if style == 'pastel':      # bay windows, shutters, flower boxes
            for k_ in range(floors):
                for j in range(max(1, int(w / sp))):
                    xx = x - w / 2 + sp / 2 + j * sp; zz = z0 + sh_ + k_ * fh + fh * .3
                    if abs(xx - x) > w / 2 - .6: continue
                    for sx_ in (-1, 1): box('shutter', (.8, .12, fh * .52), (xx + sx_ * sp * .3, fy + fs * .1, zz + fh * .26), pm(['teal', 'navy', 'forest', 'white'][seed % 4], .6), shadow=False)
                    if r_.random() < .55:
                        box('flowbox', (sp * .5, .7, .6), (xx, fy + fs * .4, zz - .3), wood_mat('fbw', (.5, .32, .2), 'XZ', .4, 3., .6, False), shadow=False)
                        for q in range(3): obj('flower', SPH, (xx - sp * .15 + q * sp * .15, fy + fs * .45, zz + .15), (.35, .35, .3), m=pm(r_.choice(['red', 'pink', 'yellow', 'purple']), .6), shadow=False)
        # ---- street level: shopfronts with awnings, lit interiors, signs; or a lobby
        if shops:
            box('shopbase', (w, d, sh_), (x, y, z0 + sh_ / 2), mat('shopbase_%d' % (seed % 3), [(.2, .2, .22), (.35, .25, .2), (.85, .82, .76)][seed % 3], .6))
            nshop = max(1, int(w / 11.))
            for j in range(nshop):
                sw_ = w / nshop; sx_ = x - w / 2 + sw_ * (j + .5); ac = AWN[(seed + j) % len(AWN)]
                box('shopwin', (sw_ - 2.6, .12, 5.4), (sx_ - 1.0, fy + fs * .06, z0 + 3.9), mat('shopin_%d' % ((seed + j) % 4), [(1, .82, .55), (.9, .95, 1.), (1, .75, .6), (.95, .9, .7)][(seed + j) % 4], .3, 0, [(1, .8, .5), (.85, .92, 1.), (1, .7, .5), (1, .9, .6)][(seed + j) % 4], .35 if not night else 2.5), shadow=False)
                for q in range(3): box('mullion', (.2, .2, 5.5), (sx_ - 1.0 - (sw_ - 2.6) / 2 + q * (sw_ - 2.6) / 2, fy + fs * .1, z0 + 3.9), DARKM(), shadow=False)
                box('kickp', (sw_ - 2.6, .2, 1.1), (sx_ - 1.0, fy + fs * .1, z0 + .55), DARKM(), shadow=False)
                box('shopdoor', (2.4, .2, 6.2), (sx_ + sw_ / 2 - 1.7, fy + fs * .12, z0 + 3.1), pm(['navy', 'forest', 'maroon', 'charcoal'][(seed + j) % 4], .5), shadow=False); box('doorknob', (.25, .3, .25), (sx_ + sw_ / 2 - 2.5, fy + fs * .3, z0 + 3.0), METAL(), shadow=False)
                aw = box('awning', (sw_ - .6, 3.4, .16), (sx_, fy + fs * 1.65, z0 + 7.4), stripe_mat('awn_%d' % ((seed + j) % 5), ac[0], ac[1], .55, 'XY', 1, .9), (fs * -18, 0, 0))
                box('awnval', (sw_ - .6, .1, .7), (sx_, fy + fs * 3.3, z0 + 6.5), mat('awv_%d' % ((seed + j) % 5), ac[0], .7), shadow=False)
                label(SHOPN[(seed * 3 + j) % len(SHOPN)], (sx_, fy + fs * .15, z0 + 8.35), .75, (1, .97, .9), (90, 0, 0 if fs < 0 else 180), 2., None, .03)
                if r_.random() < .4: sandwich_board(sx_ - sw_ / 3, fy + fs * 4.2, 0 if fs < 0 else 180, r_.choice(['OPEN', 'SALE', 'FRESH', 'WELCOME']))
        return top
    def street_block(x0, x1, y, front, seed, night=False, depth=(16, 24), minw=14, maxw=24, styles=('brick', 'pastel', 'deco', 'apt', 'glass'), fl=(2, 5)):
        """a continuous row of DIFFERENT detailed buildings between x0 and x1 with their street face at y"""
        r_ = random.Random(seed); x = x0; i = 0
        while x < x1 - 4:
            w = min(r_.uniform(minw, maxw), x1 - x); d = r_.uniform(*depth); st = styles[(seed + i) % len(styles)] if r_.random() < .6 else r_.choice(styles)
            fl_ = r_.randint(*fl) + (3 if st == 'glass' else 0)
            cy = y - d / 2 if front == 1 else y + d / 2
            bld(x + w / 2, cy, w - .2, d, fl_, st, seed * 31 + i, front, night)
            x += w; i += 1
    def far_city(cx, cy, n, r0, r1, a0, a1, seed, night=False):
        """background ring that is still detailed: facades, crowns, roof clutter (no plain boxes)"""
        r_ = random.Random(seed)
        for k_ in range(n):
            a = math.radians(r_.uniform(a0, a1)); dd = r_.uniform(r0, r1); x = cx + math.cos(a) * dd; y = cy + math.sin(a) * dd
            st = r_.choice(('glass', 'deco', 'apt', 'brick', 'glass')); w = r_.uniform(10, 18)
            bld(x, y, w, w * r_.uniform(.7, 1.), r_.randint(5, 14) + (6 if st == 'glass' else 0), st, seed * 97 + k_, -1, night, shops=False)

    # ===================================================== CHARACTERS
    CH = {}; FAMI = {}
    # the rig in base_rig.blend is only a TEMPLATE (every character is a copy of it). Park it far below the world.
    if arm0.animation_data: arm0.animation_data_clear()
    TMPL = Char(char_from_orig(), [], SK['light']); arm0.location = (0, 0, -900)
    def mk(nm, fam, skin, shirt, sleeve, pants, hair, shoes=(.1, .1, .12), scale=1.):
        c = Char(dup_char(nm), [], SK[skin], scale); c.dress(shirt, sleeve, SK[skin], pants, shoes, hair); CH[nm] = c; FAMI[nm] = fam; c.skin = SK[skin]; return c
    def bone_w(ch, bone, end='tail'):
        pb = ch.arm.pose.bones[bone]; return ch.arm.matrix_world @ (pb.tail if end == 'tail' else pb.head)
    def attach(o, ch, bone):
        bpy.context.view_layer.update(); mw = o.matrix_world.copy()
        o.parent = ch.arm; o.parent_type = 'BONE'; o.parent_bone = bone
        bpy.context.view_layer.update(); o.matrix_world = mw
        return o
    def bbox(o):
        cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
        return Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs))), Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs)))
    FASTATT = [True]
    def attachf(o, ch, bone):
        if not FASTATT[0]: return attach(o, ch, bone)
        pb = ch.arm.pose.bones[bone]
        pmx = ch.arm.matrix_world @ pb.matrix @ Matrix.Translation((0, pb.length, 0))
        o.parent = ch.arm; o.parent_type = 'BONE'; o.parent_bone = bone; o.matrix_parent_inverse = pmx.inverted()
        return o
    def _check_fast():
        t = TMPL; bpy.context.view_layer.update()
        o = box('chk', (1, 1, 1), (1.3, 2.1, 3.7), mat('chk', (1, 1, 1)), (10, 20, 30)); mw = Matrix.LocRotScale(o.location, o.rotation_euler, o.scale)
        attachf(o, t, 'Head'); bpy.context.view_layer.update()
        err = max(abs(a - b) for ra, rb in zip(o.matrix_world, mw) for a, b in zip(ra, rb))
        log('fast attach error', err)
        if err > 1e-3: FASTATT[0] = False
        o.parent = None; bpy.data.objects.remove(o)
    # ===================================================== CAST (every side character is a different person)
    def hbb(ch): mn, mx = bbox(ch.parts['Head']); return mn, mx, (mn + mx) / 2
    def tbb(ch): mn, mx = bbox(ch.parts['Torso']); return mn, mx, (mn + mx) / 2
    def hairdo(ch, style, col, col2=None):
        mn, mx, c = hbb(ch); u = ch.scale; w = mx.x - mn.x; d = mx.y - mn.y; top = mx.z; back = mn.y; front = mx.y; cx = c.x
        hm = mat('hr_%d_%d_%d' % tuple(int(x * 255) for x in col), col, .62)
        m2 = mat('hr2_%d_%d_%d' % tuple(int(x * 255) for x in (col2 or col)), col2 or col, .62)
        KM = {'b': CUBE, 's': SPH, 'c': CYL8, 'k': CONE}
        def B(sz, loc, rot=(0, 0, 0), k='b', m=None):
            return attachf(obj('hr_' + style, KM[k], loc, sz, rot, m or hm, None, True), ch, 'Head')
        def slab(h=.3, ext=.06):
            B(((w / 2 + ext * u) * 1.04, (d / 2 + ext * u) * 1.04, h * u * 1.25), (cx, c.y - .03 * u, top - .12 * u), (0, 0, 0), 's')
        def sides(hh=.5, z0=.28):
            for sx in (-1, 1): B((.14 * u, d * .62, hh * u), (cx + sx * (w / 2 + .04 * u), c.y - .12 * u, top - z0 * u - hh * u / 2 + .2 * u))
        def backp(hh=.7, th=.2):
            B((w + .1 * u, th * u, hh * u), (cx, back - .04 * u, top - hh * u / 2 + .02 * u))
        def fringe(hh=.2):
            for k_ in range(4):
                B((w * .16, .1 * u, hh * u * .75), (cx + (k_ - 1.5) * w * .25, front - .02 * u, top - hh * u * .55 + .02 * u * (k_ % 2)), (0, 0, 0), 's')
        if style == 'short':   slab(); backp(.7); sides(.5); fringe()
        elif style == 'swoop': slab(.34); backp(.7); sides(.5); B((w * .75, .2 * u, .28 * u), (cx - .12 * u, front + .03 * u, top - .08 * u), (0, 0, 18)); B((.3 * u, .2 * u, .34 * u), (cx + w / 2 - .08 * u, front + .02 * u, top - .1 * u))
        elif style == 'buzz':  B((w + .04 * u, d + .04 * u, .16 * u), (cx, c.y, top + .02 * u)); B((w + .04 * u, .08 * u, .5 * u), (cx, back - .01 * u, top - .25 * u))
        elif style == 'balding':
            backp(.5); sides(.35, .75)
            B((w * .55, .08 * u, .13 * u), (cx, back - .02 * u, top - .1 * u))
        elif style == 'long':  slab(); backp(2.3, .3); sides(2.0, .25); fringe(.26)
        elif style == 'bob':   slab(); backp(1.0, .3); sides(.95, .25); fringe(.26)
        elif style == 'wavy':
            slab(); backp(2.0, .32); sides(1.8, .25); fringe(.24)
            for i in range(4): B((w * .95, .12 * u, .36 * u), (cx, back - .24 * u, top - (.9 + i * .38) * u), (0, 0, 8 * (-1) ** i))
        elif style == 'ponytail':
            slab(); backp(.8); sides(.5); fringe(); B((.3 * u, .3 * u, 1.5 * u), (cx, back - .28 * u, top - .95 * u), (18, 0, 0), 'c'); B((.34 * u, .34 * u, .18 * u), (cx, back - .1 * u, top - .25 * u), (0, 0, 0), 'c', m2)
        elif style == 'pigtails':
            slab(); backp(.7); fringe(.22)
            for sx in (-1, 1):
                B((.36 * u, .34 * u, .4 * u), (cx + sx * (w / 2 + .3 * u), c.y - .15 * u, top - .55 * u), (0, sx * 20, 0), 's'); B((.3 * u, .3 * u, .36 * u), (cx + sx * (w / 2 + .45 * u), c.y - .15 * u, top - 1.05 * u), (0, sx * 25, 0), 's'); B((.16 * u, .16 * u, .16 * u), (cx + sx * (w / 2 + .2 * u), c.y - .15 * u, top - .3 * u), (0, 0, 0), 's', m2)
        elif style == 'braids':
            slab(); backp(.8); sides(.5); fringe(.2)
            for sx in (-1, 1):
                for j in range(5): B((.3 * u, .3 * u, .3 * u), (cx + sx * (w / 2 + .24 * u), c.y - .1 * u, top - (.5 + j * .3) * u), (0, 0, 0), 's')
        elif style == 'afro':  B((w * .88, d * .84, .95 * u), (cx, c.y - .06 * u, top - .12 * u), (0, 0, 0), 's')
        elif style == 'curly':
            slab(.2)
            rr = random.Random(int(col[0] * 100 + col[1] * 10))
            for i in range(16):
                a = i / 16 * 2 * math.pi; rad = .5 * u
                B((.3 * u, .3 * u, .3 * u), (cx + math.cos(a) * rad * 1.0, c.y + math.sin(a) * rad * .9 - .05 * u, top - .05 * u + rr.uniform(-.1, .15) * u), (0, 0, 0), 's')
            for i in range(5): B((.32 * u, .32 * u, .32 * u), (cx + rr.uniform(-.35, .35) * u, c.y + rr.uniform(-.3, .3) * u, top + .22 * u), (0, 0, 0), 's')
        elif style == 'spiky':
            slab(.26); backp(.55); sides(.4)
            for i in range(7): B((.3 * u, .3 * u, .6 * u), (cx + (i - 3) * .27 * u, c.y + [.1, -.1][i % 2] * u, top + .35 * u), (0, 0, 0), 'k')
        elif style == 'mohawk':
            sides(.3, .3)
            for i in range(5): B((.2 * u, .3 * u, .55 * u), (cx, c.y + (i - 2) * .3 * u, top + .2 * u - abs(i - 2) * .05 * u))
        elif style == 'bun':
            slab(); backp(.7); sides(.5); fringe(); B((.34 * u, .34 * u, .34 * u), (cx, back + .1 * u, top + .3 * u), (0, 0, 0), 's')
        elif style == 'beanie':
            B((w + .14 * u, d + .14 * u, .5 * u), (cx, c.y, top + .02 * u), (0, 0, 0), 'b', m2); B((w + .2 * u, d + .2 * u, .2 * u), (cx, c.y, top - .22 * u), (0, 0, 0), 'b', hm)
            B((.22 * u, .22 * u, .22 * u), (cx, c.y, top + .36 * u), (0, 0, 0), 's', hm); B((w, .12 * u, .3 * u), (cx, back, top - .3 * u), (0, 0, 0), 'b', hm)
        elif style in ('cap_f', 'cap_b'):
            B((w + .1 * u, d + .1 * u, .42 * u), (cx, c.y, top + .0 * u), (0, 0, 0), 'b', hm)
            yy = front + .32 * u if style == 'cap_f' else back - .32 * u
            B((w * .86, .7 * u, .08 * u), (cx, yy, top - .16 * u), (0, 0, 0), 'b', m2); B((w + .06 * u, d + .06 * u, .12 * u), (cx, c.y, top - .15 * u), (0, 0, 0), 'b', m2)
            B((w * .9, .08 * u, .5 * u), (cx, back - .02 * u, top - .25 * u))
        elif style == 'chef':
            B((w + .08 * u, d + .08 * u, .24 * u), (cx, c.y, top + .0 * u), (0, 0, 0), 'b', hm); B((w * 1.05, d * 1.05, .75 * u), (cx, c.y, top + .55 * u), (0, 0, 0), 'b', hm)
        elif style == 'bald': pass
        return
    def specs_on(ch, kind, col=(.1, .1, .12)):
        mn, mx, c = hbb(ch); u = ch.scale; gm = mat('gl_%d_%d_%d' % tuple(int(x * 255) for x in col), col, .3)
        zz = c.z - .05 * u
        if kind == 'round':
            for sx in (-.3, .3): attachf(obj('glass', CYL8, (c.x + sx * u, mx.y + .04 * u, zz), (.24 * u, .24 * u, .05 * u), (90, 0, 0), gm), ch, 'Head')
            attachf(box('glassbr', (.3 * u, .05 * u, .05 * u), (c.x, mx.y + .05 * u, zz + .02 * u), gm), ch, 'Head')
        else:
            for sx in (-.3, .3):
                for (bw, bh, ox_, oz_) in ((.42, .05, 0, .15), (.42, .05, 0, -.15), (.05, .3, -.19, 0), (.05, .3, .19, 0)):
                    attachf(box('glassF', (bw * u, .05 * u, bh * u), (c.x + (sx + ox_) * u, mx.y + .04 * u, zz + oz_ * u), gm), ch, 'Head')
            attachf(box('glassbr', (.3 * u, .05 * u, .05 * u), (c.x, mx.y + .05 * u, zz + .05 * u), gm), ch, 'Head')
        for sx in (-1, 1): attachf(box('glassarm', (.05 * u, .6 * u, .05 * u), (c.x + sx * (.6 * u), c.y + .3 * u, zz + .03 * u), gm), ch, 'Head')
    def facehair(ch, kind, col):
        mn, mx, c = hbb(ch); u = ch.scale; fm = mat('fh_%d_%d_%d' % tuple(int(x * 255) for x in col), col, .8)
        if kind in ('stache', 'full'): attachf(box('mous', (.62 * u, .07 * u, .15 * u), (c.x, mx.y + .03 * u, c.z - .3 * u), fm), ch, 'Head')
        if kind == 'full':
            attachf(box('beard', ((mx.x - mn.x) * .96, .08 * u, .3 * u), (c.x, mx.y + .03 * u, c.z - .46 * u), fm), ch, 'Head')
            for sx in (-1, 1): attachf(box('beardS', (.08 * u, .5 * u, .55 * u), (c.x + sx * (.58 * u), c.y + .1 * u, c.z - .22 * u), fm), ch, 'Head')
        if kind == 'goatee': attachf(box('goat', (.3 * u, .07 * u, .3 * u), (c.x, mx.y + .03 * u, c.z - .5 * u), fm), ch, 'Head')
    def headband(ch, col):
        mn, mx, c = hbb(ch); u = ch.scale; hm_ = mat('hb_%d_%d_%d' % tuple(int(x * 255) for x in col), col, .6)
        attachf(box('hband', (mx.x - mn.x + .16 * u, mx.y - mn.y + .16 * u, .16 * u), (c.x, c.y, mx.z - .22 * u), hm_), ch, 'Head')
    def bow(ch, col, side=0):
        mn, mx, c = hbb(ch); u = ch.scale; bm = mat('bw_%d_%d_%d' % tuple(int(x * 255) for x in col), col, .5)
        for sx in (-1, 1): attachf(obj('bow', SPH, (c.x + side * u + sx * .2 * u, mx.y - .1 * u, mx.z + .06 * u), (.22 * u, .12 * u, .16 * u), m=bm), ch, 'Head')
        attachf(obj('bowk', SPH, (c.x + side * u, mx.y - .1 * u, mx.z + .06 * u), (.1 * u, .1 * u, .1 * u), m=bm), ch, 'Head')
    def tfront(ch, name, size, off, col, rough=.6, bone='Uppertorso', k='b'):
        tmn, tmx, tc = tbb(ch); u = ch.scale; mm = mat('tf_%s_%d_%d_%d' % (name, *[int(x * 255) for x in col]), col, rough)
        return attachf(obj(name, CUBE if k == 'b' else SPH, (tc.x + off[0] * u, tmx.y + off[1] * u, tc.z + off[2] * u), (size[0] * u, size[1] * u, size[2] * u), (0, 0, 0), mm), ch, bone)
    def tback(ch, name, size, off, col, bone='Uppertorso'):
        tmn, tmx, tc = tbb(ch); u = ch.scale; mm = mat('tb_%s_%d_%d_%d' % (name, *[int(x * 255) for x in col]), col, .6)
        return attachf(obj(name, CUBE, (tc.x + off[0] * u, tmn.y + off[1] * u, tc.z + off[2] * u), (size[0] * u, size[1] * u, size[2] * u), (0, 0, 0), mm), ch, bone)
    def mk2(nm, fam, skin, scale, top, sleeve, legs, shoes, hair, extra=()):
        """top: rgb or stop list [(pos,rgb)...]; legs: rgb | ('shorts', rgb, sock) | ('skirt', rgb) ; hair=(style,col[,col2]) or None"""
        c = Char(dup_char(nm), [], SK[skin], scale); CH[nm] = c; FAMI[nm] = fam; c.skin = SK[skin]
        stops = top if isinstance(top, list) else [(0, top)]
        set_obj_mat(c.parts['Torso'], outfit_material(nm + '_torso', stops))
        armm = outfit_material(nm + '_arm', [(0, SK[skin]), (.43, sleeve)] if sleeve is not None else [(0, SK[skin])])
        set_obj_mat(c.parts['Left Arm'], armm); set_obj_mat(c.parts['Right Arm'], armm)
        if isinstance(legs, tuple) and legs[0] == 'shorts':
            lst = [(0, shoes), (.14, legs[2]), (.3, SK[skin]), (.6, legs[1])]
        elif isinstance(legs, tuple) and legs[0] == 'skirt':
            lst = [(0, shoes), (.14, legs[2] if len(legs) > 2 else (.95, .95, .95)), (.3, SK[skin])]
        else: lst = [(0, shoes), (.17, legs)]
        legm = outfit_material(nm + '_leg', lst)
        set_obj_mat(c.parts['Left Leg'], legm); set_obj_mat(c.parts['Right Leg'], legm)
        if 'cap' in c.parts: c.parts['cap'].hide_render = True; c.parts['cap'].hide_viewport = True
        if 'hair' in c.parts: c.parts['hair'].hide_render = True; c.parts['hair'].hide_viewport = True
        bpy.context.view_layer.update()
        if hair: hairdo(c, *hair)
        if callable(extra): extra = (extra,)
        for e in extra: e(c)
        return c
    def rgb(h):  # '#rrggbb' -> linear-ish rgb tuple (matches PAL style values, 0..1 sRGB-ish)
        return tuple(int(h[i:i + 2], 16) / 255. for i in (1, 3, 5))
    def stripes(c1, c2, n=6):   # horizontal bands for a tee
        return [(i / n, c1 if i % 2 == 0 else c2) for i in range(n)]
    def skirt(col, h=1.0):
        def f(c):
            tmn, tmx, tc = tbb(c); u = c.scale; sm_ = mat('sk_%d_%d_%d' % tuple(int(x * 255) for x in col), col, .7)
            attachf(box('skirt', (2.12 * u, 1.12 * u, h * u), (tc.x, tc.y, tmn.z - h * u / 2 + .22 * u), sm_), c, 'Hips')
        return f
    def X(fn, *a): return lambda c: fn(c, *a)

    _check_fast()
    # ---------------- ROUND HAIR (smooth sphere clumps — closer to the reference hair than the old blocks)
    def hair_round(ch, style, col, col2=None, seed=0):
        mn, mx, c = hbb(ch); u = ch.scale; w = mx.x - mn.x; d = mx.y - mn.y; top = mx.z; back = mn.y; front = mx.y; cx = c.x
        hm = mat('hrr_%d_%d_%d' % tuple(int(x * 255) for x in col), col, .55)
        m2 = mat('hrr2_%d_%d_%d' % tuple(int(x * 255) for x in (col2 or col)), col2 or col, .5)
        rr = random.Random(seed + int(col[0] * 97))
        def S_(rad, loc, rot=(0, 0, 0), m=None):
            return attachf(obj('hr_' + style, SPH, loc, rad, rot, m or hm, None, True), ch, 'Head')
        def dome(h=.42, ext=.1):
            S_((w / 2 + ext * u, d / 2 + ext * u, h * u), (cx, c.y - .05 * u, top - .14 * u))
        def backp(h=.62, z=.55, th=.34):
            S_((w / 2 + .05 * u, th * u, h * u), (cx, back + .14 * u, top - z * u))
        def sides(h=.42, z=.45, th=.17):
            for sx in (-1, 1): S_((th * u, d * .42, h * u), (cx + sx * (w / 2 + .01 * u), c.y - .12 * u, top - z * u))
        def fringe(n=5, sz=.2, drop=.2, tilt=14):
            for k in range(n):
                f_ = (k - (n - 1) / 2) / max(1, (n - 1) / 2)
                S_((sz * u * (1.15 - .25 * abs(f_)), .15 * u, sz * .85 * u), (cx + f_ * (w / 2 - .12 * u), front - .02 * u, top - drop * u - .07 * u * (k % 2)), (0, f_ * tilt + rr.uniform(-6, 6), 0))
        if style == 'r_short': dome(); backp(); sides(); fringe()
        elif style == 'r_swoop':
            dome(.46); backp(); sides(.38)
            S_((.55 * u, .22 * u, .25 * u), (cx - .18 * u, front + .0 * u, top - .1 * u), (0, 16, 0)); S_((.3 * u, .2 * u, .22 * u), (cx + w / 2 - .18 * u, front - .02 * u, top - .16 * u), (0, -20, 0))
        elif style == 'r_bun':
            dome(.4); backp(.58); sides(.4); fringe(4, .18, .24, 22); S_((.36 * u, .36 * u, .32 * u), (cx, back + .18 * u, top + .1 * u), (0, 0, 0), m2 if col2 else None)
        elif style == 'r_long':
            dome(.42); sides(1.05, 1.0, .2); fringe(5, .2, .2)
            S_((w / 2 + .06 * u, .32 * u, 1.35 * u), (cx, back + .12 * u, top - 1.2 * u))
            for sx in (-1, 1): S_((.22 * u, .3 * u, .9 * u), (cx + sx * (w / 2 - .05 * u), back + .45 * u, top - 1.55 * u))
        elif style == 'r_bob':
            dome(.44); fringe(5, .2, .2); S_((w / 2 + .1 * u, .36 * u, .85 * u), (cx, back + .14 * u, top - .72 * u))
            for sx in (-1, 1): S_((.2 * u, d * .46, .72 * u), (cx + sx * (w / 2 + .02 * u), c.y - .1 * u, top - .7 * u))
        elif style == 'r_pony':
            dome(.4); backp(.5); sides(.36); fringe(4, .17, .22, 18)
            S_((.24 * u, .24 * u, .24 * u), (cx, back - .05 * u, top - .3 * u), (0, 0, 0), m2 if col2 else None)
            for j in range(4): S_(((.26 - j * .03) * u, (.24 - j * .03) * u, .3 * u), (cx, back - .22 * u - j * .08 * u, top - .55 * u - j * .38 * u))
        elif style == 'r_curly':
            dome(.3, .05)
            for i in range(14):
                a_ = i / 14 * 2 * math.pi
                S_((.27 * u, .27 * u, .25 * u), (cx + math.cos(a_) * (w / 2 - .02 * u), c.y + math.sin(a_) * (d / 2 - .05 * u) - .05 * u, top - .12 * u + rr.uniform(-.08, .1) * u))
            for i in range(6): S_((.3 * u, .3 * u, .26 * u), (cx + rr.uniform(-.35, .35) * u, c.y + rr.uniform(-.3, .25) * u, top + .1 * u))
            backp(.5, .5)
        elif style == 'r_spiky':
            dome(.38); backp(); sides(.38)
            for i in range(6): S_((.2 * u, .2 * u, .42 * u), (cx + (i - 2.5) * .22 * u, c.y + (.12 if i % 2 else -.12) * u, top + .18 * u), (rr.uniform(-20, 20), (i - 2.5) * 9, 0))
        elif style == 'r_balding':
            backp(.42, .7); sides(.3, .65)
        return
    def shades(ch, col=(.05, .05, .06)):
        mn, mx, c = hbb(ch); u = ch.scale; gm = mat('shade_lens', col, .08, .3); fm_ = mat('shade_fr', (.9, .75, .3), .3, 1.)
        zz = c.z - .05 * u
        for sx in (-.29, .29): attachf(box('shadeL', (.46 * u, .05 * u, .3 * u), (c.x + sx * u, mx.y + .05 * u, zz), gm), ch, 'Head')
        attachf(box('shadebr', (.18 * u, .05 * u, .05 * u), (c.x, mx.y + .06 * u, zz + .08 * u), fm_), ch, 'Head')
        for sx in (-1, 1): attachf(box('shadearm', (.05 * u, .6 * u, .05 * u), (c.x + sx * (.56 * u), c.y + .3 * u, zz + .05 * u), fm_), ch, 'Head')
    def goggles(ch):
        mn, mx, c = hbb(ch); u = ch.scale; bm = mat('gog_band', (.1, .1, .12), .6); lm = mat('gog_lens', (.3, .75, .9), .1, .2, (.2, .6, .8), .6)
        attachf(box('gogband', (mx.x - mn.x + .14 * u, mx.y - mn.y + .14 * u, .14 * u), (c.x, c.y, mx.z - .18 * u), bm), ch, 'Head')
        for sx in (-.27, .27): attachf(obj('goglens', CYL8, (c.x + sx * u, mx.y + .1 * u, mx.z - .16 * u), (.22 * u, .22 * u, .14 * u), (90, 0, 0), lm), ch, 'Head')
    def medal(ch):
        tmn, tmx, tc = tbb(ch); u = ch.scale
        for sx in (-1, 1): attachf(box('medr', (.14 * u, .05 * u, .9 * u), (tc.x + sx * .25 * u, tmx.y + .05 * u, tc.z + .45 * u), mat('medrib', (.15, .3, .85), .6), (0, sx * -20, 0)), ch, 'Uppertorso')
        attachf(obj('medal', CYL, (tc.x, tmx.y + .08 * u, tc.z + .05 * u), (.26 * u, .26 * u, .06 * u), (90, 0, 0), GOLD), ch, 'Uppertorso')
    def mkr(nm, fam, skin, scale, top, sleeve, legs, shoes, hair, extra=()):
        """mk2 with the new round hair"""
        c = mk2(nm, fam, skin, scale, top, sleeve, legs, shoes, None, extra)
        if hair: hair_round(c, *hair)
        return c
    def hand_prop(ch, bone, build, scale_fn):
        tip = bone_w(ch, bone); o = build(tip); attachf(o, ch, bone); o.rotation_mode = 'XYZ'
        s0 = tuple(o.scale)
        for i in range(3): bake_fn(o, 'scale', i, lambda t, i=i: max(.001, scale_fn(t)) * s0[i], 'LINEAR')
        return o
    def phone_build(tip):
        e = empty('phone', (tip.x, tip.y + .45, tip.z + .25))
        box('ph_body', (1.0, .12, 1.8), (0, 0, 0), mat('phone_b', (.04, .04, .06), .25, .4), (0, 0, 0), e)
        box('ph_scr', (.88, .04, 1.62), (0, .07, 0), mat('phone_s', (.1, .5, .3), .2, 0, (.2, .9, .5), 2.5), parent=e, shadow=False)
        return e
    def phone_build2(tip):     # phone held to the ear (screen dark)
        e = empty('phone2', (tip.x, tip.y + .3, tip.z + .2))
        box('ph_body', (.2, 1.0, 1.8), (0, 0, 0), mat('phone_b', (.04, .04, .06), .25, .4), (0, 0, 0), e)
        return e
    def cam_build(tip):
        e = empty('papcam', (tip.x, tip.y + .3, tip.z + .1))
        box('pc_body', (1.0, .6, .7), (0, 0, 0), mat('pcam_b', (.05, .05, .07), .3, .5), parent=e); obj('pc_lens', CYL8, (0, .5, 0), (.28, .28, .5), (90, 0, 0), mat('pcam_l', (.2, .25, .35), .1, .7), e)
        box('pc_flash', (.4, .15, .2), (-.2, .1, .5), WHITE(), parent=e)
        return e

    # ===================================================== IMPORTED ROBLOX AVATARS (packs/c<id>/<id>.obj) -> rigged characters
    # Each folder N/ has N.obj + textures (Roblox "Export" of an avatar). We split it into body parts, stand it up facing +Y,
    # and skin it to a copy of the Blocky Rig so every pose/walk/gesture in the library works on it.
    CHARDIR = os.path.join(HERE, 'packs')
    # per-avatar fixes found by eye: extra yaw (degrees) when the export faces the wrong way
    IMP_YAW = {'1': 180, '5': 180, '7': 180, '10': 180, '11': 180}      # shipped avatars that come in facing backwards; add yours if needed
    # which emotion-face family suits each avatar (faces2 pack: E_<fam>_<emotion>.png)
    IMP_FAM = {'1': 'tom', '2': 'pr', '3': 'mom', '4': 'tom', '5': 'pr', '6': 'npc', '7': 'pr', '9': 'npc', '10': 'npc', '11': 'npc', '12': 'npc', '13': 'mom', '14': 'tom', '15': 'pr'}   # eye style per shipped avatar; default 'npc'
    def _bb(objs):
        mn = Vector((1e9, 1e9, 1e9)); mx = -mn
        for o in objs:
            for v in o.data.vertices:
                w = o.matrix_world @ v.co
                mn = Vector((min(mn.x, w.x), min(mn.y, w.y), min(mn.z, w.z))); mx = Vector((max(mx.x, w.x), max(mx.y, w.y), max(mx.z, w.z)))
        return mn, mx
    def imp_char(nm, cid, scale=1.0):
        path = os.path.join(CHARDIR, 'c%s' % cid, '%s.obj' % cid)
        before = set(bpy.data.objects)
        bpy.ops.wm.obj_import(filepath=path, forward_axis='NEGATIVE_Z', up_axis='Y', use_split_groups=True, use_split_objects=True)
        new = [o for o in bpy.data.objects if o not in before and o.type == 'MESH' and len(o.data.vertices)]
        for o in new:
            for c in list(o.users_collection): c.objects.unlink(o)
            COL.objects.link(o)
        bpy.context.view_layer.update()
        acc = [o for o in new if o.name.split('.')[0].startswith('Handle')]
        body = [o for o in new if o not in acc]
        mn0, mx0 = _bb(body); H0 = mx0.z - mn0.z; c0 = (mn0 + mx0) / 2
        groups = {'Torso': [], 'Head': [], 'Left Arm': [], 'Right Arm': [], 'Left Leg': [], 'Right Leg': []}
        if len(body) == 6:
            # ---- classic R6: classify by shape, then rebuild the standard layout (fixes odd exports)
            info = []
            for o in body:
                mn, mx = _bb([o]); info.append([o, mn, mx, (mn + mx) / 2])
            head = max(info, key=lambda t: t[3].z); rest = [t for t in info if t is not head]
            torso = min(rest, key=lambda t: math.hypot(t[3].x - head[3].x, t[3].y - head[3].y) + .3 * abs(t[2].z - head[1].z)); limbs = [t for t in rest if t is not torso]
            limbs.sort(key=lambda t: -t[3].z); arms, legs = limbs[:2], limbs[2:]
            if abs(arms[0][3].z - arms[1][3].z) > .3 or abs(legs[0][3].z - legs[1][3].z) > .3:
                limbs.sort(key=lambda t: -(t[2].z)); arms, legs = limbs[:2], limbs[2:]
            td = torso[2] - torso[1]; tc = torso[3]
            lat = Vector((1, 0, 0)) if td.x >= td.y else Vector((0, 1, 0))
            yaw = (0. if td.x >= td.y else 90.) + IMP_YAW.get(str(cid), 0.)
            R = Matrix.Rotation(math.radians(yaw), 4, 'Z'); k = min(2.0 / td.z, 1.25)
            M = Matrix.Scale(k, 4) @ R @ Matrix.Translation((-tc.x, -tc.y, -tc.z))
            for o in new:
                o.data.transform(M @ o.matrix_world); o.matrix_world = Matrix()
            def place(o, tx, top=None, bottom=None):
                mn, mx = _bb([o]); c = (mn + mx) / 2
                dz = (top - mx.z) if top is not None else (bottom - mn.z)
                o.data.transform(Matrix.Translation((tx - c.x, -c.y, dz)))
            T = torso[0]; tmn, tmx = _bb([T]); thw = (tmx.x - tmn.x) / 2; ttop, tbot = tmx.z, tmn.z
            for t in arms:
                mn, mx = _bb([t[0]]); c = (mn + mx) / 2; w = (mx.x - mn.x) / 2
                sgn = -1 if c.x < 0 else 1
                place(t[0], sgn * (thw + w), top=ttop); groups['Left Arm' if sgn < 0 else 'Right Arm'].append(t[0])
            if (arms[0][0] in groups['Left Arm']) == (arms[1][0] in groups['Left Arm']):    # both on one side -> split
                a0, a1 = arms[0][0], arms[1][0]; groups['Left Arm'] = [a0]; groups['Right Arm'] = [a1]
                w0 = (_bb([a0])[1].x - _bb([a0])[0].x) / 2; place(a0, -(thw + w0), top=ttop); place(a1, thw + w0, top=ttop)
            for t in legs:
                mn, mx = _bb([t[0]]); c = (mn + mx) / 2; w = (mx.x - mn.x) / 2
                sgn = -1 if c.x < 0 else 1
                place(t[0], sgn * w, top=tbot); groups['Left Leg' if sgn < 0 else 'Right Leg'].append(t[0])
            if (legs[0][0] in groups['Left Leg']) == (legs[1][0] in groups['Left Leg']):
                l0, l1 = legs[0][0], legs[1][0]; groups['Left Leg'] = [l0]; groups['Right Leg'] = [l1]
                w0 = (_bb([l0])[1].x - _bb([l0])[0].x) / 2; place(l0, -w0, top=tbot); place(l1, w0, top=tbot)
            hmn, hmx = _bb([head[0]]); hc = (hmn + hmx) / 2; hdz = ttop - hmn.z + .0
            for o in [head[0]] + acc:      # head + hats/hair keep their relative placement
                o.data.transform(Matrix.Translation((-hc.x, -hc.y, hdz)))
            groups['Head'].append(head[0]); groups['Torso'].append(T)
            fmn, _ = _bb(body)
            for o in new: o.data.transform(Matrix.Translation((0, 0, -fmn.z)))
        else:
            # ---- R15 and other multi-part bodies: principal axis of the parts = shoulders
            cs = [(_bb([o])[0] + _bb([o])[1]) / 2 for o in body]
            mx_ = sum(c.x for c in cs) / len(cs); my_ = sum(c.y for c in cs) / len(cs)
            sxx = sum((c.x - mx_) ** 2 for c in cs); syy = sum((c.y - my_) ** 2 for c in cs); sxy = sum((c.x - mx_) * (c.y - my_) for c in cs)
            ang = .5 * math.atan2(2 * sxy, sxx - syy)
            yaw = -math.degrees(ang) + IMP_YAW.get(str(cid), 0.)
            R = Matrix.Rotation(math.radians(yaw), 4, 'Z'); k = min(5.1 / max(H0, 1.), 1.25)
            M = Matrix.Scale(k, 4) @ R @ Matrix.Translation((-mx_, -my_, -mn0.z))
            for o in new:
                o.data.transform(M @ o.matrix_world); o.matrix_world = Matrix()
            cand = []
            mn0, mx0 = _bb(body); H0 = mx0.z - mn0.z
            for o in body:
                mn, mx = _bb([o]); c = (mn + mx) / 2
                if mx.z < mx0.z - .15 * H0 and mn.z > mn0.z + .2 * H0: cand.append((abs(c.x) - .1 * (mx.z - mn.z), o))
            torso0 = min(cand, key=lambda t: t[0])[1]
            tmn, tmx = _bb([torso0]); thw = (tmx.x - tmn.x) / 2
            for o in body:
                mn, mx = _bb([o]); c = (mn + mx) / 2
                if o is torso0: groups['Torso'].append(o)
                elif mn.z >= tmx.z - .35 and abs(c.x) < thw: groups['Head'].append(o)
                elif abs(c.x) > thw - .02 and mx.z > tmn.z + .3: groups['Left Arm' if c.x < 0 else 'Right Arm'].append(o)
                elif abs(c.x) > thw * 1.05 and mn.z > mn0.z + .2 * H0: groups['Left Arm' if c.x < 0 else 'Right Arm'].append(o)   # R15 hands hang beside the hips
                elif mx.z <= tmn.z + .35 and abs(c.x) > .02: groups['Left Leg' if c.x < 0 else 'Right Leg'].append(o)
                else: groups['Torso'].append(o)
        bpy.context.view_layer.update()
        gb = {g: _bb(v) for g, v in groups.items() if v}
        # key heights of THIS avatar (rig reference: hips 2.0, neck 4.0, shoulder top 4.0)
        hip_m = gb['Left Leg'][1].z if 'Left Leg' in gb else 2.0
        neck_m = gb['Torso'][1].z if 'Torso' in gb else 4.0
        def zmap(z):
            if z <= 2.0: return z * hip_m / 2.0
            s_ = (neck_m - hip_m) / 2.0
            return hip_m + (z - 2.0) * s_
        armx = (abs((gb['Left Arm'][0].x + gb['Left Arm'][1].x) / 2) if 'Left Arm' in gb else 1.5)
        legx = (abs((gb['Left Leg'][0].x + gb['Left Leg'][1].x) / 2) if 'Left Leg' in gb else .49)
        arm_top = gb['Left Arm'][1].z if 'Left Arm' in gb else neck_m
        rig = dup_char(nm)
        for p in list(rig['parts'].values()):
            for c in list(p.users_collection): c.objects.unlink(p)
        a = rig['arm']; parts = {}
        # fit the skeleton to this body: its own armature data, joints moved to the avatar's shoulders/hips/heights
        a.data = a.data.copy()
        bpy.ops.object.select_all(action='DESELECT'); a.hide_set(False); a.select_set(True); bpy.context.view_layer.objects.active = a
        bpy.ops.object.mode_set(mode='EDIT')
        sh_dz = (arm_top - .51 * (neck_m - hip_m) / 2.0) - zmap(3.49)
        for eb in a.data.edit_bones:
            n_ = eb.name
            side = -1 if n_.endswith('.L') or '.L.' in n_ else (1 if n_.endswith('.R') or '.R.' in n_ else 0)
            isarm = any(t in n_ for t in ('arm', 'Arm', 'Hand'))
            isleg = any(t in n_ for t in ('leg', 'Leg', 'Foot', 'Feet', 'Left.', 'Right.', 'Sider', 'Back.'))
            for end_ in (eb.head, eb.tail):
                z0 = end_.z; end_.z = zmap(z0)
                if side and isarm: end_.x += side * (armx - 1.5); end_.z += sh_dz
                elif side and isleg: end_.x += side * (legx - .49)
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.context.view_layer.update()
        def wz(v, cuts):   # piecewise bone weights by height with soft blends
            out = []
            for (b, lo, hi) in cuts:
                if lo - .12 <= v.z <= hi + .12:
                    w = 1.
                    if v.z < lo + .12: w = min(w, (v.z - (lo - .12)) / .24)
                    if v.z > hi - .12: w = min(w, ((hi + .12) - v.z) / .24)
                    out.append((b, max(0., min(1., w))))
            return out or [(cuts[0][0], 1.)]
        def jz(b, end='head'): return (a.data.bones[b].head_local if end == 'head' else a.data.bones[b].tail_local).z
        CUTS = {}
        for sd in ('L', 'R'):
            g = 'Left' if sd == 'L' else 'Right'
            CUTS[g + ' Arm'] = [('Upperarm.' + sd, jz('Lowerarm.' + sd), 99), ('Lowerarm.' + sd, jz('Hand.' + sd), jz('Lowerarm.' + sd)), ('Hand.' + sd, -99, jz('Hand.' + sd))]
            CUTS[g + ' Leg'] = [('Upperleg.' + sd, jz('Lowerleg.' + sd), 99), ('Lowerleg.' + sd, jz('Foot.' + sd), jz('Lowerleg.' + sd)), ('Foot.' + sd, -99, jz('Foot.' + sd))]
        CUTS['Torso'] = [('Uppertorso', jz('Uppertorso'), 99), ('Lowertorso', -99, jz('Uppertorso'))]
        for gname, objs in groups.items():
            if not objs: continue
            if len(objs) > 1:
                bpy.ops.object.select_all(action='DESELECT')
                for o in objs: o.select_set(True)
                bpy.context.view_layer.objects.active = objs[0]
                bpy.ops.object.join()
            o = objs[0]; o.name = nm + '_' + gname
            if gname == 'Head':
                hb = a.pose.bones['Head']
                o.parent = a; o.parent_type = 'BONE'; o.parent_bone = 'Head'
                o.matrix_parent_inverse = (a.matrix_world @ hb.matrix @ Matrix.Translation((0, hb.length, 0))).inverted()
            else:
                for v in o.data.vertices:
                    for b, w in wz(v.co, CUTS[gname]):
                        vg = o.vertex_groups.get(b) or o.vertex_groups.new(name=b); vg.add([v.index], w, 'REPLACE')
                o.parent = a; o.matrix_parent_inverse = a.matrix_world.inverted()
                md = o.modifiers.new('Armature', 'ARMATURE'); md.object = a
            parts[gname] = o
        hd = parts.get('Head')
        for i, o in enumerate(acc):    # hair/hats ride the head; low accessories (backpacks, belts) ride the upper torso
            mn, mx = _bb([o]); c = (mn + mx) / 2
            bone = 'Head' if (hd is None or c.z > 3.75) else 'Uppertorso'
            pb = a.pose.bones[bone]
            o.parent = a; o.parent_type = 'BONE'; o.parent_bone = bone
            o.matrix_parent_inverse = (a.matrix_world @ pb.matrix @ Matrix.Translation((0, pb.length, 0))).inverted()
            o.name = nm + '_acc%d' % i; parts['acc%d' % i] = o
        for o in parts.values():
            for s in o.material_slots:
                m = s.material
                if m and m.node_tree:
                    b = m.node_tree.nodes.get('Principled BSDF')
                    if b:
                        try: b.inputs['Roughness'].default_value = .6; b.inputs['Specular IOR Level'].default_value = .3
                        except Exception: pass
        # emotion faces: a 'Face' UV projected on the head front (back/sides get no face), skin = the head texture's average colour
        skin = (.9, .75, .55)
        if hd is not None:
            me = hd.data; mn_, mx_ = _bb([hd]); w_ = max(1e-3, mx_.x - mn_.x); h_ = max(1e-3, mx_.z - mn_.z)
            fw_ = min(w_, h_) * .98; cx_ = (mn_.x + mx_.x) / 2; cz_ = (mn_.z + mx_.z) / 2
            uvl = me.uv_layers.new(name='Face')
            for poly in me.polygons:
                front = poly.normal.y > .25
                for li in poly.loop_indices:
                    co = me.vertices[me.loops[li].vertex_index].co
                    uvl.data[li].uv = ((.5 + (cx_ - co.x) / fw_), (.5 + (co.z - cz_) / fw_)) if front else (-5., -5.)
            try:
                for s_ in hd.material_slots:
                    img = next((nd.image for nd in s_.material.node_tree.nodes if nd.type == 'TEX_IMAGE' and nd.image), None) if s_.material else None
                    if img is None: continue
                    px = list(img.pixels[:]); n_ = len(px) // 4; good = []
                    for i in range(0, n_, max(1, n_ // 6000)):
                        r_, g_, b_, al_ = px[i * 4:i * 4 + 4]
                        if al_ > .5 and (max(r_, g_, b_) - min(r_, g_, b_)) > .06 and (r_ + g_ + b_) > .6: good.append((r_, g_, b_))
                    if len(good) < 20: good = [tuple(px[i * 4:i * 4 + 3]) for i in range(0, n_, max(1, n_ // 6000)) if px[i * 4 + 3] > .5]
                    if good:
                        lum = sorted(good, key=lambda c_: c_[0] + c_[1] + c_[2]); mid_ = lum[len(lum) // 2]
                        lin = lambda c_: c_ / 12.92 if c_ <= .04045 else ((c_ + .055) / 1.055) ** 2.4
                        skin = tuple(lin(c_) for c_ in mid_); break
                    nd_ = next((nd for nd in s_.material.node_tree.nodes if nd.type == 'BSDF_PRINCIPLED'), None)
            except Exception as ex: log('skin sample failed', nm, ex)
            if skin == (.9, .75, .55):
                for s_ in hd.material_slots:
                    nd_ = next((nd for nd in s_.material.node_tree.nodes if nd.type == 'BSDF_PRINCIPLED'), None) if s_.material else None
                    if nd_ and not nd_.inputs['Base Color'].is_linked: skin = tuple(nd_.inputs['Base Color'].default_value[:3]); break
        a.scale = (scale,) * 3
        return {'arm': a, 'parts': parts, 'skin': skin, 'fam': IMP_FAM.get(str(cid), 'npc')}
    class ImpChar(Char):
        """a rigged imported avatar: keeps its own Roblox face/clothes textures (no face swapping)"""
        def __init__(self, c, scale=1.0):
            self.arm = c['arm']; self.parts = c['parts']; self.scale = scale
            self.arm.scale = (scale, scale, scale)
            self.W = {}; self.facemat = None; self.faces = []
            self.P = self.arm.pose.bones
            self.rest = {pb.name: pb.bone.matrix_local.to_3x3().inverted() for pb in self.P}
            for pb in self.P: pb.rotation_mode = 'QUATERNION'
            self.loc = []; self.rot = []; self.pose = []; self.facek = []
        def dress(self, *a, **k): pass
    def mk_imp(nm, cid, fam=None, scale=1.0):
        d_ = imp_char(nm, cid, scale); c = ImpChar(d_, scale); CH[nm] = c; FAMI[nm] = fam or d_['fam']; c.skin = d_['skin']; return c

    # ---- wardrobe helpers (closures: pass them in a character's extras)
    def coat(col, length=2.4):
        def f(ch):
            tmn, tmx, tc = tbb(ch); u = ch.scale; cm_ = mat('coat_%d_%d_%d' % tuple(int(x * 255) for x in col), col, .7)
            attachf(box('coat', ((tmx.x - tmn.x) * 1.12, (tmx.y - tmn.y) * 1.2, (tmx.z - tmn.z) * 1.0), (tc.x, tc.y, tc.z), cm_), ch, 'Uppertorso')
            if False: attachf(box('coat_skirt', ((tmx.x - tmn.x) * 1.1, (tmx.y - tmn.y) * 1.18, length * u), (tc.x, tc.y, tmn.z - length * u / 2 + .1 * u), cm_), ch, 'Hips')
            attachf(box('coat_collar', ((tmx.x - tmn.x) * .9, (tmx.y - tmn.y) * 1.3, .45 * u), (tc.x, tc.y, tmx.z + .05 * u), mat('coat_collar_%d' % int(col[0] * 99), tuple(x * .7 for x in col), .7)), ch, 'Uppertorso')
            for k in range(3): attachf(box('coat_btn', (.14 * u, .1 * u, .14 * u), (tc.x, tmx.y + .08 * u, tmn.z + (k + 1) * (tmx.z - tmn.z) / 4), GOLD), ch, 'Uppertorso')
        return f
    def flatcap(col):
        def f(ch):
            mn, mx, c = hbb(ch); u = ch.scale; w = max(mx.x - mn.x, mx.y - mn.y)
            attachf(obj('flatcap', SPH, (c.x, c.y, mx.z - .05 * u), (w * .58, w * .62, .32 * u), m=mat('cap_%d' % int(col[0] * 99), col, .8)), ch, 'Head')
            attachf(box('flatcap_brim', (w * .8, .6 * u, .1 * u), (c.x, mx.y + .1 * u, mx.z - .18 * u), mat('cap_%d' % int(col[0] * 99), col, .8)), ch, 'Head')
        return f
    def apron(col):
        def f(ch):
            tmn, tmx, tc = tbb(ch); u = ch.scale; am_ = mat('apron_%d' % int(col[2] * 99), col, .8)
            attachf(box('apron', ((tmx.x - tmn.x) * .82, .12 * u, (tmx.z - tmn.z) * .85), (tc.x, tmx.y + .08 * u, tc.z - .1 * u), am_), ch, 'Uppertorso')
            attachf(box('apron_low', ((tmx.x - tmn.x) * .86, .12 * u, 1.3 * u), (tc.x, tmx.y + .1 * u, tmn.z - .55 * u), am_), ch, 'Hips')
        return f
    def cloak(ch):          # the hunter: black hooded cloak, face in shadow, two red eyes
        tmn, tmx, tc = tbb(ch); u = ch.scale; mn, mx, c = hbb(ch); w = max(mx.x - mn.x, mx.y - mn.y)
        cm_ = mat('cloak_black', (.03, .03, .05), .8)
        attachf(box('cloak', ((tmx.x - tmn.x) * 1.25, (tmx.y - tmn.y) * 1.35, (tmx.z - tmn.z) * 1.05), (tc.x, tc.y, tc.z), cm_), ch, 'Uppertorso')
        attachf(box('cloak_skirt', ((tmx.x - tmn.x) * 1.3, (tmx.y - tmn.y) * 1.4, 2.8 * u), (tc.x, tc.y, tmn.z - 1.3 * u), cm_), ch, 'Hips')
        attachf(obj('hood', SPH, (c.x, c.y - .1 * u, c.z + .1 * u), (w * .78, w * .82, (mx.z - mn.z) * .72), m=cm_), ch, 'Head')
        attachf(box('hood_shadow', (w * .9, .1 * u, (mx.z - mn.z) * .8), (c.x, mx.y + .12 * u, c.z), mat('hood_void', (.0, .0, .0), 1.)), ch, 'Head')
        for sx in (-1, 1): attachf(obj('hunter_eye', SPH, (c.x + sx * .32 * u, mx.y + .2 * u, c.z + .1 * u), (.13 * u, .06 * u, .08 * u), m=emit_mat('hunter_red', (1., .08, .05), 14.)), ch, 'Head')
    def bow(col):
        def f(ch):
            mn, mx, c = hbb(ch); u = ch.scale; bm_ = mat('bow_%d' % int(col[0] * 99), col, .5)
            for sx in (-1, 1): attachf(obj('hairbow', SPH, (c.x + sx * .35 * u, c.y - .2 * u, mx.z + .05 * u), (.34 * u, .14 * u, .24 * u), m=bm_), ch, 'Head')
            attachf(obj('hairbow_knot', SPH, (c.x, c.y - .2 * u, mx.z + .05 * u), (.14 * u, .14 * u, .14 * u), m=bm_), ch, 'Head')
        return f
    def cardigan(col):
        def f(ch):
            tmn, tmx, tc = tbb(ch); u = ch.scale; cm_ = mat('cardi_%d' % int(col[1] * 99), col, .85)
            attachf(box('cardigan', ((tmx.x - tmn.x) * 1.08, (tmx.y - tmn.y) * 1.14, (tmx.z - tmn.z) * .98), (tc.x, tc.y, tc.z), cm_), ch, 'Uppertorso')
            if False: attachf(box('cardi_open', ((tmx.x - tmn.x) * .3, .1 * u, (tmx.z - tmn.z) * .95), (tc.x, tmx.y + .1 * u, tc.z), mat('cardi_shirt', (.97, .95, .9), .7)), ch, 'Uppertorso')
        return f
    def numbadge(num, col):
        def f(ch):
            tmn, tmx, tc = tbb(ch); u = ch.scale
            e = empty('badge_' + ch.arm.name, (tc.x + (tmx.x - tmn.x) * .22, tmx.y + .1 * u, tc.z + .35 * u), rot=(0, 0, 180))
            obj('badge_disc', CYL, (0, 0, 0), (.42 * u, .42 * u, .08 * u), (90, 0, 0), mat('badge_%d' % int(col[0] * 99 + col[2] * 9), col, .5), e)
            label(num, (0, -.06 * u, 0), .36 * u, (1, 1, 1), parent=e)
            attachf(e, ch, 'Uppertorso'); BADGES.append(e)
        return f
    def make_side(nm, cid, scale=1.0, extra=()):
        c = mk_imp(nm, cid, None, scale)
        bpy.context.view_layer.update()
        for e in extra: e(c)
        return c
    SIT = {'ulLX': -90, 'ulRX': -90, 'llLX': 90, 'llRX': 90}
    P.update({
        'sit': SIT,
        'look_hands': {'uaLX': -62, 'laLX': -58, 'uaRX': -62, 'laRX': -58, 'uaLZ': -8, 'uaRZ': 8, 'hdX': 28, 'spX': 6},
        'point': {'uaRX': -85, 'laRX': -5, 'uaRZ': -6, 'spY': -8},
        'palms_up': {'uaLX': -55, 'laLX': -55, 'uaRX': -55, 'laRX': -55, 'uaLZ': 10, 'uaRZ': -10, 'hdX': 12},
        'flail': {'uaLZ': 120, 'uaRZ': -120, 'ulLX': -40, 'ulRX': 20, 'llLX': 40, 'spX': -20, 'hdX': -20},
        'cover': {'uaLX': -110, 'laLX': -100, 'uaRX': -110, 'laRX': -100, 'uaLZ': -20, 'uaRZ': 20, 'spX': 22, 'hdX': 20},
        'laugh': {'spX': -10, 'hdX': -18, 'uaLX': -40, 'laLX': -80, 'uaLZ': -10},
        'cheer': add(SIT, {'uaLZ': 150, 'uaRZ': -150, 'laLX': -25, 'laRX': -25}),
        'cup': {'uaRX': -60, 'laRX': -92, 'uaRZ': 26, 'spX': 10, 'hdX': 4},
        'cupL': {'uaLX': -60, 'laLX': -92, 'uaLZ': -26, 'spX': 10, 'hdX': 4},
        'offerR': {'uaRX': -64, 'laRX': -28, 'uaRZ': 4, 'hdX': 16},
        'offerL': {'uaLX': -64, 'laLX': -28, 'uaLZ': -4, 'hdX': 16},
        'cross': {'uaLX': -48, 'laLX': -98, 'uaLZ': -40, 'uaRX': -48, 'laRX': -98, 'uaRZ': 40, 'spX': -5, 'hdX': -5},
        'giggle': {'uaLX': -55, 'laLX': -95, 'uaLZ': -26, 'uaRX': -55, 'laRX': -95, 'uaRZ': 26, 'spX': 12, 'hdX': 6},
        'thumbs': {'uaRX': -72, 'laRX': -62, 'uaRZ': -4},
        'collar': {'uaRX': -40, 'laRX': -105, 'uaRZ': 30, 'uaLX': -40, 'laLX': -105, 'uaLZ': -30, 'hdX': -8, 'spX': -4},
        'read': {'uaLX': -58, 'laLX': -48, 'uaLZ': -14, 'uaRX': -58, 'laRX': -48, 'uaRZ': 14, 'hdX': 18},
        'raise': {'uaRX': -172, 'laRX': -4, 'hdX': -4},
        'mic': {'uaRX': -52, 'laRX': -98, 'uaRZ': 26, 'hdX': 2},
        'bottle': {'uaRX': -45, 'laRX': -100, 'uaRZ': 30, 'uaLX': -45, 'laLX': -100, 'uaLZ': -30},
        'hugbag': {'uaLX': -84, 'laLX': -34, 'uaLZ': -22, 'uaRX': -84, 'laRX': -34, 'uaRZ': 22, 'spX': 18, 'hdX': -8, 'ulLX': -20, 'llLX': 25, 'ulRX': -20, 'llRX': 25},
        'slump': {'spX': 16, 'hdX': 20, 'uaLZ': 2, 'uaRZ': -2, 'uaLX': 6, 'uaRX': 6},
        'scared': {'uaLX': -35, 'laLX': -70, 'uaRX': -35, 'laRX': -70, 'spX': -6, 'hdX': -6, 'uaLZ': 10, 'uaRZ': -10},
        'reachR': {'uaRX': -80, 'laRX': -10, 'uaRZ': 6, 'spX': 8},
        'pat': add(SIT, {'uaLX': -70, 'laLX': -20, 'spZ': 14, 'hdY': 22, 'hdX': 10}),
        'present': {'uaLX': -80, 'laLX': -40, 'uaLZ': -14, 'uaRX': -80, 'laRX': -40, 'uaRZ': 14},
        'salute': {'uaRX': -120, 'laRX': -120, 'uaRZ': 40},
        'pull': {'uaLX': -150, 'laLX': -10, 'uaRX': -110, 'laRX': -10, 'spX': -6},
        'wiggle': {'uaLZ': 112, 'laLX': -96, 'uaRZ': -112, 'laRX': -96, 'hdX': -6},
        'ground': {'uaLX': -150, 'uaRX': -150, 'uaLZ': 20, 'uaRZ': -20},
        'hero': {'uaLZ': 9, 'uaRZ': -9, 'spX': -4, 'hdX': -4, 'ulLX': -4, 'ulRX': 4},
    })
    def ST(x, y, h, p, f, z=0., tilt=0.): return (x, y, z, h, p, f, tilt)
    def along(t, t0, a, b, speed):
        dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-6
        d = clamp((t - t0) * speed, 0, L); u = d / L
        return a[0] + dx * u, a[1] + dy * u, d, (t0 <= t and d < L), face_to(a[0], a[1], b[0], b[1])
    def stand(x, y, h, p, f, z=0.): return ST(x, y, h, p, f, z)
    def seated(x, y, h, extra, face, seat_top=1.7, z0=0., t=0., seed=0., k=1.):
        rx, ry, rz = sit_root(x, y, h, seat_top, z0)
        return ST(rx, ry, h, add(SIT, breathe(t, .6 * k, seed), extra), face, rz)
    def walk2(ph, amp=30, arm=.85, knee=26, lean=3.):
        o = walk(ph, amp, arm, knee, lean)
        o['spY'] = amp * .18 * math.sin(ph); o['hdY'] = -amp * .1 * math.sin(ph); o['lowZ'] = 3 * math.sin(ph)
        return o
    def alive(t, k=1., seed=0.):
        """idle that never freezes: breathing + slow weight shift + small head looks + shoulder settle"""
        w_ = math.sin(t * .9 + seed * 1.7)
        o = breathe(t, k, seed)
        o = add(o, {'lowZ': 2.2 * w_ * k, 'spZ': -1.6 * w_ * k, 'hdZ': 1.2 * w_ * k, 'ulLX': -2.5 * max(0, w_) * k, 'llLX': 5 * max(0, w_) * k,
                    'ulRX': -2.5 * max(0, -w_) * k, 'llRX': 5 * max(0, -w_) * k,
                    'hdY': noise1(t * .45, seed + 7) * 7 * k, 'laLX': -6 + 3 * noise1(t * .7, seed + 2) * k, 'laRX': -6 + 3 * noise1(t * .8, seed + 4) * k})
        return o
    def talk(t, seed=0.):
        b = math.sin(t * 7 + seed)
        return add(breathe(t, .8, seed), {'uaRX': -50 + 14 * b, 'laRX': -60 + 10 * b, 'uaRZ': -8, 'uaLX': -30 + 8 * math.sin(t * 5.3 + seed), 'laLX': -50, 'uaLZ': 8, 'hdX': -4 + 3 * b})
    def bake_states(ch, seq):
        arm = ch.arm; arm.rotation_mode = 'XYZ'
        L = [[], [], []]; RX = []; R = []; Q = {j: [[], [], [], []] for j in JOINTS}
        for (x, y, z, hdg, p, fc, tilt) in seq:
            for i, v in enumerate((x, y, z + p.get('bob', 0.))): L[i].append(v)
            RX.append(tilt * D2R); R.append(hdg * D2R); qs = pose_quats(ch, p)
            for j in JOINTS:
                for i in range(4): Q[j][i].append(qs[j][i])
        for i in range(3): bake(arm, 'location', i, FRAMES, L[i])
        bake(arm, 'rotation_euler', 0, FRAMES, RX); bake(arm, 'rotation_euler', 2, FRAMES, R)
        for j in JOINTS:
            for i in range(4): bake(arm, 'pose.bones["%s"].rotation_quaternion' % JN[j], i, FRAMES, Q[j][i])
    LEAF = mat('olive_leaf', (.32, .5, .2), .8); LEAF2 = mat('cypress', (.1, .32, .14), .8); TRUNK = mat('trunk', (.36, .24, .14), .9)
    FLW = [mat('flw_red', (.92, .12, .1), .6), mat('flw_white', (.98, .96, .92), .6), mat('flw_yel', (1., .78, .1), .6), mat('flw_mag', (.8, .14, .5), .6)]
    CLOUDW = mat('cloud_white', (.97, .98, 1.), .95)


    # ===================================================== THE HERO (the channel's main character) — built from hero.json
    # hero.json lives next to base_rig.blend. Two modes:
    #   "describe": a blocky character dressed from the description (colours, hair style, accessories)
    #   "import"  : the creator's own Roblox avatar exported as OBJ into packs/c<id>/<id>.obj
    # Sections refer to the hero as CH['hero'] (state function st_hero, TALK entries ('hero', t0, t1), camera ecu('hero', ...)).
    def _col(v, dflt=(.5, .5, .5)):
        if v is None: return None
        if isinstance(v, str):
            v = v.strip()
            if v.startswith('#') and len(v) == 7: return tuple(int(v[i:i + 2], 16) / 255. for i in (1, 3, 5))
            return dflt
        return tuple(float(x) for x in v[:3])
    HERO_CFG = {'name': 'Hero', 'mode': 'describe', 'fam': 'npc', 'skin': 'light', 'scale': 1.0,
                'top': [.2, .45, .9], 'sleeve': [.2, .45, .9], 'legs': [.15, .18, .3], 'shoes': [.95, .95, .95],
                'hair': ['r_short', [.25, .15, .08]], 'extras': [], 'import_id': None, 'import_faces': 'emotion'}
    try:
        HERO_CFG.update(json.load(open(os.path.join(HERE, 'hero.json'), encoding='utf-8')))
    except Exception as ex: log('hero.json not found / unreadable, using the default hero:', ex)
    HERO_NAME = HERO_CFG.get('name', 'Hero')
    def ballcap(col, brim=None, back=False):
        def f(ch):
            mn, mx, c = hbb(ch); u = ch.scale; w = max(mx.x - mn.x, mx.y - mn.y)
            cm_ = mat('bcap_%d_%d_%d' % tuple(int(x * 255) for x in col), col, .6)
            bm_ = mat('bcapb_%d_%d_%d' % tuple(int(x * 255) for x in (brim or col)), brim or col, .6)
            attachf(obj('ballcap', SPH, (c.x, c.y - .02 * u, mx.z - .02 * u), (w * .6, w * .62, .46 * u), m=cm_), ch, 'Head')
            by = (mn.y - .3 * u) if back else (mx.y + .3 * u)
            attachf(box('ballcap_brim', (w * .62, .7 * u, .07 * u), (c.x, by, mx.z - .26 * u), bm_, (-8 if not back else 8, 0, 0)), ch, 'Head')
            attachf(obj('ballcap_btn', SPH, (c.x, c.y - .02 * u, mx.z + .42 * u), (.08 * u, .08 * u, .06 * u), m=bm_), ch, 'Head')
        return f
    def hoodie(col):
        def f(ch):
            tmn, tmx, tc = tbb(ch); mn, mx, c = hbb(ch); u = ch.scale; hm_ = mat('hood_%d_%d_%d' % tuple(int(x * 255) for x in col), col, .85)
            attachf(box('hoodie', ((tmx.x - tmn.x) * 1.06, (tmx.y - tmn.y) * 1.12, (tmx.z - tmn.z) * .99), (tc.x, tc.y, tc.z), hm_), ch, 'Uppertorso')
            attachf(box('hoodie_pocket', ((tmx.x - tmn.x) * .55, .1 * u, .5 * u), (tc.x, tmx.y + .06 * u, tmn.z + .45 * u), mat('hoodp_%d' % int(col[0] * 99), tuple(x * .85 for x in col), .85)), ch, 'Uppertorso')
            attachf(obj('hoodie_hood', SPH, (c.x, mn.y - .05 * u, tmx.z + .25 * u), ((mx.x - mn.x) * .5, .35 * u, .45 * u), m=hm_), ch, 'Uppertorso')
            for sx in (-1, 1): attachf(box('hoodie_str', (.05 * u, .05 * u, .55 * u), (tc.x + sx * .22 * u, tmx.y + .07 * u, tmx.z - .35 * u), mat('hoodie_str', (.97, .97, .97), .6)), ch, 'Uppertorso')
        return f
    def chest_logo(col, w=.7, h=.7, z=.15):
        def f(ch): tfront(ch, 'logo', (w, .05, h), (0, .03, z), col, .5)
        return f
    def _extra(e):
        k = e[0]; a = list(e[1:])
        if k == 'specs': return X(specs_on, a[0] if a else 'round', _col(a[1]) if len(a) > 1 else (.1, .1, .12))
        if k == 'facehair': return X(facehair, a[0], _col(a[1]) if len(a) > 1 else (.2, .12, .06))
        if k == 'headband': return X(headband, _col(a[0]))
        if k == 'shades': return X(shades) if not a else X(shades, _col(a[0]))
        if k == 'goggles': return goggles
        if k == 'medal': return medal
        if k == 'cloak': return cloak
        if k == 'cap': return ballcap(_col(a[0]), _col(a[1]) if len(a) > 1 else None, bool(a[2]) if len(a) > 2 else False)
        if k == 'hoodie': return hoodie(_col(a[0]))
        if k == 'logo': return chest_logo(_col(a[0]), *(float(x) for x in a[1:4]))
        if k in ('flatcap', 'apron', 'cardigan', 'coat', 'bow', 'skirt'): return globals_[k](_col(a[0]))
        log('unknown hero extra', e); return None
    globals_ = {'flatcap': flatcap, 'apron': apron, 'cardigan': cardigan, 'coat': coat, 'bow': bow, 'skirt': skirt}
    def _legs(v):
        if isinstance(v, (list, tuple)) and v and isinstance(v[0], str):
            if v[0] == 'shorts': return ('shorts', _col(v[1]), _col(v[2]) if len(v) > 2 else (.95, .95, .95))
            if v[0] == 'skirt': return ('skirt', _col(v[1]))
        return _col(v)
    def _top(v):
        if isinstance(v, dict) and 'stripes' in v:
            s_ = v['stripes']; return stripes(_col(s_[0]), _col(s_[1]), int(s_[2]) if len(s_) > 2 else 6)
        if isinstance(v, (list, tuple)) and v and isinstance(v[0], (list, tuple)) and len(v[0]) == 2:
            return [(float(p), _col(c_)) for p, c_ in v]       # [[pos, colour], ...] bands from the bottom of the shirt up
        return _col(v)
    class HeroImp(Char):
        """an imported avatar that still gets the kit's emotion faces + lip sync"""
        def dress(self, *a, **k): pass
    def make_hero():
        cfg = HERO_CFG; sk = cfg.get('skin', 'light')
        if isinstance(sk, str) and sk in SK: skin_key = sk
        else: SK['hero_skin'] = _col(sk, SK['light']); skin_key = 'hero_skin'
        if cfg.get('mode') == 'import' and cfg.get('import_id'):
            c = mk_imp('hero', str(cfg['import_id']), cfg.get('fam', 'npc'), float(cfg.get('scale', 1.)))
            if cfg.get('import_faces', 'emotion') == 'emotion': c.__class__ = HeroImp
            if cfg.get('skin_override'): c.skin = _col(cfg['skin_override'])        # face colour if the sampled head colour looks off
            log('hero imported from packs/c%s' % cfg['import_id'], 'faces:', cfg.get('import_faces', 'emotion'))
        else:
            hair = cfg.get('hair')
            if hair and any(e and e[0] in ('cap', 'flatcap') for e in cfg.get('extras', [])) and hair[0] in ('r_spiky', 'r_curly', 'r_bun', 'r_swoop'):
                hair = ['r_short'] + list(hair[1:]); log('hero: hat on -> hair under it becomes r_short')
            hair = (hair[0], _col(hair[1]), _col(hair[2]) if len(hair) > 2 else None) if hair else None
            ex = tuple(x for x in (_extra(e) for e in cfg.get('extras', [])) if x)
            c = mkr('hero', cfg.get('fam', 'npc'), skin_key, float(cfg.get('scale', 1.)), _top(cfg.get('top')), _col(cfg.get('sleeve')),
                    _legs(cfg.get('legs')), _col(cfg.get('shoes')), hair, ex)
            log('hero built from description:', HERO_NAME)
        return c
    hero = make_hero()

    # ===================================================== KIT TAG: the hidden "Skies" stamp (part of the kit licence)
    # Every shot gets ONE small "Skies" stamp printed on a static background surface (a wall, floor, board, sign, shelf)
    # in a slightly darker/lighter shade of that surface, so it reads as part of the set (wallpaper print, stencil,
    # worn paint), never as an overlay. tools/assemble.py inserts skies_mark() right before the first render/save call of
    # every section automatically. Sections must not call, change, move, hide or remove it.
    SKIES_TXT = 'Skies'
    _SK_SKIP = ('sky', 'cloud', 'dome', 'glass', 'window', 'water', 'rain', 'smoke', 'fire', 'spark', 'puff', 'skies_tag',
                'mirror', 'screen', 'portal', 'lamp', 'bulb', 'neon', 'emit', 'hair')
    def _sk_static(o):
        if o is None or o.type != 'MESH': return False
        p = o
        while p is not None:
            if p.type == 'ARMATURE' or p.animation_data: return False
            p = p.parent
        if any(m.type == 'ARMATURE' for m in o.modifiers): return False
        n = o.name.lower()
        return not any(k in n for k in _SK_SKIP)
    def _sk_colour(o, idx):
        """base colour of the surface that was hit (follows simple node chains; None if it is an image texture)"""
        try:
            me = o.data; m = None
            if me.polygons and idx is not None and 0 <= idx < len(me.polygons):
                mi = me.polygons[idx].material_index
                if mi < len(o.material_slots): m = o.material_slots[mi].material
            if m is None and o.material_slots: m = o.material_slots[0].material
            if m is None or not m.use_nodes: return tuple(m.diffuse_color[:3]) if m else None
            bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bsdf is None: return None
            inp = bsdf.inputs['Base Color']
            if not inp.is_linked: return tuple(inp.default_value[:3])
            cols = []; todo = [(inp.links[0].from_node, 0)]
            while todo:
                nd, dep = todo.pop()
                if nd.type == 'TEX_IMAGE': return None
                if nd.type == 'RGB': cols.append(tuple(nd.outputs[0].default_value[:3]))
                if nd.type == 'VALTORGB': cols += [tuple(e.color[:3]) for e in nd.color_ramp.elements]
                for i_ in nd.inputs:
                    if i_.is_linked and dep < 5: todo.append((i_.links[0].from_node, dep + 1))
                    elif i_.type == 'RGBA' and nd.type in ('TEX_BRICK', 'TEX_CHECKER', 'MIX', 'MIX_RGB'): cols.append(tuple(i_.default_value[:3]))
            if not cols: return None
            return tuple(sum(c[k] for c in cols) / len(cols) for k in range(3))
        except Exception: return None
    def _sk_mat(base):
        if base is None: col, a = (.05, .05, .06), .32                        # unknown/image surface: faint dark print
        else:
            lum = .2126 * base[0] + .7152 * base[1] + .0722 * base[2]
            col = tuple(c * .58 for c in base) if lum > .12 else tuple(min(1., c * 1.7 + .05) for c in base); a = .75
        key = 'skies_tag_%d_%d_%d_%d' % (tuple(int(c * 40) for c in col) + (int(a * 10),))
        if key in bpy.data.materials: return bpy.data.materials[key]
        m = bpy.data.materials.new(key); m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Base Color'].default_value = (col[0], col[1], col[2], 1.); b.inputs['Roughness'].default_value = .85
        b.inputs['Alpha'].default_value = a
        for at, v in (('surface_render_method', 'DITHERED'), ('blend_method', 'HASHED')):
            try: setattr(m, at, v)
            except Exception: pass
        return m
    def _sk_frame(cam):
        cd = cam.data; fr = [Vector(c) for c in cd.view_frame(scene=sc)]      # top-right, bottom-right, bottom-left, top-left
        return cd, fr[3], fr[0], fr[1], fr[2]
    def _sk_ray(cam, u, v):
        cd, tl, tr, br, bl = _sk_frame(cam); mw = cam.matrix_world
        p = bl.lerp(br, u).lerp(tl.lerp(tr, u), v)
        if cd.type == 'ORTHO':
            return mw @ Vector((p.x, p.y, 0)), (mw.to_3x3() @ Vector((0, 0, -1))).normalized()
        o = mw.translation.copy(); return o, ((mw @ p) - o).normalized()
    def _sk_cast(dg, o, d, far=400.):
        h, loc, nrm, idx, ob, _ = sc.ray_cast(dg, o, d, distance=far)
        return (loc, nrm, idx, ob) if h else None
    def _sk_width(cam, depth):
        cd, tl, tr, br, bl = _sk_frame(cam); w = (tr - tl).length
        return w if cd.type == 'ORTHO' else w / max(abs(tr.z), 1e-6) * depth
    def skies_mark(rel=.07):
        T1 = time.time(); g = globals(); cam = sc.camera
        if cam is None: log('skies tag: no camera'); return
        shl = g.get('shots') or [('all', 0., DUR)]
        placed = 0; rr = random.Random(1717)
        GRID = [(u / 10., v / 12.) for u in range(1, 10) for v in range(3, 11)]       # skip the bottom quarter + top strip (YouTube UI)
        for si, (n, a, b) in enumerate(shl):
            b = min(b, DUR); fm = int((a + (b - a) * .55) * FPS) + 1
            f_chk = [max(1, int(a * FPS) + 2), fm, max(1, int(b * FPS) - 1)]
            sc.frame_set(fm); bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
            fwd = (cam.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
            right = (cam.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized()
            cands = []
            for u, v in GRID:
                o, d = _sk_ray(cam, u, v); hit = _sk_cast(dg, o, d)
                if not hit or not _sk_static(hit[3]): continue
                loc, nrm, idx, ob = hit; nrm = Vector(nrm).normalized()
                if nrm.dot(d) > 0: nrm = -nrm
                facing = -nrm.dot(d); depth = (loc - o).dot(fwd)
                if facing < .5 or depth < 2.5 or depth > 140: continue
                hw = _sk_width(cam, depth) * rel / 2; hh = hw * .42
                X_ = right - nrm * right.dot(nrm)
                if X_.length < 1e-3: continue
                X_.normalize(); Y_ = nrm.cross(X_).normalized()
                ok = True
                for sx, sy in ((-1.15, -1.3), (1.15, -1.3), (-1.15, 1.3), (1.15, 1.3), (0, 0)):
                    q = loc + X_ * hw * sx + Y_ * hh * sy
                    oo = o if cam.data.type != 'ORTHO' else q - fwd * 50
                    dd = (q - oo).normalized(); h2 = _sk_cast(dg, oo, dd, (q - oo).length + hw)
                    if not h2 or h2[3] != ob or abs((h2[0] - loc).dot(nrm)) > hw * .12: ok = False; break
                if not ok: continue
                sc_ = min(depth, 45) / 45 * 1.2 + facing * .6 + abs(u - .5) * .8 + (.2 if v > .55 else 0) + rr.random() * .8
                cands.append((sc_, loc, nrm, X_, Y_, hw, ob, idx, u, v))
            if not cands: log('skies tag: no free background surface in shot', n); continue
            cands.sort(key=lambda c_: -c_[0])
            # prefer a spot that is still in frame and uncovered at the start and end of the shot
            top = cands[:8]; vis = [0] * len(top)
            for fc in f_chk:
                sc.frame_set(fc); bpy.context.view_layer.update(); dg2 = bpy.context.evaluated_depsgraph_get()
                oc = cam.matrix_world.translation.copy()
                for j, c_ in enumerate(top):
                    dd = (c_[1] - oc).normalized(); h3 = _sk_cast(dg2, oc, dd, (c_[1] - oc).length + 1.)
                    if h3 and h3[3] == c_[6] and (h3[0] - c_[1]).length < c_[5]: vis[j] += 1
            best = (0, top[max(range(len(top)), key=lambda j: (vis[j], -j))])
            sc.frame_set(fm)
            _, (s_, loc, nrm, X_, Y_, hw, ob, idx, u, v) = best
            m = _sk_mat(_sk_colour(ob, idx))
            t_ = text3d_('skies_tag_%02d' % si, SKIES_TXT, (0, 0, 0), 1., m, (0, 0, 0), extrude=0.)
            bpy.context.view_layer.update(); w0 = max(t_.dimensions.x, 1e-3); s = hw * 2 / w0
            R = Matrix((X_, Y_, nrm)).transposed()
            t_.matrix_world = Matrix.Translation(loc + nrm * max(.004, hw * .01)) @ R.to_4x4() @ Matrix.Scale(s, 4)
            t_.visible_shadow = False; t_.hide_viewport = True          # keep it out of the next shots' ray casts
            try: t_.visible_diffuse = t_.visible_glossy = True
            except Exception: pass
            f0, f1 = int(a * FPS) + 1, int(b * FPS) + 1
            keys = ([(1, True)] if f0 > 1 else []) + [(f0, False)] + ([(f1, True)] if f1 <= NF else [])
            for fr_, hid in keys:
                t_.hide_render = hid; t_.keyframe_insert('hide_render', frame=fr_)
            placed += 1
            log('skies tag', n, 'on', ob.name, 'u%.2f v%.2f' % (u, v), 'w%.2f' % (hw * 2))
        for o_ in bpy.data.objects:
            if o_.name.startswith('skies_tag_'): o_.hide_viewport = False
        sc.frame_set(1)
        log('skies tags placed', placed, 'of', len(shl), 'shots in', round(time.time() - T1, 1), 's')
