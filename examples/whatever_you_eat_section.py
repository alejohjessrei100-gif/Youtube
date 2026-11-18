# ===================================================== EXAMPLE SECTION: WHATEVER YOU EAT, YOU TURN INTO — timed to the cleaned, gap-free VO (43.11 s)
# A complete, shipped video section. Read it as the reference for how a section is laid out: helpers -> sets -> cast -> shots/timing -> states -> props -> faces -> camera -> render.
RUNMODE = 'stills'; RROUND = 'r1'
try:
    _m = open(os.path.join(HERE, VNAME + '_mode.txt')).read().strip().split(':')
    RUNMODE = _m[0]; RROUND = _m[1] if len(_m) > 1 else 'r1'
except Exception: pass
log('RUNMODE', RUNMODE, RROUND)
def M_(name, rgb, rough=.6, es=0.):
    return mat(name, rgb, rough, 0., rgb if es else None, es)
WHITEM = M_('f_white', (.95, .95, .93), .55); BLACKM = M_('b_black', (.04, .04, .05), .5)
TRIMW = M_('b_trim', (.97, .97, .95), .5)
GLASS = glass_mat('b_glass', (.6, .8, .95))
BRASS = mat('b_brass', (.85, .65, .25), .35, .9)
SKINL = M_('b_skin_light', SK['light'], .55)
def rbox(name, size, loc, m, rot=(0, 0, 0), parent=None, r=.15, seg=3, shadow=True):
    """box with real rounded edges (no blocky corners)"""
    me = bpy.data.meshes.new(name + '_m'); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    try: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(r, min(size) * .45), segments=seg, profile=.5, affect='EDGES')
    except Exception as ex: log('bevel', ex)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.materials.append(None)
    return obj(name, me, loc, (1, 1, 1), rot, m, parent, shadow)
OFFV = Vector((0, 0, -300))
def W2(e, lx, ly):
    """local (x,y) of a parent empty -> world (x,y) (z-rotation only)"""
    a = e.rotation_euler.z; return (e.location.x + lx * math.cos(a) - ly * math.sin(a), e.location.y + lx * math.sin(a) + ly * math.cos(a))

# ---------------------------------------------------------- the uncle's brown corduroy COUCH (same couch as before) — origin bottom centre, front faces -Y
CORD = stripe_mat('u_cord', (.55, .32, .15), (.47, .26, .12), .18, 'XZ', 1, .95)
CORD2 = stripe_mat('u_cord2', (.5, .29, .13), (.43, .24, .1), .18, 'XZ', 1, .95)
CFOOT = wood_mat('u_couchfoot', (.3, .16, .07))
HAIRTEX = bpy.data.textures.new('u_hair_clouds', 'CLOUDS'); HAIRTEX.noise_scale = .55; HAIRTEX.noise_depth = 2
FUZZTEX = bpy.data.textures.new('u_fuzz', 'CLOUDS'); FUZZTEX.noise_scale = .12; FUZZTEX.noise_depth = 1
def hair_blob(ch, name, size, loc, rot=(0, 0, 0), m=None, strength=.12, bone='Head', tex=None):
    o = obj(name, SPH, loc, size, rot, m, None, True)
    md = o.modifiers.new('disp', 'DISPLACE'); md.texture = tex or HAIRTEX; md.strength = strength; md.mid_level = .5
    ss = o.modifiers.new('ss', 'SUBSURF'); ss.levels = 1; ss.render_levels = 2
    attachf(o, ch, bone); return o
def hair_bedhead(ch, col):
    mn, mx, c = hbb(ch); u = ch.scale; w = mx.x - mn.x; d = mx.y - mn.y; top = mx.z; back = mn.y; front = mx.y; cx = c.x
    hm = mat('u_hair_bed', col, .45)
    B = lambda nm, size, loc, rot=(0, 0, 0), st=.13: hair_blob(ch, nm, size, loc, rot, hm, st)
    B('hb_dome', (w / 2 + .13 * u, d / 2 + .12 * u, .5 * u), (cx, c.y - .03 * u, top - .1 * u), st=.12)
    B('hb_back', (w / 2 + .08 * u, .34 * u, .75 * u), (cx, back + .12 * u, top - .55 * u), st=.11)
    for sx in (-1, 1): B('hb_side', (.2 * u, d * .4, .5 * u), (cx + sx * (w / 2 + .03 * u), c.y - .08 * u, top - .5 * u), st=.09)
    rr_ = random.Random(11)
    for k in range(8):
        a_ = k / 8 * 2 * math.pi + rr_.uniform(-.3, .3)
        B('hb_mess', (.3 * u, .26 * u, .42 * u), (cx + math.cos(a_) * w * .36, c.y + math.sin(a_) * d * .3, top + .2 * u + rr_.uniform(-.05, .15) * u),
          (math.sin(a_) * 45 + rr_.uniform(-10, 10), -math.cos(a_) * 45 + rr_.uniform(-10, 10), 0), .16)
    B('hb_cowlick', (.16 * u, .14 * u, .5 * u), (cx + .2 * u, c.y + .1 * u, top + .55 * u), (-25, 20, 0), .1)
    for k in range(3):
        f_ = (k - 1) / 1.; B('hb_fringe', (.32 * u, .18 * u, .3 * u), (cx + f_ * (w / 2 - .2 * u), front - .02 * u, top - .2 * u), (34, f_ * 22, 0), .12)
def foot_wear(ch, nm, side, kind, col, col2=None):
    """smooth shoe/slipper around the bottom of a leg — skinned to the leg so it always sits on the foot"""
    leg = ch.parts['Left Leg' if side == 'L' else 'Right Leg']; u = ch.scale
    bpy.context.view_layer.update(); _le = leg.evaluated_get(bpy.context.evaluated_depsgraph_get()); _vs = [_le.matrix_world @ v.co for v in _le.data.vertices]
    mn = Vector((min(v.x for v in _vs), min(v.y for v in _vs), min(v.z for v in _vs))); mx = Vector((max(v.x for v in _vs), max(v.y for v in _vs), max(v.z for v in _vs)))
    cxl, cyl = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2; lw = mx.x - mn.x; ld = mx.y - mn.y
    e = empty(nm, (0., 0., 0.))
    if kind == 'slipper':
        fm = mat('u_slip_' + nm[:3], col, .95)
        o = obj(nm + '_fuzz', SPH, (cxl, cyl + .15 * u, mn.z + .32 * u), (lw * .62, ld * .78, .42 * u), (0, 0, 0), fm, e)
        md = o.modifiers.new('disp', 'DISPLACE'); md.texture = FUZZTEX; md.strength = .07; ss = o.modifiers.new('ss', 'SUBSURF'); ss.render_levels = 2
        obj(nm + '_sole', SPH, (cxl, cyl + .15 * u, mn.z + .06 * u), (lw * .6, ld * .74, .1 * u), m=mat('u_slip_sole', (.3, .2, .12), .9), parent=e)
    else:
        um = mat('u_shoe_' + str(int(col[0] * 99)) + '_' + str(int(col[2] * 99)), col, .35); wm = mat('u_shoe_sole', (.97, .97, .96), .5)
        rbox(nm + '_sole', (lw * 1.06, ld * 1.3, .22 * u), (cxl, cyl + .2 * u, mn.z + .11 * u), wm, parent=e, r=.08)
        rbox(nm + '_upper', (lw * 1.03, ld * 1.2, .55 * u), (cxl, cyl + .15 * u, mn.z + .45 * u), um, parent=e, r=.2)
        obj(nm + '_toe', SPH, (cxl, cyl + ld * .55, mn.z + .3 * u), (lw * .5, .32 * u, .28 * u), m=wm, parent=e)
        for k in range(3): box(nm + '_lace', (lw * .6, .06 * u, .06 * u), (cxl, cyl + ld * .62 - k * .12 * u, mn.z + .55 * u + k * .07 * u), wm, parent=e)
    skin_to_leg(e, ch, leg)
    return e
def skin_to_leg(e, ch, leg):
    from mathutils import kdtree
    bpy.context.view_layer.update()
    lm = leg.matrix_world; vs = leg.data.vertices; kd = kdtree.KDTree(len(vs))
    for v in vs: kd.insert(lm @ v.co, v.index)
    kd.balance()
    gname = {g.index: g.name for g in leg.vertex_groups}
    W = [{gname[g.group]: g.weight for g in v.groups if g.weight > 0 and g.group in gname} for v in vs]
    mw_e = e.matrix_world.copy(); e.parent = ch.arm; e.matrix_world = mw_e
    bpy.context.view_layer.update()
    for o in list(e.children):
        if o.type != 'MESH': continue
        om = o.matrix_world
        for v in o.data.vertices:
            co, idx, d = kd.find(om @ v.co)
            for gn, w in W[idx].items():
                vg = o.vertex_groups.get(gn) or o.vertex_groups.new(name=gn); vg.add([v.index], w, 'REPLACE')
        md = o.modifiers.new('rig', 'ARMATURE'); md.object = ch.arm
        o.modifiers.move(len(o.modifiers) - 1, 0)

# ---------------------------------------------------------- HAIR v3: smooth tapered locks + strand-streak material (no lumpy balls)
def fabric(m, kind='knit', s=1.):
    if m is None or not m.use_nodes: return
    nt_ = m.node_tree; b = nt_.nodes.get('Principled BSDF'); tc = nt_.nodes.new('ShaderNodeTexCoord')
    if kind in ('knit', 'rib'):
        t = nt_.nodes.new('ShaderNodeTexWave'); t.wave_type = 'BANDS'; t.bands_direction = 'X'
        t.inputs['Scale'].default_value = (11. if kind == 'knit' else 16.) * s; t.inputs['Distortion'].default_value = 2.
        out_ = t.outputs['Fac']; st = .16
    else:
        t = nt_.nodes.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value = (70. if kind == 'denim' else 45.) * s; t.inputs['Detail'].default_value = 6.
        out_ = t.outputs['Fac']; st = .1 if kind == 'denim' else .06
    nt_.links.new(tc.outputs['Object'], t.inputs['Vector']); _bump(nt_, b, out_, st)
def fabric_all(ch, top='cotton', legs='denim'):
    fabric(ch.parts['Torso'].material_slots[0].material, top)
    fabric(ch.parts['Left Arm'].material_slots[0].material, top)
    fabric(ch.parts['Left Leg'].material_slots[0].material, legs)
def trim(ch, name, size, off, col, side='front', bone='Uppertorso', r=.05, rough=.7, rot=(0, 0, 0), kind='box', es=0.):
    """soft clothing detail attached to the body (sizes/offsets in character units)"""
    tmn, tmx, tc = tbb(ch); u = ch.scale
    y = tmx.y + off[1] * u if side == 'front' else (tmn.y + off[1] * u if side == 'back' else tc.y + off[1] * u)
    loc = (tc.x + off[0] * u, y, tc.z + off[2] * u); mm = M_('b_tr_%s_%s' % (ch.arm.name, name), col, rough, es)
    if kind == 'box': o = rbox('tr_' + name, (size[0] * u, size[1] * u, size[2] * u), loc, mm, rot, None, r * u)
    elif kind == 'torus': o = obj('tr_' + name, mesh_torus(size[0] * u, size[1] * u, 32, 8), loc, (1, 1, size[2]), rot, mm)
    else: o = obj('tr_' + name, SPH, loc, (size[0] * u, size[1] * u, size[2] * u), rot, mm)
    attachf(o, ch, bone); return o
def torso_wh(ch):
    tmn, tmx, tc = tbb(ch); u = ch.scale; return (tmx.x - tmn.x) / u, (tmx.y - tmn.y) / u, (tmx.z - tmn.z) / u
def limb_band(ch, part, bone, name, z_frac, h, col, grow=1.08, rough=.6):
    """a band wrapped around a limb (cuff, watch strap, sock frill)"""
    mn_, mx_ = bbox(ch.parts[part]); u = ch.scale
    loc = ((mn_.x + mx_.x) / 2, (mn_.y + mx_.y) / 2, mn_.z + (mx_.z - mn_.z) * z_frac)
    o = rbox('lb_' + name, ((mx_.x - mn_.x) * grow, (mx_.y - mn_.y) * grow, h * u), loc, M_('b_lb_%s_%s' % (ch.arm.name, name), col, rough), parent=None, r=.05 * u)
