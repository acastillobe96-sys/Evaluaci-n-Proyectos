import type { Proyecto, SiteConfig } from '../lib/types.ts';
import { formatCLPAprox, formatMiles, formatTipologia, formatUF, whatsappUrl } from '../lib/format.ts';
import { html, icon, picture, raw, url, type Ctx, type Raw } from './html.ts';
import { cardProyecto } from './card.ts';
import { footer, header, type Comuna } from './layout.ts';

const ICONO_CATEGORIA: Record<string, string> = {
  Transporte: 'train', 'Áreas Verdes': 'leaf', Comercio: 'cart', Salud: 'health', Educación: 'school',
};

function heroFicha(ctx: Ctx, p: Proyecto): Raw {
  const img = p.imagenes.hero;
  return html`<section id="inicio" class="relative isolate overflow-hidden bg-deep-2 text-white">
  <div class="absolute inset-0 -z-10">
    ${img ? picture(ctx, img, { sizes: '100vw', cls: 'size-full object-cover object-right', eager: true, priority: true }) : ''}
    <div class="absolute inset-0" aria-hidden="true" style="background: linear-gradient(90deg, rgb(var(--deep-2)) 0%, rgb(var(--deep-2) / .82) 34%, rgb(var(--deep-2) / .1) 72%), linear-gradient(0deg, rgb(var(--deep-2) / .9) 0%, transparent 45%);"></div>
  </div>
  <div class="wrap flex min-h-[min(62svh,560px)] md:min-h-[min(78svh,680px)] flex-col justify-end pb-28 pt-[calc(var(--header-h)+2.5rem)] md:pb-32">
    <nav aria-label="Ruta de navegación" class="enter text-sm">
      <ol class="flex flex-wrap items-center gap-1.5 text-white/80">
        <li><a class="hover:text-white hover:underline" href="${url(ctx, 'proyectos/')}">Proyectos</a></li>
        <li aria-hidden="true">${icon('chevron-right', 'size-3.5')}</li>
        <li><a class="hover:text-white hover:underline" href="${url(ctx, `proyectos/?comuna=${p.comunaSlug}`)}">${p.comuna}</a></li>
        <li aria-hidden="true">${icon('chevron-right', 'size-3.5')}</li>
        <li><span aria-current="page" class="text-white">${p.nombre}</span></li>
      </ol>
    </nav>
    <div class="enter mt-5 flex flex-wrap gap-2 [animation-delay:60ms]">
      ${p.entrega.tipo === 'inmediata' ? html`<span class="badge badge-accent">${icon('key', 'size-3.5')} Entrega inmediata</span>` : html`<span class="badge badge-glass">${icon('calendar', 'size-3.5')} ${p.entrega.corto}</span>`}
      ${p.subsidio ? html`<span class="badge badge-glass">${icon('percent', 'size-3.5')} Subsidio a la tasa</span>` : ''}
    </div>
    <h1 class="enter-lcp mt-4 max-w-3xl font-display font-extrabold uppercase leading-[.88] [animation-delay:120ms]" style="font-size: clamp(3rem, 9vw, 7.5rem)">${p.nombre}<span class="dot">.</span></h1>
    <p class="enter mt-4 flex items-center gap-2 text-lg text-white/90 [animation-delay:180ms]">${icon('pin', 'size-5 shrink-0')} ${p.direccion}, ${p.comuna}</p>
  </div>
</section>`;
}

