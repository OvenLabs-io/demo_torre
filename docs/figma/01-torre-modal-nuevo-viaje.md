# Frames 01, 02, 03a, 03b, 14 — Torre de control, modal de viaje, Nuevo viaje

Extraído de Figma v2. Parte del contenido se obtuvo con `get_metadata` + capturas 1:1 porque `get_design_context` alcanzó el límite del plan Starter. Colores muestreados de las capturas.

---

## 01 Torre de control — Viajes activos (Lista) `26:52` · captura `screens/01-torre-lista.png`

**Layout:** TopNav → encabezado (título, chips, subtítulo; indicador de vista a la derecha) → tarjeta de toolbar → tarjeta de tabla (encabezados, filas de grupo, filas de viaje) → leyenda al pie dentro de la tarjeta.

**Encabezado**
- Título `Torre de control`
- Chip `12 viajes activos` (fondo `#ECFDF5`, texto `#047857`, mono)
- `#10B981` punto + `En vivo · actualizado hace 8 s`
- Subtítulo: `Solo viajes activos. Para viajes cerrados o filtrar por estado y terminal ve a Historial.`
- Derecha (caja con borde): icono lista + `Vista: Lista` + tenue `· cambia desde Torre de control ▾` (la vista se cambia desde el desplegable del TopNav).

**Toolbar**
- Buscador: `Buscar viaje, tracto, operador, contenedor…`
- Dropdown `Agrupar por: Grupo de viaje ⌄`
- Checkbox `Solo con alertas` (sin marcar)
- Checkbox `Mostrar grupos` (marcado, caja navy, texto navy)
- Contador: `Mostrando 12 de 12 · ordenado por severidad`
- Botón `Columnas` (icono columnas)

**Columnas:** `Viaje` | `Tracto` | `Operador` | `Contenedor(es)` | `Tramo actual` | `ETA` | `Último GPS` | `Vel.` | `Detenido` | `Bitácora` | `Candado` | `Días libres` | `Ubicación`

Celdas:
- Viaje: ID (mono bold navy) + chip de tipo debajo (IMP fondo `#E8EEF5`; EXP fondo `#EEF2F0`; texto gris 9px).
- Tracto: económico (mono bold) + placa tenue debajo.
- Contenedor(es): número(s) mono + tipo debajo.
- Detenido: duración + motivo debajo. Rojo si motivo = Fuera de geocerca o Sin señal GPS; oscuro para En terminal / En patio. Vacío = "—" `#CED1D7`.
- Bitácora: icono nota + conteo; 0 en gris `#9CA3AF`.
- Candado: punto + texto. Cerrado `#059669`, Abierto `#DC2626` (texto también rojo).
- Días libres: chip mono. ≥3 d verde; 1–2 d ámbar; 0 d y "Demora 1 d" rojo; "—" vacío.
- Último GPS: chip mono verde `#ECFDF5/#047857`, ámbar `#FFFBEB/#B45309`, rojo `#FEF2F2/#DC2626`.
- Vel.: "0 km/h" en gris `#6B7280`; >0 oscuro.
- Ubicación: icono pin + texto.

**Filas de grupo:** `▾ GRUPO <nombre>` + `N viajes` + chip de severidad. Fondo `#F3F4F6`.