def banana_mesh(name, s):
    """one smooth curved tube (no lumpy segments)"""
    me = bpy.data.meshes.new(name + '_m'); bm = bmesh.new(); R = 1.1 * s; N, RG = 18, 10; rings = []
    for i in range(N + 1):
        u = i / N; a = (-55 + 110 * u) * D2R
        c = Vector((math.sin(a) * R, 0, R - math.cos(a) * R)); rad = Vector((math.sin(a), 0, -math.cos(a)))
        r = .27 * s * max(.12, math.sin(math.pi * (.04 + .92 * u))) ** .55
        rings.append([bm.verts.new(c + (Vector((0, 1, 0)) * math.cos(p * 2 * math.pi / RG) + rad * math.sin(p * 2 * math.pi / RG)) * r) for p in range(RG)])
    for i in range(N):
        for p in range(RG): bm.faces.new((rings[i][p], rings[i][(p + 1) % RG], rings[i + 1][(p + 1) % RG], rings[i + 1][p]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bm.normal_update(); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.materials.append(None); return me

def mcyl(seg=16, r2=1.0):
    me = mesh_cyl(seg, r2); me.materials.append(None); return me

# ====================================================================================== SHARED BITS
def wall_box(name, size, loc, m): return box(name, size, loc, m)
def frame_art(x, y, z, w, h, rz, col, seed, parent=None):
    e = empty('art', (x, y, z), parent=parent, rot=(0, 0, rz))
    rbox('art_fr', (w + .3, .14, h + .3), (0, 0, 0), M_('f_artfr', (.95, .93, .88), .4), parent=e, r=.05)
    box('art_bg', (w, .1, h), (0, -.05, 0), M_('f_art_%d' % seed, col, .7), parent=e)
    r_ = random.Random(seed)
    for k in range(3):
        c_ = r_.choice(((.95, .45, .3), (.3, .6, .95), (.98, .8, .25), (.45, .8, .45), (.85, .4, .8)))
        obj('art_blob', SPH, (r_.uniform(-w * .3, w * .3), -.12, r_.uniform(-h * .3, h * .3)), (r_.uniform(.2, .45) * w, .03, r_.uniform(.15, .35) * h), m=M_('f_artb_%d_%d' % (seed, k), c_, .6), parent=e)
    return e
def ceil_panel(x, y, z, w, d): box('ceil_light', (w, d, .12), (x, y, z), M_('f_ceil_glow', (1, .98, .94), .4, 2.2), shadow=False)
def chair(name, x, y, hdg, seat_top=1.7, col=(.3, .55, .9), legc=(.75, .75, .78)):
    """hdg = the way the person sitting on it faces"""
    e = empty(name, (x, y, 0), rot=(0, 0, hdg + 180)); lm = M_('f_chairleg', legc, .35)
    for sx in (-1, 1):
        for sy in (-1, 1): obj(name + '_leg', CYL8, (sx * .75, sy * .75, (seat_top - .15) / 2), (.08, .08, seat_top - .15), m=lm, parent=e)
    rbox(name + '_seat', (1.8, 1.8, .22), (0, 0, seat_top - .11), M_('f_chair_%d' % int(col[0] * 99 + col[2] * 7), col, .5), parent=e, r=.08)
    rbox(name + '_back', (1.8, .2, 1.9), (0, .85, seat_top + .95), M_('f_chair_%d' % int(col[0] * 99 + col[2] * 7), col, .5), parent=e, r=.08)
    return e
def puff_group(name, col=(1, 1, 1)):
    e = empty(name, OFFV); pm_ = M_('f_puff', col, .9, .3); r_ = random.Random(len(name))
    for k in range(11):
        a_ = k * 2.4; rr_ = r_.uniform(.4, 1.3)
        obj('puff', SPH, (math.cos(a_) * rr_, r_.uniform(-.6, .6), math.sin(a_) * rr_ * .8), (r_.uniform(.55, .95),) * 3, m=pm_, parent=e, shadow=False)
    for k in range(6):
        a_ = k * 1.05
        obj('puff_star', CONE16, (math.cos(a_) * 2.2, -.4, math.sin(a_) * 1.9), (.18, .18, .45), (0, 90 - math.degrees(a_), 0), M_('f_pstar', (1, .85, .2), .4, 1.5), e, shadow=False)
    return e

# ====================================================================================== 1) SCHOOL CAFETERIA (origin, x -22..22, y -16..16)
CW0, CW1, CD0, CD1, CH_ = -22., 22., -16., 16., 12.
plane('cf_floor', (CW1 - CW0, CD1 - CD0), (0, 0, 0), tile_mat('f_cf_tile', (.95, .93, .86), (.35, .72, .7), 2.6, .25, (.7, .68, .62)))
box('cf_ceil', (CW1 - CW0 + 2, CD1 - CD0 + 2, .4), (0, 0, CH_ + .2), M_('f_cf_ceil', (.97, .97, .95), .8))
for k in range(4):
    for j in range(3): ceil_panel(-15 + k * 10, -10 + j * 10, CH_ - .08, 5.0, 1.2)
CFW = plaster_mat('f_cf_wall', (.98, .95, .86)); CFW_Y = plaster_mat('f_cf_wall_y', (.98, .95, .86), 'YZ')
CFL = tile_mat('f_cf_wtile', (.98, .74, .3), (.96, .68, .24), 1.0, .2, (.92, .88, .8), 'XZ'); CFL_Y = tile_mat('f_cf_wtile_y', (.98, .74, .3), (.96, .68, .24), 1.0, .2, (.92, .88, .8), 'YZ')
for (nm_, sz, loc, mu, ml) in (('n', (CW1 - CW0 + 1.2, .6), (0, CD1 + .3), CFW, CFL), ('s', (CW1 - CW0 + 1.2, .6), (0, CD0 - .3), CFW, CFL),
                               ('e', (.6, CD1 - CD0 + 1.2), (CW1 + .3, 0), CFW_Y, CFL_Y), ('w', (.6, CD1 - CD0 + 1.2), (CW0 - .3, 0), CFW_Y, CFL_Y)):
    box('cf_wall_lo_' + nm_, (sz[0], sz[1], 4.2), (loc[0], loc[1], 2.1), ml)
    box('cf_wall_hi_' + nm_, (sz[0], sz[1], CH_ - 4.2), (loc[0], loc[1], 4.2 + (CH_ - 4.2) / 2), mu)
for (L_, loc, al) in ((CW1 - CW0, (0, CD1 - .05), 'x'), (CW1 - CW0, (0, CD0 + .05), 'x'), (CD1 - CD0, (CW1 - .05, 0), 'y'), (CD1 - CD0, (CW0 + .05, 0), 'y')):
    box('cf_rail', (L_, .25, .3) if al == 'x' else (.25, L_, .3), (loc[0], loc[1], 4.25), M_('f_cf_rail', (.2, .55, .55), .4))
# east wall: tall windows; west wall: posters + water fountain + bins
for k in range(4): window(CW1 - .35, -11 + k * 6.6, 7.0, 4.2, 4.6, 90, GLASS, 'white')
plane('cf_view_e', (60, 30), (CW1 + 10, 0, 6), M_('f_cf_view', (.55, .82, .5), .9), (90, 0, 90))
for k, (txt, col) in enumerate((('EAT YOUR VEGGIES!', (.3, .7, .35)), ('LUNCH TIME', (.95, .45, .2)), ('SNACKVILLE ELEMENTARY', (.25, .45, .85)))):
    e_ = empty('cf_banner', (CW0 + .12, -10 + k * 9, 8.4), rot=(0, 0, 90))
    rbox('cf_ban_b', (7.2, .12, 1.5), (0, 0, 0), M_('f_cfban%d' % k, col, .6), parent=e_, r=.1)
    label(txt, (0, -.1, 0), .55, (1, 1, 1), parent=e_, extrude=.02)
for k in range(3): poster(CW0 + .12, -12 + k * 9, 5.6, 2.2, 2.8, 90, 900 + k)
obj('cf_fountain', CYL, (CW0 + .9, 6, 2.6), (.8, .5, .4), m=M_('f_steel', (.82, .84, .86), .25)); box('cf_fount_b', (1.0, .9, 2.6), (CW0 + .6, 6, 1.3), M_('f_steel', (.82, .84, .86), .25))
for k, col in enumerate(((.2, .5, .9), (.25, .7, .35), (.95, .6, .15))):
    obj('cf_bin', mcyl(16, 1.1), (CW0 + 1.3, -2.5 + k * 1.9, 1.3), (.75, .75, 2.6), m=M_('f_bin%d' % k, col, .5))
# south wall: notice board + vending machines
rbox('cf_board', (8.0, .2, 3.8), (-8, CD0 + .12, 6.4), M_('f_cork', (.72, .5, .3), .9), r=.06)
for k in range(6): box('cf_note', (1.2, .05, 1.0), (-11 + k * 1.3, CD0 + .25, 6.4 + (k % 2) * .9), M_('f_note%d' % (k % 3), ((1, .95, .5), (.6, .85, 1.), (1, .7, .75))[k % 3], .7))
for k, col in enumerate(((.9, .15, .15), (.15, .35, .85))):
    rbox('cf_vend', (3.2, 2.4, 7.0), (6 + k * 3.6, CD0 + 1.3, 3.5), M_('f_vend%d' % k, col, .4), r=.15)
    box('cf_vend_win', (2.2, .1, 4.0), (5.6 + k * 3.6, CD0 + 2.5, 4.4), M_('f_vendwin', (.75, .9, 1.), .2, .8), shadow=False)
    for r_ in range(4):
        for c_ in range(3): obj('cf_snack', CYL, (4.9 + k * 3.6 + c_ * .7, CD0 + 2.4, 2.9 + r_ * .95), (.22, .22, .5), (90, 0, 0), M_('f_snk%d' % ((r_ + c_) % 4), ((1, .8, .1), (.95, .3, .3), (.3, .8, .4), (.5, .6, 1.))[(r_ + c_) % 4], .4))
# lunch counter along the north wall (lady stands behind at y 14)
STEEL = M_('f_steel', (.82, .84, .86), .25)
LC_X0, LC_X1, LC_Y, LC_TOP = -17., -3., 12.0, 3.2
rbox('lc_base', (LC_X1 - LC_X0, 2.2, LC_TOP - .1), (( LC_X0 + LC_X1) / 2, LC_Y, (LC_TOP - .1) / 2), M_('f_lc_front', (.3, .62, .62), .5), r=.08)
box('lc_top', (LC_X1 - LC_X0 + .2, 2.4, .14), ((LC_X0 + LC_X1) / 2, LC_Y, LC_TOP), STEEL)
box('lc_slide', (LC_X1 - LC_X0, .9, .1), ((LC_X0 + LC_X1) / 2, LC_Y - 1.5, 2.6), STEEL)
for k in range(5): obj('lc_slide_bar', CYL8, (LC_X0 + .5 + k * 3.2, LC_Y - 1.7, 2.65), (.05, .05, .9), (90, 0, 0), STEEL)
FOODC = (('f_mash', (.97, .95, .85)), ('f_peas', (.35, .72, .25)), ('f_corn', (1, .85, .2)), ('f_carrot', (1, .5, .1)))
for k in range(4):
    px_ = -15.6 + k * 2.6
    if k == 1: continue    # the meatloaf pan sits here (prop)
    rbox('lc_pan', (2.2, 1.6, .5), (px_, LC_Y, LC_TOP + .2), STEEL, r=.05)
    for j in range(6): obj('lc_food', SPH, (px_ + (j % 3 - 1) * .6, LC_Y + (j // 3 - .5) * .6, LC_TOP + .45), (.4, .4, .2), m=M_(*FOODC[(k + j) % 4], .8))
rbox('lc_pan_ml', (2.4, 1.6, .5), (-13.0, LC_Y, LC_TOP + .2), STEEL, r=.05)
LOAF_PAN = (-13.0, LC_Y, LC_TOP + .45)
for k in range(5): rbox('tray_stack', (2.2, 1.6, .1), (-1.6, LC_Y - .2, LC_TOP + .1 + k * .12), M_('f_tray', (.95, .55, .2), .4), r=.05)
# back wall behind the counter: steel shelves + menu board
rbox('lc_back', (14.0, 1.0, 3.2), (-10, CD1 - .6, 1.6), STEEL, r=.05)
for k in range(2): box('lc_shelf', (13.6, 1.2, .12), (-10, CD1 - .7, 6.2 + k * 1.6), STEEL)
for k in range(10): obj('lc_jar', CYL, (-16 + k * 1.3, CD1 - .7, 6.65 + (k % 2) * 1.6), (.35, .35, .8), m=M_('f_jar%d' % (k % 3), ((.9, .3, .25), (.98, .85, .3), (.4, .7, .35))[k % 3], .5))
MENU = empty('menu', (-10, CD1 - .1, 9.8))
rbox('menu_b', (9.0, .2, 3.0), (0, 0, 0), M_('f_menu', (.12, .18, .16), .7), parent=MENU, r=.1)
for k, txt in enumerate(("TODAY'S LUNCH", 'MEATLOAF  $2', 'NUGGETS  $2', 'BOILED EGGS  $1')):
    label(txt, (0, -.15, .95 - k * .65), .45 if k == 0 else .36, (1, .9, .4) if k == 0 else (1, 1, 1), parent=MENU, extrude=.01)
# long tables with benches (the hero's table at y 0)
TBL = M_('f_tbl', (.98, .97, .93), .35); TBLE = M_('f_tbl_edge', (.25, .55, .85), .4)
BENCH_TOP = 1.75; TBL_TOP = 2.85
def caf_table(x, y, L=12.):
    rbox('ct_top', (L, 3.2, .18), (x, y, TBL_TOP - .09), TBL, r=.06); box('ct_edge', (L + .05, 3.25, .1), (x, y, TBL_TOP - .2), TBLE)
    for sx in (-1, 1):
        obj('ct_leg', CYL8, (x + sx * (L / 2 - 1.2), y, (TBL_TOP - .2) / 2), (.16, .16, TBL_TOP - .2), m=STEEL)
        for sy in (-1, 1): box('ct_bar', (.12, 4.4, .12), (x + sx * (L / 2 - 1.2), y, .9), STEEL)
    for sy in (-1, 1):
        rbox('ct_bench', (L, 1.0, .16), (x, y + sy * 2.15, BENCH_TOP - .08), TBLE, r=.05)
        for sx in (-1, 1): obj('ct_bleg', CYL8, (x + sx * (L / 2 - 1.2), y + sy * 2.15, (BENCH_TOP - .16) / 2), (.1, .1, BENCH_TOP - .16), m=STEEL)
def lunch_tray(x, y, rz=0, seed=0):
    e = empty('ltray', (x, y, TBL_TOP), rot=(0, 0, rz)); r_ = random.Random(seed)
    rbox('lt_b', (2.0, 1.4, .1), (0, 0, .05), M_('f_tray%d' % (seed % 3), ((.95, .55, .2), (.35, .65, .95), (.45, .8, .45))[seed % 3], .4), parent=e, r=.05)
    obj('lt_food', SPH, (-.45, .1, .2), (.4, .35, .18), m=M_(*FOODC[seed % 4], .8), parent=e)
    obj('lt_food2', SPH, (.35, .2, .18), (.3, .3, .15), m=M_(*FOODC[(seed + 2) % 4], .8), parent=e)
    rbox('lt_milk', (.36, .36, .6), (.7, -.35, .4), M_('f_milk', (.97, .97, .97), .5), parent=e, r=.04); box('lt_milk_b', (.38, .38, .18), (.7, -.35, .6), M_('f_milkb', (.3, .55, .95), .5), parent=e)
    if r_.random() < .6: obj('lt_apple', SPH, (-.2, -.4, .3), (.22, .22, .22), m=M_('f_apple', (.9, .15, .12), .4), parent=e)
    return e
caf_table(0, 0); caf_table(-10, -8.5); caf_table(10, -8.5); caf_table(13.5, -.8, 9.)
for k, (tx, ty) in enumerate(((-12, -8.0), (-8.5, -9.4), (8.5, -8.0), (11.5, -9.3), (13.0, -1.3), (-3.5, -.5), (3.6, .4))): lunch_tray(tx, ty, (k * 23) % 30 - 15, k + 3)
HR_TRAY = (0., .8)
rbox('hero_tray', (2.2, 1.5, .1), (HR_TRAY[0], HR_TRAY[1], TBL_TOP + .05), M_('f_tray1', (.35, .65, .95), .4), r=.05)
NUGC = M_('f_nugget', (.86, .55, .16), .75)
for k in range(5): obj('tray_nug', SPH, (HR_TRAY[0] - .55 + (k % 3) * .4, HR_TRAY[1] + .25 - (k // 3) * .35, TBL_TOP + .22), (.24, .17, .13), (0, 0, k * 40), NUGC)
obj('hero_ketchup_cup', CYL, (HR_TRAY[0] + .6, HR_TRAY[1] - .3, TBL_TOP + .18), (.2, .2, .16), m=M_('f_ketchup', (.85, .08, .05), .3))
KETCHUP = empty('ketchup', (-1.4, .5, TBL_TOP))
obj('kb_body', CYL, (0, 0, .75), (.38, .38, 1.5), m=M_('f_ketchup', (.85, .08, .05), .3), parent=KETCHUP); obj('kb_cap', CONE16, (0, 0, 1.75), (.3, .3, .5), m=WHITEM, parent=KETCHUP)
box('kb_label', (.5, .05, .5), (0, -.38, .8), M_('f_kblabel', (.98, .95, .85), .5), parent=KETCHUP)
for k in range(3): obj('cf_napkin', CYL, (-4 + k * 8, -7.6 + (k % 2) * 13, TBL_TOP + .3), (.3, .3, .6), m=STEEL)
log('cafeteria built', round(time.time() - T0, 1), 's')

# ====================================================================================== 2) MATH CLASSROOM (x 286..314, y -12..12)
CX = 300.
MX0, MX1, MY0, MY1, MH = CX - 14, CX + 14, -12., 12., 11.
plane('mc_floor', (MX1 - MX0, MY1 - MY0), (CX, 0, 0), tile_mat('f_mc_tile', (.78, .8, .86), (.7, .73, .8), 2.4, .5, (.62, .64, .7)))
box('mc_ceil', (MX1 - MX0 + 2, MY1 - MY0 + 2, .4), (CX, 0, MH + .2), M_('f_mc_ceil', (.97, .97, .96), .8))
for k in range(3):
    for j in range(2): ceil_panel(CX - 8 + k * 8, -5 + j * 10, MH - .08, 4.0, 1.2)
MCW = plaster_mat('f_mc_wall', (.6, .76, .98)); MCW_Y = plaster_mat('f_mc_wall_y', (.6, .76, .98), 'YZ')
MCL = M_('f_mc_wain', (.2, .3, .62), .6)
for (nm_, sz, loc, mu) in (('n', (MX1 - MX0 + 1.2, .6), (CX, MY1 + .3), MCW), ('s', (MX1 - MX0 + 1.2, .6), (CX, MY0 - .3), MCW),
                           ('e', (.6, MY1 - MY0 + 1.2), (MX1 + .3, 0), MCW_Y), ('w', (.6, MY1 - MY0 + 1.2), (MX0 - .3, 0), MCW_Y)):
    box('mc_wall_lo_' + nm_, (sz[0], sz[1], 3.4), (loc[0], loc[1], 1.7), MCL)
    box('mc_wall_hi_' + nm_, (sz[0], sz[1], MH - 3.4), (loc[0], loc[1], 3.4 + (MH - 3.4) / 2), mu)
for (L_, loc, al) in ((MX1 - MX0, (CX, MY1 - .05), 'x'), (MX1 - MX0, (CX, MY0 + .05), 'x'), (MY1 - MY0, (MX1 - .05, 0), 'y'), (MY1 - MY0, (MX0 + .05, 0), 'y')):
    box('mc_rail', (L_, .25, .25) if al == 'x' else (.25, L_, .25), (loc[0], loc[1], 3.45), M_('f_mc_rail', (1, .82, .25), .4))
# whiteboard with real maths on it
WB = empty('wb', (CX, MY1 - .12, 6.2))
rbox('wb_frame', (15.0, .2, 5.4), (0, 0, 0), M_('f_wbfr', (.75, .76, .8), .3), parent=WB, r=.08)
box('wb_face', (14.4, .1, 4.8), (0, -.08, 0), M_('f_wb', (.98, .98, .98), .15), parent=WB)
box('wb_tray', (14.0, .5, .12), (0, -.3, -2.6), M_('f_wbfr', (.75, .76, .8), .3), parent=WB)
for k, (txt, x_, z_, col) in enumerate((('3x + 5 = 20', -4.2, 1.4, (.15, .3, .85)), ('x = 5', -4.2, .4, (.85, .15, .15)), ('7 x 8 = 56', 2.8, 1.5, (.15, .3, .85)),
                                         ('PI = 3.14', 3.2, .3, (.1, .55, .25)), ('a + b = c', -.6, -1.1, (.15, .3, .85)), ('2 + 2 = 4', 4.6, -1.3, (.85, .15, .15)))):
    label(txt, (x_, -.15, z_), .62, col, parent=WB, extrude=.005)
for k, col in enumerate(((.85, .15, .15), (.15, .3, .85), (.1, .55, .25))): obj('wb_marker', CYL8, (-5.5 + k * .5, -.35, -2.5), (.07, .07, .6), (0, 90, 0), M_('f_mk%d' % k, col, .4), WB)
for k in range(11):                      # number line border above the board
    e_ = empty('numcard', (CX - 10 + k * 2, MY1 - .1, 9.8))
    rbox('nc_b', (1.6, .1, 1.1), (0, 0, 0), M_('f_nc%d' % (k % 4), ((1, .55, .3), (.45, .75, 1.), (.55, .85, .5), (1, .85, .3))[k % 4], .6), parent=e_, r=.08)
    label(str(k), (0, -.08, 0), .6, (1, 1, 1), parent=e_, extrude=.01)
# teacher desk + chair (teacher sits facing the class, -Y)
TD_X, TD_Y, TD_TOP = CX, 7.4, 3.0
rbox('td_top', (6.4, 2.8, .2), (TD_X, TD_Y, TD_TOP - .1), wood_mat('f_tdesk', (.62, .4, .22)), r=.05)
rbox('td_front', (6.2, .2, 2.7), (TD_X, TD_Y - 1.3, 1.45), wood_mat('f_tdesk', (.62, .4, .22)), r=.05)
for sx in (-1, 1): rbox('td_side', (.2, 2.6, 2.8), (TD_X + sx * 3.0, TD_Y, 1.45), wood_mat('f_tdesk', (.62, .4, .22)), r=.04)
chair('td_chair', TD_X, TD_Y + 2.2, 180, 2.0, (.2, .3, .6))
obj('td_apple', SPH, (TD_X + 2.4, TD_Y - .6, TD_TOP + .3), (.3, .3, .3), m=M_('f_apple', (.9, .15, .12), .4))
obj('td_stem', CYL8, (TD_X + 2.4, TD_Y - .6, TD_TOP + .65), (.04, .04, .2), m=M_('f_stem', (.35, .25, .1), .6))
for k in range(3): rbox('td_book', (1.4, 1.0, .25), (TD_X - 2.3, TD_Y + .3, TD_TOP + .12 + k * .25), M_('f_tdb%d' % k, ((.85, .3, .3), (.3, .5, .85), (.95, .8, .3))[k], .6), (0, 0, k * 9), r=.03)
obj('td_mug', CYL, (TD_X + 1.6, TD_Y + .7, TD_TOP + .35), (.3, .3, .7), m=M_('f_tmug', (.98, .98, .98), .4))
for k in range(4): obj('td_pencil', CYL8, (TD_X + 1.6 + (k - 1.5) * .08, TD_Y + .7, TD_TOP + .85), (.04, .04, .7), (8 * (k - 1.5), 0, 0), M_('f_pencil', (1, .8, .1), .5))
obj('globe', SPH, (MX1 - 2.0, 9.6, 4.6), (.9, .9, .9), m=M_('f_globe', (.3, .6, .95), .4)); obj('globe_st', CYL8, (MX1 - 2.0, 9.6, 3.3), (.08, .08, 1.0), m=BRASS)
rbox('globe_tab', (2.0, 2.0, 2.8), (MX1 - 2.0, 9.6, 1.4), wood_mat('f_tdesk', (.62, .4, .22)), r=.05)
# student desks (2 rows x 3); students face the board (+Y)
SD_TOP = 2.6; SEAT_K = 1.7
SDESKS = [(CX - 7, 2.), (CX, 2.), (CX + 7, 2.), (CX - 7, -4.), (CX, -4.), (CX + 7, -4.)]
for k, (dx, dy) in enumerate(SDESKS):
    rbox('sd_top', (3.4, 2.2, .14), (dx, dy, SD_TOP - .07), wood_mat('f_sdesk', (.85, .66, .42)), r=.05)
    for sx in (-1, 1):
        for sy in (-1, 1): obj('sd_leg', CYL8, (dx + sx * 1.5, dy + sy * .9, (SD_TOP - .1) / 2), (.07, .07, SD_TOP - .1), m=M_('f_chairleg', (.75, .75, .78), .35))
    box('sd_shelf', (3.0, 1.8, .1), (dx, dy, 1.6), M_('f_chairleg', (.75, .75, .78), .35))
    chair('sd_chair', dx, dy - 2.05, 0, SEAT_K, ((.95, .35, .3), (.3, .55, .9), (.4, .8, .4), (1, .7, .2), (.7, .45, .9), (.3, .75, .8))[k])
    rbox('sd_book', (1.3, 1.0, .1), (dx - .5, dy - .2, SD_TOP + .05), M_('f_sdb%d' % (k % 3), ((.98, .98, .95), (.9, .95, 1.), (1, .97, .85))[k % 3], .6), (0, 0, (k * 17) % 20 - 10), r=.02)
    obj('sd_pencil', CYL8, (dx + .6, dy, SD_TOP + .06), (.04, .04, .9), (0, 90, (k * 31) % 60), M_('f_pencil', (1, .8, .1), .5))
# windows with blinds (east), clock + posters (west), bookshelf (south-west)
for k in range(3):
    window(MX1 - .35, -7 + k * 6.5, 6.6, 3.8, 4.4, 90, GLASS, 'white')
    for j in range(7): box('blind', (.06, 3.9, .12), (MX1 - .6, -7 + k * 6.5, 8.6 - j * .3), M_('f_blind', (.97, .97, .95), .5))
plane('mc_view', (60, 30), (MX1 + 10, 0, 6), M_('f_cf_view', (.55, .82, .5), .9), (90, 0, 90))
CLK_M = empty('mc_clock', (MX0 + .1, 6.0, 8.6), rot=(0, 0, 90))
obj('mclk_rim', mesh_torus(1.0, .12, 32, 8), (0, 0, 0), (1, 1, 1), (0, 0, 0), M_('f_clkrim', (.15, .15, .18), .4), CLK_M)
obj('mclk_face', CYL, (0, -.02, 0), (.98, .98, .05), (90, 0, 0), WHITEM, CLK_M)
for k in range(12): box('mclk_tick', (.06, .04, .18), (math.sin(k * .5236) * .78, -.08, math.cos(k * .5236) * .78), BLACKM, (0, k * 30, 0), CLK_M)
box('mclk_h', (.08, .04, .45), (.1, -.1, .18), BLACKM, (0, 30, 0), CLK_M); box('mclk_m', (.06, .04, .7), (-.2, -.1, .25), BLACKM, (0, -40, 0), CLK_M)
for k, (txt, col) in enumerate((('MATH IS FUN!', (.95, .45, .2)), ('SHAPES', (.3, .7, .35)))):
    e_ = empty('mc_poster', (MX0 + .12, -6 + k * 7, 6.4), rot=(0, 0, 90))
    rbox('mcp_b', (4.2, .12, 3.2), (0, 0, 0), M_('f_mcp%d' % k, col, .6), parent=e_, r=.1)
    label(txt, (0, -.1, 1.0), .5, (1, 1, 1), parent=e_, extrude=.01)
    if k == 1:
        obj('mcp_circ', CYL, (-1.2, -.1, -.3), (.6, .04, .6), (90, 0, 0), M_('f_shape_r', (.95, .3, .3), .5), e_)
        obj('mcp_tri', CONE, (0, -.1, -.3), (.7, .04, .7), (90, 45, 0), M_('f_shape_y', (1, .85, .2), .5), e_)
        box('mcp_sq', (1.0, .05, 1.0), (1.3, -.1, -.3), M_('f_shape_b', (.3, .5, .95), .5), parent=e_)
    else: label('1 2 3 + - x', (0, -.1, -.4), .45, (1, 1, .85), parent=e_, extrude=.01)
rbox('mc_shelf', (1.4, 7.0, 4.6), (MX0 + .8, -8.5, 2.3), wood_mat('f_sdesk', (.85, .66, .42)), r=.05)
for k in range(3):
    for j in range(5): rbox('mc_book', (1.0, .3, 1.0), (MX0 + .9, -11.2 + j * .55 + (k % 2) * .2, 1.0 + k * 1.4), M_('f_mcb%d' % ((j + k) % 4), ((.85, .3, .3), (.3, .5, .85), (.95, .8, .3), (.4, .75, .45))[(j + k) % 4], .6), r=.03)
pot_plant(MX1 - 1.8, -10.4, 0, 1.2, 31)
log('math class built', round(time.time() - T0, 1), 's')

# ====================================================================================== 3) PRINCIPAL'S OFFICE (x 588..612, y -10..10)
OX = 600.
OX0, OX1, OY0, OY1, OH = OX - 12, OX + 12, -10., 10., 11.
plane('of_floor', (OX1 - OX0, OY1 - OY0), (OX, 0, 0), stripe_mat('f_of_carpet', (.2, .28, .55), (.24, .32, .6), .6, 'XY', 1, .95))
plane('of_rug', (12, 9), (OX, 1.0, .02), stripe_mat('f_of_rug', (.85, .7, .45), (.75, .25, .2), 1.0, 'XY', 0, .95))
box('of_ceil', (OX1 - OX0 + 2, OY1 - OY0 + 2, .4), (OX, 0, OH + .2), M_('f_of_ceil', (.97, .96, .93), .8))
OFW = plaster_mat('f_of_wall', (.72, .2, .24)); OFW_Y = plaster_mat('f_of_wall_y', (.72, .2, .24), 'YZ')
OFL = M_('f_of_wain', (.97, .95, .9), .5)
for (nm_, sz, loc, mu) in (('n', (OX1 - OX0 + 1.2, .6), (OX, OY1 + .3), OFW), ('s', (OX1 - OX0 + 1.2, .6), (OX, OY0 - .3), OFW),
                           ('e', (.6, OY1 - OY0 + 1.2), (OX1 + .3, 0), OFW_Y), ('w', (.6, OY1 - OY0 + 1.2), (OX0 - .3, 0), OFW_Y)):
    box('of_wall_lo_' + nm_, (sz[0], sz[1], 3.6), (loc[0], loc[1], 1.8), OFL)
    box('of_wall_hi_' + nm_, (sz[0], sz[1], OH - 3.6), (loc[0], loc[1], 3.6 + (OH - 3.6) / 2), mu)
for (L_, loc, al) in ((OX1 - OX0, (OX, OY1 - .05), 'x'), (OX1 - OX0, (OX, OY0 + .05), 'x'), (OY1 - OY0, (OX1 - .05, 0), 'y'), (OY1 - OY0, (OX0 + .05, 0), 'y')):
    box('of_rail', (L_, .3, .25) if al == 'x' else (.3, L_, .25), (loc[0], loc[1], 3.65), TRIMW)
    box('of_crown', (L_, .4, .4) if al == 'x' else (.4, L_, .4), (loc[0], loc[1], OH - .2), TRIMW)
MAHO = wood_mat('f_maho', (.42, .2, .1), 'XY', 1.0, 6., .3)
PD_X, PD_Y, PD_TOP = OX, 3.4, 3.0
rbox('pd_top', (7.4, 3.2, .25), (PD_X, PD_Y, PD_TOP - .12), MAHO, r=.06)
rbox('pd_front', (7.2, .25, 2.8), (PD_X, PD_Y - 1.45, 1.4), MAHO, r=.05)
for sx in (-1, 1): rbox('pd_ped', (2.0, 3.0, 2.8), (PD_X + sx * 2.6, PD_Y, 1.4), MAHO, r=.05)
for sx in (-1, 1):
    for k in range(3): obj('pd_knob', SPH, (PD_X + sx * 2.6, PD_Y - 1.6, .6 + k * .85), (.08, .06, .08), m=BRASS)
NP = empty('nameplate', (PD_X - 1.6, PD_Y - 1.2, PD_TOP + .25))
rbox('np_b', (2.4, .5, .5), (0, 0, 0), M_('f_np', (.12, .12, .14), .3), (-20, 0, 0), NP, r=.05)
label('PRINCIPAL', (0, -.27, .02), .3, (1, .82, .35), (70, 0, 0), parent=NP, extrude=.01)
obj('pd_lamp_b', CYL, (PD_X + 2.6, PD_Y + .6, PD_TOP + .1), (.4, .4, .2), m=BRASS); obj('pd_lamp_p', CYL8, (PD_X + 2.6, PD_Y + .6, PD_TOP + .8), (.06, .06, 1.4), m=BRASS)
obj('pd_lamp_sh', mcyl(16, .6), (PD_X + 2.6, PD_Y + .3, PD_TOP + 1.55), (.6, .6, .35), (20, 0, 0), M_('f_banker', (.1, .5, .25), .3, .6))
for k in range(4): rbox('pd_paper', (1.2, 1.5, .03), (PD_X + .6 + k * .05, PD_Y - .2, PD_TOP + .02 + k * .03), M_('f_paper', (.98, .98, .96), .6), (0, 0, k * 6 - 6), r=.01)
obj('pd_cup', CYL, (PD_X - 2.6, PD_Y + .4, PD_TOP + .35), (.28, .28, .7), m=M_('f_pmug', (.15, .3, .7), .4))
chair('pd_guest1', PD_X - 2.2, -1.6, 0, 1.9, (.6, .14, .16), (.3, .2, .12)); chair('pd_guest2', PD_X + 2.2, -1.6, 0, 1.9, (.6, .14, .16), (.3, .2, .12))
# the principal's big leather chair (he sits facing -Y)
PCH_X, PCH_Y, PCH_TOP = OX, PD_Y + 2.4, 2.15
rbox('pch_seat', (2.6, 2.4, .6), (PCH_X, PCH_Y, PCH_TOP - .3), M_('f_leather', (.22, .12, .08), .35), r=.25)
rbox('pch_back', (2.6, .7, 3.6), (PCH_X, PCH_Y + 1.25, PCH_TOP + 1.6), M_('f_leather', (.22, .12, .08), .35), (8, 0, 0), r=.3)
for sx in (-1, 1): rbox('pch_arm', (.5, 2.2, .5), (PCH_X + sx * 1.4, PCH_Y, PCH_TOP + .7), M_('f_leather', (.22, .12, .08), .35), r=.2)
obj('pch_post', CYL8, (PCH_X, PCH_Y, (PCH_TOP - .6) / 2), (.18, .18, PCH_TOP - .6), m=STEEL)
for k in range(5): obj('pch_foot', CYL8, (PCH_X + math.cos(k * 1.2566) * .9, PCH_Y + math.sin(k * 1.2566) * .9, .15), (.09, .09, 1.8), (90, 0, math.degrees(k * 1.2566) + 90), STEEL)
# back wall: bookshelves + diplomas + school crest
for sx in (-1, 1):
    rbox('of_shelf', (5.6, 1.4, 8.4), (OX + sx * 7.2, OY1 - .8, 4.2), MAHO, r=.05)
    for k in range(4):
        box('of_shelf_b', (5.2, 1.3, .14), (OX + sx * 7.2, OY1 - .85, 1.2 + k * 2.0), MAHO)
        books_row(OX + sx * 7.2 - 2.3, OY1 - 1.0, 1.3 + k * 2.0, 4.4, 0, 700 + k + sx * 10, .8, 1.4)
CREST = empty('crest', (OX, OY1 - .12, 8.0))
obj('crest_b', CYL, (0, 0, 0), (1.5, 1.5, .15), (90, 0, 0), M_('f_crest', (.95, .75, .2), .3), CREST)
obj('crest_i', CYL, (0, -.1, 0), (1.2, 1.2, .1), (90, 0, 0), M_('f_crest_i', (.15, .25, .6), .4), CREST)
label('S', (0, -.2, 0), 1.2, (1, .85, .3), parent=CREST, extrude=.04)
for k in range(3): frame_art(OX - 1.8 + k * 1.8, OY1 - .15, 5.4, 1.2, .9, 0, (.97, .95, .88), 800 + k)
for k in range(2):
    e_ = empty('flag', (OX + (-4.2 if k == 0 else 4.2), OY1 - 2.0, 0))
    obj('flag_pole', CYL8, (0, 0, 4.0), (.08, .08, 8.0), m=BRASS, parent=e_); obj('flag_top', SPH, (0, 0, 8.1), (.2, .2, .2), m=BRASS, parent=e_)
    box('flag_cloth', (1.8, .05, 1.2), (.95, 0, 6.9), M_('f_flag%d' % k, ((.15, .3, .75), (.95, .75, .2))[k], .7), (0, 0, 8), e_)
    if k == 0: obj('flag_star', SPH, (.95, -.06, 6.9), (.3, .03, .3), m=WHITEM, parent=e_)
# east window, trophy cabinet (west), ficus, filing cabinet, door (south)
window(OX1 - .35, 2, 6.2, 5.0, 4.6, 90, GLASS, 'white')
for sy in (-1, 1): rbox('of_curt', (.4, 1.4, 6.0), (OX1 - .7, 2 + sy * 3.3, 6.0), M_('f_of_curt', (.95, .85, .55), .8), r=.2)
plane('of_view', (60, 30), (OX1 + 10, 0, 6), M_('f_cf_view', (.55, .82, .5), .9), (90, 0, 90))
rbox('troph_cab', (1.6, 5.0, 6.0), (OX0 + .9, -1, 3.0), MAHO, r=.05)
box('troph_glass', (.1, 4.4, 5.0), (OX0 + 1.72, -1, 3.4), GLASS, shadow=False)
for k in range(6):
    tz = 1.4 + (k // 3) * 2.2; ty = -2.6 + (k % 3) * 1.6
    obj('troph_cup', mcyl(16, .5), (OX0 + 1.0, ty, tz + .6), (.4, .4, .7), (180, 0, 0), M_('f_gold', (1, .78, .25), .25, ))
    obj('troph_base', CYL, (OX0 + 1.0, ty, tz + .1), (.3, .3, .3), m=MAHO)
pot_plant(OX1 - 1.6, OY0 + 1.6, 0, 1.6, 77)
rbox('file_cab', (1.6, 2.0, 4.4), (OX0 + .9, OY0 + 2.0, 2.2), M_('f_filecab', (.55, .58, .62), .35), r=.05)
for k in range(3): box('file_handle', (.1, .8, .12), (OX0 + 1.75, OY0 + 2.0, 1.0 + k * 1.4), STEEL)
rbox('of_door', (3.2, .25, 7.0), (OX - 4.0, OY0 + .05, 3.5), wood_mat('f_door', (.55, .35, .2), 'XZ'), r=.05)
obj('of_knob', SPH, (OX - 5.2, OY0 + .3, 3.4), (.15, .15, .15), m=BRASS)
log('office built', round(time.time() - T0, 1), 's')

# ====================================================================================== 4) LIVING ROOM (x -318..-282, y -14..14)
LX = -300.
LX0, LX1, LY0, LY1, LH = LX - 18, LX + 18, -14., 14., 11.
plane('lv_floor', (LX1 - LX0, LY1 - LY0), (LX, 0, 0), wood_mat('f_lv_floor', (.78, .56, .34), 'XY', 1.0, 7., .4))
plane('lv_rug', (16, 11), (LX, -2.5, .02), stripe_mat('f_lv_rug', (.25, .62, .65), (.95, .92, .82), 1.4, 'XY', 1, .95))
box('lv_ceil', (LX1 - LX0 + 2, LY1 - LY0 + 2, .4), (LX, 0, LH + .2), M_('f_lv_ceil', (.98, .97, .95), .8))
LVW = plaster_mat('f_lv_wall', (.99, .84, .7)); LVW_Y = plaster_mat('f_lv_wall_y', (.99, .84, .7), 'YZ')
LVACC = plaster_mat('f_lv_acc', (.35, .62, .62))
box('lv_wall_n', (LX1 - LX0 + 1.2, .6, LH), (LX, LY1 + .3, LH / 2), LVACC)
box('lv_wall_s', (LX1 - LX0 + 1.2, .6, LH), (LX, LY0 - .3, LH / 2), LVW)
box('lv_wall_e', (.6, LY1 - LY0 + 1.2, LH), (LX1 + .3, 0, LH / 2), LVW_Y); box('lv_wall_w', (.6, LY1 - LY0 + 1.2, LH), (LX0 - .3, 0, LH / 2), LVW_Y)
for (L_, loc, al) in ((LX1 - LX0, (LX, LY1 - .1), 'x'), (LX1 - LX0, (LX, LY0 + .1), 'x'), (LY1 - LY0, (LX1 - .1, 0), 'y'), (LY1 - LY0, (LX0 + .1, 0), 'y')):
    box('lv_base', (L_, .2, .5) if al == 'x' else (.2, L_, .5), (loc[0], loc[1], .25), TRIMW)
# mustard sofa (faces +Y, toward the TV wall)
MUSTARD = M_('f_mustard', (.95, .7, .2), .8); MUST2 = M_('f_mustard2', (.88, .62, .16), .8)
SF_Y = -6.6; SF_TOP = 2.05
rbox('sf_base', (10.6, 3.6, 1.3), (LX, SF_Y, .85), MUST2, r=.25)
for k in range(3):
    rbox('sf_cush', (3.3, 2.8, .65), (LX - 3.4 + k * 3.4, SF_Y + .25, SF_TOP - .32), MUSTARD, r=.28)
    rbox('sf_back', (3.3, .9, 2.4), (LX - 3.4 + k * 3.4, SF_Y - 1.4, 2.9), MUSTARD, (10, 0, 0), r=.32)
for sx in (-1, 1): rbox('sf_arm', (.9, 3.6, 2.3), (LX + sx * 5.3, SF_Y, 1.5), MUST2, r=.35)
for sx in (-4.8, 4.8):
    for sy in (-1.4, 1.4): obj('sf_foot', CYL8, (LX + sx, SF_Y + sy, .12), (.15, .15, .24), m=wood_mat('f_foot', (.4, .25, .12)))
for k, col in enumerate(((.3, .62, .65), (.95, .45, .35))): rbox('sf_pillow', (1.8, .6, 1.6), (LX - 4.2 + k * 8.4, SF_Y - .6, 2.9), M_('f_pil%d' % k, col, .9), (12, 0, (k * 2 - 1) * -10), r=.28)
SOFA_SEATS = [(LX - 3.4, SF_Y + .3), (LX, SF_Y + .3), (LX + 3.4, SF_Y + .3)]
# coffee table, TV wall (TV + stand), shelves, floor lamp (the brother eats it), window, art, plants
rbox('ct_top2', (5.6, 3.0, .25), (LX, -1.4, 1.8), wood_mat('f_ctab', (.62, .42, .25)), r=.12)
for sx in (-1, 1):
    for sy in (-1, 1): obj('ct_leg2', CYL8, (LX + sx * 2.4, -1.4 + sy * 1.2, .85), (.12, .12, 1.7), m=wood_mat('f_ctab', (.62, .42, .25)))
for k in range(2): rbox('ct_mag', (1.2, 1.6, .08), (LX - 1.2 + k * .3, -1.2, 2.0 + k * .08), M_('f_mag%d' % k, ((.95, .4, .4), (.4, .6, .95))[k], .5), (0, 0, k * 15), r=.02)
obj('ct_bowl', CYL, (LX + 1.4, -1.6, 2.1), (.8, .8, .3), m=M_('f_ctbowl', (.95, .95, .92), .3))
TVS_Y = LY1 - 1.4
rbox('tv_stand', (8.0, 2.2, 2.2), (LX, TVS_Y, 1.1), wood_mat('f_tvstand', (.55, .36, .2)), r=.06)
for k in range(3): box('tvs_door', (2.4, .1, 1.6), (LX - 2.6 + k * 2.6, TVS_Y - 1.12, 1.1), M_('f_tvdoor', (.98, .95, .9), .5))
TV = empty('tv', (LX, TVS_Y - .1, 2.2))
rbox('tv_b', (5.2, .4, 3.2), (0, 0, 1.9), BLACKM, parent=TV, r=.08)
TV_SCR = box('tv_scr', (4.9, .05, 2.9), (0, -.22, 1.9), M_('f_tvscr', (.35, .65, 1.), .2, 1.4), parent=TV, shadow=False)
obj('tv_ft', CYL, (0, 0, .1), (.8, .5, .2), m=BLACKM, parent=TV)
TVC = empty('tv_cartoon', (0, -.26, 1.9), parent=TV)
obj('tvc_sun', CYL, (1.5, 0, .8), (.45, .03, .45), (90, 0, 0), M_('f_tvc_sun', (1, .85, .2), .4, 2.0), TVC, shadow=False)
obj('tvc_hill', SPH, (-.6, 0, -1.3), (2.0, .03, .9), m=M_('f_tvc_hill', (.3, .85, .3), .5, 1.5), parent=TVC, shadow=False)
TVC_BALL = obj('tvc_ball', SPH, (-1.2, -.02, 0), (.35, .03, .35), m=M_('f_tvc_ball', (1, .25, .3), .4, 1.8), parent=TVC, shadow=False)
for sx in (-1, 1):
    rbox('lv_shelf', (3.2, 1.2, 7.0), (LX + sx * 7.0, LY1 - .7, 3.5), wood_mat('f_tvstand', (.55, .36, .2)), r=.05)
    for k in range(3):
        box('lv_shelf_b', (3.0, 1.1, .12), (LX + sx * 7.0, LY1 - .75, 1.5 + k * 2.0), wood_mat('f_tvstand', (.55, .36, .2)))
        books_row(LX + sx * 7.0 - 1.3, LY1 - .9, 1.6 + k * 2.0, 1.6, 0, 500 + k + sx * 7, .7, 1.2)
        obj('lv_vase', CYL, (LX + sx * 7.0 + .9, LY1 - .8, 2.0 + k * 2.0), (.3, .3, .8), m=M_('f_lvvase%d' % k, ((.95, .55, .35), (.3, .62, .65), (.98, .9, .6))[k], .3))
frame_art(LX - 3.5, LY1 - .1, 8.3, 3.0, 2.0, 0, (.98, .95, .88), 811); frame_art(LX + 3.5, LY1 - .1, 8.3, 3.0, 2.0, 0, (.95, .9, .8), 812)
LAMP = empty('flamp', (LX + 10.6, LY1 - 2.6, 0))
obj('fl_base', CYL, (0, 0, .12), (.8, .8, .24), m=BRASS, parent=LAMP); obj('fl_pole', CYL8, (0, 0, 3.3), (.08, .08, 6.4), m=BRASS, parent=LAMP)
obj('fl_shade', mcyl(16, .65), (0, 0, 6.8), (1.1, 1.1, 1.3), m=M_('f_flshade', (.99, .93, .78), .7, 1.0), parent=LAMP)
window(LX0 + .35, 0, 6.0, 6.0, 5.0, -90, GLASS, 'white')
for sy in (-1, 1): rbox('lv_curt', (.4, 1.6, 7.0), (LX0 + .7, sy * 3.8, 5.8), M_('f_lv_curt', (.95, .45, .35), .9), r=.2)
plane('lv_view', (60, 30), (LX0 - 10, 0, 6), M_('f_cf_view', (.55, .82, .5), .9), (90, 0, -90))
pot_plant(LX0 + 1.8, LY1 - 1.8, 0, 1.5, 41); pot_plant(LX1 - 1.8, LY0 + 1.8, 0, 1.4, 42)
obj('lv_pend', SPH, (LX, 0, LH - 1.2), (1.2, 1.2, .8), m=M_('f_pend', (1, .95, .85), .4, 1.2)); obj('lv_pend_c', CYL8, (LX, 0, LH - .4), (.04, .04, .8), m=BLACKM)
rbox('lv_sidetab', (1.8, 1.8, .2), (LX - 6.6, SF_Y + .4, 2.3), wood_mat('f_ctab', (.62, .42, .25)), r=.05); obj('lv_st_leg', CYL8, (LX - 6.6, SF_Y + .4, 1.1), (.15, .15, 2.2), m=BRASS)
obj('lv_st_plant', SPH, (LX - 6.6, SF_Y + .4, 2.9), (.5, .5, .55), m=M_('f_leaf', (.25, .6, .3), .7))
log('living room built', round(time.time() - T0, 1), 's')

# ====================================================================================== 5) DINING ROOM with the big mirror (x -614..-586, y -12..12)
DX = -600.
DX0, DX1, DY0, DY1, DH = DX - 14, DX + 14, -12., 12., 11.
plane('dn_floor', (DX1 - DX0, DY1 - DY0), (DX, 0, 0), wood_mat('f_dn_floor', (.7, .48, .28), 'XY', .9, 6., .35))
plane('dn_rug', (14, 9), (DX + 2, -1, .02), stripe_mat('f_dn_rug', (.92, .86, .72), (.85, .55, .3), .8, 'XY', 0, .95))
box('dn_ceil', (DX1 - DX0 + 2, DY1 - DY0 + 2, .4), (DX, 0, DH + .2), M_('f_dn_ceil', (.98, .97, .95), .8))
SAGE = plaster_mat('f_dn_sage', (.52, .74, .56)); SAGE_Y = plaster_mat('f_dn_sage_y', (.52, .74, .56), 'YZ')
WAIN = M_('f_dn_wain', (.98, .97, .94), .5)
MIR_X, MIR_W, MIR_Z0, MIR_Z1 = DX - 6., 4.4, 1.4, 8.0
# north wall built around the mirror opening
def nwall(x0, x1, z0, z1):
    if x1 > x0 and z1 > z0:
        box('dn_wn', (x1 - x0, .6, z1 - z0), ((x0 + x1) / 2, DY1 + .3, (z0 + z1) / 2), SAGE if z0 >= 3.4 else WAIN) if not (z0 < 3.4 < z1) else (
            box('dn_wn_lo', (x1 - x0, .6, 3.4 - z0), ((x0 + x1) / 2, DY1 + .3, (z0 + 3.4) / 2), WAIN), box('dn_wn_hi', (x1 - x0, .6, z1 - 3.4), ((x0 + x1) / 2, DY1 + .3, (3.4 + z1) / 2), SAGE))
nwall(DX0 - .6, MIR_X - MIR_W / 2, 0, DH); nwall(MIR_X + MIR_W / 2, DX1 + .6, 0, DH)
nwall(MIR_X - MIR_W / 2, MIR_X + MIR_W / 2, 0, MIR_Z0); nwall(MIR_X - MIR_W / 2, MIR_X + MIR_W / 2, MIR_Z1, DH)
for (nm_, sz, loc) in (('s', (DX1 - DX0 + 1.2, .6), (DX, DY0 - .3)), ('e', (.6, DY1 - DY0 + 1.2), (DX1 + .3, 0)), ('w', (.6, DY1 - DY0 + 1.2), (DX0 - .3, 0))):
    box('dn_wall_lo_' + nm_, (sz[0], sz[1], 3.4), (loc[0], loc[1], 1.7), WAIN)
    box('dn_wall_hi_' + nm_, (sz[0], sz[1], DH - 3.4), (loc[0], loc[1], 3.4 + (DH - 3.4) / 2), SAGE_Y if nm_ in ('e', 'w') else SAGE)
for (L_, loc, al) in ((DX1 - DX0, (DX, DY0 + .05), 'x'), (DY1 - DY0, (DX1 - .05, 0), 'y'), (DY1 - DY0, (DX0 + .05, 0), 'y')):
    box('dn_rail', (L_, .25, .25) if al == 'x' else (.25, L_, .25), (loc[0], loc[1], 3.45), TRIMW)
for (x0, x1) in ((DX0, MIR_X - MIR_W / 2 - .5), (MIR_X + MIR_W / 2 + .5, DX1)): box('dn_rail_n', (x1 - x0, .25, .25), ((x0 + x1) / 2, DY1 - .05, 3.45), TRIMW)
# the mirror: gold frame, faint glass, and a mirrored copy of the room behind it (so the banana dad sees himself)
MIRC = (MIR_Z0 + MIR_Z1) / 2
for (sx_, sz_, lx_, lz_) in (((MIR_W + .8), .45, MIR_X, MIR_Z1 + .2), ((MIR_W + .8), .45, MIR_X, MIR_Z0 - .2), (.45, MIR_Z1 - MIR_Z0 + .8, MIR_X - MIR_W / 2 - .2, MIRC), (.45, MIR_Z1 - MIR_Z0 + .8, MIR_X + MIR_W / 2 + .2, MIRC)):
    rbox('mir_frame', (sx_, .5, sz_), (lx_, DY1 - .15, lz_), M_('f_gold', (1, .78, .25), .25), r=.12)
box('mir_glass', (MIR_W, .04, MIR_Z1 - MIR_Z0), (MIR_X, DY1 + .02, MIRC), mat('f_mirglass', (.85, .92, 1.), .05, 0., None, 0., .12), shadow=False)
RD = 9.0   # depth of the reflected room
plane('mir_floor', (MIR_W + 6, RD), (MIR_X, DY1 + RD / 2, 0), wood_mat('f_dn_floor', (.7, .48, .28), 'XY', .9, 6., .35))
box('mir_back', (MIR_W + 6, .4, DH), (MIR_X, DY1 + RD, DH / 2), SAGE)
box('mir_back_lo', (MIR_W + 6, .5, 3.4), (MIR_X, DY1 + RD - .1, 1.7), WAIN)
for sx in (-1, 1): box('mir_side', (.4, RD, DH), (MIR_X + sx * (MIR_W / 2 + 3), DY1 + RD / 2, DH / 2), SAGE_Y)
box('mir_ceil', (MIR_W + 6, RD, .4), (MIR_X, DY1 + RD / 2, DH + .2), M_('f_dn_ceil', (.98, .97, .95), .8))
frame_art(MIR_X + 1.6, DY1 + RD - .3, 6.6, 2.4, 1.6, 0, (.95, .9, .8), 820)
# wall clock (spins through the hour), dining table + chairs, chandelier, sideboard with fruit bowl, cookie jar, window, plants
DCLK = empty('dn_clock', (DX + 4.0, DY1 - .1, 7.6))
obj('dclk_rim', mesh_torus(1.15, .14, 32, 8), (0, 0, 0), (1, 1, 1), (0, 0, 0), M_('f_gold', (1, .78, .25), .25), DCLK)
obj('dclk_face', CYL, (0, -.02, 0), (1.12, 1.12, .05), (90, 0, 0), WHITEM, DCLK)
for k in range(12): box('dclk_tick', (.07, .04, .2), (math.sin(k * .5236) * .9, -.08, math.cos(k * .5236) * .9), BLACKM, (0, k * 30, 0), DCLK)
DCLK_H = empty('dclk_hp', (0, -.1, 0), parent=DCLK); box('dclk_h', (.1, .04, .55), (0, 0, .22), BLACKM, parent=DCLK_H)
DCLK_M = empty('dclk_mp', (0, -.13, 0), parent=DCLK); box('dclk_m', (.07, .04, .85), (0, 0, .36), M_('f_redhand', (.85, .1, .1), .4), parent=DCLK_M)
DT_X, DT_Y, DT_TOP = DX + 2.0, -1.0, 3.0
rbox('dt_top', (10.0, 4.8, .25), (DT_X, DT_Y, DT_TOP - .12), wood_mat('f_dtab', (.6, .38, .2)), r=.08)
for sx in (-1, 1):
    for sy in (-1, 1): obj('dt_leg', mcyl(12, .7), (DT_X + sx * 4.4, DT_Y + sy * 1.9, (DT_TOP - .25) / 2), (.22, .22, DT_TOP - .25), m=wood_mat('f_dtab', (.6, .38, .2)))
box('dt_runner', (9.0, 1.4, .03), (DT_X, DT_Y, DT_TOP + .02), M_('f_runner', (.95, .9, .78), .7))
DCH = []   # (x, y, heading) of the dining chairs
for k, (cx_, cy_, h_) in enumerate(((DT_X - 3.0, DT_Y + 3.2, 180), (DT_X, DT_Y + 3.2, 180), (DT_X + 3.0, DT_Y + 3.2, 180), (DT_X - 3.0, DT_Y - 3.2, 0), (DT_X + 3.0, DT_Y - 3.2, 0), (DT_X + 6.2, DT_Y, 90))):
    chair('dn_chair', cx_, cy_, h_, 1.9, (.95, .95, .92), (.55, .36, .2)); DCH.append((cx_, cy_, h_))
for k in range(5):
    px_ = DT_X - 3.0 + (k % 3) * 3.0 if k < 3 else DT_X + (-3.0 if k == 3 else 3.0)
    py_ = DT_Y + 1.4 if k < 3 else DT_Y - 1.4
    obj('dn_plate', CYL, (px_, py_, DT_TOP + .05), (.75, .75, .06), m=WHITEM); obj('dn_plate_rim', mesh_torus(.72, .05, 24, 6), (px_, py_, DT_TOP + .08), (1, 1, 1), (90, 0, 0), m=M_('f_platerim', (.3, .55, .85), .3))
    obj('dn_glass', CYL, (px_ + .9, py_ + (.4 if k < 3 else -.4), DT_TOP + .45), (.18, .18, .8), m=GLASS, shadow=False)
CHAND = empty('chand', (DT_X, DT_Y, DH - 2.4))
obj('chd_rod', CYL8, (0, 0, 1.4), (.06, .06, 2.4), m=BRASS, parent=CHAND); obj('chd_ring', mesh_torus(1.6, .1, 32, 6), (0, 0, 0), (1, 1, 1), (90, 0, 0), m=BRASS, parent=CHAND)
for k in range(6):
    a_ = k * 1.047; obj('chd_bulb', SPH, (math.cos(a_) * 1.6, math.sin(a_) * 1.6, .35), (.22, .22, .3), m=M_('f_chbulb', (1, .9, .7), .3, 3.0), parent=CHAND, shadow=False)
SB_X = DX0 + 1.0
rbox('sideboard', (2.0, 7.0, 3.2), (SB_X, -1.0, 1.6), wood_mat('f_tvstand', (.55, .36, .2)), r=.06)
for k in range(3): box('sb_door', (.1, 2.1, 2.4), (SB_X + 1.02, -3.3 + k * 2.3, 1.6), M_('f_sbdoor', (.98, .95, .9), .5))
obj('fruit_bowl', CYL, (SB_X + .1, 1.0, 3.45), (1.0, 1.0, .35), m=M_('f_fbowl', (.3, .62, .85), .3))
for k in range(3): obj('fb_orange', SPH, (SB_X + (k - 1) * .4, 1.2 - k * .15, 3.75), (.3, .3, .3), m=M_('f_orange', (1, .55, .1), .5))
obj('sb_vase', CYL, (SB_X, -3.8, 4.0), (.4, .4, 1.4), m=M_('f_sbvase', (.95, .95, .92), .3))
for k in range(5): obj('sb_flw', SPH, (SB_X + (k % 2 - .5) * .4, -3.8 + (k // 2 - 1) * .3, 4.9), (.25, .25, .25), m=M_('f_flw%d' % (k % 3), ((1, .5, .3), (.95, .3, .5), (1, .85, .2))[k % 3], .6))
window(DX1 - .35, 0, 6.0, 6.0, 5.0, 90, GLASS, 'white')
for sy in (-1, 1): rbox('dn_curt', (.4, 1.6, 7.0), (DX1 - .7, sy * 3.8, 5.8), M_('f_dn_curt', (.98, .95, .85), .9), r=.2)
plane('dn_view', (60, 30), (DX1 + 10, 0, 6), M_('f_cf_view', (.55, .82, .5), .9), (90, 0, 90))
pot_plant(DX1 - 1.8, DY1 - 1.8, 0, 1.6, 51); pot_plant(DX0 + 1.8, DY0 + 1.8, 0, 1.3, 52)
rbox('dn_door', (.25, 3.2, 7.0), (DX0 + .05, 7.0, 3.5), wood_mat('f_door', (.55, .35, .2), 'YZ'), r=.05)
obj('dn_knob', SPH, (DX0 + .3, 5.9, 3.4), (.15, .15, .15), m=BRASS)
DOOR_PT = (DX0 + 1.0, 7.0)
log('dining room built', round(time.time() - T0, 1), 's')

# ====================================================================================== 6) BACKYARD SANDBOX (x 188..212, y -912..-888) + 7) THE BEACH (x -40..40, y -940..-860)
YX, YY = 200., -900.
plane('yd_lawn', (60, 50), (YX, YY + 5, 0), LAWN)
box('yd_house', (40, .8, 14), (YX, YY + 9.5, 7), stripe_mat('f_siding', (.98, .96, .9), (.9, .88, .82), .5, 'XZ', 0, .7))
window(YX - 6, YY + 9.05, 6.2, 4.0, 3.6, 0, GLASS, 'white'); window(YX + 7, YY + 9.05, 6.2, 4.0, 3.6, 0, GLASS, 'white')
rbox('yd_door', (3.0, .3, 6.4), (YX + .5, YY + 9.0, 3.2), M_('f_yddoor', (.3, .55, .85), .4), r=.06)
box('yd_deck', (10, 4, .5), (YX + .5, YY + 7.2, .25), wood_mat('f_deck', (.65, .45, .28), 'XY', .7, 5.))
for k in range(12): box('yd_fence', (.3, .3, 3.4), (YX - 15, YY + 8 - k * 1.6, 1.7), WHITEM); box('yd_fence2', (.3, .3, 3.4), (YX + 15, YY + 8 - k * 1.6, 1.7), WHITEM)
for sx in (-15, 15): box('yd_fence_r', (.2, 18, .3), (YX + sx, YY - 1, 2.6), WHITEM)
tree2(YX - 11, YY + 3, 1.0, False, False); tree2(YX + 12, YY - 6, .9, False, False)
for k, (bx, by) in enumerate(((YX - 9, YY + 7.4), (YX + 9, YY + 7.4), (YX - 13, YY - 6))): bush(bx, by, 1.0, ('green', 'lime', 'teal')[k])
for k in range(10): obj('yd_flower', SPH, (YX - 7 + k * 1.5, YY + 7.8 - (k % 2) * .4, .5), (.35, .35, .35), m=FLW[k % 4])
SANDM = M_('f_sand', (.96, .86, .6), .9)
SB2 = empty('sandbox', (YX, YY - 1.0, 0))
obj('sbx_rim', mesh_torus(3.2, .45, 40, 10), (0, 0, .45), (1, 1, 1), (90, 0, 0), m=M_('f_turtle', (.3, .72, .35), .5), parent=SB2)
obj('sbx_sand', CYL, (0, 0, .5), (3.1, 3.1, .5), m=SANDM, parent=SB2)
obj('sbx_head', SPH, (0, -3.8, .9), (.9, .8, .8), m=M_('f_turtle', (.3, .72, .35), .5), parent=SB2)
for sx in (-1, 1): obj('sbx_eye', SPH, (sx * .35, -4.45, 1.2), (.15, .1, .15), m=BLACKM, parent=SB2)
for k in range(4): obj('sbx_foot', SPH, (math.cos(k * 1.57 + .78) * 3.3, math.sin(k * 1.57 + .78) * 3.3, .3), (.6, .6, .35), m=M_('f_turtle', (.3, .72, .35), .5), parent=SB2)
obj('sbx_bucket', mcyl(16, 1.25), (YX + 1.8, YY - 1.6, 1.1), (.45, .45, .7), m=M_('f_bucket', (.95, .3, .3), .4))
obj('sbx_spade', CYL8, (YX - 1.9, YY - .2, 1.2), (.06, .06, 1.2), (30, 20, 0), M_('f_spade', (.2, .5, .95), .4))
for k in range(3): obj('sbx_mold', mcyl(16, .6), (YX + .6 + k * .7, YY + .6, 1.1), (.3, .3, .35), m=M_('f_mold%d' % k, ((1, .85, .2), (.4, .8, .95), (.95, .5, .8))[k], .4))
# THE BEACH (the baby sister) — warm sand, turquoise sea, palms, umbrella, towels
BXC, BYC = 0., -900.
plane('bc_sand', (120, 90), (BXC, BYC + 10, 0), SANDM)
SEA = mat('f_sea', (.12, .62, .82), .1, 0., (.05, .35, .55), .25)
plane('bc_sea', (400, 300), (BXC, BYC - 170, -.15), SEA)
for k in range(6): box('bc_foam', (120, .6, .06), (BXC, BYC - 22 - k * 4.0, -.06), M_('f_foam', (.95, .98, 1.), .6, .3), shadow=False)
plane('bc_wet', (120, 6), (BXC, BYC - 21, .01), M_('f_wetsand', (.82, .7, .45), .4))
def palm(x, y, s=1., lean=12., rz=0.):
    e = empty('palm', (x, y, 0), rot=(0, 0, rz)); tm_ = M_('f_palmtrunk', (.6, .45, .28), .8)
    for k in range(7): obj('pt_seg', mcyl(10, .85), (math.sin(lean * D2R) * k * 1.2 * s, 0, (k * 1.35 + .6) * s), (.55 * s * (1 - k * .05),) * 2 + (1.4 * s,), (0, lean, 0), tm_, e)
    top = Vector((math.sin(lean * D2R) * 8.4 * s, 0, 9.6 * s)); lm_ = M_('f_palmleaf', (.2, .62, .25), .7)
    for k in range(7):
        a_ = k * 51.4
        obj('pt_leaf', SPH, (top.x + math.cos(a_ * D2R) * 2.4 * s, top.y + math.sin(a_ * D2R) * 2.4 * s, top.z - .5 * s), (2.8 * s, .55 * s, .14 * s), (0, 22, a_), lm_, e)
    for k in range(3): obj('pt_coco', SPH, (top.x + (k - 1) * .35 * s, (k % 2) * .3 * s, top.z - .5 * s), (.35 * s,) * 3, m=M_('f_coco', (.45, .3, .15), .7), parent=e)
for k, (px_, py_, s_, rz_) in enumerate(((BXC - 18, BYC + 8, 1.1, 20), (BXC - 23, BYC + 2, .9, 60), (BXC + 19, BYC + 9, 1.2, 150), (BXC + 25, BYC + 1, .95, 120), (BXC - 30, BYC + 14, 1.0, 10))): palm(px_, py_, s_, 12, rz_)
umbrella(BXC - 9, BYC - 4, 0., 'red')
for k, (tx, ty, col) in enumerate(((BXC - 9, BYC - 6.5, (.3, .6, .95)), (BXC + 8, BYC - 7.5, (1, .8, .2)))):
    rbox('bc_towel', (2.6, 5.0, .06), (tx, ty, .04), stripe_mat('f_towel%d' % k, col, (.98, .97, .95), .5, 'XY', 0, .9), r=.02)
obj('bc_ball', SPH, (BXC + 12, BYC - 12, .9), (.9, .9, .9), m=stripe_mat('f_bball', (1, .3, .3), (.98, .98, .95), .5, 'XZ', 1, .5))
CASTLE_S = empty('sandcastle', (BXC + 6.5, BYC - 12.5, 0))
for sx in (-1, 1): obj('scs_tower', CYL, (sx * 1.0, 0, .7), (.55, .55, 1.4), m=SANDM, parent=CASTLE_S); obj('scs_top', CONE16, (sx * 1.0, 0, 1.75), (.6, .6, .7), m=SANDM, parent=CASTLE_S)
box('scs_wall', (2.0, .6, .9), (0, 0, .45), SANDM, parent=CASTLE_S); obj('scs_flag', CONE, (1.0, 0, 2.4), (.25, .03, .2), (90, 0, 0), M_('f_scflag', (1, .3, .3), .5), CASTLE_S)
for k in range(8): obj('bc_shell', SPH, (BXC - 14 + k * 3.7, BYC - 16 + (k % 3) * 2.2, .1), (.22, .18, .08), (0, 0, k * 40), M_('f_shell%d' % (k % 2), ((1, .8, .75), (.98, .95, .88))[k % 2], .4))
for k in range(3):
    e_ = empty('gull', (BXC - 10 + k * 9, BYC - 30, 14 + k * 2))
    for sx in (-1, 1): box('gull_w', (1.2, .05, .12), (sx * .55, 0, .15), WHITEM, (0, sx * -20, 0), e_)
# the BEACH-BABY: a big sand dune with her face, curl and pink bow
BB_C = Vector((BXC, BYC + 2.0, -.6))
log('yard + beach built', round(time.time() - T0, 1), 's')


# ====================================================================================== CAST
# Uncle (same as before): blue striped pajamas + bedhead
PJ_B, PJ_W = (.42, .58, .9), (.93, .95, 1.)
unc = mkr('unc', 'pr', 'light', 1.15, stripes(PJ_B, PJ_W, 8), PJ_B, PJ_B, (.95, .9, .85), None, ())
set_obj_mat(unc.parts['Left Leg'], outfit_material('unc_leg_pj', [(0, (.95, .9, .85)), (.14, PJ_B), (.3, PJ_W), (.44, PJ_B), (.58, PJ_W), (.72, PJ_B), (.86, PJ_W)]))
set_obj_mat(unc.parts['Right Leg'], unc.parts['Left Leg'].material_slots[0].material)
bpy.context.view_layer.update()
hair_bedhead(unc, (.32, .2, .1))
for k in range(3): tfront(unc, 'pj_button', (.07, .035, .07), (0, .04, .55 - k * .45), (.98, .98, .98), .3, 'Uppertorso', 's')
for s_ in ('L', 'R'): foot_wear(unc, 'unc_snk' + s_, s_, 'slipper', (.7, .5, .32))
# Mom / Dad / baby sister (same family as before)
mom = mkr('mom', 'mom', 'light', 1.05, (.55, .28, .62), (.55, .28, .62), (.22, .28, .5), (.95, .95, .95), ('r_pony', (.35, .2, .1), (.95, .4, .6)), ())
dad = mkr('dad', 'npc', 'light', 1.15, (.22, .45, .78), (.22, .45, .78), (.68, .55, .36), (.35, .22, .12), ('r_swoop', (.25, .15, .08)), ())
tfront(dad, 'polo_btn', (.06, .04, .06), (0, .06, .6), (.97, .97, .97), .3, 'Uppertorso', 's')
for s_ in ('L', 'R'): foot_wear(dad, 'dad_shoe' + s_, s_, 'sneaker', (.4, .25, .14))
BABY_S = .6
baby = mkr('baby', 'mom', 'light', BABY_S, (1., .62, .78), (1., .62, .78), (1., .62, .78), (.98, .98, .97), ('r_short', (.62, .42, .25)), (bow((1., .3, .55)),))
# NEW: the cafeteria bully — green hoodie, blond spikes, red sneakers
bully = mkr('bully', 'tom', 'light', 1.08, (.22, .6, .32), (.22, .6, .32), (.22, .24, .32), (.9, .15, .12), ('r_spiky', (.9, .7, .25)), ())
tback(bully, 'hood', (1.6, .5, .7), (0, -.15, .75), (.18, .5, .26)); tfront(bully, 'hood_pocket', (1.1, .06, .45), (0, .05, -.5), (.18, .5, .26))
for sx in (-1, 1): tfront(bully, 'hood_string', (.06, .06, .38), (sx * .22, .07, .64), (.97, .97, .97))
for s_ in ('L', 'R'): foot_wear(bully, 'bul_snk' + s_, s_, 'sneaker', (.9, .15, .12))
# NEW: the math teacher — mustard sweater vest, white shirt, brown trousers, balding, round glasses, tie
teacher = mkr('teacher', 'npc', 'light', 1.12, (.86, .64, .22), (.97, .97, .97), (.4, .3, .22), (.2, .14, .1), ('r_balding', (.45, .38, .32)), ())
trim(teacher, 'tie', (.24, .05, .9), (0, .03, .1), (.75, .15, .15), r=.04); trim(teacher, 'tie_knot', (.22, .06, .2), (0, .04, .62), (.65, .12, .12), r=.05)
for sx in (-1, 1): trim(teacher, 'collar', (.36, .06, .2), (sx * .2, .02, .75), (.98, .98, .98), rot=(14, 0, sx * -24), r=.05)
for s_ in ('L', 'R'): foot_wear(teacher, 'tch_shoe' + s_, s_, 'sneaker', (.25, .15, .1))
# NEW: three classmates
kid1 = mkr('kid1', 'mom', 'tan', .85, (.95, .45, .62), (.95, .45, .62), (.3, .42, .78), (.98, .98, .98), ('r_bob', (.14, .09, .07)), (bow((1., .85, .2)),))
kid2 = mkr('kid2', 'pr', 'light', .85, (.3, .6, .95), (.3, .6, .95), (.35, .35, .42), (.98, .6, .2), ('r_curly', (.88, .42, .15)), ())
kid3 = mkr('kid3', 'npc', 'brown', .85, (1., .78, .2), (1., .78, .2), (.2, .3, .55), (.2, .45, .95), ('r_short', (.08, .06, .05)), ())
for nm_, col in (('kid1', (.98, .98, .98)), ('kid2', (.98, .6, .2)), ('kid3', (.2, .45, .95))):
    for s_ in ('L', 'R'): foot_wear(CH[nm_], nm_ + '_snk' + s_, s_, 'sneaker', col)
# NEW: the lunch lady — white uniform, teal apron + trousers, grey bun under a hairnet
lady = mkr('lady', 'mom', 'light', 1.1, (.97, .97, .97), (.97, .97, .97), (.25, .55, .58), (.98, .98, .98), ('r_bun', (.62, .62, .66)), (apron((.25, .6, .6)),))
_hm, _hx, _hc = hbb(lady)
attachf(obj('hairnet', SPH, (_hc.x, _hc.y - .05, _hx.z - .1), ((_hx.x - _hm.x) * .62, (_hx.y - _hm.y) * .66, .55 * 1.1), m=mat('f_hairnet', (.98, .98, 1.), .6, 0., None, 0., .45), shadow=False), lady, 'Head')
for s_ in ('L', 'R'): foot_wear(lady, 'lady_shoe' + s_, s_, 'sneaker', (.98, .98, .98))
# NEW: the principal — navy suit, red tie, grey swoop, moustache
prin = mkr('prin', 'npc', 'tan', 1.15, (.16, .2, .36), (.16, .2, .36), (.16, .2, .36), (.08, .08, .1), ('r_swoop', (.62, .62, .64)), ())
facehair(prin, 'stache', (.55, .55, .58))
trim(prin, 'shirt', (.6, .05, 1.0), (0, .01, .2), (.98, .98, .98), r=.03); trim(prin, 'ptie', (.24, .06, .95), (0, .04, .15), (.85, .12, .12), r=.04)
for sx in (-1, 1): trim(prin, 'lapel', (.3, .06, 1.0), (sx * .42, .03, .25), (.12, .15, .28), rot=(0, sx * -12, 0), r=.04)
for s_ in ('L', 'R'): foot_wear(prin, 'prin_shoe' + s_, s_, 'sneaker', (.08, .08, .1))
# NEW: the school secretary — mint blouse, long brown hair, glasses
secr = mkr('secr', 'mom', 'light', 1.0, (.55, .85, .75), (.55, .85, .75), (.28, .28, .34), (.12, .12, .14), ('r_long', (.36, .2, .1)), ())
specs_on(secr, 'round', (.6, .2, .3))
for s_ in ('L', 'R'): foot_wear(secr, 'secr_shoe' + s_, s_, 'sneaker', (.12, .12, .14))
# NEW: the brother who can eat anything — green striped tee, dark curls, red sneakers
bro = mkr('bro', 'pr', 'light', 1.0, stripes((.3, .75, .4), (.95, .95, .9), 6), (.3, .75, .4), (.3, .36, .62), (.9, .15, .12), ('r_curly', (.2, .12, .07)), ())
for s_ in ('L', 'R'): foot_wear(bro, 'bro_snk' + s_, s_, 'sneaker', (.9, .15, .12))
# his belly TV (shows up after he eats the TV): screen with a looping cartoon
_tm, _tx, _tc = tbb(bro); u_ = bro.scale
BELLY = empty('belly_tv', (_tc.x, _tx.y + .02, _tc.z - .1))
rbox('btv_fr', (1.5 * u_, .1 * u_, 1.15 * u_), (0, 0, 0), BLACKM, parent=BELLY, r=.06)
box('btv_scr', (1.36 * u_, .04, 1.0 * u_), (0, .07, 0), M_('f_tvscr', (.35, .65, 1.), .2, 1.4), parent=BELLY, shadow=False)
BTV_SUN = obj('btv_sun', CYL, (.4 * u_, .1, .28 * u_), (.15 * u_, .02, .15 * u_), (90, 0, 0), M_('f_tvc_sun', (1, .85, .2), .4, 2.0), BELLY, shadow=False)
obj('btv_hill', SPH, (-.15 * u_, .1, -.42 * u_), (.6 * u_, .02, .25 * u_), m=M_('f_tvc_hill', (.3, .85, .3), .5, 1.5), parent=BELLY, shadow=False)
BTV_BALL = obj('btv_ball', SPH, (-.3 * u_, .11, 0), (.12 * u_, .02, .12 * u_), m=M_('f_tvc_ball', (1, .25, .3), .4, 1.8), parent=BELLY, shadow=False)
attachf(BELLY, bro, 'Uppertorso')
for nm_ in ('kid1', 'kid2', 'kid3', 'bro', 'teacher', 'prin', 'secr', 'lady', 'bully'): fabric_all(CH[nm_], 'cotton', 'denim')
log('cast made', [n for n in CH], round(time.time() - T0, 1), 's')

# ---------------------------------------------------------- FACED OBJECTS (whatever you eat, you turn into) — the face sits on the -Y side
import types
def shaped_mesh(src, name, sc=(1, 1, 1), rotm=None):
    me = src.copy(); me.name = name
    for v in me.vertices:
        co = Vector((v.co.x * sc[0], v.co.y * sc[1], v.co.z * sc[2]))
        v.co = (rotm @ co) if rotm is not None else co
    me.update(); return me
def face_uv(me, cx, cz, fw, fh, top=False):
    uvl = me.uv_layers.new(name='Face')
    for poly in me.polygons:
        if top:
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                uvl.data[li].uv = (((co.x - cx) / fw + .5, (co.y - cz) / fh + .28) if poly.center.z > .3 else (-3., -3.))
            continue
        fr = poly.center.y < -1e-3 and abs(poly.normal.y) > .3
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = (((co.x - cx) / fw + .5, (co.z - cz) / fh + .28) if fr else (-3., -3.))
def disp(o, strength=.06, scale=.35):
    tx = bpy.data.textures.new('f_lump_' + o.name, 'CLOUDS'); tx.noise_scale = scale
    md = o.modifiers.new('lump', 'DISPLACE'); md.texture = tx; md.strength = strength; md.texture_coords = 'LOCAL'; return o
FOBJ = {}      # key -> [object, fam, base col, dark col, noise scale, bump]
def faced(key, me, fam, c1, c2, nscale=4., bump=.15, loc=OFFV):
    o = obj(key, me, loc, (1, 1, 1), (0, 0, 0), M_('f_tmp_' + key, c1, .6)); FOBJ[key] = [o, fam, c1, c2, nscale, bump]; return o
# the bully nugget
_rb = rbox('nug_tmp', (2.6, 1.6, 2.1), (0, 0, -300), NUGC, r=.65, seg=4); NUG_ME = _rb.data.copy(); bpy.data.objects.remove(_rb)
face_uv(NUG_ME, 0, .1, 1.95, 1.95)
NUG = faced('nug', NUG_ME, 'tom', (.88, .58, .2), (.7, .4, .12), 5., .35); disp(NUG, .05, .25)
for k in range(5): obj('nug_crumb', SPH, (math.cos(k * 1.3) * 1.2, .3, .8 + (k % 2) * .2), (.18, .14, .1), m=M_('f_crumb', (.75, .45, .12), .8), parent=NUG)
for sx in (-1, 1): obj('nug_spike', CONE16, (sx * .35, .1, 1.15), (.2, .2, .35), (0, sx * 18, 0), M_('f_bul_hair', (.9, .7, .25), .5), NUG)
obj('nug_spike', CONE16, (0, .2, 1.2), (.22, .22, .42), m=M_('f_bul_hair', (.9, .7, .25), .5), parent=NUG)
# the lunch-lady meatloaf (keeps her hairnet)
_rb = rbox('loaf_tmp', (3.4, 1.9, 1.6), (0, 0, -300), M_('f_loaf', (.45, .26, .15), .7), r=.4, seg=4); LOAF_ME = _rb.data.copy(); bpy.data.objects.remove(_rb)
face_uv(LOAF_ME, 0, -.05, 1.6, 1.6)
LOAF = faced('loaf', LOAF_ME, 'mom', (.5, .3, .17), (.36, .2, .11), 6., .3)
rbox('loaf_glaze', (3.1, 1.6, .2), (0, 0, .8), M_('f_glaze', (.82, .15, .08), .25), parent=LOAF, r=.09)
obj('loaf_net', SPH, (0, .1, .85), (1.5, .85, .55), m=mat('f_hairnet', (.98, .98, 1.), .6, 0., None, 0., .45), parent=LOAF, shadow=False)
obj('loaf_bun', SPH, (0, .45, 1.15), (.35, .35, .3), m=M_('f_ladyhair', (.62, .62, .66), .6), parent=LOAF)
# the principal boiled egg (moustache face + red tie)
EGG_ME = shaped_mesh(SPH, 'egg_me', (1.15, 1.05, 1.5)); face_uv(EGG_ME, 0, .15, 1.55, 1.55)
EGG = faced('egg', EGG_ME, 'npc', (.98, .97, .93), (.9, .88, .82), 3., .05)
rbox('egg_tie', (.32, .08, .85), (0, -1.0, -.75), M_('f_ptie', (.85, .12, .12), .4), (12, 0, 0), EGG, r=.05)
rbox('egg_knot', (.3, .1, .22), (0, -1.03, -.3), M_('f_ptie2', (.7, .1, .1), .4), (12, 0, 0), EGG, r=.06)
# the couch-potato uncle (keeps his bedhead)
POT_ME = shaped_mesh(SPH, 'pot_me', (1.75, 1.2, 1.3)); face_uv(POT_ME, 0, .15, 1.7, 1.7)
POT = faced('pot', POT_ME, 'pr', (.7, .5, .28), (.52, .34, .16), 7., .4); disp(POT, .06, .3)
for k in range(6): obj('pot_eye', SPH, (math.cos(k * 1.1) * 1.4, math.sin(k * 1.1) * .9, .3 + (k % 3) * .25 - .3), (.1, .06, .08), m=M_('f_potspot', (.4, .26, .12), .8), parent=POT)
for k in range(6):
    a_ = k * 1.05; o_ = obj('pot_hair', SPH, (math.cos(a_) * .6, math.sin(a_) * .45 + .1, 1.2 + (k % 2) * .15), (.42, .36, .3), (math.sin(a_) * 35, -math.cos(a_) * 35, 0), M_('u_hair_bed2', (.32, .2, .1), .45), POT)
    md = o_.modifiers.new('disp', 'DISPLACE'); md.texture = HAIRTEX; md.strength = .1
# the banana dad (+ his reflection behind the mirror)
_rb_ry = Matrix.Rotation(math.pi / 2, 3, 'Y')
BAN_ME = shaped_mesh(banana_mesh('banface', 2.8), 'banface_me', (1, 1, 1), _rb_ry); face_uv(BAN_ME, .2, .9, 1.45, 1.45)
BANF = faced('ban', BAN_ME, 'npc', (1., .86, .16), (.92, .72, .1), 3., .05)
BANM = faced('banm', BAN_ME, 'npc', (1., .86, .16), (.92, .72, .1), 3., .05); BANM.scale = (1, -1, 1)
for o_ in (BANF, BANM):
    obj('ban_hair', SPH, (1.2, .05, 2.5), (.5, .42, .28), (0, -30, 0), M_('f_dadhair', (.25, .15, .08), .6), o_)
# the beach-baby: a big sand dune with her face, a curl and her pink bow
BB_ME = shaped_mesh(SPH, 'bb_me', (10.5, 7.0, 3.4)); face_uv(BB_ME, 0, -1.2, 10.0, 10.0, True)
BEACHB = faced('beachb', BB_ME, 'mom', (.97, .87, .6), (.9, .76, .48), 1.2, .25, BB_C)
for sx in (-1, 1): obj('bb_bow', SPH, (sx * 1.3, 1.6, 3.1), (1.2, .5, .85), m=M_('f_bbbow', (1., .3, .55), .5), parent=BEACHB)
obj('bb_knot', SPH, (0, 1.6, 3.1), (.5, .5, .5), m=M_('f_bbbow', (1., .3, .55), .5), parent=BEACHB)
obj('bb_curl', SPH, (0, -.4, 3.3), (.9, .7, .45), (20, 0, 0), M_('f_sandcurl', (.85, .7, .45), .9), BEACHB)
# the cookie hero
COOK_ME = shaped_mesh(CYL, 'cook_me', (1.0, 1.0, .34), Matrix.Rotation(math.pi / 2, 3, 'X')); face_uv(COOK_ME, 0, -.05, 1.5, 1.5)
COOKIE = faced('cookie', COOK_ME, FAMI['hero'], (.86, .62, .33), (.72, .48, .24), 5., .3)
for k in range(9):
    a_ = k * .7 + .3; rr_ = .8 if k % 2 else .62
    if abs(math.sin(a_)) < .45 and math.cos(a_) > 0: continue
    obj('ck_chip', SPH, (math.cos(a_) * rr_, -.17, math.sin(a_) * rr_), (.11, .07, .1), m=M_('f_choc', (.25, .13, .06), .5), parent=COOKIE)
# the cookie keeps ONE signature item of the hero so viewers know it's still them (here: two hair tufts in the hero's hair colour)
_hc = HERO_CFG.get('hair'); _hcol = _col(_hc[1]) if _hc else (.25, .15, .08)
for sx in (-1, 1): obj('ck_hair', SPH, (sx * .62, .02, .7), (.22, .2, .18), m=M_('f_herohair', _hcol, .5), parent=COOKIE)

# ---------------------------------------------------------- HAND PROPS + effects
def ems(name): return empty(name, OFFV)
NUG_H = ems('nug_held'); obj('nh_b', SPH, (0, 0, 0), (.3, .22, .18), m=NUGC, parent=NUG_H)
SPOON = ems('spoon'); obj('sp_h', CYL8, (0, 0, -.45), (.05, .05, .9), m=STEEL, parent=SPOON); obj('sp_bowl', SPH, (0, 0, .05), (.17, .12, .06), m=STEEL, parent=SPOON)
for k in range(3): obj('sp_let', SPH, ((k - 1) * .06, 0, .1), (.05, .03, .04), m=M_('f_pasta', (1, .8, .35), .5), parent=SPOON)
SOUP_B = (TD_X - .2, TD_Y - .3, TD_TOP)
obj('soup_bowl', mcyl(16, 1.4), (SOUP_B[0], SOUP_B[1], SOUP_B[2] + .3), (.55, .55, .55), (180, 0, 0), M_('f_soupbowl', (.95, .95, .92), .3))
obj('soup', CYL, (SOUP_B[0], SOUP_B[1], SOUP_B[2] + .5), (.68, .68, .05), m=M_('f_soup', (.92, .45, .2), .3))
for k in range(9): label('ABCXYZ123'[k], (SOUP_B[0] + math.cos(k * .7) * .4, SOUP_B[1] + math.sin(k * .7) * .4, SOUP_B[2] + .56), .16, (1, .85, .45), (0, 0, k * 40), extrude=.02)
LET = {}
for c_, col in (('X', (1, .55, .2)), ('Y', (1, .8, .25)), ('Z', (.95, .4, .3))):
    LET[c_] = ems('let_' + c_); label(c_, (0, 0, 0), 1.0, col, parent=LET[c_], extrude=.18)
FORK = ems('fork'); obj('fk_h', CYL8, (0, 0, -.4), (.04, .04, .8), m=STEEL, parent=FORK)
rbox('fk_slice', (.5, .25, .35), (0, 0, .15), M_('f_loaf', (.45, .26, .15), .7), parent=FORK, r=.06)
LOAF_STATIC = rbox('loaf_pan_loaf', (2.0, 1.2, .55), (LOAF_PAN[0], LOAF_PAN[1], LOAF_PAN[2] + .1), M_('f_loaf', (.45, .26, .15), .7), r=.15)
box('loaf_pan_glaze', (1.8, 1.0, .1), (LOAF_PAN[0], LOAF_PAN[1], LOAF_PAN[2] + .4), M_('f_glaze', (.82, .15, .08), .25))
SLICE_K = ems('slice_kid'); rbox('slk_tray', (1.6, 1.1, .08), (0, 0, 0), M_('f_tray', (.95, .55, .2), .4), parent=SLICE_K, r=.04)
rbox('slk_slice', (.6, .4, .35), (0, 0, .2), M_('f_loaf', (.45, .26, .15), .7), parent=SLICE_K, r=.06)
SLICE_K2 = ems('slice_kid2'); rbox('slk2_tray', (1.6, 1.1, .08), (0, 0, 0), M_('f_tray1', (.35, .65, .95), .4), parent=SLICE_K2, r=.04)
EGG_H = ems('egg_held'); obj('eh_b', SPH, (0, 0, 0), (.22, .2, .28), m=M_('f_eggw', (.98, .97, .93), .4), parent=EGG_H)
obj('eh_yolk', SPH, (0, -.12, .05), (.12, .05, .12), m=M_('f_yolk', (1, .78, .1), .4), parent=EGG_H)
PAPER = ems('paper'); box('pp_b', (1.0, .03, 1.3), (0, 0, 0), M_('f_paper', (.98, .98, .96), .6), parent=PAPER)
for k in range(4): box('pp_line', (.7, .035, .05), (0, 0, .4 - k * .22), M_('f_pline', (.4, .45, .55), .6), parent=PAPER)
CHIPS = ems('chips'); rbox('cb_bag', (1.0, .4, 1.3), (0, 0, 0), M_('f_chipbag', (.95, .2, .15), .35), parent=CHIPS, r=.15)
box('cb_band', (1.02, .42, .3), (0, 0, .2), M_('f_chipband', (1, .85, .15), .35), parent=CHIPS)
CHIP_H = ems('chip_h'); obj('ch_c', SPH, (0, 0, 0), (.16, .04, .12), m=M_('f_chip', (1, .82, .35), .5), parent=CHIP_H)
BAN_H = ems('ban_held'); obj('bh_b', banana_mesh('banh', .5), (0, 0, 0), (1, 1, 1), (0, 0, 0), M_('f_banana', (1., .86, .15), .5), BAN_H)
SAND_H = ems('sand_h'); obj('sh_s', SPH, (0, 0, 0), (.16, .16, .12), m=SANDM, parent=SAND_H)
VEG = ems('veg'); obj('vg_bowl', mcyl(16, 1.4), (0, 0, .3), (.75, .75, .6), (180, 0, 0), M_('f_vegbowl', (.98, .98, .96), .3), VEG)
for k in range(7):
    a_ = k * .9; rr_ = .45 if k else 0.
    obj('vg_broc', SPH, (math.cos(a_) * rr_, math.sin(a_) * rr_, .72 + (0 if k else .12)), (.32, .32, .28), m=M_('f_broc', (.2, .6, .2), .8), parent=VEG)
for k in range(4): obj('vg_carrot', CONE16, (math.cos(k * 1.6) * .6, math.sin(k * 1.6) * .6, .7), (.1, .1, .45), (70, 0, k * 90), M_('f_carrot', (1, .5, .1), .6), VEG)
STEAM = ems('steam')
for k in range(4): obj('stm', SPH, ((k - 1.5) * .25, 0, k * .35), (.22, .22, .22), m=mat('f_steam', (1, 1, 1), .9, 0., None, 0., .35), parent=STEAM, shadow=False)
COOK_H = ems('cookie_h'); obj('ckh_b', CYL, (0, 0, 0), (.32, .32, .08), (90, 0, 0), M_('f_cookie', (.86, .62, .33), .7), COOK_H)
for k in range(3): obj('ckh_chip', SPH, (math.cos(k * 2.1) * .17, -.05, math.sin(k * 2.1) * .17), (.05, .03, .05), m=M_('f_choc', (.25, .13, .06), .5), parent=COOK_H)
STACK4 = ems('stack4')
for k in range(4):
    obj('s4_ck', CYL, (0, 0, k * .1), (.34, .34, .09), m=M_('f_cookie', (.86, .62, .33), .7), parent=STACK4)
    obj('s4_chip', SPH, (.15, -.1, k * .1 + .03), (.05, .05, .03), m=M_('f_choc', (.25, .13, .06), .5), parent=STACK4)
# cookie jar + cookie plate on the dining table (east end, by the hero)
CJ = (DT_X + 4.4, DT_Y + 1.2)
obj('cj_jar', CYL, (CJ[0], CJ[1], DT_TOP + .75), (.55, .55, 1.4), m=GLASS, shadow=False); obj('cj_lid', SPH, (CJ[0], CJ[1], DT_TOP + 1.5), (.6, .6, .25), m=M_('f_cjlid', (.95, .45, .3), .4))
for k in range(4): obj('cj_ck', CYL, (CJ[0], CJ[1], DT_TOP + .2 + k * .22), (.42, .42, .1), m=M_('f_cookie', (.86, .62, .33), .7))
CP_ = (DT_X + 3.8, DT_Y - .8)
obj('ck_plate', CYL, (CP_[0], CP_[1], DT_TOP + .05), (1.3, 1.3, .06), m=WHITEM)
for k in range(5): obj('ck_pl', CYL, (CP_[0] + math.cos(k * 1.25) * .75, CP_[1] + math.sin(k * 1.25) * .75, DT_TOP + .14), (.34, .34, .09), m=M_('f_cookie', (.86, .62, .33), .7))
PUFF = puff_group('puff')
log('props made', round(time.time() - T0, 1), 's')


# ====================================================================================== TIMELINE (cleaned, gap-free VO, 43.11 s, 41 shots)
SHOTS = [('intro_wide', 0.00), ('intro_eat', 1.47), ('bully_steal', 2.14), ('bully_gulp', 3.455), ('bully_poof', 3.845), ('hero_bro', 5.01),
         ('nugget_roll', 6.595), ('teacher_soup', 7.71), ('teacher_letters', 9.07), ('x_pop', 10.255), ('yz_pop', 10.65), ('class_confused', 11.445),
         ('same_before', 12.595), ('hero_sir', 13.38), ('lady_eats', 14.85), ('lady_poof', 16.26), ('lady_noticed', 17.355), ('prin_egg', 18.005),
         ('prin_poof', 19.275), ('prin_noticed', 20.435), ('bro_eats', 21.39), ('bro_tv', 22.71), ('belly_tv', 23.585), ('saturday', 24.96),
         ('unc_chips', 25.96), ('unc_potato', 27.65), ('unc_same', 28.78), ('dad_banana', 29.45), ('dad_poof', 30.385), ('mirror_hour', 31.355),
         ('baby_sand', 32.815), ('baby_beach', 34.09), ('beach_weekend', 34.89), ('mom_dinner', 35.87), ('veggies', 36.82), ('everyone_ran', 37.44),
         ('hero_noeat', 38.185), ('hero_cookie', 38.81), ('cookie_poof', 39.755), ('mom_eats', 40.69), ('outro', 42.18)]
shots = [(n, a, (SHOTS[i + 1][1] if i + 1 < len(SHOTS) else DUR + .01)) for i, (n, a) in enumerate(SHOTS)]
S = {n: (a, b) for n, a, b in shots}
def shot_at(t):
    for n, a, b in shots:
        if a <= t < b: return n, t - a
    return shots[-1][0], t - shots[-1][1]
def ts(n): return S[n][0]
def te(n): return S[n][1]
CAF = ('intro_wide', 'intro_eat', 'bully_steal', 'bully_gulp', 'bully_poof', 'hero_bro', 'nugget_roll', 'lady_eats', 'lady_poof', 'lady_noticed')
CLASS = ('teacher_soup', 'teacher_letters', 'x_pop', 'yz_pop', 'class_confused', 'same_before', 'hero_sir')
OFFICE = ('prin_egg', 'prin_poof', 'prin_noticed')
LIVING = ('bro_eats', 'bro_tv', 'belly_tv', 'saturday', 'unc_chips', 'unc_potato', 'unc_same')
DINE_A = ('dad_banana', 'dad_poof', 'mirror_hour')
DINE_B = ('mom_dinner', 'veggies', 'everyone_ran', 'hero_noeat', 'hero_cookie', 'cookie_poof', 'mom_eats', 'outro')
TALK = [('hero', 5.325, 6.595), ('teacher', 10.255, 11.445), ('hero', 13.71, 14.85), ('cookie', 42.18, 43.11)]
HIDE_ = (0., -900., -80., 0., {}, None, 0.)
POOF_T = .16          # how long into a poof shot the swap happens
def seatS(x, y, h, extra, face, seat_top, s, t, seed=0., k=1.):
    bx, by = math.sin(h * D2R), -math.cos(h * D2R)
    return ST(x + bx * .3 * s, y + by * .3 * s, h, add(SIT, breathe(t, .6 * k, seed), extra), face, seat_top - 1.45 * s)
def floorS(x, y, h, extra, face, s, t, seed=0., top=.15):
    bx, by = math.sin(h * D2R), -math.cos(h * D2R)
    return ST(x + bx * .3 * s, y + by * .3 * s, h, add(SIT, {'llLX': -90, 'llRX': -90}, breathe(t, .6, seed), extra), face, top - 1.5 * s)
def EAT(t, sp=9., hand='R'):
    c = abs(math.sin(t * sp))
    if hand == 'R': return {'uaRX': -108 - 12 * c, 'laRX': -78, 'uaRZ': 22, 'hdX': -4 + 4 * c}
    return {'uaLX': -108 - 12 * c, 'laLX': -78, 'uaLZ': -22, 'hdX': -4 + 4 * c}
def chew(t, a='S:content', b='S:cheeky', sp=9.): return a if math.sin(t * sp) > 0 else b
def runner(t, t0, a, b, speed, seed=0.):
    x, y, d, mv, h = along(t, t0, a, b, speed)
    return x, y, h, (run(walkph(d, 3.2) + seed) if mv else {})

# ---------------------------------------------------------- spots
HR_CF = (0., 2.15)                     # the hero on the cafeteria bench (faces -Y)
BUL_P = (2.8, 3.65); BUL_H = face_to(BUL_P[0], BUL_P[1], HR_TRAY[0], HR_TRAY[1])
LADY_P = (-9.5, 14.0)
LOAF_P = Vector((-9.5, 12.2, LC_TOP + .95))
KID3_L, KID2_L = (-12.6, 9.4), (-6.6, 9.4)
DESK_SEATS = [(dx, dy - 2.05) for dx, dy in SDESKS]          # student chairs (face +Y)
TCH_SEAT = (TD_X, TD_Y + 2.2)
NUG_DESK = Vector((DESK_SEATS[3][0], DESK_SEATS[3][1] - .1, SEAT_K + 1.05))
PRIN_SEAT = (PCH_X, PCH_Y)
EGG_P = Vector((PCH_X, PCH_Y - .2, PCH_TOP + 1.5))
SECR_P = (OX - 1.0, PD_Y - 2.6)
BRO_LAMP = (LX + 10.6, LY1 - 4.1); BRO_LH = 0.
BRO_TVP = (LX, TVS_Y - 2.3)
POT_P = Vector((SOFA_SEATS[2][0], SOFA_SEATS[2][1] + .1, SF_TOP + 1.25))
DAD_D = (DX - 6.0, 5.6)
BAN_MIRP = Vector((MIR_X, 9.4, 2.62)); BAN_P0 = Vector((DAD_D[0], DAD_D[1], 2.62))
BABY_SB = (YX, YY - 1.0)
DIN_BRO = DCH[0]; DIN_BAN = DCH[2]; DIN_POT = DCH[3]; DIN_RY = DCH[5]
MOM_DIN = (DT_X, DT_Y - 3.3)
MOM_EAT = (CP_[0] + .5, DT_Y + 3.5)
COOK_P = Vector((CP_[0] + .2, CP_[1], DT_TOP + 1.1))
VEG_T = Vector((DT_X - .2, DT_Y - .5, DT_TOP))
ESC = (DOOR_PT[0] + .5, DOOR_PT[1])

# ---------------------------------------------------------- per-character states
def st_hero(t):
    n, lt = shot_at(t)
    if n in ('intro_wide', 'intro_eat', 'bully_steal', 'bully_gulp', 'bully_poof', 'hero_bro', 'nugget_roll'):
        x, y = HR_CF; h = 180.
        if n == 'intro_wide': return seated(x, y, h, add(EAT(t, 8.), {'uaLX': -40, 'laLX': -50}), chew(t, 'S:content', 'S:cheeky'), BENCH_TOP, 0., t, 1.)
        if n == 'intro_eat': return seated(x, y, h, {'uaRX': -88, 'laRX': -60, 'uaRZ': 16, 'hdX': 10, 'hdY': -6}, 'S:starstruck', BENCH_TOP, 0., t, 1.)
        if n == 'bully_steal':
            k_ = eio(prog(lt, .25, .45))
            return seated(x, y, h, lerpP({'uaRX': -88, 'laRX': -60, 'uaRZ': 16, 'hdX': 10}, {'uaRX': -70, 'laRX': -30, 'uaRZ': 6, 'hdY': -40, 'hdX': -4}, k_), 'S:smile_dots' if k_ < .5 else 'S:shocked_frown', BENCH_TOP, 0., t, 1.)
        if n == 'bully_gulp': return seated(x, y, h, {'uaRX': -55, 'laRX': -40, 'hdY': -45, 'hdX': -6}, 'S:aghast', BENCH_TOP, 0., t, 1.)
        if n == 'bully_poof': return seated(x, y, h, {'hdY': -40, 'spX': -6, 'uaLX': -30, 'uaRX': -30, 'laLX': -40, 'laRX': -40}, 'S:stare_wide', BENCH_TOP, 0., t, 1.)
        if n == 'hero_bro':
            b_ = math.sin(t * 5)
            return seated(x, y, h, add(P['point'], {'uaRZ': -40, 'uaRX': -80 + 6 * b_, 'hdY': -30, 'spY': -10}), 'smirk', BENCH_TOP, 0., t, 1.)
        return seated(x, y, h, {'hdY': -50 + 15 * prog(lt, 0, 1.1), 'uaLX': -30, 'laLX': -60}, 'S:sideeye_flat', BENCH_TOP, 0., t, 1.)
    if n in CLASS:
        x, y = DESK_SEATS[4]
        if n == 'hero_sir':
            b_ = math.sin(t * 6)
            return seated(x, y, 0., {'uaRX': -60 + 8 * b_, 'laRX': -50, 'uaRZ': -8, 'uaLX': -55, 'laLX': -60, 'hdX': -4}, 'tired', SEAT_K, 0., t, 1.)
        if n == 'same_before': return seated(x, y, 0., {'uaLX': -55, 'laLX': -95, 'uaLZ': -20, 'uaRX': -55, 'laRX': -95, 'uaRZ': 20, 'hdX': 10}, 'S:meh', SEAT_K, 0., t, 1.)
        return seated(x, y, 0., {'uaLX': -50, 'laLX': -55, 'uaRX': -50, 'laRX': -55, 'hdX': -2}, 'S:confused' if n == 'class_confused' else 'S:tiny_o', SEAT_K, 0., t, 1.)
    if n == 'saturday': return seated(SOFA_SEATS[0][0], SOFA_SEATS[0][1], 0., {'hdX': -6}, 'S:content', SF_TOP, 0., t, 1.)
    if n == 'beach_weekend':
        dig = math.sin(t * 8)
        return floorS(BXC + 4.8, BYC - 11.4, face_to(BXC + 4.8, BYC - 11.4, BXC + 6.5, BYC - 12.5), {'uaRX': -70 + 15 * dig, 'laRX': -30, 'uaLX': -60, 'laLX': -40, 'hdX': 14, 'spX': 10}, 'S:joy', 1., t, 1.)
    if n in DINE_B and t < ts('cookie_poof') + POOF_T:
        x, y, h = DIN_RY
        if n == 'hero_noeat':
            sh = 22 * math.sin(lt * 18)
            return seated(x, y, h, add(P['cross'], {'hdY': sh}), 'S:disgust', 1.9, 0., t, 1.)
        if n in ('hero_cookie', 'cookie_poof'): return seated(x, y, h, add(EAT(t, 10.), {'hdY': 12}), chew(t, 'S:cheeky', 'S:villain_smile', 10.) if n == 'hero_cookie' else 'S:shocked_frown', 1.9, 0., t, 1.)
        if n == 'veggies': return seated(x, y, h, add(P['scared'], {'spX': -8}), 'S:horror', 1.9, 0., t, 1.)
        if n == 'everyone_ran': return seated(x, y, h, {'hdY': -30, 'uaLX': -30, 'laLX': -40}, 'S:sideeye_flat', 1.9, 0., t, 1.)
        return seated(x, y, h, {'hdY': -20, 'uaLX': -40, 'laLX': -50, 'uaRX': -40, 'laRX': -50}, 'S:content', 1.9, 0., t, 1.)
    return HIDE_
def st_bully(t):
    n, lt = shot_at(t)
    if n == 'intro_wide':
        x, y, d, mv, h = along(t, .0, (14.0, BUL_P[1] + .4), (8.5, BUL_P[1] + .4), 3.2)
        return ST(x, y, h, add(walk2(walkph(d, 2.29), 30, .85, 26, 3.), {}) if mv else alive(t, .4, 3.), 'S:sneaky_smirk')
    if n == 'intro_eat':
        x, y, d, mv, h = along(t, ts('intro_eat'), (8.5, BUL_P[1] + .4), BUL_P, 7.5)
        return ST(x, y, h if mv else BUL_H, walk2(walkph(d, 2.29), 30, .85, 26, 3.) if mv else alive(t, .4, 3.), 'S:sneaky_smirk')
    x, y = BUL_P
    if n == 'bully_steal':
        k_ = eio(prog(lt, .0, .3)); b_ = eio(prog(lt, .4, .7))
        return ST(x, y, BUL_H, add(alive(t, .4, 3.), lerpP({}, {'uaRX': -85, 'laRX': -20, 'uaRZ': 8, 'spX': 18, 'hdX': 10}, k_ * (1 - b_)), lerpP({}, {'uaRX': -40, 'laRX': -60}, b_)), 'S:troll_grin')
    if n == 'bully_gulp': return ST(x, y, BUL_H, add(alive(t, .4, 3.), EAT(t, 14.), {'hdX': -12}), 'S:cheeky')
    if n == 'bully_poof' and lt < POOF_T: return ST(x, y, BUL_H, add(alive(t, .4, 3.), P['scared']), 'S:shocked_frown')
    return HIDE_
def st_teacher(t):
    n, lt = shot_at(t)
    if n not in CLASS: return HIDE_
    x, y = TCH_SEAT; h = 180.
    if n == 'teacher_soup':
        c = .5 + .5 * math.sin(t * 7.)
        return seated(x, y, h, {'uaRX': -60 - 60 * c, 'laRX': -50 - 30 * c, 'uaRZ': 18, 'spX': 10 - 4 * c, 'hdX': 6 - 8 * c, 'uaLX': -40, 'laLX': -40}, 'S:content' if c < .6 else 'S:cheeky', TD_TOP - 1.0, 0., t, 2.)
    if n == 'teacher_letters': return seated(x, y, h, {'uaRX': -95, 'laRX': -110, 'uaRZ': 30, 'hdX': -8, 'spX': -4}, 'S:skeptical', 2.0, 0., t, 2.)
    if n in ('x_pop', 'yz_pop'):
        j = jitter(t, 3., 2.)
        return seated(x, y, h, {'uaLX': -50, 'laLX': -40, 'uaRX': -50, 'laRX': -40, 'uaLZ': -20, 'uaRZ': 20, 'hdX': -12 + j, 'spX': -10}, 'npc_surprised', 2.0, 0., t, 2.)
    if n == 'same_before': return seated(x, y, h, add(P['palms_up'], {'hdY': 10 * math.sin(t * 2)}), 'npc_neutral', 2.0, 0., t, 2.)
    return seated(x, y, h, add(P['palms_up'], {'hdX': -4}), 'S:sideeye2', 2.0, 0., t, 2.)
def kid_state(nm, t, idx, cafe=None, faces=('S:confused', 'S:sleepy_drool')):
    n, lt = shot_at(t); s = .85
    if n in CLASS and n != 'hero_sir' or (n == 'hero_sir' and idx is not None):
        x, y = DESK_SEATS[idx]
        if n == 'same_before': return seatS(x, y, 0., {'hdX': 26, 'spX': 18, 'uaLX': -60, 'laLX': -95, 'uaRX': -60, 'laRX': -95, 'uaLZ': -25, 'uaRZ': 25}, faces[1], SEAT_K, s, t, idx)
        if n in ('class_confused',): return seatS(x, y, 0., {'hdY': 14 * math.sin(t * 2 + idx), 'hdZ': 10, 'uaRX': -110, 'laRX': -100, 'uaRZ': 30}, faces[0], SEAT_K, s, t, idx)
        return seatS(x, y, 0., {'uaLX': -50, 'laLX': -55, 'uaRX': -50, 'laRX': -55, 'hdX': -4}, 'S:tiny_o' if n in ('x_pop', 'yz_pop') else 'S:content', SEAT_K, s, t, idx)
    if cafe and n in ('intro_wide', 'bully_poof', 'nugget_roll'):
        x, y = cafe
        if n == 'intro_wide': return seatS(x, y, 180., EAT(t, 7. + idx, 'L' if idx % 2 else 'R'), chew(t, 'S:content', 'S:happy_teeth'), BENCH_TOP, s, t, idx)
        return seatS(x, y, 180., add(P['scared'], {'hdY': 20}), 'S:aghast', BENCH_TOP, s, t, idx)
    return HIDE_
def st_kid1(t): return kid_state('kid1', t, 0, (-11.5, -6.35), ('S:confused_squiggle', 'S:sleepy_drool'))
def st_kid2(t):
    n, lt = shot_at(t)
    if n == 'lady_noticed': return ST(KID2_L[0], KID2_L[1], 0., add(alive(t, .4, 4.), {'uaLX': -55, 'laLX': -40, 'uaRX': -55, 'laRX': -40, 'hdY': -35}), 'S:laugh_open')
    return kid_state('kid2', t, 1, (-8.5, -6.35), ('S:confused', 'S:dotted'))
def st_kid3(t):
    n, lt = shot_at(t)
    if n == 'lady_noticed': return ST(KID3_L[0], KID3_L[1], 0., add(alive(t, .4, 5.), {'uaLX': -55, 'laLX': -40, 'uaRX': -55, 'laRX': -40, 'hdY': 35}), 'S:happy_teeth')
    return kid_state('kid3', t, 2, (11.5, -6.35), ('S:hmm', 'S:sleepy_drool'))
def st_lady(t):
    n, lt = shot_at(t); x, y = LADY_P
    if n in ('intro_wide', 'bully_poof', 'nugget_roll'): return ST(x, y, 180., add(alive(t, .4, 6.), {'uaRX': -50, 'laRX': -40}), 'S:content')
    if n == 'lady_eats':
        c = .5 + .5 * math.sin(t * 6.5)
        return ST(x, y, 180., add(alive(t, .4, 6.), {'uaRX': -70 - 50 * c, 'laRX': -60 - 30 * c, 'uaRZ': 20, 'hdX': 4 - 8 * c, 'uaLX': -35, 'laLX': -60}), 'S:content' if c < .6 else 'S:cheeky')
    if n == 'lady_poof' and lt < POOF_T: return ST(x, y, 180., add(alive(t, .4, 6.), P['scared']), 'S:shocked_frown')
    return HIDE_
def st_prin(t):
    n, lt = shot_at(t); x, y = PRIN_SEAT
    if n == 'prin_egg':
        c = .5 + .5 * math.sin(t * 6.)
        return seated(x, y, 180., {'uaRX': -70 - 50 * c, 'laRX': -60 - 30 * c, 'uaRZ': 20, 'hdX': 4 - 6 * c, 'uaLX': -40, 'laLX': -50}, 'S:content' if c < .6 else 'S:cheeky', PCH_TOP, 0., t, 3.)
    if n == 'prin_poof' and lt < POOF_T: return seated(x, y, 180., P['scared'], 'S:shocked_frown', PCH_TOP, 0., t, 3.)
    return HIDE_
def st_secr(t):
    n, lt = shot_at(t)
    if n != 'prin_noticed': return HIDE_
    k_ = eio(prog(lt, .05, .45))
    return ST(SECR_P[0], SECR_P[1], 0., add(alive(t, .4, 7.), lerpP({'uaRX': -50, 'laRX': -40}, {'uaRX': -80, 'laRX': -20, 'spX': 12, 'hdX': 10}, k_)), 'S:smile_simple')
def st_bro(t):
    n, lt = shot_at(t)
    if n == 'bro_eats':
        c = abs(math.sin(t * 9))
        return ST(BRO_LAMP[0], BRO_LAMP[1], BRO_LH, add(alive(t, .4, 8.), {'uaLX': -120, 'laLX': -30, 'uaLZ': -10, 'uaRX': -120, 'laRX': -30, 'uaRZ': 10, 'spX': -8 - 6 * c, 'hdX': -18 + 10 * c}), 'S:huge_grin' if c > .5 else 'S:cheeky')
    if n == 'bro_tv':
        k_ = eio(prog(lt, .1, .45)); c = abs(math.sin(t * 12))
        return ST(BRO_TVP[0], BRO_TVP[1], 180., add(alive(t, .4, 8.), {'uaLX': -60 - 50 * k_, 'laLX': -40, 'uaLZ': -10, 'uaRX': -60 - 50 * k_, 'laRX': -40, 'uaRZ': 10, 'hdX': -6 - 6 * c * k_}), 'S:huge_grin2' if c > .5 else 'S:cheeky')
    if n == 'belly_tv': return ST(BRO_TVP[0], BRO_TVP[1] + .6, 180., add(alive(t, .4, 8.), {'uaLZ': 30, 'uaRZ': -30, 'laLX': -30, 'laRX': -30, 'spX': -6, 'hdX': 6}), 'S:smug_closed')
    if n == 'saturday': return ST(BRO_TVP[0], TVS_Y - .4, 180., add(alive(t, .4, 8.), {'uaLZ': 25, 'uaRZ': -25, 'spX': -8, 'hdX': 4}), 'S:smug_closed', 2.2)
    if n == 'beach_weekend': return ST(BXC - 2.5, BYC - 8.0, 10., add(alive(t, .4, 8.), {'uaLZ': 30, 'uaRZ': -30, 'spX': -6}), 'S:joy')
    if n in DINE_B:
        x, y, h = DIN_BRO
        if n == 'mom_dinner': return seated(x, y, h, {'uaLX': -40, 'laLX': -50, 'uaRX': -40, 'laRX': -50}, 'S:content', 1.9, 0., t, 4.)
        if n == 'veggies': return seated(x, y, h, add(P['scared'], {'spX': -12}), 'S:horror', 1.9, 0., t, 4.)
        if n == 'everyone_ran':
            x2, y2, h2, p2 = runner(t, ts('everyone_ran'), (x, y + 1.7), ESC, 13.)
            return ST(x2, y2, h2, add(p2, {'uaLZ': 40, 'uaRZ': -40}), 'S:scream')
    return HIDE_
def st_unc(t):
    n, lt = shot_at(t); x, y = SOFA_SEATS[2]
    if n == 'unc_chips' or (n == 'unc_potato' and lt < POOF_T):
        c = .5 + .5 * math.sin(t * 8)
        return seated(x, y, 0., {'uaRX': -70 - 50 * c, 'laRX': -60 - 40 * c, 'uaRZ': 22, 'uaLX': -55, 'laLX': -55, 'uaLZ': -10, 'hdX': -4 + 5 * c}, ('happy/v_o' if c > .6 else 'happy') if n == 'unc_chips' else 'S:shocked_frown', SF_TOP, 0., t, 3.)
    return HIDE_
def st_mom(t):
    n, lt = shot_at(t)
    if n == 'saturday': return seated(SOFA_SEATS[1][0], SOFA_SEATS[1][1], 0., {'hdX': -6, 'uaLX': -30, 'laLX': -60}, 'S:content', SF_TOP, 0., t, 5.)
    if n == 'beach_weekend': return floorS(BXC - 9.0, BYC - 6.0, 0., {'uaLX': -20, 'uaRX': -20, 'hdX': -6}, 'S:peaceful', 1.05, t, 5.)
    if n == 'mom_dinner':
        k_ = eio(prog(lt, .1, .6))
        return ST(MOM_DIN[0], MOM_DIN[1], 0., add(alive(t, .4, 5.), {'uaLX': -55 - 25 * k_, 'laLX': -40 + 20 * k_, 'uaRX': -55 - 25 * k_, 'laRX': -40 + 20 * k_, 'uaLZ': -12, 'uaRZ': 12, 'spX': 14 * k_, 'hdX': 6}), 'S:cheerful')
    if n in ('veggies', 'everyone_ran', 'hero_noeat', 'hero_cookie', 'cookie_poof'):
        return ST(MOM_DIN[0], MOM_DIN[1], 0., add(alive(t, .4, 5.), P['cross'] if n != 'veggies' else P['palms_up']), 'S:annoyed' if n == 'everyone_ran' else 'S:cheerful')
    if n in ('mom_eats', 'outro'):
        c = abs(math.sin(t * 10))
        return ST(MOM_EAT[0], MOM_EAT[1], face_to(MOM_EAT[0], MOM_EAT[1], COOK_P.x, COOK_P.y), add(alive(t, .4, 5.), {'uaRX': -110 - 10 * c, 'laRX': -80, 'uaRZ': 24, 'hdX': -6 + 6 * c, 'uaLX': -40, 'laLX': -60}), 'S:happy_teeth' if c > .5 else 'S:cheeky')
    return HIDE_
def st_dad(t):
    n, lt = shot_at(t)
    if n == 'saturday': return seated(SOFA_SEATS[2][0], SOFA_SEATS[2][1], 0., {'hdX': -6}, 'S:content', SF_TOP, 0., t, 6.)
    if n == 'dad_banana' or (n == 'dad_poof' and lt < POOF_T):
        c = .5 + .5 * math.sin(t * 7)
        return ST(DAD_D[0], DAD_D[1], 180., add(alive(t, .4, 6.), {'uaRX': -70 - 50 * c, 'laRX': -60 - 30 * c, 'uaRZ': 20, 'hdX': 4 - 6 * c}), ('S:content' if c < .6 else 'S:cheeky') if n == 'dad_banana' else 'S:shocked_frown')
    return HIDE_
def st_baby(t):
    n, lt = shot_at(t); s = BABY_S
    if n == 'baby_sand':
        c = .5 + .5 * math.sin(t * 7)
        return floorS(BABY_SB[0], BABY_SB[1], 180., {'uaRX': -70 - 50 * c, 'laRX': -50 - 30 * c, 'uaRZ': 20, 'hdX': 4 - 8 * c, 'uaLX': -30, 'laLX': -20}, 'S:cute_tongue' if c > .5 else 'S:joy', s, t, 1., .8)
    return HIDE_
STATES = {nm: [] for nm in CH}
FN = {'hero': st_hero, 'bully': st_bully, 'teacher': st_teacher, 'kid1': st_kid1, 'kid2': st_kid2, 'kid3': st_kid3, 'lady': st_lady, 'prin': st_prin,
      'secr': st_secr, 'bro': st_bro, 'unc': st_unc, 'mom': st_mom, 'dad': st_dad, 'baby': st_baby}
for f in FRAMES:
    t = tsec(f)
    for nm in CH: STATES[nm].append(FN[nm](t) if nm in FN else HIDE_)
for nm in CH: bake_states(CH[nm], STATES[nm])
log('states baked', round(time.time() - T0, 1), 's')

# ---------------------------------------------------------- tracking pass (heads + hands) -> props
HEADP = {nm: [] for nm in CH}; HANDS = {nm: [] for nm in CH}
for f in FRAMES:
    sc.frame_set(f)
    for nm, ch in CH.items():
        mw = ch.arm.matrix_world; pb = ch.arm.pose.bones
        HEADP[nm].append((mw @ pb['Head'].head).copy()); HANDS[nm].append(((mw @ pb['Hand.L'].tail).copy(), (mw @ pb['Hand.R'].tail).copy()))
log('tracking pass', round(time.time() - T0, 1), 's')
def fwv(h): return Vector((-math.sin(h * D2R), math.cos(h * D2R), 0.))
def sidev(h): return Vector((math.cos(h * D2R), math.sin(h * D2R), 0.))
PKEYS = []; PROP = {}
def track(key, o): PKEYS.append(key); PROP[key] = (o, [])
FACED_KEYS = list(FOBJ.keys())
for k_ in FACED_KEYS: track(k_, FOBJ[k_][0])
for k_, o_ in (('nug_h', NUG_H), ('spoon', SPOON), ('let_X', LET['X']), ('let_Y', LET['Y']), ('let_Z', LET['Z']), ('fork', FORK), ('slice_k', SLICE_K), ('slice_k2', SLICE_K2),
               ('egg_h', EGG_H), ('paper', PAPER), ('chips', CHIPS), ('chip_h', CHIP_H), ('ban_h', BAN_H), ('sand_h', SAND_H), ('veg', VEG), ('steam', STEAM),
               ('cookie_h', COOK_H), ('stack4', STACK4), ('puff', PUFF), ('tv', TV)):
    track(k_, o_)
def held(nm, i, hand=1, fwd=.2, up=.35, tilt=-35, flip=180):
    hl_, hr_ = HANDS[nm][i]; h_ = STATES[nm][i][3]; hp = hr_ if hand else hl_
    return (hp + fwv(h_) * fwd + Vector((0, 0, up)), (tilt, 0, h_ + flip))
def mid2(nm, i): hl_, hr_ = HANDS[nm][i]; return (hl_ + hr_) / 2
TV_HOME = (Vector((LX, TVS_Y - .1, 2.2)), (0, 0, 0))
PUFFAT = {'bully_poof': lambda i: Vector((BUL_P[0], BUL_P[1] - .4, 3.2)), 'lady_poof': lambda i: Vector((LADY_P[0], LADY_P[1] - 1.4, 4.4)),
          'prin_poof': lambda i: Vector((PRIN_SEAT[0], PRIN_SEAT[1] - .8, 4.4)), 'unc_potato': lambda i: Vector((POT_P.x, POT_P.y, POT_P.z + 1.2)),
          'dad_poof': lambda i: Vector((DAD_D[0], DAD_D[1] - .5, 3.6)), 'cookie_poof': lambda i: Vector((COOK_P.x + .6, COOK_P.y, COOK_P.z + .8))}
PUFF_SC = []
for i, f in enumerate(FRAMES):
    t = tsec(f); n, lt = shot_at(t)
    rec = {k: (OFFV, (0, 0, 0)) for k in PKEYS}
    after = lt >= POOF_T
    # ---- faced objects
    if (n == 'bully_poof' and after) or n == 'hero_bro': rec['nug'] = (Vector((BUL_P[0], BUL_P[1], 1.05)), (0, 0, (69 if n == 'bully_poof' else 55) + 8 * math.sin(t * 3)))
    if n == 'nugget_roll':
        u = prog(lt, .1, 1.1); d = 13. * ei(u) * 1.0 + 1.2 * u
        rec['nug'] = (Vector((BUL_P[0] + d, BUL_P[1] + .3 * u, 1.05)), (0, -d / 1.1 * 57.3, 180))
    if n in ('teacher_soup', 'teacher_letters', 'x_pop', 'yz_pop', 'class_confused', 'same_before', 'hero_sir'):
        rec['nug'] = (NUG_DESK.copy(), (0, 0, 180 + 5 * math.sin(t * 2)))
    if (n == 'lady_poof' and after) or n == 'lady_noticed': rec['loaf'] = (LOAF_P.copy(), (0, 0, 0))
    if (n == 'prin_poof' and after) or n == 'prin_noticed': rec['egg'] = (EGG_P.copy(), (0, 0, 3 * math.sin(t * 2)))
    if (n == 'unc_potato' and after) or n == 'unc_same': rec['pot'] = (POT_P.copy(), (0, 0, 180))
    if n in ('mom_dinner', 'veggies'): rec['pot'] = (Vector((DIN_POT[0], DIN_POT[1] + .1, 1.9 + 1.25)), (0, 0, 180))
    if n == 'everyone_ran':
        x2, y2, h2, p2 = runner(t, ts('everyone_ran'), (DIN_POT[0], DIN_POT[1] - 1.7), (ESC[0] + 1.0, ESC[1] - 1.2), 12.)
        rec['pot'] = (Vector((x2, y2, 1.25)), (lt * 900, 0, h2 + 90))
    if (n == 'dad_poof' and after): rec['ban'] = (BAN_P0.copy(), (0, 0, 0))
    if n == 'mirror_hour':
        rec['ban'] = (BAN_MIRP.copy(), (0, 0, 180 + 3 * math.sin(t * 1.5)))
        rec['banm'] = (Vector((BAN_MIRP.x, 2 * DY1 - BAN_MIRP.y, BAN_MIRP.z)), (0, 0, -(180 + 3 * math.sin(t * 1.5))))
    if n == 'beach_weekend': rec['ban'] = (Vector((BXC + 10.5, BYC - 9.0, 2.62)), (0, 0, 15))
    if n in ('mom_dinner', 'veggies'): rec['ban'] = (Vector((DIN_BAN[0], DIN_BAN[1] - .1, 1.9 + 2.5)), (0, 0, 0))
    if n == 'everyone_ran':
        x2, y2, h2, p2 = runner(t, ts('everyone_ran') + .1, (DIN_BAN[0], DIN_BAN[1] + 1.7), (ESC[0] + 2.0, ESC[1] + 1.0), 11.)
        rec['ban'] = (Vector((x2, y2, 2.62 + 1.2 * abs(math.sin(lt * 11)))), (0, 0, h2 + 180))
    if n in ('baby_beach', 'beach_weekend'): rec['beachb'] = (BB_C.copy(), (0, 0, 0))
    if (n == 'cookie_poof' and after) or n in ('mom_eats', 'outro'):
        tr_ = jitter(t, 2.5, 3.) if n == 'mom_eats' else 0.
        rec['cookie'] = (COOK_P.copy(), (0, tr_, (43 if n == 'mom_eats' else 90) + tr_))
    # ---- hand props
    if n in ('intro_wide', 'intro_eat') or (n == 'bully_steal' and lt < .45): rec['nug_h'] = held('hero', i, 1, .1, .15, -10)
    elif n == 'bully_steal' or (n == 'bully_gulp' and lt < .22): rec['nug_h'] = held('bully', i, 1, .1, .15, -10)
    if n == 'teacher_soup': rec['spoon'] = held('teacher', i, 1, .1, .2, -50)
    if n == 'x_pop' or n == 'yz_pop' or n in ('class_confused', 'same_before'):
        hp = HEADP['teacher'][i] + Vector((0, -.9, .2)) if HEADP['teacher'][i].z > -50 else Vector((TD_X, TD_Y, 5.))
        for c_, t0 in (('X', ts('x_pop')), ('Y', ts('yz_pop')), ('Z', ts('yz_pop') + .38)):
            if t >= t0:
                u = eo(prog(t, t0, t0 + .35)); dst = Vector((TD_X + {'X': -2.6, 'Y': 0., 'Z': 2.6}[c_], TD_Y - 2.2, 6.4 + .3 * math.sin(t * 3 + ord(c_))))
                rec['let_' + c_] = (hp.lerp(dst, u), (0, 0, (1 - u) * 360))
    if n == 'lady_eats': rec['fork'] = held('lady', i, 1, .1, .2, -50)
    if n == 'lady_noticed':
        rec['slice_k'] = (mid2('kid3', i) + Vector((0, .5, .1)), (0, 0, 0)); rec['slice_k2'] = (mid2('kid2', i) + Vector((0, .5, .1)), (0, 0, 0))
    if n == 'prin_egg': rec['egg_h'] = held('prin', i, 1, .1, .2, -30)
    if n == 'prin_noticed':
        rec['paper'] = held('secr', i, 1, .25, .1, -80) if lt < .5 else (Vector((PD_X - .9, PD_Y - .8, PD_TOP + .03)), (90, 0, 10))
    if n == 'unc_chips' or (n == 'unc_potato' and not after): rec['chips'] = held('unc', i, 0, .2, .1, -10); rec['chip_h'] = held('unc', i, 1, .05, .12, -40)
    if (n == 'unc_potato' and after) or n == 'unc_same': rec['chips'] = (Vector((POT_P.x - 1.9, POT_P.y, SF_TOP + .6)), (0, -20, 0))
    if n == 'dad_banana' or (n == 'dad_poof' and not after): rec['ban_h'] = held('dad', i, 1, .1, .1, 0, 90)
    if n == 'baby_sand': rec['sand_h'] = held('baby', i, 1, .05, .08, 0)
    if n == 'mom_dinner' and lt < .55: rec['veg'] = (mid2('mom', i) + Vector((0, .55, -.25)), (0, 0, 0))
    elif n in ('mom_dinner', 'veggies', 'everyone_ran', 'hero_noeat', 'hero_cookie', 'cookie_poof'): rec['veg'] = (VEG_T.copy(), (0, 0, 0))
    if n in ('veggies', 'everyone_ran') or (n == 'mom_dinner' and lt >= .55):
        rec['steam'] = (VEG_T + Vector((0, 0, 1.3 + (lt * 1.5) % 1.0)), (0, 0, lt * 60))
    if n == 'hero_cookie' or (n == 'cookie_poof' and not after): rec['cookie_h'] = held('hero', i, 1, .05, .1, 0)
    if n in ('mom_eats', 'outro'): rec['stack4'] = (HANDS['mom'][i][1] + Vector((0, 0, .25)), (90, 0, STATES['mom'][i][3]))
    if n in PUFFAT and lt < .55: rec['puff'] = (PUFFAT[n](i), (0, 0, lt * 200))
    PUFF_SC.append(max(.001, math.sin(math.pi * prog(lt, .02, .5)) * 1.25) if (n in PUFFAT and lt < .55) else .001)
    # ---- the TV gets eaten
    if t < ts('bro_tv'): rec['tv'] = TV_HOME
    elif n == 'bro_tv': rec['tv'] = (mid2('bro', i) + Vector((0, -.45, -2.1)) + Vector((0, 0, .5)) * eio(prog(lt, .2, .6)), (0, 0, 180))
    for k in PKEYS: PROP[k][1].append(rec[k])
for k in PKEYS:
    o, vals = PROP[k]; o.rotation_mode = 'XYZ'
    for c in range(3):
        bake(o, 'location', c, FRAMES, [v[0][c] for v in vals], 'LINEAR')
        bake(o, 'rotation_euler', c, FRAMES, [v[1][c] * D2R for v in vals], 'LINEAR')
for c in range(3): bake(PUFF, 'scale', c, FRAMES, PUFF_SC, 'LINEAR')
# TV shrinks into his mouth; then it lives on his belly
TVSC = [(1. if tsec(f) < ts('bro_tv') else .4 if tsec(f) < ts('bro_tv') + .5 * (te('bro_tv') - ts('bro_tv')) else .4 * max(.001, 1 - prog(tsec(f), ts('bro_tv') + .5 * (te('bro_tv') - ts('bro_tv')), te('bro_tv') - .05))) for f in FRAMES]
for c in range(3): bake(TV, 'scale', c, FRAMES, TVSC, 'LINEAR')
for c in range(3): bake(BELLY, 'scale', c, FRAMES, [1. if tsec(f) >= te('bro_tv') else .001 for f in FRAMES], 'CONSTANT')
# the lamp shade gets bitten down
FL_SHADE = [o for o in LAMP.children if o.name.startswith('fl_shade')][0]
SHSC = [max(.001, 1 - .8 * prog(tsec(f), ts('bro_eats') + .2, te('bro_eats'))) if tsec(f) < te('bro_eats') else .2 for f in FRAMES]
for c in range(3): bake(FL_SHADE, 'scale', c, FRAMES, [s_ * (1.1 if c < 2 else 1.3) for s_ in SHSC], 'LINEAR')
# cartoons on the TV and on the belly
TVC_BALL.rotation_mode = 'XYZ'
bake(TVC_BALL, 'location', 2, FRAMES, [-.6 + 1.1 * abs(math.sin(tsec(f) * 4)) for f in FRAMES], 'LINEAR')
bake(TVC_BALL, 'location', 0, FRAMES, [-1.8 + (tsec(f) * .8) % 3.4 for f in FRAMES], 'LINEAR')
bake(BTV_BALL, 'location', 2, FRAMES, [(-.25 + .4 * abs(math.sin(tsec(f) * 4))) * bro.scale for f in FRAMES], 'LINEAR')
bake(BTV_BALL, 'location', 0, FRAMES, [(-.55 + (tsec(f) * .35) % 1.1) * bro.scale for f in FRAMES], 'LINEAR')
bake(BTV_SUN, 'location', 2, FRAMES, [(.28 + .05 * math.sin(tsec(f) * 2)) * bro.scale for f in FRAMES], 'LINEAR')
# the letters wobble; the clock flies through the hour
for c_ in 'XYZ':
    for c in range(3): bake(LET[c_], 'scale', c, FRAMES, [1. + .12 * math.sin(tsec(f) * 9 + ord(c_)) for f in FRAMES], 'LINEAR')
for o_, rev in ((DCLK_M, 12.), (DCLK_H, 1.)):
    o_.rotation_mode = 'XYZ'
    bake(o_, 'rotation_euler', 1, FRAMES, [-2 * math.pi * rev * prog(tsec(f), ts('mirror_hour'), te('mirror_hour')) for f in FRAMES], 'LINEAR')
log('props baked', round(time.time() - T0, 1), 's')

# ---------------------------------------------------------- FACES (+ lip sync) — people and the things they turned into
VO_WAV = os.path.join(HERE, VNAME + '_vo16.wav')
ENV = vo_envelope(VO_WAV) if os.path.exists(VO_WAV) else None
log('vo env', 'ok' if ENV else 'missing')
for nm, ch in CH.items():
    if isinstance(ch, ImpChar): continue
    seq = [s_[5] or (FAMI[nm] + '_neutral') for s_ in STATES[nm]]
    tr = face_track2(nm, FAMI[nm], seq, ENV, TALK, sum(map(ord, nm)) % 97)
    m_, WE, WM = face_material2(nm + '_face2', ch.skin, FAMI[nm], tr)
    set_obj_mat(ch.parts['Head'], m_); ch.facemat = m_; ch.WE = WE; ch.WM = WM
    bake_faces2(ch, tr)
def fobj_face(key, t):
    n, lt = shot_at(t)
    if key == 'nug':
        if n == 'bully_poof': return 'S:shocked_frown' if lt < .6 else 'S:horror'
        if n == 'hero_bro': return 'S:terrified'
        if n == 'nugget_roll': return 'S:sobbing'
        if n == 'same_before': return 'S:sleepy_drool'
        if n == 'class_confused': return 'S:crying_small'
        return 'S:sad_small'
    if key == 'loaf': return 'S:blank' if n == 'lady_poof' and lt < .5 else 'S:content'
    if key == 'egg': return 'S:mustache'
    if key == 'pot':
        if n in ('veggies',): return 'S:horror'
        if n == 'everyone_ran': return 'S:scream'
        return 'S:content' if math.sin(t * 8) > 0 else 'S:cheeky'
    if key in ('ban', 'banm'):
        if n == 'dad_poof': return 'S:shocked_frown' if lt < .5 else 'S:stare_wide'
        if n == 'mirror_hour': return 'S:stare_wide'
        if n == 'beach_weekend': return 'S:sunglasses'
        if n == 'veggies': return 'S:horror'
        if n == 'everyone_ran': return 'S:scream'
        return 'S:content'
    if key == 'beachb': return 'S:joy'
    if key == 'cookie':
        if n == 'cookie_poof': return 'S:shocked_frown' if lt < .45 else 'S:stare_wide'
        if n == 'mom_eats': return 'S:terrified'
        return 'scared'
    return 'S:content'
def face_base(m, c1, c2, nscale, bump):
    nt_ = m.node_tree; rgbn = next(nd for nd in nt_.nodes if nd.type == 'RGB')
    tc = nt_.nodes.new('ShaderNodeTexCoord'); nz = nt_.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = nscale; nz.inputs['Detail'].default_value = 6.
    nt_.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    cr = nt_.nodes.new('ShaderNodeValToRGB'); el = cr.color_ramp.elements
    el[0].position = .35; el[0].color = (*c2, 1); el[1].position = .72; el[1].color = (*c1, 1)
    nt_.links.new(nz.outputs['Fac'], cr.inputs['Fac'])
    for lk in list(rgbn.outputs[0].links): nt_.links.new(cr.outputs['Color'], lk.to_socket)
    b = nt_.nodes.get('Principled BSDF'); b.inputs['Roughness'].default_value = .6
    if bump: _bump(nt_, b, nz.outputs['Fac'], bump)
for key, (o_, fam, c1, c2, nsc, bmp) in FOBJ.items():
    seq = [fobj_face(key, tsec(f)) for f in FRAMES]
    tr = face_track2(key, fam, seq, ENV, TALK, sum(map(ord, key)) % 97)
    m_, WE, WM = face_material2(key + '_fm', c1, fam, tr); face_base(m_, c1, c2, nsc, bmp)
    set_obj_mat(o_, m_); bake_faces2(types.SimpleNamespace(facemat=m_, WE=WE, WM=WM), tr)
log('faces baked', round(time.time() - T0, 1), 's')


# ---------------------------------------------------------- WORLD + LIGHT: bright, rich daylight everywhere
DAY = ((.62, .8, 1.0), (.12, .38, .95), (1, .95, .85), .4, 0., 1.0)
for i_ in range(3):
    nt.nodes['HOR'].outputs[0].default_value[i_] = DAY[0][i_]; nt.nodes['ZEN'].outputs[0].default_value[i_] = DAY[1][i_]
    nt.nodes['GLOW'].outputs[0].default_value[i_] = DAY[2][i_]; nt.nodes['SUNDIR'].inputs[i_].default_value = (-.6, -.3, .45)[i_]
nt.nodes['GLOWS'].outputs[0].default_value = DAY[3]; nt.nodes['STARS'].outputs[0].default_value = 0.; nt.nodes['BG'].inputs[1].default_value = .75
try: clouds(BXC, BYC, 16, 120, 260, 60, 110, 3); clouds(YX, YY, 10, 120, 260, 60, 110, 5)
except Exception as ex: log('clouds', ex)
SUN = light('sun', 'SUN', (0, 0, 60), 2.4, (1, .95, .86), 1); SUN.data.angle = 5 * D2R
SUN.rotation_mode = 'QUATERNION'; SUN.rotation_quaternion = Vector((.55, .4, -.75)).normalized().to_track_quat('-Z', 'Y')
for gx in (-12, 0, 12):
    for gy in (-8, 6): light('cf_fill', 'AREA', (gx, gy, CH_ - .8), 1100, (1, .97, .92), 10.)
light('cf_lc', 'AREA', (-9.5, 9.0, 8.0), 700, (1, .96, .9), 8., (-60, 0, 0))
light('mc_fill', 'AREA', (CX, 0, MH - .7), 2400, (1, .97, .93), 20.); light('mc_front', 'AREA', (CX, 4.0, 7.5), 600, (1, .97, .93), 8., (60, 0, 0))
light('of_fill', 'AREA', (OX, 0, OH - .7), 1900, (1, .95, .88), 18.); light('of_front', 'AREA', (OX, -1.0, 7.0), 500, (1, .95, .88), 7., (60, 0, 0))
light('lv_fill', 'AREA', (LX, 0, LH - .7), 2600, (1, .96, .9), 24.); light('lv_win', 'AREA', (LX0 + 1.5, 0, 6.5), 900, (.95, .97, 1.), 10., (0, -90, 0))
light('dn_fill', 'AREA', (DX, 0, DH - .7), 2300, (1, .96, .9), 22.); light('dn_win', 'AREA', (DX1 - 1.5, 0, 6.5), 800, (.95, .97, 1.), 10., (0, 90, 0))
light('dn_mir', 'AREA', (MIR_X, DY1 + RD / 2, DH - .8), 500, (1, .96, .9), 6.)

# ---------------------------------------------------------- CAMERA: Noobifiedd pacing — punchy close-ups, quick pushes, shakes on the poofs
camd = bpy.data.cameras.new('Cam'); camd.sensor_fit = 'VERTICAL'; camd.sensor_height = 36; camd.clip_start = .02; camd.clip_end = 2000
cam = bpy.data.objects.new('Cam', camd); COL.objects.link(cam); sc.camera = cam; cam.rotation_mode = 'QUATERNION'
def V(*a): return Vector(a)
def L2(a, b, e): return V(*a).lerp(V(*b), e)
def mid_i(n): return min(len(FRAMES) - 1, int((S[n][0] + S[n][1]) / 2 * FPS))
def HP(nm, i): return HEADP[nm][i]
def HM(nm, n): return HEADP[nm][mid_i(n)]
def HMH(nm, n): return STATES[nm][mid_i(n)][3]
def ecu(nm, n, e, dist, side=0., up=0., push=.12, tz=-.15):
    h = HMH(nm, n); H_ = HM(nm, n) + V(0, 0, .62 * CH[nm].scale); d_ = dist * 1.12 * (1 - push * e)
    pos = H_ + fwv(h) * d_ + sidev(h) * side + V(0, 0, up - .28 * CH[nm].scale); return pos, H_ + V(0, 0, tz - .12 * CH[nm].scale)
def pof(n, lt, amp=.12): return amp * (1 - clamp((lt - POOF_T) / .45)) if lt > POOF_T * .6 else 0.
def cam_state(i):
    t = tsec(FRAMES[i]); n, lt = shot_at(t); a, b = S[n]; e = eio(prog(lt, 0, b - a)); eq = eo(prog(lt, 0, (b - a) * .6)); shake = 0.; roll = 0.; lens = 26
    if n == 'intro_wide': pos = L2((6.8, -8.8, 6.4), (5.8, -7.6, 5.9), e); tgt = V(0., 2.6, 3.0); lens = 22
    elif n == 'intro_eat': pos, tgt = ecu('hero', n, eq, 4.6, .4, .1, .15, -.45); lens = 30
    elif n == 'bully_steal': pos = L2((1.0, -5.2, 4.5), (1.1, -4.4, 4.4), e); tgt = V(1.4, 2.4, 3.5); lens = 24
    elif n == 'bully_gulp': pos, tgt = ecu('bully', n, eq, 4.6, .3, .1, .2, -.4); lens = 30
    elif n == 'bully_poof': pos = V(8.6, 1.0, 3.0); tgt = V(2.8, 3.4, 1.5); lens = 26; shake = pof(n, lt)
    elif n == 'hero_bro': pos = L2((9.6, -1.2, 4.4), (8.8, -.8, 4.2), e); tgt = V(1.2, 2.6, 2.6); lens = 22
    elif n == 'nugget_roll':
        nx = PROP['nug'][1][i][0].x; pos = V(nx - 1.6, 10.5, 3.2); tgt = V(nx + 1.4, 3.6, 1.3); lens = 24
    elif n == 'teacher_soup': pos, tgt = ecu('teacher', n, e, 5.2, .6, .7, .1, -.7); lens = 28
    elif n == 'teacher_letters': pos, tgt = ecu('teacher', n, eq, 3.2, -.4, .2, .12); lens = 30
    elif n in ('x_pop', 'yz_pop'):
        H_ = HM('teacher', n); pos = H_ + V(.3, -8.0 + (1.2 * e if n == 'yz_pop' else .6 * e), .2); tgt = H_ + V(0, 1.5, .6); lens = 26; shake = .03
    elif n == 'class_confused': pos = L2((CX + 4.5, 5.4, 6.8), (CX + 4.0, 5.0, 6.6), e); tgt = V(CX - .5, -2.0, 2.6); lens = 20
    elif n == 'same_before': pos = L2((CX - 4.5, 5.4, 6.6), (CX - 4.0, 5.0, 6.4), e); tgt = V(CX + .5, -2.0, 2.4); lens = 20
    elif n == 'hero_sir': pos, tgt = ecu('hero', n, e, 2.8, .3, .1, .12); lens = 28; roll = -4
    elif n == 'lady_eats': pos, tgt = ecu('lady', n, e, 3.6, .4, .3, .1); lens = 28
    elif n == 'lady_poof': pos = V(-9.0, 6.4, 6.0); tgt = V(-9.5, 12.4, 4.3); lens = 26; shake = pof(n, lt)
    elif n == 'lady_noticed': pos = L2((.6, 6.2, 5.2), (.0, 6.6, 5.0), e); tgt = V(-9.6, 11.2, 3.8); lens = 22
    elif n == 'prin_egg': pos, tgt = ecu('prin', n, e, 3.8, .4, .3, .1); lens = 28
    elif n == 'prin_poof': pos = V(OX + .5, -1.2, 5.4); tgt = V(OX, PCH_Y, 3.6); lens = 26; shake = pof(n, lt)
    elif n == 'prin_noticed': pos = L2((OX + 8.2, -1.2, 5.6), (OX + 7.6, -.6, 5.4), e); tgt = V(OX - .5, 3.4, 3.4); lens = 22
    elif n == 'bro_eats': pos = L2((LX + 12.6, LY1 - 1.0, 6.6), (LX + 12.3, LY1 - 1.2, 6.4), e); tgt = V(LX + 10.6, LY1 - 4.4, 4.6); lens = 22
    elif n == 'bro_tv': pos = L2((LX + .6, TVS_Y - 9.8, 4.8), (LX + .4, TVS_Y - 8.8, 4.7), e); tgt = V(LX, TVS_Y - 2.3, 4.3); lens = 26
    elif n == 'belly_tv': pos = L2((LX + .4, TVS_Y - 6.6, 3.4), (LX + .3, TVS_Y - 5.4, 3.2), e); tgt = V(LX, TVS_Y - 1.7, 3.1); lens = 30
    elif n == 'saturday': pos = L2((LX + .6, SF_Y - 2.4, 8.8), (LX + .5, SF_Y - 1.6, 8.6), e); tgt = V(LX, TVS_Y - 1.0, 3.4); lens = 24
    elif n == 'unc_chips': pos, tgt = ecu('unc', n, e, 4.4, .5, .3, .1, -.4); lens = 28
    elif n == 'unc_potato': pos = V(POT_P.x - .4, POT_P.y + 6.6, 4.6); tgt = V(POT_P.x, POT_P.y, 3.1); lens = 28; shake = pof(n, lt)
    elif n == 'unc_same': pos = L2((POT_P.x - 2.6, POT_P.y + 8.6, 5.4), (POT_P.x - 2.2, POT_P.y + 7.8, 5.2), e); tgt = V(POT_P.x - .6, POT_P.y, 2.9); lens = 24
    elif n == 'dad_banana': pos, tgt = ecu('dad', n, e, 4.0, .4, .1, .12, -.4); lens = 28
    elif n == 'dad_poof': pos = V(DAD_D[0] + .4, DAD_D[1] - 6.6, 4.4); tgt = V(DAD_D[0], DAD_D[1], 3.0); lens = 26; shake = pof(n, lt)
    elif n == 'mirror_hour': pos = L2((MIR_X + 3.0, 3.0, 5.0), (MIR_X + 2.5, 4.2, 4.8), e); tgt = V(MIR_X - .2, DY1 + 2.0, 3.6); lens = 24
    elif n == 'baby_sand': pos, tgt = ecu('baby', n, eq, 2.4, .3, .1, .12); lens = 30
    elif n == 'baby_beach': pos = L2((BXC, BYC - 10.0, 4.0), (BXC + 1.0, BYC - 22.0, 12.0), eo(prog(lt, 0, b - a))); tgt = V(BXC, BB_C.y, 1.4); lens = 24
    elif n == 'beach_weekend': pos = L2((BXC + 2.0, BYC - 25.0, 11.0), (BXC + 1.5, BYC - 23.5, 10.5), e); tgt = V(BXC, BYC - 3.0, 1.5); lens = 22
    elif n == 'mom_dinner': pos = L2((DT_X + 1.7, DT_Y + 8.6, 7.9), (DT_X + 1.6, DT_Y + 7.9, 7.7), e); tgt = V(DT_X, DT_Y - 2.8, 4.2); lens = 24
    elif n == 'veggies': pos = L2((DT_X - 2.2, DT_Y - 3.0, 4.6), (DT_X - 1.7, DT_Y - 2.4, 4.4), eq); tgt = V(DT_X + .4, DT_Y + 2.6, 3.9); lens = 26; shake = .05
    elif n == 'everyone_ran': pos = L2((DT_X + 9.6, DT_Y + 8.6, 8.0), (DT_X + 9.0, DT_Y + 8.2, 7.8), e); tgt = V(DX - 6.0, 3.5, 2.6); lens = 20
    elif n == 'hero_noeat': pos, tgt = ecu('hero', n, e, 2.8, .3, .1, .12); lens = 28
    elif n == 'hero_cookie': pos, tgt = ecu('hero', n, eq, 3.4, -.5, .1, .15, -.3); lens = 30; roll = 5
    elif n == 'cookie_poof': pos = V(COOK_P.x + 5.0, COOK_P.y + .6, 5.8); tgt = V(COOK_P.x, COOK_P.y, 4.0); lens = 28; shake = pof(n, lt)
    elif n == 'mom_eats': pos = L2((COOK_P.x + 3.6, COOK_P.y - 3.8, 4.8), (COOK_P.x + 3.1, COOK_P.y - 3.2, 4.7), e); tgt = V(COOK_P.x + .2, COOK_P.y + 1.8, 4.9); lens = 24
    elif n == 'outro': pos = L2((COOK_P.x + 3.6, COOK_P.y + .4, COOK_P.z + .4), (COOK_P.x + 3.0, COOK_P.y + .3, COOK_P.z + .35), e); tgt = COOK_P + V(0, 0, .1); lens = 32
    else: pos = V(0, -900, 5); tgt = V(0, -880, 5)
    drift = V(noise1(t * 1.3, 2.) * .03, 0, noise1(t * 1.1, 5.) * .03)
    if shake: drift = drift + V(noise1(t * 30, 1.) * shake, noise1(t * 27, 7.) * shake * .5, noise1(t * 30, 4.) * shake)
    return pos + drift, tgt + drift * .5, lens, roll
CP = [cam_state(i) for i in range(len(FRAMES))]
Q_ = []
for p, tg, l, rl in CP:
    q = (tg - p).to_track_quat('-Z', 'Y')
    if rl: q = q @ Quaternion((0, 0, 1), rl * D2R)
    Q_.append(q)
for c in range(1, len(Q_)):
    if Q_[c].dot(Q_[c - 1]) < 0: Q_[c].negate()
for c in range(3): bake(cam, 'location', c, FRAMES, [p[c] for p, tg, l, rl in CP], 'LINEAR')
for c in range(4): bake(cam, 'rotation_quaternion', c, FRAMES, [q[c] for q in Q_], 'LINEAR')
bake(camd, 'lens', 0, FRAMES, [l for p, tg, l, rl in CP], 'LINEAR')
log('camera baked', round(time.time() - T0, 1), 's')

# ---------------------------------------------------------- RENDER (EEVEE, bright + colourful)
r = sc.render
try: r.engine = 'BLENDER_EEVEE'
except Exception:
    try: r.engine = 'BLENDER_EEVEE_NEXT'
    except Exception: pass
r.resolution_x, r.resolution_y = 1080, 1920; r.resolution_percentage = 100; r.fps = FPS
try: sc.eevee.taa_render_samples = 24
except Exception: pass
for attr, val in (('use_shadows', True), ('use_raytracing', True), ('shadow_ray_count', 1), ('use_gtao', True), ('use_fast_gi', True), ('use_bloom', False)):
    try: setattr(sc.eevee, attr, val)
    except Exception: pass
try: sc.view_settings.view_transform = 'Standard'
except Exception: pass
try: sc.view_settings.look = 'None'
except Exception: pass
sc.view_settings.exposure = -.62
try: r.use_motion_blur = False
except Exception: pass
json.dump({'fps': FPS, 'shots': [[n, a, min(b, DUR)] for n, a, b in shots]}, open(os.path.join(HERE, VNAME + '_anchors.json'), 'w'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, VNAME + '_scene.blend'), copy=True)
log('scene saved; build took', round(time.time() - T0, 1), 's; frames', NF)
try: r.image_settings.media_type = 'IMAGE'
except Exception: pass
if RUNMODE == 'stills':
    r.image_settings.file_format = 'JPEG'; r.image_settings.quality = 90
    SD = os.path.join(HERE, VNAME + 'stills', RROUND); os.makedirs(SD, exist_ok=True)
    PROG = os.path.join(HERE, VNAME + '_progress.txt')
    for k, (n, a, b) in enumerate(shots):
        open(PROG, 'w').write('%d %d' % (k, len(shots)))
        f = int((a + (min(b, DUR) - a) * .55) * FPS) + 1
        sc.frame_set(f); r.filepath = os.path.join(SD, '%02d_%s.jpg' % (k + 1, n)); bpy.ops.render.render(write_still=True)
    open(PROG, 'w').write('DONE'); log('STILLS DONE', round(time.time() - T0, 1), 's')
elif RUNMODE == 'build':
    open(os.path.join(HERE, VNAME + '_progress.txt'), 'w').write('DONE'); log('BUILD ONLY DONE')
else:
    try:
        import ctypes; ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001 | 0x00000040)
    except Exception: pass
    from bpy.app.handlers import persistent
    PROG = os.path.join(HERE, VNAME + '_progress.txt'); FRDIR = os.path.join(HERE, VNAME + 'frames'); os.makedirs(FRDIR, exist_ok=True)
    def fpath(f): return os.path.join(FRDIR, 'f_%05d.png' % f)
    def wprog():
        n_ = sum(1 for f in FRAMES if os.path.exists(fpath(f)) and os.path.getsize(fpath(f)) >= 1000)
        try: open(PROG, 'w').write('%d %d' % (n_, len(FRAMES)))
        except Exception: pass
    @persistent
    def _qpost(scene, *a_): wprog()
    bpy.app.handlers.render_post.append(_qpost); wprog()
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.image_settings.compression = 15
    r.use_overwrite = False; r.use_placeholder = True; r.use_file_extension = True
    r.filepath = os.path.join(FRDIR, 'f_#####'); sc.frame_start, sc.frame_end = 1, NF
    bpy.ops.render.render(animation=True); wprog()
    missing = [f for f in FRAMES if not os.path.exists(fpath(f))]
    if missing: raise RuntimeError('frames missing after render: %d' % len(missing))
    bpy.app.handlers.render_post.remove(_qpost)
    open(PROG, 'w').write('DONE'); log('FRAMES DONE')
log('ALL OK total', round(time.time() - T0, 1), 's')
