// Genera el sitio estático en dist/.
//   node scripts/build.ts                  → URLs limpias (/proyectos/vitro/)
//   node scripts/build.ts --explicit-index → enlaces a .../index.html (hosts sin URLs limpias)
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import * as esbuild from 'esbuild';
import type { Proyecto, SiteConfig } from '../src/lib/types.ts';
import { agruparComunas, page } from '../src/render/layout.ts';
import { paginaProyectos } from '../src/render/proyectos.ts';
import { paginaFicha } from '../src/render/ficha.ts';
import type { Ctx } from '../src/render/html.ts';

const OUT = 'dist';
const explicitIndex = process.argv.includes('--explicit-index');
// Por defecto la demo NO se indexa (noindex + robots.txt Disallow). --indexable lo quita (producción).
const indexable = process.argv.includes('--indexable');
const cfg = JSON.parse(readFileSync('site.config.json', 'utf8')) as SiteConfig;
const proyectos = (JSON.parse(readFileSync('data/proyectos.json', 'utf8')) as { proyectos: Proyecto[] }).proyectos;
const comunas = agruparComunas(proyectos);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('public', OUT, { recursive: true });

// CSS (Tailwind) y JS (esbuild, TS estricto → ES2020)
execFileSync('npx', ['tailwindcss', '-c', 'tailwind.config.cjs', '-i', 'src/styles/app.css', '-o', join(OUT, 'css/app.css'), '--minify'], { stdio: 'inherit' });
await esbuild.build({
  entryPoints: { site: 'src/client/site.ts', proyectos: 'src/client/proyectos.ts', ficha: 'src/client/ficha.ts' },
  bundle: true, splitting: true, format: 'esm', minify: true, target: 'es2020',
  outdir: join(OUT, 'js'), chunkNames: 'chunks/[name]-[hash]', legalComments: 'none',
});
cpSync('node_modules/leaflet/dist/leaflet.css', join(OUT, 'css/leaflet.css'));

const v = createHash('sha1').update(readFileSync(join(OUT, 'css/app.css'))).update(readFileSync(join(OUT, 'js/proyectos.js'))).update(readFileSync(join(OUT, 'js/ficha.js'))).digest('hex').slice(0, 8);

function write(rel: string, contenido: string) {
  const f = join(OUT, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, contenido);
}

const ctxPara = (depth: number): Ctx => ({ root: '../'.repeat(depth), explicitIndex, v, demo: false });
const abs = (p: string) => cfg.baseUrlDemo + p;
const ogImg = (p: Proyecto) => (p.imagenes.card ? `${p.imagenes.card.src}-1200.webp` : null);

