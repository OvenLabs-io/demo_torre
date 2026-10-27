# Torre de control · prototipo (PuertoTrack)

Prototipo navegable para demo con cliente: React + Vite + TypeScript + Tailwind, sin backend. Todos los datos son mock en memoria (`src/mocks/`) y **se reinician al recargar la página**. Las horas son relativas a la hora real del equipo, así que el demo siempre se ve "en vivo".

## Correrlo

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build estático en dist/
npm test           # pruebas (validación ISO 6346)
```

## Rutas

| Ruta | Pantalla |
|---|---|
| `/` | Torre de control — Lista (entrada) |
| `/mapa` | Torre de control — Mapa |
| `?viaje=SRV-2603-0186` (`&tab=historial`) | Modal de viaje, sobre cualquier página |
| `/viajes/nuevo` | Nuevo viaje |
| `/historial` | Historial de viajes |
| `/alertas` | Bandeja de alertas y protocolo |
| `/admin/reglas` · `?tab=protocolos` | Reglas de alertas · Protocolos de atención |
| `/admin/usuarios` | Usuarios y permisos |
| `/flota/unidades` · `/flota/operadores` | Unidades · Operadores y custodios |
| `/catalogos/geocercas` | Geocercas (dibujar y sincronizar) |
| `/consola` | Consola super-admin OvenLabs (menú de usuario → "Cambiar a consola OvenLabs") |

Las opciones del menú sin diseño (Mis grupos, Contenedores y días libres, Plantillas, Remolques, Candados, Terminales, Navieras, Rutas frecuentes, Integraciones, Mi empresa y las demás pestañas de la consola) muestran una pantalla "Próximamente".

## Guion rápido de demo

1. **Torre — Lista:** el contador "actualizado hace X s" y las velocidades cambian cada 5 s. Clic en **SRV-2603-0186** → bitácora con fotos, información editable y pestaña **Historial del viaje** con reproducción.
2. **Torre — Mapa:** unidades sobre carreteras reales; capas de geocercas, tráfico, recorrido y zonas de riesgo; clic en una tarjeta centra la unidad.
3. **Alertas:** atender la "Detención no autorizada" (marcar paso, registrar acción, cerrar con motivo) → el badge del menú baja.
4. **Viajes → Nuevo viaje:** "Usar plantilla de ruta", capturar el contenedor `MSKU7731406` (falla el dígito de control) y corregir a `MSKU7731403`; al crear, el viaje aparece en la torre.
5. **Catálogos → Geocercas:** "Nueva geocerca", dibujar un polígono, guardar → "Pendiente de enviar" → sincronizada a los 2 s.
6. **Menú de usuario → Cambiar a consola OvenLabs.**

## Cambiar la marca

`PuertoTrack` es un nombre provisional. En `src/config/brand.ts` cambia `DEFAULT_BRAND` a `'tramo'`, `'faro'` o `'atraque'` (propuestas del frame 13). Nombre, iniciales y colores se aplican en todo el sitio sin tocar componentes. También se puede elegir al construir:

```bash
VITE_BRAND=atraque npm run build
```

El nombre del transportista (`Transportes del Pacífico`) está en `TENANT_NAME` del mismo archivo.

## Otros ajustes

- **Mapa base:** `src/config/map.ts` (`osmLight` gris claro u `osm` a color). Necesita internet para cargar los tiles de OpenStreetMap.
- **Simulación:** `src/config/demo.ts` (cada cuántos segundos llega el GPS, cuánto se acelera el movimiento, umbrales de color del último GPS).
- **Rutas por carretera:** ya vienen en `src/mocks/routes.generated.ts`. Para regenerarlas (requiere internet): `npm run fetch-routes`.

## Docker / Easypanel

```bash
docker build -t torre-control .
docker build --build-arg VITE_BRAND=atraque -t torre-control .   # con otra marca
docker run -p 8080:80 torre-control                               # http://localhost:8080
```

Imagen multi-etapa: Node 22 compila y nginx sirve `dist/` con fallback de SPA (cualquier ruta carga `index.html`). En Easypanel: crear una app desde el repositorio con el `Dockerfile` y exponer el puerto 80.

## Estructura

```
src/
  config/      marca, mapa, simulación, menú
  mocks/       datos de demostración (viajes, unidades, personal, alertas, reglas, geocercas…)
  store/       estado global (Zustand)
  sim/         reloj y simulación del GPS
  lib/         utilidades (formatos, ISO 6346, geometría, validación de Nuevo viaje…)
  components/  layout, UI, mapa, modal de viaje
  pages/       una carpeta por módulo
docs/figma/    extracción de las pantallas del Figma (v2) y capturas de referencia
```
