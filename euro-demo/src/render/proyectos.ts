import type { Proyecto, ProyectoLigero, SiteConfig } from '../lib/types.ts';
import { DORMITORIOS, ENTREGAS, ORDENES, rangoPrecios } from '../lib/filtros.ts';
import { formatUF, plural, whatsappUrl } from '../lib/format.ts';
import { html, icon, palabras, raw, url, type Ctx, type Raw } from './html.ts';
import { cardProyecto } from './card.ts';
import { footer, header, type Comuna } from './layout.ts';

export function ligero(p: Proyecto): ProyectoLigero {
  return {
    slug: p.slug, nombre: p.nombre, comuna: p.comuna, comunaSlug: p.comunaSlug, direccion: p.direccion,
    desdeUF: p.desdeUF, dormitorios: p.dormitorios, entregaTipo: p.entrega.tipo, entregaAnio: p.entrega.anio,
    entregaOrden: p.entrega.orden, entregaCorto: p.entrega.corto, subsidio: p.subsidio,
    lat: p.coords.lat, lng: p.coords.lng, precision: p.coords.precision,
    // En la demo la ilustración ya está en la card; el popup del mapa va sin imagen para no duplicarla
    img: p.imagenes.card ? (p.imagenes.card.svg ? null : `${p.imagenes.card.src.replace(/^\//, '')}-480.webp`) : null,
  };
}

