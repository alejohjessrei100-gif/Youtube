# ===================================================== MY SHADOW QUIT AND RAN AWAY — timed to the cleaned VO (52.29 s)
# Hero: Kuro. Sets: day bedroom (beats 1-2), city street (3-9), night bedroom (10-13).
RUNMODE = 'stills'; RROUND = 'r1'
try:
    _m = open(os.path.join(HERE, VNAME + '_mode.txt')).read().strip().split(':')
    RUNMODE = _m[0]; RROUND = _m[1] if len(_m) > 1 else 'r1'
except Exception: pass
log('RUNMODE', RUNMODE, RROUND)
def M_(name, rgb, rough=.6, es=0.): return mat(name, rgb, rough, 0., rgb if es else None, es)
OFFV = Vector((0, 0, -300))
HIDE_ = (0., -900., -80., 0., {}, None, 0.)
def fwv(h): return Vector((-math.sin(h * D2R), math.cos(h * D2R), 0.))
def sidev(h): return Vector((math.cos(h * D2R), math.sin(h * D2R), 0.))
def runner(t, t0, a, b, speed, seed=0.):
    x, y, d, mv, h = along(t, t0, a, b, speed)
    return x, y, h, (run(walkph(d, 3.2) + seed) if mv else {})

# ====================================================================================== SETS
DBX, DBY = 400., 0.        # day bedroom
NBX, NBY = 400., 100.      # night bedroom
bedroom2(DBX, DBY, night=False)
bedroom2(NBX, NBY, night=True)
# door on the south wall of the day bedroom: black hallway void + frame + a swinging door
DOOR_X = DBX + 9.; WY = DBY - 13.0
box('dr_void', (5.4, .3, 8.8), (DOOR_X, WY + .15, 4.4), mat('dr_void', (.01, .01, .015), .9), shadow=False)
FRM = M_('dr_frame', (.97, .96, .93), .5)
box('dr_ft', (6.4, .4, .6), (DOOR_X, WY + .2, 8.9), FRM); box('dr_fl', (.5, .4, 8.8), (DOOR_X - 2.95, WY + .2, 4.4), FRM); box('dr_fr', (.5, .4, 8.8), (DOOR_X + 2.95, WY + .2, 4.4), FRM)
DOORH = empty('dr_hinge', (DOOR_X + 2.7, WY + .55, 0.))
box('dr_panel', (5.3, .3, 8.6), (-2.65, 0, 4.3), M_('dr_wood', (.62, .38, .2), .45), parent=DOORH)
obj('dr_knob', SPH, (-4.6, -.25, 4.2), (.22, .22, .22), m=mat('dr_knob', (.9, .75, .3), .3, .9), parent=DOORH)
# light switch on the east wall of the night bedroom
SW_Y = NBY - 10.
box('sw_plate', (.12, .9, 1.4), (NBX + 14.94, SW_Y, 4.5), M_('sw_plate', (.97, .97, .95), .4)); box('sw_tog', (.18, .22, .4), (NBX + 14.84, SW_Y, 4.55), M_('sw_tog', (.8, .8, .78), .4))
# night room lights: collect so they can be switched
NLIGHTS = [(o, o.data.energy) for o in bpy.data.objects if o.type == 'LIGHT' and abs(o.location.x - NBX) < 30 and abs(o.location.y - NBY) < 30]
log('night lights', [o.name for o, e in NLIGHTS])
MOON = light('moon', 'AREA', (NBX - 12, NBY - 2, 8.), 110, (.55, .65, 1.), 8., (0, -90, 0))
DARKFILL = light('dark_fill', 'AREA', (NBX, NBY, 11.), 25, (.6, .7, 1.), 20.)
for o in bpy.data.objects:                                      # the bedside lamp shade glows only with the lights on
    if o.name.startswith('lampshade') and abs(o.location.x - NBX) < 30 and abs(o.location.y - NBY) < 30: LAMPSH = o
if 'LAMPSH' in globals(): LAMPM = emit_mat('lampsh_night', (1, .85, .55), 4.); LAMPSH.material_slots[0].link = 'OBJECT'; LAMPSH.material_slots[0].material = LAMPM
EYES = [obj('eye', SPH, (NBX + 10.8 + sx * 1.0, NBY + 12.4, 3.4), (.5, .12, .75), m=emit_mat('shd_eye', (1, 1, 1), 14.), shadow=False) for sx in (-1, 1)]
# street
city_street(0, 0, 180, False, 0., 3)

# ====================================================================================== CAST
SK['shadow_blk'] = (.015, .015, .02); BLK = (.02, .02, .03)
shd = mkr('shd', 'tom', 'shadow_blk', 1.05, BLK, BLK, BLK, BLK, ('r_spiky', BLK), ())              # Kuro's shadow
shm = mkr('shm', 'mom', 'shadow_blk', 1.15, BLK, BLK, BLK, BLK, ('r_pony', BLK, BLK), ())          # mom's own shadow
mom = mkr('mom', 'mom', 'light', 1.15, (.55, .28, .62), (.55, .28, .62), (.22, .28, .5), (.95, .95, .95), ('r_pony', (.35, .2, .1), (.95, .4, .6)), ())
# the cat
CATM = M_('cat_o', (.95, .55, .2), .7); CATK = M_('cat_k', (.03, .03, .04), .4)
CAT = empty('cat', OFFV)
obj('cat_body', SPH, (0, 0, 1.0), (.75, 1.3, .7), m=CATM, parent=CAT); obj('cat_head', SPH, (0, 1.35, 1.5), (.65, .6, .55), m=CATM, parent=CAT)
for sx in (-1, 1):
    obj('cat_ear', CONE16, (sx * .38, 1.3, 2.05), (.28, .14, .45), m=CATM, parent=CAT); obj('cat_eye', SPH, (sx * .25, 1.9, 1.6), (.1, .06, .13), m=CATK, parent=CAT)
    for sy in (-.7, .8): box('cat_leg', (.28, .28, .9), (sx * .4, sy, .45), CATM, parent=CAT)