function resumen(cfg: SiteConfig, p: Proyecto): Raw {
  const item = (ic: string, t: string, v: Raw | string, s?: string) => html`<div class="p-5 md:p-6">
    <dt class="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-muted"><span class="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-accent-ink">${icon(ic, 'size-4')}</span>${t}</dt>
    <dd class="mt-2 font-bold leading-snug">${v}${s ? html`<span class="block text-sm font-normal text-muted">${s}</span>` : ''}</dd>
  </div>`;
  return html`<section aria-label="Resumen del proyecto" id="resumen" class="wrap relative z-10 -mt-20">
  <div class="enter overflow-hidden rounded-[22px] bg-surface [animation-delay:240ms]" style="box-shadow: var(--shadow-2)">
    <div class="grid lg:grid-cols-[1.15fr_2.6fr_auto]">
      <div class="border-b border-line p-6 lg:border-b-0 lg:border-r">
        <p class="text-xs font-bold uppercase tracking-[.12em] text-muted">Desde</p>
        <p class="mt-1 font-display text-[2.75rem] font-extrabold leading-none">${formatUF(p.desdeUF)}</p>
        <p class="mt-1 text-sm text-muted">${formatCLPAprox(p.desdeUF, cfg.ufCLP)} <span class="whitespace-nowrap">(UF $${formatMiles(cfg.ufCLP)}, ${cfg.ufFecha})</span></p>
      </div>
      <dl class="grid divide-line sm:grid-cols-3 sm:divide-x">
        ${item('calendar', 'Entrega', p.entrega.largo)}
        ${item('bed', 'Tipologías', formatTipologia(p.dormitorios, p.banos), `${p.tipologias.length} modelos`)}
        ${item('train', 'Cerca de', p.metro ?? p.comuna, p.direccion)}
      </dl>
      <div class="flex flex-col justify-center gap-2 border-t border-line p-5 lg:border-l lg:border-t-0">
        <a class="btn btn-primary" href="#cotizar">Cotizar</a>
        ${cfg.whatsapp ? html`<a class="btn btn-outline" href="${whatsappUrl(cfg.whatsapp, p.nombre)}" target="_blank" rel="noopener">${icon('whatsapp', 'size-4')} WhatsApp</a>` : html`<a class="btn btn-outline" href="#tipologias">Ver tipologías</a>`}
      </div>
    </div>
  </div>
</section>`;
}

function descripcion(cfg: SiteConfig, p: Proyecto): Raw {
  const [primero, ...resto] = p.descripcion.parrafos;
  return html`<section id="descripcion" class="wrap grid gap-12 py-[clamp(4rem,8vw,7rem)] lg:grid-cols-[1fr_380px]" aria-labelledby="desc-t">
  <div class="reveal">
    <p class="eyebrow text-accent-ink">El proyecto</p>
    <h2 id="desc-t" class="h-sub mt-3 max-w-2xl">${p.descripcion.titulo ?? `Vive en ${p.comuna}`}<span class="dot">.</span></h2>
    ${primero ? html`<p class="mt-6 max-w-2xl text-lg">${primero}</p>` : ''}
    ${resto.length ? html`<details class="group mt-4 max-w-2xl">
      <summary class="link inline-flex cursor-pointer list-none items-center gap-1">Leer más ${icon('chevron-down', 'size-4 transition-transform duration-200 group-open:rotate-180')}</summary>
      <div class="mt-4 space-y-4 text-muted">${resto.map((r) => html`<p>${r}</p>`)}</div>
    </details>` : ''}
  </div>
  ${p.beneficios.length ? html`<aside class="reveal self-start rounded-[22px] border border-line bg-surface p-6" aria-labelledby="ben-t">
    <h3 id="ben-t" class="eyebrow text-accent-ink">Beneficios vigentes</h3>
    <ul class="mt-4 space-y-3">
      ${p.beneficios.map((b) => html`<li class="flex gap-3">${icon('check-circle', 'size-5 shrink-0 mt-0.5 text-accent-ink')}<span>${b}</span></li>`)}
    </ul>
    ${cfg.demo ? html`<p class="mt-5 text-xs text-muted">Beneficios de ejemplo.</p>` : html`<p class="mt-5 text-xs text-muted">Según la ficha del proyecto en euroinmobiliaria.cl. Sujetos a <a class="underline" href="https://euroinmobiliaria.cl/bases-notariales">bases notariales</a>.</p>`}
  </aside>` : ''}
</section>`;
}

