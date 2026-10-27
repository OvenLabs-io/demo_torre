# Frames 04, 05, 06, 06m, 06b — Historial, Alertas, Reglas y Protocolos

Extraído con `get_design_context` completo. Ítem activo del TopNav: 04 → Historial, 05 → Alertas, 06/06m/06b → Admin.

---

## 04 Historial de viajes `29:487` · captura `screens/04-historial.png`

**Layout:** encabezado → tarjeta de filtros → franja de KPIs → tabla con paginación al pie.

- Título `Historial`; subtítulo `Viajes cerrados y filtros por estado, terminal, cliente y fechas. Lo que no debe estorbar en la torre de control.`; botón secundario (icono descarga) `Exportar CSV`.
- **Filtros:** buscador 240px `Buscar viaje, contenedor, tracto…` · selects con valor `Fechas: 1–18 mar 2026` · `Estado: Todos` · `Terminal: Todas` · `Cliente: Todos` · selects placeholder `Operador`, `Con incidencias` · texto derecha `148 viajes · 1 de 8`.
- **KPIs** (valor 20px mono bold `#111827`, etiqueta 10px `#6b7280`, 5 celdas separadas por `#e5e7eb`):
  | Valor | Etiqueta |
  |---|---|
  | 148 | Viajes cerrados en el periodo |
  | 1 h 42 min | Espera promedio en terminal |
  | 11 | Viajes con incidencia |
  | $34,200 | Demoras pagadas a navieras |
  | 96.6 % | Entregas a tiempo |

**Tabla** (anchos: VIAJE 120, TIPO 60, CLIENTE 170, CONTENEDOR 120, TERMINAL 100, TRACTO · OPERADOR 190, INICIO 110, CIERRE 110, ESPERA TERMINAL 100, INCIDENCIAS 90, ESTADO flexible; filas 38px)

| Viaje | Tipo | Cliente | Contenedor | Terminal | Tracto · operador | Inicio | Cierre | Espera terminal | Incidencias | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| SRV-2603-0171 | IMP | Empaques del Valle | MSKU4471920 | CONTECON | T-108 · R. Vázquez | 14 mar 07:10 | 14 mar 19:40 | 2 h 05 min | 0 | Cerrado |
| SRV-2603-0170 | EXP | Calzado Horizonte | MSCU9018237 | SSA México | T-111 · R. Cárdenas | 14 mar 06:30 | 14 mar 21:15 | 1 h 10 min | 1 | Cerrado con incidencia |
| SRV-2603-0169 | IMP | Tecnomaq Bajío | CMAU5510294 | TIMSA | T-102 · C. Méndez | 13 mar 09:00 | 14 mar 08:20 | **3 h 40 min** (rojo) | 2 | Cerrado con incidencia |
| SRV-2603-0168 | IMP | Polímeros Potosinos | HLXU3382910 | CONTECON | T-105 · H. López | 13 mar 08:15 | 13 mar 23:05 | 0 h 55 min | 0 | Cerrado |
| SRV-2603-0167 | EXP | Comercializadora Anáhuac | ONEU6629103 | OCUPA | T-114 · E. Zamora | 12 mar 10:40 | 13 mar 15:30 | 1 h 25 min | 0 | Cerrado |
| SRV-2603-0166 | IMP | Automotriz del Centro | COSU8812034 | SSA México | T-109 · F. Orozco | 12 mar 07:00 | 12 mar 20:10 | 2 h 30 min | 0 | Cerrado |
| SRV-2603-0165 | EXP | Empaques del Valle | MSKU1120394 | CONTECON | T-101 · J. L. Ramírez | 11 mar 08:00 | 11 mar 19:00 | 1 h 15 min | 0 | Cancelado |
| SRV-2603-0164 | IMP | Calzado Horizonte | TCLU7720193 | TIMSA | T-106 · A. Salgado | 11 mar 06:20 | 11 mar 22:45 | **4 h 10 min** (rojo) | 3 | Cerrado con incidencia |

- Viaje: mono bold `#1e3a5f`. Contenedor, fechas, esperas: mono. Espera > 3 h en rojo `#dc2626`.
- Incidencias: `0` en `#9ca3af`; >0 mono bold `#c2410c`.
- Estado: punto 8px + texto `#374151`. Cerrado `#059669`, Cerrado con incidencia `#C2410C`, Cancelado `#9CA3AF`.
- **Pie** (`#f9fafb`): `Mostrando 1–20 de 148` · paginador de cuadros 24px `‹ 1 2 3 … 8 ›` (activo navy).

---

## 05 Alertas — Bandeja y protocolo de atención `31:194` · captura `screens/05-alertas.png`

