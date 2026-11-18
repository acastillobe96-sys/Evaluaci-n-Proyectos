"""Extrae datos de las fichas públicas de euroinmobiliaria.cl (HTML ya descargado).
Uso: python3 -I scripts/scrape_euro.py <dir_html> <listado.html> <salida.json>
"""
import html, json, re, sys

src_dir, listado, out = sys.argv[1:4]

def clean(t):
    t = re.sub(r'<br\s*/?>', ' ', t)
    t = re.sub(r'<[^>]+>', '', t)
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()

def attr_list(s, attr):
    return [clean(x) for x in re.findall(r'data-' + attr + r'[^>]*>(.*?)</', s, re.S)]

# Plusvalía desde el listado (solo como referencia; no se muestra en la card)
lst = open(listado, encoding='utf-8').read()
plus = {}
for m in re.finditer(r'href="https://euroinmobiliaria\.cl/proyectos/([a-z0-9-]+)"', lst):
    seg = lst[m.end():m.end() + 4000]
    p = re.search(r'Plusval[ií]a:\s*(\d+)%', seg)
    if p and m.group(1) not in plus:
        plus[m.group(1)] = int(p.group(1))
# imagen card del listado (main.webp) por slug
cards = {}
for m in re.finditer(r'(https://euroinmobiliaria\.cl/storage/\d+/conversions/[^"\')]+-main\.webp)', lst):
    seg = lst[m.end():m.end() + 3000]
    s2 = re.search(r'proyectos/([a-z0-9-]+)"', seg)
    if s2 and s2.group(1) not in cards:
        cards[s2.group(1)] = m.group(1)

data = {}
import os
for fn in sorted(os.listdir(src_dir)):
    slug = fn[:-5]
    s = open(os.path.join(src_dir, fn), encoding='utf-8').read()
    d = {'slugOrigen': slug}
    hero = re.search(r'id="inicio"[^>]*url\(\'([^\']+)\'', s)
    d['hero'] = hero.group(1) if hero else None
    d['card'] = cards.get(slug)
    d['nombre'] = clean(re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S).group(1))
    ben = re.search(r'id="beneficios"(.*?)</section>', s, re.S)
    d['beneficios'] = [clean(x) for x in re.findall(r'<div class="fs-xxl-5 fw-bold">(.*?)</div>', ben.group(1), re.S)] if ben else []
    info = re.search(r'id="informacion"(.*?)</section>', s, re.S).group(1)
    divs = [clean(x) for x in re.findall(r'<div>\s*([^<]+?)\s*</div>', info)]
    d['infoTextos'] = divs
    ent = re.search(r'class="badge fs-6[^"]*"[^>]*>(.*?)</a>', info, re.S)
    d['entregaTexto'] = clean(ent.group(1)) if ent else None
    desc = re.search(r'id="descripcion"(.*?)</section>', s, re.S).group(1)
    tit = re.search(r'<h2>(.*?)</h2>', desc, re.S)
    d['descTitulo'] = clean(tit.group(1)) if tit else None
    d['descParrafos'] = [c for c in (clean(x) for x in re.findall(r'<p[^>]*>(.*?)</p>', desc, re.S)) if c]
    gal = re.search(r'id="galeria"(.*?)</section>', s, re.S)
    d['galeria'] = list(dict.fromkeys(re.findall(r'href="([^"]+-galeria\.webp)"', gal.group(1)))) if gal else []
    mod = re.search(r'id="modelos"(.*?)</section>', s, re.S)
    tip = []
    if mod:
        m = mod.group(1)
        plantas = re.findall(r'<a href="([^"]+)"[^>]*data-modelo-planta', m)
        nombres = attr_list(m, 'modelo-nombre')
        subs_blocks = re.findall(r'data-modelo-subsidio>(.*?)</div>\s*(?=<div class="modelo-item|</div>)', m, re.S)
        valores = attr_list(m, 'modelo-valor')
        dorm = attr_list(m, 'modelo-dormitorios'); ban = attr_list(m, 'modelo-banos')
        su = attr_list(m, 'modelo-superficie-util'); st = attr_list(m, 'modelo-superficie-total')
        for i, n in enumerate(nombres):
            tip.append({
                'nombre': n,
                'subsidio': i < len(subs_blocks) and 'Subsidio a la tasa' in subs_blocks[i],
                'precioUF': int(valores[i].replace('UF', '').replace('.', '').strip()) if i < len(valores) and re.search(r'\d', valores[i]) else None,
                'dormitorios': dorm[i] if i < len(dorm) else None,
                'banos': ban[i] if i < len(ban) else None,
                'supUtil': su[i] if i < len(su) else None,
                'supTotal': st[i] if i < len(st) else None,
                'planta': plantas[i] if i < len(plantas) else None,
            })
    d['tipologias'] = tip
    bro = re.search(r'href="([^"]+\.pdf)"', s)
    d['brochure'] = bro.group(1) if bro else None
    ento = re.search(r'id="entorno"(.*?)</section>', s, re.S)
    poi = []
    if ento:
        for blk in re.findall(r'<h3>(.*?)</h3>\s*<ul[^>]*>(.*?)</ul>', ento.group(1), re.S):
            items = []
            for li in re.findall(r'<li[^>]*>(.*?)</li>', blk[1], re.S):
                n = re.search(r'<strong>(.*?)</strong>', li, re.S)
                sm = re.search(r'<small>(.*?)</small>', li, re.S)
                items.append({'nombre': clean(n.group(1)) if n else clean(li), 'detalle': clean(sm.group(1)) if sm else ''})
            poi.append({'categoria': clean(blk[0]), 'items': items})
    d['entorno'] = poi
    d['plusvalia'] = plus.get(slug)
    data[slug] = d

json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(data), 'fichas')
