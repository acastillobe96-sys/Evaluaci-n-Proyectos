// Formato chileno: punto como separador de miles, coma decimal.
import type { Rango } from './types.ts';

const miles = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

/** 2791 → "UF 2.791" */
export function formatUF(n: number): string {
  return `UF ${miles.format(n)}`;
}

/** Número con separador de miles chileno: 40000 → "40.000" */
export function formatMiles(n: number): string {
  return miles.format(n);
}

/** Equivalente aproximado en pesos: 2791 UF × 40.000 → "≈ $111,6 millones" */
export function formatCLPAprox(uf: number, ufCLP: number): string {
  const clp = uf * ufCLP;
  const millones = clp / 1_000_000;
  const txt = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(millones);
  return `≈ $${txt} millones`;
}

/** {min:1,max:2} → "1–2" ; {min:2,max:2} → "2" */
export function formatRango(r: Rango): string {
  return r.min === r.max ? String(r.min) : `${r.min}–${r.max}`;
}

/** "1–2 dorm · 1–2 baños" */
export function formatTipologia(d: Rango, b: Rango): string {
  const banos = b.min === 1 && b.max === 1 ? 'baño' : 'baños';
  return `${formatRango(d)} dorm · ${formatRango(b)} ${banos}`;
}

export function plural(n: number, uno: string, varios: string): string {
  return `${formatMiles(n)} ${n === 1 ? uno : varios}`;
}

/** Enlace de WhatsApp con mensaje prellenado */
export function whatsappUrl(numero: string, proyecto?: string): string {
  const texto = proyecto
    ? `Hola, quiero cotizar un departamento en el proyecto ${proyecto}.`
    : 'Hola, quiero información sobre los proyectos de Euro Inmobiliaria.';
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
