"""Generador de evaluaciones sobre la Base (edición XML directa).
Uso: python3 gen.py config.json
"""
import re, zipfile, json, sys
from PIL import Image

cfg = json.load(open(sys.argv[1]))
zin = zipfile.ZipFile(cfg['base'])
F = {i.filename: zin.read(i.filename) for i in zin.infolist()}
G = lambda k: F[k].decode()

# ---------- mapa hoja -> archivo y drawing de imagen
wb = G('xl/workbook.xml'); rel = G('xl/_rels/workbook.xml.rels')
rid = {}
for m in re.finditer(r'<Relationship [^>]*>', rel):
    t = m.group(0); rid[re.search(r'Id="([^"]+)"', t).group(1)] = re.search(r'Target="([^"]+)"', t).group(1)
SHEET = {n: 'xl/' + rid[r].lstrip('/').replace('xl/', '') for n, r in re.findall(r'<sheet name="([^"]*)"[^>]*r:id="(rId\d+)"', wb)}
def drawing_of(sheet):
    f = SHEET[sheet]; r = f.replace('worksheets/', 'worksheets/_rels/') + '.rels'
    return re.findall(r'drawings/(drawing\d+)\.xml', G(r))[0]

# ---------- shared strings
ss = G('xl/sharedStrings.xml'); N0 = int(re.search(r'uniqueCount="(\d+)"', ss).group(1)); new = []
def S(t):
    t = t.replace('&', '&amp;').replace('<', '&lt;')
    if t in new: return N0 + new.index(t)
    new.append(t); return N0 + len(new) - 1

def setc(xml, ref, val, style=None):
    pat = re.compile(r'<c r="%s"( [^>]*?)?(/>|>.*?</c>)' % ref, re.S); m = pat.search(xml); assert m, ref
    attrs = re.sub(r'\s*t="[^"]*"', '', m.group(1) or '')
    if val is None: n = '<c r="%s"%s/>' % (ref, attrs)
    elif isinstance(val, str): n = '<c r="%s"%s t="s"><v>%d</v></c>' % (ref, attrs, S(val))
    else: n = '<c r="%s"%s><v>%s</v></c>' % (ref, attrs, val)
    return xml[:m.start()] + n + xml[m.end():]

etapas = cfg['etapas']; ne = len(etapas)
pr = json.load(open(cfg['precios'])) if cfg.get('precios') else None
fut = lambda k: pr['futura|' + k]['ufm2']
U = {}
if pr:
    for fila, cat in cfg['precio_filas'].items():
        fila = int(fila)
        if cat == 'BLANK': U[fila] = None
        elif cat == '2D1B-4c': U[fila] = round(fut('2D1B') - 1, 1)
        elif cat == '2D1B-3c': U[fila] = round(fut('2D1B') + 1, 1)
        else: U[fila] = fut(cat)
else:
    U = {int(f): None for f in cfg['precio_filas']}

# ---------- Planilla E1
k = SHEET['E1 Planilla']; p = G(k)
p = setc(p, 'G5', cfg['nombre']); p = setc(p, 'H8', 1)
for i, r in enumerate([27, 28, 29, 30]): p = setc(p, 'N%d' % r, 1 if i < ne else 0)
F[k] = p.encode()

# ---------- Fichas
for i, E in enumerate(etapas):
    k = SHEET['E%d Ficha' % (i + 1)]; f = G(k)
    for r, v in E['sup'].items(): f = setc(f, 'C' + r, v)
    for r in range(43, 53):
        a, q = E['tip'].get(str(r), (0, 0)); f = setc(f, 'F%d' % r, a); f = setc(f, 'G%d' % r, q)
    for r, lab in E.get('labels', {}).items(): f = setc(f, 'E' + r, lab)
    for r, v in U.items(): f = setc(f, 'U%d' % r, v)
    for r, v in E['est'].items(): f = setc(f, 'H' + r, v)
    F[k] = f.encode()

# ---------- Configuración + visibilidad (igual que la macro)
k = SHEET['Configuración']; F[k] = setc(G(k), 'D5', ne).encode()
w = G('xl/workbook.xml')
def vis(name, show):
    global w
    m = re.search(r'<sheet name="%s"[^>]*/>' % re.escape(name), w); t = m.group(0)
    t2 = re.sub(r' state="hidden"', '', t)
    if not show: t2 = t2.replace('<sheet name=', '<sheet state="hidden" name=', 1) if False else t2.replace(' sheetId=', ' state="hidden" sheetId=', 1)
    w = w.replace(t, t2)
for e in (2, 3, 4):
    for s in ('Planilla', 'Ficha', 'Datos', 'Curva', 'Flujo'): vis('E%d %s' % (e, s), e <= ne)
