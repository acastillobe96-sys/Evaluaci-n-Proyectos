// Arma la película de obra en "modo timelapse" a partir de 6 cuadros clave generados con IA (misma cámara).
// Entre cuadros clave el avance es POR PASOS (excavación por parches, estructura y fachada piso a piso,
// luces departamento por departamento), pero cada paso entra con una transición suave y luego hace
// una pausa corta: se lee como timelapse y se ve fluido al recorrerlo con el scroll.
// Uso: node scripts/timelapse-ia.mjs <dir con k1…k6.jpg> → public/video/obra/f000…f209.webp
import sharp from 'sharp';
import { mkdirSync, rmSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const SRC = process.argv[2];
const OUT = 'public/video/obra';
const N = 210;
const W = 1056, H = 594, OW = 960, OH = 540;   // 10 % de margen para el acercamiento de cámara

// Columna del edificio (fracciones del cuadro, ya en espejo) medida sobre los cuadros clave
const COL = { x0: 0.42, x1: 0.77 };
const BASE = 0.9, TOPE = 0.12, PISOS = 15;

// Escalera suave: n pasos; cada paso avanza con easing durante el 60 % de su tramo y descansa el resto
const suave = (u) => u * u * (3 - 2 * u);
function escalera(t, n) {
  const v = Math.min(n, t * n), k = Math.floor(v), r = v - k;
  return Math.min(1, (k + suave(Math.min(1, r / 0.6))) / n);
}
const rampa = (v, ancho) => Math.max(0, Math.min(1, v / ancho));

// Generador determinista
let semilla = 7;
const rnd = () => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff; };

// Umbrales aleatorios por celda (parches de obra y ventanas que se encienden)
function celdas(cols, filas) { return Array.from({ length: cols * filas }, () => rnd()); }
const parches = celdas(28, 16);
const ventanas = celdas(10, PISOS + 3);

const img = [];
for (const k of ['k1', 'k2', 'k3', 'k4', 'k5', 'k6']) {
  // Espejo horizontal: deja el edificio a la derecha, libre del texto del hero
  img.push(await sharp(`${SRC}/${k}.jpg`).flop().resize(W, H, { fit: 'cover' }).removeAlpha().raw().toBuffer());
}

// Tramos: [desde, hasta, A, B, modo]
const tramos = [
  [0, 12, 0, 0, 'fijo'],
  [12, 52, 0, 1, 'parches'],    // terreno → excavación
  [52, 70, 1, 2, 'parches'],    // excavación → fundaciones
  [70, 130, 2, 3, 'pisos'],     // estructura piso a piso
  [130, 175, 3, 4, 'pisos'],    // fachada piso a piso
  [175, 200, 4, 5, 'luces'],    // anochece y se encienden los departamentos
  [200, N, 5, 5, 'fijo'],
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const buf = Buffer.alloc(W * H * 3);
let brillo = 1;
const enColumna = (x) => x >= COL.x0 * W && x < COL.x1 * W;

/** Mezcla A→B con una máscara m(x, y) ∈ [0, 1]. */
function mezclar(A, B, m) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = m(x, y), i = (y * W + x) * 3;
    if (a <= 0) { buf[i] = A[i]; buf[i + 1] = A[i + 1]; buf[i + 2] = A[i + 2]; }
    else if (a >= 1) { buf[i] = B[i]; buf[i + 1] = B[i + 1]; buf[i + 2] = B[i + 2]; }
    else for (let c = 0; c < 3; c++) buf[i + c] = A[i + c] + (B[i + c] - A[i + c]) * a;
  }
}

for (let f = 0; f < N; f++) {
  const [a0, a1, ia, ib, modo] = tramos.find(([a, b]) => f >= a && f < b);
  const A = img[ia], B = img[ib];
  const t = a1 > a0 ? (f - a0) / (a1 - a0) : 0;

  if (modo === 'fijo') A.copy(buf);
  else if (modo === 'parches') {
    // Avance por jornadas: cada parche aparece con un fundido corto; el resto del cuadro cambia en 5 pasos
    const p = escalera(t, 20) * 1.08, cielo = escalera(t, 5);
    mezclar(A, B, (x, y) => {
      if (y < H * 0.5) return cielo;
      const c = Math.floor((x / W) * 28) + 28 * Math.floor((y / H) * 16);
      return rampa(p - parches[c], 0.08);
    });
  } else if (modo === 'pisos') {
    // El frente sube de a un piso con borde suave; fuera de la columna, 6 pasos suaves
    const frente = BASE - escalera(t, PISOS) * (BASE - TOPE);
    const borde = 0.012, fuera = escalera(t, 6);
    mezclar(A, B, (x, y) => enColumna(x) ? rampa(y / H - frente + borde, borde * 2) : fuera);
  } else {
    // Anochecer en 8 pasos suaves; las ventanas se encienden una a una con fundido
    const noche = escalera(t, 8);
    mezclar(A, B, (x, y) => {
      if (!enColumna(x) || y / H < TOPE - 0.05) return noche;
      const c = Math.floor(((x / W - COL.x0) / (COL.x1 - COL.x0)) * 10) + 10 * Math.floor(((y / H - (TOPE - 0.05)) / (BASE + 0.05 - TOPE)) * (PISOS + 3));
      return Math.max(noche * 0.5, rampa(t * 1.15 - (ventanas[c] ?? 1), 0.06));
    });
  }

  // Parpadeo de exposición muy leve y suavizado (sello de timelapse sin cortar la fluidez)
  brillo += ((1 + (rnd() - 0.5) * 0.04) - brillo) * 0.35;
  // Acercamiento de cámara: 1,00 → 1,10 hacia el edificio
  const z = 1 + 0.1 * (f / (N - 1));
  const cw = Math.round(W / z), ch = Math.round(H / z);
  const cx = Math.round((W - cw) * 0.62), cy = Math.round((H - ch) * 0.6);
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
    .extract({ left: cx, top: cy, width: cw, height: ch })
    .resize(OW, OH)
    .modulate({ brightness: brillo })
    .webp({ quality: 62 })
    .toFile(`${OUT}/f${String(f).padStart(3, '0')}.webp`);
}
console.log(`${N} cuadros → ${OUT}`);