obj('cat_nose', SPH, (0, 1.97, 1.45), (.08, .06, .06), m=M_('cat_pink', (.9, .4, .5)), parent=CAT)
obj('cat_tail', CYL8, (0, -1.5, 1.7), (.16, .16, 1.5), (-40, 0, 0), CATM, CAT)
CAT.scale = (1.4, 1.4, 1.4)
# note, sneeze puff
NOTE = empty('note', OFFV); box('note_p', (1.9, .05, 2.4), (0, 0, 0), M_('note_paper', (.98, .95, .85), .8), parent=NOTE)
label('I QUIT', (0, -.05, .1), .62, (.75, .08, .08), parent=NOTE, extrude=.02)
PUFF = empty('puff', OFFV); _pm = M_('f_puff', (1, 1, 1), .9, .3); _r = random.Random(5)
for k in range(11):
    a_ = k * 2.4; rr_ = _r.uniform(.4, 1.3)
    obj('puff', SPH, (math.cos(a_) * rr_, _r.uniform(-.6, .6), math.sin(a_) * rr_ * .8), (_r.uniform(.55, .95),) * 3, m=_pm, parent=PUFF, shadow=False)
# the crowd (static blocky people) around the dance spot, all looking at the centre
DC = (-42.5, -3.)
CROWD = []
for k in range(11):
    a_ = k / 11 * 2 * math.pi + .3; rad = 10.5 + (k % 3) * 1.6
    cx_, cy_ = DC[0] + math.cos(a_) * rad, DC[1] + math.sin(a_) * rad * .75
    extra(cx_, cy_, face_to(cx_, cy_, DC[0], DC[1]), 40 + k, 0., False, 'up' if k % 4 == 0 else 'down', 1.05)
# ordinary people for "copying other people"
extra(2.5, -14.5, 180., 71, 0., False, 'up', 1.05); extra(31., -14.5, 180., 72, 0., False, 'up', 1.05)

# ====================================================================================== TIMELINE (cleaned VO)
SHOTS = [('b_look', 0.00), ('b_floor', .75), ('b_note', 1.47), ('b_notecu', 2.395), ('b_read', 3.4), ('b_door', 4.525), ('b_without', 5.945),
         ('st_chase', 6.83), ('st_faster', 8.18), ('st_pant', 9.245), ('st_far', 10.3), ('st_copy1', 11.355), ('st_copy2', 12.25),
         ('st_cat1', 13.095), ('st_cat2', 14.535), ('st_worst', 15.66), ('st_join', 16.9), ('mom_join', 17.835), ('mom_two', 19.365), ('mom_mad', 21.16),
         ('win_back', 22.545), ('did_job', 23.7), ('copied', 24.84), ('jump', 25.645), ('spin', 26.775), ('dance', 28.185),
         ('street_mid', 29.715), ('watching', 31.055), ('embarrassed', 32.39), ('shd_laugh', 34.54), ('shd_laugh2', 35.805), ('sneeze', 36.89),
         ('stuck', 39.175), ('friends', 41.035), ('n_switch', 42.06), ('n_gone', 43.725), ('n_on', 44.525), ('n_there', 45.625),
         ('f_off', 46.29), ('f_gone', 46.665), ('f_on', 47.035), ('f_there', 47.445), ('n_again', 47.915), ('n_whisper', 49.11), ('n_eyes', 50.23), ('n_zoom', 51.4)]
shots = [(n, a, (SHOTS[i + 1][1] if i + 1 < len(SHOTS) else DUR + .01)) for i, (n, a) in enumerate(SHOTS)]
S = {n: (a, b) for n, a, b in shots}
def shot_at(t):
    for n, a, b in shots:
        if a <= t < b: return n, t - a
    return shots[-1][0], t - shots[-1][1]
def ts(n): return S[n][0]
TALK = [('hero', 0., DUR)]
BD = ('b_look', 'b_floor', 'b_note', 'b_notecu', 'b_read', 'b_door', 'b_without')
BN = tuple(n for n, a in SHOTS if n.startswith('n_') or n.startswith('f_'))
def lights_on(t): return t < 43.35 or 44.6 <= t < 46.29 or 47.035 <= t < 48.4

# ---------------------------------------------------------- spots
KD = (DBX + 2., DBY - 3.); SD = (DBX + 6.5, DBY - 9.5); DOORP = (DOOR_X, DBY - 12.3); NOTE_FL = Vector((DBX + 5., DBY - 7.6, .08))
K_SW = (NBX + 13.6, SW_Y)
KS0 = (-22., -3.); KSP, SSP = 9., 14.          # chase speeds
K_STOP = KS0[0] + KSP * (ts('st_pant') - ts('st_chase'))
CATC = {'x0': 18.}
MOMP = (46., -3.)
KW = (34., -9.)                                  # Kuro watches the cat / gets scared of mom
KA = (DC[0] - 3., DC[1]); SA = (DC[0] + 3., DC[1])
def kuro_run(t):
    if t < ts('st_faster'): return KS0[0] + KSP * (t - ts('st_chase'))
    return min(K_STOP, KS0[0] + KSP * (t - ts('st_chase')))
def jmp(t, d=0.):
    p = ((t - d) % .55) / .55
    return 1.7 * abs(math.sin(math.pi * p)) if t >= d else 0.
