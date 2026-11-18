// /proyectos: filtros en vivo sincronizados con la URL, chips, orden, bottom sheet y vista mapa.
import type { Filtros, ProyectoLigero, Vista } from '../lib/types.ts';
import { ENTREGAS, aplicarFiltros, cantidadActivos, escribirFiltros, leerFiltros, ordenar, rangoPrecios } from '../lib/filtros.ts';
import { formatUF, plural } from '../lib/format.ts';
import { $, $$, escapeHtml, onEscape, trapFocus } from './dom.ts';

interface Datos {
  proyectos: ProyectoLigero[];
  comunas: Array<{ slug: string; nombre: string }>;
  ufCLP: number;
  whatsapp: string;
  root: string;
  explicitIndex: boolean;
}

const datos = JSON.parse($('#datos-proyectos')?.textContent ?? '{}') as Datos;
const todos = datos.proyectos;
const comunasValidas = datos.comunas.map((c) => c.slug);
const nombreComuna = new Map(datos.comunas.map((c) => [c.slug, c.nombre]));
const { min: PMIN, max: PMAX } = rangoPrecios(todos);

const grilla = $<HTMLUListElement>('#grilla')!;
const items = new Map($$<HTMLLIElement>('li[data-slug]', grilla).map((li) => [li.dataset['slug']!, li]));
const vacio = $<HTMLElement>('#vacio')!;
const mapaWrap = $<HTMLElement>('#mapa-wrap')!;
const chips = $<HTMLElement>('#chips')!;
const resCount = $<HTMLElement>('#res-count')!;
const resSub = $<HTMLElement>('#res-sub')!;
const panel = $<HTMLElement>('#filtros')!;
const precio = $<HTMLInputElement>('#precio')!;
const precioOut = $<HTMLOutputElement>('#precio-out')!;
const subsidioBtn = $<HTMLButtonElement>('#subsidio')!;
const ordenSel = $<HTMLSelectElement>('#orden')!;
const barra = $<HTMLElement>('#barra')!;

let f: Filtros = leerFiltros(new URLSearchParams(location.search), comunasValidas);
let resultado: ProyectoLigero[] = [];

