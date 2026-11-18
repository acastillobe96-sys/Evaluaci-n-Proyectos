"""Descarga card, hero, galería y plantas de cada proyecto a raw-images/<slug>/ (sin procesar)."""
import json, os, subprocess, sys, time
raw, outdir, slugmap = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
d = json.load(open(raw, encoding='utf-8'))
for origen, p in d.items():
    slug = slugmap.get(origen, origen)
    jobs = [('card', p['card']), ('hero', p['hero'])]
    jobs += [(f'galeria-{i+1:02d}', u) for i, u in enumerate(p['galeria'])]
    jobs += [(f'planta-{i+1:02d}', t['planta']) for i, t in enumerate(p['tipologias']) if t['planta']]
    os.makedirs(f'{outdir}/{slug}', exist_ok=True)
    for name, url in jobs:
        if not url: continue
        ext = os.path.splitext(url)[1]
        dest = f'{outdir}/{slug}/{name}{ext}'
        if os.path.exists(dest) and os.path.getsize(dest) > 0: continue
        for t in range(5):
            r = subprocess.run(['curl', '-sS', '-f', '-A', 'Mozilla/5.0', '-o', dest, url])
            if r.returncode == 0: break
            time.sleep(2)
        else:
            print('FALLÓ', slug, name, url)
    print(slug, len(os.listdir(f'{outdir}/{slug}')))