def jarms(t, d=0.): return {'uaLZ': 140 * min(1, jmp(t, d)), 'uaRZ': -140 * min(1, jmp(t, d))}
def flick(t, t0):          # left arm up to the switch around t0
    k = prog(t, t0 - .35, t0 - .1) * (1 - prog(t, t0 + .1, t0 + .4))
    return {'uaLZ': 86 * k + 10 * math.sin((t - t0) * 40) * k, 'laLX': -10 * k}

# ---------------------------------------------------------- states
def st_hero(t):
    n, lt = shot_at(t); a = S[n][0]
    if n in BD:
        x, y = KD
        if n == 'b_look': return ST(x, y, 180., add(P['scared'], {'hdX': -6}), 'shock')
        if n == 'b_floor': return ST(x, y, 180., add({'hdX': 38, 'spX': 12, 'uaLX': -20, 'uaRX': -20, 'uaLZ': 18, 'uaRZ': -18}, breathe(t)), 'shock')
        if n in ('b_note',): return ST(x, y, face_to(x, y, SD[0], SD[1]), add({'hdX': 8}, alive(t)), 'surprised')
        if n == 'b_notecu':
            k = eio(prog(t, 3.0, 3.4)); nx, ny = NOTE_FL.x, NOTE_FL.y
            return ST(lerp(x, nx - .8, k), lerp(y, ny + 1.2, k), 180. if k < .5 else face_to(x, y, nx, ny), add({'spX': 30 * k, 'hdX': 20 * k, 'uaRX': -50 * k, 'laRX': -30 * k}, alive(t)), 'sad')
        if n == 'b_read': return ST(KD[0] + 1.6, KD[1] - 3.2, 180., add(P['read'], {'hdX': 22}), 'angry')
        if n == 'b_door': return ST(KD[0] + 1.6, KD[1] - 3.2, face_to(KD[0] + 1.6, KD[1] - 3.2, DOORP[0], DOORP[1]), add({'uaRX': -50, 'laRX': -70, 'uaRZ': 10, 'hdX': -4}, alive(t)), 'angry')
        return ST(KD[0] + 1.6, KD[1] - 3.2, 180., add({'uaLX': -60, 'laLX': -90, 'uaRX': -60, 'laRX': -90, 'uaLZ': -25, 'uaRZ': 25, 'hdX': -6, 'hdY': jitter(t, 4., 1.)}, alive(t, .3)), 'angry')
    if n == 'st_chase': x, y, h, p = runner(t, a, (KS0[0], -3.), (60., -3.), KSP); return ST(x, y, h, p or alive(t), 'angry')
    if n == 'st_faster': x, y, h, p = runner(t, ts('st_chase'), (KS0[0], -3.), (60., -3.), KSP); return ST(x, y, h, p, 'angry')
    if n in ('st_pant', 'st_far'):
        return ST(K_STOP, -3., -90., add({'spX': 38, 'hdX': 24, 'uaLX': -28, 'uaRX': -28, 'laLX': -20, 'laRX': -20, 'ulLX': -12, 'ulRX': -12}, pant(t, 1.6)), 'tired')
    if n == 'st_cat2': return ST(KW[0], KW[1], face_to(KW[0], KW[1], 40., -3.), add(P['laugh'], {'spX': 6 * math.sin(t * 16), 'hdX': -18}), 'laugh')
    if n == 'st_worst': return ST(KW[0], KW[1], 180., add(P['scared'], {'hdX': -10}), 'surprised')
    if n == 'mom_mad': return ST(KW[0], KW[1], 180., add(P['scared'], pant(t, .8)), 'scared')
    if n == 'win_back': return ST(KA[0], KA[1], 180., add({'uaLX': -70, 'laLX': -95, 'uaLZ': -20, 'uaRX': -70, 'laRX': -95, 'uaRZ': 20, 'hdX': -4}, alive(t, .5)), 'fierce')
    if n in ('did_job', 'copied'): return ST(KA[0], KA[1], -90., add({'uaLX': -55, 'uaRX': -55, 'laLX': -30, 'laRX': -30, 'hdX': -4}, alive(t)), 'smirk')
    if n == 'jump': return ST(KA[0], KA[1], -90., add(jarms(t, a + .75), {'ulLX': -20 * (jmp(t, a + .75) > .2), 'llLX': 25 * (jmp(t, a + .75) > .2)}), 'smirk', jmp(t, a + .75))
    if n == 'spin':
        d_ = .25; hh = -90. + 720. * eio(prog(t - a, .1 + d_, 1.2 + d_)); return ST(KA[0], KA[1], hh, add({'uaLZ': 75, 'uaRZ': -75}, alive(t, .4)), 'smirk')
    if n == 'dance': return ST(KA[0], KA[1], -90., dance(t - .25, 4), 'neutral')
    if n in ('street_mid', 'watching'): return ST(KA[0] + 1.5, KA[1], -60., dance(t - .25, 1) if n == 'street_mid' else add(dance(t - .25, 1), {'hdX': 16}), 'nervous' if n == 'street_mid' else 'sad')
    if n == 'embarrassed': return ST(KA[0] + 1.5, KA[1], 180., add(P['cover'], {'spX': -14, 'hdX': -22, 'hdY': 8 * math.sin(t * 2.3)}), 'cringe')
    if n in ('shd_laugh', 'shd_laugh2', 'sneeze'): return ST(KA[0], KA[1], -90., add(P['scared'], {'spX': -4}) if n == 'sneeze' else add(alive(t), {'hdX': -6}), 'surprised' if n != 'sneeze' else 'smirk')
    if n == 'stuck': return ST(KA[0], KA[1], 180., add(P['hero'], alive(t, .5)), 'happy')
    if n == 'friends': return ST(KA[0], KA[1], 180., add({'uaRZ': -150 + 18 * math.sin(t * 9), 'uaLZ': 8}, alive(t, .5)), 'happy')
    if n in BN:
        x, y = K_SW
        arm = {}
        if n == 'n_switch': arm = flick(t, 43.35)
        if n == 'n_on': arm = flick(t, 44.6)
        if n in ('f_off', 'f_gone'): arm = flick(t, 46.29 if n == 'f_off' else 46.7)
        if n in ('f_on', 'f_there'): arm = flick(t, 47.035)
        if n == 'n_again': arm = flick(t, 48.4)
        face = {'n_switch': 'neutral', 'n_gone': 'neutral', 'n_on': 'neutral', 'n_there': 'neutral', 'f_off': 'smirk', 'f_gone': 'smirk', 'f_on': 'smirk', 'f_there': 'smirk',
                'n_again': 'nervous', 'n_whisper': 'scared', 'n_eyes': 'scared', 'n_zoom': 'shock'}[n]
        tw = 0. if n not in ('n_eyes', 'n_zoom') else 14. * math.sin(t * 24)
        return ST(x, y, 180., add(alive(t, .6), arm, {'hdY': -25 * prog(t, 43.4, 43.7) * (n == 'n_gone')}, {'hdX': -6 if n == 'n_zoom' else 0., 'spZ': tw * .3}, P['scared'] if n in ('n_whisper', 'n_eyes', 'n_zoom') else {}), face)
    return HIDE_

