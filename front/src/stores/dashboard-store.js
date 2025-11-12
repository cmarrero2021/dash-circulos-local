// src/stores/dashboard-store.js

import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import { ref } from 'vue';

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
    }
  };

  const fetchCirclesByState = async (filters = {}) => {
    isLoading.value = true;
    try {
      const response = await api.get('/dashboard/by-state', { params: filters });
      circlesByState.value = response.data;
      // Re-apply highlights to freshly loaded rows if any highlighted keys are active
      circlesByState.value.forEach(row => {
        const key = row.estado_id != null ? String(row.estado_id) : String((row.estado || '').toUpperCase());
        const ts = highlightedStates.value[key];
        if (ts) {
          // Reapply any active highlight for this key (persist until another WS signal)
          row.__highlightedAt = ts;
        }
      });
    } catch (error) {
      console.error('Error al obtener los círculos por estado:', error);
      circlesByState.value = [];
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

  const highlightState = (payload) => {
    // First, clear any existing highlights on all rows
    circlesByState.value.forEach(r => {
      if (r && r.__highlightedAt) {
        // previously highlighted; clearing mark
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
  // highlightState called with payload; idx: findIndex
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
