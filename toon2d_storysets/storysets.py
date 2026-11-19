"""Story sets for the Tuesday-king Short: calendar_hall, bedchamber."""
import math
import skia
from .paint import lin_grad, fill, stroke, ink, shade, path_poly, path_smooth, rrect, ellipse, rng
from . import textures as tx
from . import setkit as sk
from .light import MOODS, halo, god_rays
from .interiors import room_box
from .text import draw_text

NIGHT = ('night',)


def throne_room(mood, calendars='wall'):
    """Stone throne room. calendars='wall': a wall of TUE calendars; 'bare': they were burned (pale patches,
    nails, one surviving TUE calendar). Brazier on the right, throne on a dais under a crown banner. No clocks."""
    m = MOODS[mood]
    night = mood in NIGHT
    E = []
    back = (140, 120, 940, 1250)

    def hall(cv):
        stone = tx.stone_blocks(1200, 1600, bw=170, bh=95, base='#a8a4b4', seed=3)
        room_box(cv, back, back_tex=tx.stone_blocks(800, 1130, bw=150, bh=86, base='#b0acbc', seed=2),
                 left_tex=stone, right_tex=stone,
                 floor_tex=tx.checker_tiles(1400, 1400, size=200, c1='#8a8496', c2='#6a6478', gloss=True),
                 ceil_tex=tx.wood_planks(1400, 1000, plank=150, base='#6a4a3a', seed=4))
        # the royal decree banner behind the throne: NO TUESDAYS
        bn = path_poly([(430, 240), (650, 240), (650, 770), (540, 720), (430, 770)])
        cv.drawPath(bn, fill('#b8323a')); cv.drawPath(bn, ink(5))
        cv.drawLine(415, 240, 665, 240, stroke('#7a4a2a', 14))
        for yy in (262, 700):
            cv.drawLine(440, yy, 640, yy, stroke('#e6b43c', 6))
        cr = path_poly([(505, 360), (505, 300), (523, 326), (540, 288), (557, 326), (575, 300), (575, 360)])
        cv.drawPath(cr, fill('#e6b43c')); cv.drawPath(cr, ink(4))
        draw_text(cv, 'NO', 540, 470, 86, '#f8f0dc')
        draw_text(cv, 'TUES-', 540, 560, 50, '#f8f0dc')
        draw_text(cv, 'DAYS', 540, 630, 50, '#f8f0dc')
        # LEFT: the castle's one big calendar, a parchment week strip with TUE circled (burned in 'bare')
        if calendars == 'wall':
            sk.parchment(cv, 185, 300, 215, 420, ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'], size=34, circle=1, seed=4)
        else:
            cv.drawPath(rrect(185, 300, 215, 420, 6), fill('#c8c4d2', 0.9))          # pale patch where it hung
            cv.drawCircle(292, 262, 6, fill('#5a5466')); cv.drawCircle(292, 262, 6, ink(2))  # empty nail
            # ...and somebody nailed up a fresh notice anyway
            sk.parchment(cv, 200, 380, 185, 200, ['TUESDAY'], size=36, rod=False, seed=7)
            for nx in (216, 369):
                cv.drawCircle(nx, 394, 6, fill('#5a5466')); cv.drawCircle(nx, 394, 6, ink(2))
        # RIGHT: tall arched window onto the sky (follows the mood)
        wx0, wx1, wy0, wy1 = 695, 885, 250, 720
        win = skia.Path(); win.moveTo(wx0, wy1); win.lineTo(wx0, wy0 + 90); win.quadTo(wx0, wy0, (wx0 + wx1) / 2, wy0 - 30)
        win.quadTo(wx1, wy0, wx1, wy0 + 90); win.lineTo(wx1, wy1); win.close()
        top, mid_, bot = m['sky']
        pt = skia.Paint(AntiAlias=True); pt.setShader(lin_grad((0, wy0 - 30), (0, wy1), [top, mid_, bot]))
        cv.drawPath(win, pt)
        cv.save(); cv.clipPath(win, doAntiAlias=True)
        if night:
            cv.drawCircle(830, 360, 34, fill('#f4f0d8'))
            for k in range(10):
                cv.drawCircle(710 + (k * 53) % 170, 290 + (k * 71) % 380, 2.5, fill('#ffffff'))
        else:
            sk.cloud(cv, 760, 420, 120, '#ffffff', '#d8e4f4', seed=3)
        cv.restore()
        cv.drawLine((wx0 + wx1) / 2, wy0 - 30, (wx0 + wx1) / 2, wy1, stroke('#d0ccd8', 9))
        cv.drawLine(wx0, 480, wx1, 480, stroke('#d0ccd8', 9))
        cv.drawPath(win, stroke('#d0ccd8', 16)); cv.drawPath(win, ink(5))
        cv.drawPath(rrect(wx0 - 20, wy1, wx1 - wx0 + 40, 26, 6), fill('#b0acbc')); cv.drawPath(rrect(wx0 - 20, wy1, wx1 - wx0 + 40, 26, 6), ink(4))
        # dais + throne
        cv.drawPath(path_poly([(380, 1250), (700, 1250), (680, 1205), (400, 1205)]), fill('#8a8496')); cv.drawPath(path_poly([(380, 1250), (700, 1250), (680, 1205), (400, 1205)]), ink(4))
        th = path_poly([(455, 1205), (625, 1205), (625, 860), (600, 800), (480, 800), (455, 860)])
        cv.drawPath(th, fill('#7a4a2a')); cv.drawPath(th, ink(5))
        cv.drawPath(rrect(478, 840, 124, 230, 18), fill('#b8323a')); cv.drawPath(rrect(478, 840, 124, 230, 18), ink(4))
        cv.drawPath(rrect(470, 1080, 140, 46, 14), fill('#b8323a')); cv.drawPath(rrect(470, 1080, 140, 46, 14), ink(4))
        for px in (455, 625):
            cv.drawCircle(px, 805, 17, fill('#e6b43c')); cv.drawCircle(px, 805, 17, ink(4))
        # brazier on the right
        bx, by = 850, 1230
        legs = path_poly([(bx - 50, by), (bx - 35, by - 70), (bx + 35, by - 70), (bx + 50, by)])
        cv.drawPath(legs, stroke('#2a2232', 10))
        bowl = path_poly([(bx - 72, by - 120), (bx + 72, by - 120), (bx + 48, by - 60), (bx - 48, by - 60)])
        cv.drawPath(bowl, fill('#3a3038')); cv.drawPath(bowl, ink(5))
        fh = 1.0 if calendars == 'wall' else 0.6
        for k, c in enumerate(('#f8a030', '#f26a1b', '#ffd060')):
            fl = path_smooth([(bx - 54 + k * 8, by - 120), (bx - 30, by - 120 - (70 + k * 14) * fh), (bx, by - 120 - (140 - k * 30) * fh),
                              (bx + 30, by - 120 - (70 + k * 14) * fh), (bx + 54 - k * 8, by - 120)])
            cv.drawPath(fl, fill(c))
        if calendars == 'wall':
            # a rolled calendar burning in the fire
            cv.save(); cv.rotate(-25, bx, by - 150)
            cv.drawPath(rrect(bx - 45, by - 165, 90, 30, 14), fill('#efe2bf')); cv.drawPath(rrect(bx - 45, by - 165, 90, 30, 14), ink(3))
            cv.drawPath(ellipse(bx + 45, by - 150, 9, 15), fill('#d8c490')); cv.drawPath(ellipse(bx + 45, by - 150, 9, 15), ink(2.5))
            cv.restore()
            # wicker basket of rolled calendars waiting to be burned
            kx, ky = 720, 1240
            r2 = rng(12)
            for k in range(7):
                a_ = -40 + k * 13 + r2.uniform(-4, 4)
                cv.save(); cv.rotate(a_, kx, ky - 60)
                cv.drawPath(rrect(kx - 13, ky - 175, 26, 120, 12), fill('#efe2bf')); cv.drawPath(rrect(kx - 13, ky - 175, 26, 120, 12), ink(2.5))
                cv.drawPath(ellipse(kx, ky - 175, 13, 6), fill('#d8c490')); cv.drawPath(ellipse(kx, ky - 175, 13, 6), ink(2))
                cv.restore()
            bk = path_poly([(kx - 62, ky - 85), (kx + 62, ky - 85), (kx + 50, ky), (kx - 50, ky)])
            cv.drawPath(bk, fill('#b8864a'))
            for k in range(5):
                cv.drawLine(kx - 60 + k * 2.5, ky - 70 + k * 16, kx + 60 - k * 2.5, ky - 70 + k * 16, stroke('#8a5a2a', 4))
            cv.drawPath(bk, ink(4))
        else:
            for k in range(5):     # charred scroll ends in the ashes
                cv.drawPath(rrect(bx - 50 + k * 22, by - 128 - (k % 2) * 6, 26, 12, 6), fill('#3a3038'))
        E.append(dict(kind='lamp', pos=(bx, by - 190), r=140, lit=True, ground=None))
        for tx_ in (190, 890):
            ty = 640
            cv.drawPath(path_poly([(tx_ - 18, ty), (tx_ + 18, ty), (tx_ + 7, ty + 70), (tx_ - 7, ty + 70)]), fill('#5a4a3a')); cv.drawPath(path_poly([(tx_ - 18, ty), (tx_ + 18, ty), (tx_ + 7, ty + 70), (tx_ - 7, ty + 70)]), ink(3))
            cv.drawPath(path_smooth([(tx_ - 16, ty + 2), (tx_ - 9, ty - 36), (tx_, ty - 62), (tx_ + 9, ty - 36), (tx_ + 16, ty + 2)]), fill('#f8b040'))
            E.append(dict(kind='lamp', pos=(tx_, ty - 25), r=100, lit=True, ground=None))

    def near(cv):
        cv.drawPath(rrect(-200, -200, 230, 2600, 20), fill('#8a8696')); cv.drawPath(rrect(-200, -200, 230, 2600, 20), ink(6))
        cv.drawPath(rrect(1050, -200, 230, 2600, 20), fill('#8a8696')); cv.drawPath(rrect(1050, -200, 230, 2600, 20), ink(6))

    def lights(cv, mm):
        halo(cv, 850, 1080, 170, (255, 150, 70), 0.3)
        sk.draw_emitters(cv, [e for e in E if e['kind'] == 'lamp'], mm, night)

    return [('hall', 1.5, hall, dict(lights=lights)), ('near', 0.62, near, dict(blur=8))], dict(ground_y=1500, chair=(540, 1150))


def bedchamber(mood, day='MON'):
    """The king's bedroom: big bed (blanket in a near plane tucks the sleeper in), window to the sky, clock, calendar."""
    m = MOODS[mood]
    night = mood in NIGHT
    E = []
    back = (140, 120, 940, 1250)

    def room(cv):
        room_box(cv, back, back_tex=tx.wallpaper(800, 1130, base='#7a3a5a', motif='#e6c25a', stripe='#86466a'),
                 left_tex=tx.wallpaper(1200, 1600, base='#6a3050', motif='#e6c25a', stripe='#763a5a'),
                 right_tex=tx.wallpaper(1200, 1600, base='#6a3050', motif='#e6c25a', stripe='#763a5a'),
                 floor_tex=tx.wood_planks(1400, 1400, plank=160, base='#8a5a3a', seed=6),
                 ceil_tex=tx.wood_planks(1400, 1000, plank=150, base='#5a3a2a', seed=4))
        # arched window onto the sky
        wx, wy, ww, wh = 540, 170, 300, 430
        arch = path_poly([(wx - ww / 2, wy + wh), (wx - ww / 2, wy + 140), (wx - 100, wy + 30), (wx, wy), (wx + 100, wy + 30),
                          (wx + ww / 2, wy + 140), (wx + ww / 2, wy + wh)])
        cv.save(); cv.clipPath(arch, doAntiAlias=True)
        top, mid_, bot = m['sky']
        pt = skia.Paint(AntiAlias=True); pt.setShader(lin_grad((0, wy), (0, wy + wh), [top, mid_, bot]))
        cv.drawRect(skia.Rect.MakeLTRB(wx - ww, wy, wx + ww, wy + wh), pt)
        cv.restore()
        cv.drawPath(arch, stroke('#e8dcc0', 14)); cv.drawPath(arch, ink(5))
        cv.drawLine(wx, wy, wx, wy + wh, stroke('#e8dcc0', 8)); cv.drawLine(wx - ww / 2, wy + 260, wx + ww / 2, wy + 260, stroke('#e8dcc0', 8))
        if night:
            cv.drawCircle(wx + 60, wy + 120, 44, fill('#f4f0d8'))
            for k in range(9):
                cv.drawCircle(wx - 100 + (k * 61) % 200, wy + 90 + (k * 47) % 200, 3, fill('#ffffff'))
        else:
            cv.drawCircle(wx + 30, wy + 330, 70, fill('#ffe090'))
        E.append(dict(kind='rose', pos=(wx, wy + 200)))
        # clock and calendar (WED circled) above the bed
        sk.parchment(cv, 735, 280, 140, 170, [{'MON': 'MONDAY', 'TUE': 'TUESDAY', 'WED': 'WEDNESDAY'}.get(day, day)], size=24, seed=9)
    # The bed lives on planes right next to the actors (z 1.004 behind, 0.996 in front), so the sleeper stays
    # locked into it whatever the camera does. Bed spans x 330-750; people stand beside it, never in front.
    BX0, BX1 = 330, 750

    def bed(cv):
        # headboard
        hb = path_poly([(BX0 + 20, 1330), (BX0 + 20, 980), (BX0 + 60, 920), (BX1 - 60, 920), (BX1 - 20, 980), (BX1 - 20, 1330)])
        cv.drawPath(hb, fill('#6a3a22')); cv.drawPath(hb, ink(6))
        for k in range(1, 5):
            x = BX0 + 20 + k * (BX1 - BX0 - 40) / 5
            cv.drawLine(x, 960, x, 1320, stroke('#5a3018', 5))
        for px in (BX0 + 20, BX1 - 20):
            cv.drawPath(rrect(px - 18, 880, 36, 460, 12), fill('#7a4428')); cv.drawPath(rrect(px - 18, 880, 36, 460, 12), ink(5))
            cv.drawCircle(px, 872, 22, fill('#e6b43c')); cv.drawCircle(px, 872, 22, ink(4))
        # big pillow behind the head (wider than the head, so it reads as a pillow)
        # pillows rest on the mattress against the headboard, behind the sitter's shoulders
        for (px0, px1, py0) in ((BX0 + 40, 545, 1160), (535, BX1 - 40, 1165)):
            pl = path_smooth([(px0, 1285), (px0 + 6, py0 + 20), ((px0 + px1) / 2, py0), (px1 - 6, py0 + 20), (px1, 1285)])
            cv.drawPath(pl, fill('#f4ecd8')); cv.drawPath(pl, ink(5))
            cv.drawLine(px0 + 40, py0 + 40, px0 + 90, py0 + 55, stroke('#d8ccb4', 4))
        # nightstand with candle, right of the bed, standing on the floor
        cv.drawPath(rrect(780, 1300, 130, 230, 10), fill('#7a4a2a')); cv.drawPath(rrect(780, 1300, 130, 230, 10), ink(5))
        cv.drawLine(790, 1400, 900, 1400, stroke('#5a3018', 4))
        cv.drawCircle(845, 1455, 9, fill('#e6b43c'))
        cv.drawRect(skia.Rect.MakeXYWH(837, 1240, 16, 60), fill('#f4f0e8')); cv.drawRect(skia.Rect.MakeXYWH(837, 1240, 16, 60), ink(2.5))
        cv.drawPath(path_smooth([(838, 1242), (845, 1205), (852, 1242)]), fill('#ffb43c'))
        E.append(dict(kind='lamp', pos=(845, 1222), r=90, lit=True, ground=None))

    def blanket(cv):
        # quilt over the mattress, only as wide as the bed, with a footboard to the floor
        q = path_poly([(BX0 + 10, 1290), (BX1 - 10, 1290), (BX1 + 20, 1500), (BX0 - 20, 1500)])
        cv.drawPath(q, fill('#c8343c')); cv.drawPath(q, ink(6))
        for k in range(1, 6):
            t = k / 6
            cv.drawLine(BX0 + 10 + t * (BX1 - BX0 - 20), 1300, BX0 - 20 + t * (BX1 - BX0 + 40), 1495, stroke('#a02430', 5))
        cv.drawPath(rrect(BX0, 1270, BX1 - BX0, 48, 22), fill('#f4ecd8')); cv.drawPath(rrect(BX0, 1270, BX1 - BX0, 48, 22), ink(5))
        fb = rrect(BX0 - 30, 1490, BX1 - BX0 + 60, 70, 12)
        cv.drawPath(fb, fill('#6a3a22')); cv.drawPath(fb, ink(6))
        for px in (BX0 - 20, BX1 + 20):
            cv.drawPath(rrect(px - 16, 1440, 32, 150, 10), fill('#7a4428')); cv.drawPath(rrect(px - 16, 1440, 32, 150, 10), ink(5))

    def lights(cv, mm):
        if night:
            halo(cv, 845, 1222, 140, (255, 190, 100), 0.35)
        sk.draw_emitters(cv, [e for e in E if e['kind'] == 'lamp'], mm, night)

    return [('room', 1.5, room, dict()), ('bed', 1.004, bed, dict(lights=lights)), ('quilt', 0.996, blanket, dict())], \
        dict(ground_y=1560, chair=(540, 1150))


REGISTRY = {'throne_room': throne_room, 'bedchamber': bedchamber}
