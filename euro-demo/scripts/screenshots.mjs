// Capturas con Playwright: /proyectos y una ficha en 1440, 768 y 390 px (claro y oscuro).
// Uso: node scripts/screenshots.mjs [baseUrl] [--quick]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // Playwright preinstalado global (NODE_PATH)
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const BASE = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:4173';
const OUT = 'docs/screenshots';
const QUICK = process.argv.includes('--quick');
mkdirSync(OUT, { recursive: true });

const anchos = QUICK ? [1440, 390] : [1440, 768, 390];
const temas = QUICK ? ['light'] : ['light', 'dark'];
const paginas = [
  { nombre: 'proyectos', ruta: '/proyectos/' },
  { nombre: 'ficha-mapocho-3521', ruta: '/proyectos/mapocho-3521/' },
];

const browser = await chromium.launch();
const errores = [];
for (const tema of temas) for (const w of anchos) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, deviceScaleFactor: QUICK ? 1 : 2, colorScheme: tema, reducedMotion: 'reduce' });
  for (const p of paginas) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${p.ruta} ${w} ${tema}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errores.push(`${p.ruta} ${w} ${tema}: ${m.text()}`); });
    page.on('response', (r) => { if (r.status() >= 400) errores.push(`${r.status()} ${r.url()}`); });
    await page.goto(BASE + p.ruta, { waitUntil: 'networkidle' });
    // Fuerza la carga diferida (imágenes lazy, mapas, reveal) recorriendo la página
    const alto = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < alto; y += 700) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    const sufijo = `${w}${tema === 'dark' ? '-oscuro' : ''}`;
    // WebP para que las capturas pesen poco en el repo (la completa, a 1x)
    await sharp(await page.screenshot({ fullPage: false })).webp({ quality: 82 }).toFile(`${OUT}/${p.nombre}-${sufijo}.webp`);
    const completa = await page.screenshot({ fullPage: true });
    const meta = await sharp(completa).metadata();
    await sharp(completa, { limitInputPixels: false }).resize({ width: Math.round(meta.width / (QUICK ? 1 : 2)) }).webp({ quality: 78 }).toFile(`${OUT}/${p.nombre}-${sufijo}-completa.webp`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(errores.length ? `ERRORES:\n${[...new Set(errores)].join('\n')}` : 'Sin errores de consola ni 404');