function galeria(ctx: Ctx, p: Proyecto): Raw {
  const g = p.imagenes.galeria;
  if (!g.length) return html``;
  const visibles = g.slice(0, 5);
  return html`<section id="galeria" class="wrap pb-[clamp(4rem,8vw,7rem)]" aria-labelledby="gal-t">
  <div class="flex items-end justify-between gap-4">
    <h2 id="gal-t" class="h-section reveal">Galería<span class="dot">.</span></h2>
    <button type="button" class="btn btn-outline btn-sm" data-lb-open="0" data-lb-group="galeria">${icon('expand', 'size-4')} Ver ${g.length} imágenes</button>
  </div>
  <ul class="gal-grid mt-8 grid gap-2 md:gap-3" role="list">
    ${visibles.map((img, i) => html`<li class="${i === 0 ? 'gal-main' : ''} relative overflow-hidden rounded-[18px] bg-surface-2">
      <button type="button" class="gal-btn block size-full" data-lb-open="${i}" data-lb-group="galeria" aria-label="Ampliar: ${img.alt}">
        ${picture(ctx, img, { sizes: i === 0 ? '(min-width: 768px) 60vw, 100vw' : '(min-width: 768px) 20vw, 50vw', cls: 'size-full object-cover' })}
        ${i === visibles.length - 1 && g.length > visibles.length ? html`<span class="absolute inset-0 grid place-items-center bg-deep-2/60 font-display text-3xl font-extrabold text-white">+${g.length - visibles.length}</span>` : ''}
      </button>
    </li>`)}
  </ul>
  <script type="application/json" data-lb-data="galeria">${raw(JSON.stringify(g.map((img) => ({
    src: img.svg ?? `${ctx.root}${img.src.replace(/^\//, '')}-${img.anchos[img.anchos.length - 1]}.webp`,
    srcset: img.svg ? '' : img.anchos.map((a) => `${ctx.root}${img.src.replace(/^\//, '')}-${a}.webp ${a}w`).join(', '),
    alt: img.alt, w: img.w, h: img.h,
  }))).replace(/</g, '\\u003c'))}</script>
</section>`;
}

function tipologias(ctx: Ctx, cfg: SiteConfig, p: Proyecto): Raw {
  const plantas = p.tipologias.map((t) => t.planta ? {
    src: t.planta.svg ?? `${ctx.root}${t.planta.src.replace(/^\//, '')}-${t.planta.anchos[t.planta.anchos.length - 1]}.webp`,
    srcset: t.planta.svg ? '' : t.planta.anchos.map((a) => `${ctx.root}${t.planta!.src.replace(/^\//, '')}-${a}.webp ${a}w`).join(', '),
    alt: `Planta tipología ${t.nombre}, ${p.nombre}`, w: t.planta.w, h: t.planta.h,
  } : null);
  let idx = -1;
  return html`<section id="tipologias" class="bg-surface py-[clamp(4rem,8vw,7rem)]" aria-labelledby="tip-t">
  <div class="wrap">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="reveal">
        <p class="eyebrow text-accent-ink">${p.tipologias.length} tipologías</p>
        <h2 id="tip-t" class="h-section mt-3">Elige tu planta<span class="dot">.</span></h2>
      </div>
      ${p.brochure ? html`<a class="btn btn-outline btn-sm" href="${p.brochure}" target="_blank" rel="noopener">${icon('download', 'size-4')} Descargar brochure (PDF)</a>` : ''}
    </div>
    <ul class="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" role="list">
      ${p.tipologias.map((t, i) => {
        if (t.planta) idx++;
        const lbIndex = idx;
        return html`<li class="reveal flex" style="transition-delay:${(i % 3) * 70}ms">
        <article class="flex w-full flex-col overflow-hidden rounded-[20px] border border-line bg-paper">
          <div class="relative aspect-[16/10] bg-white">
            ${t.planta ? html`<button type="button" class="group block size-full" data-lb-open="${lbIndex}" data-lb-group="plantas" aria-label="Ampliar planta ${t.nombre}">
              ${picture(ctx, { ...t.planta, alt: `Planta tipología ${t.nombre}` }, { sizes: '(min-width: 1280px) 400px, (min-width: 640px) 46vw, 92vw', cls: 'size-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.03]' })}
              <span class="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-deep-2/80 text-white">${icon('expand', 'size-4')}</span>
            </button>` : html`<div class="grid size-full place-items-center text-sm text-muted">Planta disponible pronto</div>`}
            ${t.subsidio ? html`<span class="badge badge-deep absolute left-3 top-3">${icon('percent', 'size-3.5')} Subsidio a la tasa</span>` : ''}
          </div>
          <div class="flex flex-1 flex-col p-5">
            <h3 class="text-lg font-bold">${t.nombre}</h3>
            <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt class="text-muted">Dormitorios</dt><dd class="font-bold">${t.dormitorios ?? '—'}</dd></div>
              <div><dt class="text-muted">Baños</dt><dd class="font-bold">${t.banos ?? '—'}</dd></div>
              <div><dt class="text-muted">Sup. útil</dt><dd class="font-bold">${t.supUtil != null ? `${formatMiles(t.supUtil)} m²` : '—'}</dd></div>
              <div><dt class="text-muted">Sup. total</dt><dd class="font-bold">${t.supTotal != null ? `${formatMiles(t.supTotal)} m²` : '—'}</dd></div>
            </dl>
            <div class="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4 mt-5">
              <div>
                <p class="text-xs font-bold text-muted">Desde</p>
                <p class="font-display text-2xl font-extrabold leading-none">${t.precioUF != null ? formatUF(t.precioUF) : 'Consultar'}</p>
                ${t.precioUF != null ? html`<p class="mt-1 text-xs text-muted">${formatCLPAprox(t.precioUF, cfg.ufCLP)}</p>` : ''}
              </div>
              <a class="btn btn-dark btn-sm" href="#cotizar" data-tipologia="${t.nombre}">Cotizar</a>
            </div>
          </div>
        </article>
      </li>`;
      })}
    </ul>
    <p class="mt-6 text-sm text-muted">Precio no incluye estacionamiento ni bodega. Corresponde al precio promedio con descuento aplicado a cada tipología.</p>
  </div>
  <script type="application/json" data-lb-data="plantas">${raw(JSON.stringify(plantas.filter(Boolean)).replace(/</g, '\\u003c'))}</script>
</section>`;
}