def st_shd(t):
    n, lt = shot_at(t); a = S[n][0]
    if n in BD:
        if n in ('b_look', 'b_floor', 'b_without'): return HIDE_
        if n in ('b_note', 'b_notecu', 'b_read'):
            hold = 1.47 <= t < 1.9
            return ST(SD[0], SD[1], 180., add(alive(t, .8), {'uaRX': -120, 'laRX': -20, 'uaRZ': -20} if hold else {'uaRX': -30, 'uaRZ': -6}), 'smug')
        if n == 'b_door':
            if t < 4.75: return ST(SD[0], SD[1], 180., alive(t), 'neutral')
            x, y, d, mv, h = along(t, 4.75, SD, DOORP, 4.4)
            if t > 5.55: return HIDE_
            return ST(x, y, h, walk2(walkph(d, 2.29)) if mv else alive(t), 'neutral')
    if n == 'st_chase': x, y, h, p = runner(t, ts('st_chase'), (-10., -3.), (80., -3.), SSP); return ST(x, y, h, p, 'smug')
    if n == 'st_faster': x, y, h, p = runner(t, ts('st_chase'), (-10., -3.), (80., -3.), SSP); return ST(x, y, h, p, 'smug')
    if n == 'st_pant': x, y, h, p = runner(t, ts('st_pant'), (K_STOP + 32., -3.), (80., -3.), SSP); return ST(x, y, h, p, 'smug')
    if n == 'st_far': x, y, h, p = runner(t, ts('st_far'), (K_STOP + 13., -3.), (90., -3.), 8.); return ST(x, y, h, p, 'smug')
    if n == 'st_copy1': return ST(5.5, -14.5, 180., add(dance(t, 0), {'hdY': 0}), 'smug')
    if n == 'st_copy2': return ST(34., -14.5, 180., dance(t, 3), 'smug')
    if n == 'st_cat1': x, y, h, p = runner(t, a, (CATC['x0'] - 7., -3.), (90., -3.), 22.); return ST(x, y, h, p, 'angry')
    if n == 'st_cat2': x, y, h, p = runner(t, a, (52., -3.), (-40., -3.), 17.); return ST(x, y, h, p, 'scared')
    if n == 'st_join':
        x, y, d, mv, h = along(t, a, (30., -3.), (MOMP[0] - 2.6, MOMP[1]), 8.)
        return ST(x, y, h, walk2(walkph(d, 2.29)) if mv else add(P['cross'], alive(t, .5)), 'neutral')
    if n == 'mom_join': return ST(MOMP[0] - 2.6, lerp(MOMP[1], MOMP[1] + 2., eio(prog(lt, .2, .9))), 180., add(P['cross'], alive(t, .5)), 'angry')
    if n in ('mom_two', 'mom_mad'): return ST(MOMP[0] - 2.6, MOMP[1] + 2., 180., add(P['cross'], alive(t, .5)), 'angry')
    if n == 'win_back': return ST(SA[0], SA[1], 90., alive(t), 'smug')
    if n in ('did_job', 'copied'): return ST(SA[0], SA[1], 90., add({'uaLX': -55, 'uaRX': -55, 'laLX': -30, 'laRX': -30, 'hdX': -4}, alive(t)), 'smug')
    if n == 'jump': return ST(SA[0], SA[1], 90., jarms(t, a + .5), 'smug', jmp(t, a + .5))
    if n == 'spin': hh = 90. + 720. * eio(prog(t - a, .1, 1.2)); return ST(SA[0], SA[1], hh, add({'uaLZ': 75, 'uaRZ': -75}, alive(t, .4)), 'smug')
    if n == 'dance': return ST(SA[0], SA[1], 90., dance(t, 4), 'laugh')
    if n in ('street_mid', 'watching'): return ST(SA[0] + 4., SA[1] + .8, 120., dance(t, 1), 'laugh' if n == 'street_mid' else 'smug')
    if n == 'embarrassed': return ST(SA[0] + 4., SA[1] + .8, 120., add(P['laugh'], {'hdX': -10}), 'smug')
    if n in ('shd_laugh', 'shd_laugh2'):
        sh_ = math.sin(t * 22); return ST(SA[0], SA[1], 90., add(P['laugh'], {'spX': 28 + 10 * sh_, 'hdX': 10 * sh_, 'bob': .05 * abs(sh_)}), 'laugh')
    if n == 'sneeze':
        k = kp(lt, [(0, {}), (1.05, {'spX': -18, 'hdX': -14, 'uaLX': -40, 'laLX': -90}, eo), (1.12, {'spX': 26, 'hdX': 14, 'uaLX': -80, 'laLX': -100}), (2.0, {'spX': 6, 'hdX': 4}, eo)])
        return ST(SA[0], SA[1], 90., add(alive(t, .5), k), 'S:tiny_o' if 1.0 < lt < 1.3 else 'happy')
    if n == 'stuck':
        s0 = (SA[0] + 8., SA[1] - 1.)
        if lt < 1.05:
            x, y, d, mv, h = along(t, a, s0, (KA[0], KA[1]), 8.5)
            return ST(x, y, h if mv else 180., add(walk2(walkph(d, 2.29)), {}) if mv else alive(t), 'neutral')
        k = eio(prog(lt, 1.05, 1.4)); return ST(KA[0], KA[1], 180., add(alive(t, .3), {'ulLX': 0}), 'happy', 0.5 * k, 90. * k) if False else (KA[0], KA[1], .55 * k, 180., alive(t, .2), 'happy', 90. * k)
    if n == 'friends': return (KA[0], KA[1], .55, 180., {'uaLX': 0}, 'happy', 90.)
    if n in BN:
        vis = lights_on(t) and (n in ('n_switch', 'n_on', 'n_there', 'f_on', 'f_there') or (n == 'n_gone' and False))
        if vis: return (K_SW[0], K_SW[1] + 1.2, .55, 180., {}, 'smug', 90.)
        return HIDE_
    return HIDE_

