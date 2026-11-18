// Ilustraciones SVG deterministas para la versión de demostración (sin fotos reales).
// Cada proyecto ficticio tiene su edificio: alturas, ritmo de ventanas y balcones salen de una semilla.

export function semilla(s: string): () => number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export type Momento = 'dia' | 'tarde' | 'noche';

const CIELO: Record<Momento, [string, string, string]> = {
  dia: ['#9CC3E6', '#DCEAF3', '#EEF2EC'],
  tarde: ['#24396E', '#C77D5B', '#F2B27A'],
  noche: ['#07122B', '#14295A', '#24396E'],
};
const FACHADAS = [['#E9E6DF', '#C9C4BA'], ['#3A4150', '#262B36'], ['#D9DCE0', '#AEB4BC'], ['#CDB9A2', '#A48D74']] as const;

const n = (x: number) => Math.round(x * 10) / 10;

interface Torre { x: number; w: number; pisos: number; piso: number; cols: number; color: readonly [string, string]; balcon: boolean }

function torre(t: Torre, base: number, momento: Momento, r: () => number): string {
  const h = t.pisos * t.piso;
  const y = base - h;
  const [frente, lado] = t.color;
  const prof = t.w * 0.22;
  let s = `<rect x="${n(t.x)}" y="${n(y)}" width="${n(t.w)}" height="${n(h)}" fill="${frente}"/>`;
  s += `<path d="M${n(t.x + t.w)} ${n(y)}l${n(prof)} ${n(-prof * 0.35)}V${n(base - prof * 0.35)}l${n(-prof)} ${n(prof * 0.35)}Z" fill="${lado}"/>`;
  s += `<rect x="${n(t.x - 4)}" y="${n(y - 6)}" width="${n(t.w + 8)}" height="6" fill="${lado}"/>`;
  const mx = t.w * 0.08, gap = 6;
  const vw = (t.w - mx * 2 - gap * (t.cols - 1)) / t.cols;
  for (let p = 1; p < t.pisos; p++) {
    const py = y + p * t.piso + t.piso * 0.18;
    for (let c = 0; c < t.cols; c++) {
      const px = t.x + mx + c * (vw + gap);
      const luz = momento === 'noche' ? (r() < 0.55 ? '#FFC870' : '#1B2A4A') : momento === 'tarde' ? (r() < 0.22 ? '#FFD08A' : '#5D6B86') : (r() < 0.15 ? '#E7F1F8' : '#8FA8C2');
      s += `<rect x="${n(px)}" y="${n(py)}" width="${n(vw)}" height="${n(t.piso * 0.58)}" rx="1.5" fill="${luz}"/>`;
    }
    if (t.balcon) s += `<rect x="${n(t.x + mx * 0.5)}" y="${n(py + t.piso * 0.58)}" width="${n(t.w - mx)}" height="2.4" fill="${lado}" opacity=".9"/>`;
  }
  return s;
}

function arboles(base: number, ancho: number, r: () => number, momento: Momento): string {
  const c = momento === 'noche' ? '#0E2A23' : momento === 'tarde' ? '#3D4A35' : '#5E8A5A';
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x = r() * ancho, rad = 14 + r() * 22;
    s += `<rect x="${n(x - 2)}" y="${n(base - rad)}" width="4" height="${n(rad)}" fill="#3B2F25"/><circle cx="${n(x)}" cy="${n(base - rad * 1.4)}" r="${n(rad)}" fill="${c}" opacity=".95"/>`;
  }
  return s;
}

