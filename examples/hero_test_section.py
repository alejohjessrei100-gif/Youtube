# ===================================================== HERO TEST — a 7 s turnaround of the hero in a plain studio (onboarding check)
# assemble:  python tools/assemble.py herotest examples/hero_test_section.py --dur 7
# stills (one per shot) show: front neutral, 3/4 happy talking, side walk, back, close-up shocked, close-up special face.
RUNMODE = 'stills'; RROUND = 'r1'
try:
    _m = open(os.path.join(HERE, VNAME + '_mode.txt')).read().strip().split(':')
    RUNMODE = _m[0]; RROUND = _m[1] if len(_m) > 1 else 'r1'
except Exception: pass
log('RUNMODE', RUNMODE, RROUND)
# ---- studio: warm floor + soft backdrop
box('st_floor', (60, 60, .2), (0, 0, -.1), mat('st_floor', (.82, .78, .72), .7))
box('st_wall', (60, .4, 30), (0, -9, 15), mat('st_wall', (.55, .72, .95), .9))
for k in range(5): box('st_stripe', (60, .45, .35), (0, -8.7, 1.2 + k * 2.4), mat('st_stripe', (.6, .78, .98), .9))
SHOTS = [('front', 0.0), ('three_q', 1.2), ('side_walk', 2.4), ('back', 3.6), ('cu_shock', 4.6), ('cu_special', 5.8)]
shots = [(n, a, (SHOTS[i + 1][1] if i + 1 < len(SHOTS) else DUR + .01)) for i, (n, a) in enumerate(SHOTS)]
S = {n: (a, b) for n, a, b in shots}
def shot_at(t):
    for n, a, b in shots:
        if a <= t < b: return n, t - a
    return shots[-1][0], t - shots[-1][1]
TALK = [('hero', 1.2, 2.4)]
HIDE_ = (0., -900., -80., 0., {}, None, 0.)
def st_hero(t):
    n, lt = shot_at(t)
    if n == 'front': return ST(0, 0, 0., alive(t, 1.), 'neutral')
    if n == 'three_q': return ST(0, 0, 0., talk(t), 'happy')
    if n == 'side_walk':
        x, y, d, mv, h = along(t, S[n][0], (-3, 0), (3, 0), 3.2)
        return ST(x, y, h, walk2(walkph(d)) if mv else alive(t), 'smirk')
    if n == 'back': return ST(0, 0, 180., alive(t, 1.), 'neutral')
    if n == 'cu_shock': return ST(0, 0, 0., add(alive(t, .6), {'uaLZ': 30, 'uaRZ': -30, 'hdX': -6}), 'shock')
    return ST(0, 0, 0., alive(t, .6), 'S:cool_smirk')
FN = {'hero': st_hero}
STATES = {nm: [] for nm in CH}
for f in FRAMES:
    t = tsec(f)
    for nm in CH: STATES[nm].append(FN[nm](t) if nm in FN else HIDE_)
for nm in CH: bake_states(CH[nm], STATES[nm])
HEADP = {nm: [] for nm in CH}
for f in FRAMES:
    sc.frame_set(f)
    for nm, ch in CH.items(): HEADP[nm].append((ch.arm.matrix_world @ ch.arm.pose.bones['Head'].head).copy())
# ---- faces + lip sync (no VO for the test: TALK makes the mouth move on a fake envelope)
ENV = [abs(math.sin(i * .9)) for i in range(len(FRAMES))]
for nm, ch in CH.items():
    if isinstance(ch, ImpChar): continue
    seq = [s_[5] or (FAMI[nm] + '_neutral') for s_ in STATES[nm]]
    tr = face_track2(nm, FAMI[nm], seq, ENV, TALK, 3)
    m_, WE, WM = face_material2(nm + '_face2', ch.skin, FAMI[nm], tr)
    set_obj_mat(ch.parts['Head'], m_); ch.facemat = m_; ch.WE = WE; ch.WM = WM
    bake_faces2(ch, tr)
