# Frames 07, 07m, 08, 08m, 09, 10, 12, 13 — Flota, Geocercas, Usuarios, Consola, Identidad

Extraído con `get_design_context` (los modales se re-consultaron por su nodo: `59:1680`, `59:2154`).

Puntos de estado (de los SVG): verde `#059669` (En línea, Disponible, Activa, sync OK) · navy `#1E3A5F` (En viaje, En servicio) · ámbar `#B45309` (Intermitente, En taller, sync con retraso, plan por vencer) · rojo `#DC2626` (Sin señal, sin contacto, error) · gris `#9CA3AF` (Prueba).

---

## 07 Flota — Unidades `32:290` · captura `screens/07-unidades.png`

**Layout:** TopNav (Flota activo) → encabezado → pestañas → KPIs (6) → filtros → tabla → banner info.

- Título `Unidades`; subtítulo `No se dan de alta una por una: se consumen de la API del proveedor GPS. Aquí solo se completan datos operativos (económico, base, estado).`
- Indicador: punto verde + `Última sincronización: hoy 10:42 h · Wialon`; botones (borde) `Sincronizar ahora` (refresh), `Configurar integración` (engrane).
- Pestañas: `Tractos (15)` (activa) · `Remolques y chasis (20)` · `Candados (12)`.
- KPIs: 15 Tractos sincronizados · 12 En viaje · 2 Disponibles · 1 En taller · 2 (rojo) GPS con falla o sin señal · 3 (ámbar) Nuevas en el GPS sin económico.
- Filtros: `Buscar económico, placa, ID GPS…` · `Estado: Todos` · `Señal: Todas` · `Base: Todas` · derecha `15 unidades`.

| Económico | Placa | Origen GPS | Señal | Marca / modelo | Estado | Viaje actual | Base | Odómetro | Acción |
|---|---|---|---|---|---|---|---|---|---|
| T-101 | 46-AX-7T | Wialon · WIA-880412 | En línea | Kenworth T680 2022 | En viaje | SRV-2603-0184 | Manzanillo | 182,400 km | Editar datos |
| T-102 | 52-AY-3R | Samsara · SAM-880789 | En línea | Freightliner Cascadia 2021 | En viaje | SRV-2603-0185 | Manzanillo | 206,270 km | Editar datos |
| T-103 | 81-BC-9N | Geotab · GEO-881166 | Intermitente | International ProStar 2019 | En viaje | SRV-2603-0186 | Manzanillo | 230,140 km | Editar datos |
| T-104 | 37-AD-4K | Wialon · WIA-881543 | En línea | Kenworth T680 2022 | En viaje | SRV-2603-0187 | Guadalajara | 254,010 km | Editar datos |
| T-107 | 63-BG-1S | Wialon · WIA-882674 | **Sin señal** (rojo) | International LT625 2022 | En viaje | SRV-2603-0190 | Manzanillo | 325,620 km | Editar datos |
| T-112 | 31-AM-9G | Geotab · GEO-884559 | En línea | Kenworth T680 2023 | En viaje | SRV-2603-0195 | Guadalajara | 445,000 km | Editar datos |
| T-113 | 58-BN-2H | Wialon · WIA-884936 | En línea | International LT625 2022 | En taller (ámbar) | — | Manzanillo | 468,870 km | Editar datos |
| T-114 | 23-AP-6J | Samsara · SAM-885313 | En línea | Freightliner Cascadia 2021 | Disponible | — | Manzanillo | 492,740 km | Editar datos |
| T-115 | 97-BR-4L | Geotab · GEO-885690 | En línea | Kenworth T680 2023 | Disponible | — | Guadalajara | 516,610 km | Editar datos |
| — | 72-CD-1P | Wialon · WIA-886021 | En línea | Kenworth T880 2024 | chip `Nueva · sin económico` | — | — | 3,120 km | **Completar datos** |
| — | 19-CE-8Q | Wialon · WIA-886022 | En línea | Kenworth T880 2024 | chip `Nueva · sin económico` | — | — | 2,870 km | **Completar datos** |

