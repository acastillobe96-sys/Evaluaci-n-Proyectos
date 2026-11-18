// Mapas con Leaflet (se carga solo cuando hace falta). Mosaicos estándar de OpenStreetMap;
// en modo oscuro se invierten por CSS (.leaflet-tile-pane). Para producción, usar un proveedor con clave.
import L from 'leaflet';
import type { ProyectoLigero } from '../lib/types.ts';
import { formatCLPAprox, formatUF } from '../lib/format.ts';
import { escapeHtml, reduceMotion } from './dom.ts';

interface Contexto { root: string; explicitIndex: boolean; ufCLP: number; demo: boolean }

const ATRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function cargarCss(root: string): void {
  if (document.querySelector('link[data-leaflet], style[data-leaflet]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `${root}css/leaflet.css`;
  l.dataset['leaflet'] = '';
  document.head.append(l);
}

function capaBase(map: L.Map, mosaicos: boolean, ps: Array<{ lat: number; lng: number; comuna?: string }> = []): void {
  if (mosaicos) { L.tileLayer(TILES, { attribution: ATRIB, maxZoom: 19 }).addTo(map); return; }
  // Demo: el visor bloquea imágenes externas. Mapa esquemático: retícula + nombres de comuna.
  map.getContainer().classList.add('map-esquema');
  const porComuna = new Map<string, { lat: number; lng: number; n: number }>();
  for (const p of ps) {
    if (!p.comuna) continue;
    const c = porComuna.get(p.comuna) ?? { lat: 0, lng: 0, n: 0 };
    c.lat += p.lat; c.lng += p.lng; c.n++;
    porComuna.set(p.comuna, c);
  }
  for (const [nombre, c] of porComuna) {
    L.marker([c.lat / c.n + 0.006, c.lng / c.n], { icon: L.divIcon({ className: '', html: `<span class="map-comuna">${escapeHtml(nombre)}</span>`, iconSize: [0, 0] }), interactive: false, keyboard: false }).addTo(map);
  }
  map.attributionControl.addAttribution('Mapa esquemático · ubicaciones ficticias');
}

const href = (c: Contexto, slug: string) => `${c.root}proyectos/${slug}/${c.explicitIndex ? 'index.html' : ''}`;

function popup(c: Contexto, p: ProyectoLigero): string {
  return `<a href="${href(c, p.slug)}" class="block">
    ${p.img ? `<img src="${p.img.startsWith('data:') ? escapeHtml(p.img) : c.root + escapeHtml(p.img)}" alt="" width="260" height="163" class="block aspect-[16/10] w-full object-cover" loading="lazy">` : ''}
    <span class="block p-4">
      <span class="block text-xs font-bold uppercase tracking-[.14em] text-muted">${escapeHtml(p.comuna)} · ${escapeHtml(p.entregaCorto)}</span>
      <span class="mt-1 block text-lg font-bold leading-tight text-ink">${escapeHtml(p.nombre)}</span>
      <span class="mt-2 block font-display text-2xl font-extrabold leading-none text-ink">Desde ${formatUF(p.desdeUF)}</span>
      <span class="mt-1 block text-xs text-muted">${formatCLPAprox(p.desdeUF, c.ufCLP)}${p.precision === 'aproximada' ? ' · ubicación aproximada' : ''}</span>
      <span class="mt-3 inline-flex items-center gap-1 text-sm font-bold text-accent-ink">Ver proyecto →</span>
    </span>
  </a>`;
}

export async function crearMapaProyectos(el: HTMLElement, extra: HTMLElement, c: Contexto): Promise<{ actualizar: (ps: ProyectoLigero[]) => void }> {
  if (!c.demo) cargarCss(c.root);
  const map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
  let conBase = false;
  const capa = L.layerGroup().addTo(map);
  const anim = !reduceMotion();
  // Etiquetas de precio solo desde zoom 14; antes, puntos (evita superposición en Ñuñoa/Santiago Centro)
  const compacto = () => el.classList.toggle('map-compact', map.getZoom() < 14);
  map.on('zoomend', compacto);

  return {
    actualizar(ps) {
      if (!conBase) { capaBase(map, !c.demo, ps); conBase = true; }
      capa.clearLayers();
      extra.replaceChildren();
      const markers: L.Marker[] = [];
      for (const p of ps) {
        const icon = L.divIcon({
          className: '',
          html: `<span class="pin${p.precision === 'aproximada' ? ' border-dashed' : ''}">${formatUF(p.desdeUF)}</span>`,
          iconSize: [0, 0],
        });
        const m = L.marker([p.lat, p.lng], { icon, title: `${p.nombre}, desde ${formatUF(p.desdeUF)}`, zIndexOffset: 0, alt: p.nombre, keyboard: true, riseOnHover: true })
          .bindPopup(popup(c, p), { maxWidth: 260, minWidth: 260, offset: [0, -30], autoPanPadding: [24, 24] });
        m.on('popupopen', () => m.getElement()?.querySelector('.pin')?.classList.add('is-active'));
        m.on('popupclose', () => m.getElement()?.querySelector('.pin')?.classList.remove('is-active'));
        capa.addLayer(m);
        markers.push(m);
      }
      // Santiago y regiones: se encuadra Santiago y se ofrece saltar a regiones lejanas.
      const rm = ps.filter((p) => p.lat < -33 && p.lat > -34);
      const lejos = ps.filter((p) => !rm.includes(p));
      const base = rm.length ? rm : ps;
      const bounds = L.latLngBounds(base.map((p) => [p.lat, p.lng] as [number, number]));
      if (base.length === 1) map.setView(bounds.getCenter(), 15, { animate: anim });
      else map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15, animate: anim });
      if (lejos.length && rm.length) {
        for (const p of lejos) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn btn-sm btn-dark pointer-events-auto shadow-lg';
          b.innerHTML = `${escapeHtml(p.nombre)} · ${escapeHtml(p.comuna)} <svg class="size-4" aria-hidden="true"><use href="#i-arrow-right"></use></svg>`;
          b.addEventListener('click', () => {
            map.flyTo([p.lat, p.lng], 14, { animate: anim, duration: 1.2 });
            map.once('moveend', () => markers[ps.indexOf(p)]?.openPopup());
            volver.hidden = false;
          });
          extra.append(b);
        }
        const volver = document.createElement('button');
        volver.type = 'button';
        volver.className = 'btn btn-sm btn-outline pointer-events-auto shadow-lg';
        volver.textContent = 'Volver a Santiago';
        volver.hidden = true;
        volver.addEventListener('click', () => { map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15, animate: anim }); volver.hidden = true; });
        extra.append(volver);
      }
      requestAnimationFrame(() => { map.invalidateSize(); compacto(); });
    },
  };
}

export async function crearMapaFicha(el: HTMLElement, root: string): Promise<void> {
  if (el.dataset['tiles'] !== 'no') cargarCss(root);
  const lat = Number(el.dataset['lat']), lng = Number(el.dataset['lng']);
  const map = L.map(el, { scrollWheelZoom: false }).setView([lat, lng], 15);
  capaBase(map, el.dataset['tiles'] !== 'no');
  const aprox = el.dataset['precision'] === 'aproximada';
  L.marker([lat, lng], {
    icon: L.divIcon({ className: '', html: `<span class="pin${aprox ? ' border-dashed' : ''}">${escapeHtml(el.dataset['nombre'] ?? '')}</span>`, iconSize: [0, 0] }),
    keyboard: false, interactive: false,
  }).addTo(map);
  if (aprox) L.circle([lat, lng], { radius: 250, color: '#FF9800', weight: 1.5, fillOpacity: 0.08, dashArray: '4 4' }).addTo(map);
}
