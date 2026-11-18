// Motor de la animación "el edificio se construye con el scroll".
// Dibuja en <canvas> un edificio en 2,5D según un progreso p ∈ [0, 1]:
//   0.00–0.10 terreno · 0.10–0.22 fundaciones · 0.22–0.58 obra gruesa (piso a piso, con grúa)
//   0.58–0.78 terminaciones (fachada y ventanas) · 0.78–0.94 entrega (luces, árboles) · 0.94–1 noche
// Solo dibuja cuando p cambia; el escalado respeta el devicePixelRatio (máx. 2).

export const ETAPAS = { terreno: 0, fundaciones: 0.1, gruesa: 0.22, terminaciones: 0.58, entrega: 0.78, fin: 0.94 } as const;

export interface OpcionesObra {
  semilla: string;
  pisos?: number;
  /** Palabra gigante detrás del edificio (como el wordmark de Grus) */
  palabra?: string;
  /** Posición horizontal del edificio (0–1) en escritorio y en móvil */
  x?: number;
  xMovil?: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeBack = (t: number) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function mixColor(c1: string, c2: string, t: number): string {
  const h = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [a, b] = [h(c1), h(c2)];
  return `rgb(${a.map((v, i) => Math.round(mix(v, b[i]!, t))).join(',')})`;
}
function rng(s: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

const FACHADAS: Array<[string, string, string]> = [
  ['#E8E4DC', '#C2BCB0', '#9E978A'], // hormigón claro
  ['#3B4252', '#2A303C', '#1E232C'], // grafito
  ['#D7DCE2', '#AEB6BF', '#8C95A0'], // gris perla
  ['#D9C6AE', '#B39E84', '#8E7A62'], // arena
];

export class Obra {
  private ctx: CanvasRenderingContext2D;
  private w = 0; private h = 0; private dpr = 1;
  private p = -1;
  private readonly pisos: number;
  private readonly cols: number;
  private readonly fachada: [string, string, string];
  private readonly luces: number[];
  private readonly ciudad: Array<{ x: number; w: number; h: number }>;
  private readonly arboles: Array<{ x: number; r: number; d: number }>;
  private readonly opts: OpcionesObra;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, opts: OpcionesObra) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.opts = opts;
    const r = rng(opts.semilla);
    this.pisos = opts.pisos ?? 14 + Math.floor(r() * 6);
    this.cols = 5 + Math.floor(r() * 2);
    this.fachada = FACHADAS[Math.floor(r() * FACHADAS.length)]!;
    this.luces = Array.from({ length: this.pisos * this.cols * 2 }, () => r());
    this.ciudad = Array.from({ length: 18 }, () => ({ x: r(), w: 0.03 + r() * 0.06, h: 0.08 + r() * 0.22 }));
    this.arboles = Array.from({ length: 7 }, () => ({ x: r(), r: 0.6 + r() * 0.6, d: r() }));
    this.medir();
  }

  medir(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = rect.width; this.h = rect.height;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    const p = this.p; this.p = -1;
    if (p >= 0) this.dibujar(p);
  }

  get totalPisos(): number { return this.pisos; }
  /** Piso que se está construyendo para un progreso dado (1…pisos) */
  pisoEn(p: number): number { return clamp(Math.ceil(seg(p, ETAPAS.gruesa, ETAPAS.terminaciones) * this.pisos), 0, this.pisos); }

