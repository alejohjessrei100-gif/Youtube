# ===================================================== CAST LINEUP — every shipped avatar in packs/ side by side, labelled with its id
# assemble:  python tools/assemble.py lineup examples/cast_lineup_section.py --dur 1      then run it (any mode) -> cast_lineup.jpg
# Use in a video section: make_side('kid_b', '6', .9) puts avatar packs/c6 in the cast (scale ~.85 kid, 1.0 teen, 1.1 adult).
IDS = sorted([d[1:] for d in os.listdir(CHARDIR) if d.startswith('c') and os.path.exists(os.path.join(CHARDIR, d, d[1:] + '.obj'))], key=lambda x: int(x) if x.isdigit() else 999)
SP = 4.2
for k, cid in enumerate(IDS):
    c = make_side('p' + cid, cid, 1.0)
    x = -(k - (len(IDS) - 1) / 2) * SP      # camera looks along -Y, so negate to read left -> right
    bake_states(c, [ST(x, 0, 0., alive(tsec(f), .5, k), None) for f in FRAMES])
    label(cid, (x, 1.0, 6.75), .9, (.1, .15, .3), rot=(90, 0, 180))
bake_states(CH['hero'], [(0., -900., -80., 0., {}, None, 0.) for f in FRAMES])
box('lu_floor', (200, 60, .2), (0, 0, -.1), mat('lu_floor', (.86, .88, .92), .7))
box('lu_wall', (200, .4, 40), (0, -6, 20), mat('lu_wall', (.6, .76, .98), .9))
SUN = light('sun', 'SUN', (0, 0, 40), 2.2, (1, .95, .86), 1); SUN.rotation_mode = 'QUATERNION'
SUN.rotation_quaternion = Vector((.4, -.6, -.7)).normalized().to_track_quat('-Z', 'Y')
light('key', 'AREA', (0, 14, 12), 9000, (1, .97, .92), 40., (-55, 0, 180))
camd = bpy.data.cameras.new('Cam'); camd.type = 'ORTHO'; camd.ortho_scale = len(IDS) * SP + 2
cam = bpy.data.objects.new('Cam', camd); COL.objects.link(cam); sc.camera = cam
cam.location = (0, 30, 3.6); cam.rotation_euler = (math.radians(90), 0, math.radians(180))
r = sc.render
for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try: r.engine = eng; break
    except Exception: pass
r.resolution_x = 2800; r.resolution_y = int(2800 * 8.0 / camd.ortho_scale); r.resolution_percentage = 100
try: sc.view_settings.view_transform = 'Standard'
except Exception: pass
sc.view_settings.exposure = -.62
try: r.image_settings.media_type = 'IMAGE'
except Exception: pass
r.image_settings.file_format = 'JPEG'; r.image_settings.quality = 90
sc.frame_set(1); r.filepath = os.path.join(HERE, 'cast_lineup.jpg'); bpy.ops.render.render(write_still=True)
open(os.path.join(HERE, VNAME + '_progress.txt'), 'w').write('DONE'); log('LINEUP DONE', IDS)