// ── Render ──────────────────────────────────────────────
function pintarControles(): void {
  $$<HTMLInputElement>('input[name="comuna"]', panel).forEach((i) => { i.checked = f.comunas.includes(i.value); });
  $$<HTMLButtonElement>('[data-dorm]', panel).forEach((b) => b.setAttribute('aria-pressed', String(f.dormitorios.includes(Number(b.dataset['dorm'])))));
  $$<HTMLButtonElement>('[data-entrega]', panel).forEach((b) => b.setAttribute('aria-pressed', String(f.entregas.includes(b.dataset['entrega'] as Filtros['entregas'][number]))));
  const pv = f.precioMax ?? PMAX;
  precio.value = String(Math.min(Math.max(pv, PMIN), PMAX));
  precio.style.setProperty('--p', `${((Number(precio.value) - PMIN) / (PMAX - PMIN)) * 100}%`);
  precioOut.textContent = f.precioMax == null ? 'Sin tope' : `Hasta ${formatUF(f.precioMax)}`;
  subsidioBtn.setAttribute('aria-checked', String(f.subsidio));
  ordenSel.value = f.orden;
  $$<HTMLButtonElement>('[data-vista]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset['vista'] === f.vista)));

  const cuenta: Record<string, number> = { comuna: f.comunas.length, dorm: f.dormitorios.length, entrega: f.entregas.length, precio: f.precioMax != null ? 1 : 0 };
  for (const [k, n] of Object.entries(cuenta)) {
    const el = $(`[data-count="${k}"]`, panel);
    if (el) el.textContent = n ? String(n) : '';
    $(`[data-fg="${k}"] > .fg-trigger`, panel)?.setAttribute('data-activo', String(n > 0));
  }
  const total = cantidadActivos(f);
  const n = $<HTMLElement>('#filtros-n');
  if (n) { n.hidden = total === 0; n.textContent = String(total); }
}

function chip(etiqueta: string, quitar: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.innerHTML = `${escapeHtml(etiqueta)}<svg class="size-4" aria-hidden="true"><use href="#i-x"></use></svg>`;
  b.setAttribute('aria-label', `Quitar filtro: ${etiqueta}`);
  b.addEventListener('click', () => { quitar(); actualizar(); });
  return b;
}

function pintarChips(): void {
  chips.replaceChildren();
  for (const c of f.comunas) chips.append(chip(nombreComuna.get(c) ?? c, () => { f.comunas = f.comunas.filter((x) => x !== c); }));
  for (const d of f.dormitorios) chips.append(chip(`${d} dorm`, () => { f.dormitorios = f.dormitorios.filter((x) => x !== d); }));
  for (const e of f.entregas) chips.append(chip(e === 'inmediata' ? 'Entrega inmediata' : `Entrega ${e}`, () => { f.entregas = f.entregas.filter((x) => x !== e); }));
  if (f.precioMax != null) chips.append(chip(`Hasta ${formatUF(f.precioMax)}`, () => { f.precioMax = null; }));
  if (f.subsidio) chips.append(chip('Subsidio a la tasa', () => { f.subsidio = false; }));
  if (chips.childElementCount) {
    const limpiar = document.createElement('button');
    limpiar.type = 'button';
    limpiar.className = 'link text-sm ml-1';
    limpiar.textContent = 'Limpiar todo';
    limpiar.addEventListener('click', limpiarTodo);
    chips.append(limpiar);
  }
  chips.hidden = chips.childElementCount === 0;
}

function pintarResultados(): void {
  resultado = ordenar(aplicarFiltros(todos, f), f.orden);
  const visibles = new Set(resultado.map((p) => p.slug));
  // Reordena y oculta sin recrear nodos (conserva imágenes ya cargadas)
  const frag = document.createDocumentFragment();
  for (const p of resultado) { const li = items.get(p.slug); if (li) frag.append(li); }
  for (const [slug, li] of items) if (!visibles.has(slug)) { li.hidden = true; frag.append(li); }
  for (const p of resultado) { const li = items.get(p.slug); if (li) li.hidden = false; }
  grilla.append(frag);

  const n = resultado.length;
  const comunasRes = new Set(resultado.map((p) => p.comunaSlug)).size;
  resCount.textContent = plural(n, 'proyecto', 'proyectos');
  resSub.textContent = n ? `en ${plural(comunasRes, 'comuna', 'comunas')}` : '';
  const ver = $('#ver-n');
  if (ver) ver.textContent = n ? `Ver ${plural(n, 'proyecto', 'proyectos')}` : 'Sin resultados';

  // Estado vacío SOLO con 0 resultados
  const sinResultados = n === 0;
  vacio.hidden = !sinResultados;
  grilla.hidden = sinResultados || f.vista !== 'grilla';
  mapaWrap.hidden = sinResultados || f.vista !== 'mapa';
}

let mapa: { actualizar: (ps: ProyectoLigero[]) => void } | null = null;
let cargandoMapa = false;
async function pintarMapa(): Promise<void> {
  if (f.vista !== 'mapa' || !resultado.length) return;
  if (!mapa) {
    if (cargandoMapa) return;
    cargandoMapa = true;
    const { crearMapaProyectos } = await import('./mapa.ts');
    mapa = await crearMapaProyectos($('#mapa')!, $('#mapa-extra')!, datos);
    cargandoMapa = false;
  }
  mapa.actualizar(resultado);
}

function actualizar(opts: { historial?: boolean } = {}): void {
  const qs = escribirFiltros(f);
  if (qs !== location.search) history[opts.historial ? 'pushState' : 'replaceState'](null, '', location.pathname + qs + location.hash);
  pintarControles();
  pintarChips();
  pintarResultados();
  void pintarMapa();
}

function limpiarTodo(): void {
  const { orden, vista } = f;
  f = { ...leerFiltros(new URLSearchParams(), comunasValidas), orden, vista };
  actualizar();
}

// ── Eventos ─────────────────────────────────────────────
panel.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.name === 'comuna') {
    f.comunas = t.checked ? [...f.comunas, t.value] : f.comunas.filter((c) => c !== t.value);
    actualizar();
  }
});
panel.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('button');
  if (!b) return;
  if (b.dataset['dorm']) {
    const d = Number(b.dataset['dorm']);
    f.dormitorios = f.dormitorios.includes(d) ? f.dormitorios.filter((x) => x !== d) : [...f.dormitorios, d].sort();
    actualizar();
  } else if (b.dataset['entrega']) {
    const v = b.dataset['entrega'] as Filtros['entregas'][number];
    f.entregas = f.entregas.includes(v) ? f.entregas.filter((x) => x !== v) : ENTREGAS.map((x) => x.valor).filter((x) => x === v || f.entregas.includes(x));
    actualizar();
  } else if (b === subsidioBtn) {
    f.subsidio = !f.subsidio;
    actualizar();
  }
});
precio.addEventListener('input', () => {
  const v = Number(precio.value);
  f.precioMax = v >= PMAX ? null : v;
  actualizar();
});
ordenSel.addEventListener('change', () => { f.orden = ordenSel.value as Filtros['orden']; actualizar(); });
$$<HTMLButtonElement>('[data-vista]').forEach((b) => b.addEventListener('click', () => {
  f.vista = b.dataset['vista'] as Vista;
  actualizar({ historial: true });
}));
$$<HTMLButtonElement>('[data-limpiar]').forEach((b) => b.addEventListener('click', limpiarTodo));
$$<HTMLAnchorElement>('[data-aplicar-subsidio]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  f.subsidio = true;
  actualizar({ historial: true });
  document.getElementById('proyectos')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}));