| Grupo | Viaje | Tipo | Tracto · placa | Operador | Contenedor(es) / tipo | Tramo actual | ETA | Último GPS | Vel. | Detenido / motivo | Bitác. | Candado | Días libres | Ubicación |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **GDL-1803-A** · 2 · Crítico | SRV-2603-0184 ⚑ | IMP | T-101 · 46-AX-7T | José Luis Ramírez | MSKU4821736 / 40HC | 1/3 Retiro en terminal | 11:01 h | 10:41 (verde) | 0 km/h | **3 h 06 min** / Fuera de geocerca (rojo) | 3 | Cerrado | 1 d (ámbar) | Patio externo, Jalipa |
| | SRV-2603-0185 | EXP | T-102 · 52-AY-3R | Carlos Méndez Silva | MSCU7149205 / 40HC | 2/3 Carga en cliente | 11:35 h | 10:39 (verde) | 72 km/h | — | 1 | Cerrado | 4 d (verde) | Autopista 54D, km 112 |
| **BAJÍO-1803-B** · 2 · Crítico | SRV-2603-0186 ⚑ | IMP | T-103 · 81-BC-9N | Miguel Ángel Torres | CMAU3817294 / 20DC | 2/3 Entrega en cliente | 12:19 h | 09:57 (rojo) | 0 km/h | **3 h 14 min** / Fuera de geocerca (rojo) | 5 | **Abierto** (rojo) | 2 d (ámbar) | Atenquique, Jal. |
| | SRV-2603-0187 | EXP·FULL | T-104 · 37-AD-4K | Roberto Navarro Cruz | HLXU6294018 + ONEU2847193 / 40RF | 3/3 Entrega en terminal | 11:17 h | 10:36 (verde) | 61 km/h | — | 2 | Cerrado | 3 d (verde) | Libramiento de Colima |
| **PTO-1803-C** · 2 · Alto | SRV-2603-0188 | IMP | T-105 · 94-BE-2M | Héctor Iván López | ONEU2847193 / 40HC | 1/3 Retiro en terminal | 10:55 h | 10:34 (verde) | 0 km/h | 1 h 14 min / En terminal | 0 | Cerrado | 1 d (ámbar) | Acceso CONTECON |
| | SRV-2603-0189 | EXP | T-106 · 28-AF-6P | Arturo Salgado Ruiz | COSU7182940 / 40HC | 2/3 Carga en cliente | 12:57 h | 10:40 (verde) | 78 km/h | — | 1 | Cerrado | 5 d (verde) | Autopista GDL–Colima |
| **GDL-1803-D** · 2 · Alto | SRV-2603-0190 | IMP | T-107 · 63-BG-1S | Jorge Alberto Luna | MSKU3928174 / 20DC | 1/3 Retiro en terminal | 12:11 h | 09:48 (rojo) | 0 km/h | **55 min** / Sin señal GPS (rojo) | 2 | Cerrado | 2 d (ámbar) | Atenquique, Jal. |
| | SRV-2603-0191 | EXP | T-108 · 15-AH-8V | Ricardo Vázquez Mora | TCLU8294017 / 40RF | 3/3 Entrega en terminal | 11:24 h | 10:38 (verde) | 66 km/h | — | 0 | Cerrado | 6 d (verde) | Acatlán de Juárez, Jal. |
| **Sin grupo** · 4 · Medio | SRV-2603-0192 | IMP·FULL | T-109 · 72-BJ-5C | Fernando Orozco Díaz | CMAU5182039 + HLXU4829103 / 40HC | 2/3 Entrega en cliente | 13:45 h | 10:37 (verde) | 48 km/h | — | 4 | Cerrado | 0 d (rojo) | Zona Industrial, GDL |
| | SRV-2603-0193 | EXP | T-110 · 49-AK-3D | Mario Alberto Ríos | ONEU7391028 / 40HC | 1/3 Retiro de vacío | 11:58 h | 10:35 (verde) | 0 km/h | 23 min / En patio | 0 | Cerrado | — | Patio CMA CGM, Manzanillo |
| | SRV-2603-0194 | IMP | T-111 · 86-BL-7F | Raúl Cárdenas Vega | COSU2948173 / 40HC | 3/3 Devolución de vacío | 14:20 h | 10:40 (verde) | 64 km/h | — | 1 | Cerrado | Demora 1 d (rojo) | Libramiento de León, Gto. |
| | SRV-2603-0195 | EXP | T-112 · 31-AM-9G | Óscar Daniel Peña | MSCU5829104 / 40HC | 2/3 Carga en cliente | 15:10 h | 10:31 (ámbar) | 69 km/h | — | 3 | Cerrado | 4 d (verde) | Carr. a Lagos de Moreno |

- ⚑ = franja izquierda roja 3px `#DC2626` + fondo de fila `#FFFAFA` (solo 0184 y 0186).
- **Leyenda:** `Leyenda:` Crítico `#DC2626`, Alto `#C2410C`, Medio `#B45309`, OK `#059669`. Derecha: `Clic en una fila abre el detalle del viaje · Último GPS: verde < 5 min, ámbar < 30 min, rojo > 30 min`.
- Inconsistencias: ONEU2847193 aparece en 0187 y 0188 (se normaliza).

