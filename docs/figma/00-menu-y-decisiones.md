# Frame 11 (34:1147) — Menú superior, desplegables y decisiones

Fuente: Figma `4pQ5RxcgM8ULuqozpaWo3s`, sección v2 (`26:2`). Extraído con `get_design_context`.

## TopNav (componente `26:3`)
- Fondo `#1e3a5f`, alto 52px, padding x 20, gap 4.
- Marca: cuadro 26px `rgba(255,255,255,0.15)` radio 5 con iniciales "PT" (Inter Bold 10, blanco). Al lado: "PuertoTrack" (Bold 13) y "Transportes del Pacífico" (Regular 9, opacidad 60).
- Ítems (Inter Medium 12, blanco opacidad 75; alto 52, padding x 12, gap 6): `Torre de control ▾`, `Viajes ▾`, `Historial`, `Alertas` + badge, `Flota ▾`, `Catálogos ▾`, `Admin ▾`. El "▾" es Regular 10 opacidad 60.
- Ítem activo: texto SemiBold opacidad 100 + subrayado blanco 2px en `top 49` (active-underline opacidad 1). Descripción del componente: "Menú superior tradicional (reemplaza al sidebar). Ítem activo: texto 100% + subrayado (active-underline opacity 1)."
- Badge de Alertas: fondo `#dc2626`, radio 8, padding 5×1, Bold 9 blanco ("5").
- Spacer flexible.
- Buscador: 300×30, fondo `rgba(255,255,255,0.1)`, radio 4, icono 14px; placeholder "Buscar viaje, tracto, contenedor, operador…" (Regular 11, opacidad 60).
- "En vivo": punto 8px (verde `#34d399`) + "En vivo" SemiBold 11.
- Campana: caja 30px con icono 16px.
- Usuario: avatar 28px `rgba(255,255,255,0.2)` "AR"; "Alejandro Ruiz" SemiBold 11; "Jefe de tráfico" Regular 9 opacidad 60; "▾".

## Desplegables (panel blanco, borde `#e5e7eb`, radio 5, sombra 0 4 6 rgba(0,0,0,.12), padding 6, ítems 12px con icono 14px, primer ítem resaltado `#f3f4f6`)
- **Torre de control ▾**: Vista Lista · Vista Mapa · Mis grupos de viaje
- **Viajes ▾**: Nuevo viaje · Viajes activos · Contenedores y días libres · Plantillas de ruta
- **Flota ▾**: Unidades (desde GPS) · Remolques y chasis · Candados · Operadores y custodios
- **Catálogos ▾**: Geocercas (crear y sincronizar) · Terminales y patios · Navieras · Rutas frecuentes
- **Admin ▾**: Reglas de alertas · Protocolos de atención · Usuarios y permisos · Integraciones (GPS, candados) · Mi empresa

## Decisiones aplicadas de los comentarios (verbatim)
- #23 Lista/Mapa y Nuevo viaje salieron del encabezado y viven en los desplegables Torre de control ▾ y Viajes ▾.
- #20 El menú se queda horizontal; cada grupo es desplegable para que no crezca a lo ancho.
- #5 Sin Dashboard. La pantalla de entrada es la Torre de control (lista de viajes activos).
- #7 La lista densa es la vista principal; ya incluye ETA. Mapa es la vista alterna del mismo conjunto.
- #8 Sidebar reemplazado por menú superior tradicional con 4 secciones directas y 3 desplegables.
- #9 Sin filtros de estado/terminal en la torre. Esos viven en Historial.
- #10 Agrupar viajes es un filtro ("Agrupar por: Grupo de viaje") y un toggle "Mostrar grupos".
- #11 Etiqueta "En vivo" en el menú y en el encabezado de la torre.
- #12 Geocercas: solo visualización. Tipos: terminal/patio, destino, punto de interés, zona a evitar. **(Superada por #34.)**
- #13 Se quitó la capa "Rutas planeadas" del mapa.
- #14 Operadores → "Operadores y custodios" con rol y proveedor.
- #16 Se eliminó la sección Clientes del menú (el cliente final usa el link público).
- #17 Alertas = bandeja operativa. Reglas de negocio en Admin → Reglas de alertas.
- #18 "Servicio" → "Viaje" en todo el producto.
- #19 Tarjetas del panel del mapa con: tracto, operador, tramo, ETA, GPS, velocidad, detenido, candado, días libres, ubicación.
- #6 Unidades se sincronizan desde la API del GPS; solo se completan datos operativos.
- #15 Terminales y patios: pendiente de investigar, se dejó nota en Geocercas.
- #24 #31 #32 Clic en un viaje abre una MODAL (no otra página) con bitácora con fotos e información editable del viaje.
- #25 #26 Segunda pestaña de la modal: Historial del viaje (tabla + mapa + reproducción). "Historial" del menú sigue siendo el histórico de viajes.
- #27 Admin → Reglas de alertas tiene pestaña Protocolos de atención (pasos, responsable, tiempo, evidencia).
- #28 Unidades: solo placa, económico y base son editables (modal).
- #30 Operadores y custodios: modal de alta con documentos, vigencias e invitación a la app.
- #33 Las reglas se crean/editan en modal; se quitó el panel suelto.
- #34 Geocercas: se dibujan (círculo, polígono, corredor) y se sincronizan con el GPS del cliente.
- #35 Nueva consola super-admin OvenLabs para administrar empresas, integraciones y planes (pantalla 12).
- #3 Propuesta de nombre e identidad en la pantalla 13 (Tramo / Faro / Atraque).

