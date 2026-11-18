// Validación del formulario de cotización (pura, sin DOM).

export interface CamposCotizacion {
  nombre: string;
  email: string;
  telefono: string;
  rut: string;
  tipologia: string;
  acepta: boolean;
}

/** Dígito verificador de RUT (módulo 11). */
export function dvRut(cuerpo: number): string {
  let suma = 0, mul = 2;
  for (let n = cuerpo; n > 0; n = Math.floor(n / 10)) {
    suma += (n % 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (suma % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}

export function rutValido(rut: string): boolean {
  const limpio = rut.replace(/[.\s-]/g, '').toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return false;
  return dvRut(Number(limpio.slice(0, -1))) === limpio.slice(-1);
}

/** Celular o fijo chileno: +56 9 XXXX XXXX, 9 XXXX XXXX o 2 XXXX XXXX */
export function telefonoValido(tel: string): boolean {
  const d = tel.replace(/[^\d]/g, '').replace(/^56/, '');
  return /^[2-9]\d{8}$/.test(d);
}

export function emailValido(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export function validarCotizacion(c: CamposCotizacion): { valido: boolean; errores: Partial<Record<keyof CamposCotizacion, string>> } {
  const errores: Partial<Record<keyof CamposCotizacion, string>> = {};
  if (c.nombre.trim().length < 3) errores.nombre = 'Escribe tu nombre y apellido.';
  if (!emailValido(c.email)) errores.email = c.email ? 'Revisa el correo, por ejemplo nombre@correo.cl.' : 'Escribe tu correo.';
  if (!telefonoValido(c.telefono)) errores.telefono = c.telefono ? 'Usa un número chileno de 9 dígitos, por ejemplo +56 9 1234 5678.' : 'Escribe tu teléfono.';
  if (c.rut && !rutValido(c.rut)) errores.rut = 'El RUT no es válido. Revisa el dígito verificador.';
  if (!c.tipologia) errores.tipologia = 'Elige una tipología o "No sé aún".';
  if (!c.acepta) errores.acepta = 'Necesitamos tu autorización para contactarte.';
  return { valido: Object.keys(errores).length === 0, errores };
}