window.addEventListener('popstate', () => {
  f = leerFiltros(new URLSearchParams(location.search), comunasValidas);
  actualizar();
});

// Popovers de escritorio (un grupo abierto a la vez)
function cerrarGrupos(excepto?: Element): void {
  $$<HTMLElement>('.fg[data-open="true"]', panel).forEach((g) => {
    if (g === excepto) return;
    g.dataset['open'] = 'false';
    $('.fg-trigger', g)?.setAttribute('aria-expanded', 'false');
  });
}
$$<HTMLButtonElement>('.fg-trigger', panel).forEach((t) => t.addEventListener('click', (e) => {
  e.stopPropagation();
  const g = t.closest<HTMLElement>('.fg')!;
  const abrir = g.dataset['open'] !== 'true';
  cerrarGrupos(g);
  g.dataset['open'] = String(abrir);
  t.setAttribute('aria-expanded', String(abrir));
  if (abrir) $<HTMLElement>('input, button.toggle-btn', g)?.focus({ preventScroll: true });
}));
document.addEventListener('click', (e) => {
  if (!(e.target as Element).closest('.fg')) cerrarGrupos();
});

// Bottom sheet (móvil)
const filtrosBtn = $<HTMLButtonElement>('#filtros-btn');
const movil = window.matchMedia('(max-width: 1023.98px)');
let liberar: (() => void) | null = null;
let backdrop: HTMLDivElement | null = null;
function setSheet(open: boolean): void {
  if (open === (panel.dataset['open'] === 'true')) return;
  panel.dataset['open'] = String(open);
  filtrosBtn?.setAttribute('aria-expanded', String(open));
  if (open) {
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop';
    backdrop.addEventListener('click', () => setSheet(false));
    panel.before(backdrop);
    document.documentElement.style.overflow = 'hidden';
    liberar = trapFocus(panel);
    $<HTMLElement>('[data-cerrar-filtros]', panel)?.focus({ preventScroll: true });
  } else {
    panel.removeAttribute('role');
    panel.removeAttribute('aria-modal');
    backdrop?.remove();
    backdrop = null;
    document.documentElement.style.overflow = '';
    liberar?.();
    liberar = null;
    filtrosBtn?.focus({ preventScroll: true });
  }
}
filtrosBtn?.addEventListener('click', () => setSheet(true));
$$<HTMLButtonElement>('[data-cerrar-filtros]', panel).forEach((b) => b.addEventListener('click', () => setSheet(false)));
movil.addEventListener('change', () => { if (!movil.matches) setSheet(false); });
onEscape(() => {
  if (panel.dataset['open'] === 'true') { setSheet(false); return true; }
  const abierto = $<HTMLElement>('.fg[data-open="true"]', panel);
  if (abierto) { cerrarGrupos(); $<HTMLElement>('.fg-trigger', abierto)?.focus(); return true; }
  return false;
});

// Sombra de la barra cuando queda pegada
const sentinel = document.createElement('div');
barra.before(sentinel);
new IntersectionObserver(([e]) => { barra.dataset['stuck'] = String(!e?.isIntersecting); }, { rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72}px 0px 0px 0px` }).observe(sentinel);

// Al cambiar filtros con la grilla fuera de vista, no saltar; el contador anuncia el cambio (aria-live).
actualizar();
