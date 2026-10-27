# Prototipo funcional — Torre de control (PuertoTrack)

Construye un **prototipo navegable (dummy) para demo con cliente**, sin backend real. Todo con datos mock en memoria. Debe sentirse "vivo": navegación completa, modales, filtros y búsqueda funcionando, simulación de tiempo real.

## Fuente de diseño (Figma)

- Archivo: https://www.figma.com/design/4pQ5RxcgM8ULuqozpaWo3s/Torre-de-control
- **Usar SOLO la sección `v2 — Wireframes con menú superior` (node `26:2`).** Ignora la sección `v1 — anterior (sidebar)` (`34:1308`).
- Usa el MCP de Figma (`get_design_context` / `get_screenshot`) por node ID para cada pantalla. Son wireframes: respeta estructura, contenido, columnas y textos; el estilo visual lo pulimos con Tailwind (sobrio, denso, tipo herramienta operativa).

| # | Pantalla | Node | Ruta sugerida |
|---|---|---|---|
| — | TopNav (componente) | `26:3` | layout global |
| 01 | Torre de control — Lista (pantalla de entrada) | `26:52` | `/` |
| 02 | Torre de control — Mapa | `28:50` | `/mapa` |
| 03a | Modal viaje — Bitácora e información | `57:552` | modal `?viaje=SRV-…` |
| 03b | Modal viaje — Historial del viaje (tabla + mapa + reproducción) | `57:1412` | pestaña de la modal |
| 04 | Historial de viajes | `29:487` | `/historial` |
| 05 | Alertas — Bandeja y protocolo de atención | `31:194` | `/alertas` |
| 06 | Admin — Reglas de alertas | `31:604` | `/admin/reglas` |
| 06m | Modal — Nueva regla de alerta | `59:608` | modal |
| 06b | Admin — Protocolos de atención | `59:1034` | `/admin/reglas?tab=protocolos` |
| 07 | Flota — Unidades | `32:290` | `/flota/unidades` |
| 07m | Modal — Editar unidad (solo placa, económico, base) | `59:1276` | modal |
| 08 | Flota — Operadores y custodios | `32:741` | `/flota/operadores` |
| 08m | Modal — Agregar operador/custodio | `59:1745` | modal |
| 09 | Catálogos — Geocercas (crear, editar, sincronizar) | `34:386` | `/catalogos/geocercas` |
| 10 | Admin — Usuarios y permisos | `34:742` | `/admin/usuarios` |
| 11 | Menú superior — desplegables + decisiones | `34:1147` | referencia (no es pantalla) |
| 12 | Super-admin OvenLabs — Empresas | `60:802` | `/consola` (layout propio) |
| 13 | Propuesta de identidad | `61:802` | referencia (no es pantalla) |
| 14 | Viajes — Nuevo viaje (formulario + validación + vista previa de ruta) | `77:802` | `/viajes/nuevo` |

Lee primero el frame **11**: define la estructura de menús y lista las decisiones de producto ya tomadas. Nota: la decisión #12 ("geocercas solo visualización") quedó superada por la #34 (sí se crean y sincronizan en Catálogos; en el Mapa solo se visualizan).

## Stack

- React + Vite + TypeScript + Tailwind
- React Router (rutas arriba), estado con Zustand o Context
- Mapa: **Leaflet + react-leaflet** con tiles OSM, centrado en el corredor Manzanillo–Guadalajara–Bajío. Geocercas como círculos/polígonos; dibujo con `leaflet-draw` o `@geoman-io/leaflet-geoman` en la pantalla 09
- Iconos: lucide-react
- Sin backend. Datos en `src/mocks/*.ts`. Deployable como estático (Docker + nginx, para Easypanel)

## Reglas de producto (no improvisar)

- Vocabulario: **"Viaje"**, nunca "Servicio". IDs tipo `SRV-2603-0184`.
- Sin dashboard. Entrada = Torre de control en vista Lista.
- Menú superior horizontal: Torre de control ▾, Viajes ▾, Historial, Alertas (badge), Flota ▾, Catálogos ▾, Admin ▾ + buscador global + indicador "En vivo" + usuario.
- La torre solo muestra viajes activos; filtros por estado/terminal viven en Historial.
- "Agrupar por: Grupo de viaje" + toggle "Mostrar grupos"; orden por severidad (Crítico, Alto, Medio, OK).
- Clic en un viaje (lista, tarjeta del mapa o alerta) abre **modal**, no página.
- Unidades vienen del GPS: solo placa, económico y base son editables.
- La consola super-admin (12) es la vista de OvenLabs, con su propio header; accesible por un switch de rol oculto (ej. menú de usuario → "Cambiar a consola OvenLabs").
- Si algo no está en el diseño ni aquí, **pregunta antes de inventarlo**.

