# Euro Inmobiliaria · /proyectos (demo con el estilo de Grus)

Versión de prueba de la página de proyectos de [euroinmobiliaria.cl/proyectos](https://euroinmobiliaria.cl/proyectos) y de la ficha de cada proyecto, con el lenguaje visual, el stack y los patrones de Grus. **No toca el sitio en producción.**

- **Estructura, ritmo, tipografía y movimiento:** Grus. Ver [`docs/grus-design-audit.md`](docs/grus-design-audit.md).
- **Identidad:** Euro. Logo oficial y un solo acento, el naranja `#FF9800` del logo.
- **Datos:** `data/proyectos.json` es la única fuente de verdad (18 proyectos).

## Cómo correrlo

Requiere Node 22.18 o superior (ejecuta TypeScript sin compilar) y Chromium/Playwright solo para las pruebas en navegador.

```bash
npm install
```

```bash
npm run build      # genera dist/ (19 páginas estáticas)
```

```bash
npm run serve      # http://localhost:4173/proyectos/
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run lint` | ESLint (typescript-eslint strict) + `tsc --noEmit` (TS estricto) |
| `npm test` | Pruebas unitarias: filtros, URL, orden, formato y validación (17) |
| `npm run test:e2e` | Pruebas en navegador con Playwright contra `npm run serve` (16) |
| `npm run screenshots` | Capturas en 1440, 768 y 390 px, en claro y oscuro → `docs/screenshots/` |
| `./scripts/lighthouse.sh` | Lighthouse móvil, 3 corridas por página |
| `npm run data` | Regenera `data/proyectos.json` desde `data/fuentes/` |
| `node scripts/build.ts --indexable` | Build sin `noindex` (para producción) |

**Valor de la UF:** se edita en `site.config.json` (`ufCLP`). Hoy está en **$40.000, referencial**: no hay llamadas a API.

## Stack (igual que Grus)

- **HTML estático:** un generador (`scripts/build.ts`) crea una página por ruta, con URLs limpias (`/proyectos/vitro/`), metadata, Open Graph y JSON-LD por página.
- **Estilos:** Tailwind 3.4 compilado, con los tokens como variables CSS en `:root`, modo oscuro por sistema y botón de tema.
- **Scripts:** sueltos por página (`site.js`, `proyectos.js`, `ficha.js`), escritos en **TypeScript estricto** (`src/`) y compilados con esbuild. Se versionan con `?v=hash`.
- **Mapa:** Leaflet 1.9.4 servido localmente, que se carga **solo** al abrir la vista Mapa o al acercarse a la ubicación en la ficha.
- **Fuentes:** Atkinson Hyperlegible Next y Barlow Semi Condensed 800, autoalojadas y precargadas.

```
src/lib/       tipos (Proyecto, Filtros…), filtros + URL, formato chileno, validación — puros y probados
src/render/    plantillas HTML (layout, card, /proyectos, ficha) con escape automático
src/client/    comportamiento en el navegador (header, filtros, mapa, lightbox, formulario)
src/styles/    tokens y componentes
scripts/       extracción, imágenes, build, servidor, capturas, Lighthouse
data/          proyectos.json + fuentes/ (datos crudos extraídos, para trazabilidad)
```

## Qué incluye

**/proyectos**
- **Hero-película: el edificio se construye con el scroll.** Pasa por terreno, fundaciones, obra gruesa piso a piso con grúa, terminaciones y entrega con las luces encendidas al anochecer.
  - Es un canvas 2,5D con inercia que depende del tiempo y no de los FPS (`src/client/obra.ts`, `pelicula.ts`).
  - Cada etapa muestra los proyectos reales en ese estado: 2028 en verde, 2027 en obra, subsidio y entrega inmediata. Un botón aplica ese filtro y baja a los resultados.
  - Tiene un riel de etapas, un contador de pisos, una barra de progreso y un botón "Ir al buscador".
- Barra de filtros fija al hacer scroll: comuna (multi), dormitorios (1/2/3), entrega (Inmediata/2027/2028), precio "desde" (slider en UF) y subsidio.
- Orden por nombre, precio ascendente o descendente, y entrega más próxima.
- Filtros **en vivo** y sincronizados con la URL (`?comuna=nunoa&dorm=2`). Se restauran al recargar y funcionan con atrás/adelante.
- Chips de filtros activos con "x" y "Limpiar todo".
- En celular, un botón "Filtros" abre un **bottom sheet** que usa el mismo DOM que la barra de escritorio.
- **Grilla** (3/2/1 columnas) o **Mapa**: pines con precio y mini card al hacer clic. Con poco zoom los pines pasan a ser puntos para no superponerse, y hay un acceso directo a Coquimbo.
- Estado vacío **solo** con 0 resultados, y bloque de confianza con cifras publicadas por Euro.

**Movimiento (Motion 11, la librería de Framer Motion sin React)**
- **Animación "layout" al filtrar u ordenar:** las cards se deslizan a su nueva posición (FLIP con resorte).
- **Entradas:** las cards entran en cascada, los titulares aparecen palabra por palabra desde una máscara y las cifras cuentan hacia arriba.
- **Resortes:** los chips de filtros y los pines del mapa (que caen en cascada) entran con resorte.
- **Transición entre páginas** (View Transitions): la foto y el nombre de la card se transforman en el hero de la ficha.
- **Ficha:**
  - parallax en el hero;
  - la galería se descubre con clip-path;
  - "Avance de obra" construye ese edificio hasta su etapa según la fecha de entrega (ilustrativo);
  - una barra inferior con precio y "Cotizar" sube con resorte.
- **Accesibilidad:** con `prefers-reduced-motion` todo queda quieto y la película sigue el scroll sin inercia.
- **LCP:** el titular principal se anima con CSS a partir de spans generados en el HTML, para no retrasarlo.

**/proyectos/[slug]** (18 fichas; la muestra principal es Mapocho 3521)
- Hero, resumen clave (desde UF + CLP, entrega "1er semestre 2027", tipologías y metro) y beneficios vigentes.
- Galería con lightbox (teclado, deslizar y foco atrapado) y tipologías con su planta real, superficies y precio.
- Ubicación con mapa y puntos de interés tal como los publica Euro en cada ficha.
- Formulario de cotización con validación (RUT módulo 11, teléfono chileno) y éxito **simulado**: no envía datos.
- WhatsApp flotante con el mensaje prellenado. Aparece cuando los botones del resumen salen de la pantalla.

**Header:** un solo `<nav>` responsive (hoy está duplicado en el DOM), transparente sobre el hero y sólido al bajar. Incluye mega-menú por comuna con "desde UF" y el botón Portal Clientes.

## Mejoras de UX respecto al sitio actual

1. El estado vacío ya no aparece junto a los 18 proyectos: solo se muestra con 0 resultados.
2. Los filtros se aplican al instante (sin botón "Buscar") y quedan en la URL para compartirlos.
3. La tipología lleva etiquetas: "1–2 dorm · 1–2 baños" (hoy aparece "1 a 2 / 1 a 2" sin rótulo).
4. La card ya no muestra "Plusvalía %".
5. Cada precio muestra su equivalente aproximado en pesos.
6. El menú existe una sola vez en el DOM; antes había un menú de escritorio y otro móvil.
7. Los slugs coinciden con el nombre: `mirador-irarrazaval` (antes `mirador-irarrazabal`) y `marina-pacifico` (antes `mirador-pacifico`).
8. El subsidio se marca por tipología en la ficha y por proyecto en la card.
9. Cumple AA. En modo claro, el naranja de Euro se usa como fondo con texto oscuro, porque el blanco sobre naranja no pasa AA.

## Supuestos

- **Dormitorios y baños:** las dos columnas sin etiqueta del sitio actual se interpretan como dormitorios y baños (se confirma con las tipologías de cada ficha).
- **Subsidio a la tasa:** `subsidio = true` si **al menos una tipología** del proyecto tiene la marca "Subsidio a la tasa" en su ficha de euroinmobiliaria.cl. Resultado: 13 de 18. No se marcan Alto Irarrázaval, Mirador Irarrázaval, Santa Elena 1670, Vista Portugal ni Vitro.
- **Imagen de la card:** se usa la foto de fachada de la galería del proyecto, recortada a 16:10. El "main.webp" del listado actual es un banner de 2,5:1 con el edificio a un costado y, recortado a 16:10, el edificio se pierde. En Vista Portugal se usó la 5.ª imagen de la galería, porque la 1.ª es un dormitorio.
- **Textos alternativos:** se escribieron mirando cada imagen ("Living comedor, departamento Vitro"). Las fotos reales de pilotos se rotularon como "departamento piloto" cuando se veían como tales.
- **Puntos de interés:** se muestran tal como los informa Euro en cada ficha. No se verificaron por separado.
- **Grus:** su código no fue accesible desde este entorno. El audit se basa en la guía de réplica de Grus (tokens, tipografías, movimiento y stack con valores exactos).
- **Mapa:** usa los mosaicos estándar de OpenStreetMap, aptos para una demo. En producción conviene un proveedor con clave (CARTO, que usaba la primera versión, ahora la exige).

## Pendientes de validar

| Tema | Detalle |
|---|---|
| **Coordenadas de Nova Parque** | El sitio no publica coordenadas y OpenStreetMap solo da el centroide del tramo (en el límite con Ñuñoa). Se **interpoló** por numeración de Av. Vicuña Mackenna entre dos proyectos con coordenadas publicadas por Euro (N° 1432 y N° 5970). Es aproximada y la ficha lo indica con un círculo. |
| **Coordenadas de Vista Portugal** | El sitio no las publica. Se tomaron de OpenStreetMap (calza con el número 755). |
| **Rosas 1444** | El nombre dice 1444 pero la dirección publicada es **Rosas 1438**. |
| **Guillermo Mann 1401** | La tabla y el listado dicen "2 dorm", pero la ficha tiene un modelo "1 dorm 1 baño" (el "desde" de UF 3.461) cargado con `dormitorios: 2`. Hoy el filtro "1 dorm" no lo muestra. |
| **Plusvalía** | No se muestra. Euro no publica la base de cálculo y Marina Pacífico y Nova Parque figuran con 0 %. Está en `data/proyectos.json` por si se decide usar, con tooltip. |
| **Valor UF** | $40.000 es referencial; actualizar `site.config.json`. |
| **Vicente Valdés** | Existe en el sitio (`/proyectos/vicente-valdes`, desde UF 3.244), pero no aparece en el listado ni en la tabla del brief. No se incluyó. |
| **Redirecciones** | Si se adoptan los slugs nuevos, hay que redirigir `mirador-irarrazabal` → `mirador-irarrazaval` y `mirador-pacifico` → `marina-pacifico`. |
| **Beneficios y precios** | Copiados de cada ficha (18-nov-2026). Están sujetos a las bases notariales y cambian seguido. |
| **"+35 años"** | Cifras de `euroinmobiliaria.cl/sobre-euro-inmobiliaria`: +35 años, +20.000 unidades vendidas en 15 años y +9.000 en desarrollo. |

## Demo navegable (marca ficticia)

`npm run build:demo` genera `dist-demo/`: el mismo sitio con una marca ficticia ("Inmobiliaria Demo"), proyectos inventados e ilustraciones SVG en vez de fotos.
- Todo va en línea, con Leaflet y Motion desde CDN.
- El mapa es esquemático y los filtros van en el `#` de la URL.
- Es la versión publicada como artefacto para probarla en el navegador. **No usa la marca, los datos de contacto ni las fotos de Euro.**

## Lighthouse (móvil, mediana de 3 corridas, servidor local)

| Página | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/proyectos/` | 95 (95/95/96) | 100 | 100 | 69* |
| `/proyectos/mapocho-3521/` | 99 | 100 | 100 | 69* |
| `/proyectos/vitro/` | 99 | 100 | 100 | 69* |

\* La demo lleva `noindex` y `robots.txt` con `Disallow` a propósito, para que no la indexen. Con `node scripts/build.ts --indexable`, SEO da **100** en ambas plantillas. CLS ≤ 0,001 en todas las páginas. LCP con la red móvil simulada: 2,9 s en `/proyectos/` y 1,9 s en las fichas, con el servidor local comprimiendo con gzip como cualquier hosting real.

## Verificación

- `npm run lint` y `npm test` sin errores; `npm run test:e2e`: 16/16. Cubre:
  - conteos por filtro;
  - restauración de la URL;
  - estado vacío;
  - bottom sheet;
  - menú único;
  - mega-menú;
  - mapa;
  - lightbox;
  - formulario;
  - 18 fichas con JSON-LD.
- Capturas en `docs/screenshots/` (1440, 768 y 390 px, en claro y oscuro), sin errores de consola ni recursos 404.
