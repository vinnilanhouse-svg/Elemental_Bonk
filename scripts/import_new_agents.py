"""Import prepared atlas PNGs unchanged and calculate bounded per-pose UV/pivot metadata.
Usage: python scripts/import_new_agents.py construct=path curupira=path ...
"""
from pathlib import Path
import json, shutil, statistics, sys
from PIL import Image
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'src/agent-frames.json').read_text())
report={}
for arg in sys.argv[1:]:
    name, source=arg.split('=',1)
    assert name in ('construct','curupira','vampire','mummy','fairy')
    im=Image.open(source).convert('RGBA'); frames=[]
    for row in range(6):
        for col in range(6):
            left, top=round(col*im.width/6), round(row*im.height/6)
            right, bottom=round((col+1)*im.width/6),round((row+1)*im.height/6)
            alpha=im.getchannel('A').crop((left,top,right,bottom)).point(lambda a:255 if a>=110 else 0)
            pix=alpha.load(); w,h=alpha.size; seen=set(); components=[]
            for y in range(h):
                for x in range(w):
                    if not pix[x,y] or (x,y) in seen: continue
                    queue=[(x,y)];seen.add((x,y)); comp=[]
                    while queue:
                        qx,qy=queue.pop();comp.append((qx,qy))
                        for dx,dy in ((-1,0),(1,0),(0,-1),(0,1)):
                            nx,ny=qx+dx,qy+dy
                            if 0<=nx<w and 0<=ny<h and pix[nx,ny] and (nx,ny) not in seen:
                                seen.add((nx,ny));queue.append((nx,ny))
                    components.append(comp)
            assert components,(name,row,col)
            largest=max(len(c) for c in components)
            body=[p for c in components if len(c)>=max(30,largest*.015) for p in c]
            x0=max(0,min(p[0]for p in body)-1);x1=min(w,max(p[0]for p in body)+2)
            y0=max(0,min(p[1]for p in body)-1);y1=min(h,max(p[1]for p in body)+2)
            torso=[x for x,y in body if y0+(y1-y0)*.38<=y<=y0+(y1-y0)*.62]
            anchor=statistics.median(torso or [x for x,y in body])
            frames.append({'rect':[left+x0,top+y0,x1-x0,y1-y0],'pivot':[round(anchor-x0,1),y1-y0-1],'duration':.14})
    manifest[name]={'size':list(im.size),'referenceHeight':frames[0]['rect'][3],'frames':frames}
    dest=root/'public/agents'/f'{name}.png';shutil.copyfile(source,dest)
    report[name]={'source':source,'atlas':str(dest.relative_to(root)),'frames':36,'size':list(im.size),'bounded':True,'pngCopiedUnchanged':True}
(root/'src/agent-frames.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(root/'reports/new-agent-atlases.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,indent=2))