---

## 02 Torre de control — Viajes activos (Mapa) `28:50` · captura `screens/02-torre-mapa.png`

**Layout:** encabezado (igual a 01) → toolbar → mapa (izq., ~978px) + panel de tarjetas "Viajes activos" (der., 400px).

- Subtítulo: `Mismo conjunto de viajes activos que la lista. Las geocercas se visualizan, no se crean aquí.`
- Derecha: icono mapa + `Vista: Mapa` + `· cambia desde Torre de control ▾`
- Toolbar: buscador, `Agrupar por: Grupo de viaje ⌄`, `Solo con alertas`, etiqueta `CAPAS` + toggles: `Geocercas` (activo, navy), `Tráfico`, `Recorrido del día`, `Zonas de riesgo`.

**Mapa**
- Leyenda arriba-izq: `GEOCERCAS (SOLO LECTURA)` · `Terminal / patio` (navy) · `Destino de cliente` (verde) · `Punto de interés` (ámbar) · `Zona a evitar` (rojo) · nota `Se sincronizan desde la plataforma GPS`.
- Zoom abajo-der: `+`, `−`, `⌖`. Escala `50 km`. Pie: `Base cartográfica ilustrativa · datos GPS cada 30 s`.
- Resumen abajo-izq: `8 en movimiento` (`#059669`) · `3 detenidas` (`#B45309`) · `2 con alerta` (`#DC2626`) · `1 sin señal` (`#9CA3AF`) (suma 14 en el diseño → se calcula en vivo).
- Marcadores: círculo con chip `T-xxx  NN km/h`. En movimiento: verde `#059669` con flecha de rumbo. Detenido: icono cuadrado (ocre `#B45309`). Alerta: halo rojo pulsante 42px. Sin señal: gris `#9CA3AF`, chip `sin señal`.
  - T-101 0 km/h (rojo, halo, Manzanillo) · T-102 72 · T-103 0 (rojo, halo, Atenquique/Tuxpan) · T-104 61 · T-105 detenido ocre (Manzanillo) · T-106 78 · T-107 sin señal · T-108 66 · T-109 48 (Guadalajara) · T-110 detenido ocre (Manzanillo) · T-111 64 (cerca de León) · T-112 69 (cerca de Lagos de Moreno).

**Panel derecho**
- Título `Viajes activos`; subtítulo `12 visibles en el mapa · clic centra la unidad`; dropdown `Severidad ⌄`.
- Tarjeta: (1) ID + chip tipo (gris) · chip severidad · `ETA hh:mm h`; (2) cliente; (3) `T-xxx · placa` + operador; (4) tramo a la izq.; velocidad + chip `GPS hh:mm` a la der.; (5) icono reloj + texto de detención, punto candado + texto, chip días libres; (6) pin + ubicación. Tarjetas críticas con franja roja izquierda; seleccionada teñida `#FFFAFA`.

| Viaje | Sev. | ETA | Cliente | Tracto · placa | Operador | Tramo | Vel. | GPS | Detención | Candado | Días | Ubicación |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SRV-2603-0184 · IMP | Crítico | 11:01 h | Empaques del Valle | T-101 · 46-AX-7T | José Luis Ramírez | 1/3 Retiro en terminal | 0 km/h | 10:41 verde | 3 h 06 min fuera de geocerca (rojo) | Candado cerrado | 1 d | Patio externo, Jalipa |
| SRV-2603-0186 · IMP | Crítico | 12:19 h | Automotriz del Centro | T-103 · 81-BC-9N | Miguel Ángel Torres | 2/3 Entrega en cliente | 0 km/h | 09:57 rojo | 3 h 14 min fuera de geocerca (rojo) | Candado abierto (rojo) | 2 d | Atenquique, Jal. |
| SRV-2603-0190 · IMP | Alto | 12:11 h | Empaques del Valle | T-107 · 63-BG-1S | Jorge Alberto Luna | 1/3 Retiro en terminal | 0 km/h | 09:48 rojo | 55 min · sin señal GPS (rojo) | Candado cerrado | 2 d | Atenquique, Jal. |
| SRV-2603-0188 · IMP | Alto | 10:55 h | Polímeros Potosinos | T-105 · 94-BE-2M | Héctor Iván López | 1/3 Retiro en terminal | 0 km/h | 10:34 verde | 1 h 14 min en terminal (gris) | Candado cerrado | 1 d | Acceso CONTECON |
| SRV-2603-0185 · EXP | — | 11:35 h | Calzado Horizonte | T-102 · 52-AY-3R | Carlos Méndez Silva | 2/3 Carga en cliente | 72 km/h | 10:39 verde | En movimiento | Candado cerrado | 4 d | Autopista 54D, km 112 |
| SRV-2603-0187 · EXP · FULL | Medio | 11:17 h | Tecnomaq Bajío | T-104 · 37-AD-4K | Roberto Navarro Cruz | 3/3 Entrega en terminal | 61 km/h | 10:36 | En movimiento | Candado cerrado | 3 d | Libramiento de Colima |