function ubicacion(cfg: SiteConfig, p: Proyecto): Raw {
  return html`<section id="ubicacion" class="wrap py-[clamp(4rem,8vw,7rem)]" aria-labelledby="ubi-t">
  <div class="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
    <div class="reveal">
      <p class="eyebrow text-accent-ink">Ubicación</p>
      <h2 id="ubi-t" class="h-section mt-3">${p.comuna}<span class="dot">.</span></h2>
      <p class="mt-4 flex items-center gap-2 text-lg">${icon('pin', 'size-5 shrink-0 text-accent-ink')} ${p.direccion}, ${p.comuna}</p>
      <div id="mapa-ficha" class="mt-6 aspect-[4/3] w-full overflow-hidden rounded-[22px] bg-surface-2 md:aspect-[16/10]" role="region" aria-label="Mapa de ubicación de ${p.nombre}"
        data-lat="${p.coords.lat}" data-lng="${p.coords.lng}" data-nombre="${p.nombre}" data-precision="${p.coords.precision}" data-tiles="${cfg.demo ? 'no' : 'si'}">
        <noscript><p class="p-6">Dirección: ${p.direccion}, ${p.comuna}.</p></noscript>
      </div>
      ${cfg.demo ? html`<p class="mt-3 text-xs text-muted">Mapa esquemático con una ubicación ficticia.</p>` : html`<p class="mt-3 text-xs text-muted">${p.coords.precision === 'aproximada' ? 'Ubicación aproximada (pendiente de validar). ' : ''}Mapa © OpenStreetMap. <a class="underline" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(`${p.direccion}, ${p.comuna}, Chile`)}" target="_blank" rel="noopener">Abrir en Google Maps</a></p>`}
    </div>
    <div class="reveal">
      <h3 class="text-xl font-bold">Qué hay cerca</h3>
      <p class="mt-1 text-sm text-muted">${cfg.demo ? 'Puntos de interés de ejemplo.' : 'Puntos de interés a menos de 2 km, informados por Euro en la ficha del proyecto. Tiempos referenciales.'}</p>
      <div class="mt-5 divide-y divide-line border-y border-line">
        ${p.entorno.map((c, i) => html`<details class="group py-1" ${raw(i === 0 ? 'open' : '')}>
          <summary class="flex min-h-[56px] cursor-pointer list-none items-center gap-3 font-bold">
            <span class="grid size-9 place-items-center rounded-full bg-surface-2 text-accent-ink">${icon(ICONO_CATEGORIA[c.categoria] ?? 'pin', 'size-[18px]')}</span>
            <span class="flex-1">${c.categoria}</span>
            <span class="text-sm font-normal text-muted">${c.items.length}</span>
            ${icon('chevron-down', 'size-4 transition-transform duration-200 group-open:rotate-180')}
          </summary>
          <ul class="mb-4 ml-12 space-y-2.5">
            ${c.items.map((it) => html`<li><p class="font-bold leading-snug">${it.nombre}</p>${it.detalle ? html`<p class="text-sm text-muted">${it.detalle}</p>` : ''}</li>`)}
          </ul>
        </details>`)}
      </div>
    </div>
  </div>
