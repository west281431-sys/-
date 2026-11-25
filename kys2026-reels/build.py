# Компьютерде іске қосылады: python3 build.py FFMPEG SRC_DIR OUT.mp4
# timeline.json бойынша кадрларды кесіп, түсін түзеп, оверлей + дыбыспен біріктіреді.
import json, os, subprocess, sys
FF, SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'timeline.json')))
work = os.path.join(HERE, 'clips'); os.makedirs(work, exist_ok=True)

ZOOM = {'6_beineu.mov': 1.24}  # Бейнеу видеосындағы жоғарғы логотиптер кесілсін
GRADE = 'eq=contrast=1.08:saturation=0.86:brightness=-0.015,colorbalance=bs=0.07:bm=0.03:rs=-0.02:rh=0.02'
lst = []; k = 0
for r in T['regions']:
    for (tin, d, tag) in r['shots']:
        z = ZOOM.get(r['key'], 1.12)
        W, H = int(1080 * z) // 2 * 2, int(1920 * z) // 2 * 2
        dirx = 1 if k % 2 == 0 else -1
        vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,"
              f"crop=1080:1920:x='(iw-1080)/2+{dirx}*(iw-1080)/2*0.7*(t/{d}-0.5)':y='(ih-1920)/2',"
              f"setsar=1,fps=30,{GRADE},format=yuv420p")
        out = os.path.join(work, f'{k:03d}.mp4')
        if not os.path.exists(out):
            subprocess.run([FF, '-v', 'error', '-y', '-ss', str(tin), '-i', os.path.join(SRC, r['key']), '-t', str(d),
                            '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '14', '-r', '30', out], check=True)
        lst.append(out); k += 1
        print('shot', k, r['n1'], tin, d, flush=True)

# финал үшін қара кадр (оверлей өзі толық жабады)
fin_d = T['dur'] - T['finale']
blk = os.path.join(work, 'black.mp4')
subprocess.run([FF, '-v', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=black:s=1080x1920:r=30:d={fin_d}',
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '14', '-pix_fmt', 'yuv420p', blk], check=True)
lst.append(blk)
with open(os.path.join(work, 'list.txt'), 'w') as f:
    for p in lst: f.write(f"file '{p}'\n")
base = os.path.join(work, 'base.mp4')
subprocess.run([FF, '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', os.path.join(work, 'list.txt'), '-c', 'copy', base], check=True)

subprocess.run([FF, '-v', 'error', '-y', '-i', base, '-c:v', 'libvpx-vp9', '-i', os.path.join(HERE, 'overlay.webm'),
                '-i', os.path.join(HERE, 'audio.m4a'),
                '-filter_complex', "[0:v]noise=alls=5:allf=t,vignette=PI/5[bg];[bg][1:v]overlay=format=auto,format=yuv420p[v]",
                '-map', '[v]', '-map', '2:a', '-t', str(T['dur']),
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-profile:v', 'high', '-r', '30',
                '-c:a', 'copy', '-movflags', '+faststart', OUT], check=True)
print('READY', OUT)
