// Convierte los proyectos reales en un catálogo FICTICIO para la versión de demostración:
// nombres, direcciones, precios, ubicaciones exactas, textos y fotos se reemplazan.
// Se conservan solo la estructura (comunas, rangos de dormitorios, entregas y subsidio) para que
// los filtros se comporten igual que en la versión real.
import type { Proyecto, Tipologia } from '../lib/types.ts';
import { dataUri, fachada, planta, semilla, type Momento } from './ilustraciones.ts';

const NOMBRES = ['Alerce', 'Quillay', 'Arrayán', 'Canelo', 'Boldo', 'Maitén', 'Peumo', 'Litre', 'Lingue', 'Ulmo', 'Coigüe', 'Raulí', 'Mañío', 'Tepa', 'Luma', 'Notro', 'Ciprés', 'Roble'];
const PREFIJOS = ['Edificio', 'Torre', 'Parque', 'Mirador', 'Plaza', 'Alto'];
const CALLES = ['Los Aromos', 'Las Camelias', 'Los Jazmines', 'El Mirlo', 'Las Gaviotas', 'Los Tordos', 'El Zorzal', 'Las Totoras', 'El Chercán', 'Los Copihues', 'La Diuca', 'El Queltehue', 'Las Loicas', 'El Tiuque', 'Los Tencas', 'La Tagua', 'El Pidén', 'Las Torcazas'];

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const svgImg = (svg: string, w: number, h: number, alt: string) => ({ src: '', w, h, anchos: [], formatos: [], alt, svg: dataUri(svg) });

function tipologias(p: Proyecto, r: () => number, desde: number, slug: string): Tipologia[] {
  const combos: Array<[number, number]> = [];
  for (let d = p.dormitorios.min; d <= p.dormitorios.max; d++) {
    const bmin = Math.max(p.banos.min, d === 1 ? 1 : p.banos.min);
    const bmax = d === 1 ? 1 : p.banos.max;
    for (let b = bmin; b <= bmax; b++) combos.push([d, b]);
  }
  let precio = desde;
  return combos.map(([d, b], i) => {
    if (i > 0) precio = Math.round((precio * (1.07 + r() * 0.1)) / 10) * 10;
    const util = 28 + d * 10 + b * 3 + Math.round(r() * 4);
    const nombre = `${d} dorm ${b} ${b === 1 ? 'baño' : 'baños'}`;
    return {
      nombre, dormitorios: d, banos: b, supUtil: util, supTotal: util + 3 + Math.round(r() * 4),
      precioUF: precio, subsidio: p.subsidio && precio <= 4000,
      planta: { ...svgImg(planta(d, b, `${slug}-${i}`), 1000, 625, '') },
    };
  });
}

export function catalogoFicticio(reales: Proyecto[]): Proyecto[] {
  return reales.map((p, i) => {
    const r = semilla(`demo-${p.slug}`);
    const nombre = `${PREFIJOS[i % PREFIJOS.length]} ${NOMBRES[i]}`;
    const slug = slugify(nombre);
    // Precio cercano pero distinto, y ubicación desplazada ~400–800 m dentro de la misma comuna
    const desde = Math.round((p.desdeUF * (0.93 + r() * 0.14)) / 10) * 10;
    const ang = r() * Math.PI * 2, dist = 0.004 + r() * 0.004;
    const calle = `${CALLES[i]} ${100 + Math.floor(r() * 3800)}`;
    const momentos: Momento[] = ['dia', 'tarde', 'noche'];
    const tip = tipologias(p, r, desde, slug);
    return {
      ...p,
      slug, slugOrigen: '', nombre, direccion: calle,
      desdeUF: desde,
      plusvalia: null,
      metro: null,
      coords: { lat: +(p.coords.lat + Math.sin(ang) * dist).toFixed(5), lng: +(p.coords.lng + Math.cos(ang) * dist).toFixed(5), fuente: 'ficticia', precision: 'exacta' },
      beneficios: ['Pie en cuotas (ejemplo)', 'Descuento por pago contado (ejemplo)', 'Arriendo asegurado por 2 años (ejemplo)'],
      descripcion: {
        titulo: `Vivir en ${p.comuna}, cerca de todo`,
        parrafos: [
          `${nombre} es un proyecto ficticio creado para esta demostración. Muestra cómo se vería la ficha de un edificio residencial en ${p.comuna}, con departamentos de ${p.dormitorios.min === p.dormitorios.max ? p.dormitorios.min : `${p.dormitorios.min} a ${p.dormitorios.max}`} dormitorios.`,
          'Los textos, precios, plantas e imágenes de esta página son ilustrativos. En el sitio real, este bloque lleva la descripción del proyecto, sus terminaciones y su equipamiento.',
        ],
      },
      tipologias: tip,
      entorno: [
        { categoria: 'Transporte', items: [{ nombre: 'Estación de metro (ejemplo)', detalle: '8–12 min a pie' }, { nombre: 'Paraderos de buses', detalle: 'A una cuadra' }] },
        { categoria: 'Áreas Verdes', items: [{ nombre: 'Parque de barrio (ejemplo)', detalle: '5 min a pie' }] },
        { categoria: 'Comercio', items: [{ nombre: 'Supermercado (ejemplo)', detalle: '6 min a pie' }, { nombre: 'Farmacias y servicios', detalle: 'En el eje principal' }] },
        { categoria: 'Salud', items: [{ nombre: 'Centro de salud (ejemplo)', detalle: '15 min a pie' }] },
        { categoria: 'Educación', items: [{ nombre: 'Colegios y jardines (ejemplo)', detalle: 'A menos de 1 km' }] },
      ],
      imagenes: {
        card: svgImg(fachada(slug, 'tarde'), 1200, 750, `Ilustración del edificio ${nombre}, ${p.comuna}`),
        hero: svgImg(fachada(slug, 'noche', 1920, 750), 1920, 750, `Ilustración del edificio ${nombre} de noche`),
        galeria: momentos.map((m) => svgImg(fachada(slug, m), 1200, 750, `Ilustración del edificio ${nombre}, ${m === 'dia' ? 'de día' : m === 'tarde' ? 'al atardecer' : 'de noche'}`)),
      },
      brochure: null,
      urlOrigen: '',
    };
  });
}