**Layout:** encabezado → dos columnas: bandeja (izq., 470px) y detalle (der., flexible: banda roja con datos clave → mapa 220px → abajo protocolo (flex) + barra lateral 300px `#f9fafb`).

- Título `Alertas` + chips mono 10px: `5 abiertas` (`#fef2f2`/`#dc2626`), `3 en atención` (`#fffbeb`/`#b45309`).
- Subtítulo `Bandeja operativa del monitorista. Las reglas que las generan viven en Admin → Reglas de alertas.`; botón secundario (engrane) `Reglas de alertas`.
- **Toolbar bandeja** (`#f9fafb`): segmentado 26px 11px Medium: `Todas 8` | `Abiertas 5` (activo navy) | `En atención 3` | `Cerradas hoy 12`; select 100px `Severidad`.

**Ítems** (punto de severidad 10px + título 12px SemiBold; hora a la derecha 10px; línea de contexto 11px; chips severidad + estado + meta mono 10px)

| # | Título | Hora | Contexto | Severidad | Estado | Meta |
|---|---|---|---|---|---|---|
| 1 (sel.) | Detención no autorizada | Hace 12 min | T-103 · SRV-2603-0186 · Atenquique, Jal. | Crítico | Abierta | `SLA 5 min · vencido` (rojo) |
| 2 | Pérdida de señal GPS | Hace 28 min | T-107 · SRV-2603-0190 · última pos. Atenquique | Crítico | En atención | Luis G. Ochoa |
| 3 | Apertura de candado fuera de geocerca | Hace 3 min | T-103 · SRV-2603-0186 | Crítico | Abierta | `SLA 5 min · 2 min` (gris) |
| 4 | Espera excesiva en terminal | Hace 18 min | T-105 · CONTECON · 1 h 14 min | Alto | Abierta | `SLA 15 min · vencido` (rojo) |
| 5 | Días libres por vencer | Hace 41 min | MSKU4821736 · vence mañana | Alto | En atención | Karla Benítez |
| 6 | Desvío de ruta > 2 km | Hace 9 min | T-111 · SRV-2603-0194 · Libramiento de León | Alto | Abierta | `SLA 15 min · 6 min` (gris) |
| 7 | Exceso de velocidad | Hace 21 min | T-112 · 98 km/h · Carr. a Lagos | Medio | En atención | Iván Castañeda |
| 8 | Licencia por vencer | Hace 2 h | Óscar D. Peña · 05 oct 2026 | Medio | Abierta | `SLA 30 min` (gris) |

- Fila seleccionada: fondo `#fffafa` + barra izquierda 3px `#1e3a5f`.
- Puntos: Crítico `#DC2626`, Alto `#C2410C`, Medio `#B45309`. Chips 9px Medium radio 3. Estado: Abierta `#f3f4f6`/`#374151`; En atención `#fffbeb`/`#b45309`.

**Detalle — banda** (`#fef2f2`): chip `CRÍTICO` (blanco sobre `#dc2626`) · título 15px bold `Detención no autorizada · fuera de geocerca` · derecha mono bold rojo `SLA vencido · 12 min abierta` · campos (etiqueta 9px mayúsculas `#6b7280`, valor 12px):
- VIAJE `SRV-2603-0186 · IMP` (mono) · TRACTO `T-103 · 81-BC-9N` (mono) · OPERADOR `Miguel Ángel Torres · 312 118 4402` · CLIENTE `Automotriz del Centro` · DETENIDA DESDE `07:33 h · 3 h 14 min` (mono)

**Mapa de contexto** (220px): globo arriba-izq `Atenquique, Jal. · Autopista 54D km 78 · 2.1 km fuera de geocerca de ruta`; lugares Atenquique, Tuxpan, Tonila; vía `Autopista 54D · geocerca de ruta (±1 km)`; POI `Gasolinera km 112 · parada autorizada`; marcadores T-103 (rojo, cuadrado, halo, `0 km/h` rojo), T-102 (verde, triángulo, `72 km/h`), T-107 (gris, `sin señal`). Escala `5 km`. Pie `Base cartográfica ilustrativa · datos GPS cada 30 s`.

**Protocolo** — etiqueta `Protocolo de atención · Detención no autorizada`; derecha `2 de 4 completados`
| # | Paso | Subetiqueta | Estado |
|---|---|---|---|
| 1 | Llamar al operador (2 intentos) | Hecho · 10:31 · sin respuesta | Hecho: círculo verde ✓, tarjeta `#f9fafb`, texto tenue |
| 2 | Contactar custodia / segundo número | Hecho · 10:38 · custodia en camino, 25 min | Hecho |
| 3 | Notificar al cliente y al jefe de tráfico | Pendiente · plantilla WhatsApp lista | Pendiente (círculo blanco borde `#9ca3af` con número) + botón `Marcar hecho` |
| 4 | Escalar a seguridad y levantar reporte | Pendiente | Pendiente |