/** Hero-película: el edificio se construye con el scroll; cada etapa enlaza con los proyectos en ese estado. */
function peliculaObra(ctx: Ctx, ps: Proyecto[], comunas: Comuna[]): Raw {
  const n = (f: (p: Proyecto) => boolean) => ps.filter(f).length;
  const e2028 = n((p) => p.entrega.anio === 2028);
  const e2027 = n((p) => p.entrega.anio === 2027);
  const inm = n((p) => p.entrega.tipo === 'inmediata');
  const sub = n((p) => p.subsidio);
  const desde = Math.min(...ps.map((p) => p.desdeUF));
  const etapas: Array<{ id: string; at: number; num: string; titulo: string; texto: string; chip?: { txt: string; q: string } }> = [
    { id: 'terreno', at: 0.02, num: '01', titulo: 'Todo parte en un buen barrio', texto: `Se despeja el terreno en una zona con transporte, comercio y áreas verdes. Hoy tenemos proyectos en ${comunas.length} comunas.`, chip: { txt: `Ver las ${comunas.length} comunas`, q: '' } },
    { id: 'verde', at: 0.14, num: '02', titulo: 'En verde: más plazo para el pie', texto: 'Excavación y fundaciones. Comprar en esta etapa te da más tiempo para juntar el pie, en cuotas.', chip: { txt: `${e2028} proyectos entregan en 2028`, q: 'entrega=2028' } },
    { id: 'gruesa', at: 0.36, num: '03', titulo: 'Obra gruesa, piso a piso', texto: 'La estructura sube cada semana. Ya puedes elegir piso, orientación y tipología.', chip: { txt: `${e2027} proyectos entregan en 2027`, q: 'entrega=2027' } },
    { id: 'terminaciones', at: 0.62, num: '04', titulo: 'Terminaciones y subsidio', texto: 'Ventanas termopanel, cocina equipada y piso porcelanato. En viviendas de hasta 4.000 UF, el subsidio baja tu tasa.', chip: { txt: `Subsidio a la tasa en ${sub} proyectos`, q: 'subsidio=1' } },
    { id: 'entrega', at: 0.86, num: '05', titulo: 'Llegar y vivir', texto: 'Departamentos terminados, con recepción municipal. Firmas, recibes las llaves y te cambias.', chip: { txt: `${inm} proyectos con entrega inmediata`, q: 'entrega=inmediata' } },
  ];
  return html`<section id="inicio" class="obra" aria-labelledby="obra-h1" data-obra data-frames="150" data-frames-base="${ctx.root}video/obra/">
  <div class="obra-sticky">
    <canvas class="obra-canvas" aria-hidden="true"></canvas>
    <div class="obra-shade" aria-hidden="true"></div>
    <div class="wrap obra-ui">
      <div class="obra-intro" data-intro>
        <p class="eyebrow enter text-accent">${ctx.demo ? 'Demo · Datos ficticios' : 'Proyectos · Santiago y Coquimbo'}</p>
        <h1 id="obra-h1" class="mt-4 font-display font-extrabold uppercase leading-[.9] text-white" style="font-size: clamp(2.6rem, 6.2vw, 5.4rem);" aria-label="Encuentra tu próximo departamento."><span class="split-css" aria-hidden="true">${palabras('Encuentra tu próximo departamento', html`<span class="dot">.</span>`)}</span></h1>
        <p class="enter-lcp mt-5 max-w-lg text-white/85 md:text-lg [animation-delay:200ms]">Desde ${formatUF(desde)}. Baja y mira cómo se construye un edificio, del terreno a las llaves, y qué proyectos hay en cada etapa.</p>
        <dl class="enter mt-7 grid max-w-md grid-cols-3 gap-4 border-t border-white/20 pt-5 [animation-delay:320ms]">
          <div class="flex flex-col-reverse"><dt class="text-sm text-white/75">proyectos</dt><dd class="font-display text-4xl font-extrabold leading-none text-white md:text-5xl" data-contar="${ps.length}">${ps.length}</dd></div>
          <div class="flex flex-col-reverse"><dt class="text-sm text-white/75">comunas</dt><dd class="font-display text-4xl font-extrabold leading-none text-white md:text-5xl" data-contar="${comunas.length}">${comunas.length}</dd></div>
          <div class="flex flex-col-reverse"><dt class="text-sm text-white/75">entrega inmediata</dt><dd class="font-display text-4xl font-extrabold leading-none text-white md:text-5xl" data-contar="${inm}">${inm}</dd></div>
        </dl>
      </div>
      <ol class="obra-etapas" aria-label="Etapas de un proyecto">
        ${etapas.map((e) => html`<li class="obra-etapa" data-at="${e.at}" id="etapa-${e.id}">
          <p class="eyebrow text-accent"><span class="font-mono">${e.num}</span> / ${e.id === 'verde' ? 'En verde' : e.id === 'gruesa' ? 'En obra' : e.id === 'terreno' ? 'Terreno' : e.id === 'terminaciones' ? 'Terminaciones' : 'Entrega'}</p>
          <h2 class="mt-3 font-display text-[clamp(2rem,4.2vw,3.5rem)] font-extrabold uppercase leading-[.92] text-white">${e.titulo}<span class="dot">.</span></h2>
          <p class="mt-3 max-w-md text-white/85">${e.texto}</p>
          ${e.chip ? html`<a class="btn btn-glass btn-sm mt-5" href="${url(ctx, `proyectos/${e.chip.q ? `?${e.chip.q}` : ''}`)}" data-aplicar="${e.chip.q}">${e.chip.txt} ${icon('arrow-right', 'size-4')}</a>` : ''}
        </li>`)}
      </ol>
    </div>
    <div class="obra-hud" aria-hidden="true">
      <span class="font-mono text-xs uppercase tracking-[.16em] text-white/70">Avance</span>
      <span class="font-mono text-2xl font-medium text-white" data-avance-obra>0</span>
      <span class="font-mono text-xs text-white/60">%</span>
    </div>
    <nav class="obra-rail" aria-label="Ir a una etapa">
      ${etapas.map((e) => html`<button type="button" data-ir="${e.at}" aria-label="Ir a la etapa ${e.num}"><span class="obra-rail-dot"></span><span class="obra-rail-txt">${e.num}</span></button>`)}
    </nav>
    <a href="#proyectos" class="obra-skip btn btn-glass btn-sm" data-saltar>${icon('chevron-down', 'size-4')} Ir al buscador</a>
    <p class="obra-credito">Animación ilustrativa generada con IA (Canva). No corresponde a un proyecto real.</p>
    <div class="obra-progress" aria-hidden="true"><span data-barra></span></div>
  </div>
</section>`;
}

function grupoComuna(comunas: Comuna[]): Raw {
  return html`<div class="fg" data-fg="comuna">
    <button type="button" class="fg-trigger" aria-expanded="false" aria-controls="fgb-comuna">Comuna <span class="fg-count" data-count="comuna"></span>${icon('chevron-down', 'size-4 mega-chev')}</button>
    <div class="fg-body" id="fgb-comuna">
      <fieldset>
        <legend class="fg-legend">Comuna</legend>
        <div class="fg-options">
          ${comunas.map((c) => html`<label class="opt"><input type="checkbox" name="comuna" value="${c.slug}"><span class="flex-1">${c.nombre}</span><span class="text-xs text-muted">${c.proyectos.length}</span></label>`)}
        </div>
      </fieldset>
    </div>
  </div>`;
}

