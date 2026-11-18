// Microinteracciones con Motion (la librería de Framer Motion sin React), con el criterio de Grus:
// curva ease-out, solo opacity/transform, una sola vez, y nada con prefers-reduced-motion.
import { animate, stagger } from 'motion';
import { $$, reduceMotion } from './dom.ts';

export const EASE = [0.23, 1, 0.32, 1] as const;
const sinMov = reduceMotion();

// Disparo "una vez al aparecer" robusto: también revela lo que ya quedó por encima de la pantalla
// (un salto por ancla o un scroll muy rápido no deja contenido escondido).
const pendientes = new Map<Element, { cb: () => void; margen: number }>();
let revisando = false;
function revisar(): void {
  revisando = false;
  const alto = window.innerHeight;
  for (const [el, { cb, margen }] of pendientes) {
    const r = el.getBoundingClientRect();
    if (r.top < alto * (1 - margen) && (r.bottom > 0 || r.top < 0)) { pendientes.delete(el); cb(); }
  }
}
const programar = () => { if (!revisando && pendientes.size) { revisando = true; requestAnimationFrame(revisar); } };
window.addEventListener('scroll', programar, { passive: true });
window.addEventListener('resize', programar);
export function alAparecer(el: Element, cb: () => void, margen = 0.08): void {
  pendientes.set(el, { cb, margen });
  programar();
}

/** Parte un titular en palabras con máscara, conservando nodos como el punto de acento. */
function partir(el: HTMLElement): HTMLElement[] {
  if (el.dataset['partido']) return $$<HTMLElement>('.split-w > span', el);
  el.dataset['partido'] = '1';
  const out: HTMLElement[] = [];
  const nodos = [...el.childNodes];
  el.textContent = '';
  for (const n of nodos) {
    if (n.nodeType === Node.TEXT_NODE) {
      const partes = (n.textContent ?? '').split(/(\s+)/);
      for (const p of partes) {
        if (!p) continue;
        if (/^\s+$/.test(p)) { el.append(' '); continue; }
        const w = document.createElement('span'); w.className = 'split-w';
        const i = document.createElement('span'); i.textContent = p;
        w.append(i); el.append(w); out.push(i);
      }
    } else {
      // Elemento (p. ej. el punto de acento): se pega a la última palabra
      const ultimo = out[out.length - 1];
      if (ultimo) ultimo.append(n); else el.append(n);
    }
  }
  el.setAttribute('aria-label', el.textContent ?? '');
  return out;
}

/** Titulares: palabras que suben desde su máscara. */
export function revelarTitulares(root: ParentNode = document): void {
  if (sinMov) return;
  // El titular principal entra al cargar; el resto, al aparecer en pantalla
  for (const el of $$<HTMLElement>('[data-split]', root)) {
    const ws = partir(el);
    // Elemento LCP: arranca medio visible (55 %) y sin espera, para no retrasar el primer pintado
    animate(ws, { y: ['55%', '0%'], opacity: [0.35, 1] }, { duration: 0.9, delay: stagger(0.05), ease: EASE });
  }
  for (const el of $$<HTMLElement>('.h-section, .h-sub', root)) {
    const ws = partir(el);
    ws.forEach((w) => { w.style.transform = 'translateY(105%)'; });
    alAparecer(el, () => { animate(ws, { y: ['105%', '0%'] }, { duration: 0.8, delay: stagger(0.05), ease: EASE }); }, 0.1);
  }
}

/** Cifras que cuentan hacia arriba al aparecer. */
export function contarCifras(root: ParentNode = document): void {
  for (const el of $$<HTMLElement>('[data-contar]', root)) {
    const fin = Number(el.dataset['contar']);
    if (sinMov || !Number.isFinite(fin)) continue;
    el.textContent = '0';
    alAparecer(el, () => {
      animate(0, fin, { duration: 1.2, delay: 0.5, ease: EASE, onUpdate: (v) => { el.textContent = String(Math.round(v)); } });
    });
  }
}

/** Grupos de tarjetas que entran en cascada al aparecer. */
export function cascada(selector: string, root: ParentNode = document): void {
  if (sinMov) return;
  for (const grupo of $$<HTMLElement>(selector, root)) {
    const items = [...grupo.children] as HTMLElement[];
    items.forEach((i) => { i.style.opacity = '0'; });
    alAparecer(grupo, () => {
      animate(items.filter((i) => !i.hidden), { opacity: [0, 1], y: [28, 0], scale: [0.98, 1] }, { duration: 0.75, delay: stagger(0.06), ease: EASE })
        .then(() => items.forEach((i) => { i.style.opacity = ''; i.style.transform = ''; }));
    });
  }
}

/** Imágenes que se descubren de abajo hacia arriba (clip-path), con un leve zoom de salida. */
export function revelarImagenes(selector: string, root: ParentNode = document): void {
  if (sinMov) return;
  for (const el of $$<HTMLElement>(selector, root)) {
    el.style.clipPath = 'inset(100% 0 0 0)';
    alAparecer(el, () => {
      const img = el.querySelector('img');
      animate(el, { clipPath: ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'] }, { duration: 1, ease: EASE });
      if (img) animate(img, { scale: [1.18, 1] }, { duration: 1.4, ease: EASE });
    }, 0.12);
  }
}

/** Animación "layout" estilo Framer Motion: mide antes y después de un cambio de DOM y desliza (FLIP). */
export function flip(items: HTMLElement[], cambiar: () => void): void {
  if (sinMov) { cambiar(); return; }
  const antes = new Map(items.filter((i) => !i.hidden).map((i) => [i, i.getBoundingClientRect()]));
  cambiar();
  for (const i of items) {
    if (i.hidden) continue;
    const a = antes.get(i);
    const d = i.getBoundingClientRect();
    if (!a) {
      animate(i, { opacity: [0, 1], scale: [0.94, 1] }, { duration: 0.45, ease: EASE });
      continue;
    }
    const dx = a.left - d.left, dy = a.top - d.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    // Solo se anima lo que queda cerca de la pantalla
    if (d.bottom < -200 || d.top > window.innerHeight + 200) continue;
    animate(i, { x: [dx, 0], y: [dy, 0] }, { type: 'spring', stiffness: 260, damping: 30 });
  }
}

export function resorte(el: Element): void {
  if (sinMov) return;
  animate(el, { scale: [0.8, 1], opacity: [0, 1] }, { type: 'spring', stiffness: 420, damping: 22 });
}

export function contarHasta(el: HTMLElement, desde: number, hasta: number, formato: (n: number) => string): void {
  if (sinMov || desde === hasta) { el.textContent = formato(hasta); return; }
  animate(desde, hasta, { duration: 0.5, ease: EASE, onUpdate: (v) => { el.textContent = formato(Math.round(v)); } });
}
