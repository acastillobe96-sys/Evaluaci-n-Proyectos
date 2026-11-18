import type { Proyecto, SiteConfig } from '../lib/types.ts';
import { formatUF, whatsappUrl } from '../lib/format.ts';
import { html, raw, icon, url, asset, type Ctx, type Raw } from './html.ts';
import { sprite } from './icons.ts';

export interface Meta {
  title: string;
  description: string;
  /** Ruta canónica (sin dominio), p. ej. "/proyectos/vitro/" */
  path: string;
  ogImage: string | null;
  jsonLd: unknown[];
  /** Scripts propios de la página (sin extensión) */
  scripts: string[];
  /** Precarga de la imagen LCP */
  preload?: { href: string; srcset: string; sizes: string; type: string } | undefined;
}

export interface Comuna {
  nombre: string;
  slug: string;
  desde: number;
  proyectos: Proyecto[];
}

export function agruparComunas(ps: Proyecto[]): Comuna[] {
  const m = new Map<string, Comuna>();
  for (const p of ps) {
    const c = m.get(p.comunaSlug) ?? { nombre: p.comuna, slug: p.comunaSlug, desde: Infinity, proyectos: [] };
    c.proyectos.push(p);
    c.desde = Math.min(c.desde, p.desdeUF);
    m.set(p.comunaSlug, c);
  }
  return [...m.values()].sort((a, b) => b.proyectos.length - a.proyectos.length || a.nombre.localeCompare(b.nombre, 'es'));
}

