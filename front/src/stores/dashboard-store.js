// src/stores/dashboard-store.js

import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import { useAuthStore } from 'stores/auth-store'; // Importar el store de autenticación
import { ref } from 'vue';

const sortStateIndicators = (rows = []) =>
  [...rows].sort((a, b) => (a?.estado_nombre || '').localeCompare(b?.estado_nombre || '', 'es', { sensitivity: 'base' }));

const setRowHighlightFlag = (rows = [], estadoId) => {
  const timestamp = Date.now();
  const normalizedId = Number(estadoId);
  if (Number.isNaN(normalizedId)) {
    return rows.map(row => ({ ...row }));
  }
  return rows.map(row => {
    if (!row) return row;
    const copy = { ...row };
    if (Number(copy.estado_id) === normalizedId) {
      copy.__highlightedAt = timestamp;
    } else {
      delete copy.__highlightedAt;
    }
    return copy;
  });
};

export const useDashboardStore = defineStore('dashboard', () => {
  // --- STATE ---
  const circlesByState = ref([]);
  const circlesByMunicipio = ref([]);
  const circlesByParroquia = ref([]);
  const circlesByComuna = ref([]);
  const circlesByComunaParroquia = ref([]); // New state for the detailed table
  const indicators = ref({});
  const dailyCertifications = ref([]);
  const stateIndicators = ref([]);
  const registrosIndicadores = ref([]); // Estado de registros
  const registrosIndicadoresNacionales = ref({}); // Indicadores nacionales
  const priorizados = ref([]);
  const priorizadosTotalRows = ref(0);
  const priorizadosFilterOptions = ref({ estados: [], municipios: [], parroquias: [], comunidades: [] });
  const isLoadingPriorizados = ref(false);
  const isLoading = ref(false);
  const isStateIndicatorsLoading = ref(false);
  const isLoadingRegistrosIndicadores = ref(false);
  const isLoadingRegistrosIndicadoresNacionales = ref(false);
  const lastUpdateAt = ref(0);
  const highlightedStateId = ref(null);
  const manualStateFilter = ref(null); // Filtro manual desde el mapa

  const userHasNationalAccess = () => {
    const authStore = useAuthStore();
    const isAdmin = authStore.user?.role === 'Administrador';
    const allowed = authStore.allowedStates;
    return isAdmin || !Array.isArray(allowed) || allowed.length === 0;
  };

  // --- ACTIONS ---

  // Fetches data without showing global loading, for silent updates
  const fetchIndicators = async (filters = {}) => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return; // No hacer nada si no está autenticado

    try {
      const response = await api.get('/dashboard/indicators', { params: filters });
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

  const fetchCirclesByParroquias = async (filters = {}) => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return;

    isLoading.value = true;
    try {
      const response = await api.get('/dashboard/circles-states-municipios-parroquias', { params: filters });
      circlesByParroquia.value = response.data;
    } catch (error) {
      console.error('Error al obtener los círculos por parroquia:', error);
      circlesByParroquia.value = [];
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

  const fetchCirclesByComunasParroquias = async (filters = {}) => {
    isLoading.value = true;
    try {
      const response = await api.get('/dashboard/circles-states-municipios-parroquias-comunas', { params: filters });
      circlesByComunaParroquia.value = response.data;
    } catch (error) {
      console.error('Error al obtener los círculos por comuna (detallado):', error);
      circlesByComunaParroquia.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const fetchStateIndicators = async () => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return;

    isStateIndicatorsLoading.value = true;
    try {
      const response = await api.get('/dashboard/state-indicators');
      stateIndicators.value = sortStateIndicators(response.data || []);
      highlightedStateId.value = null;
    } catch (error) {
      console.error('Error al obtener los indicadores por estado:', error);
      stateIndicators.value = [];
    } finally {
      isStateIndicatorsLoading.value = false;
    }
  };

  const fetchRegistrosIndicadores = async () => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return;

    isLoadingRegistrosIndicadores.value = true;
    try {
      const response = await api.get('/dashboard/registros-indicadores');
      registrosIndicadores.value = response.data || [];
    } catch (error) {
      console.error('Error al obtener los indicadores de registros:', error);
      registrosIndicadores.value = [];
    } finally {
      isLoadingRegistrosIndicadores.value = false;
    }
  };

  const fetchRegistrosIndicadoresNacionales = async () => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return;

    isLoadingRegistrosIndicadoresNacionales.value = true;
    try {
      const response = await api.get('/dashboard/registros-indicadores-nacionales');
      registrosIndicadoresNacionales.value = response.data || {};
    } catch (error) {
      console.error('Error al obtener los indicadores de registros nacionales:', error);
      registrosIndicadoresNacionales.value = {};
    } finally {
      isLoadingRegistrosIndicadoresNacionales.value = false;
    }
  };

  const refreshStateIndicatorRow = async (estadoId) => {
    const normalizedId = Number(estadoId);
    if (Number.isNaN(normalizedId)) return;
    if (!stateIndicators.value.length) {
      await fetchStateIndicators();
      highlightedStateId.value = normalizedId;
      return;
    }
    try {
      const response = await api.get('/dashboard/state-indicators', { params: { estado_id: normalizedId } });
      const row = response.data?.[0];
      if (!row) return;
      const current = [...stateIndicators.value];
      const index = current.findIndex(r => Number(r.estado_id) === normalizedId);
      if (index === -1) {
        current.push(row);
      } else {
        current[index] = row;
      }
      const sorted = sortStateIndicators(current);
      stateIndicators.value = setRowHighlightFlag(sorted, normalizedId);
      highlightedStateId.value = normalizedId;
    } catch (error) {
      console.error('Error al refrescar indicador por estado:', error);
    }
  };

  // Encadenar recarga para todos los datasets usados en IndexPage
  const refetchAll = async () => {
    isLoading.value = true;
    const filters = manualStateFilter.value ? { estado_id: manualStateFilter.value } : {};

    await Promise.allSettled([
      fetchIndicators(filters),
      fetchCirclesByState(filters),
      fetchDailyCertifications(filters),
      fetchCirclesByMunicipios(filters),
      fetchCirclesByParroquias(filters),
      fetchCirclesByComunas(filters),
      fetchCirclesByComunasParroquias(filters),
      fetchRegistrosIndicadores(),
      fetchRegistrosIndicadoresNacionales(),
    ]);
    // if (userHasNationalAccess() && !manualStateFilter.value) {
    if (!manualStateFilter.value) {
      await fetchStateIndicators();
    }
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

    // Si hay un filtro manual activo, solo procesar si el estado coincide
    if (manualStateFilter.value && Number(state_id) !== Number(manualStateFilter.value)) {

      return;
    }

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

    // 2.5 Update Circles by Parroquia (using parish_id from payload)
    // Note: The payload uses 'parish_id' which maps to 'parroquia_id' in our view/store
    const parroquiaRow = circlesByParroquia.value.find(p => p.parroquia_id === parish_id);
    if (parroquiaRow) {
      parroquiaRow.avance = (parroquiaRow.avance || 0) + change;
      circlesByParroquia.value.forEach(r => delete r.__highlightedAt);
      parroquiaRow.__highlightedAt = Date.now();
    }

    // 3. Update Circles by Comuna (using parish_id from payload)
    const comunaRow = circlesByComuna.value.find(c => c.comuna_id === parish_id);
    if (comunaRow) {
      comunaRow.avance = (comunaRow.avance || 0) + change;
      circlesByComuna.value.forEach(r => delete r.__highlightedAt);
      comunaRow.__highlightedAt = Date.now();
    }

    // 2.6 Update Circles by Comuna Parroquia (using comuna_id from payload)
    // Assuming parish_id in payload maps to comuna_id for now based on previous logic, but let's be careful.
    // Actually, the payload usually has comuna_id if available.
    // If the payload has a specific comuna_id field, we should use it.
    // Based on previous code: const { state_id, municipality_id, parish_id, operacion } = payload;
    // It seems parish_id is being used as comuna_id in step 3? "const comunaRow = circlesByComuna.value.find(c => c.comuna_id === parish_id);"
    // This looks suspicious in the existing code, but I will follow the pattern for now or try to use a more generic approach if possible.
    // For the new table, we need to match comuna_id.
    // If parish_id is indeed the comuna_id (maybe a naming confusion in the backend payload), then we use it.
    const comunaParroquiaRow = circlesByComunaParroquia.value.find(c => c.comuna_id === parish_id);
    if (comunaParroquiaRow) {
      comunaParroquiaRow.avance = (comunaParroquiaRow.avance || 0) + change;
      circlesByComunaParroquia.value.forEach(r => delete r.__highlightedAt);
      comunaParroquiaRow.__highlightedAt = Date.now();
    }

    // 4. Refresh global indicators with current filter
    const filters = manualStateFilter.value ? { estado_id: manualStateFilter.value } : {};
    fetchIndicators(filters);
    fetchDailyCertifications(filters);

    // 5. Notify components of the update
    lastUpdateAt.value = Date.now();

    if (userHasNationalAccess() && state_id) {
      refreshStateIndicatorRow(state_id);
    }
  };

  /**
   * Establece un filtro manual por estado desde el mapa
   * Equivale a que un usuario con permiso solo de ese estado esté logueado
   */
  const setManualStateFilter = async (estadoId) => {
    manualStateFilter.value = estadoId;

    // Recargar todos los datos con el filtro aplicado
    await refetchAll();
  };

  /**
   * Limpia el filtro manual y vuelve a la vista nacional
   */
  const clearManualStateFilter = async () => {
    manualStateFilter.value = null;

    // Recargar todos los datos sin filtro
    await refetchAll();
  };

  /**
   * Obtiene datos paginados de priorizados con filtros server-side.
   * @param {object} queryParams - Parámetros de consulta para filtrar, paginar y ordenar.
   */
  const fetchPriorizados = async (queryParams = {}) => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return;

    isLoadingPriorizados.value = true;
    try {
      const response = await api.get('/dashboard/priorizados', { params: queryParams });
      priorizados.value = response.data.rows || [];
      priorizadosTotalRows.value = response.data.totalRows || 0;
    } catch (error) {
      console.error('Error al obtener priorizados:', error);
      priorizados.value = [];
      priorizadosTotalRows.value = 0;
    } finally {
      isLoadingPriorizados.value = false;
    }
  };

  /**
   * Obtiene las opciones únicas para los filtros desplegables de priorizados.
   */
  const fetchPriorizadosFilterOptions = async () => {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return;

    try {
      const response = await api.get('/dashboard/priorizados/filter-options');
      priorizadosFilterOptions.value = response.data || { estados: [], municipios: [], parroquias: [], comunidades: [] };
    } catch (error) {
      console.error('Error al obtener opciones de filtro de priorizados:', error);
    }
  };

  return {
    // State
    circlesByState,
    circlesByMunicipio,
    circlesByParroquia,
    circlesByComuna,
    circlesByComunaParroquia,
    indicators,
    dailyCertifications,
    stateIndicators,
    registrosIndicadores,
    registrosIndicadoresNacionales,
    priorizados,
    priorizadosTotalRows,
    priorizadosFilterOptions,
    isLoadingPriorizados,
    isLoading,
    isStateIndicatorsLoading,
    isLoadingRegistrosIndicadores,
    isLoadingRegistrosIndicadoresNacionales,
    lastUpdateAt,
    highlightedStateId,
    manualStateFilter,

    // Actions
    fetchCirclesByState,
    fetchIndicators,
    fetchDailyCertifications,
    fetchCirclesByMunicipios,
    fetchCirclesByParroquias,
    fetchCirclesByComunas,
    fetchCirclesByComunasParroquias,
    refetchAll,
    handleDBChange,
    fetchStateIndicators,
    fetchRegistrosIndicadores,
    fetchRegistrosIndicadoresNacionales,
    fetchPriorizados,
    fetchPriorizadosFilterOptions,
    setManualStateFilter,
    clearManualStateFilter,
  };
});
