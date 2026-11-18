# Audit de diseño — Grus

> **Fuente.** El sitio publicado de Grus (`claude.ai/artifact/NykHz3eBvNDKyjkJfAF3od`) no es accesible desde este entorno (404) y el único artifact compartido con nombre Grus ("Grus Casa 36") es un visor de mapa sin código legible. Este audit se basa en la **guía de réplica de Grus** (`pagina-comercial-tipo-grus.md`), que documenta los tokens, el stack y los patrones del sitio con valores exactos. Lo que la guía no fija se marca como *(decisión demo)*.

## 1. Stack

| Capa | Grus | Demo Euro |
|---|---|---|
| Framework | HTML estático, sin framework | Igual. Un generador en Node (`scripts/build.mjs`) produce una página estática por ruta |
| CSS | Tailwind compilado (`tailwind.css`) + variables CSS en `:root` | Tailwind 3.4 compilado + los mismos tokens como variables |
| JS | Scripts sueltos por funcionalidad (`stage.js`, `motion-fx.js`, `glass.js`, `journey.js`…), versionados con `?v=` | Scripts sueltos por página (`proyectos.js`, `ficha.js`, `site.js`), escritos en **TypeScript estricto** y compilados con esbuild; versionados por hash |
| Animación | Motion `motion@11.11.13` + CSS | Solo CSS + `IntersectionObserver` (las animaciones de la demo no necesitan Motion; ahorra ~18 KB) |
| 3D / mapas | three.js `0.159.0`, cargado al acercarse | Leaflet `1.9.4`, servido localmente y cargado **solo** al abrir la vista Mapa |
| Íconos | SVG en línea | SVG en línea (sprite propio, trazo 1.75) |

## 2. Tokens

### Color

| Token | Grus | Demo Euro | Rol |
|---|---|---|---|
| `--paper` | `#F3F4F0` | `#F3F4F0` | Fondo claro (neutro de Grus) |
| `--surface` | blanco | `#FFFFFF` | Tarjetas |
| `--ink` | casi negro | `#0F1720` | Texto |
| `--muted` | — | `#4A5560` | Texto secundario (AA sobre `--paper`: 7,1:1) |
| `--line` | — | `#DADDD6` | Bordes |
| `--deep` / `--deep-2` | Azul petróleo `#0B3A4B` / `#06212B` | Azul Euro `#1D428A` / `#0C1F45` | Superficies oscuras (hero, pie, banner) |
| `--accent` | Rojo `#D8001A` (uno solo) | Naranja Euro `#FF9800` (uno solo) | Botones, punto final de titulares, pines, foco |
| `--accent-ink` | — | `#A85A00` | Variante del acento para **texto** sobre claro (AA 4,8:1). El naranja puro sobre blanco no llega a AA |
| `--on-accent` | blanco | `#0F1720` | Texto sobre el naranja (8,9:1). Blanco sobre `#FF9800` no cumple AA |

Regla de la guía aplicada: **los neutros son de Grus y Euro aporta solo el acento**. El azul del logo (`#1D428A`) reemplaza al petróleo de Grus en las superficies oscuras porque es el color de la marca; sigue cumpliendo el mismo papel.

Modo oscuro: `prefers-color-scheme: dark` con `:root:not([data-theme="light"])`, más `:root[data-theme="dark"]` para el botón de tema, como en Grus.

### Tipografía

| Uso | Grus | Demo Euro |
|---|---|---|
| Texto | Atkinson Hyperlegible Next 400/500/700/800 | Igual (variable, autoalojada) |
| Titulares de sección | Barlow Semi Condensed 800, MAYÚSCULAS, cierran con punto de acento ("PROYECTOS**.**") | Igual |
| Logotipo | Outfit 800 | El logo SVG oficial de Euro |

