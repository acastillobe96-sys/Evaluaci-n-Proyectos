import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aplicarFiltros, escribirFiltros, filtrosVacios, leerFiltros, ordenar } from '../src/lib/filtros.ts';
import { ligero } from '../src/render/proyectos.ts';
import { formatCLPAprox, formatTipologia, formatUF } from '../src/lib/format.ts';
import { rutValido, telefonoValido, validarCotizacion } from '../src/lib/validacion.ts';
import type { Proyecto } from '../src/lib/types.ts';

const ps = (JSON.parse(readFileSync('data/proyectos.json', 'utf8')) as { proyectos: Proyecto[] }).proyectos.map(ligero);
const comunas = [...new Set(ps.map((p) => p.comunaSlug))];
const f = (qs: string) => aplicarFiltros(ps, leerFiltros(new URLSearchParams(qs), comunas));

test('datos: 18 proyectos en 7 comunas, slugs = nombre', () => {
  assert.equal(ps.length, 18);
  assert.equal(comunas.length, 7);
  for (const p of ps) assert.match(p.slug, /^[a-z0-9-]+$/);
  assert.ok(ps.some((p) => p.slug === 'mirador-irarrazaval'));
  assert.ok(ps.some((p) => p.slug === 'marina-pacifico'));
});

test('sin filtros devuelve los 18', () => assert.equal(f('').length, 18));
test('comuna=nunoa → 6', () => assert.equal(f('comuna=nunoa').length, 6));
test('comuna=nunoa,la-florida → 9', () => assert.equal(f('comuna=nunoa,la-florida').length, 9));
test('comuna=nunoa&dorm=2 → 6 (todos incluyen 2 dorm)', () => assert.equal(f('comuna=nunoa&dorm=2').length, 6));
test('dorm=3 → José Pedro Alessandri, Mapocho 3521, Marina Pacífico, Plaza de Lourdes', () =>
  assert.deepEqual(f('dorm=3').map((p) => p.slug).sort(), ['jose-pedro-alessandri', 'mapocho-3521', 'marina-pacifico', 'plaza-de-lourdes']));
test('dorm=1 excluye los de solo 2 o 2–3 dorm', () => {
  const r = f('dorm=1').map((p) => p.slug);
  assert.ok(!r.includes('guillermo-mann-1401') && !r.includes('independencia-4745') && !r.includes('mapocho-3521'));
  assert.equal(r.length, 15);
});
test('entrega=inmediata → 10', () => assert.equal(f('entrega=inmediata').length, 10));
test('entrega=2027 → 4, entrega=2028 → 4', () => {
  assert.equal(f('entrega=2027').length, 4);
  assert.equal(f('entrega=2028').length, 4);
});
test('subsidio=1 → 13', () => assert.equal(f('subsidio=1').length, 13));
test('precio=3000 → proyectos con desde ≤ 3.000', () => {
  const r = f('precio=3000');
  assert.ok(r.every((p) => p.desdeUF <= 3000));
  assert.equal(r.length, ps.filter((p) => p.desdeUF <= 3000).length);
});
test('combinación sin resultados → 0', () => assert.equal(f('comuna=coquimbo&entrega=2028').length, 0));
test('valores inválidos en la URL se ignoran', () => {
  const x = leerFiltros(new URLSearchParams('comuna=marte&dorm=9&entrega=2099&orden=xx&vista=3d&precio=abc'), comunas);
  assert.deepEqual(x, filtrosVacios());
});
test('ida y vuelta URL ↔ filtros', () => {
  const qs = '?comuna=nunoa,la-florida&dorm=1,2&entrega=inmediata&precio=3500&subsidio=1&orden=precio-asc&vista=mapa';
  const x = leerFiltros(new URLSearchParams(qs), comunas);
  assert.equal(escribirFiltros(x), qs);
  assert.equal(escribirFiltros(filtrosVacios()), '');
});
test('orden por precio y entrega', () => {
  const asc = ordenar(ps, 'precio-asc');
  assert.equal(asc[0]!.slug, 'santa-elena-1670');
  assert.equal(ordenar(ps, 'precio-desc')[0]!.slug, 'mirador-irarrazaval');
  const ent = ordenar(ps, 'entrega');
  assert.equal(ent[0]!.entregaTipo, 'inmediata');
  assert.equal(ent.at(-1)!.entregaOrden, 20282);
});

test('formato chileno', () => {
  assert.equal(formatUF(2791), 'UF 2.791');
  assert.equal(formatCLPAprox(2791, 40000), '≈ $111,6 millones');
  assert.equal(formatTipologia({ min: 1, max: 2 }, { min: 1, max: 2 }), '1–2 dorm · 1–2 baños');
  assert.equal(formatTipologia({ min: 1, max: 1 }, { min: 1, max: 1 }), '1 dorm · 1 baño');
});

test('validación de RUT, teléfono y formulario', () => {
  assert.ok(rutValido('11.111.111-1'));
  assert.ok(rutValido('12.345.678-5'));
  assert.ok(!rutValido('12.345.678-9'));
  assert.ok(telefonoValido('+56 9 6574 9880'));
  assert.ok(telefonoValido('912345678'));
  assert.ok(!telefonoValido('12345'));
  const r = validarCotizacion({ nombre: 'Ana Pérez', email: 'ana@correo.cl', telefono: '+56 9 1234 5678', rut: '', tipologia: 'No sé aún', acepta: true });
  assert.ok(r.valido);
  const m = validarCotizacion({ nombre: '', email: 'x', telefono: '1', rut: '1-1', tipologia: '', acepta: false });
  assert.deepEqual(Object.keys(m.errores).sort(), ['acepta', 'email', 'nombre', 'rut', 'telefono', 'tipologia']);
});
