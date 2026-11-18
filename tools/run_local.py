"""Run a video script in YOUR workspace with Blender-as-a-Python-module (no PC needed).

    pip install bpy --break-system-packages        # once (Blender 5.x as a module; Python 3.11+/3.13 wheels exist)
    python tools/run_local.py <work folder> <VNAME>

<work folder> must contain base_rig.blend, hero.json, faces2/ (folder or link), <VNAME>_v1.py, <VNAME>_mode.txt
(build | stills:rN) and, for lip sync, <VNAME>_vo16.wav (+ packs/ for imported avatars).
EEVEE renders on the CPU here (about 1-2 minutes per 1080x1920 still) - fine for checks, too slow for finals.
Read <work folder>/log_<VNAME>.txt for the engine log.
"""
import sys, os
def main():
    if len(sys.argv) < 3: print(__doc__); sys.exit(1)
    d, vn = os.path.abspath(sys.argv[1]), sys.argv[2]
    try:
        import bpy
    except ImportError:
        sys.exit('bpy is not installed: pip install bpy --break-system-packages')
    bpy.ops.wm.open_mainfile(filepath=os.path.join(d, 'base_rig.blend'))
    sys.argv = ['blender', '--', 'final']
    f = os.path.join(d, vn + '_v1.py')
    exec(compile(open(f, encoding='utf-8').read(), f, 'exec'), {'__file__': f, '__name__': '__main__'})
    print(open(os.path.join(d, 'log_%s.txt' % vn), encoding='utf-8').read()[-1500:])
if __name__ == '__main__':
    main()
