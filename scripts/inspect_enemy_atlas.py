"""Inspect original generated PNGs and write crop/pivot metadata; never repaint assets.
Requires Pillow. Example: python scripts/inspect_enemy_atlas.py --crawler file.png ...
"""
import argparse, json, shutil
from pathlib import Path
from PIL import Image

parser=argparse.ArgumentParser()
for name in ('crawler','specter','brute','boss'): parser.add_argument('--'+name,required=True)
args=parser.parse_args();root=Path(__file__).resolve().parents[1]
assets=[]
for kind,(name,height) in enumerate(zip(('crawler','specter','brute','boss'),(1.35,1.85,2.5,5.0))):
    source=Path(getattr(args,name));im=Image.open(source).convert('RGBA');width,total_height=im.size
    frames=[]
    for row in range(6):
        for col in range(6):
            left,top=round(col*width/6),round(row*total_height/6)
            right,bottom=round((col+1)*width/6),round((row+1)*total_height/6)
            alpha=im.getchannel('A').crop((left,top,right,bottom))
            # Match the renderer's alpha test, excluding faint generated background noise.
            mask=alpha.point(lambda a:255 if a>=110 else 0)
            pixels=mask.load();w,h=mask.size;seen=set();components=[]
            for y in range(h):
                for x in range(w):
                    if not pixels[x,y] or (x,y) in seen:continue
                    queue=[(x,y)];seen.add((x,y));component=[]
                    while queue:
                        qx,qy=queue.pop();component.append((qx,qy))
                        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                            nx,ny=qx+dx,qy+dy
                            if 0<=nx<w and 0<=ny<h and (nx,ny) not in seen and pixels[nx,ny]:
                                seen.add((nx,ny));queue.append((nx,ny))
                    components.append(component)
            assert components, f'Empty frame {name} {row} {col}'
            largest=max(map(len,components));body=[p for comp in components if len(comp)>=max(4,largest*.015) for p in comp]
            x0=max(0,min(p[0] for p in body)-2);y0=max(0,min(p[1] for p in body)-2)
            x1=min(w,max(p[0] for p in body)+3);y1=min(h,max(p[1] for p in body)+3)
            ground=max(p[1] for p in body)+1
            support=sorted(p[0] for p in body if p[1]>=ground-max(6,(y1-y0)*.12))
            pivot_x=support[len(support)//2]+.5
            frames.append({'rect':[left+x0,top+y0,x1-x0,y1-y0], 'pivot':[round(pivot_x-x0,2),ground-y0], 'duration':(.04 if col<4 else .18) if row==4 else .13,'row':row,'column':col})
    target=root/'public'/'enemies'/f'{name}.png'
    target.parent.mkdir(parents=True,exist_ok=True)
    if source.resolve()!=target.resolve():
        shutil.copyfile(source,target)
    assets.append({'id':name,'kind':kind,'url':f'/enemies/{name}.png','size':[width,total_height], 'worldHeight':height,'referenceHeight':frames[0]['rect'][3], 'frames':frames})
    print(name,len(frames),'frames',width,total_height)
(root/'src'/'enemy-frames.json').write_text(json.dumps(assets,indent=2)+'\n')
