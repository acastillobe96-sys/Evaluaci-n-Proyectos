// Tipos compartidos entre el generador (Node) y los scripts del navegador.

export interface Rango {
  min: number;
  max: number;
}

export interface Entrega {
  tipo: 'inmediata' | 'futura';
  anio: number | null;
  semestre: 1 | 2 | null;
  /** "Entrega inmediata" | "Entrega 1S 2027" */
  corto: string;
  /** "Entrega inmediata" | "1er semestre 2027" */
  largo: string;
  /** 0 = inmediata; AAAAS para ordenar */
  orden: number;
}

export interface Imagen {
  /** Ruta sin ancho ni extensión, p. ej. "/proyectos/vitro/card" */
  src: string;
  w: number;
  h: number;
  anchos: number[];
  formatos: Array<'avif' | 'webp'>;
  alt: string;
  /** Solo en la demo: ilustración SVG como data URI (reemplaza a src/anchos) */
  svg?: string;
}

export interface Tipologia {
  nombre: string;
  dormitorios: number | null;
  banos: number | null;
  supUtil: number | null;
  supTotal: number | null;
  precioUF: number | null;
  subsidio: boolean;
  planta: Omit<Imagen, 'alt'> | null;
}

export interface PuntoInteres {
  nombre: string;
  detalle: string;
}

export interface Proyecto {
  slug: string;
  slugOrigen: string;
  nombre: string;
  comuna: string;
  comunaSlug: string;
  direccion: string;
  region: string;
  entrega: Entrega;
  desdeUF: number;
  dormitorios: Rango;
  banos: Rango;
  subsidio: boolean;
  plusvalia: number | null;
  metro: string | null;
  coords: { lat: number; lng: number; fuente: string; precision: 'exacta' | 'aproximada' };
  beneficios: string[];
  descripcion: { titulo: string | null; parrafos: string[] };
  tipologias: Tipologia[];
  entorno: Array<{ categoria: string; items: PuntoInteres[] }>;
  imagenes: { card: Imagen | null; hero: Imagen | null; galeria: Imagen[] };
  brochure: string | null;
  urlOrigen: string;
}

export interface SiteConfig {
  /** Demo: marca ficticia, sin canales reales de contacto */
  demo?: boolean;
  marca?: string;
  ufCLP: number;
  ufFecha: string;
  sitio: string;
  baseUrlDemo: string;
  whatsapp: string;
  whatsappTexto: string;
  oficina: string;
  horario: string[];
  portalClientes: string;
  redes: Record<string, string>;
  legales: Record<string, string>;
  nav: Record<string, string>;
}

export type Orden = 'precio-asc' | 'precio-desc' | 'entrega' | 'nombre';
export type Vista = 'grilla' | 'mapa';
export type EntregaFiltro = 'inmediata' | '2027' | '2028';

export interface Filtros {
  comunas: string[];
  dormitorios: number[];
  entregas: EntregaFiltro[];
  /** Precio "desde" máximo en UF; null = sin tope */
  precioMax: number | null;
  subsidio: boolean;
  orden: Orden;
  vista: Vista;
}

/** Subconjunto del proyecto que viaja al navegador en /proyectos (lo justo para filtrar y pintar el mapa). */
export interface ProyectoLigero {
  slug: string;
  nombre: string;
  comuna: string;
  comunaSlug: string;
  direccion: string;
  desdeUF: number;
  dormitorios: Rango;
  entregaTipo: Entrega['tipo'];
  entregaAnio: number | null;
  entregaOrden: number;
  entregaCorto: string;
  subsidio: boolean;
  lat: number;
  lng: number;
  precision: 'exacta' | 'aproximada';
  img: string | null;
}
