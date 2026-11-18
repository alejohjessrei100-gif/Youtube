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


def calendar_hall(mood):
    """Stone hall whose whole back wall is calendars and clocks, with a brazier for burning them."""
    m = MOODS[mood]
    E = []
    back = (140, 120, 940, 1250)

    def hall(cv):
        stone = tx.stone_blocks(1200, 1600, bw=170, bh=95, base='#a8a4b4', seed=3)
        room_box(cv, back, back_tex=tx.stone_blocks(800, 1130, bw=150, bh=86, base='#b0acbc', seed=2),
                 left_tex=stone, right_tex=stone,
                 floor_tex=tx.checker_tiles(1400, 1400, size=200, c1='#8a8496', c2='#6a6478', gloss=True),
                 ceil_tex=tx.wood_planks(1400, 1000, plank=150, base='#6a4a3a', seed=4))
        # wall of calendars: big red TUESDAY pages
        r = rng(9)
        cols, rows = 4, 3
        for j in range(rows):
            for i in range(cols):
                x = 190 + i * 185 + r.uniform(-6, 6)
                y = 190 + j * 235 + r.uniform(-6, 6)
                sk.calendar(cv, x, y, 140, 180, 'TUE', str(2 + j * 7 + i), red='#c8343c' if (i + j) % 2 else '#2f6a8a')
        # clocks along the lower wall
        for k, cx_ in enumerate((240, 420, 600, 780)):
            sk.wall_clock(cv, cx_, 960, 62 + (k % 2) * 8, 0)
        # throne
        th = path_poly([(450, 1250), (630, 1250), (630, 1060), (610, 1030), (470, 1030), (450, 1060)])
        cv.drawPath(th, fill('#7a4a2a')); cv.drawPath(th, ink(5))
        cv.drawPath(rrect(470, 1160, 140, 60, 16), fill('#c8343c')); cv.drawPath(rrect(470, 1160, 140, 60, 16), ink(4))
        # brazier (burning calendars) on the right
        bx, by = 850, 1230
        cv.drawPath(path_poly([(bx - 70, by - 100), (bx + 70, by - 100), (bx + 45, by), (bx - 45, by)]), fill('#3a3038'))
        cv.drawPath(path_poly([(bx - 70, by - 100), (bx + 70, by - 100), (bx + 45, by), (bx - 45, by)]), ink(5))
        for k, c in enumerate(('#f8a030', '#f26a1b', '#ffd060')):
            fl = path_smooth([(bx - 52 + k * 8, by - 100), (bx - 30, by - 180 - k * 14), (bx, by - 250 + k * 30),
                              (bx + 30, by - 180 - k * 14), (bx + 52 - k * 8, by - 100)])
            cv.drawPath(fl, fill(c))
        cv.drawPath(rrect(bx - 28, by - 140, 56, 70, 4), fill('#f8f4ec'))  # a calendar going up in flames
        draw_text(cv, 'TUE', bx, by - 100, 24, '#c8343c')
        E.append(dict(kind='lamp', pos=(bx, by - 170), r=300, lit=True, ground=None))
        for tx_ in (150, 930):
            cv.drawPath(path_poly([(tx_ - 20, 760), (tx_ + 20, 760), (tx_ + 8, 840), (tx_ - 8, 840)]), fill('#5a4a3a'))
            cv.drawPath(path_smooth([(tx_ - 18, 762), (tx_ - 10, 720), (tx_, 690), (tx_ + 10, 720), (tx_ + 18, 762)]), fill('#f8b040'))
            E.append(dict(kind='lamp', pos=(tx_, 735), r=240, lit=True, ground=None))

    def near(cv):
        cv.drawPath(rrect(-200, -200, 260, 2600, 20), fill('#8a8696')); cv.drawPath(rrect(-200, -200, 260, 2600, 20), ink(6))
        cv.drawPath(rrect(1020, -200, 260, 2600, 20), fill('#8a8696')); cv.drawPath(rrect(1020, -200, 260, 2600, 20), ink(6))

    def lights(cv, mm):
        halo(cv, 850, 1060, 300, (255, 150, 70), 0.35)
        sk.draw_emitters(cv, [e for e in E if e['kind'] == 'lamp'], mm, True)

    return [('hall', 1.5, hall, dict(lights=lights)), ('near', 0.62, near, dict(blur=8))], dict(ground_y=1500, chair=(540, 1150))


def bedchamber(mood):
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
        sk.wall_clock(cv, 270, 360, 70, 0)
        sk.calendar(cv, 740, 270, 130, 170, 'WED', '12', red='#2f8a5a')
        # bed: headboard, pillow, mattress base
        cv.drawPath(rrect(340, 760, 400, 520, 30), fill('#6a3a22')); cv.drawPath(rrect(340, 760, 400, 520, 30), ink(6))
        for k in range(4):
            cv.drawLine(380 + k * 90, 790, 380 + k * 90, 1250, stroke('#5a3018', 5))
        cv.drawPath(rrect(380, 990, 320, 90, 36), fill('#f4ecd8')); cv.drawPath(rrect(380, 990, 320, 90, 36), ink(5))
        # nightstand with candle
        cv.drawPath(rrect(760, 1040, 140, 210, 10), fill('#7a4a2a')); cv.drawPath(rrect(760, 1040, 140, 210, 10), ink(5))
        cv.drawRect(skia.Rect.MakeXYWH(822, 985, 16, 56), fill('#f4f0e8'))
        cv.drawPath(path_smooth([(824, 986), (830, 950), (836, 986)]), fill('#ffb43c'))
        E.append(dict(kind='lamp', pos=(830, 960), r=220, lit=True, ground=None))

    def blanket(cv):
        # near plane: big red quilt in front of the sleeper
        q = path_poly([(60, 1330), (1020, 1330), (1060, 2100), (20, 2100)])
        cv.drawPath(q, fill('#c8343c')); cv.drawPath(q, ink(6))
        for k in range(6):
            cv.drawLine(80 + k * 170, 1350, 60 + k * 190, 2100, stroke('#a02430', 5))
        cv.drawPath(rrect(60, 1310, 960, 70, 30), fill('#f4ecd8')); cv.drawPath(rrect(60, 1310, 960, 70, 30), ink(6))
        cv.drawPath(rrect(60, 1180, 40, 300, 16), fill('#6a3a22')); cv.drawPath(rrect(980, 1180, 40, 300, 16), fill('#6a3a22'))

    def lights(cv, mm):
        if night:
            halo(cv, 830, 960, 220, (255, 190, 100), 0.4)
        sk.draw_emitters(cv, [e for e in E if e['kind'] == 'lamp'], mm, True)

    return [('room', 1.5, room, dict(lights=lights)), ('quilt', 0.9, blanket, dict())], dict(ground_y=1500, chair=(540, 1150))


REGISTRY = {'calendar_hall': calendar_hall, 'bedchamber': bedchamber}