def st_mom(t):
    n, lt = shot_at(t)
    if n in ('st_join', 'mom_join', 'mom_two', 'mom_mad'): return ST(MOMP[0], MOMP[1], 180., add(P['cross'], alive(t, .5)), 'angry')
    return HIDE_
def st_shm(t):
    n, lt = shot_at(t)
    if n in ('mom_two', 'mom_mad'): return ST(MOMP[0] + 2.6, MOMP[1] + 2., 180., add(P['cross'], alive(t, .5)), 'angry')
    return HIDE_
FN = {'hero': st_hero, 'shd': st_shd, 'mom': st_mom, 'shm': st_shm}
STATES = {nm: [] for nm in CH}
for f in FRAMES:
    t = tsec(f)
    for nm in CH: STATES[nm].append(FN[nm](t) if nm in FN else HIDE_)
for nm in CH: bake_states(CH[nm], STATES[nm])
HEADP = {nm: [] for nm in CH}; HANDS = {nm: [] for nm in CH}
for f in FRAMES:
    sc.frame_set(f)
    for nm, ch in CH.items():
        mw = ch.arm.matrix_world; pb = ch.arm.pose.bones
        HEADP[nm].append((mw @ pb['Head'].head).copy()); HANDS[nm].append(((mw @ pb['Hand.L'].tail).copy(), (mw @ pb['Hand.R'].tail).copy()))
log('tracking pass', round(time.time() - T0, 1), 's')

# ---------------------------------------------------------- props: cat, note, puff, door, eyes, lights
def catx(t, n, lt):
    if n == 'st_cat1': return (CATC['x0'] + 22. * lt, -3., -90.)
    if n == 'st_cat2': return (52. - 17. * lt + 6., -3., 90.)
    return None
CATP, NOTEP, PUFFP, DOORA, EYEA, LMULT = [], [], [], [], [], []
def lerpV(a, b, k): return a + (b - a) * k
for i, f in enumerate(FRAMES):
    t = tsec(f); n, lt = shot_at(t)
    c = catx(t, n, lt)
    if c: CATP.append((Vector((c[0], c[1], .3 * abs(math.sin(t * 15)))), c[2]))
    else: CATP.append((OFFV, 0.))
    # note
    if t < 1.47 or t >= 5.945: NOTEP.append((OFFV, (0, 0, 0)))
    elif t < 1.9: NOTEP.append((HANDS['shd'][i][1] + Vector((0, 0, .4)), (0, 0, 0)))
    elif t < 2.15:
        i0 = int((1.9) * FPS); p0 = HANDS['shd'][min(i0, len(FRAMES) - 1)][1] + Vector((0, 0, .4)); k = eo(prog(t, 1.9, 2.15))
        NOTEP.append((lerpV(p0, NOTE_FL + Vector((0, 0, .1)), k), (-90 * k, 0, 0)))
    elif t < 3.4: NOTEP.append((NOTE_FL + Vector((0, 0, .1)), (-90, 0, 12)))
    else:
        hl, hr = HANDS['hero'][i]; h_ = STATES['hero'][i][3]; k = eo(prog(t, 3.4, 3.75))
        held = (hl + hr) / 2 + fwv(h_) * .35 + Vector((0, 0, .15))
        NOTEP.append((lerpV(NOTE_FL + Vector((0, 0, .1)), held, k), (lerp(-90., -15., k), 0, h_ if k > .5 else 12)))
    # sneeze puff
    if n == 'sneeze' and lt >= 1.1:
        k = prog(lt, 1.1, 1.8); sc_ = 1.3 * math.sin(math.pi * min(1, k * 1.1)) + .01
        H_ = HEADP['shd'][i]; PUFFP.append((H_ + Vector((1.4, 0, -.3)), sc_))
    else: PUFFP.append((OFFV, .01))
    # door swing
    DOORA.append(-95. * eio(prog(t, 4.52, 4.95)))
    EYEA.append(.75 * eo(prog(t, 50.3, 50.75)) if t >= 50.23 and not lights_on(t) else .0)
    LMULT.append(1. if lights_on(t) else .03)
