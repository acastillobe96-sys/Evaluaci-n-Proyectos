// Arma la "película" de obra a partir de cuadros clave generados con IA (Canva) con la misma cámara.
// Transiciones: fundido entre etapas y revelado de abajo hacia arriba (la estructura y la fachada "suben"),
// más un acercamiento lento de cámara durante toda la secuencia.
// Uso: node scripts/timelapse-ia.mjs <dir_cuadros_clave> → public/video/obra/f000…f149.webp
import sharp from 'sharp';
import { mkdirSync, rmSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const SRC = process.argv[2];
const OUT = 'public/video/obra';
const N = 150, W = 1056, H = 594, OW = 960, OH = 540;   // margen de 10 % para el zoom
// Cuadros clave (ver README): terreno, excavación, fundaciones, estructura, fachada, terminado de noche
const claves = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'];
// Tramos: [desde, hasta, clave A, clave B, tipo]
const tramos = [
  [0, 10, 0, 0, 'fijo'],
  [10, 30, 0, 1, 'fundido'],
  [30, 45, 1, 2, 'fundido'],
  [45, 85, 2, 3, 'sube'],
  [85, 115, 3, 4, 'sube'],
  [115, 140, 4, 5, 'fundido'],
  [140, N, 5, 5, 'fijo'],
];

const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const img = [];
// Espejo horizontal: deja el edificio a la derecha, libre del texto del hero
for (const k of claves) img.push(await sharp(`${SRC}/${k}.jpg`).flop().resize(W, H, { fit: 'cover' }).removeAlpha().raw().toBuffer());

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const buf = Buffer.alloc(W * H * 3);

for (let f = 0; f < N; f++) {
  const [a0, a1, ia, ib, tipo] = tramos.find(([a, b]) => f >= a && f < b);
  const t = a1 > a0 ? ease((f - a0) / (a1 - a0)) : 0;
  const A = img[ia], B = img[ib];
  if (tipo === 'fijo' || t === 0) A.copy(buf);
  else if (tipo === 'fundido') {
    for (let i = 0; i < buf.length; i++) buf[i] = A[i] + (B[i] - A[i]) * t;
  } else {
    // Revelado de abajo hacia arriba con borde suave (8 % de la altura)
    const borde = 0.08;
    const frente = 1 + borde - t * (1 + 2 * borde);   // posición del frente (0 = arriba, 1 = abajo)
    for (let y = 0; y < H; y++) {
      const m = Math.min(1, Math.max(0, ((y / H) - frente) / borde + 0.5));
      const fila = y * W * 3;
      for (let x = 0; x < W * 3; x++) { const i = fila + x; buf[i] = A[i] + (B[i] - A[i]) * m; }
    }
  }
  // Acercamiento de cámara: 1,00 → 1,10 hacia el edificio
  const z = 1 + 0.1 * (f / (N - 1));
  const cw = Math.round(W / z), ch = Math.round(H / z);
  const cx = Math.round((W - cw) * 0.62), cy = Math.round((H - ch) * 0.6);
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
    .extract({ left: cx, top: cy, width: cw, height: ch })
    .resize(OW, OH)
    .webp({ quality: 62 })
    .toFile(`${OUT}/f${String(f).padStart(3, '0')}.webp`);
}
console.log(`${N} cuadros → ${OUT}`);