/** Fachada del proyecto. `ancho` 1200 (card) o 1920 (hero, edificio a la derecha). */
export function fachada(slug: string, momento: Momento, ancho = 1200, alto = 750): string {
  const r = semilla(slug);
  const [c1, c2, c3] = CIELO[momento];
  const base = alto * 0.9;
  const color = FACHADAS[Math.floor(r() * FACHADAS.length)]!;
  const color2 = FACHADAS[Math.floor(r() * FACHADAS.length)]!;
  const pisos = 14 + Math.floor(r() * 12);
  const piso = (base - alto * 0.12) / (pisos + 1);
  const w = Math.min(ancho * 0.36, 380) + r() * 60;
  const cx = ancho > 1500 ? ancho * 0.72 : ancho * 0.5;
  const principal: Torre = { x: cx - w / 2, w, pisos, piso, cols: 5 + Math.floor(r() * 3), color, balcon: r() < 0.6 };
  const segunda: Torre = { x: cx + w * 0.38, w: w * 0.62, pisos: Math.round(pisos * (0.55 + r() * 0.25)), piso, cols: 3 + Math.floor(r() * 2), color: color2, balcon: r() < 0.5 };
  const id = `${slug}-${momento}-${ancho}`;
  let fondo = '';
  // Ciudad de fondo
  for (let i = 0; i < 14; i++) {
    const bw = 50 + r() * 90, bh = 60 + r() * 200, bx = r() * ancho;
    fondo += `<rect x="${n(bx)}" y="${n(base - bh)}" width="${n(bw)}" height="${n(bh)}" fill="${momento === 'dia' ? '#B9C6D2' : '#1A2B52'}" opacity="${momento === 'dia' ? '.7' : '.85'}"/>`;
  }
  const cordillera = momento === 'dia' ? '#A9B9C9' : momento === 'tarde' ? '#6C5C77' : '#0C1B3E';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="xMidYMid slice">`
    + `<defs><linearGradient id="c${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".65" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs>`
    + `<rect width="${ancho}" height="${alto}" fill="url(#c${id})"/>`
    + `<path d="M0 ${n(base - 150)} L${n(ancho * 0.18)} ${n(base - 250)} L${n(ancho * 0.33)} ${n(base - 190)} L${n(ancho * 0.52)} ${n(base - 290)} L${n(ancho * 0.7)} ${n(base - 200)} L${n(ancho * 0.88)} ${n(base - 270)} L${ancho} ${n(base - 180)} V${alto} H0Z" fill="${cordillera}" opacity=".55"/>`
    + fondo
    + torre(segunda, base, momento, r)
    + torre(principal, base, momento, r)
    + `<rect y="${n(base)}" width="${ancho}" height="${n(alto - base)}" fill="${momento === 'dia' ? '#7E8A80' : '#1A2338'}"/>`
    + arboles(base + 6, ancho, r, momento)
    + `</svg>`;
}

/** Planta esquemática de una tipología (dormitorios y baños). */
export function planta(dorm: number, banos: number, semillaTxt: string): string {
  const r = semilla(semillaTxt);
  const W = 1000, H = 625, m = 60;
  const muro = '#2B3442', piso = '#F5F2EC', piso2 = '#E9E4DA', txt = '#4A5560';
  const ancho = W - m * 2, alto = H - m * 2;
  const cuartos: Array<{ x: number; y: number; w: number; h: number; t: string; f: string }> = [];
  const colDorm = ancho * (0.36 + dorm * 0.07);
  const hDorm = alto / dorm;
  for (let i = 0; i < dorm; i++) cuartos.push({ x: m, y: m + i * hDorm, w: colDorm * 0.62, h: hDorm, t: i === 0 ? 'Dormitorio principal' : `Dormitorio ${i + 1}`, f: piso2 });
  const bx = m + colDorm * 0.62, bw = colDorm * 0.38, bh = alto * 0.28;
  for (let i = 0; i < banos; i++) cuartos.push({ x: bx, y: m + i * bh, w: bw, h: bh, t: 'Baño', f: '#DCE6EC' });
  cuartos.push({ x: bx, y: m + banos * bh, w: bw, h: alto - banos * bh, t: 'Pasillo', f: piso });
  const lx = m + colDorm, lw = ancho - colDorm;
  const hCoc = alto * (0.34 + r() * 0.08);
  cuartos.push({ x: lx, y: m, w: lw, h: hCoc, t: 'Cocina', f: '#EDE7DA' });
  cuartos.push({ x: lx, y: m + hCoc, w: lw, h: alto - hCoc, t: 'Living comedor', f: piso });
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>`;
  for (const c of cuartos) {
    s += `<rect x="${n(c.x)}" y="${n(c.y)}" width="${n(c.w)}" height="${n(c.h)}" fill="${c.f}" stroke="${muro}" stroke-width="6"/>`;
    s += `<text x="${n(c.x + c.w / 2)}" y="${n(c.y + c.h / 2)}" font-family="Arial, sans-serif" font-size="${c.w < 160 ? 17 : 21}" fill="${txt}" text-anchor="middle" dominant-baseline="middle">${c.t}</text>`;
  }
  // Terraza y ventanales
  s += `<rect x="${n(lx + lw * 0.15)}" y="${H - m + 3}" width="${n(lw * 0.7)}" height="40" fill="#E2E8E2" stroke="${muro}" stroke-width="3" stroke-dasharray="8 6"/>`;
  s += `<text x="${n(lx + lw / 2)}" y="${H - m + 26}" font-family="Arial, sans-serif" font-size="16" fill="${txt}" text-anchor="middle">Terraza</text>`;
  s += `<rect x="${m - 3}" y="${n(m + hDorm * 0.3)}" width="6" height="${n(hDorm * 0.4)}" fill="#8FB3CF"/>`;
  s += `<rect x="${W - m - 3}" y="${n(m + hCoc + 40)}" width="6" height="${n((alto - hCoc) * 0.5)}" fill="#8FB3CF"/>`;
  s += `<text x="${W - m}" y="${m - 22}" font-family="Arial, sans-serif" font-size="15" fill="${txt}" text-anchor="end">Planta esquemática · ilustrativa</text>`;
  return s + `</svg>`;
}

export const dataUri = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg).replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%22/g, "'")}`;
