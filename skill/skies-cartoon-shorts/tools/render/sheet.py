import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
out=sys.argv[1]; dirs=sys.argv[2:]
fs=sorted([f for d in dirs for f in glob.glob(d+'/f_*.png')], key=lambda f:int(os.path.basename(f)[2:7]))
ims=[Image.open(f).convert('RGB') for f in fs]
w,h=ims[0].size; tw=int(sys.argv[0:1] and 300); th=int(h*tw/w); cols=8; rows=(len(ims)+cols-1)//cols
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18)
S=Image.new('RGB',(cols*tw,rows*(th+28)),'white'); d=ImageDraw.Draw(S)
for i,(f,im) in enumerate(zip(fs,ims)):
    fr=int(os.path.basename(f)[2:7]); x=(i%cols)*tw; y=(i//cols)*(th+28)
    S.paste(im.resize((tw,th)),(x,y+28)); d.text((x+6,y+4),"%d  (%.1fs)"%(i+1,fr/30),fill='black',font=F)
S.save(out,quality=86); print(len(fs))
