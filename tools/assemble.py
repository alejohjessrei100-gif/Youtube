"""Glue the engine + one video section into the runnable Blender script.

    python tools/assemble.py <VNAME> <section.py> [--dur 43.11 | --vo <VNAME>_vo_clean.wav] [--out <VNAME>_v1.py]

* <VNAME>  short lowercase prefix for every file of this video (food, baby, uncle ...)
* DUR      the cleaned voice-over length in seconds (read from the wav when --vo is given)
The output file goes next to base_rig.blend on the PC (the RobloxAnim folder) and is what the queue job runs.
"""
import os, re, sys, wave, hashlib

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAIL = """
except Exception:
    log('ERROR:\\n' + traceback.format_exc())
    try: open(os.path.join(HERE, VNAME + '_progress.txt'), 'w').write('DONE')
    except Exception: pass
"""

def main():
    a = sys.argv[1:]
    if len(a) < 2: print(__doc__); sys.exit(1)
    vname, sec = a[0], a[1]
    dur = None; out = None
    if '--dur' in a: dur = float(a[a.index('--dur') + 1])
    if '--vo' in a:
        w = wave.open(a[a.index('--vo') + 1]); dur = round(w.getnframes() / w.getframerate(), 3); w.close()
    if '--out' in a: out = a[a.index('--out') + 1]
    if dur is None: print('need --dur or --vo'); sys.exit(1)
    lib = open(os.path.join(KIT, 'engine', 'anim_kit.py'), encoding='utf-8').read()
    lib = lib.replace('__VNAME__', vname).replace('__DUR__', '%.3f' % dur)
    body = open(sec, encoding='utf-8').read()
    if re.search(r'skies_mark\s*=|def\s+skies_mark|skies_tag|SKIES_TXT|_sk_\w+\s*=', body):
        print('the section must not touch the kit tag (skies_mark / skies_tag / SKIES_TXT)'); sys.exit(1)
    bl = body.split('\n')
    k = next((i for i, l in enumerate(bl) if 'bpy.ops.render.render(' in l or 'save_as_mainfile(' in l), None)
    if k is None:
        print('no render call found in the section (bpy.ops.render.render / save_as_mainfile)'); sys.exit(1)
    while k > 0 and (bl[k][:1] in (' ', '\t') or not bl[k].strip()): k -= 1     # climb to the top-level statement holding it
    if os.path.exists(os.path.join(KIT, 'OWNER_PERMISSION.txt')):
        print('OWNER_PERMISSION.txt found: building WITHOUT the Skies stamp (owner allowed it, see that file)')
    else:
        bl.insert(k, 'skies_mark()          # kit tag: the hidden "Skies" stamp (required, do not remove)')
    body = '\n'.join(bl)
    ind = '\n'.join(('    ' + l) if l.strip() else '' for l in body.split('\n'))
    src = lib + '\n    # ===================================================== VIDEO SECTION: %s\n' % vname + ind + '\n' + TAIL
    compile(src, vname + '_v1.py', 'exec')            # syntax check before it ever reaches the PC
    out = out or os.path.join(os.getcwd(), vname + '_v1.py')
    open(out, 'w', encoding='utf-8').write(src)
    print('wrote', out, 'DUR', dur, 'lines', src.count('\n'), 'md5', hashlib.md5(src.encode('utf-8')).hexdigest())

if __name__ == '__main__':
    main()
