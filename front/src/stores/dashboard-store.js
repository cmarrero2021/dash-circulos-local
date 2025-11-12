// src/stores/dashboard-store.js

import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import { ref } from 'vue';
import { Notify } from 'quasar'; // Importamos Notify para mostrar errores

export const useDashboardStore = defineStore('dashboard', () => {
  // --- STATE ---
  // Un ref para cada indicador que necesitemos
  const circlesByState = ref([]);
  const indicators = ref({});
  // ... aquí añadiremos más refs para otros datos (byMunicipality, total, etc.)

  // Un único estado de carga para todo el store o podrías tener uno por acción
  const isLoading = ref(false);

  // --- ACTIONS ---

  const fetchIndicators = async () => {
    isLoading.value = true;
    try {
      const response = await api.get('/dashboard/indicators');
      indicators.value = response.data;
    } catch (error) {
      console.error('Error al obtener los indicadores:', error);
      indicators.value = {}; // Limpiar en caso de error
      Notify.create({
        type: 'negative',
        message: 'No se pudieron cargar los indicadores principales.',
      });
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Obtiene los datos de círculos agrupados por estado desde la API.
   * @param {object} filters - Un objeto con filtros opcionales (ej: { estado_id: 4 })
   */
  /*
  const fetchCirclesByState = async (filters = {}) => {
    isLoading.value = true;
    try {
      // Hacemos la llamada a la API, pasando los filtros como query params
      const response = await api.get('/dashboard/by-state', { params: filters });

      // La data del backend para este endpoint es un objeto, no un array.
      // Lo transformamos a un array de objetos, que es más fácil de usar en QTable y ApexCharts.
      // Ejemplo de entrada: { "AMAZONAS": 15, "ANZOÁTEGUI": 10 }
      // Ejemplo de salida: [ { estado: "AMAZONAS", total_circulos: 15 }, { estado: "ANZOÁTEGUI", total_circulos: 10 } ]
      const dataAsArray = Object.entries(response.data).map(([estado, total]) => ({
        estado: estado,
        total_circulos: total
      }));

      circlesByState.value = dataAsArray;

    } catch (error) {
      console.error('Error al obtener los círculos por estado:', error);
      circlesByState.value = []; // Limpiar datos en caso de error
      Notify.create({
        type: 'negative',
        message: 'No se pudieron cargar los datos de círculos por estado.',
      });
    } finally {
      isLoading.value = false;
    }
  };
*/
  const fetchCirclesByState = async (filters = {}) => {
    isLoading.value = true;
    try {
      const response = await api.get('/dashboard/by-state', { params: filters });
      // La API ya devuelve un array de objetos, así que lo asignamos directamente.
      // Ejemplo: [ { estado_id: 1, estado: "AMAZONAS", total_circulos: 15 }, ... ]
      circlesByState.value = response.data;
    } catch (error) {
      console.error('Error al obtener los círculos por estado:', error);
      circlesByState.value = []; // Limpiar datos en caso de error
      Notify.create({
        type: 'negative',
        message: 'No se pudieron cargar los datos de círculos por estado.',
      });
    } finally {
      isLoading.value = false;
    }
  };
  // --- (Aquí añadiremos más acciones como fetchCirclesByMunicipality, etc.) ---


  return {
    // State
    circlesByState,
    indicators,
    isLoading,

    // Actions
    fetchCirclesByState,
    fetchIndicators,
  };
});