for c in range(3): bake(CAT, 'location', c, FRAMES, [p[0][c] for p in CATP], 'LINEAR'); bake(NOTE, 'location', c, FRAMES, [p[0][c] for p in NOTEP], 'LINEAR')
bake(CAT, 'rotation_euler', 2, FRAMES, [p[1] * D2R for p in CATP], 'CONSTANT')
for c in range(3): bake(NOTE, 'rotation_euler', c, FRAMES, [p[1][c] * D2R for p in NOTEP], 'LINEAR')
for c in range(3): bake(PUFF, 'location', c, FRAMES, [p[0][c] for p in PUFFP], 'LINEAR'); bake(PUFF, 'scale', c, FRAMES, [p[1] for p in PUFFP], 'LINEAR')
bake(DOORH, 'rotation_euler', 2, FRAMES, [a * D2R for a in DOORA], 'LINEAR')
for e_ in EYES: bake(e_, 'scale', 2, FRAMES, [max(.001, v) for v in EYEA], 'LINEAR')
for o, e0 in NLIGHTS: bake(o.data, 'energy', 0, FRAMES, [e0 * (22. if m > .5 else .02) for m in LMULT], 'CONSTANT')
_late = [1. if tsec(f) < 42.0 else 0. for f in FRAMES]   # after the street, no sky/sun leaks into the night room
if 'LAMPSH' in globals():
    try: bake(LAMPM.node_tree, 'nodes["Principled BSDF"].inputs["Emission Strength"].default_value', 0, FRAMES, [4. * m for m in LMULT], 'CONSTANT')
    except Exception as ex: log('lamp bake', ex)

# ---------------------------------------------------------- faces + lip sync
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
log('faces baked', round(time.time() - T0, 1), 's')

# ---------------------------------------------------------- world + lights
DAY = ((.62, .8, 1.0), (.12, .38, .95), (1, .95, .85), .4, 0., 1.0)
for i_ in range(3):
    nt.nodes['HOR'].outputs[0].default_value[i_] = DAY[0][i_]; nt.nodes['ZEN'].outputs[0].default_value[i_] = DAY[1][i_]
    nt.nodes['GLOW'].outputs[0].default_value[i_] = DAY[2][i_]; nt.nodes['SUNDIR'].inputs[i_].default_value = (-.6, -.3, .45)[i_]
nt.nodes['GLOWS'].outputs[0].default_value = DAY[3]; nt.nodes['STARS'].outputs[0].default_value = 0.; nt.nodes['BG'].inputs[1].default_value = .75
bake(nt, 'nodes["BG"].inputs[1].default_value', 0, FRAMES, [.75 if tsec(f) < 42.0 else .1 for f in FRAMES], 'CONSTANT')
try: clouds(0, 40, 14, 120, 260, 60, 110, 3)
except Exception as ex: log('clouds', ex)
SUN = light('sun', 'SUN', (0, 0, 60), 2.6, (1, .95, .86), 1); SUN.data.angle = 5 * D2R
SUN.rotation_mode = 'QUATERNION'; SUN.rotation_quaternion = Vector((.55, .4, -.75)).normalized().to_track_quat('-Z', 'Y')
bake(SUN.data, 'energy', 0, FRAMES, [2.6 if tsec(f) < 42.0 else 0. for f in FRAMES], 'CONSTANT')

# ---------------------------------------------------------- camera
camd = bpy.data.cameras.new('Cam'); camd.sensor_fit = 'VERTICAL'; camd.sensor_height = 36; camd.clip_start = .02; camd.clip_end = 2000
cam = bpy.data.objects.new('Cam', camd); COL.objects.link(cam); sc.camera = cam; cam.rotation_mode = 'QUATERNION'
def V(*a): return Vector(a)
def L2(a, b, e): return V(*a).lerp(V(*b), e)
def mid_i(n): return min(len(FRAMES) - 1, int((S[n][0] + S[n][1]) / 2 * FPS))
def HM(nm, n): return HEADP[nm][mid_i(n)]
def HMH(nm, n): return STATES[nm][mid_i(n)][3]
def ecu(nm, n, e, dist, side=0., up=0., push=.12, tz=-.15):
    h = HMH(nm, n); H_ = HM(nm, n) + V(0, 0, .62 * CH[nm].scale); d_ = dist * 1.12 * (1 - push * e)
    return H_ + fwv(h) * d_ + sidev(h) * side + V(0, 0, up - .28 * CH[nm].scale), H_ + V(0, 0, tz - .12 * CH[nm].scale)
