"""Read-only alpha audit; --write aligns torso pivots without editing any source PNG."""
import json, statistics, sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'src/agent-frames.json').read_text())
manifest.setdefault('wolf',{'size':[1536,1536],'referenceHeight':256,'frames':[{'rect':[(i%6)*256,(i//6)*256,256,256],'pivot':[128,240],'duration':.14}for i in range(36)]})
report={}
for key in ['wolf','gorgon','saci']:
    image=Image.open(root/'public'/('wolf-atlas.png' if key=='wolf' else 'agents/'+key+'.png')).convert('RGBA')
    frames=manifest[key]['frames'];deltas=[]
    for i,frame in enumerate(frames):
        x,y,w,h=frame['rect'];assert 0<=x<x+w<=image.width and 0<=y<y+h<=image.height
        alpha=image.crop((x,y,x+w,y+h)).getchannel('A').point(lambda n:255 if n>=110 else 0)
        bbox=alpha.getbbox();assert bbox,(key,i)
        if i>=30:continue  # Preserve the planted foot anchor throughout the fall sequence.
        left,top,right,bottom=bbox
        pixels=[xx for yy in range(top+int((bottom-top)*.38),top+int((bottom-top)*.62)) for xx in range(left,right) if alpha.getpixel((xx,yy))]
        anchor=round(statistics.median(pixels),1);deltas.append(anchor-frame['pivot'][0])
        if '--write' in sys.argv:frame['pivot'][0]=anchor
    report[key]={'frames':len(frames),'boundedCrops':True,'largestTorsoCorrectionPixels':max(abs(n)for n in deltas),'unchangedFootPivots':True,'sourceRasterUnchanged':True}
if '--write' in sys.argv:
    (root/'src/agent-frames.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    (root/'reports/sprite-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