function head(ctx: Ctx, cfg: SiteConfig, m: Meta): Raw {
  const canon = cfg.baseUrlDemo + m.path;
  const og = m.ogImage ? cfg.baseUrlDemo + m.ogImage : null;
  return html`<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${m.title}</title>
<meta name="description" content="${m.description}">
<link rel="canonical" href="${canon}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#F3F4F0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#090F1B" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_CL">
<meta property="og:site_name" content="Euro Inmobiliaria">
<meta property="og:title" content="${m.title}">
<meta property="og:description" content="${m.description}">
<meta property="og:url" content="${canon}">
${og ? html`<meta property="og:image" content="${og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="750"><meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="icon" href="${url(ctx, 'img/favicon.svg')}" type="image/svg+xml">
<link rel="preload" href="${url(ctx, 'fonts/atkinson-next.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${url(ctx, 'fonts/barlow-sc-800.woff2')}" as="font" type="font/woff2" crossorigin>
${m.preload ? html`<link rel="preload" as="image" href="${m.preload.href}" imagesrcset="${m.preload.srcset}" imagesizes="${m.preload.sizes}" type="${m.preload.type}" fetchpriority="high">` : ''}
<link rel="stylesheet" href="${asset(ctx, 'css/app.css')}">
<script>(function(){try{var t=localStorage.getItem('euro-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}document.documentElement.classList.remove('no-js');})();</script>
${m.jsonLd.map((j) => html`<script type="application/ld+json">${raw(JSON.stringify(j).replace(/</g, '\\u003c'))}</script>`)}
</head>`;
}

function megaMenu(ctx: Ctx, comunas: Comuna[]): Raw {
  return html`<div class="mega hidden lg:block" id="mega" hidden>
  <div class="wrap">
    <div class="mega-panel grid grid-cols-[1fr_300px] gap-2 p-3">
      <div class="grid grid-cols-3 gap-x-2 gap-y-1 p-3">
        ${comunas.map((c) => html`<div class="rounded-2xl p-3">
          <a href="${url(ctx, `proyectos/?comuna=${c.slug}`)}" class="group flex items-baseline justify-between gap-3">
            <span class="font-display text-[1.375rem] font-extrabold uppercase leading-none">${c.nombre}</span>
            <span class="text-xs font-bold text-accent-ink">Desde ${formatUF(c.desde)}</span>
          </a>
          <ul class="mt-2 space-y-0.5">
            ${c.proyectos.map((p) => html`<li><a class="block rounded-lg py-1 text-[.9375rem] text-muted hover:text-ink" href="${url(ctx, `proyectos/${p.slug}/`)}">${p.nombre}</a></li>`)}
          </ul>
        </div>`)}
      </div>
      <a href="${url(ctx, 'proyectos/?subsidio=1')}" class="relative flex flex-col justify-end overflow-hidden rounded-[18px] bg-deep-2 p-6 text-white">
        <span class="absolute inset-0 opacity-90" style="background: radial-gradient(120% 80% at 100% 0%, rgb(var(--deep)) 0%, transparent 60%), radial-gradient(80% 60% at 0% 100%, rgb(var(--accent) / .35) 0%, transparent 70%);"></span>
        <span class="relative">
          <span class="eyebrow text-accent">Beneficio vigente</span>
          <span class="mt-2 block font-display text-[2rem] font-extrabold uppercase leading-[.95]">Subsidio a la tasa<span class="dot">.</span></span>
          <span class="mt-2 block text-sm text-white/85">0,6 puntos menos en tu tasa de interés, en viviendas nuevas de hasta 4.000 UF.</span>
          <span class="btn btn-primary btn-sm mt-4">Ver proyectos con subsidio ${icon('arrow-right', 'size-4')}</span>
        </span>
      </a>
    </div>
  </div>
</div>`;
}

export function header(ctx: Ctx, cfg: SiteConfig, comunas: Comuna[], activo: 'proyectos' | null, solido: boolean): Raw {
  const navs = Object.entries(cfg.nav);
  const inicio = navs.find(([k]) => k === 'Inicio');
  const resto = navs.filter(([k]) => k !== 'Inicio');
  return html`<a href="#contenido" class="sr-only-focusable fixed left-4 top-4 z-[90] btn btn-primary">Saltar al contenido</a>
<header class="site-header" id="site-header" data-solid="${solido ? 'true' : 'false'}" data-solid-fixed="${solido ? 'true' : 'false'}">
  <div class="wrap flex h-full items-center justify-between gap-4">
    <a href="${url(ctx, 'proyectos/')}" class="shrink-0" aria-label="Euro Inmobiliaria, ir a proyectos">
      <img class="logo-light h-10 w-auto md:h-11" src="${url(ctx, 'img/logo-euro-blanco.svg')}" alt="" width="110" height="44">
      <img class="logo-dark h-10 w-auto md:h-11" src="${url(ctx, 'img/logo-euro.svg')}" alt="" width="110" height="44">
    </a>
    <nav id="nav" aria-label="Principal" class="nav-drawer" data-open="false">
      <ul class="nav-list">
        ${inicio ? html`<li><a class="nav-link" href="${inicio[1]}">Inicio</a></li>` : ''}
        <li class="nav-has-mega">
          <button type="button" class="nav-link" id="mega-btn" aria-expanded="false" aria-controls="mega mega-mobile" ${raw(activo === 'proyectos' ? 'aria-current="page"' : '')}>Proyectos ${icon('chevron-down', 'size-4 mega-chev')}</button>
          <ul id="mega-mobile" class="mega-mobile" hidden>
            <li><a class="mm-link font-bold" href="${url(ctx, 'proyectos/')}">Todos los proyectos</a></li>
            ${comunas.map((c) => html`<li><a class="mm-link" href="${url(ctx, `proyectos/?comuna=${c.slug}`)}"><span>${c.nombre}</span><span class="text-xs font-bold text-accent-ink">Desde ${formatUF(c.desde)}</span></a></li>`)}
          </ul>
        </li>
        ${resto.map(([k, v]) => html`<li><a class="nav-link" href="${v}">${k}</a></li>`)}
        <li class="nav-portal"><a class="btn btn-sm btn-portal" href="${cfg.portalClientes}" target="_blank" rel="noopener">${icon('user', 'size-4')} Portal Clientes<span class="sr-only"> (abre en una pestaña nueva)</span></a></li>
      </ul>
    </nav>
    <div class="flex items-center gap-1">
      <button type="button" class="nav-link btn-icon !px-0 justify-center" id="theme-btn" aria-label="Cambiar a modo oscuro">${icon('moon', 'size-5 i-moon')}${icon('sun', 'size-5 i-sun')}</button>
      <button type="button" class="nav-link btn-icon !px-0 justify-center lg:hidden" id="menu-btn" aria-expanded="false" aria-controls="nav" aria-label="Abrir menú">${icon('menu', 'size-6')}</button>
    </div>
  </div>
  ${megaMenu(ctx, comunas)}
</header>`;
}

export function footer(ctx: Ctx, cfg: SiteConfig): Raw {
  const redes: Record<string, string> = { Facebook: 'facebook', YouTube: 'youtube', Instagram: 'instagram', LinkedIn: 'linkedin' };
  return html`<footer class="bg-deep-2 text-white" id="pie">
  <div class="wrap grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
    <div>
      <img src="${url(ctx, 'img/logo-euro-blanco.svg')}" alt="Euro Inmobiliaria" width="140" height="56" class="h-14 w-auto" loading="lazy">
      <p class="mt-5 max-w-xs text-white/80">Departamentos para vivir o invertir en Santiago y Coquimbo. Una empresa del Grupo Euro.</p>
      <a class="btn btn-primary mt-6" href="${whatsappUrl(cfg.whatsapp)}" target="_blank" rel="noopener">${icon('whatsapp', 'size-5')} Escríbenos por WhatsApp</a>
    </div>
    <div>
      <h2 class="eyebrow text-accent">Visítanos</h2>
      <ul class="mt-4 space-y-3 text-white/85">
        <li class="flex gap-3">${icon('pin', 'size-5 shrink-0 mt-0.5')}<span>${cfg.oficina}</span></li>
        <li class="flex gap-3">${icon('clock', 'size-5 shrink-0 mt-0.5')}<span>${cfg.horario.map((h, i) => html`${i ? html`<br>` : ''}${h}`)}</span></li>
        <li class="flex gap-3">${icon('whatsapp', 'size-5 shrink-0 mt-0.5')}<a class="hover:underline" href="${whatsappUrl(cfg.whatsapp)}" target="_blank" rel="noopener">${cfg.whatsappTexto}</a></li>
      </ul>
    </div>
    <div>
      <h2 class="eyebrow text-accent">Te ayudamos</h2>
      <ul class="mt-4 space-y-2.5 text-white/85">
        ${Object.entries(cfg.legales).map(([k, v]) => html`<li><a class="hover:underline" href="${v}">${k}</a></li>`)}
      </ul>
    </div>
    <div>
      <h2 class="eyebrow text-accent">Síguenos</h2>
      <ul class="mt-4 flex gap-2">
        ${Object.entries(cfg.redes).map(([k, v]) => html`<li><a class="btn btn-glass btn-icon" href="${v}" target="_blank" rel="noopener" aria-label="${k} de Euro Inmobiliaria">${icon(redes[k] ?? 'arrow-up-right', 'size-5')}</a></li>`)}
      </ul>
      <a class="mt-6 inline-flex items-center gap-2 font-bold text-white hover:underline" href="${cfg.portalClientes}" target="_blank" rel="noopener">${icon('user', 'size-4')} Portal Clientes ${icon('arrow-up-right', 'size-4')}</a>
    </div>
  </div>
  <div class="border-t border-white/15">
    <div class="wrap flex flex-col gap-2 py-6 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
      <p>Una empresa del Grupo Euro · © 2026 Grupo Euro</p>
      <p>Versión de prueba. Precios, entregas y beneficios referenciales; confírmalos con un ejecutivo.</p>
    </div>
  </div>
</footer>`;
}

export function page(ctx: Ctx, cfg: SiteConfig, m: Meta, body: Raw): string {
  return '<!doctype html>\n' + html`<html lang="es-CL" class="no-js">
${head(ctx, cfg, m)}
<body>
${raw(sprite())}
${body}
${m.scripts.map((s) => html`<script type="module" src="${asset(ctx, `js/${s}.js`)}"></script>`)}
</body>
</html>`.v;
}