function grupoBotones(nombre: string, titulo: string, opciones: Array<{ valor: string; etiqueta: string }>, ayuda: string): Raw {
  return html`<div class="fg" data-fg="${nombre}">
    <button type="button" class="fg-trigger" aria-expanded="false" aria-controls="fgb-${nombre}">${titulo} <span class="fg-count" data-count="${nombre}"></span>${icon('chevron-down', 'size-4 mega-chev')}</button>
    <div class="fg-body" id="fgb-${nombre}">
      <div role="group" aria-labelledby="fgl-${nombre}">
        <p class="fg-legend" id="fgl-${nombre}">${titulo}</p>
        <div class="flex flex-wrap gap-2">
          ${opciones.map((o) => html`<button type="button" class="toggle-btn" data-${nombre}="${o.valor}" aria-pressed="false">${o.etiqueta}</button>`)}
        </div>
        <p class="mt-2 text-xs text-muted">${ayuda}</p>
      </div>
    </div>
  </div>`;
}

function grupoPrecio(min: number, max: number): Raw {
  return html`<div class="fg" data-fg="precio">
    <button type="button" class="fg-trigger" aria-expanded="false" aria-controls="fgb-precio">Precio <span class="fg-count" data-count="precio"></span>${icon('chevron-down', 'size-4 mega-chev')}</button>
    <div class="fg-body fg-body-wide" id="fgb-precio">
      <label for="precio" class="fg-legend !block">Precio desde, hasta</label>
      <div class="flex items-baseline justify-between gap-3">
        <output for="precio" id="precio-out" class="font-display text-2xl font-extrabold">Sin tope</output>
        <span class="text-xs text-muted">${formatUF(min)} – ${formatUF(max)}</span>
      </div>
      <input id="precio" class="range mt-2" type="range" min="${min}" max="${max}" step="100" value="${max}" aria-describedby="precio-ayuda">
      <p id="precio-ayuda" class="mt-1 text-xs text-muted">Muestra proyectos cuyo precio "desde" no supera el valor elegido.</p>
    </div>
  </div>`;
}