</section>`;
}

function formulario(cfg: SiteConfig, p: Proyecto): Raw {
  return html`<section id="cotizar" class="bg-deep-2 py-[clamp(4rem,8vw,7rem)] text-white" aria-labelledby="cot-t">
  <div class="wrap grid gap-12 lg:grid-cols-[1fr_1.15fr]">
    <div class="reveal">
      <p class="eyebrow text-accent">Cotiza ${p.nombre}</p>
      <h2 id="cot-t" class="h-section mt-3 !text-white">Recibe tu cotización<span class="dot">.</span></h2>
      <p class="mt-5 max-w-md text-lg text-white/85">Déjanos tus datos y un ejecutivo te envía precios, disponibilidad y beneficios vigentes de la tipología que elijas.</p>
      <ul class="mt-8 space-y-4 text-white/90">
        <li class="flex gap-3">${icon('check-circle', 'size-6 shrink-0 text-accent')} Reserva con 3 UF.</li>
        <li class="flex gap-3">${icon('check-circle', 'size-6 shrink-0 text-accent')} Respuesta en horario hábil.</li>
        <li class="flex gap-3">${icon('check-circle', 'size-6 shrink-0 text-accent')} Sin compromiso de compra.</li>
      </ul>
      ${cfg.whatsapp ? html`<a class="btn btn-glass mt-8" href="${whatsappUrl(cfg.whatsapp, p.nombre)}" target="_blank" rel="noopener">${icon('whatsapp', 'size-5')} Prefiero WhatsApp</a>` : ''}
    </div>
    <div class="reveal rounded-[24px] bg-surface p-6 text-ink md:p-8" style="box-shadow: var(--shadow-2)">
      <form id="form-cotizar" novalidate data-proyecto="${p.nombre}">
        <div class="grid gap-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="label" for="f-nombre">Nombre y apellido</label>
            <input class="field" id="f-nombre" name="nombre" autocomplete="name" required aria-describedby="e-nombre">
            <p class="error" id="e-nombre" hidden></p>
          </div>
          <div>
            <label class="label" for="f-email">Correo</label>
            <input class="field" id="f-email" name="email" type="email" autocomplete="email" inputmode="email" required aria-describedby="e-email">
            <p class="error" id="e-email" hidden></p>
          </div>
          <div>
            <label class="label" for="f-tel">Teléfono</label>
            <input class="field" id="f-tel" name="telefono" type="tel" autocomplete="tel" inputmode="tel" placeholder="+56 9 1234 5678" required aria-describedby="e-tel">
            <p class="error" id="e-tel" hidden></p>
          </div>
          <div>
            <label class="label" for="f-rut">RUT <span class="font-normal text-muted">(opcional)</span></label>
            <input class="field" id="f-rut" name="rut" inputmode="text" autocomplete="off" placeholder="12.345.678-5" aria-describedby="e-rut">
            <p class="error" id="e-rut" hidden></p>
          </div>
          <div>
            <label class="label" for="f-tip">Tipología de interés</label>
            <div class="relative">
              <select class="field appearance-none pr-10" id="f-tip" name="tipologia" required aria-describedby="e-tip">
                <option value="">Elige una</option>
                ${p.tipologias.map((t) => html`<option value="${t.nombre}">${t.nombre}${t.precioUF != null ? ` · ${formatUF(t.precioUF)}` : ''}</option>`)}
                <option value="No sé aún">No sé aún</option>
              </select>
              ${icon('chevron-down', 'size-4 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2')}
            </div>
            <p class="error" id="e-tip" hidden></p>
          </div>
          <div class="sm:col-span-2">
            <label class="flex items-start gap-3 text-sm">
              <input type="checkbox" name="acepta" id="f-acepta" class="mt-0.5 size-5 shrink-0 accent-[rgb(var(--accent))]" required aria-describedby="e-acepta">
              <span>${cfg.demo ? 'Acepto que me contacten por esta cotización.' : html`Acepto que Euro Inmobiliaria me contacte por esta cotización, según su <a class="underline" href="https://euroinmobiliaria.cl/politicas-de-privacidad">política de privacidad</a>.`}</span>
            </label>
            <p class="error" id="e-acepta" hidden></p>
          </div>
        </div>
        <button class="btn btn-primary mt-6 w-full" type="submit">Enviar cotización</button>
        <p class="mt-3 text-center text-xs text-muted">Versión de prueba: el formulario no envía datos.</p>
      </form>
      <div id="form-ok" class="py-10 text-center" hidden tabindex="-1">
        <div class="mx-auto grid size-16 place-items-center rounded-full bg-surface-2 text-ok">${icon('check', 'size-8')}</div>
        <h3 class="mt-5 font-display text-3xl font-extrabold uppercase">¡Listo<span class="dot">!</span></h3>
        <p class="mx-auto mt-2 max-w-sm text-muted" id="form-ok-txt">Recibimos tu solicitud. Un ejecutivo te contactará pronto.</p>
        <p class="mt-4 text-xs text-muted">(Simulación: en esta demo no se envió ningún dato.)</p>
      </div>
    </div>
  </div>
