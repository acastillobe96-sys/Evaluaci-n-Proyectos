// Reproductor de secuencia de cuadros ligada al scroll (técnica de la guía de Grus):
// - descarga progresiva como blobs: 1 de cada 8, luego 1 de cada 4, 2 y el resto (no compite con el LCP);
// - decodifica fuera del hilo principal (createImageBitmap) solo alrededor del cuadro actual
//   y libera los lejanos para no gastar memoria en el celular;
// - funde el cuadro actual con el siguiente; si falta uno, usa los más cercanos ya cargados;
// - dibuja con "cover" (recorta para llenar el lienzo) respetando el devicePixelRatio.

const VENTANA = 8;      // cuadros decodificados a cada lado del actual
const PARALELO = 6;     // descargas simultáneas

export class Secuencia {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly blobs: Array<Blob | null>;
  private readonly bitmaps = new Map<number, ImageBitmap>();
  private readonly decodificando = new Set<number>();
  private w = 0; private h = 0; private dpr = 1;
  private actual = 0;
  private ultimoDibujo = '';
  onCuadro: (() => void) | null = null;
  private readonly canvas: HTMLCanvasElement;
  private readonly base: string;
  readonly total: number;

  constructor(canvas: HTMLCanvasElement, base: string, total: number) {
    this.canvas = canvas; this.base = base; this.total = total;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.blobs = Array.from({ length: total }, () => null);
    this.medir();
  }

  private url(i: number): string { return `${this.base}f${String(i).padStart(3, '0')}.webp`; }

  medir(): void {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ultimoDibujo = '';
    this.dibujar(this.actual);
  }

  /** Empieza la descarga; el primer cuadro primero, luego en pasadas cada vez más finas. */
  cargar(): void {
    const orden: number[] = [0];
    const visto = new Set(orden);
    for (const paso of [8, 4, 2, 1]) for (let i = 0; i < this.total; i += paso) if (!visto.has(i)) { visto.add(i); orden.push(i); }
    let k = 0;
    const siguiente = async (): Promise<void> => {
      while (k < orden.length) {
        const i = orden[k++]!;
        try {
          const r = await fetch(this.url(i));
          if (!r.ok) continue;
          this.blobs[i] = await r.blob();
          if (Math.abs(i - this.actual) <= VENTANA) this.decodificar(i);
        } catch { /* red: se reintenta al volver a pasar cerca */ }
      }
    };
    for (let n = 0; n < PARALELO; n++) void siguiente();
  }

  private decodificar(i: number): void {
    const b = this.blobs[i];
    if (!b || this.bitmaps.has(i) || this.decodificando.has(i)) return;
    this.decodificando.add(i);
    createImageBitmap(b).then((bmp) => {
      this.decodificando.delete(i);
      if (Math.abs(i - this.actual) > VENTANA * 2) { bmp.close(); return; }
      this.bitmaps.set(i, bmp);
      this.ultimoDibujo = '';
      this.onCuadro?.();
    }).catch(() => this.decodificando.delete(i));
  }

  private mantenerVentana(c: number): void {
    for (let i = Math.max(0, c - VENTANA); i <= Math.min(this.total - 1, c + VENTANA); i++) this.decodificar(i);
    for (const [i, bmp] of this.bitmaps) if (Math.abs(i - c) > VENTANA * 2) { bmp.close(); this.bitmaps.delete(i); }
  }

  private cercano(i: number, dir: -1 | 1): number | null {
    for (let k = i; k >= 0 && k < this.total; k += dir) if (this.bitmaps.has(k)) return k;
    return null;
  }

  private pintar(bmp: ImageBitmap, alpha: number): void {
    const { ctx } = this;
    const W = this.canvas.width, H = this.canvas.height;
    const s = Math.max(W / bmp.width, H / bmp.height);
    const dw = bmp.width * s, dh = bmp.height * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(bmp, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
  }

  /** p ∈ [0, 1] → cuadro (con fundido entre el anterior y el siguiente disponibles). */
  dibujar(p: number): void {
    const f = Math.min(1, Math.max(0, p)) * (this.total - 1);
    const c = Math.round(f);
    this.actual = c;
    this.mantenerVentana(c);
    const a = this.cercano(Math.floor(f), -1) ?? this.cercano(Math.floor(f), 1);
    if (a == null) return;
    const b = this.cercano(Math.ceil(f), 1);
    let t = 0;
    if (b != null && b !== a) t = Math.min(1, Math.max(0, (f - a) / (b - a)));
    const clave = `${a}|${b}|${t.toFixed(3)}|${this.canvas.width}`;
    if (clave === this.ultimoDibujo) return;
    this.ultimoDibujo = clave;
    this.pintar(this.bitmaps.get(a)!, 1);
    if (b != null && t > 0.01) this.pintar(this.bitmaps.get(b)!, t);
  }
}
