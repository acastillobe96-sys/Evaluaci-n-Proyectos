// Controla el hero-película de /proyectos: el scroll mueve el progreso de la obra (con inercia
// dependiente del tiempo, no de los FPS), cambia de etapa con Motion y actualiza piso, riel y barra.
import { animate, stagger } from 'motion';
import { $, $$, reduceMotion } from './dom.ts';
import { Obra } from './obra.ts';

const EASE = [0.23, 1, 0.32, 1] as const;

export function iniciarPelicula(aplicar: (query: string) => void): void {
  const sec = $<HTMLElement>('[data-obra]');
  const canvas = $<HTMLCanvasElement>('.obra-canvas', sec ?? document);
  if (!sec || !canvas) return;

  const obra = new Obra(canvas, { semilla: 'hogar', pisos: 16, palabra: 'HOGAR', x: 0.68, xMovil: 0.5 });
  const intro = $<HTMLElement>('[data-intro]', sec)!;
  const etapas = $$<HTMLElement>('.obra-etapa', sec);
  const ats = etapas.map((e) => Number(e.dataset['at']));
  const rail = $$<HTMLButtonElement>('[data-ir]', sec);
  const piso = $<HTMLElement>('[data-piso]', sec)!;
  const barra = $<HTMLElement>('[data-barra]', sec)!;
  $<HTMLElement>('[data-pisos]', sec)!.textContent = `/ ${String(obra.totalPisos).padStart(2, '0')}`;

  let objetivo = 0, actual = 0, ultimo = performance.now(), activa = -2, visible = true, raf = 0;
  const sinMov = reduceMotion();

  const medir = () => {
    const r = sec.getBoundingClientRect();
    const total = sec.offsetHeight - window.innerHeight;
    objetivo = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
  };

  function mostrarEtapa(i: number): void {
    if (i === activa) return;
    const previa = activa;
    activa = i;
    const out = previa >= 0 ? etapas[previa] : previa === -1 ? intro : null;
    const inn = i >= 0 ? etapas[i] : intro;
    if (out && out !== inn) {
      if (sinMov) { out.style.opacity = '0'; out.dataset['activa'] = 'false'; }
      else animate(out, { opacity: 0, y: -18, filter: 'blur(4px)' }, { duration: 0.28, ease: 'easeIn' }).then(() => { if (out !== (activa >= 0 ? etapas[activa] : intro)) out.dataset['activa'] = 'false'; });
    }
    if (inn) {
      inn.dataset['activa'] = 'true';
      if (sinMov) { inn.style.opacity = '1'; }
      else {
        inn.style.opacity = '1'; inn.style.transform = 'none'; inn.style.filter = 'none';
        const hijos = [...inn.children] as HTMLElement[];
        animate(hijos, { opacity: [0, 1], y: [26, 0], filter: ['blur(6px)', 'blur(0px)'] }, { duration: 0.7, delay: stagger(0.07), ease: EASE });
      }
    }
    rail.forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
  }

  function etapaPara(p: number): number {
    if (p < 0.035) return -1; // intro
    let i = 0;
    for (let k = 0; k < ats.length; k++) if (p >= ats[k]! - 0.04) i = k;
    return i;
  }

  let pisoTxt = '';
  function pintar(p: number): void {
    obra.dibujar(p);
    mostrarEtapa(etapaPara(p));
    const t = String(obra.pisoEn(p)).padStart(2, '0');
    if (t !== pisoTxt) { pisoTxt = t; piso.textContent = t; }
    barra.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  function tick(ahora: number): void {
    const dt = Math.min(0.1, (ahora - ultimo) / 1000);
    ultimo = ahora;
    actual = sinMov ? objetivo : actual + (objetivo - actual) * (1 - Math.exp(-dt / 0.16));
    if (Math.abs(objetivo - actual) < 0.0002) actual = objetivo;
    pintar(actual);
    raf = actual !== objetivo && visible ? requestAnimationFrame(tick) : 0;
  }
  const despertar = () => { medir(); if (!raf && visible) { ultimo = performance.now(); raf = requestAnimationFrame(tick); } };

  // Estado inicial: intro visible (la entrada del intro la anima motion-fx con el texto partido)
  intro.dataset['activa'] = 'true';
  etapas.forEach((e) => { e.dataset['activa'] = 'false'; });
  activa = -1;
  medir(); actual = objetivo; pintar(actual);

  window.addEventListener('scroll', despertar, { passive: true });
  window.addEventListener('resize', () => { obra.medir(); despertar(); });
  new IntersectionObserver(([e]) => { visible = Boolean(e?.isIntersecting); if (visible) despertar(); }).observe(sec);
  void document.fonts?.ready.then(() => obra.medir());

  // Riel de etapas
  rail.forEach((b) => b.addEventListener('click', () => {
    const total = sec.offsetHeight - window.innerHeight;
    const top = sec.getBoundingClientRect().top + window.scrollY + Number(b.dataset['ir']) * total + 2;
    window.scrollTo({ top, behavior: sinMov ? 'auto' : 'smooth' });
  }));
  // Chips de etapa → aplican el filtro y bajan a los resultados
  $$<HTMLAnchorElement>('[data-aplicar]', sec).forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    aplicar(a.dataset['aplicar'] ?? '');
  }));
}