function toolbar(ps: ProyectoLigero[], comunas: Comuna[]): Raw {
  const { min, max } = rangoPrecios(ps);
  return html`<div id="barra" class="barra sticky z-30" style="top: var(--header-h)">
  <div class="wrap">
    <div class="barra-inner flex items-center gap-2 py-3">
      <button type="button" class="btn btn-outline btn-sm lg:hidden" id="filtros-btn" aria-haspopup="dialog" aria-controls="filtros">${icon('sliders', 'size-4')} Filtros <span class="badge badge-accent !px-1.5 !py-0.5" id="filtros-n" hidden></span></button>
      <div id="filtros" class="filter-panel" aria-label="Filtros de proyectos" data-open="false">
        <div class="sheet-head">
          <p class="font-display text-2xl font-extrabold uppercase">Filtros<span class="dot">.</span></p>
          <button type="button" class="btn btn-outline btn-icon" data-cerrar-filtros aria-label="Cerrar filtros">${icon('x', 'size-5')}</button>
        </div>
        <div class="fgroups">
          ${grupoComuna(comunas)}
          ${grupoBotones('dorm', 'Dormitorios', DORMITORIOS.map((d) => ({ valor: String(d), etiqueta: d === 3 ? '3' : String(d) })), 'Puedes elegir más de uno.')}
          ${grupoBotones('entrega', 'Entrega', ENTREGAS.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta })), 'Inmediata, o año estimado de entrega.')}
          ${grupoPrecio(min, max)}
          <div class="fg fg-inline">
            <button type="button" role="switch" aria-checked="false" id="subsidio" class="fg-switch">
              <span class="switch" aria-hidden="true"></span>
              <span>Subsidio a la tasa</span>
            </button>
          </div>
        </div>
        <div class="sheet-foot">
          <button type="button" class="btn btn-outline" data-limpiar>Limpiar</button>
          <button type="button" class="btn btn-primary flex-1" data-cerrar-filtros><span id="ver-n">Ver ${ps.length} proyectos</span></button>
        </div>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <label class="sr-only" for="orden">Ordenar por</label>
        <div class="relative">
          <select id="orden" class="field min-w-[10.5rem] !min-h-[40px] !rounded-full !py-0 !pl-4 !pr-9 text-sm font-bold appearance-none">
            ${ORDENES.map((o) => html`<option value="${o.valor}">${o.etiqueta}</option>`)}
          </select>
          ${icon('chevron-down', 'size-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2')}
        </div>
        <div class="seg" role="group" aria-label="Vista">
          <button type="button" data-vista="grilla" aria-pressed="true" aria-label="Vista grilla">${icon('grid', 'size-4')}<span class="max-sm:sr-only lg:max-xl:sr-only">Grilla</span></button>
          <button type="button" data-vista="mapa" aria-pressed="false" aria-label="Vista mapa">${icon('map', 'size-4')}<span class="max-sm:sr-only lg:max-xl:sr-only">Mapa</span></button>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

function vacio(ctx: Ctx, cfg: SiteConfig): Raw {
  return html`<div id="vacio" class="mx-auto max-w-lg py-20 text-center" hidden>
  <div class="mx-auto grid size-16 place-items-center rounded-full bg-surface-2">${icon('building', 'size-8 text-muted')}</div>
  <h3 class="mt-6 font-display text-3xl font-extrabold uppercase">Sin proyectos con esos filtros<span class="dot">.</span></h3>
  <p class="mt-3 text-muted">Prueba quitando un filtro o ampliando el precio. Si buscas algo puntual, un ejecutivo te puede orientar.</p>
  <div class="mt-6 flex flex-wrap justify-center gap-2">
    <button type="button" class="btn btn-dark" data-limpiar>Limpiar filtros</button>
    ${cfg.whatsapp ? html`<a class="btn btn-outline" href="${whatsappUrl(cfg.whatsapp)}" target="_blank" rel="noopener">${icon('whatsapp', 'size-4')} Hablar con un ejecutivo</a>` : ''}
  </div>
  <a href="${url(ctx, 'proyectos/')}" class="sr-only">Ver todos los proyectos</a>
</div>`;
}

function procesoDemo(): Raw {
  const pasos = [
    ['Cotiza', 'Elige comuna, entrega y tipología, y pide tu cotización.'],
    ['Reserva', 'Reserva el departamento con la preaprobación de tu crédito.'],
    ['Promesa', 'Firmas la promesa de compraventa con precio y plazos.'],
    ['Escritura', 'Gestionas el crédito y firmas la escritura.'],
    ['Entrega', 'Recibes tu departamento y comienza la post venta.'],
  ];
  return html`<section id="confianza" class="bg-deep-2 py-[clamp(4rem,9vw,8rem)] text-white" aria-labelledby="confianza-t">
  <div class="wrap">
    <div class="reveal max-w-2xl">
      <p class="eyebrow text-accent">Cómo se compra</p>
      <h2 id="confianza-t" class="h-section mt-3 !text-white">Cinco pasos<span class="dot">.</span></h2>
      <p class="mt-5 text-lg text-white/85">El camino habitual para comprar un departamento nuevo en Chile, desde la cotización hasta la entrega.</p>
    </div>
    <ol class="mt-12 grid gap-px overflow-hidden rounded-[22px] bg-white/15 sm:grid-cols-2 lg:grid-cols-5">
      ${pasos.map(([t, d], i) => html`<li class="reveal flex flex-col gap-3 bg-deep-2 p-6" style="transition-delay:${i * 70}ms">
        <span class="font-display text-5xl font-extrabold leading-none text-accent">${i + 1}</span>
        <span class="text-lg font-bold">${t}</span>
        <span class="text-sm text-white/80">${d}</span>
      </li>`)}
    </ol>
  </div>
</section>`;
}

function confianza(cfg: SiteConfig): Raw {
  if (cfg.demo) return procesoDemo();
  const datos = [
    { n: '+35', t: 'años desarrollando vivienda', s: 'Para vivir o invertir' },
    { n: '+20.000', t: 'departamentos vendidos', s: 'En los últimos 15 años' },
    { n: '+9.000', t: 'unidades en desarrollo', s: 'Hoy, en distintas comunas' },
  ];
  const garantias = [
    'Reserva tu departamento con 3 UF.',
    'Pie en cuotas: confirma el número con tu ejecutivo.',
    'Devolución de la promesa si quedas cesante o no te aprueban el crédito.',
    'Cesión de derechos.',
  ];
  return html`<section id="confianza" class="bg-deep-2 py-[clamp(4rem,9vw,8rem)] text-white" aria-labelledby="confianza-t">
  <div class="wrap">
    <div class="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end">
      <div class="reveal">
        <p class="eyebrow text-accent">Grupo Euro</p>
        <h2 id="confianza-t" class="h-section mt-3 !text-white">Compra con respaldo<span class="dot">.</span></h2>
        <p class="mt-5 max-w-lg text-lg text-white/85">Te acompañamos desde la cotización hasta la entrega, y después con post venta durante la garantía legal.</p>
      </div>
      <ul class="reveal grid gap-3 text-white/90">
        ${garantias.map((g) => html`<li class="flex gap-3">${icon('check-circle', 'size-6 shrink-0 text-accent')}<span>${g}</span></li>`)}
      </ul>
    </div>
    <dl class="mt-14 grid gap-px overflow-hidden rounded-[22px] bg-white/15 sm:grid-cols-3">
      ${datos.map((d, i) => html`<div class="reveal flex flex-col gap-4 bg-deep-2 p-6 md:p-8" style="transition-delay: ${i * 80}ms">
        <dt class="text-white/80"><span class="block font-bold text-white">${d.t}</span><span class="text-sm">${d.s}</span></dt>
        <dd class="order-first font-display font-extrabold leading-none" style="font-size: clamp(3rem, 6vw, 5rem)">${d.n}</dd>
      </div>`)}
    </dl>
    <div class="reveal mt-12 flex flex-col items-start justify-between gap-6 rounded-[22px] border border-white/15 p-6 md:flex-row md:items-center md:p-8">
      <div>
        <p class="font-display text-[2rem] font-extrabold uppercase leading-none">¿Dudas sobre cuál te conviene?</p>
        <p class="mt-2 text-white/80">Un ejecutivo te orienta por WhatsApp, de lunes a viernes.</p>
      </div>
      <a class="btn btn-primary" href="${whatsappUrl(cfg.whatsapp)}" target="_blank" rel="noopener">${icon('whatsapp', 'size-5')} Hablar con un ejecutivo</a>
    </div>
    <p class="mt-6 text-xs text-white/60">Cifras de euroinmobiliaria.cl/sobre-euro-inmobiliaria.</p>
  </div>
</section>`;
}

export function paginaProyectos(ctx: Ctx, cfg: SiteConfig, ps: Proyecto[], comunas: Comuna[]): Raw {
  const lig = ps.map(ligero);
  return html`${header(ctx, cfg, comunas, 'proyectos', false)}
<main id="contenido">
  ${peliculaObra(ctx, ps, comunas)}
  ${toolbar(lig, comunas)}
  <section id="proyectos" class="wrap pb-[clamp(4rem,9vw,7rem)] pt-4" aria-labelledby="resultados-t">
    <div class="flex flex-wrap items-center justify-between gap-3 pb-5 pt-2">
      <h2 id="resultados-t" class="text-[.9375rem] text-muted" aria-live="polite"><strong class="text-ink" id="res-count">${plural(ps.length, 'proyecto', 'proyectos')}</strong> <span id="res-sub">en ${comunas.length} comunas</span></h2>
      <div id="chips" class="flex flex-wrap items-center gap-2" hidden></div>
    </div>
    <ul id="grilla" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6" role="list">
      ${ps.map((p, i) => cardProyecto(ctx, cfg, p, i))}
    </ul>
    <div id="mapa-wrap" class="relative" hidden>
      <div id="mapa" class="h-[min(72svh,720px)] min-h-[420px] w-full overflow-hidden rounded-[22px] bg-surface-2" role="region" aria-label="Mapa de proyectos"></div>
      <div id="mapa-extra" class="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap gap-2"></div>
    </div>
    ${vacio(ctx, cfg)}
  </section>
  ${confianza(cfg)}
</main>
${footer(ctx, cfg)}
<script type="application/json" id="datos-proyectos">${raw(JSON.stringify({ proyectos: lig, comunas: comunas.map((c) => ({ slug: c.slug, nombre: c.nombre })), ufCLP: cfg.ufCLP, whatsapp: cfg.whatsapp, root: ctx.root, explicitIndex: ctx.explicitIndex, demo: ctx.demo }).replace(/</g, '\\u003c'))}</script>`;
}

