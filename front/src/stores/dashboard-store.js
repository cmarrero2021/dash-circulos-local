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

  // --- ACTIONS ---
  const fetchIndicators = async () => {
    isLoading.value = true;
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
    } finally {
      isLoading.value = false;
    }
  };

  const fetchCirclesByState = async (filters = {}) => {
    isLoading.value = true;
    try {
      const response = await api.get('/dashboard/by-state', { params: filters });
      circlesByState.value = response.data;
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
  };
});