- Económico mono bold; viaje actual mono bold navy; "—" `#9ca3af`. Filas "Nueva": fondo `#fffdf5`, chip `#fffbeb`/`#b45309`. Botones de acción con borde, alto 24.
- En el prototipo se completan T-105, T-106, T-108–T-111 (en viaje) para cuadrar 12 en viaje.
- Banner: `Solo son editables: número económico, base, estado operativo y notas. Placa, VIN, ID del dispositivo y telemetría vienen del proveedor GPS y se actualizan en cada sincronización. Integraciones soportadas en el prototipo: Wialon, Samsara, Geotab (validar con el cliente cuál usa).`

## 07m Modal — Editar unidad `59:1276` (modal `59:1680`)

Modal 620×560. `Editar unidad · T-104` / `Los demás datos vienen del proveedor GPS y no se editan aquí` / `×`.
- Editables: `Número económico` `T-104` (mono) · `Placa` `37-AD-4K` (mono) · `Base` select `Base Guadalajara`.
- `DATOS DEL GPS (SOLO LECTURA)` (caja `#f9fafb`, inputs `#f3f4f6` texto `#6b7280` con candado): `Proveedor / ID` `Wialon · WIA-881543` · `Marca / modelo` `Kenworth T680 2022` · `VIN` `3AKJHHDR7231900MX` · `Última señal` `Hoy 10:42 · en línea`. Ayuda: `Para corregir estos datos hay que hacerlo en la plataforma GPS; se reflejan en la siguiente sincronización.`
- `Notas internas` `Unidad asignada al grupo BAJÍO · revisión de frenos pendiente`.
- Pie: `Cancelar` · `Guardar cambios` (primario).

---

## 08 Flota — Operadores y custodios `32:741` · captura `screens/08-operadores.png`

- Título `Operadores y custodios`; subtítulo `Personal que acompaña la unidad: operadores (conducen) y custodios (escoltan). Vigencias y contacto para que la torre pueda llamarlos.`; botones `Importar CSV` (borde, upload) · `Agregar persona` (primario, +).
- Pestañas: `Todos (21)` · `Operadores (15)` · `Custodios (6)`.
- KPIs: 15 Operadores · 6 Custodios · 3 (ámbar) Con vigencia por vencer (≤ 15 d) · 1 (rojo) Con documento vencido · 9 En viaje ahora.
- Filtros: `Buscar nombre, licencia, teléfono…` · `Rol: Todos` · `Vigencias: Todas` · `Disponibilidad` · derecha `21 personas`.

| Av. | Nombre | Rol | Teléfono | Licencia / credencial | Vigencia | Apto médico | Proveedor | Estado | Unidad / viaje |
|---|---|---|---|---|---|---|---|---|---|
| JL | José Luis Ramírez | Operador | 312 118 2201 | Federal E · E-2847193 | 🟧14 oct 2026 | 🟧22 ago 2026 | Propio | En viaje | T-101 · SRV-2603-0184 |
| CM | Carlos Méndez Silva | Operador | 312 118 2202 | Federal E · E-3928014 | 03 feb 2027 | 18 nov 2026 | Propio | En viaje | T-102 · SRV-2603-0185 |
| MÁ | Miguel Ángel Torres | Operador | 312 118 4402 | Federal E · E-1938472 | 🟥28 may 2026 | 🟥12 jul 2026 | Propio | **En viaje · sin contacto** (rojo) | T-103 · SRV-2603-0186 |
| RC | Raúl Cárdenas Vega | Operador | 312 118 2211 | Federal E · E-4029183 | 19 feb 2027 | 🟥02 may 2026 | Propio | En viaje | T-111 · SRV-2603-0194 |
| ÓD | Óscar Daniel Peña | Operador | 312 118 2212 | Federal E · E-2847301 | 🟧05 oct 2026 | 🟥30 abr 2026 | Propio | En viaje | T-112 · SRV-2603-0195 |
| AV | Andrés Valdez Soto | Operador | 312 118 2215 | Federal E · E-3810294 | 09 ene 2027 | 21 mar 2027 | Propio | Disponible | — |
| GL | Gerardo Luna Ibarra | Custodio | 314 200 1180 | Credencial SSP · C-10492 | 31 dic 2026 | — | Custodias del Pacífico | En servicio | SRV-2603-0186 · en camino |
| PA | Pedro Antonio Mora | Custodio | 314 200 1181 | Credencial SSP · C-10517 | 🟧15 ago 2026 | — | Custodias del Pacífico | Disponible | — |
| SO | Samuel Ortega Ruiz | Custodio | 314 200 1190 | Credencial SSP · C-11003 | 02 nov 2026 | — | Protección Bajío | En servicio | SRV-2603-0192 · tramo GDL–León |
| EC | Elena Cruz Padilla | Custodio | 314 200 1191 | Credencial SSP · C-11044 | 20 mar 2027 | — | Protección Bajío | Disponible | — |