- Pie: `+ 6 viajes más · desplaza para ver`. Los clientes solo aparecen en 02.

---

## 03a Modal — Viaje: bitácora e información `57:552` · captura `screens/03a-modal-bitacora.png`

Fondo: lista 01 bajo overlay. Modal ~1240×880.

**Header:** `SRV-2603-0186` (mono) · chip `IMPORTACIÓN` (`#E8EEF5`/`#1E3A5F`) · punto navy + `En cliente · 2/3 Entrega en cliente` · chip `Crítico · detenida 3 h 14 min fuera de geocerca` (`#FEF2F2`/`#DC2626`) · derecha tenue `Automotriz del Centro · CMA CGM · BKG-MX-681694` · botón `×`.

**Pestañas:** `Bitácora e información` (5, activa) · `Historial del viaje` · `Contenedor y EIR` (1) · `Documentos` (3) · `Custodia` · `Alertas` (2). Contadores en chip `#F3F4F6`.

**Columna izquierda — tarjeta "Nuevo evento de operación"**: pista derecha `Queda con autor, hora y posición GPS` · dropdown `Motivo: Parada no autorizada ⌄` · input `Descripción breve…` · botón cámara `Adjuntar fotos` · 2 miniaturas + `2 fotos · 1.8 MB` · primario `Publicar en bitácora`.

**Tarjeta "Bitácora del viaje"**: chip `5 eventos · 3 con fotos` · dropdown `Todos los tipos ⌄` · botón `PDF`.

| Hora | Punto | Tag | Título | Meta | Fotos |
|---|---|---|---|---|---|
| 10:47 h | `#DC2626` | ALERTA | Unidad detenida fuera de geocerca · 3 h 14 min | Sistema · Atenquique, Jal. · alerta tomada por Luis G. Ochoa | — |
| 10:31 h | `#C2410C` | LLAMADA | Operador no contesta (2 intentos) | Luis G. Ochoa · Monitorista | — |
| 09:57 h | `#6B7280` | GPS | Última posición recibida · 0 km/h, ignición OFF | Sistema | — |
| 09:14 h | `#059669` | GEOCERCA | Salida de CONTECON · EIR de salida sin daños | Sistema · Miguel Á. Torres (App operador) | 5 miniaturas + `+1` |
| 08:40 h | `#1E3A5F` | NOTA | Operador reporta fila en puerta 3, ~40 min | Miguel Á. Torres · App operador · Puerta 3 CONTECON | 2 miniaturas |

Cada entrada tiene link `Ver en mapa` (navy) a la derecha.

**Columna derecha — "Información del viaje"** (chip `Editable` `#FFFBEB`/`#B45309`)
| Campo | Valor |
|---|---|
| Folio | SRV-2603-0186 |
| Tipo | Importación ⌄ |
| Cliente | Automotriz del Centro ⌄ |
| Operador | Miguel Ángel Torres ⌄ |
| Tracto | T-103 · 81-BC-9N ⌄ |
| Remolque / chasis | CH-203 · 40 pies ⌄ |
| Grupo de viaje | BAJÍO-1803-B ⌄ |
| Contenedor | CMAU3817294 · 20DC |
| Sello | CMX820174 |
| Origen (geocerca) | CONTECON · Manzanillo ⌄ |
| Destino (geocerca) | Automotriz del Centro · planta, Aguascalientes ⌄ |
| Devolución de vacío | Patio CMA CGM · límite 20 mar (2 días libres) ⌄ |

