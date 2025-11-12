// src/boot/expose-store.js
import { boot } from 'quasar/wrappers';
import { useDashboardStore } from 'stores/dashboard-store';
import { storeInstance } from 'src/router/index';

// Temporary helper boot file that exposes the dashboard store and small helpers
// on window for debugging from the browser console. Remove this file in production.
export default boot(() => {
  try {
    const dashboardStore = useDashboardStore(storeInstance);

    // Expose the store reference (for debugging only)
    // Examples from the console:
    // window.__dashboardStore.highlightState({ estado: 'SUCRE' })
    // window.__dashboardStore.fetchIndicators()
    window.__dashboardStore = dashboardStore;

    // Convenience helpers
    window.__simulateStateUpdate = (payload) => {
      console.debug('[BOOT] simulate state update', payload);
      try {
        dashboardStore.highlightState(payload);
      } catch (e) {
        console.error('[BOOT] simulateStateUpdate error', e);
      }
    };

    window.__simulateIndicators = async () => {
      console.debug('[BOOT] simulate indicators refresh');
      try {
        await dashboardStore.fetchIndicators();
      } catch (e) {
        console.error('[BOOT] simulateIndicators error', e);
      }
    };
  } catch (e) {
    // Safe: if Pinia or router not ready yet, this boot will still run at app start
    console.error('[BOOT] expose-store failed', e);
  }
});