function preloadDe(ctx: Ctx, img: Proyecto['imagenes']['hero'], sizes: string) {
  if (!img) return undefined;
  const f = img.formatos.includes('avif') ? 'avif' : 'webp';
  const base = ctx.root + img.src.replace(/^\//, '');
  return { href: `${base}-${img.anchos[0]}.${f}`, srcset: img.anchos.map((a) => `${base}-${a}.${f} ${a}w`).join(', '), sizes, type: `image/${f}` };
}

// /proyectos/
{
  const ctx = ctxPara(1);
  const fondo = proyectos.find((p) => p.slug === 'vitro') ?? proyectos[0]!;
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Proyectos de departamentos | Euro Inmobiliaria',
      url: abs('/proyectos/'),
      mainEntity: {
        '@type': 'ItemList', numberOfItems: proyectos.length,
        itemListElement: proyectos.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/proyectos/${p.slug}/`), name: p.nombre })),
      },
    },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Euro Inmobiliaria', url: cfg.sitio, logo: `${cfg.sitio}/img/logo-euro.svg`, sameAs: Object.values(cfg.redes) },
  ];
  write('proyectos/index.html', page(ctx, cfg, {
    title: 'Proyectos de departamentos | Euro Inmobiliaria',
    description: `${proyectos.length} proyectos en ${comunas.length} comunas, con entrega inmediata o en verde desde UF ${Math.min(...proyectos.map((p) => p.desdeUF)).toLocaleString('es-CL')}. Filtra por comuna, dormitorios, entrega, precio y subsidio a la tasa.`,
    path: '/proyectos/', ogImage: ogImg(fondo), jsonLd, scripts: ['site', 'proyectos'],
    preload: preloadDe(ctx, fondo.imagenes.hero, '100vw'),
  }, paginaProyectos(ctx, cfg, proyectos, comunas)));
}

// /proyectos/<slug>/
for (const p of proyectos) {
  const ctx = ctxPara(2);
  const precios = p.tipologias.map((t) => t.precioUF).filter((x): x is number => x != null);
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'RealEstateListing',
      name: `${p.nombre}, departamentos en ${p.comuna}`,
      url: abs(`/proyectos/${p.slug}/`),
      image: p.imagenes.galeria.slice(0, 3).map((g) => abs(`${g.src}-1280.webp`)),
      description: p.descripcion.parrafos[0] ?? '',
      offers: {
        '@type': 'AggregateOffer', priceCurrency: 'CLF', lowPrice: Math.min(...precios), highPrice: Math.max(...precios),
        offerCount: p.tipologias.length, availability: 'https://schema.org/InStock',
      },
      about: {
        '@type': 'ApartmentComplex', name: p.nombre,
        address: { '@type': 'PostalAddress', streetAddress: p.direccion, addressLocality: p.comuna, addressRegion: p.region, addressCountry: 'CL' },
        geo: { '@type': 'GeoCoordinates', latitude: p.coords.lat, longitude: p.coords.lng },
        numberOfBedrooms: p.dormitorios.max, numberOfBathroomsTotal: p.banos.max,
      },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Proyectos', item: abs('/proyectos/') },
        { '@type': 'ListItem', position: 2, name: p.comuna, item: abs(`/proyectos/?comuna=${p.comunaSlug}`) },
        { '@type': 'ListItem', position: 3, name: p.nombre, item: abs(`/proyectos/${p.slug}/`) },
      ],
    },
  ];
  const ent = p.entrega.tipo === 'inmediata' ? 'entrega inmediata' : `entrega ${p.entrega.largo}`;
  write(`proyectos/${p.slug}/index.html`, page(ctx, cfg, {
    title: `${p.nombre}, ${p.comuna} | Euro Inmobiliaria`,
    description: `Departamentos de ${p.dormitorios.min === p.dormitorios.max ? p.dormitorios.min : `${p.dormitorios.min} a ${p.dormitorios.max}`} dormitorios en ${p.direccion}, ${p.comuna}. Desde UF ${p.desdeUF.toLocaleString('es-CL')}, ${ent}${p.subsidio ? ', con subsidio a la tasa' : ''}.`,
    path: `/proyectos/${p.slug}/`, ogImage: ogImg(p), jsonLd, scripts: ['site', 'ficha'],
    preload: preloadDe(ctx, p.imagenes.hero, '100vw'),
  }, paginaFicha(ctx, cfg, p, proyectos, comunas)));
}

// Raíz → /proyectos/ ; 404 ; robots ; sitemap
const destino = explicitIndex ? 'proyectos/index.html' : 'proyectos/';
write('index.html', `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><title>Euro Inmobiliaria · Proyectos</title><meta http-equiv="refresh" content="0; url=${destino}"><link rel="canonical" href="${abs('/proyectos/')}"><meta name="robots" content="noindex"></head><body><a href="${destino}">Ver proyectos</a></body></html>`);
write('robots.txt', indexable ? `User-agent: *\nAllow: /\nSitemap: ${abs('/sitemap.xml')}\n` : 'User-agent: *\nDisallow: /\n# Versión de prueba: no indexar.\n');
if (indexable) {
  // Quita el noindex de todas las páginas generadas
  const { readdirSync, statSync } = await import('node:fs');
  const recorrer = (d: string): string[] => readdirSync(d).flatMap((f) => { const x = join(d, f); return statSync(x).isDirectory() ? recorrer(x) : x.endsWith('.html') ? [x] : []; });
  for (const f of recorrer(OUT)) writeFileSync(f, readFileSync(f, 'utf8').replace('<meta name="robots" content="noindex, nofollow">\n', ''));
}
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/proyectos/', ...proyectos.map((p) => `/proyectos/${p.slug}/`)].map((u) => `  <url><loc>${abs(u)}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`dist/ listo: ${proyectos.length + 1} páginas · v=${v}${explicitIndex ? ' · enlaces explícitos' : ''}${indexable ? ' · indexable' : ' · noindex'}`);
