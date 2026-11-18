// Lógica pura de filtros: lectura/escritura de la URL, aplicación y orden.
// Se usa en el navegador y en las pruebas (Node).
import type { EntregaFiltro, Filtros, Orden, ProyectoLigero, Vista } from './types.ts';

export const ORDENES: ReadonlyArray<{ valor: Orden; etiqueta: string }> = [
  { valor: 'nombre', etiqueta: 'Nombre (A–Z)' },
  { valor: 'precio-asc', etiqueta: 'Precio: menor a mayor' },
  { valor: 'precio-desc', etiqueta: 'Precio: mayor a menor' },
  { valor: 'entrega', etiqueta: 'Entrega más próxima' },
];

export const ENTREGAS: ReadonlyArray<{ valor: EntregaFiltro; etiqueta: string }> = [
  { valor: 'inmediata', etiqueta: 'Inmediata' },
  { valor: '2027', etiqueta: '2027' },
  { valor: '2028', etiqueta: '2028' },
];

export const DORMITORIOS = [1, 2, 3] as const;
export const PRECIO_PASO = 100;

export function filtrosVacios(): Filtros {
  return { comunas: [], dormitorios: [], entregas: [], precioMax: null, subsidio: false, orden: 'nombre', vista: 'grilla' };
}

const lista = (v: string | null): string[] => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
const unicos = <T,>(a: T[]): T[] => [...new Set(a)];

/** Lee los filtros desde la query string. Ignora valores desconocidos en vez de fallar. */
export function leerFiltros(qs: URLSearchParams, comunasValidas: readonly string[]): Filtros {
  const f = filtrosVacios();
  f.comunas = unicos(lista(qs.get('comuna')).filter((c) => comunasValidas.includes(c)));
  f.dormitorios = unicos(lista(qs.get('dorm')).map(Number).filter((n) => (DORMITORIOS as readonly number[]).includes(n))).sort();
  f.entregas = unicos(lista(qs.get('entrega')).filter((e): e is EntregaFiltro => ENTREGAS.some((x) => x.valor === e)));
  const p = Number(qs.get('precio'));
  f.precioMax = Number.isFinite(p) && p > 0 ? p : null;
  f.subsidio = qs.get('subsidio') === '1';
  const o = qs.get('orden');
  if (ORDENES.some((x) => x.valor === o)) f.orden = o as Orden;
  const v = qs.get('vista');
  if (v === 'mapa' || v === 'grilla') f.vista = v as Vista;
  return f;
}

/** Escribe los filtros en una query string limpia (omite los valores por defecto). */
export function escribirFiltros(f: Filtros): string {
  const qs = new URLSearchParams();
  if (f.comunas.length) qs.set('comuna', f.comunas.join(','));
  if (f.dormitorios.length) qs.set('dorm', f.dormitorios.join(','));
  if (f.entregas.length) qs.set('entrega', f.entregas.join(','));
  if (f.precioMax != null) qs.set('precio', String(f.precioMax));
  if (f.subsidio) qs.set('subsidio', '1');
  if (f.orden !== 'nombre') qs.set('orden', f.orden);
  if (f.vista !== 'grilla') qs.set('vista', f.vista);
  const s = qs.toString().replace(/%2C/g, ',');
  return s ? `?${s}` : '';
}

function cumpleEntrega(p: ProyectoLigero, e: EntregaFiltro): boolean {
  return e === 'inmediata' ? p.entregaTipo === 'inmediata' : p.entregaAnio === Number(e);
}

/** Aplica los filtros (sin ordenar). Dentro de cada grupo es OR; entre grupos, AND. */
export function aplicarFiltros(ps: readonly ProyectoLigero[], f: Filtros): ProyectoLigero[] {
  return ps.filter((p) =>
    (!f.comunas.length || f.comunas.includes(p.comunaSlug)) &&
    (!f.dormitorios.length || f.dormitorios.some((d) => d >= p.dormitorios.min && d <= p.dormitorios.max)) &&
    (!f.entregas.length || f.entregas.some((e) => cumpleEntrega(p, e))) &&
    (f.precioMax == null || p.desdeUF <= f.precioMax) &&
    (!f.subsidio || p.subsidio),
  );
}

export function ordenar(ps: readonly ProyectoLigero[], orden: Orden): ProyectoLigero[] {
  const a = [...ps];
  const nombre = (x: ProyectoLigero, y: ProyectoLigero) => x.nombre.localeCompare(y.nombre, 'es');
  switch (orden) {
    case 'precio-asc': return a.sort((x, y) => x.desdeUF - y.desdeUF || nombre(x, y));
    case 'precio-desc': return a.sort((x, y) => y.desdeUF - x.desdeUF || nombre(x, y));
    case 'entrega': return a.sort((x, y) => x.entregaOrden - y.entregaOrden || x.desdeUF - y.desdeUF);
    case 'nombre': return a.sort(nombre);
  }
}

export function rangoPrecios(ps: readonly ProyectoLigero[]): { min: number; max: number } {
  const v = ps.map((p) => p.desdeUF);
  return {
    min: Math.floor(Math.min(...v) / PRECIO_PASO) * PRECIO_PASO,
    max: Math.ceil(Math.max(...v) / PRECIO_PASO) * PRECIO_PASO,
  };
}

export function cantidadActivos(f: Filtros): number {
  return f.comunas.length + f.dormitorios.length + f.entregas.length + (f.precioMax != null ? 1 : 0) + (f.subsidio ? 1 : 0);
}