Escala *(decisión demo, a partir de los tamaños de la guía)*: titulares de sección `clamp(2.25rem, 5vw, 4.5rem)` con interlineado 0,92; titulares de tarjeta 1,25 rem/700; cuerpo de 1 rem a 1,0625 rem con interlineado 1,55; cejas de 0,75 rem/700, `letter-spacing .14em`, en mayúsculas.

### Espaciado, radios, sombras y breakpoints

- **Márgenes:** laterales iguales, de 16 px en celular (`env(safe-area-inset-*)`) a 48 px en escritorio; contenedor máximo de 1320 px.
- **Ritmo vertical:** secciones con `clamp(4rem, 9vw, 8rem)`.
- **Radios:** 12 px en controles, 20 px en tarjetas y 999 px en píldoras.
- **Sombras:** suaves y de dos capas (`0 1px 2px rgb(15 23 32/.06), 0 12px 32px -12px rgb(15 23 32/.18)`).
- **Vidrio:** `backdrop-filter: blur(16px) saturate(160%)` sobre `rgba(12,31,69,.58)` (el oscuro de Grus `rgba(6,33,43,.58)` llevado a la marca).
- **Breakpoints de verificación:** 1440, 1024, 768 y 390 px (los de Grus). Tailwind `sm 640 · md 768 · lg 1024 · xl 1280`.

## 3. Componentes

| Componente | Patrón Grus | Uso en la demo |
|---|---|---|
| Header | Transparente sobre el hero y sólido al bajar. Durante la película se reduce a una píldora mínima (logo + CTA) | Transparente sobre el hero, sólido con vidrio al pasar 24 px. **Un solo `<nav>`** responsive |
| Hero | Ceja "Categoría · Hecho en Chile", titular corto con palabra en itálica, frase de valor, CTA, tarjeta de vidrio con 4 datos duros y chips | Hero compacto con ceja, titular, contador dinámico y tarjeta de vidrio "Subsidio a la tasa" |
| Titular de sección | Mayúsculas Barlow 800 + punto de acento | Igual |
| Botón primario | Fondo de acento, píldora, `scale(.97)` al presionar | Igual (texto oscuro sobre naranja por AA) |
| Chips | Píldoras de tipos de recinto | Filtros activos con ×, comunas |
| Tarjetas con foto | Foto con zoom 1.02–1.03 dentro del marco; la tarjeta con enlace sube 2 px | Card de proyecto |
| Tarjeta destacada | Borde de acento + etiqueta (planes) | Badge "Entrega inmediata" |
| Formulario | Corto, con etiquetas visibles | Cotización con validación |
| Pie | Una línea de créditos, privacidad y soporte | Pie con contacto real de Euro, redes y legales |

## 4. Movimiento (criterio Emil Kowalski, tal como lo aplica Grus)

- **Curva:** `--ease-out: cubic-bezier(.23,1,.32,1)` para entradas. Nunca `ease-in`.
- **Botones:** `scale(.97)` al presionar (120 ms). El hover solo aplica con `@media (hover:hover) and (pointer:fine)`.
- **Transiciones:** nunca `transition: all`; siempre las propiedades exactas.
- **Fotos:** zoom de 1.03 en 600 ms. Las tarjetas suben 2 px.
- **Entradas:** una vez, en cascada, `fill-mode: backwards`. Scroll reveal de 16 px + opacidad en 700 ms.
- **Prohibido:** carruseles automáticos, inclinaciones 3D y pestañas que cambian solas.
- **`prefers-reduced-motion`:** cada animación tiene su versión sin desplazamiento.

## 5. Convenciones

- Secciones con `id` en español (`#inicio`, `#proyectos`, `#confianza`).
- Scripts por responsabilidad, en minúsculas con guion.
- Imágenes en WebP/AVIF con `width`/`height` explícitos.
- Datos en archivos aparte (Grus: `journey-presets.js`; demo: `data/proyectos.json`).
- Cifras de ejemplo marcadas como tales; contacto sin números inventados.