Pares en la misma fila: Folio/Tipo, Operador/Tracto, Remolque/Grupo, Contenedor/Sello. Toggle OFF `Requiere custodia` / `Sin custodia asignada · tramo de riesgo medio` (caja `#F9FAFB`). Botones: `Cerrar viaje` (rojo), `Compartir link` (borde), `Guardar cambios` (navy).

---

## 03b Modal — Viaje: historial del viaje `57:1412` · captura `screens/03b-modal-historial.png`

Mismo header y pestañas; activa `Historial del viaje`. Cuerpo: mapa (~830px) + barra de reproducción debajo (izq.) y tabla de registros (~470px, der.).

**Mapa:** leyenda `Ruta planeada` (gris discontinua `#9CA3AF`) · `Recorrido real (hasta 09:57)` (navy sólida) · `Paradas` (`#B45309`) · `Eventos` (`#DC2626`). Geocerca origen `CONTECON` (círculo navy discontinuo), destino `Automotriz del Centro` (verde, Aguascalientes). Marcador T-103 rojo con halo, chip `T-103 0 km/h`. Tooltip oscuro (`#242C3A`): `09:14 h · T-103 · 62 km/h · NE` / `Autopista 54D km 41 · saliendo de Colima`. Escala `50 km`.

**Barra de reproducción:** `⏮` `◀◀` `▶` (navy) `▶▶` `⏭` · velocidad `1x | 4x | 16x` (4x seleccionado) · hora grande mono `09:14:32 h` + `· 17 mar 2026 · posición 142 de 418` · checkbox `Seguir unidad` (marcado) · botón `Exportar` · slider: pista `#E5E7EB`, progreso navy, perilla navy, marcas de eventos de color, ticks `07:00 … 12:00`.

**Panel derecho:** filtros `Todo` (activo) | `Eventos` | `Paradas` | `Posiciones` · contador `418 registros` · columnas `Hora | Registro | Vel.`

| Hora | Punto | Registro | Vel. |
|---|---|---|---|
| 07:33 | verde | Inicio del viaje · salida de base Manzanillo | 0 km/h |
| 07:48 | navy | Entrada a geocerca CONTECON | 12 km/h |
| 07:56 | ocre | Parada en fila · puerta 3 (1 h 18 min) | 0 km/h |
| 08:40 | navy | Nota del operador: fila ~40 min (2 fotos) | 0 km/h |
| **09:14** (seleccionada `#E8EEF5`) | verde | Salida de CONTECON · EIR sin daños | 18 km/h |
| 09:14 | gris claro | Posición · Autopista 54D km 41 | 62 km/h |
| 09:22 | gris claro | Posición · Libramiento de Colima | 71 km/h |
| 09:35 | gris claro | Posición · Autopista 54D km 68 | 74 km/h |
| 09:48 | gris claro | Posición · Tonila | 66 km/h |
| 09:52 | naranja `#C2410C` | Desvío de ruta · 2.1 km fuera de geocerca | 54 km/h |
| 09:57 | rojo | Última posición · Atenquique · ignición OFF | 0 km/h |
| 10:27 | rojo | Sin posición > 30 min | — |
| 10:35 | rojo | Alerta R-01 generada · tomada por L. Ochoa | — |
| 10:47 | rojo | Escalamiento: SLA vencido | — |

Pie: `Clic en una fila mueve la reproducción a ese momento`.

---

## 14 Viajes — Nuevo viaje `77:802` · capturas `screens/14-nuevo-viaje.png`, `screens/14-nuevo-viaje-header.png`

**Header:** breadcrumb `Viajes / Nuevo viaje` · título `Nuevo viaje` · chip `SRV-2603-0196 · folio automático` (`#E8EEF5`/navy, mono) · chip gris `Borrador guardado 22:41` · descripción `Captura el viaje y sus tramos. Al crearlo aparece en la Torre de control y empieza el monitoreo cuando el tracto sale del origen.` · botones `Usar plantilla de ruta ⌄`, `Cancelar`, `Guardar borrador`, `Crear viaje` (navy).

Tarjetas numeradas (círculo `#E8EEF5`), título + subtítulo; requeridos con `*` rojo.

