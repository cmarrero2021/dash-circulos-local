// src/stores/dashboard-store.js

import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import { useAuthStore } from 'stores/auth-store'; // Importar el store de autenticación
import { ref } from 'vue';

export const useDashboardStore = defineStore('dashboard', () => {
  // --- STATE ---
  const circlesByState = ref([]);
  const circlesByMunicipio = ref([]);
  const circlesByComuna = ref([]);
  const indicators = ref({});
  const dailyCertifications = ref([]);
  const isLoading = ref(false);
  const lastUpdateAt = ref(0);

  // --- ACTIONS ---

  // Fetches data without showing global loading, for silent updates
  const fetchIndicators = async () => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return; // No hacer nada si no está autenticado

    try {
      const response = await api.get('/dashboard/indicators');
      indicators.value = response.data;
    } catch (error) {
      console.error('Error al obtener los indicadores:', error);
      indicators.value = {};
    }
  };

  const fetchDailyCertifications = async (filters = {}) => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return; // No hacer nada si no está autenticado

    try {
      const response = await api.get('/dashboard/daily-certifications', { params: filters });
      dailyCertifications.value = response.data;
    } catch (error) {
      console.error('Error al obtener las certificaciones diarias:', error);
      dailyCertifications.value = [];
    }
  };

  // Fetches data with global loading indicator
  const fetchCirclesByState = async (filters = {}) => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return; // No hacer nada si no está autenticado

    isLoading.value = true;
    try {
      const response = await api.get('/dashboard/by-state', { params: filters });
      circlesByState.value = response.data;
    } catch (error) {
      console.error('Error al obtener los círculos por estado:', error);
      circlesByState.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const fetchCirclesByMunicipios = async (filters = {}) => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return; // No hacer nada si no está autenticado

    isLoading.value = true;
    try {
      const response = await api.get('/dashboard/circles-states-municipios', { params: filters });
      circlesByMunicipio.value = response.data;
    } catch (error) {
      console.error('Error al obtener los círculos por municipio:', error);
      circlesByMunicipio.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const fetchCirclesByComunas = async (filters = {}) => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return; // No hacer nada si no está autenticado

    isLoading.value = true;
    try {
      const response = await api.get('/dashboard/circles-states-municipios-comunas', { params: filters });
      circlesByComuna.value = response.data;
    } catch (error) {
      console.error('Error al obtener los círculos por comuna:', error);
      circlesByComuna.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // Encadenar recarga para todos los datasets usados en IndexPage
  const refetchAll = async () => {
    isLoading.value = true;
    await Promise.allSettled([
      fetchIndicators(),
      fetchCirclesByState(),
      fetchDailyCertifications(),
      fetchCirclesByMunicipios(),
      fetchCirclesByComunas(),
    ]);
    lastUpdateAt.value = Date.now();
    isLoading.value = false;
  };

  /**
   * Handles real-time updates from WebSocket.
   * This action performs granular updates on the local state without refetching all data.
   * @param {object} payload - The data from the WebSocket message.
   * e.g., { operacion: 'INSERT', state_id: 1, municipality_id: 2, comuna_id: 3 }
   */
  const handleDBChange = (payload) => {
    const { state_id, municipality_id, parish_id, operacion } = payload;
    const change = operacion === 'INSERT' ? 1 : operacion === 'DELETE' ? -1 : 0;

    if (change === 0) return;

    // 1. Update Circles by State
    const stateRow = circlesByState.value.find(s => s.estado_id === state_id);
    if (stateRow) {
      stateRow.avance = (stateRow.avance || 0) + change;
      circlesByState.value.forEach(r => delete r.__highlightedAt);
      stateRow.__highlightedAt = Date.now();
    }

    // 2. Update Circles by Municipio
    const municipioRow = circlesByMunicipio.value.find(m => m.municipio_id === municipality_id);
    if (municipioRow) {
      municipioRow.avance = (municipioRow.avance || 0) + change;
      circlesByMunicipio.value.forEach(r => delete r.__highlightedAt);
      municipioRow.__highlightedAt = Date.now();
    }

    // 3. Update Circles by Comuna (using parish_id from payload)
    const comunaRow = circlesByComuna.value.find(c => c.comuna_id === parish_id);
    if (comunaRow) {
      comunaRow.avance = (comunaRow.avance || 0) + change;
      circlesByComuna.value.forEach(r => delete r.__highlightedAt);
      comunaRow.__highlightedAt = Date.now();
    }

    // 4. Refresh global indicators as they might have changed
    fetchIndicators();
    fetchDailyCertifications();

    // 5. Notify components of the update
    lastUpdateAt.value = Date.now();
  };

  return {
    // State
    circlesByState,
    circlesByMunicipio,
    circlesByComuna,
    indicators,
    dailyCertifications,
    isLoading,
    lastUpdateAt,

    // Actions
    fetchCirclesByState,
    fetchIndicators,
    fetchDailyCertifications,
    fetchCirclesByMunicipios,
    fetchCirclesByComunas,
    refetchAll,
    handleDBChange,
  };
});
