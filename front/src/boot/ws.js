// src/boot/ws.js
import { boot } from 'quasar/wrappers';
import { useDashboardStore } from 'stores/dashboard-store';
import { storeInstance } from 'src/router/index';

let socket;

export default boot(() => {
  const dashboardStore = useDashboardStore(storeInstance);

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
        switch (msg.event) {
          case 'data_is_updating':
            dashboardStore.notifyDataIsUpdating();
            break;
          case 'data_updated':
            await dashboardStore.notifyDataUpdated();
            break;
          default:
            // Si no conocemos el evento, ignoramos silenciosamente o podríamos registrar
            // console.log('[WS] Evento desconocido', msg);
            break;
        }
      } catch (e) {
        // Mensajes no JSON -> por seguridad intentamos refetch
        await dashboardStore.notifyDataUpdated();
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
