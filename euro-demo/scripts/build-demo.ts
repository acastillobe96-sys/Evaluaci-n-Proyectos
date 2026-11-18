// Versión de DEMOSTRACIÓN para el visor de artefactos: marca y catálogo ficticios, mismo diseño.
// Todo el CSS y JS va en línea; Leaflet desde cdnjs; ilustraciones SVG en lugar de fotos.
//   node scripts/build-demo.ts → dist-demo/
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as esbuild from 'esbuild';
import type { Proyecto, SiteConfig } from '../src/lib/types.ts';
import { agruparComunas, page } from '../src/render/layout.ts';
import { paginaProyectos } from '../src/render/proyectos.ts';
import { paginaFicha } from '../src/render/ficha.ts';
import type { Ctx } from '../src/render/html.ts';
import { catalogoFicticio } from '../src/demo/datos.ts';

const OUT = 'dist-demo';
const base = JSON.parse(readFileSync('site.config.json', 'utf8')) as SiteConfig;
const cfg: SiteConfig = {
  ...base, demo: true, marca: 'Inmobiliaria Demo', whatsapp: '', whatsappTexto: '',
  oficina: '', portalClientes: '#', redes: {}, legales: {}, baseUrlDemo: '', sitio: '',
  nav: { Inicio: '#', 'Sobre nosotros': '#', Novedades: '#', 'Post venta': '#', Ayuda: '#' },
};
const reales = (JSON.parse(readFileSync('data/proyectos.json', 'utf8')) as { proyectos: Proyecto[] }).proyectos;
const proyectos = catalogoFicticio(reales);
const comunas = agruparComunas(proyectos);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
// Timelapse real (cuadros WebP, CC BY 3.0) para el hero-película
cpSync('public/video', join(OUT, 'video'), { recursive: true });

// CSS: Tailwind compilado, sin @font-face locales (las fuentes vienen de Google Fonts) + CSS de Leaflet
const tmp = join(OUT, '.app.css');
execFileSync('npx', ['tailwindcss', '-c', 'tailwind.config.cjs', '-i', 'src/styles/app.css', '-o', tmp, '--minify'], { stdio: 'ignore' });
const css = readFileSync(tmp, 'utf8').replace(/@font-face\{[^}]*\}/g, '') + readFileSync('node_modules/leaflet/dist/leaflet.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
rmSync(tmp);

// JS: un bundle IIFE por script, con Leaflet como global
async function bundle(entry: string): Promise<string> {
  const r = await esbuild.build({
    entryPoints: [entry], bundle: true, format: 'iife', minify: true, target: 'es2020', write: false, legalComments: 'none',
    alias: { leaflet: './src/demo/leaflet-global.ts', motion: './src/demo/motion-global.ts' },
  });
  return r.outputFiles[0]!.text.replace(/<\/script/gi, '<\\/script');
}
const js = { site: await bundle('src/client/site.ts'), proyectos: await bundle('src/client/proyectos.ts'), ficha: await bundle('src/client/ficha.ts') };

const write = (rel: string, contenido: string) => { const f = join(OUT, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, contenido); };
const ctxPara = (depth: number): Ctx => ({ root: '../'.repeat(depth), explicitIndex: true, v: 'demo', demo: true });

write('index.html', page(ctxPara(0), cfg, {
  title: 'Buscador de Proyectos',
  description: 'Demo de diseño con datos ficticios.',
  path: '/', ogImage: null, jsonLd: [], scripts: [], fragmento: true,
  inline: { css, js: [js.site, js.proyectos], leaflet: true },
}, paginaProyectos(ctxPara(0), cfg, proyectos, comunas)));

for (const p of proyectos) {
  write(`proyectos/${p.slug}/index.html`, page(ctxPara(2), cfg, {
    title: `${p.nombre} · ${p.comuna}`,
    description: 'Ficha de proyecto ficticio (demo).',
    path: `/proyectos/${p.slug}/`, ogImage: null, jsonLd: [], scripts: [],
    inline: { css, js: [js.site, js.ficha], leaflet: true },
  }, paginaFicha(ctxPara(2), cfg, p, proyectos, comunas)));
}
console.log(`${OUT}/ listo: ${proyectos.length + 1} páginas (demo, datos ficticios)`);