- 🟧 por vencer: chip `#fffbeb`/`#b45309` mono 10px. 🟥 vencido: `#fef2f2`/`#dc2626`. Fecha normal: mono 11px `#374151`. (Con reloj real, por vencer/vencido se calcula contra hoy.)
- Avatar 24px iniciales blancas: Operador `#1e3a5f`, Custodio `#c2410c`. Chip rol: Operador `#e8eef5`/`#1e3a5f`; Custodio `#fff7ed`/`#c2410c`. Unidad/viaje mono 10px navy.
- Cada fila termina con botones `Llamar` (teléfono) y `Ver`.
- Banner: `Pregunta de validación: ¿los custodios son personal propio o de un proveedor externo? Si son externos, aquí solo se registra el proveedor y el contacto del custodio asignado por viaje.`

## 08m Modal — Agregar persona `59:1745` (modal `59:2154`)

Modal ~840px. `Agregar persona` / `Operador (conduce) o custodio (escolta). Las vigencias generan alertas R-10 al acercarse.` / `×`.
- Segmentado: `Operador` (activo) | `Custodio`.
- `Nombre(s)` ph `Nombre` · `Apellidos` ph `Apellidos` · `Teléfono (para llamadas desde la torre)` ph `+52 312 000 0000` (mono) · `Teléfono de emergencia` ph `+52` · `Correo (opcional)` ph `correo@empresa.mx`.
- `DOCUMENTOS`: `Licencia` select `Federal tipo E` · `Número` ph `E-0000000` · `Vigencia` fecha `dd / mm / aaaa` · `Apto médico (vigencia)` fecha · `CURP / RFC (opcional)` · `Archivos` zona discontinua (upload) `Licencia, apto, INE…`.
- `OPERACIÓN`: `Base` `Base Manzanillo` · `Unidad habitual (opcional)` `Sin asignar` · `Proveedor (si es externo)` `Propio`.
- Toggle ON en caja `#f9fafb`: `Enviar invitación a la App del operador` / `Por WhatsApp al teléfono principal · para EIR, eventos y botón de pánico`.
- Pie: `Cancelar` · `Guardar persona` (primario).

---

## 09 Catálogos — Geocercas `34:386` · captura `screens/09-geocercas.png`

**Layout:** TopNav (Catálogos activo) → encabezado → lista (izq., 480px) + mapa (der.) con banner de aviso debajo.

- Título `Geocercas`; subtítulo `Se crean y editan aquí (círculo, polígono o corredor de ruta) y se sincronizan con la plataforma GPS del cliente para detectar entradas y salidas. Una geocerca puede ser terminal, patio, destino, punto de interés, parada autorizada o zona a evitar.`
- Indicador: punto verde + `Sincronizadas con Wialon hace 12 min · 48 geocercas · 1 pendiente de enviar`; botones `Importar del GPS` (borde, descarga) · `Nueva geocerca` (primario).
- Filtros lista: `Buscar geocerca…` · `Tipo: Todas` · `Cliente`.

| Nombre | Tipo | Ubicación / cliente | Reglas | Nota derecha |
|---|---|---|---|---|
| CONTECON · acceso y patio | Terminal | Manzanillo | R-01, R-06 | 3 unidades dentro |
| SSA México | Terminal | Manzanillo | R-01, R-06 | 2 unidades dentro |
| TIMSA | Terminal | Manzanillo | R-01, R-06 | 1 unidad dentro |
| Patio Maersk Tapeixtles | Patio | Manzanillo | R-01, R-07 | — |
| Patio CMA CGM | Patio | Manzanillo | R-01, R-07 | 1 unidad dentro |
| Automotriz del Centro · planta (sel. `#f9fafb`) | Destino | Automotriz del Centro | R-01 | — |
| Empaques del Valle · CEDIS | Destino | Empaques del Valle | R-01 | 1 unidad dentro |
| Calzado Horizonte · almacén León | Destino | Calzado Horizonte | R-01 | — |
| Gasolinera Km 112 · Autopista 54D | Parada autorizada | Sin cliente | R-01 | — |
| Paradero Atenquique | Punto de interés | Empaques del Valle | — | 1 unidad cerca |
| Tramo Jalipa–Cuyutlán (nocturno) | Zona a evitar | Sin cliente | R-09 | — |
| Libramiento Celaya (bloqueo activo) | Zona a evitar | Sin cliente | R-09 | — |

