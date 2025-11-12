# Sistema de Actualizaciones Granulares en Tiempo Real

## Descripción General

El sistema permite que cuando hay cambios en la base de datos, solo se actualicen los componentes específicos (gráficas, tablas, cards) que fueron afectados, sin recargar la página completa ni re-renderizar componentes que no cambiaron.

## Flujo de Datos

### Backend (Node.js + PostgreSQL)

1. **Listener de BD** (`back/services/notificationListener.js`):
   - Escucha eventos `LISTEN actualizacion_dashboard` de PostgreSQL
   - Cuando recibe una notificación, emite `data_is_updating` y dispara `refreshDashboardCache()`

2. **Worker de Dashboard** (`back/services/dashboardWorker.js`):
   - Recalcula agregaciones (círculos por estado, por municipio, total)
   - **Detecta cambios puntuales** comparando con el estado anterior
   - Emite eventos granulares `state_updated` para cada estado que cambió
   - Ejemplo: `{ event: 'state_updated', payload: { estado: 'CARABOBO', circulos_certificados: 4212 } }`
   - Al finalizar, emite `data_updated` para sincronización final

3. **WebSocket Service** (`back/services/websocketService.js`):
   - Transmite todos los eventos a los clientes conectados

### Frontend (Vue 3 + Quasar + Pinia)

1. **Boot WebSocket** (`front/src/boot/ws.js`):
   - Abre conexión a `ws://localhost:3000`
   - Maneja eventos:
     - `data_is_updating`: Activa loader visual
     - `state_updated`: Aplica patch puntual en el store
     - `data_updated`: Refetch completo (fallback)

2. **Store Dashboard** (`front/src/stores/dashboard-store.js`):
   - `applyStateUpdate(payload)`: Actualiza in-place un solo estado en el array
   - Mantiene referencia del array intacta (no reemplaza)
   - Ejemplo: `{ estado_id: 7, estado: 'CARABOBO', circulos_certificados: 4212 }`

3. **Componente DataVisualizer** (`front/src/components/DataVisualizer.vue`):
   - **Para Tabla (QTable)**:
     - Usa `row-key="estado_id"` para identificar filas de forma estable
     - QTable solo re-renderiza la fila que cambió
   
   - **Para Gráfica (ApexCharts)**:
     - Watcher detecta cambios en `chartSeries`
     - Llama `chartRef.updateSeries()` en lugar de re-renderizar
     - ApexCharts anima solo la barra/punto que cambió

## Ejemplo de Flujo Completo

### Escenario: Se agrega 1 círculo a Carabobo (4211 → 4212)

1. **BD**: Se inserta un registro en `rm_circulos_remoto`
2. **Trigger BD**: Emite `NOTIFY actualizacion_dashboard`
3. **Backend**:
   - Listener recibe notificación
   - Emite `{ event: 'data_is_updating' }` → UI muestra loader
   - Worker recalcula: Carabobo pasa de 4211 a 4212
   - Detecta cambio y emite: `{ event: 'state_updated', payload: { estado: 'CARABOBO', circulos_certificados: 4212 } }`
   - Emite `{ event: 'data_updated' }` → UI oculta loader
4. **Frontend**:
   - Recibe `state_updated`
   - Store: `applyStateUpdate({ estado: 'CARABOBO', circulos_certificados: 4212 })`
   - Busca el índice de Carabobo en `circlesByState` y muta solo ese objeto
   - QTable detecta cambio en la fila (por row-key) y re-renderiza solo esa fila
   - ApexCharts watcher detecta cambio en serie y llama `updateSeries()` → anima solo la barra de Carabobo
5. **Resultado**: Solo la barra y la fila de Carabobo se actualizan; el resto del dashboard permanece intacto

## Configuración

### Backend

No requiere configuración adicional. El sistema detecta cambios automáticamente.

### Frontend

**URL del WebSocket** (`front/src/boot/ws.js`):
```javascript
const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + 'localhost:3000';
```

Si el backend está en otro host/puerto, actualiza esta URL.

## Eventos WebSocket

### Eventos Globales (refetch completo)

```json
{
  "event": "data_is_updating"
}
```
Indica que el backend está recalculando. UI muestra loader.

```json
{
  "event": "data_updated"
}
```
Indica que el recálculo finalizó. Frontend hace refetch de todos los datos.

### Eventos Granulares (actualización puntual)

```json
{
  "event": "state_updated",
  "payload": {
    "estado": "CARABOBO",
    "circulos_certificados": 4212
  }
}
```

O con `estado_id` (si está disponible):
```json
{
  "event": "state_updated",
  "payload": {
    "estado_id": 7,
    "estado": "CARABOBO",
    "circulos_certificados": 4212,
    "meta_circulos": 6000
  }
}
```

El frontend busca por `estado_id` primero, luego por `estado` (case-insensitive).

## Optimizaciones Implementadas

1. **Mutación in-place**: El array `circlesByState` mantiene su referencia; solo mutan los objetos dentro.
2. **Row keys estables**: QTable usa `row-key="estado_id"` para identificar filas de forma única.
3. **ApexCharts updateSeries**: En lugar de re-renderizar, usa la API nativa para actualizar series.
4. **Watcher deep**: Detecta cambios profundos en objetos sin reemplazar el array.
5. **Comparación JSON**: Evita actualizaciones innecesarias comparando series antes de llamar `updateSeries()`.

## Debugging

### Logs en Backend
```
[Worker] Estado CARABOBO: 4211 → 4212
```

### Logs en Frontend (Console)
```
[WS] Conectado
[WS] Evento: state_updated
```

### Verificar en DevTools
- **Network**: Pestaña WebSocket para ver mensajes en tiempo real
- **Vue DevTools**: Inspeccionar store `circlesByState` para ver mutaciones
- **Performance**: Verificar que solo se re-renderiza la fila/barra afectada

## Fallback

Si el backend no emite eventos granulares, el sistema sigue funcionando:
- Recibe `data_updated` global
- Hace refetch completo de todos los datos
- Componentes se actualizan (menos eficiente, pero funcional)

## Próximas Mejoras

1. Emitir eventos granulares para `meta_circulos` también
2. Agregar eventos para cambios en municipios
3. Implementar debouncing si hay muchos cambios simultáneos
4. Agregar animaciones personalizadas en transiciones
