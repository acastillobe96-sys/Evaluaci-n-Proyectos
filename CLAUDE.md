# Automatizacion Martin

Evaluador de proyectos inmobiliarios: a partir de la cabida (PDF) de un terreno, generar la planilla de evaluación (.xlsm) con superficies, precios por tipología y respaldo de mercado (base Inciti).

Instrucciones completas: ver `PROMPT_Evaluador_de_Proyectos.md` (origen: OneDrive de Martin Barriga, "Archivos de chat de Microsoft Teams").

## Archivos necesarios en esta carpeta
- `Base Evaluaciones 4 etapas v13.xlsm` (plantilla con macros)
- `Mcdo Nuevo Consolidado may-jun.xlsx` (base de mercado Inciti)
- `gen.py` (genera el .xlsm editando el XML interno desde config.json)
- `precios.py` (calcula precios por radio desde la base Inciti)

## Regla clave
Nunca guardar el .xlsm con openpyxl: editar solo el XML interno vía `gen.py`. openpyxl solo para leer/verificar.

## Notas de la configuración (17-nov-2026)
- `mcdo.xlsx` es una copia de `Mcdo Nuevo Consolidado may-jun.xlsx` (precios.py lee ese nombre fijo, desde esta carpeta).
- Prueba completa OK: precios.py → gen.py → testzip → abre en LibreOffice.
- LibreOffice no recalcula al convertir (muestra los valores en caché de la Base); Excel sí recalcula (fullCalcOnLoad).
- `E1 Planilla!H8` = Torres (gen.py lo deja en 1).
- gen.py no muestra/oculta las hojas `E2 FF`…`E4 FF` (quedan ocultas). Pendiente confirmar si la macro las muestra.
