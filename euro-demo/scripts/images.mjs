// Optimiza las imágenes descargadas de euroinmobiliaria.cl.
// Uso: node scripts/images.mjs <dir_imagenes_crudas>
// Salida: public/proyectos/<slug>/*.{avif,webp} + data/fuentes/medios.json
import sharp from 'sharp';
import { readdirSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAW = process.argv[2];
if (!RAW) throw new Error('Falta el directorio de imágenes crudas');
const alts = existsSync('data/fuentes/alt.json') ? JSON.parse(readFileSync('data/fuentes/alt.json', 'utf8')) : {};
const tabla = JSON.parse(readFileSync('data/proyectos.json', 'utf8')).proyectos;

// tipo → { relación de aspecto (null = original), anchos, formatos }
const PERFILES = {
  card: { ratio: 16 / 10, anchos: [480, 800, 1200], formatos: ['avif', 'webp'] },
  hero: { ratio: null, anchos: [960, 1440, 1920], formatos: ['avif', 'webp'] },
  galeria: { ratio: null, anchos: [640, 1280], formatos: ['webp'] },
  planta: { ratio: null, anchos: [800, 1600], formatos: ['webp'] },
};

async function procesar(src, destDir, nombre, perfil) {
  const meta = await sharp(src).metadata();
  let base = sharp(src).rotate();
  let w = meta.width, h = meta.height;
  if (perfil.ratio) {
    // recorte centrado a 16:10 usando "attention" para conservar la zona con más detalle
    const target = Math.min(w, Math.round(h * perfil.ratio));
    h = Math.round(target / perfil.ratio); w = target;
    base = base.resize(w, h, { fit: 'cover', position: sharp.strategy.attention });
    base = sharp(await base.toBuffer());
  }
  const anchos = perfil.anchos.filter((a) => a <= w);
  if (!anchos.length) anchos.push(w);
  for (const a of anchos) for (const f of perfil.formatos) {
    const out = join(destDir, `${nombre}-${a}.${f}`);
    if (existsSync(out)) continue;
    const img = base.clone().resize({ width: a });
    await (f === 'avif' ? img.avif({ quality: 52, effort: 4 }) : img.webp({ quality: 74 })).toFile(out);
  }
  return { w, h, anchos: [...new Set(anchos)].sort((x, y) => x - y), formatos: perfil.formatos };
}

const medios = {};
for (const p of tabla) {
  const dir = join(RAW, p.slug);
  if (!existsSync(dir)) { console.log('sin imágenes', p.slug); continue; }
  const dest = join('public', 'proyectos', p.slug);
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(dir).sort();
  const a = alts[p.slug] ?? {};
  const m = { card: null, hero: null, galeria: [], plantas: [] };
  // La card usa la foto de fachada de la galería (16:10 natural); el "main" del sitio es un banner 2,5:1
  // con el edificio a un costado, que recortado a 16:10 pierde el edificio.
  const cardDesde = a._card ?? 'galeria-01';
  const fuenteCard = files.find((f) => f.startsWith(cardDesde + '.'));
  if (fuenteCard) {
    const r = await procesar(join(dir, fuenteCard), dest, 'card', PERFILES.card);
    m.card = { src: `/proyectos/${p.slug}/card`, ...r, alt: a.card ?? `Edificio ${p.nombre}, ${p.comuna}` };
  }
  for (const f of files) {
    const name = f.replace(/\.\w+$/, '');
    const tipo = name.split('-')[0];
    const perfil = PERFILES[tipo];
    if (!perfil || tipo === 'card') continue;
    const r = await procesar(join(dir, f), dest, name, perfil);
    const img = { src: `/proyectos/${p.slug}/${name}`, ...r };
    if (tipo === 'hero') m.hero = { ...img, alt: `Render de la fachada del edificio ${p.nombre}` };
    else if (tipo === 'galeria') m.galeria.push({ ...img, alt: a[name] ?? `${p.nombre}, ${p.comuna}: imagen ${m.galeria.length + 1} de la galería` });
    else if (tipo === 'planta') m.plantas.push(img);
  }
  medios[p.slug] = m;
  console.log(p.slug, `galería ${m.galeria.length}, plantas ${m.plantas.length}`);
}
writeFileSync('data/fuentes/medios.json', JSON.stringify(medios, null, 1) + '\n');