for s in ('Flujo Consolidado', 'Planilla Consolidada'): vis(s, ne > 1)
w = re.sub(r'<calcPr([^>]*?)(\s*fullCalcOnLoad="1")?\s*/>', lambda m: '<calcPr%s fullCalcOnLoad="1"/>' % m.group(1), w, 1)
F['xl/workbook.xml'] = w.encode()

# ---------- Mcdo
if pr:
    st = G('xl/styles.xml')
    def add(tag, xml):
        global st
        m = re.search(r'<%s count="(\d+)"' % tag, st); n = int(m.group(1))
        st = st.replace(m.group(0), '<%s count="%d"' % (tag, n + 1), 1)
        st = st.replace('</%s>' % tag, xml + '</%s>' % tag, 1); return n
    fnt = lambda b, i, sz, col: '<font>%s%s<sz val="%d"/><color %s/><name val="Calibri"/><family val="2"/></font>' % ('<b/>' if b else '', '<i/>' if i else '', sz, col)
    fT = add('fonts', fnt(1, 0, 14, 'rgb="FF1F3864"')); fN = add('fonts', fnt(0, 1, 9, 'rgb="FF595959"'))
    fH = add('fonts', fnt(1, 0, 10, 'rgb="FFFFFFFF"')); fB = add('fonts', fnt(0, 0, 10, 'theme="1"'))
    fS = add('fonts', fnt(1, 0, 11, 'rgb="FF1F3864"')); fK = add('fonts', fnt(1, 0, 10, 'theme="1"'))
    flH = add('fills', '<fill><patternFill patternType="solid"><fgColor rgb="FF1F3864"/><bgColor indexed="64"/></patternFill></fill>')
    flK = add('fills', '<fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill>')
    bd = add('borders', '<border>' + ''.join('<%s style="thin"><color rgb="FFBFBFBF"/></%s>' % (s, s) for s in ('left', 'right', 'top', 'bottom')) + '<diagonal/></border>')
    ids = [int(x) for x in re.findall(r'numFmtId="(\d+)"', st)]; n1, n2 = max(ids + [200]) + 1, max(ids + [200]) + 2
    m = re.search(r'<numFmts count="(\d+)"', st)
    st = st.replace(m.group(0), '<numFmts count="%d"' % (int(m.group(1)) + 2), 1)
    st = st.replace('</numFmts>', '<numFmt numFmtId="%d" formatCode="#,##0.0"/><numFmt numFmtId="%d" formatCode="#,##0.00"/></numFmts>' % (n1, n2), 1)
    def xf(font, fill=0, border=0, fmt=0, h=None, wrap=False):
        al = '' if not h and not wrap else '<alignment%s%s vertical="center"/>' % (' horizontal="%s"' % h if h else '', ' wrapText="1"' if wrap else '')
        return add('cellXfs', '<xf numFmtId="%d" fontId="%d" fillId="%d" borderId="%d" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">%s</xf>' % (fmt, font, fill, border, al))
    X = dict(T=xf(fT), N=xf(fN), Sub=xf(fS), H=xf(fH, flH, bd, 0, 'center', True), Txt=xf(fB, 0, bd, 0, 'left'),
             Int=xf(fB, 0, bd, 1, 'center'), D1=xf(fB, 0, bd, n1, 'right'), D2=xf(fB, 0, bd, n2, 'right'),
             P0=xf(fB, 0, bd, 3, 'right'), K=xf(fK, flK, bd, n1, 'center'))
    F['xl/styles.xml'] = st.encode()
    cols = list('UVWXYZ') + ['A' + c for c in 'ABCDEF']; rows = {}
    def put(r, ci, val, sty):
        ref = '%s%d' % (cols[ci], r)
        if val is None: val = 's/d'
        if isinstance(val, str): c = '<c r="%s" s="%d" t="s"><v>%d</v></c>' % (ref, sty, S(val))
        else: c = '<c r="%s" s="%d"><v>%s</v></c>' % (ref, sty, val)
        rows.setdefault(r, []).append(c)
    L = cfg['loc']
    put(2, 0, 'Respaldo de precios – ' + cfg['nombre'], X['T'])
    put(3, 0, 'Ubicación de referencia: %s (%.4f, %.4f). Fuente: base Inciti (Mcdo Nuevo Consolidado may-jun), periodo %s.' % (L['ref'], L['lat'], L['lon'], L['periodo']), X['N'])
    put(4, 0, 'Criterio: radio desde 1 km, ampliando de a 1 km hasta reunir ≥5 proyectos por tipología (tope 5 km). 2+1 (4c) = promedio 2D1B − 1; 2+1 (3c) = promedio 2D1B + 1.', X['N'])
    if cfg.get('nota_etapas'): put(5, 0, cfg['nota_etapas'], X['N'])
    hdr = ['Tipología Ficha', 'Fila', 'Categoría Inciti', 'Radio (km)', 'N° proyectos', 'm² útil prom.', 'Precio prom. (UF)', 'UF/m² prom.']
    r = 7
    for tipo, tit in [('futura', 'Tabla 1 – Entrega futura (venta en blanco / verde) · usada para fijar precios'), ('inmediata', 'Tabla 2 – Entrega inmediata · solo referencia')]:
        put(r, 0, tit, X['Sub']); r += 1
        for i, t in enumerate(hdr + (['UF/m² asignado (col. U)'] if tipo == 'futura' else [])): put(r, i, t, X['H'])
        r += 1
        for nom, fila, cat in cfg['lineas']:
            d = pr[tipo + '|' + cat]
            put(r, 0, nom, X['Txt']); put(r, 1, fila, X['Int']); put(r, 2, cat, X['Txt']); put(r, 3, d['radio'], X['Int']); put(r, 4, d['n'], X['Int'])
            put(r, 5, d['m2'], X['D2']); put(r, 6, d['precio'], X['P0']); put(r, 7, d['ufm2'], X['D1'])
            if tipo == 'futura': put(r, 8, U.get(fila), X['K'])
            r += 1
        r += 1
    put(r, 0, 'Proyectos comparables usados (entrega futura):', X['Sub']); r += 1
    for cat in dict.fromkeys(c for _, _, c in cfg['lineas']):
        d = pr['futura|' + cat]; put(r, 0, '%s (%d km): %s' % (cat, d['radio'], ', '.join(d['proyectos'])), X['N']); r += 1
    sd = '<sheetData>' + ''.join('<row r="%d">%s</row>' % (k_, ''.join(v)) for k_, v in sorted(rows.items())) + '</sheetData>'
    colsxml = '<cols>' + ''.join('<col min="%d" max="%d" width="%d" customWidth="1"/>' % (21 + i, 21 + i, wd) for i, wd in enumerate([24, 6, 14, 10, 11, 13, 15, 12, 20])) + '</cols>'
    k = SHEET['Mcdo']
    F[k] = G(k).replace('<sheetData/>', colsxml + sd).replace('<dimension ref="A1"/>', '<dimension ref="U2:AC%d"/>' % r).encode()

