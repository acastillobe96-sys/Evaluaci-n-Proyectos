// Comportamiento común: header transparente→sólido, menú único responsive, mega-menú, tema y reveal.
import { $, $$, onEscape } from './dom.ts';

const header = $<HTMLElement>('#site-header');
const nav = $<HTMLElement>('#nav');
const menuBtn = $<HTMLButtonElement>('#menu-btn');
const megaBtn = $<HTMLButtonElement>('#mega-btn');
const mega = $<HTMLElement>('#mega');
const megaMobile = $<HTMLElement>('#mega-mobile');
const desktop = window.matchMedia('(min-width: 1024px)');

// Header: sólido al pasar 24 px o con un menú abierto
let menuAbierto = false;
let megaAbierto = false;
function pintarHeader(): void {
  if (!header) return;
  const solido = header.dataset['solidFixed'] === 'true' || window.scrollY > 24 || menuAbierto || megaAbierto;
  const v = solido ? 'true' : 'false';
  if (header.dataset['solid'] !== v) header.dataset['solid'] = v;
}
window.addEventListener('scroll', pintarHeader, { passive: true });
pintarHeader();

// Menú móvil
function setMenu(open: boolean): void {
  if (!nav || !menuBtn) return;
  menuAbierto = open;
  nav.dataset['open'] = String(open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  document.documentElement.style.overflow = open ? 'hidden' : '';
  if (!open) setMega(false);
  pintarHeader();
}
menuBtn?.addEventListener('click', () => setMenu(!menuAbierto));
desktop.addEventListener('change', () => { setMenu(false); setMega(false); });

// Mega-menú: panel en escritorio, acordeón dentro del menú en móvil
function setMega(open: boolean): void {
  if (!megaBtn) return;
  megaAbierto = open && desktop.matches;
  megaBtn.setAttribute('aria-expanded', String(open));
  if (mega) mega.hidden = !(open && desktop.matches);
  if (megaMobile) megaMobile.hidden = !(open && !desktop.matches);
  pintarHeader();
}
megaBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  setMega(megaBtn.getAttribute('aria-expanded') !== 'true');
});
document.addEventListener('click', (e) => {
  if (megaAbierto && mega && !mega.contains(e.target as Node)) setMega(false);
});
onEscape(() => {
  if (megaBtn?.getAttribute('aria-expanded') === 'true') { setMega(false); megaBtn.focus(); return true; }
  if (menuAbierto) { setMenu(false); menuBtn?.focus(); return true; }
  return false;
});

// Tema: claro / oscuro (respeta el sistema hasta que la persona elige)
const themeBtn = $<HTMLButtonElement>('#theme-btn');
function temaActual(): 'light' | 'dark' {
  const t = document.documentElement.dataset['theme'];
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function pintarTemaBtn(): void {
  themeBtn?.setAttribute('aria-label', temaActual() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
}
themeBtn?.addEventListener('click', () => {
  const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset['theme'] = nuevo;
  try { localStorage.setItem('euro-theme', nuevo); } catch { /* almacenamiento bloqueado */ }
  pintarTemaBtn();
  document.dispatchEvent(new CustomEvent('tema'));
});
pintarTemaBtn();

// Reveal al hacer scroll (una vez)
const reveals = $$<HTMLElement>('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-in'));
}