# ---- light: bright and soft
SUN = light('sun', 'SUN', (0, 0, 40), 2.2, (1, .95, .86), 1); SUN.rotation_mode = 'QUATERNION'
SUN.rotation_quaternion = Vector((.5, -.6, -.7)).normalized().to_track_quat('-Z', 'Y')
light('key', 'AREA', (-4, 7, 9), 1400, (1, .97, .92), 8., (-50, 0, 25)); light('fill', 'AREA', (6, 5, 6), 600, (.95, .97, 1.), 8., (-60, 0, -40))
# ---- camera
camd = bpy.data.cameras.new('Cam'); camd.sensor_fit = 'VERTICAL'; camd.sensor_height = 36; camd.clip_start = .02; camd.clip_end = 500
cam = bpy.data.objects.new('Cam', camd); COL.objects.link(cam); sc.camera = cam; cam.rotation_mode = 'QUATERNION'
def V(*a): return Vector(a)
HS = CH['hero'].scale
def cam_state(i):
    t = tsec(FRAMES[i]); n, lt = shot_at(t); H_ = HEADP['hero'][i]
    if n == 'front': return V(0, 10 * HS, 3.4 * HS), V(0, 0, 2.7 * HS), 30          # heading 0 faces +Y, so the camera sits on +Y
    if n == 'three_q': return V(5.2 * HS, 8 * HS, 4.0 * HS), V(0, 0, 2.8 * HS), 30
    if n == 'side_walk': return V(H_.x * .3, 12 * HS, 3.4 * HS), V(H_.x * .6, 0, 2.7 * HS), 26
    if n == 'back': return V(2.2 * HS, 10 * HS, 3.6 * HS), V(0, 0, 2.7 * HS), 30
    return H_ + V(0, 4.2 * HS, .55 * HS), H_ + V(0, 0, .45 * HS), 32
CP = [cam_state(i) for i in range(len(FRAMES))]
Q_ = [(tg - p).to_track_quat('-Z', 'Y') for p, tg, l in CP]
for c in range(1, len(Q_)):
    if Q_[c].dot(Q_[c - 1]) < 0: Q_[c].negate()
for c in range(3): bake(cam, 'location', c, FRAMES, [p[c] for p, tg, l in CP], 'LINEAR')
for c in range(4): bake(cam, 'rotation_quaternion', c, FRAMES, [q[c] for q in Q_], 'LINEAR')
bake(camd, 'lens', 0, FRAMES, [l for p, tg, l in CP], 'LINEAR')
# ---- render
r = sc.render
for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try: r.engine = eng; break
    except Exception: pass
r.resolution_x, r.resolution_y = 1080, 1920; r.resolution_percentage = 100
try: sc.eevee.taa_render_samples = 24
except Exception: pass
try: sc.view_settings.view_transform = 'Standard'
except Exception: pass
sc.view_settings.exposure = -.62
json.dump({'fps': FPS, 'shots': [[n, a, min(b, DUR)] for n, a, b in shots]}, open(os.path.join(HERE, VNAME + '_anchors.json'), 'w'))
try: r.image_settings.media_type = 'IMAGE'
except Exception: pass
PROG = os.path.join(HERE, VNAME + '_progress.txt')
if RUNMODE == 'stills':
    r.image_settings.file_format = 'JPEG'; r.image_settings.quality = 90
    SD = os.path.join(HERE, VNAME + 'stills', RROUND); os.makedirs(SD, exist_ok=True)
    for k, (n, a, b) in enumerate(shots):
        open(PROG, 'w').write('%d %d' % (k, len(shots)))
        sc.frame_set(int((a + (min(b, DUR) - a) * .55) * FPS) + 1); r.filepath = os.path.join(SD, '%02d_%s.jpg' % (k + 1, n)); bpy.ops.render.render(write_still=True)
open(PROG, 'w').write('DONE'); log('HERO TEST DONE', round(time.time() - T0, 1), 's')