# ---------- shared strings write
ss = ss.replace('uniqueCount="%d"' % N0, 'uniqueCount="%d"' % (N0 + len(new)))
cnt = int(re.search(r' count="(\d+)"', ss).group(1)); ss = ss.replace(' count="%d"' % cnt, ' count="%d"' % (cnt + len(new) + 50), 1)
F['xl/sharedStrings.xml'] = ss.replace('</sst>', ''.join('<si><t xml:space="preserve">%s</t></si>' % t for t in new) + '</sst>').encode()

# ---------- imágenes de cabida (una por etapa)
existing = [int(x) for x in re.findall(r'xl/media/image(\d+)\.', ' '.join(F))]; nxt = max(existing) + 1
newmedia = {}
for i, E in enumerate(etapas):
    dn = drawing_of('E%d Ficha' % (i + 1)); img = 'image%d.png' % (nxt + i)
    newmedia['xl/media/' + img] = open(E['imagen'], 'rb').read()
    W, H = Image.open(E['imagen']).size; cx = 12222224; cy = round(cx * H / W)
    rk = 'xl/drawings/_rels/%s.xml.rels' % dn
    F[rk] = re.sub(rb'media/image\d+\.\w+', ('media/' + img).encode(), F[rk])
    d = G('xl/drawings/%s.xml' % dn)
    d = d.replace('<xdr:twoCellAnchor editAs="oneCell">', '<xdr:oneCellAnchor>').replace('</xdr:twoCellAnchor>', '</xdr:oneCellAnchor>')
    d = re.sub(r'<xdr:to>.*?</xdr:to>', '<xdr:ext cx="%d" cy="%d"/>' % (cx, cy), d, flags=re.S)
    d = re.sub(r'<a:ext cx="\d+" cy="\d+"/>', '<a:ext cx="%d" cy="%d"/>' % (cx, cy), d)
    F['xl/drawings/%s.xml' % dn] = d.encode()

with zipfile.ZipFile(cfg['out'], 'w', zipfile.ZIP_DEFLATED) as z:
    for i in zin.infolist(): z.writestr(i, F[i.filename], compress_type=zipfile.ZIP_DEFLATED)
    for k_, v in newmedia.items(): z.writestr(k_, v)
print('ok', cfg['out'], U)