- Muestra 12px (relleno 25% + borde sólido del color del tipo). Colores tipo (muestra/texto chip · fondo chip): Terminal y Patio `#1e3a5f`·`#e8eef5`; Destino `#059669`·`#ecfdf5`; Punto de interés `#b45309`·`#fffbeb`; Zona a evitar `#dc2626`·`#fef2f2`; Parada autorizada `#6b7280`·`#f3f4f6`. Notas derecha 10px Medium navy.
- **Mapa:** formas (de la captura): polígono rojo discontinuo en el puerto de Manzanillo, círculos verdes discontinuos en CEDIS GDL y León. Escala `20 km`.
- **Barra de dibujo** (flotante arriba): `Seleccionar` · `Círculo` · `Polígono` (activo navy) · `Corredor de ruta` · `Mover vértice` · `Borrar`. Tooltip oscuro `rgba(17,24,39,0.85)`: `Dibujando polígono · clic para agregar vértices · doble clic para cerrar · Esc cancela`.
- **Panel de edición** (320px, flotante arriba-izq): título `Nueva geocerca`; chip mono `Polígono · 4 vértices · 2.4 km²`; `Nombre` `Automotriz del Centro · planta` · `Tipo` `Destino de cliente` · `Cliente` `Automotriz del Centro` · `Radio / tolerancia` `150 m` · `Vigencia` `Permanente`; `SE USA EN REGLAS`: ☑ R-01 Detención no autorizada (parada permitida dentro) · ☑ R-05 Desvío de ruta (destino del tramo) · ☐ R-09 Zona de riesgo; toggle ON `Sincronizar con GPS del cliente` / `Wialon · se crea como geofence al guardar`; `Cancelar` · `Guardar geocerca`.
- Leyenda `TIPOS`: Terminal, Patio, Destino, Punto de interés, Zona a evitar, Parada autorizada.
- Banner aviso: `Al guardar, la geocerca se envía a la plataforma GPS del cliente (API) para que las entradas/salidas lleguen como eventos. Si el GPS no soporta geocercas, la detección se hace en nuestro servidor con las posiciones. Pendiente (#15): citas y filas de las terminales de Manzanillo.`

---

## 10 Admin — Usuarios y permisos `34:742` · captura `screens/10-usuarios.png`

**Layout:** encabezado → tabla de usuarios (izq., 620px) + panel de detalle (der.).

- Título `Usuarios y permisos`; subtítulo `Permisos granulares por módulo (ver / crear / editar / eliminar / exportar) partiendo de un rol base, y alcance por grupo de viaje.`; primario `Invitar usuario`.

| Usuario | Email | Rol base | Alcance | Último acceso |
|---|---|---|---|---|
| Alejandro Ruiz | aruiz@transpacifico.mx | Jefe de tráfico | Todo | Ahora |
| Daniela Fuentes | dfuentes@transpacifico.mx | Administrador | Todo | Hace 2 h |
| **Luis Gerardo Ochoa** (sel.) | lochoa@transpacifico.mx | Monitorista | 2 grupos | Hace 6 min |
| Karla Benítez | kbenitez@transpacifico.mx | Monitorista | 2 grupos | Hace 14 min |
| Iván Castañeda | icastaneda@transpacifico.mx | Monitorista (nocturno) | Todo | Ayer 23:40 |
| Mónica Trujillo | mtrujillo@transpacifico.mx | Ejecutivo de cuenta | 3 clientes | Hace 1 día |
| Pablo Arreola (gris) | parreola@transpacifico.mx | Ejecutivo de cuenta | 1 cliente | Inactivo (gris) |

- **Panel:** avatar `LO` 32px navy · `Luis Gerardo Ochoa` · `lochoa@transpacifico.mx · activo · turno matutino` · `ROL BASE` select `Monitorista`.
- `PERMISOS POR MÓDULO` · estado `Personalizado · 2 cambios respecto al rol` (`#c2410c`) · botón `Restaurar rol`.

