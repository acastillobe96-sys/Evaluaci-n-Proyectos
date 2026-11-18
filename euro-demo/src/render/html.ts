// Plantillas HTML con escape automático. `html\`...\`` escapa interpolaciones salvo que sean Raw.
import type { Imagen } from '../lib/types.ts';

export class Raw {
  readonly v: string;
  constructor(v: string) { this.v = v; }
  toString(): string { return this.v; }
}
export const raw = (s: string): Raw => new Raw(s);

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

type Valor = string | number | boolean | null | undefined | Raw | Valor[];

function render(v: Valor): string {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Raw) return v.v;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(String(v));
}

export function html(strings: TemplateStringsArray, ...vals: Valor[]): Raw {
  let out = strings[0] ?? '';
  vals.forEach((v, i) => { out += render(v) + (strings[i + 1] ?? ''); });
  return new Raw(out);
}

/** Contexto de la página: prefijo relativo a la raíz del sitio (para que funcione en cualquier subcarpeta). */
export interface Ctx {
  /** "" en la raíz, "../" un nivel abajo, etc. */
  root: string;
  /** Enlaces explícitos a index.html (para hosts sin URLs limpias) */
  explicitIndex: boolean;
  /** Hash de assets para romper caché */
  v: string;
  /** Versión de demostración (marca ficticia, todo en línea, estado en el #) */
  demo: boolean;
}

/** Ruta interna relativa: url(ctx, 'proyectos/vitro/') */
export function url(ctx: Ctx, path: string): string {
  const [ruta = '', query] = path.replace(/^\//, '').split('?');
  // En la demo el listado vive en la raíz y los filtros van en el # (el visor no pasa query strings)
  let p = ctx.root + (ctx.demo && ruta === 'proyectos/' ? '' : ruta);
  if (ctx.explicitIndex && (p.endsWith('/') || p === ctx.root)) p += 'index.html';
  if (query) p += (ctx.demo ? '#' : '?') + query;
  return p || './';
}

export function asset(ctx: Ctx, path: string): string {
  return `${ctx.root}${path.replace(/^\//, '')}?v=${ctx.v}`;
}

/** <picture> responsivo con AVIF/WebP, width/height para evitar layout shift. */
export function picture(ctx: Ctx, img: Omit<Imagen, 'alt'> & { alt?: string }, o: {
  sizes: string; cls?: string; eager?: boolean; alt?: string; priority?: boolean;
}): Raw {
  if (img.svg) {
    return html`<img src="${img.svg}" width="${img.w}" height="${img.h}" alt="${o.alt ?? img.alt ?? ''}" class="${o.cls ?? ''}" decoding="async">`;
  }
  const set = (f: string) => img.anchos.map((a) => `${ctx.root}${img.src.replace(/^\//, '')}-${a}.${f} ${a}w`).join(', ');
  const fallbackW = img.anchos.find((a) => a >= 800) ?? img.anchos[img.anchos.length - 1] ?? img.w;
  const h = Math.round((img.h / img.w) * fallbackW);
  const sources = img.formatos.filter((f) => f !== 'webp').map((f) => html`<source type="image/${f}" srcset="${set(f)}" sizes="${o.sizes}">`);
  return html`<picture>${sources}<source type="image/webp" srcset="${set('webp')}" sizes="${o.sizes}"><img src="${ctx.root}${img.src.replace(/^\//, '')}-${fallbackW}.webp" width="${fallbackW}" height="${h}" alt="${o.alt ?? img.alt ?? ''}" class="${o.cls ?? ''}" ${raw(o.eager ? 'loading="eager"' : 'loading="lazy"')} decoding="async"${raw(o.priority ? ' fetchpriority="high"' : '')}></picture>`;
}

/** Sprite de íconos (trazo 1.75, 24×24). */
export function icon(name: string, cls = 'size-5'): Raw {
  return html`<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
}
