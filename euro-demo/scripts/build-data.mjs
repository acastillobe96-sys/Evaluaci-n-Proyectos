// Construye data/proyectos.json (única fuente de verdad) desde:
//  - la tabla entregada en el brief (nombre, comuna, dirección, entrega, desde, dorm, baños)
//  - data/fuentes/fichas-euro.json (descripción, tipologías, entorno, fotos) extraído de euroinmobiliaria.cl
//  - data/fuentes/listado-euro.json (coordenadas publicadas por el propio sitio)
//  - data/fuentes/geocodificacion-osm.json (Nominatim, solo donde el sitio no publica coordenadas)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const fichas = JSON.parse(readFileSync('data/fuentes/fichas-euro.json', 'utf8'));
const listado = JSON.parse(readFileSync('data/fuentes/listado-euro.json', 'utf8')).proyectos;
const osm = JSON.parse(readFileSync('data/fuentes/geocodificacion-osm.json', 'utf8'));
const medios = existsSync('data/fuentes/medios.json') ? JSON.parse(readFileSync('data/fuentes/medios.json', 'utf8')) : {};

// Tabla del brief. slugOrigen = slug actual en euroinmobiliaria.cl
const tabla = [
  ['Alto Irarrázaval', 'Ñuñoa', 'Av. Irarrázaval 2325', '2S 2028', 4004, '1-2', '1-2', 'alto-irarrazaval'],
  ['Diagonal Vicuña', 'Santiago Centro', 'Santa Elena 2000', '1S 2027', 3184, '1-2', '1-2', 'diagonal-vicuna'],
  ['Don Pepe 154', 'La Florida', 'Don Pepe 154', '1S 2027', 3285, '1-2', '1-2', 'don-pepe-154'],
  ['Entre Vicuñas', 'La Florida', 'Vicuña Mackenna 5970', '1S 2027', 3093, '1-2', '1-2', 'entre-vicunas'],
  ['Froilán Roa 5731', 'La Florida', 'Froilán Roa 5731', '2S 2027', 3049, '1-2', '1-2', 'froilan-roa-5731'],
  ['Guillermo Mann 1401', 'Ñuñoa', 'Guillermo Mann 1401', 'Inmediata', 3461, '2', '1-2', 'guillermo-mann-1401'],
  ['Independencia 4745', 'Conchalí', 'Independencia 4745', 'Inmediata', 3135, '2', '1-2', 'independencia-4745'],
  ['José Pedro Alessandri', 'Ñuñoa', 'Av. José Pedro Alessandri 1498', 'Inmediata', 3401, '1-3', '1-2', 'jose-pedro-alessandri'],
  ['Mapocho 3521', 'Quinta Normal', 'Rivas Vicuña 1131', 'Inmediata', 2994, '2-3', '1-2', 'mapocho-3521'],
  ['Marina Pacífico', 'Coquimbo', 'Av. Los Pescadores 5121', 'Inmediata', 2525, '1-3', '1-2', 'mirador-pacifico'],
  ['Mirador Irarrázaval', 'Ñuñoa', 'Obispo Orrego 40', '1S 2028', 4026, '1-2', '1-2', 'mirador-irarrazabal'],
  ['Nova Parque', 'San Joaquín', 'Vicuña Mackenna 3747', '2S 2028', 2725, '1', '1', 'nova-parque'],
  ['Plaza de Lourdes', 'Quinta Normal', 'Av. San Pablo 3770', '1S 2028', 2733, '1-3', '1-2', 'plaza-de-lourdes'],
  ['Rosas 1444', 'Santiago Centro', 'Rosas 1438', 'Inmediata', 2283, '1-2', '1-2', 'rosas-1444'],
  ['Santa Elena 1670', 'Santiago Centro', 'Santa Elena 1670', 'Inmediata', 2198, '1-2', '1-2', 'santa-elena-1670'],
  ['Vicuña Mackenna 1432', 'Ñuñoa', 'Av. Vicuña Mackenna 1432', 'Inmediata', 3381, '1-2', '1-2', 'vicuna-mackenna-1432'],
  ['Vista Portugal', 'Santiago Centro', 'Portugal 755', 'Inmediata', 2616, '1-2', '1-2', 'vista-portugal'],
  ['Vitro', 'Ñuñoa', 'Zañartu 980', 'Inmediata', 2791, '1-2', '1-2', 'vitro'],
];

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const rango = (s) => { const [a, b] = s.split('-').map(Number); return { min: a, max: b ?? a }; };
const num = (s) => (s == null ? null : Number(String(s).replace(/[^\d,]/g, '').replace(',', '.')) || null);

function entrega(code) {
  if (code === 'Inmediata') return { tipo: 'inmediata', anio: null, semestre: null, corto: 'Entrega inmediata', largo: 'Entrega inmediata', orden: 0 };
  const [, s, y] = code.match(/^(\d)S (\d{4})$/);
  return {
    tipo: 'futura', anio: +y, semestre: +s,
    corto: `Entrega ${s}S ${y}`,
    largo: `${s === '1' ? '1er' : '2do'} semestre ${y}`,
    orden: +y * 10 + +s,
  };
}

