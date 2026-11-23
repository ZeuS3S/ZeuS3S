# Pose l'emblème SNO sur la photo du sweat : déformation par les plis, ombrage du tissu, grain.
import sys,numpy as np
from PIL import Image,ImageFilter
src,logo,out=sys.argv[1:4]
S=1080;k=1.62
h=Image.open(src).convert('RGBA');h=h.resize((round(h.width*k),round(h.height*k)),Image.LANCZOS)
ox=(S-h.width)//2;oy=(S-h.height)//2+10
# fond studio clair + ombre portée douce
y,x=np.mgrid[0:S,0:S];d=np.hypot((x-S/2)/S,(y-S*.42)/S)
bg=np.clip(236-60*d,180,240)[...,None].repeat(3,2).astype(np.uint8)
can=Image.fromarray(bg).convert('RGBA')
sh=Image.new('RGBA',(S,S),(0,0,0,0));a=h.getchannel('A').point(lambda v:v*0.35)
sh.paste(Image.new('RGBA',h.size,(0,0,0,255)),(ox+8,oy+18),a);can=Image.alpha_composite(can,sh.filter(ImageFilter.GaussianBlur(22)))
can.alpha_composite(h,(ox,oy))
# luminance du tissu (zone poitrine) : sert à ombrer et déformer le logo
L=np.asarray(can.convert('L'),dtype=np.float32);Lb=np.asarray(Image.fromarray(L.astype(np.uint8)).filter(ImageFilter.GaussianBlur(14)),dtype=np.float32)
w=180;cx=ox+round(300*k);cy=oy+round(222*k)
lg=Image.open(logo).convert('RGBA').resize((w,w),Image.LANCZOS)
x0,y0=cx-w//2,cy-w//2
reg=Lb[y0:y0+w,x0:x0+w];gy,gx=[np.clip(g,-1.5,1.5) for g in np.gradient(reg)]
yy,xx=np.mgrid[0:w,0:w];sx=np.clip(xx+gx*0.8,0,w-1).astype(int);sy=np.clip(yy+gy*0.8,0,w-1).astype(int)
A=np.asarray(lg,dtype=np.float32)[sy,sx]
shade=np.clip(reg/np.median(reg),0.55,1.35)[...,None]
rng=np.random.default_rng(3);grain=1-0.10*rng.random((w,w,1))
rgb=np.clip(A[...,:3]*0.93*shade*grain,0,255)
alpha=A[...,3:]*0.94
p=Image.fromarray(np.concatenate([rgb,alpha],2).astype(np.uint8),'RGBA').filter(ImageFilter.GaussianBlur(0.5))
can.alpha_composite(p,(x0,y0));can.convert('RGB').save(out,quality=95)
print('ok',out)
