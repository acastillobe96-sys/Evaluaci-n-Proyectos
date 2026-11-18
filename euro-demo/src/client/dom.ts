// Utilidades mínimas de DOM tipadas.
export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => [...root.querySelectorAll<T>(sel)];

const escapeHandlers: Array<() => boolean> = [];
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  // El último registrado tiene prioridad; se detiene en el primero que cierra algo.
  for (let i = escapeHandlers.length - 1; i >= 0; i--) if (escapeHandlers[i]!()) return;
});
/** Registra un manejador de Escape. Debe devolver true si cerró algo. */
export function onEscape(fn: () => boolean): void {
  escapeHandlers.push(fn);
}

export const reduceMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Mantiene el foco dentro de un contenedor mientras está abierto. Devuelve la función que lo libera. */
export function trapFocus(el: HTMLElement): () => void {
  const sel = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const f = $$<HTMLElement>(sel, el).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0]!, last = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  el.addEventListener('keydown', onKey);
  return () => el.removeEventListener('keydown', onKey);
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}