def wide_side(n, x0, x1, e, y=-17., z=7.0, ty=-3.): return V(lerp(x0, x1, e), y, z), V(lerp(x0, x1, e), ty, 3.0)
def cam_state(i):
    t = tsec(FRAMES[i]); n, lt = shot_at(t); a, b = S[n]; e = eio(prog(lt, 0, b - a)); eq = eo(prog(lt, 0, (b - a) * .6)); shake = 0.; roll = 0.; lens = 26
    KDv = V(KD[0], KD[1], 3.)
    # ---- day bedroom
    if n == 'b_look': pos, tgt = ecu('hero', n, eq, 5.4, .2, .3, .2, -.2); lens = 30
    elif n == 'b_floor': pos = L2((KD[0] + 1.8, KD[1] - 6.8, 1.6), (KD[0] + 1.2, KD[1] - 6.0, 1.9), e); tgt = V(KD[0], KD[1], 1.3); lens = 24
    elif n == 'b_note': pos = L2((DBX - 2., DBY + 5., 6.2), (DBX - 1., DBY + 4.4, 5.9), e); tgt = V(SD[0] - 1., SD[1], 3.6); lens = 24
    elif n == 'b_notecu': pos = V(NOTE_FL.x - .4, NOTE_FL.y - 1.0, 7.8); tgt = V(NOTE_FL.x, NOTE_FL.y + .1, .2); lens = 28
    elif n == 'b_read': pos, tgt = ecu('hero', n, e, 3.8, 3.8, .5, .12, -.3); lens = 30
    elif n == 'b_door': pos = L2((DBX + 1., DBY + 2.5, 5.6), (DBX + 2.4, DBY + 1.8, 5.2), e); tgt = V(DOOR_X - 1., DBY - 9., 3.6); lens = 24
    elif n == 'b_without': pos, tgt = ecu('hero', n, eq, 3.6, -.3, .2, .2, -.3); lens = 30; shake = .03
    # ---- street, chase
    elif n == 'st_chase': kx = kuro_run(t); pos = V(kx - 8., -1.5, 3.4); tgt = V(kx + 10., -3., 3.2); lens = 24
    elif n == 'st_faster': kx = kuro_run(t); pos = V(kx - 9., -3.5, 2.6); tgt = V(kx + 26., -3., 3.4); lens = 24
    elif n == 'st_pant': pos, tgt = ecu('hero', n, eq, 4.6, .3, -1.0, .2, -.9); lens = 30
    elif n == 'st_far': pos = V(K_STOP - 8., -5., 2.6); tgt = V(K_STOP + 13. + 8. * lt, -3., 3.4); lens = 24
    elif n == 'st_copy1': pos = L2((3.5, -20., 3.8), (4.5, -19., 3.8), e); tgt = V(4., -14.5, 3.4); lens = 24
    elif n == 'st_copy2': pos = L2((32., -20., 3.8), (33., -19., 3.8), e); tgt = V(32.5, -14.5, 3.4); lens = 24
    elif n == 'st_cat1': pos, tgt = wide_side(n, 30., 44., e, -15., 7.2); lens = 24
    elif n == 'st_cat2': cx = 55. - 17. * lt; pos = V(cx + 11., -1.5, 3.6); tgt = V(cx - 6., -3., 3.0); lens = 24
    elif n == 'st_worst': pos, tgt = ecu('hero', n, eq, 3.6, .2, .2, .25, -.35); lens = 30; shake = .04
    elif n == 'st_join': pos = L2((34., -17., 4.6), (38., -16., 4.4), e); tgt = V(40., -3., 3.2); lens = 22
    elif n == 'mom_join': pos = L2((43.5, -12., 4.2), (44.2, -9.6, 4.0), e); tgt = V(44.6, -3., 3.6); lens = 28
    elif n == 'mom_two': pos = L2((44., -11.5, 2.6), (45., -9.5, 3.0), e); tgt = V(46., -1.8, 4.0); lens = 26
    elif n == 'mom_mad': pos, tgt = ecu('hero', n, e, 3.4, .3, .1, .2, -.3); lens = 30
    # ---- copying
    elif n == 'win_back': pos, tgt = ecu('hero', n, eq, 3.6, .2, .3, .2, -.3); lens = 30
    elif n == 'did_job': pos = L2((DC[0] - 1., -15., 6.5), (DC[0] - 1., -13., 6.0), e); tgt = V(DC[0], -3., 2.8); lens = 26
    elif n == 'copied': pos, tgt = ecu('hero', n, e, 3.4, .5, .3, .15, -.3); lens = 30
    elif n == 'jump': pos = V(DC[0], -15., 6.2); tgt = V(DC[0], -3., 3.6); lens = 26
    elif n == 'spin': pos = L2((DC[0], -15., 6.0), (DC[0], -13., 5.6), e); tgt = V(DC[0], -3., 3.0); lens = 26; roll = 3 * math.sin(t * 6)
    elif n == 'dance': pos = L2((DC[0] - 6., -12., 3.2), (DC[0] - 3., -10., 3.0), e); tgt = V(DC[0], -3., 3.2); lens = 26; roll = -4 * math.sin(t * 7)
    elif n == 'street_mid': pos = L2((DC[0], -20., 14.), (DC[0], -18.5, 12.), e); tgt = V(DC[0], -3., 2.0); lens = 24
    elif n == 'watching': pos = L2((DC[0] - 9., DC[1] + 2.6, 4.4), (DC[0] - 8., DC[1] + 2.6, 4.2), e); tgt = V(DC[0] + 9., DC[1], 3.6); lens = 26
    elif n == 'embarrassed': pos, tgt = ecu('hero', n, eq, 3.8, -.2, .5, .3, -.3); lens = 30; roll = -3
    # ---- laughing / sneeze / stuck
    elif n == 'shd_laugh': pos, tgt = ecu('shd', n, e, 3.6, .3, .2, .1, -.3); lens = 30; shake = .02
    elif n == 'shd_laugh2': pos = L2((DC[0] - .5, -13., 3.4), (DC[0] + .5, -12., 3.6), e); tgt = V(DC[0], DC[1], 3.4); lens = 26
    elif n == 'sneeze': pos, tgt = ecu('shd', n, eq, 4.2, .5, .2, .1, -.3); lens = 30; shake = .05 * prog(lt, 1.1, 1.2) * (1 - prog(lt, 1.2, 1.6))
    elif n == 'stuck': pos = L2((DC[0] - 2., -16., 5.6), (DC[0] - 1., -13., 5.0), e); tgt = V(DC[0], DC[1], 2.2); lens = 24
    elif n == 'friends': pos = L2((DC[0] + 1., DC[1] - 8.5, 4.4), (DC[0] + .5, DC[1] - 7.2, 4.2), e); tgt = V(DC[0], DC[1] + 1.4, 2.6); lens = 26
    # ---- night bedroom
    elif n == 'n_switch': pos = L2((NBX + 6., NBY - 12.4, 4.6), (NBX + 8., NBY - 12.3, 4.6), e); tgt = V(K_SW[0], K_SW[1], 3.6); lens = 28
    elif n == 'n_gone': pos = V(NBX + 3., NBY - 3., 5.2); tgt = V(K_SW[0] - .6, K_SW[1] + .8, 1.6); lens = 24
    elif n == 'n_on': pos, tgt = ecu('hero', n, e, 2.6, -.5, .3, .1, -.2); lens = 38
    elif n == 'n_there': pos = V(NBX + 4., NBY - 4., 5.4); tgt = V(K_SW[0], K_SW[1] + .8, 1.4); lens = 24
    elif n == 'f_off': pos = V(NBX + 9., NBY - 12.3, 4.4); tgt = V(K_SW[0], K_SW[1], 3.5); lens = 28
    elif n == 'f_gone': pos, tgt = ecu('hero', n, e, 2.6, .4, .2, .08, -.2); lens = 38
    elif n == 'f_on': pos = V(NBX + 9., NBY - 12.3, 4.4); tgt = V(K_SW[0], K_SW[1], 3.5); lens = 28
    elif n == 'f_there': pos = V(NBX + 5., NBY - 3., 4.6); tgt = V(K_SW[0], K_SW[1] + .8, 1.2); lens = 24
    elif n == 'n_again': pos, tgt = ecu('hero', n, e, 2.6, -.4, .2, .1, -.2); lens = 38
    elif n == 'n_whisper': pos = L2((NBX + 4., NBY - 12.3, 5.0), (NBX + 5.5, NBY - 12.3, 4.8), e); tgt = V(K_SW[0], K_SW[1], 3.4); lens = 26
    elif n == 'n_eyes': pos = V(NBX + 2., NBY - 8., 4.2); tgt = V(NBX + 10.8, NBY + 12.4, 3.6); lens = 36; shake = .01
    elif n == 'n_zoom': pos, tgt = ecu('hero', n, e, 2.4, 0., .1, .55, -.25); lens = 34 + 16 * e; shake = .02
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