- Barra de acciones: `Registrar acción` (nota) · `Llamar operador` (teléfono) · espaciador · `Cerrar con motivo ▾` (secundario) · `Escalar` (rojo).

**Barra lateral** (300px): `ATENDIDA POR` avatar `LO` navy, `Luis Gerardo Ochoa`, `Tomó la alerta 10:35 h` · `LÍNEA DE TIEMPO` (hora mono 10px + texto 11px): 10:47 Escalamiento automático: SLA vencido · 10:38 Custodia confirmada, ETA 25 min · 10:31 Llamada sin respuesta (2) · 10:35 Alerta tomada por L. Ochoa · 10:35 Alerta generada por regla R-01 · `REGLA QUE LA GENERÓ` `R-01 · Detención fuera de geocerca > 30 min · Crítico · SLA 5 min`.

Inconsistencias normalizadas en el prototipo: pestañas filtran de verdad; alerta "Abierta" muestra "Sin asignar" + Tomar alerta; línea de tiempo cronológica.

---

## 06 Admin — Reglas de alertas `31:604` · captura `screens/06-reglas.png`

- Título `Reglas de alertas`; subtítulo `Reglas de negocio que generan las alertas. Cada regla apunta a un protocolo de atención (pestaña Protocolos). Se crean y editan en una modal para no salir de la página.`; primario `Nueva regla`.
- Pestañas: `Reglas de alertas (10)` (activa) · `Protocolos de atención (7)` (en el prototipo: 9).
- Columnas (anchos): toggle 40 · ID 50 · REGLA 260 · CONDICIÓN 300 · SEVERIDAD 90 · SLA 70 · PROTOCOLO 170 · NOTIFICAR A 260 · DISPAROS 30 D 90 (der.) · acciones (botón `Editar`). Filas 48px.

| Activa | ID | Regla | Condición | Severidad | SLA | Protocolo | Notificar a | Disparos 30 d |
|---|---|---|---|---|---|---|---|---|
| on | R-01 | Detención no autorizada | Detenida > 30 min fuera de geocerca de terminal, patio, cliente o parada autorizada | Crítico | 5 min | Detención (4 pasos) | Monitorista, jefe de tráfico, seguridad | 23 |
| on | R-02 | Pérdida de señal GPS | Sin posición > 15 min con viaje activo | Crítico | 5 min | Sin señal (3 pasos) | Monitorista, proveedor GPS | 41 |
| on | R-03 | Apertura de candado | Candado abierto fuera de geocerca de cliente o terminal | Crítico | 5 min | Candado (4 pasos) | Monitorista, seguridad, custodia | 4 |
| on | R-04 | Botón de pánico | Operador activa pánico desde la app | Crítico | 2 min | Pánico (5 pasos) | Todos + custodia + seguridad | 1 |
| on | R-05 | Desvío de ruta | > 2 km fuera de la ruta planeada por > 5 min | Alto | 15 min | Desvío (3 pasos) | Monitorista, jefe de tráfico | 17 |
| on | R-06 | Espera excesiva en terminal | Dentro de geocerca de terminal > 2 h | Alto | 15 min | Terminal (2 pasos) | Jefe de tráfico, ejecutivo de cuenta | 58 |
| on | R-07 | Días libres por vencer | Días libres restantes ≤ 2 y vacío no devuelto | Alto | 15 min | Vacíos (2 pasos) | Tráfico, ejecutivo de cuenta | 12 |
| on | R-08 | Exceso de velocidad | > 95 km/h durante 2 min | Medio | 30 min | Velocidad (1 paso) | Monitorista | 96 |
| **off** | R-09 | Zona de riesgo (nombre gris) | Entra a geocerca "zona a evitar" o tramo con incidente activo | Alto | 10 min | Riesgo (3 pasos) | Monitorista, custodia | — |
| on | R-10 | Vigencias de operador | Licencia o apto médico vence en ≤ 15 días | Bajo | 1 día | — | Recursos humanos, tráfico | 3 |

- ID mono bold navy; nombre 12px Medium; SLA y disparos mono. Chips severidad 10px: Crítico `#fef2f2/#dc2626`, Alto `#fff7ed/#c2410c`, Medio `#fffbeb/#b45309`, Bajo `#f3f4f6/#6b7280`.

---

## 06m Modal — Nueva regla de alerta `59:608`

Modal 840×720 sobre la página 06. Header: `Nueva regla de alerta` / `Condición → severidad → protocolo → a quién avisar` / `×`.

