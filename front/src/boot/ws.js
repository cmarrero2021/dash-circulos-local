// src/boot/ws.js
import { boot } from 'quasar/wrappers';
import { useDashboardStore } from 'stores/dashboard-store';
import { storeInstance } from 'src/router/index';

let socket;

export default boot(() => {
  // Determinar URL del WS (asume backend en el mismo host:puerto de API base http://localhost:3000)
  const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + 'localhost:3000';

  const connect = () => {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      // connection opened
    };

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Obtain store instance when needed
        const dashboardStore = useDashboardStore(storeInstance);
        switch (msg.event) {
          case 'data_is_updating':
            // Backend is updating data; no UI notification shown.
            break;
          case 'data_updated':
            // Update only the indicator cards (no table refresh and no user notification)
            try {
              await Promise.all([
                dashboardStore.fetchIndicators(),
                dashboardStore.fetchDailyCertifications(),
                dashboardStore.fetchCirclesByMunicipios(),
              ]);
            } catch (e) {
              console.error('[WS] Error fetching indicators after data_updated', e);
            }
            break;
          case 'state_updated':
          case 'delta_state': {
            try {
              const payload = msg.payload || {};
              // Highlight only the row that matches payload.estado or payload.estado_id
              dashboardStore.highlightState(payload);
            } catch (e) {
              console.error('[WS] Error highlighting state', e);
            }
            break;
          }
          default:
            break;
        }
      } catch {
        // Mensajes no JSON -> no hacer nada especial
      }
    };

    socket.onclose = () => {
      console.warn('[WS] Desconectado. Reintentando en 3s...');
      setTimeout(connect, 3000);
    };

    socket.onerror = (err) => {
      console.error('[WS] Error', err);
      socket.close();
    };
  };

  connect();
});
