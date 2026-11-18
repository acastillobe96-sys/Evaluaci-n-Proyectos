// Lightbox accesible: diálogo modal, teclado (←/→/Esc), deslizamiento táctil y foco atrapado.
import { $, $$, escapeHtml, onEscape, trapFocus } from './dom.ts';

interface Item { src: string; srcset: string; alt: string; w: number; h: number }

let abierto: { el: HTMLElement; liberar: () => void; volver: HTMLElement | null } | null = null;

function cerrar(): void {
  if (!abierto) return;
  abierto.liberar();
  abierto.el.remove();
  document.documentElement.style.overflow = '';
  abierto.volver?.focus({ preventScroll: true });
  abierto = null;
}

function abrir(items: Item[], inicio: number, volver: HTMLElement | null, titulo: string): void {
  cerrar();
  let i = inicio;
  const el = document.createElement('div');
  el.className = 'lb flex flex-col';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', titulo);
  el.innerHTML = `
    <div class="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
      <p class="text-sm font-bold" aria-live="polite" data-lb-count></p>
      <button type="button" class="btn btn-glass btn-icon" data-lb-close aria-label="Cerrar"><svg class="size-5" aria-hidden="true"><use href="#i-x"></use></svg></button>
    </div>
    <div class="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-20" data-lb-stage></div>
    <p class="px-4 pb-5 pt-3 text-center text-sm text-white/80 md:px-6" data-lb-alt></p>
    <button type="button" class="btn btn-glass btn-icon absolute left-3 top-1/2 -translate-y-1/2 max-md:hidden" data-lb-prev aria-label="Imagen anterior"><svg class="size-5" aria-hidden="true"><use href="#i-chevron-left"></use></svg></button>
    <button type="button" class="btn btn-glass btn-icon absolute right-3 top-1/2 -translate-y-1/2 max-md:hidden" data-lb-next aria-label="Imagen siguiente"><svg class="size-5" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>`;
  const stage = $<HTMLElement>('[data-lb-stage]', el)!;
  const pintar = () => {
    const it = items[i]!;
    stage.innerHTML = `<img src="${escapeHtml(it.src)}" srcset="${escapeHtml(it.srcset)}" sizes="100vw" width="${it.w}" height="${it.h}" alt="${escapeHtml(it.alt)}" class="max-h-full max-w-full rounded-xl object-contain${titulo.startsWith('Plantas') ? ' bg-white' : ''}">`;
    $('[data-lb-count]', el)!.textContent = `${i + 1} de ${items.length}`;
    $('[data-lb-alt]', el)!.textContent = it.alt;
  };
  const ir = (d: number) => { i = (i + d + items.length) % items.length; pintar(); };
  $('[data-lb-close]', el)!.addEventListener('click', cerrar);
  $('[data-lb-prev]', el)!.addEventListener('click', () => ir(-1));
  $('[data-lb-next]', el)!.addEventListener('click', () => ir(1));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') ir(-1);
    else if (e.key === 'ArrowRight') ir(1);
  });
  stage.addEventListener('click', (e) => { if (e.target === stage) cerrar(); });
  let x0: number | null = null;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0]?.clientX ?? null; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    const x1 = e.changedTouches[0]?.clientX;
    if (x0 != null && x1 != null && Math.abs(x1 - x0) > 40) ir(x1 < x0 ? 1 : -1);
    x0 = null;
  });
  if (items.length < 2) $$('[data-lb-prev], [data-lb-next]', el).forEach((b) => b.remove());
  pintar();
  document.body.append(el);
  document.documentElement.style.overflow = 'hidden';
  abierto = { el, liberar: trapFocus(el), volver };
  $<HTMLElement>('[data-lb-close]', el)!.focus();
}

export function iniciarLightbox(): void {
  const grupos = new Map<string, Item[]>();
  $$<HTMLScriptElement>('script[data-lb-data]').forEach((s) => grupos.set(s.dataset['lbData']!, JSON.parse(s.textContent ?? '[]') as Item[]));
  document.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-lb-open]');
    if (!b) return;
    const g = b.dataset['lbGroup'] ?? 'galeria';
    const items = grupos.get(g);
    if (!items?.length) return;
    abrir(items, Number(b.dataset['lbOpen']) || 0, b, g === 'plantas' ? 'Plantas de las tipologías' : 'Galería de imágenes');
  });
  onEscape(() => { if (abierto) { cerrar(); return true; } return false; });
}
