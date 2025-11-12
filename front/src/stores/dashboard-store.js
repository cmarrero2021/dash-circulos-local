// src/stores/dashboard-store.js

import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import { ref } from 'vue';
import { Notify } from 'quasar'; // Importamos Notify para mostrar errores

export const useDashboardStore = defineStore('dashboard', () => {
  // --- STATE ---
  const circlesByState = ref([]);
  const indicators = ref({});
  const isLoading = ref(false);
  // Marca de actualización para WS
  const isUpdatingFromBackend = ref(false);
  const lastUpdateAt = ref(0);
  // Highlighted states map to persist highlights across refreshes
  const highlightedStates = ref({}); // { key: timestamp }

  // --- ACTIONS ---
  const fetchIndicators = async () => {
    // Fetch indicators without toggling the global isLoading flag so
    // charts/tables are not impacted by indicator-only refreshes (e.g. from WS)
    try {
      const response = await api.get('/dashboard/indicators');
      indicators.value = response.data;
    } catch (error) {
      console.error('Error al obtener los indicadores:', error);
      indicators.value = {};
      Notify.create({
        type: 'negative',
        message: 'No se pudieron cargar los indicadores principales.',
      });
    }
  };

  const fetchCirclesByState = async (filters = {}) => {
    isLoading.value = true;
    try {
      const response = await api.get('/dashboard/by-state', { params: filters });
      circlesByState.value = response.data;
      // Re-apply highlights to freshly loaded rows if any highlighted keys are active
      const now = Date.now();
      const HIGHLIGHT_DURATION = 5000;
      circlesByState.value.forEach(row => {
        const key = row.estado_id != null ? String(row.estado_id) : String((row.estado || '').toUpperCase());
        const ts = highlightedStates.value[key];
        if (ts && (now - ts) < HIGHLIGHT_DURATION) {
          row.__highlightedAt = ts;
        }
      });
    } catch (error) {
      console.error('Error al obtener los círculos por estado:', error);
      circlesByState.value = [];
      Notify.create({
        type: 'negative',
        message: 'No se pudieron cargar los datos de círculos por estado.',
      });
    } finally {
      isLoading.value = false;
    }
  };

  // Encadenar recarga para todos los datasets usados en IndexPage
  const refetchAll = async () => {
    await Promise.allSettled([
      fetchIndicators(),
      fetchCirclesByState(),
    ]);
    lastUpdateAt.value = Date.now();
  };

  // Notificaciones desde WS
  const notifyDataIsUpdating = () => {
    isUpdatingFromBackend.value = true;
  };
  const notifyDataUpdated = async () => {
    isUpdatingFromBackend.value = false;
    await refetchAll();
  };

  // Aplicar delta puntual de un estado
  const applyStateUpdate = (payload) => {
    // payload esperado: { estado_id?, estado?, circulos_certificados?, meta_circulos? }
    const findIndex = () => {
      if (payload.estado_id != null) {
        return circlesByState.value.findIndex(r => r.estado_id === payload.estado_id);
      }
      if (payload.estado) {
        return circlesByState.value.findIndex(r => (r.estado || '').toUpperCase() === String(payload.estado).toUpperCase());
      }
      return -1;
    };
    const idx = findIndex();
    if (idx === -1) return; // si no existe en memoria, no hacemos nada (o podríamos insertar)

    // Mutar propiedades del objeto directamente (no reemplazar el objeto)
    // Esto permite que Vue detecte cambios en propiedades específicas
    const item = circlesByState.value[idx];
    Object.assign(item, payload);
    // Si el payload trae indicadores agregados, aplicarlos también (opcional)
    if (payload.indicators && typeof payload.indicators === 'object') {
      indicators.value = { ...(indicators.value || {}), ...payload.indicators };
    }
    lastUpdateAt.value = Date.now();
  };

  // Marcar una fila como "cambiada" para destacar sin actualizar sus valores
  const HIGHLIGHT_DURATION = 5000; // ms
  const highlightState = (payload) => {
    // First, clear any existing highlights on all rows
    circlesByState.value.forEach(r => {
      if (r && r.__highlightedAt) {
        // debug
        console.debug('[store] clearing highlight for', r.estado || r.estado_id);
        delete r.__highlightedAt;
      }
    });

    // Find the target row by estado_id or estado (case-insensitive)
    const findIndex = () => {
      if (payload.estado_id != null) {
        return circlesByState.value.findIndex(r => r.estado_id === payload.estado_id);
      }
      if (payload.estado) {
        return circlesByState.value.findIndex(r => (r.estado || '').toUpperCase() === String(payload.estado).toUpperCase());
      }
      return -1;
    };

  const idx = findIndex();
  console.debug('[store] highlightState payload:', payload, 'foundIdx:', idx);
  if (idx === -1) return;

  const item = circlesByState.value[idx];
    // Mark with timestamp so components can show highlight
    const ts = Date.now();
    item.__highlightedAt = ts;
    // Store the incoming payload temporarily on the item so UI can read new values
    // attach payload
    item.__pendingUpdate = payload;
    // Also apply the incoming numeric values to the item so the table shows them
    if (payload.circulos_certificados != null) {
      // ensure numeric
      const num = Number(payload.circulos_certificados);
      if (!Number.isNaN(num)) item.circulos_certificados = num;
    }
    if (payload.meta_circulos != null) {
      const num2 = Number(payload.meta_circulos);
      if (!Number.isNaN(num2)) item.meta_circulos = num2;
    }

    // Also record in highlightedStates so highlight survives a refetch
  const key = item.estado_id != null ? String(item.estado_id) : String((item.estado || '').toUpperCase());
  highlightedStates.value[key] = ts;
  console.debug('[store] highlighted key set:', key, 'ts:', ts, 'item.estado:', item.estado);

    // Clear the mark after duration (both on the row and on the map)
    setTimeout(() => {
      if (item && item.__highlightedAt && item.__highlightedAt === ts) {
        delete item.__highlightedAt;
      }
      if (item && item.__pendingUpdate) {
        delete item.__pendingUpdate;
      }
      if (highlightedStates.value[key] && highlightedStates.value[key] === ts) {
        delete highlightedStates.value[key];
      }
    }, HIGHLIGHT_DURATION);
    lastUpdateAt.value = Date.now();
  };

  return {
    // State
    circlesByState,
    indicators,
    isLoading,
    isUpdatingFromBackend,
    lastUpdateAt,

    // Actions
    fetchCirclesByState,
    fetchIndicators,
    refetchAll,
    notifyDataIsUpdating,
    notifyDataUpdated,
    applyStateUpdate,
    highlightState,
  };
});