1. `Nombre de la regla` (input) `Detención no autorizada`
2. `CONDICIÓN` — constructor en oraciones (chips bloqueados `#f3f4f6`, texto `#6b7280`, icono candado), caja `#f9fafb`:
   - [🔒 `Cuando la unidad está`] [select `Detenida`] [select `más de`] [input mono `30 min`]
   - [🔒 `y está`] [select `fuera de`] [select flexible `geocercas tipo: Terminal, Patio, Destino, Parada autorizada`]
   - [🔒 `y`] [select `Ignición`] [select `OFF o cualquiera`] + link `+ agregar condición` (navy 11px Medium)
3. Fila de 3 selects: `Severidad` `Crítico` · `SLA de atención` `5 min` · `Protocolo de atención` `Detención (4 pasos)`
4. Fila de 3 selects: `Aplica a` `Todos los grupos de viaje` · `Horario` `24/7` · `Repetir si sigue activa` `Cada 30 min`
5. `NOTIFICAR` (checkboxes): ☑ Monitorista en turno · ☑ Jefe de tráfico · ☑ Seguridad · ☐ Custodia asignada · ☐ Cliente (link público)
6. `CANAL` (checkboxes): ☑ En la app · ☑ WhatsApp · ☐ Correo · ☐ Llamada automática
7. Banner ámbar: `Vista previa: en los últimos 30 días esta regla habría disparado 23 alertas (promedio 0.8 por día).`

Pie (`#f9fafb`): toggle ON `Regla activa al guardar` · `Cancelar` · `Guardar regla` (primario).

---

## 06b Admin — Protocolos de atención `59:1034` · captura `screens/06b-protocolos.png`

- Título `Reglas de alertas` (misma página, otra pestaña); subtítulo `Protocolos: la lista de pasos que sigue el monitorista cuando salta una alerta. Cada regla usa uno.`; primario `Nuevo protocolo`.
- Pestañas: `Reglas de alertas (10)` · `Protocolos de atención (7)` (activa).
- **Lista izquierda** (400px): buscador `Buscar protocolo…`; ítem = nombre 12px Medium + sublínea 10px + chip regla mono 9px (`#f3f4f6`/`#374151`). Seleccionado: `#f3f4f6` + barra izquierda 3px navy.

| Nombre | Sublínea | Regla |
|---|---|---|
| **Detención no autorizada** (sel.) | 4 pasos · SLA 5 min | R-01 |
| Sin señal GPS | 3 pasos · SLA 5 min | R-02 |
| Apertura de candado | 4 pasos · SLA 5 min | R-03 |
| Botón de pánico | 5 pasos · SLA 2 min | R-04 |
| Desvío de ruta | 3 pasos · SLA 15 min | R-05 |
| Espera en terminal | 2 pasos · SLA 15 min | R-06 |
| Vacíos por vencer | 2 pasos · SLA 15 min | R-07 |
| *(prototipo)* Exceso de velocidad | 1 paso · SLA 30 min | R-08 |
| *(prototipo)* Zona de riesgo | 3 pasos · SLA 10 min | R-09 |

- **Editor** — header `#f9fafb`: `Protocolo · Detención no autorizada` / `Usado por R-01 · última edición 12 mar 2026 · Daniela Fuentes`; botones `Duplicar`, `Historial de cambios`.
- Tarjetas de paso: asa `⋮⋮` (`#d1d5db`) · número en círculo navy 24px · input título + input descripción · fila de 3 selects · `×` borrar (`#9ca3af`).

| # | Título | Descripción | Responsable | Tiempo máx. | Evidencia | Extra |
|---|---|---|---|---|---|---|
| 1 | Llamar al operador | 2 intentos · si contesta, registrar motivo y cerrar o continuar | Monitorista | 3 min | nota | — |
| 2 | Contactar custodia o segundo número | Custodio asignado al viaje o contacto de emergencia del operador | Monitorista | 5 min | nota | — |
| 3 | Notificar al cliente y al jefe de tráfico | Plantilla WhatsApp "Unidad detenida" con ubicación y hora | Monitorista | 5 min | Automático al marcar | Toggle ON `Envía mensaje al marcar` |
| 4 | Escalar a seguridad y levantar reporte | Reporte con posición, fotos de bitácora y línea de tiempo; aviso a autoridad si aplica | Jefe de seguridad | 15 min | reporte PDF | — |

- Botón discontinuo `Agregar paso` (icono +).
- `CIERRE DE LA ALERTA`: ☑ Requiere motivo de cierre · ☑ Requiere al menos 1 evidencia · ☐ Solo puede cerrar el jefe de tráfico
- Pie: nota `Los cambios aplican a alertas nuevas; las abiertas conservan su protocolo.` · `Descartar` · `Guardar protocolo` (primario).