# ---------------------------------------------------------- render
r = sc.render
try: r.engine = 'BLENDER_EEVEE'
except Exception:
    try: r.engine = 'BLENDER_EEVEE_NEXT'
    except Exception: pass
r.resolution_x, r.resolution_y = 1080, 1920; r.resolution_percentage = 50 if RUNMODE == 'stills' else 100; r.fps = FPS
PART_LO, PART_HI = 1, NF
if RUNMODE == 'video':        # Kaggle GPU render: Cycles, 720x1280, one half of the frames per notebook (shadow_range.txt = 'lo hi')
    try: PART_LO, PART_HI = [int(x) for x in open(os.path.join(HERE, VNAME + '_range.txt')).read().split()]
    except Exception: pass
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 24; sc.cycles.use_denoising = True; sc.cycles.use_adaptive_sampling = True
    _cp = bpy.context.preferences.addons['cycles'].preferences; _dev = 'CPU'
    for _t in ('OPTIX', 'CUDA'):
        try:
            _cp.compute_device_type = _t; _cp.get_devices()
            _g = [d for d in _cp.devices if d.type != 'CPU']
            if _g:
                for d in _cp.devices: d.use = d.type != 'CPU'
                sc.cycles.device = 'GPU'; _dev = _t + ' ' + ', '.join(d.name for d in _g); break
        except Exception as _e: log('device try failed', _t, _e)
    log('CYCLES DEVICE', _dev)
    r.resolution_x, r.resolution_y = 720, 1280; r.resolution_percentage = 100; r.use_persistent_data = True
try: sc.eevee.taa_render_samples = 12 if RUNMODE == 'stills' else 24
except Exception: pass
for attr, val in (('use_shadows', True), ('use_raytracing', True), ('shadow_ray_count', 1), ('use_gtao', True), ('use_fast_gi', True), ('use_bloom', False)):
    try: setattr(sc.eevee, attr, val)
    except Exception: pass
try: sc.view_settings.view_transform = 'Standard'
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
    r.image_settings.file_format = 'JPEG'; r.image_settings.quality = 88
    SD_ = os.path.join(HERE, VNAME + 'stills', RROUND); os.makedirs(SD_, exist_ok=True)
    PROG = os.path.join(HERE, VNAME + '_progress.txt')
    ONLY = open(os.path.join(HERE, VNAME + '_only.txt')).read().split() if os.path.exists(os.path.join(HERE, VNAME + '_only.txt')) else None
    for k, (n, a, b) in enumerate(shots):
        if ONLY and n not in ONLY: continue
        open(PROG, 'w').write('%d %d' % (k, len(shots)))
        f = int((a + (min(b, DUR) - a) * .55) * FPS) + 1
        sc.frame_set(f); r.filepath = os.path.join(SD_, '%02d_%s.jpg' % (k + 1, n)); bpy.ops.render.render(write_still=True)
    open(PROG, 'w').write('DONE'); log('STILLS DONE', round(time.time() - T0, 1), 's')
elif RUNMODE == 'video':
    r.image_settings.file_format = 'PNG'; FD = os.path.join(HERE, 'clipframes'); os.makedirs(FD, exist_ok=True); T_ = time.time()
    for f_ in [x for x in FRAMES if PART_LO <= x <= PART_HI]:
        if os.path.exists(os.path.join(FD, '%04d.png' % f_)): continue
        r.filepath = os.path.join(FD, '%04d.png' % f_); sc.frame_set(f_); bpy.ops.render.render(write_still=True)
        if f_ in (PART_LO, PART_LO + 1, PART_LO + 5) or f_ % 25 == 0: log('FRAME', f_, 'of', PART_HI, 'elapsed', round(time.time() - T_, 1))
    open(os.path.join(HERE, VNAME + '_progress.txt'), 'w').write('DONE'); log('VIDEO PART DONE')
elif RUNMODE == 'build':
    open(os.path.join(HERE, VNAME + '_progress.txt'), 'w').write('DONE'); log('BUILD ONLY DONE')
else:
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
