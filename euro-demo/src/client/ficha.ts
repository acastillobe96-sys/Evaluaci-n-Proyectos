// Ficha de proyecto: lightbox, mapa diferido, preselección de tipología y formulario con validación (solo front).
import { $, $$ } from './dom.ts';
import { iniciarLightbox } from './lightbox.ts';
import { validarCotizacion, type CamposCotizacion } from '../lib/validacion.ts';

iniciarLightbox();

// Mapa: se carga cuando la sección se acerca a la pantalla
const mapaEl = $<HTMLElement>('#mapa-ficha');
if (mapaEl) {
  const root = '../../'; // las fichas viven en proyectos/<slug>/
  const io = new IntersectionObserver(async ([e]) => {
    if (!e?.isIntersecting) return;
    io.disconnect();
    const { crearMapaFicha } = await import('./mapa.ts');
    await crearMapaFicha(mapaEl, root);
  }, { rootMargin: '400px 0px' });
  io.observe(mapaEl);
}

// "Cotizar" en una tipología → preselecciona en el formulario
const tipSel = $<HTMLSelectElement>('#f-tip');
$$<HTMLAnchorElement>('[data-tipologia]').forEach((a) => a.addEventListener('click', () => {
  if (tipSel) tipSel.value = a.dataset['tipologia'] ?? '';
  setTimeout(() => $<HTMLInputElement>('#f-nombre')?.focus({ preventScroll: true }), 450);
}));

// Formulario
const form = $<HTMLFormElement>('#form-cotizar');
const ok = $<HTMLElement>('#form-ok');
const CAMPOS: Record<keyof CamposCotizacion, { input: string; error: string }> = {
  nombre: { input: '#f-nombre', error: '#e-nombre' },
  email: { input: '#f-email', error: '#e-email' },
  telefono: { input: '#f-tel', error: '#e-tel' },
  rut: { input: '#f-rut', error: '#e-rut' },
  tipologia: { input: '#f-tip', error: '#e-tip' },
  acepta: { input: '#f-acepta', error: '#e-acepta' },
};

function leer(): CamposCotizacion {
  const v = (s: string) => ($<HTMLInputElement>(s)?.value ?? '').trim();
  return {
    nombre: v('#f-nombre'), email: v('#f-email'), telefono: v('#f-tel'), rut: v('#f-rut'),
    tipologia: v('#f-tip'), acepta: $<HTMLInputElement>('#f-acepta')?.checked ?? false,
  };
}

function mostrar(errores: Partial<Record<keyof CamposCotizacion, string>>, soloCampo?: keyof CamposCotizacion): void {
  for (const [k, sel] of Object.entries(CAMPOS) as Array<[keyof CamposCotizacion, { input: string; error: string }]>) {
    if (soloCampo && k !== soloCampo) continue;
    const input = $<HTMLElement>(sel.input);
    const err = $<HTMLElement>(sel.error);
    const msg = errores[k];
    input?.setAttribute('aria-invalid', String(Boolean(msg)));
    if (err) { err.hidden = !msg; err.textContent = msg ?? ''; }
  }
}

if (form && ok) {
  // Valida al salir de cada campo solo si ya tiene contenido o ya mostró error
  for (const [k, sel] of Object.entries(CAMPOS) as Array<[keyof CamposCotizacion, { input: string; error: string }]>) {
    const input = $<HTMLInputElement>(sel.input);
    input?.addEventListener('blur', () => {
      if (input.type !== 'checkbox' && !input.value && input.getAttribute('aria-invalid') !== 'true') return;
      mostrar(validarCotizacion(leer()).errores, k);
    });
  }
  // Formato de RUT al escribir: 12345678-5 → 12.345.678-5
  const rut = $<HTMLInputElement>('#f-rut');
  rut?.addEventListener('blur', () => {
    const limpio = rut.value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (limpio.length < 2) return;
    const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    rut.value = `${cuerpo}-${limpio.slice(-1)}`;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { valido, errores } = validarCotizacion(leer());
    mostrar(errores);
    if (!valido) {
      const primero = (Object.keys(CAMPOS) as Array<keyof CamposCotizacion>).find((k) => errores[k]);
      if (primero) $<HTMLElement>(CAMPOS[primero].input)?.focus();
      return;
    }
    const d = leer();
    const txt = $('#form-ok-txt', ok);
    if (txt) txt.textContent = `Gracias, ${d.nombre.split(' ')[0]}. Recibimos tu interés en ${d.tipologia === 'No sé aún' ? form.dataset['proyecto'] : `${d.tipologia} de ${form.dataset['proyecto']}`}. Te escribiremos a ${d.email}.`;
    form.hidden = true;
    ok.hidden = false;
    ok.focus();
  });
}