| Módulo | Ver | Crear | Editar | Eliminar | Exportar |
|---|---|---|---|---|---|
| Torre de control | ✓ | ☐ | ☐ | ☐ | ☐ |
| Viajes | ✓ | ✓ | ✓* | ☐ | ✓ |
| Historial | ✓ | ☐ | ☐ | ☐ | ✓ |
| Alertas | ✓ | ☐ | ✓* | ☐ | ☐ |
| Flota (unidades, operadores) | ✓ | ☐ | ☐ | ☐ | ☐ |
| Catálogos (geocercas, terminales) | ✓ | ☐ | ☐ | ☐ | ☐ |
| Reglas de alertas | ☐ | ☐ | ☐ | ☐ | ☐ |
| Usuarios y permisos | ☐ | ☐ | ☐ | ☐ | ☐ |
| Integraciones | ☐ | ☐ | ☐ | ☐ | ☐ |

✓* = marcado con borde naranja 2px `#c2410c` (difiere del rol base). Ayuda: `Marco naranja = difiere del rol base. Quitar "Ver" desactiva el resto del módulo.`
- `GRUPOS DE VIAJE QUE VE` (chips seleccionables: sel. navy/blanco): GDL-1803-A ✓, GDL-1803-D ✓, BAJÍO-1803-B, PTO-1803-C, FULL-1803-E, BAJÍO-1803-F. Ayuda `Solo ve 2 grupos. Sin selección = ve todos.`
- `NOTIFICACIONES`: ☑ Alertas críticas por WhatsApp · ☑ Alertas altas en la app · ☐ Resumen diario por correo.
- Pie: `Cambios quedan en bitácora de auditoría` · `Desactivar usuario` (borde) · `Guardar permisos` (primario).

---

## 12 Super-admin OvenLabs — Empresas `60:802` · captura `screens/12-consola.png`

**Header propio** (reemplaza TopNav): fondo `#0b1220`, alto 52, padding x 20.
- Marca: cuadro 26px `#f97316` radio 5 con `OL` blanco Bold 10; `OvenLabs · Consola` (Bold 13 blanco) + `Administración de clientes de la torre de control` (9px, opacidad 60).
- Pestañas: `Empresas` (activa: SemiBold blanco + subrayado 2px `#f97316`) · `Usuarios globales` · `Integraciones GPS` · `Planes y facturación` · `Salud del sistema` · `Soporte` (Medium, opacidad 70).
- Derecha: badge `Super-admin` (`#f97316`, blanco 9px) · avatar `OB` 28px `rgba(255,255,255,0.2)` · `Omar Ballesteros` (SemiBold 11). Sin buscador, sin "En vivo", sin campana.

- Título `Empresas`; subtítulo `Transportistas que usan la torre de control. Cada empresa tiene su propia central de monitoreo; aquí la damos de alta, conectamos su GPS y vemos su salud.`; botones `Exportar` (borde) · `Nueva empresa` (primario).
- KPIs: 14 Empresas activas · 312 Unidades monitoreadas · 96 Viajes activos ahora · 1,840 Alertas en 30 días · 2 (rojo) Integraciones con falla · 3 (ámbar) Por vencer plan (≤ 15 d).
- Filtros: `Buscar empresa, RFC, contacto…` · `Plan: Todos` · `GPS: Todos` · `Estado: Todos` · derecha `14 empresas`.

