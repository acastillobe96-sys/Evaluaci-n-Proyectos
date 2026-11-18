// Pruebas en navegador (Playwright) contra el sitio servido. Uso: node tests/e2e.mjs [baseUrl]
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
const errores = [];
let ok = 0;
async function caso(nombre, fn, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport ?? { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre}: ${e.message}`));
  try { await fn(page); ok++; console.log(`✔ ${nombre}`); }
  catch (e) { console.log(`✘ ${nombre}\n  ${e.message}`); process.exitCode = 1; }
  await ctx.close();
}
const visibles = (page) => page.locator('#grilla > li:not([hidden])').count();
const cuenta = (page) => page.locator('#res-count').textContent();

await caso('carga: 18 cards, sin estado vacío', async (page) => {
  await page.goto(`${BASE}/proyectos/`);
  assert.equal(await visibles(page), 18);
  assert.equal(await page.locator('#vacio').isHidden(), true);
  assert.equal(await cuenta(page), '18 proyectos');
});

await caso('URL ?comuna=nunoa&dorm=2 se restaura al recargar', async (page) => {
  await page.goto(`${BASE}/proyectos/?comuna=nunoa&dorm=2`);
  assert.equal(await visibles(page), 6);
  assert.equal(await page.locator('input[name=comuna][value=nunoa]').isChecked(), true);
  assert.equal(await page.locator('[data-dorm="2"]').getAttribute('aria-pressed'), 'true');
  await page.reload();
  assert.equal(await visibles(page), 6);
  assert.equal(await page.locator('#chips .chip').count(), 2);
});

await caso('filtros en vivo actualizan URL y conteo; chips quitan filtros', async (page) => {
  await page.goto(`${BASE}/proyectos/`);
  await page.click('[data-fg="entrega"] .fg-trigger');
  await page.click('[data-entrega="inmediata"]');
  assert.equal(await visibles(page), 10);
  assert.match(page.url(), /entrega=inmediata/);
  await page.click('#subsidio');
  assert.equal(await visibles(page), 7); // inmediata + subsidio
  assert.match(page.url(), /subsidio=1/);
  await page.locator('#chips .chip', { hasText: 'Subsidio' }).click();
  assert.equal(await visibles(page), 10);
  await page.locator('#chips button', { hasText: 'Limpiar todo' }).click();
  assert.equal(await visibles(page), 18);
  assert.equal(new URL(page.url()).search, '');
});

await caso('estado vacío solo con 0 resultados', async (page) => {
  await page.goto(`${BASE}/proyectos/?comuna=coquimbo&entrega=2028`);
  assert.equal(await visibles(page), 0);
  assert.equal(await page.locator('#vacio').isVisible(), true);
  assert.equal(await page.locator('#grilla').isHidden(), true);
  await page.locator('#vacio [data-limpiar]').click();
  assert.equal(await page.locator('#vacio').isHidden(), true);
  assert.equal(await visibles(page), 18);
});

await caso('orden por precio ascendente', async (page) => {
  await page.goto(`${BASE}/proyectos/`);
  await page.selectOption('#orden', 'precio-asc');
  const slugs = await page.locator('#grilla > li:not([hidden])').evaluateAll((els) => els.map((e) => e.dataset.slug));
  assert.equal(slugs[0], 'santa-elena-1670');
  assert.match(page.url(), /orden=precio-asc/);
});

await caso('slider de precio filtra por "desde"', async (page) => {
  await page.goto(`${BASE}/proyectos/`);
  await page.click('[data-fg="precio"] .fg-trigger');
  await page.locator('#precio').fill('2800');
  assert.equal(await visibles(page), 7); // ≤ UF 2.800 (incluye Vitro, 2.791)
  assert.match(page.url(), /precio=2800/);
  assert.equal(await page.locator('#precio-out').textContent(), 'Hasta UF 2.800');
});

await caso('banner de subsidio aplica el filtro', async (page) => {
  await page.goto(`${BASE}/proyectos/`);
  await page.click('[data-aplicar-subsidio]');
  assert.equal(await visibles(page), 13);
  assert.equal(await page.locator('#subsidio').getAttribute('aria-checked'), 'true');
});

await caso('vista mapa: pines por proyecto y popup', async (page) => {
  await page.goto(`${BASE}/proyectos/?comuna=nunoa`);
  await page.click('[data-vista="mapa"]');
  await page.waitForSelector('.pin');
  assert.equal(await page.locator('.pin').count(), 6);
  assert.match(page.url(), /vista=mapa/);
  await page.locator('.pin').first().click();
  await page.waitForSelector('.leaflet-popup-content a');
  assert.match(await page.locator('.leaflet-popup-content').textContent(), /Desde UF/);
  // Los pines son alcanzables con teclado y muestran el foco
  await page.locator('.leaflet-marker-icon').nth(1).focus();
  const outline = await page.locator('.leaflet-marker-icon:focus .pin').evaluate((e) => window.getComputedStyle(e).outlineStyle);
  assert.equal(outline, 'solid');
});

await caso('mapa con Coquimbo ofrece saltar a regiones', async (page) => {
  await page.goto(`${BASE}/proyectos/?vista=mapa`);
  await page.waitForSelector('.pin');
  assert.equal(await page.locator('.pin').count(), 18);
  assert.equal(await page.locator('#mapa-extra button', { hasText: 'Marina Pacífico' }).count(), 1);
});

await caso('móvil: bottom sheet de filtros, foco y Escape', async (page) => {
  await page.goto(`${BASE}/proyectos/`);
  await page.click('#filtros-btn');
  assert.equal(await page.locator('#filtros').getAttribute('data-open'), 'true');
  assert.equal(await page.locator('#filtros').getAttribute('role'), 'dialog');
  await page.locator('label.opt', { hasText: 'La Florida' }).click();
  assert.equal(await page.locator('#ver-n').textContent(), 'Ver 3 proyectos');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#filtros').getAttribute('data-open'), 'false');
  assert.equal(await visibles(page), 3);
  assert.equal(await page.locator('#filtros-n').textContent(), '1');
}, { viewport: { width: 390, height: 844 } });

await caso('móvil: un solo menú, abre y cierra', async (page) => {
  await page.goto(`${BASE}/proyectos/`);
  assert.equal(await page.locator('nav[aria-label="Principal"]').count(), 1);
  await page.click('#menu-btn');
  assert.equal(await page.locator('#nav').getAttribute('data-open'), 'true');
  await page.click('#mega-btn');
  assert.equal(await page.locator('#mega-mobile').isVisible(), true);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#nav').getAttribute('data-open'), 'false');
}, { viewport: { width: 390, height: 844 } });

await caso('escritorio: mega-menú por comuna con "desde UF"', async (page) => {
  await page.goto(`${BASE}/proyectos/`);
  await page.click('#mega-btn');
  assert.equal(await page.locator('#mega').isVisible(), true);
  assert.match(await page.locator('#mega').textContent(), /Ñuñoa[\s\S]*Desde UF 2\.791/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#mega').isHidden(), true);
});

await caso('ficha: lightbox con teclado', async (page) => {
  await page.goto(`${BASE}/proyectos/vitro/`);
  await page.locator('#galeria [data-lb-open="0"]').first().click();
  const lb = page.locator('.lb');
  assert.equal(await lb.isVisible(), true);
  assert.equal(await lb.locator('[data-lb-count]').textContent(), '1 de 8');
  await page.keyboard.press('ArrowRight');
  assert.equal(await lb.locator('[data-lb-count]').textContent(), '2 de 8');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.lb').count(), 0);
});

await caso('ficha: validación y éxito simulado del formulario', async (page) => {
  await page.goto(`${BASE}/proyectos/mapocho-3521/`);
  await page.click('#form-cotizar button[type=submit]');
  assert.equal(await page.locator('#f-nombre').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'f-nombre');
  await page.fill('#f-nombre', 'Ana Pérez');
  await page.fill('#f-email', 'ana@correo.cl');
  await page.fill('#f-tel', '+56 9 1234 5678');
  await page.fill('#f-rut', '12.345.678-9');
  await page.locator('[data-tipologia="3 dorm 2 baños"]').click();
  assert.equal(await page.inputValue('#f-tip'), '3 dorm 2 baños');
  await page.check('#f-acepta');
  await page.click('#form-cotizar button[type=submit]');
  assert.equal(await page.locator('#e-rut').isVisible(), true);
  await page.fill('#f-rut', '12.345.678-5');
  await page.click('#form-cotizar button[type=submit]');
  assert.equal(await page.locator('#form-ok').isVisible(), true);
  assert.match(await page.locator('#form-ok-txt').textContent(), /3 dorm 2 baños de Mapocho 3521/);
});

await caso('ficha: mapa diferido y WhatsApp prellenado', async (page) => {
  await page.goto(`${BASE}/proyectos/mapocho-3521/`);
  const wa = await page.locator('#wa-float').getAttribute('href');
  assert.equal(await page.locator('#wa-float').getAttribute('data-visible'), 'false');
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForFunction(() => document.querySelector('#wa-float')?.dataset.visible === 'true');
  assert.match(decodeURIComponent(wa), /wa\.me\/56965749880\?text=.*Mapocho 3521/);
  await page.locator('#mapa-ficha').scrollIntoViewIfNeeded();
  await page.waitForSelector('#mapa-ficha .leaflet-tile-loaded', { timeout: 10000 });
});

await caso('las 18 fichas responden 200 y tienen JSON-LD', async (page) => {
  const res = await page.request.get(`${BASE}/sitemap.xml`);
  const urls = [...(await res.text()).matchAll(/<loc>[^<]*?(\/proyectos\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.equal(urls.length, 19);
  for (const u of urls) {
    const r = await page.request.get(BASE + u);
    assert.equal(r.status(), 200, u);
    assert.match(await r.text(), /application\/ld\+json/);
  }
});

await browser.close();
if (errores.length) { console.log('Errores JS:\n' + errores.join('\n')); process.exitCode = 1; }
console.log(`\n${ok} casos OK`);
