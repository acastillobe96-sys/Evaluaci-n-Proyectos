import type { Proyecto, SiteConfig } from '../lib/types.ts';
import { cotizarHref, formatCLPAprox, formatTipologia, formatUF } from '../lib/format.ts';
import { html, icon, picture, url, type Ctx, type Raw } from './html.ts';

export function cardProyecto(ctx: Ctx, cfg: SiteConfig, p: Proyecto, i: number): Raw {
  const href = url(ctx, `proyectos/${p.slug}/`);
  const inmediata = p.entrega.tipo === 'inmediata';
  return html`<li class="flex" data-slug="${p.slug}">
<article class="card w-full" aria-labelledby="t-${p.slug}">
  <div class="card-media">
    ${p.imagenes.card ? picture(ctx, p.imagenes.card, {
      sizes: '(min-width: 1280px) 400px, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw',
      eager: i < 3, priority: i === 0,
    }) : ''}
    <div class="absolute left-3 top-3 flex flex-wrap gap-1.5">
      ${inmediata
        ? html`<span class="badge badge-accent">${icon('key', 'size-3.5')} Entrega inmediata</span>`
        : html`<span class="badge badge-glass">${icon('calendar', 'size-3.5')} ${p.entrega.corto}</span>`}
      ${p.subsidio ? html`<span class="badge badge-glass">${icon('percent', 'size-3.5')} Subsidio a la tasa</span>` : ''}
    </div>
  </div>
  <div class="flex flex-1 flex-col p-5 pt-4">
    <p class="eyebrow text-muted">${p.comuna}</p>
    <h3 class="mt-1 text-xl font-bold leading-tight" id="t-${p.slug}"><a class="card-link" href="${href}">${p.nombre}</a></h3>
    <p class="mt-1 flex items-center gap-1.5 text-[.9375rem] text-muted">${icon('pin', 'size-4 shrink-0')} ${p.direccion}</p>
    <p class="mt-3 flex items-center gap-1.5 text-sm font-bold">${icon('bed', 'size-4 shrink-0 text-muted')} ${formatTipologia(p.dormitorios, p.banos)}</p>
    <div class="mt-4 border-t border-line pt-4">
      <p class="text-xs font-bold text-muted">Desde</p>
      <p class="flex flex-wrap items-baseline gap-x-2.5"><span class="font-display text-[1.75rem] font-extrabold leading-none tracking-tight">${formatUF(p.desdeUF)}</span><span class="text-xs text-muted">${formatCLPAprox(p.desdeUF, cfg.ufCLP)}</span></p>
    </div>
    <div class="above mt-5 grid grid-cols-2 gap-2">
      <a class="btn btn-dark btn-sm" href="${href}" tabindex="-1" aria-hidden="true">Ver proyecto</a>
      ${cfg.whatsapp
        ? html`<a class="btn btn-outline btn-sm" href="${cotizarHref(cfg.whatsapp, p.nombre, href)}" target="_blank" rel="noopener" aria-label="Cotizar ${p.nombre} por WhatsApp">${icon('whatsapp', 'size-4')} Cotizar</a>`
        : html`<a class="btn btn-outline btn-sm" href="${cotizarHref('', p.nombre, href)}" aria-label="Cotizar ${p.nombre}">Cotizar</a>`}
    </div>
  </div>
</article>
</li>`;
}