| Empresa | Ciudad | Plan | Unidades | Usuarios | GPS | Sincronización | Viajes act. | Alertas 30 d | Estado |
|---|---|---|---|---|---|---|---|---|---|
| **Transportes del Pacífico** (sel. `#f3f4f6` + barra 3px `#f97316`) | Manzanillo, Col. | Pro | 15 / 20 | 7 | Wialon | Hace 2 min | 12 | 184 | Activa |
| Logística Portuaria MZO | Manzanillo, Col. | Pro | 42 / 50 | 12 | Samsara | Hace 1 min | 31 | 512 | Activa |
| Fletes Colima–Bajío | Colima, Col. | Básico | 8 / 10 | 3 | Geotab | (ámbar) Hace 48 min | 3 | 61 | Activa |
| Transportes Guzmán | Cd. Guzmán, Jal. | Básico | 6 / 10 | 2 | Wialon | (rojo) Error de API · 6 h | 0 | 22 | (rojo) Integración con falla |
| Autotransportes del Valle | Guadalajara, Jal. | Enterprise | 96 / 150 | 21 | Samsara + candados | Hace 1 min | 38 | 740 | Activa |
| Contenedores del Occidente | Manzanillo, Col. | Pro | 18 / 20 | 6 | Geotab | Hace 3 min | 9 | 151 | (ámbar) Plan vence en 9 d |
| Grupo TransBajío | León, Gto. | Pro | 27 / 30 | 9 | Wialon | Hace 2 min | 3 | 97 | Activa |
| Translogic MX | Querétaro, Qro. | Prueba | 4 / 5 | 2 | Sin GPS | (rojo) Pendiente de conectar | 0 | 0 | (gris) Prueba (14 d) |
| Portuaria Tecomán | Tecomán, Col. | Básico | 5 / 10 | 2 | Wialon | Hace 5 min | 0 | 12 | (rojo) Suspendida (pago) |

- Chips de plan: Pro/Básico `#f3f4f6`/`#374151`; Enterprise `#e8eef5`/`#1e3a5f`; Prueba `#fffbeb`/`#b45309`.
- **Panel de detalle** (440px): avatar `TP` 34px navy radio 6 · `Transportes del Pacífico` · `Cliente desde feb 2026 · Plan Pro · RFC TPA120314XX1` · botón `Entrar como soporte` (login).
  - Stats: UNIDADES `15 de 20` · USUARIOS `7 de 10` · VIAJES / MES `148` · ALERTAS / DÍA `6.1`.
  - `INTEGRACIÓN GPS`: punto verde `Wialon · conectado` · `Última sync hace 2 min` · input solo lectura `Token: wl_••••••••••••7f3a` · `Rotar` · `Probar` · métricas POSICIONES / MIN `412` · GEOCERCAS SINCRONIZADAS `48 / 48` · ERRORES 24 H `0` · link `+ agregar integración (candados, telemetría de temperatura)`.
  - `MÓDULOS ACTIVOS` (toggles): ON Torre de control y alertas · App del operador (EIR, pánico) · Contenedores y días libres · Link público para clientes finales; OFF (gris) Custodia · Reportes avanzados (Enterprise).
  - `CONTACTOS`: Alejandro Ruiz — Jefe de tráfico · admin de la cuenta — 312 118 0001 · Daniela Fuentes — Administradora · facturación — 312 118 0002.
  - Pie: `Suspender` (rojo, izq.) · `Cambiar plan` (borde) · `Guardar` (primario).

---

## 13 Propuesta de identidad `61:802` (referencia, no es pantalla) · captura `screens/13-identidad.png`

- Título `Propuesta de nombre e identidad`. Intro: `Tres direcciones sobre el mismo sistema visual del prototipo (tipografía Inter + JetBrains Mono, UI sobria). Elijan una y la aplico a todas las pantallas; el nombre actual "PuertoTrack" es un placeholder.`

| | Tramo | Faro | Atraque |
|---|---|---|---|
| Primario | `#1E3A5F` | `#13253D` | `#0F3D3E` |
| Acento | `#E8590C` | `#F59E0B` | `#2DD4BF` |
| Claro | `#F5F6F7` | `#E8EEF5` | `#ECFDF5` |
| Lema | Control de cada tramo, del puerto al cliente. | Vemos tu operación aunque sea de noche. | Del atraque a la entrega, sin perder la carga de vista. |
| Marca | barras de ruta con segmento naranja y punto final | faro con haz ámbar | contenedor con flecha de entrada turquesa |

- Cada tarjeta: "EN EL MENÚ" (barra 44px color primario con marca en caja `rgba(255,255,255,.15)`, nombre Bold 12, "Transportes del Pacífico"), "VERSIÓN SOBRE BLANCO", "ÍCONO DE APP / FAVICON" (56/40/24/16 px, radios 12/9/5/4). Wordmark Inter ExtraBold 32.
- Nota: `Antes de decidir: revisar dominio (.mx / .io / .app) y búsqueda fonética en el IMPI (clases 9 y 42). "Faro" y "Tramo" son palabras comunes y pueden tener marcas previas; "Atraque" es la más libre. Las paletas respetan el azul marino del prototipo para que el cambio de marca no obligue a rediseñar.`