## Convenciones visuales compartidas (todas las pantallas)
- Fuentes: Inter (UI) + JetBrains Mono (IDs, horas, placas, contenedores, números, KPIs).
- Fondo de página `#f5f6f7`; tarjetas blancas borde `#e5e7eb`; bandas header/footer `#f9fafb`; divisores `#f3f4f6`; borde de input `#d1d5db` (alto 30, radio 4, caret `⌄` `#6b7280`, placeholder `#9ca3af`).
- Encabezado de tabla: 9px SemiBold MAYÚSCULAS, tracking 0.54px, `#6b7280`, fondo `#f9fafb`, alto 28.
- Etiquetas de sección: 10px SemiBold MAYÚSCULAS, tracking 0.6px, `#6b7280`.
- Título de página: Inter Bold 18 `#111827`; subtítulo 11px `#6b7280`.
- Botones: primario `#1e3a5f` texto blanco; secundario blanco borde `#d1d5db` texto `#374151` 12px Medium; peligro `#dc2626`.
- Checkbox 14px radio 3: marcado `#1e3a5f` con ✓ blanco; sin marcar blanco con borde `#9ca3af`.
- Toggle 28×16: ON `#059669` (perilla derecha); OFF `#d1d5db`. (En Nuevo viaje / Seguimiento el toggle ON es navy.)
- Pestañas subrayadas: activa SemiBold `#1e3a5f` + subrayado 2px `#1e3a5f`; inactiva Medium `#6b7280`; barra con borde inferior `#e5e7eb`.
- Banner info: fondo `#e8eef5`, borde `#c3d0e0`, 11px `#374151`. Banner aviso: fondo `#fffbeb`, borde `#fcd34d`.
- Modal: overlay `rgba(11,18,32,0.55)`, radio 8, sombra `0 16px 40px rgba(0,0,0,.3)`; header con borde inferior, título 15px SemiBold, subtítulo, botón "×" en caja de 28px; footer `#f9fafb`.

## Paleta semántica
| Rol | Hex |
|---|---|
| Primario navy | `#1e3a5f` |
| Primario suave (chips IMP, folio, fila seleccionada, chips de regla, banner info) | `#e8eef5` |
| Texto fuerte / cuerpo / tenue / placeholder | `#111827` / `#374151` / `#6b7280` / `#9ca3af` |
| Crítico | `#dc2626` sobre `#fef2f2`; fila teñida `#fffafa` |
| Alto | `#c2410c` sobre `#fff7ed` |
| Medio | `#b45309` sobre `#fffbeb` |
| Bajo | `#6b7280` sobre `#f3f4f6` |
| OK / éxito | `#059669` (punto), texto chip `#047857`, fondo `#ecfdf5` |
| "En vivo" | `#34d399` (menú) / `#10b981` (encabezado torre) |
| Sin señal / cancelado | `#9ca3af` |
| Mapa (wireframe) | tierra `#eef0f2`, mar `#d6e0ea`, fondo `#e4e8ee`; tooltip oscuro `#242c3a` |
| Consola OvenLabs | header `#0b1220`, acento `#f97316` |