// Limpia textos de la ficha: separa por oraciones largas en párrafos legibles.
function parrafos(arr) {
  const out = [];
  for (const p of arr) {
    const partes = p.split(/(?<=\.)\s+(?=(?:Además|Características|Otros equipamientos|Los departamentos|El proyecto|A solo|Todos los|Departamentos|Nova Parque|Torre)\b)/);
    for (const x of partes) if (x.trim()) out.push(x.trim());
  }
  return out;
}

const avisos = [];
const proyectos = tabla.map(([nombre, comuna, direccion, ent, desde, dorm, ban, origen]) => {
  const slug = slugify(nombre);
  const f = fichas[origen];
  const l = listado.find((x) => x.slug === origen);
  if (!f || !l) throw new Error(`Falta fuente para ${nombre}`);
  if (l.min_price !== desde) avisos.push(`${nombre}: "desde" del brief (${desde}) ≠ sitio (${l.min_price})`);

  let coords;
  if (slug === 'nova-parque') {
    // Euro no publica coordenadas y OSM solo devuelve el centroide del tramo (en el límite con Ñuñoa).
    // Interpolación por numeración de Av. Vicuña Mackenna entre dos proyectos con coordenadas publicadas por Euro:
    // N° 1432 (Vicuña Mackenna 1432) y N° 5970 (Entre Vicuñas). Calza con "Metro San Joaquín a 14 min a pie".
    const a = listado.find((x) => x.slug === 'vicuna-mackenna-1432'), b = listado.find((x) => x.slug === 'entre-vicunas');
    const t = (3747 - 1432) / (5970 - 1432);
    coords = { lat: +(a.lat + (b.lat - a.lat) * t).toFixed(6), lng: +(a.lng + (b.lng - a.lng) * t).toFixed(6), fuente: 'interpolación por numeración de Av. Vicuña Mackenna', precision: 'aproximada' };
  } else if (l.lat != null && l.lng != null) coords = { lat: +l.lat.toFixed(6), lng: +l.lng.toFixed(6), fuente: 'euroinmobiliaria.cl', precision: 'exacta' };
  else {
    const g = osm[slug];
    const exacta = g && /^\d+,/.test(g.match);
    coords = { lat: +g.lat.toFixed(6), lng: +g.lng.toFixed(6), fuente: 'OpenStreetMap (Nominatim)', precision: exacta ? 'exacta' : 'aproximada' };
  }

  const tipologias = f.tipologias.map((t, i) => ({
    nombre: t.nombre.replace(/\s+desde$/i, ''),
    dormitorios: num(t.dormitorios),
    banos: num(t.banos),
    supUtil: num(t.supUtil),
    supTotal: num(t.supTotal),
    precioUF: t.precioUF,
    subsidio: t.subsidio,
    planta: medios[slug]?.plantas?.[i] ?? null,
  }));
  for (const t of tipologias) {
    const n = t.nombre.match(/(\d)\s*dorm/i);
    if (n && +n[1] !== t.dormitorios) avisos.push(`${nombre}: tipología "${t.nombre}" figura con ${t.dormitorios} dormitorios en el sitio`);
  }
  const subsidio = tipologias.some((t) => t.subsidio);
  const tipDorm = tipologias.map((t) => t.dormitorios);
  const r = rango(dorm);
  if (Math.min(...tipDorm) !== r.min || Math.max(...tipDorm) !== r.max) {
    avisos.push(`${nombre}: dormitorios del brief (${dorm}) ≠ tipologías de la ficha (${Math.min(...tipDorm)}–${Math.max(...tipDorm)})`);
  }

  const m = medios[slug] ?? {};
  return {
    slug,
    slugOrigen: origen,
    nombre,
    comuna,
    comunaSlug: slugify(comuna),
    direccion,
    region: comuna === 'Coquimbo' ? 'Coquimbo' : 'Metropolitana',
    entrega: entrega(ent),
    desdeUF: desde,
    dormitorios: r,
    banos: rango(ban),
    subsidio,
    plusvalia: f.plusvalia ?? null,
    metro: (f.infoTextos[2] && f.infoTextos[2] !== 'N/A' && f.infoTextos[2] !== comuna) ? f.infoTextos[2] : null,
    coords,
    beneficios: f.beneficios.map((b) => b.replace(/\.$/, '')),
    descripcion: { titulo: f.descTitulo, parrafos: parrafos(f.descParrafos) },
    tipologias,
    entorno: f.entorno,
    imagenes: {
      card: m.card ?? null,
      hero: m.hero ?? null,
      galeria: m.galeria ?? [],
    },
    brochure: f.brochure,
    urlOrigen: `https://euroinmobiliaria.cl/proyectos/${origen}`,
  };
});

writeFileSync('data/proyectos.json', JSON.stringify({
  generado: new Date().toISOString().slice(0, 10),
  fuente: 'euroinmobiliaria.cl (18-nov-2026) + tabla del brief',
  proyectos,
}, null, 1) + '\n');
console.log(`${proyectos.length} proyectos → data/proyectos.json`);
console.log(`Con subsidio: ${proyectos.filter((p) => p.subsidio).map((p) => p.nombre).join(', ')}`);
for (const a of avisos) console.log('AVISO', a);
for (const p of proyectos) if (p.coords.precision !== 'exacta' || p.coords.fuente !== 'euroinmobiliaria.cl') console.log('COORD', p.nombre, p.coords.fuente, p.coords.precision);