**1 Datos generales** — `Tipo de movimiento, cliente y referencias de la naviera`
- `Tipo de movimiento` segmentado: `Importación` | `Exportación` | `Reparto local`
- `Modalidad` segmentado: `Sencillo` | `Full (2 contenedores)`
- `Cliente *` (dropdown) · `BL / Booking *` (mono) · `Referencia del cliente` · `Grupo de viaje` + chip `opcional` · `Cita de retiro en terminal *` (📅)

**2 Contenedor** — `Se valida el dígito de control ISO 6346`; chip derecha `Días libres: 4 restantes` (verde)
- `Número de contenedor *` (válido: borde `#6EE7B7`, ✓ `#047857`, ayuda `Dígito de control válido · Maersk`)
- `Tipo *` · `Sello *` (error: fondo `#FEF2F2`, borde `#DC2626`, mensaje `Requerido para salir de terminal`) · `Peso bruto (kg)` · `Naviera` · `Terminal de retiro` · `Fin de días libres` (📅, ayuda `Se generará alerta R-07 un día antes` — normalizado) · `Carga` (`General · no peligrosa`)

**3 Ruta y tramos** — `Cada tramo usa geocercas de origen y destino; el tramo actual se muestra en la torre`; botón `+ Agregar parada`
- Columnas `#` | `Tramo` | `Geocerca` | `Cita / ventana` | `Tiempo estimado`; asa `⋮⋮` para reordenar.

| # | Tramo | Geocerca | Cita / ventana | Tiempo estimado |
|---|---|---|---|---|
| 1 | Retiro en terminal | CONTECON · Manzanillo | 27 oct · 07:30 h | 1 h 30 min en terminal |
| 2 | Entrega en cliente | Empaques del Valle · Zapopan | 27 oct · 13:00–15:00 h | 4 h 50 min · 298 km |
| 3 | Devolución de vacío | Patio CMA CGM · Manzanillo | Antes del 30 oct | 4 h 40 min · 301 km |

- Banner ámbar: `El tramo 2 cruza la zona de riesgo “Autopista 54D km 90–130”. Se sugiere custodia o salida antes de las 18:00 h.`

**4 Asignación** — `Operador, unidad y seguridad del viaje`
- `Operador *` (ayuda `Licencia federal vigente · sin viaje activo`) · `Tracto (desde GPS) *` (ayuda `GPS en línea · en patio Manzanillo`) · `Remolque / chasis *` (`CH-211 · 40 pies`) · `Candado` (`CND-0457`, ayuda `Batería 86 % · cerrado`)
- Toggle ON `Requiere custodia` / `Por zona de riesgo del tramo 2` · `Custodio` (`Protección Bajío · por asignar`) · `Tramos con custodia` (`Tramo 2`)

**Columna lateral — Vista previa de ruta**: `604 km · 3 tramos`; mini mapa (línea navy, regreso gris discontinuo, marcadores `1 CONTECON`, `2 Zapopan` verde, `3 Patio CMA CGM`, zona roja `Zona de riesgo 54D`); stats `Distancia 604 km` · `Tiempo total 11 h 00 min` · `ETA a cliente 27 oct 13:20 h`.

**5 Validación antes de crear** — `Lo que falta para que el viaje entre a la torre`
- ✓ Contenedor válido y con días libres · ✓ Operador con licencia y examen médico vigentes · ✓ Tracto con GPS reportando (hace 40 s) · ! Tracto T-113: servicio de frenos vence en 3 días · × Falta el sello del contenedor (rojo) · ! Custodia requerida sin proveedor asignado
- Nota: `“Crear viaje” se habilita cuando no hay errores. Las advertencias se registran en la bitácora del viaje.`

**6 Seguimiento y alertas**
- Toggle ON `Compartir link público con el cliente` / `Se envía por WhatsApp y correo al crear el viaje`; chips `logistica@empaquesdelvalle.mx`, `+52 33 1820 4471`, link `+ contacto`
- `Reglas de alerta que aplican`: chips mono (normalizados a la tabla de reglas) `R-01 Detención` `R-02 Sin señal` `R-05 Desvío` `R-07 Días libres` `R-09 Zona de riesgo`
- Pie: `Heredadas de Admin → Reglas de alertas según cliente y tipo de movimiento.`
