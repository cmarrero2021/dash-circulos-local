// src/boot/ws.js
import { boot } from 'quasar/wrappers';
import { useDashboardStore } from 'stores/dashboard-store';
import { storeInstance } from 'src/router/index';

let socket;

export default boot(() => {
  // Determinar URL del WS basado en VITE_API_URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3100';
  const WS_URL = apiUrl.replace(/^http/, 'ws');

  const connect = () => {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log('[WS] Conectado.');
    };

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        const dashboardStore = useDashboardStore(storeInstance);

        // Centralized event handler for all database changes
        if (msg.event === 'db_change' && msg.payload) {
          dashboardStore.handleDBChange(msg.payload);
        }
        // Optional: Keep other event types if they serve different purposes
        // For example, a full-reload command could be added here if needed.

      } catch (e) {
        // Non-JSON messages or errors are ignored
        console.error('[WS] Error processing message', e);
      }
    };

    socket.onclose = () => {
      console.warn('[WS] Desconectado. Reintentando en 3s...');
      setTimeout(connect, 3000);
    };

    socket.onerror = (err) => {
      console.error('[WS] Error', err.message);
      socket.close();
    };
  };

  connect();

  // Temporary global function to simulate WebSocket messages for testing
  window.simulateWSMessage = (payload) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const fakeEvent = { data: JSON.stringify({ event: 'db_change', payload }) };
      socket.onmessage(fakeEvent);
    } else {
      console.warn('[WS] Socket not connected. Cannot simulate message.');
    }
  };
});