## Datos mock

Extrae del Figma y mantén consistentes entre pantallas: los 12 viajes activos (SRV-2603-0184 a 0195), tractos T-101…T-112 con placas, operadores, contenedores (tipo 20DC/40HC/40RF, IMP/EXP/FULL), tramo actual (1/3, 2/3, 3/3), ETA, último GPS, velocidad, tiempo detenido + motivo, bitácora, candado, días libres, ubicación, grupos de viaje (GDL-1803-A, BAJÍO-1803-B, PTO-1803-C, GDL-1803-D, sin grupo), clientes, alertas, reglas, protocolos, geocercas, usuarios, empresas (consola).

Coordenadas: genera lat/lng plausibles por ubicación (Manzanillo, Jalipa, Atenquique, Libramiento de Colima, Acatlán de Juárez, Autopista 54D, León, Lagos de Moreno, etc.).

## Interacciones que deben funcionar

- **Simulación en vivo**: cada 5–10 s mover unidades en movimiento a lo largo de su ruta, actualizar velocidad, "último GPS" y el contador "actualizado hace X s". Color de último GPS: verde < 5 min, ámbar < 30, rojo > 30.
- Búsqueda (viaje, tracto, operador, contenedor), agrupar/desagrupar, "Solo con alertas", selector de columnas.
- Mapa: capas toggleables (Geocercas, Tráfico (dummy), Recorrido del día, Zonas de riesgo); clic en tarjeta centra la unidad; resumen inferior (en movimiento / detenidas / con alerta / sin señal).
- Modal de viaje: pestañas; bitácora con alta de evento (texto + foto mock), edición de info del viaje; historial con reproducción del recorrido (play/pausa/velocidad, slider de tiempo).
- Alertas: seleccionar alerta → protocolo paso a paso, marcar pasos, cerrar alerta (decrementa badge).
- CRUD en memoria: reglas (modal), protocolos, editar unidad, agregar operador/custodio, geocercas (dibujar círculo/polígono/corredor, guardar → estado "pendiente de enviar" → "sincronizada" tras 2 s), permisos por usuario.
- Historial: filtros, KPIs, paginación, "Exportar CSV" real con los mock.
- **Nuevo viaje (14)**: validación en vivo (dígito de control ISO 6346 del contenedor, sello requerido, operador/tracto disponibles); "Crear viaje" deshabilitado mientras haya errores; al crear, el viaje se agrega a los mocks, aparece en la Torre de control con toast y abre su modal. "Usar plantilla de ruta" precarga los 3 tramos. "Guardar borrador" persiste en el store.
- Toasts para acciones guardadas.

## Pendiente de diseño (en el menú pero sin pantalla)

Viajes ▾ Contenedores y días libres · Plantillas de ruta — Torre ▾ Mis grupos de viaje — Flota ▾ Remolques y chasis · Candados — Catálogos ▾ Terminales y patios · Navieras · Rutas frecuentes — Admin ▾ Integraciones · Mi empresa — pestañas de la modal de viaje distintas de Bitácora e Historial — link público para el cliente final.

Por defecto: dejarlos en el menú con una pantalla "Próximamente" limpia (y pestañas deshabilitadas en la modal), salvo que se indique otra cosa.

## Branding

"PuertoTrack" es placeholder. Pon nombre, iniciales y color primario en `src/config/brand.ts` para poder cambiar a Tramo / Faro / Atraque (frame 13) sin tocar componentes.

## Entregable

1. Proyecto corriendo con `npm run dev`.
2. `Dockerfile` (build + nginx) para Easypanel.
3. README corto con rutas y cómo cambiar la marca.

Trabaja por fases: (1) layout + TopNav + mocks + Lista + modal de viaje; (2) Mapa + simulación; (3) Historial, Alertas, Admin; (4) Flota, Geocercas, Usuarios; (5) Consola OvenLabs y pulido. Muestra avance al terminar cada fase.
