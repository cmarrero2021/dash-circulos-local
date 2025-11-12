// src/boot/ws.js
import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar';
import { useDashboardStore } from 'stores/dashboard-store';
import { storeInstance } from 'src/router/index';
// We will only update indicators (cards) on data_updated events. Table updates remain disabled.

let socket;

export default boot(() => {

  // Determinar URL del WS (asume backend en el mismo host:puerto de API base http://localhost:3000)
  const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + 'localhost:3000';

  const connect = () => {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log('[WS] Conectado');
    };

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Obtain store instance when needed
        const dashboardStore = useDashboardStore(storeInstance);
        switch (msg.event) {
          case 'data_is_updating':
            // Inform the user that backend is updating data (no UI refresh happens automatically)
            Notify.create({
              message: 'El servidor está actualizando los datos.',
              color: 'info',
              position: 'top',
              timeout: 3000
            });
            break;
          case 'data_updated':
            // Inform the user that data changed; update only the indicator cards (no table refresh)
            Notify.create({
              message: 'Los datos del dashboard han cambiado en el servidor. Actualizando indicadores...',
              color: 'positive',
              position: 'top',
              timeout: 3000
            });
            try {
              // Fetch only indicators (cards)
              await dashboardStore.fetchIndicators();
            } catch (e) {
              console.error('[WS] Error fetching indicators after data_updated', e);
            }
            break;
          case 'state_updated':
          case 'delta_state': {
            // Inform the user about a granular state change and highlight the specific row
            Notify.create({
              message: 'Se detectó un cambio en el estado en el servidor. Resaltando la fila correspondiente.',
              color: 'warning',
              position: 'top',
              timeout: 4000
            });
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