  dibujar(p: number): void {
    if (Math.abs(p - this.p) < 0.0004) return;
    this.p = p;
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const movil = w < 700;

    // ── Cielo: crepúsculo → noche
    const noche = seg(p, ETAPAS.entrega - 0.06, ETAPAS.fin);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, mixColor('#1E3A78', '#050C20', noche));
    g.addColorStop(0.62, mixColor('#5B5E8E', '#122650', noche));
    g.addColorStop(1, mixColor('#F0A86A', '#24396E', noche));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Estrellas
    if (noche > 0) {
      const r = rng('estrellas');
      ctx.fillStyle = `rgba(255,255,255,${0.7 * noche})`;
      for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h * 0.5, s = r() * 1.4 + 0.3; ctx.fillRect(x, y, s, s); }
    }
    const suelo = h * (movil ? 0.6 : 0.84);

    // ── Cordillera y ciudad de fondo
    ctx.fillStyle = mixColor('#6B5F83', '#0B1838', noche);
    ctx.beginPath(); ctx.moveTo(0, suelo - h * 0.16);
    const picos = [0.12, 0.26, 0.38, 0.55, 0.68, 0.83, 1];
    picos.forEach((x, i) => ctx.lineTo(w * x, suelo - h * (i % 2 ? 0.27 : 0.18)));
    ctx.lineTo(w, suelo); ctx.lineTo(0, suelo); ctx.fill();
    for (const b of this.ciudad) {
      ctx.fillStyle = mixColor('#3A4775', '#0E1C40', noche);
      ctx.fillRect(b.x * w, suelo - b.h * h * 0.6, b.w * w, b.h * h * 0.6);
    }

    // ── Palabra gigante detrás (queda tapada a medida que sube el edificio)
    if (this.opts.palabra) {
      const fs = Math.min(w * (movil ? 0.32 : 0.3), h * 0.5);
      ctx.font = `800 ${fs}px "Barlow Semi Condensed", "Arial Narrow", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = `rgba(255,255,255,${mix(0.15, 0.08, noche)})`;
      ctx.fillText(this.opts.palabra, movil ? w / 2 : w * 0.6, suelo - h * 0.015);
    }

    // ── Geometría del edificio
    const cx = w * (movil ? this.opts.xMovil ?? 0.5 : this.opts.x ?? 0.66);
    const bw = Math.min(w * (movil ? 0.4 : 0.22), 300);
    const fh = Math.min((suelo - h * 0.14) / (this.pisos + 1.5), movil ? 20 : 34);
    const x0 = cx - bw / 2;
    const prof = bw * 0.3, dy = prof * 0.42;
    const [cFrente, cLado, cSombra] = this.fachada;

    // Suelo
    ctx.fillStyle = mixColor('#3D3A44', '#0D1426', noche);
    ctx.fillRect(0, suelo, w, h - suelo);

    // ── 1. Terreno: estacas y cerco
    const t1 = seg(p, 0, ETAPAS.fundaciones);
    const cercoA = 1 - seg(p, ETAPAS.terminaciones, ETAPAS.entrega);
    if (cercoA > 0) {
      ctx.strokeStyle = `rgba(255,152,0,${0.9 * cercoA})`; ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(x0 - bw * 0.35, suelo - 1); ctx.lineTo(x0 - bw * 0.35 + (bw * 1.95) * easeOut(t1), suelo - 1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,255,255,${0.75 * cercoA})`;
      for (let i = 0; i < 4; i++) {
        const tt = clamp(t1 * 4 - i);
        const sx = x0 + (bw / 3) * i;
        ctx.fillRect(sx - 1, suelo - 16 * easeOut(tt), 2, 16 * easeOut(tt));
      }
    }

    // ── 2. Fundaciones: excavación y losa base
    const t2 = seg(p, ETAPAS.fundaciones, ETAPAS.gruesa);
    if (t2 > 0) {
      const pit = (1 - seg(p, ETAPAS.gruesa, ETAPAS.gruesa + 0.08)) * easeOut(clamp(t2 * 1.6));
      if (pit > 0) {
        ctx.fillStyle = `rgba(20,16,24,${0.55 * pit})`;
        ctx.beginPath(); ctx.moveTo(x0 - 18, suelo); ctx.lineTo(x0 + bw + prof + 18, suelo); ctx.lineTo(x0 + bw + prof - 4, suelo + 26 * pit); ctx.lineTo(x0 + 4, suelo + 26 * pit); ctx.fill();
      }
      const lb = easeOut(clamp((t2 - 0.35) / 0.65));
      ctx.fillStyle = '#9C9890';
      ctx.fillRect(x0 - 6, suelo - 6, (bw + 12) * lb, 6);
    }

    // ── 3. Obra gruesa: losas y pilares, piso a piso
    const t3 = seg(p, ETAPAS.gruesa, ETAPAS.terminaciones);
    const t4 = seg(p, ETAPAS.terminaciones, ETAPAS.entrega);
    const t5 = seg(p, ETAPAS.entrega, ETAPAS.fin);
    const avance = t3 * this.pisos;
    let tope = suelo - 6;
    const mx = bw * 0.07, gap = Math.max(4, bw * 0.025);
    const vw = (bw - mx * 2 - gap * (this.cols - 1)) / this.cols;

    for (let k = 0; k < this.pisos; k++) {
      const fk = clamp(avance - k);
      if (fk <= 0) break;
      const yBase = suelo - 6 - (k + 1) * fh;
      const caida = (1 - easeBack(clamp(fk * 1.25))) * fh * 2.2;
      const y = yBase - caida;
      const a = clamp(fk * 3);
      ctx.globalAlpha = a;

      // Terminaciones de este piso (de abajo hacia arriba)
      const ff = clamp(t4 * (this.pisos + 3) - k);
      // Cara lateral
      ctx.fillStyle = ff > 0 ? mixColor('#7D7A74', cLado, ff) : '#7D7A74';
      ctx.beginPath(); ctx.moveTo(x0 + bw, y); ctx.lineTo(x0 + bw + prof, y - dy); ctx.lineTo(x0 + bw + prof, y - dy + fh); ctx.lineTo(x0 + bw, y + fh); ctx.fill();
      // Estructura: pilares + losa
      ctx.fillStyle = '#A8A49C';
      ctx.fillRect(x0, y + fh - 5, bw, 5);
      for (let c = 0; c <= this.cols; c++) ctx.fillRect(x0 + (bw - 5) * (c / this.cols), y, 5, fh);
      // Fachada: paños y ventanas
      if (ff > 0) {
        ctx.fillStyle = mixColor('#A8A49C', cFrente, ff);
        ctx.fillRect(x0, y, bw, fh);
        for (let c = 0; c < this.cols; c++) {
          const vx = x0 + mx + c * (vw + gap);
          const luz = this.luces[k * this.cols + c]!;
          const encendida = t5 > 0 && luz < 0.62 && luz < t5 * 0.9;
          ctx.fillStyle = encendida ? (luz < 0.2 ? '#FFD38A' : '#FFC36A') : mixColor('#6F8CAD', '#203458', noche);
          ctx.globalAlpha = a * easeOut(clamp(ff * 1.4 - c * 0.08));
          ctx.fillRect(vx, y + fh * 0.18, vw, fh * 0.56);
          ctx.globalAlpha = a;
        }
        // Balcón
        ctx.fillStyle = cSombra;
        ctx.fillRect(x0 - 3, y + fh * 0.78, (bw + 6) * easeOut(ff), 2.5);
      } else {
        // Malla de seguridad naranja en los pisos recién hechos
        if (k >= avance - 2.5) {
          ctx.fillStyle = 'rgba(255,152,0,.22)';
          ctx.fillRect(x0, y, bw, fh);
        }
      }
      ctx.globalAlpha = 1;
      if (fk >= 1) tope = Math.min(tope, yBase);
    }

    // Coronamiento
    if (t3 >= 1) {
      ctx.fillStyle = cSombra;
      ctx.fillRect(x0 - 5, tope - 6, bw + 10, 6);
      ctx.beginPath(); ctx.moveTo(x0 + bw + 5, tope - 6); ctx.lineTo(x0 + bw + prof + 5, tope - 6 - dy); ctx.lineTo(x0 + bw + prof + 5, tope - dy); ctx.lineTo(x0 + bw + 5, tope); ctx.fill();
    }

    // ── Grúa: sube con el edificio y se retira en la entrega
    const gA = seg(p, ETAPAS.fundaciones + 0.04, ETAPAS.gruesa) * (1 - seg(p, ETAPAS.entrega, ETAPAS.entrega + 0.08));
    if (gA > 0) {
      const retiro = seg(p, ETAPAS.entrega - 0.02, ETAPAS.entrega + 0.08);
      const gx = x0 + bw + prof + 34 + retiro * w * 0.4;
      const topeObra = suelo - 6 - Math.ceil(avance) * fh;
      const gTop = Math.min(topeObra, suelo - fh * 3) - fh * 2.2;
      ctx.globalAlpha = gA;
      ctx.strokeStyle = '#FF9800'; ctx.lineWidth = 2;
      // Torre en celosía
      ctx.beginPath(); ctx.moveTo(gx - 5, suelo); ctx.lineTo(gx - 5, gTop); ctx.moveTo(gx + 5, suelo); ctx.lineTo(gx + 5, gTop); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = suelo; y > gTop + 10; y -= 12) { ctx.moveTo(gx - 5, y); ctx.lineTo(gx + 5, y - 12); }
      ctx.stroke();
      // Pluma y contrapluma (gira levemente con el avance)
      const giro = Math.sin(t3 * Math.PI * 3) * 0.08;
      const largo = bw * 1.3;
      ctx.save(); ctx.translate(gx, gTop); ctx.scale(1, 1 - Math.abs(giro));
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(largo * 0.32, 0); ctx.lineTo(-largo, 0); ctx.stroke();
      ctx.fillStyle = '#2A303C'; ctx.fillRect(largo * 0.18, -2, 16, 12);
      ctx.restore();
      ctx.fillStyle = '#FFB13B'; ctx.fillRect(gx - 7, gTop - 14, 14, 14);
      // Gancho con losa colgando hacia el piso en curso
      const enCurso = avance % 1;
      if (t3 > 0 && t3 < 1) {
        const hx = x0 + bw * 0.5;
        const hy = mix(gTop + 10, topeObra - fh * 0.9, easeOut(clamp(enCurso * 1.3)));
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(hx, gTop); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = '#B9B4AA'; ctx.fillRect(hx - bw * 0.22, hy, bw * 0.44, 5);
      }
      ctx.globalAlpha = 1;
    }

    // ── 5. Entrega: árboles, faroles y acceso iluminado
    if (t5 > 0) {
      for (const a of this.arboles) {
        const tt = easeOut(clamp(t5 * 1.6 - a.d * 0.6));
        if (tt <= 0) continue;
        const ax = (a.x < 0.5 ? x0 - 30 - a.x * w * 0.3 : x0 + bw + prof + 20 + (a.x - 0.5) * w * 0.3);
        const ar = 16 * a.r * tt;
        ctx.fillStyle = '#2B231C'; ctx.fillRect(ax - 1.5, suelo - ar * 1.6, 3, ar * 1.6);
        ctx.fillStyle = mixColor('#3F6B4A', '#173326', noche);
        ctx.beginPath(); ctx.arc(ax, suelo - ar * 1.9, ar, 0, Math.PI * 2); ctx.fill();
      }
      // Acceso
      ctx.fillStyle = `rgba(255,200,110,${0.9 * t5})`;
      ctx.fillRect(cx - bw * 0.12, suelo - fh * 0.85, bw * 0.24, fh * 0.85 - 6);
      // Halo cálido
      const halo = ctx.createRadialGradient(cx, suelo, 0, cx, suelo, bw * 1.2);
      halo.addColorStop(0, `rgba(255,170,70,${0.22 * t5})`); halo.addColorStop(1, 'rgba(255,170,70,0)');
      ctx.fillStyle = halo; ctx.fillRect(cx - bw * 1.2, suelo - bw * 1.2, bw * 2.4, bw * 1.4);
    }
  }
}