</section>`;
}

function otros(ctx: Ctx, cfg: SiteConfig, p: Proyecto, todos: Proyecto[]): Raw {
  const d = (a: Proyecto) => Math.hypot(a.coords.lat - p.coords.lat, a.coords.lng - p.coords.lng);
  const cerca = todos.filter((x) => x.slug !== p.slug).sort((a, b) => d(a) - d(b)).slice(0, 3);
  return html`<section class="wrap py-[clamp(4rem,8vw,7rem)]" aria-labelledby="otros-t">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <h2 id="otros-t" class="h-section reveal">Proyectos cercanos<span class="dot">.</span></h2>
    <a class="link" href="${url(ctx, 'proyectos/')}">Ver los ${todos.length} proyectos</a>
  </div>
  <ul class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">${cerca.map((x) => cardProyecto(ctx, cfg, x, 9))}</ul>
</section>`;
}

export function paginaFicha(ctx: Ctx, cfg: SiteConfig, p: Proyecto, todos: Proyecto[], comunas: Comuna[]): Raw {
  return html`${header(ctx, cfg, comunas, 'proyectos', false)}
<main id="contenido">
  ${heroFicha(ctx, p)}
  ${resumen(cfg, p)}
  ${descripcion(cfg, p)}
  ${galeria(ctx, p)}
  ${tipologias(ctx, cfg, p)}
  ${ubicacion(cfg, p)}
  ${formulario(cfg, p)}
  ${otros(ctx, cfg, p, todos)}
</main>
${footer(ctx, cfg)}
${cfg.whatsapp
  ? html`<a id="wa-float" data-visible="false" class="wa-float btn btn-primary !min-h-[56px] !rounded-full shadow-lg max-sm:btn-icon max-sm:!w-14" href="${whatsappUrl(cfg.whatsapp, p.nombre)}" target="_blank" rel="noopener" aria-label="Cotizar ${p.nombre} por WhatsApp">${icon('whatsapp', 'size-6')}<span class="max-sm:hidden">Cotizar por WhatsApp</span></a>`
  : html`<a id="wa-float" data-visible="false" class="wa-float btn btn-primary !min-h-[56px] !rounded-full shadow-lg" href="#cotizar">${icon('calendar', 'size-5')} Cotizar</a>`}`;
}
