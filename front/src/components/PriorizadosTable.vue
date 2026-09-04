<template>
  <q-card flat bordered style="position: relative">
    <!-- Header -->
    <q-card-section class="row items-center q-col-gutter-sm q-pb-none">
      <div class="col">
        <div class="text-h6 text-weight-bold text-primary">PRIORIZADOS</div>
        <div class="text-caption text-grey-7">
          {{ formatNumber(totalRows) }} registros encontrados
        </div>
      </div>

      <!-- Global Search -->
      <div class="col-12 col-md-3">
        <q-input
          v-model="search"
          outlined
          dense
          debounce="400"
          placeholder="Buscar en todas las columnas..."
          clearable
          @update:model-value="onFiltersChanged"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>

      <!-- Clear Filters -->
      <div class="col-auto">
        <q-btn flat dense round icon="filter_list_off" color="grey-7" @click="clearAllFilters">
          <q-tooltip>Limpiar todos los filtros y orden</q-tooltip>
        </q-btn>
      </div>

      <!-- Export Menu -->
      <div class="col-auto">
        <q-btn color="grey-7" round flat icon="more_vert" :loading="isExporting">
          <q-menu cover auto-close>
            <q-list style="min-width: 200px">
              <q-item-label header class="text-weight-bold">Toda la data</q-item-label>
              <q-item clickable @click="exportData('all', 'xlsx')">
                <q-item-section avatar><q-icon name="description" /></q-item-section>
                <q-item-section>Exportar a XLSX</q-item-section>
              </q-item>
              <q-item clickable @click="exportData('all', 'csv')">
                <q-item-section avatar><q-icon name="toc" /></q-item-section>
                <q-item-section>Exportar a CSV</q-item-section>
              </q-item>
              <q-item clickable @click="exportData('all', 'json')">
                <q-item-section avatar><q-icon name="code" /></q-item-section>
                <q-item-section>Exportar a JSON</q-item-section>
              </q-item>

              <q-separator />
              <q-item-label header class="text-weight-bold">Data filtrada</q-item-label>
              <q-item clickable @click="exportData('filtered', 'xlsx')">
                <q-item-section avatar><q-icon name="description" /></q-item-section>
                <q-item-section>Exportar a XLSX</q-item-section>
              </q-item>
              <q-item clickable @click="exportData('filtered', 'csv')">
                <q-item-section avatar><q-icon name="toc" /></q-item-section>
                <q-item-section>Exportar a CSV</q-item-section>
              </q-item>
              <q-item clickable @click="exportData('filtered', 'json')">
                <q-item-section avatar><q-icon name="code" /></q-item-section>
                <q-item-section>Exportar a JSON</q-item-section>
              </q-item>

              <q-separator />
              <q-item-label header class="text-weight-bold">Página actual</q-item-label>
              <q-item clickable @click="exportData('page', 'xlsx')">
                <q-item-section avatar><q-icon name="description" /></q-item-section>
                <q-item-section>Exportar a XLSX</q-item-section>
              </q-item>
              <q-item clickable @click="exportData('page', 'csv')">
                <q-item-section avatar><q-icon name="toc" /></q-item-section>
                <q-item-section>Exportar a CSV</q-item-section>
              </q-item>
              <q-item clickable @click="exportData('page', 'json')">
                <q-item-section avatar><q-icon name="code" /></q-item-section>
                <q-item-section>Exportar a JSON</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </q-card-section>

    <q-separator class="q-mt-sm" />

    <!-- Filter Panel -->
    <q-card-section class="row items-end q-col-gutter-sm q-py-sm">
      <!-- Estado -->
      <div class="col-12 col-md-3">
        <q-select
          v-model="filterEstados"
          :options="filteredEstadoOptions"
          multiple
          clearable
          outlined
          dense
          use-input
          use-chips
          input-debounce="200"
          label="Estado"
          emit-value
          map-options
          @filter="(val, update) => filterSelectOptions(val, update, 'estados')"
          @update:model-value="onEstadosChanged"
        >
          <template #no-option>
            <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
          </template>
        </q-select>
      </div>
      <!-- Municipio -->
      <div class="col-12 col-md-3">
        <q-select
          v-model="filterMunicipios"
          :options="filteredMunicipioOptions"
          :disable="!filterEstados.length"
          multiple
          clearable
          outlined
          dense
          use-input
          use-chips
          input-debounce="200"
          label="Municipio"
          emit-value
          map-options
          @filter="(val, update) => filterSelectOptions(val, update, 'municipios')"
          @update:model-value="onMunicipiosChanged"
        >
          <template #no-option>
            <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
          </template>
        </q-select>
      </div>
      <!-- Parroquia -->
      <div class="col-12 col-md-3">
        <q-select
          v-model="filterParroquias"
          :options="filteredParroquiaOptions"
          :disable="!filterMunicipios.length"
          multiple
          clearable
          outlined
          dense
          use-input
          use-chips
          input-debounce="200"
          label="Parroquia"
          emit-value
          map-options
          @filter="(val, update) => filterSelectOptions(val, update, 'parroquias')"
          @update:model-value="onParroquiasChanged"
        >
          <template #no-option>
            <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
          </template>
        </q-select>
      </div>
      <!-- Comunidad -->
      <div class="col-12 col-md-3">
        <q-select
          v-model="filterComunidades"
          :options="filteredComunidadOptions"
          :disable="!filterParroquias.length"
          multiple
          clearable
          outlined
          dense
          use-input
          use-chips
          input-debounce="200"
          label="Comunidad"
          emit-value
          map-options
          @filter="(val, update) => filterSelectOptions(val, update, 'comunidades')"
          @update:model-value="onFiltersChanged"
        >
          <template #no-option>
            <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
          </template>
        </q-select>
      </div>

      <!-- Toggle filters row - Orden: Nacionalidad, Sexo, Patria, Mayor 60, Registro, Círculo, Nuevo -->
      <div class="col-6 col-md-1">
        <div class="text-caption text-grey-7 q-mb-xs">Nacionalidad</div>
        <q-btn-toggle
          v-model="filterNac"
          dense
          no-caps
          spread
          no-wrap
          unelevated
          toggle-color="primary"
          :options="nacOptions"
          class="bg-transparent"
          @update:model-value="onFiltersChanged"
        />
      </div>
      <div class="col-6 col-md-1">
        <div class="text-caption text-grey-7 q-mb-xs">Sexo</div>
        <q-btn-toggle
          v-model="filterSexo"
          dense
          no-caps
          spread
          no-wrap
          unelevated
          toggle-color="primary"
          :options="sexoOptions"
          class="bg-transparent"
          @update:model-value="onFiltersChanged"
        />
      </div>
      <div class="col-6 col-md-1">
        <div class="text-caption text-grey-7 q-mb-xs">Patria</div>
        <q-btn-toggle
          v-model="filterPatria"
          dense
          no-caps
          spread
          no-wrap
          unelevated
          toggle-color="primary"
          :options="toggleOptions"
          class="bg-transparent"
          @update:model-value="onFiltersChanged"
        />
      </div>
      <div class="col-6 col-md-1">
        <div class="text-caption text-grey-7 q-mb-xs">Validado</div>
        <q-btn-toggle
          v-model="filterValidado"
          dense
          no-caps
          spread
          no-wrap
          unelevated
          toggle-color="primary"
          :options="toggleOptions"
          class="bg-transparent"
          @update:model-value="onFiltersChanged"
        />
      </div>
      <div class="col-6 col-md-1">
        <div class="text-caption text-grey-7 q-mb-xs">Mayor 60</div>
        <q-btn-toggle
          v-model="filterMayor60"
          dense
          no-caps
          spread
          no-wrap
          unelevated
          toggle-color="primary"
          :options="toggleOptions"
          class="bg-transparent"
          @update:model-value="onFiltersChanged"
        />
      </div>
      <div class="col-6 col-md-1">
        <div class="text-caption text-grey-7 q-mb-xs">Registro</div>
        <q-btn-toggle
          v-model="filterRegistro"
          dense
          no-caps
          spread
          no-wrap
          unelevated
          toggle-color="primary"
          :options="toggleOptions"
          class="bg-transparent"
          @update:model-value="onFiltersChanged"
        />
      </div>
      <div class="col-6 col-md-1">
        <div class="text-caption text-grey-7 q-mb-xs">Círculo</div>
        <q-btn-toggle
          v-model="filterCirculo"
          dense
          no-caps
          spread
          no-wrap
          unelevated
          toggle-color="primary"
          :options="toggleOptions"
          class="bg-transparent"
          @update:model-value="onFiltersChanged"
        />
      </div>
      <div class="col-6 col-md-1">
        <div class="text-caption text-grey-7 q-mb-xs">Nuevo</div>
        <q-btn-toggle
          v-model="filterNuevos"
          dense
          no-caps
          spread
          no-wrap
          unelevated
          toggle-color="primary"
          :options="toggleOptions"
          class="bg-transparent"
          @update:model-value="onFiltersChanged"
        />
      </div>
      <div class="col-6 col-md-1">
        <div class="text-caption text-grey-7 q-mb-xs">Fallecido</div>
        <q-btn-toggle
          v-model="filterFallecido"
          dense
          no-caps
          spread
          no-wrap
          unelevated
          toggle-color="primary"
          :options="toggleOptions"
          class="bg-transparent"
          @update:model-value="onFiltersChanged"
        />
      </div>
      <div class="col-6 col-md-1">
        <div class="text-caption text-grey-7 q-mb-xs">Excepcional</div>
        <q-btn-toggle
          v-model="filterExcepcional"
          dense
          no-caps
          spread
          no-wrap
          unelevated
          toggle-color="primary"
          :options="toggleOptions"
          class="bg-transparent"
          @update:model-value="onFiltersChanged"
        />
      </div>
    </q-card-section>

    <q-separator />

    <!-- Table -->
    <q-card-section class="q-pa-none">
      <q-table
        ref="tableRef"
        v-model:pagination="pagination"
        flat
        dense
        :rows="dashboardStore.priorizados"
        :columns="columns"
        row-key="id"
        :loading="dashboardStore.isLoadingPriorizados"
        :rows-per-page-options="[25, 50, 100, 200]"
        @request="onRequest"
      >
        <!-- Loading slot -->
        <template #loading>
          <q-inner-loading showing>
            <q-spinner-dots size="40px" color="primary" />
          </q-inner-loading>
        </template>

        <!-- Fecha formatting -->
        <template #body-cell-fecha_nac="slotProps">
          <q-td :props="slotProps">
            {{ formatDate(slotProps.value) }}
          </q-td>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="full-width row flex-center q-pa-lg text-grey-6">
            <q-icon name="search_off" size="md" class="q-mr-sm" />
            No se encontraron registros con los criterios actuales
          </div>
        </template>
      </q-table>
    </q-card-section>

    <!-- Backdrop overlay mientras carga -->
    <q-inner-loading
      :showing="dashboardStore.isLoadingPriorizados"
      dark
      style="z-index: 10"
    >
      <q-spinner-gears size="60px" color="primary" />
      <div class="text-primary text-weight-medium q-mt-md">Cargando priorizados…</div>
    </q-inner-loading>
  </q-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useDashboardStore } from 'stores/dashboard-store';
import { storeToRefs } from 'pinia';
import { utils, writeFile } from 'xlsx';
import { exportFile, Notify } from 'quasar';
import { api } from 'boot/axios';

const props = defineProps({
  active: Boolean,
});

const dashboardStore = useDashboardStore();
const { priorizadosTotalRows, priorizadosFilterOptions } = storeToRefs(dashboardStore);

const totalRows = computed(() => priorizadosTotalRows.value);
const tableRef = ref(null);

// --- Filter state ---
const search = ref('');
const filterEstados = ref([]);
const filterMunicipios = ref([]);
const filterParroquias = ref([]);
const filterComunidades = ref([]);
const filterNac = ref('Todos');
const filterSexo = ref('Todos');
const filterPatria = ref('Todos');
const filterValidado = ref('Todos');
const filterMayor60 = ref('Todos');
const filterRegistro = ref('Todos');
const filterCirculo = ref('Todos');
const filterNuevos = ref('Todos');
const filterFallecido = ref('Todos');
const filterExcepcional = ref('Todos');
const isExporting = ref(false);

// Options for autocomplete filtering in q-selects
const filteredEstadoOptions = ref([]);
const filteredMunicipioOptions = ref([]);
const filteredParroquiaOptions = ref([]);
const filteredComunidadOptions = ref([]);

const toggleOptions = [
  { label: 'Todos', value: 'Todos' },
  { label: 'Sí', value: 'Si' },
  { label: 'No', value: 'No' },
];

const sexoOptions = [
  { label: 'Todos', value: 'Todos' },
  { label: 'M', value: 'M' },
  { label: 'F', value: 'F' },
];

const nacOptions = [
  { label: 'Todos', value: 'Todos' },
  { label: 'V', value: 'V' },
  { label: 'E', value: 'E' },
];

// --- Pagination (server-side) ---
const pagination = ref({
  sortBy: null,
  descending: false,
  page: 1,
  rowsPerPage: 50,
  rowsNumber: 0,
});

// --- Columns ---
const columns = [
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left', sortable: true },
  { name: 'municipio', label: 'Municipio', field: 'municipio', align: 'left', sortable: true },
  { name: 'parroquia', label: 'Parroquia', field: 'parroquia', align: 'left', sortable: true },
  { name: 'comunidad', label: 'Comunidad', field: 'comunidad', align: 'left', sortable: true },
  { name: 'nac', label: 'Nac', field: 'nac', align: 'center', sortable: true },
  { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'right', sortable: true, format: v => formatNumber(v) },
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'telefono', label: 'Teléfono', field: 'telefono', align: 'left', sortable: true },
  { name: 'fecha_nac', label: 'Fecha Nac.', field: 'fecha_nac', align: 'center', sortable: true },
  { name: 'sexo', label: 'Sexo', field: 'sexo', align: 'center', sortable: true },
  { name: 'patria', label: 'Patria', field: 'patria', align: 'center', sortable: true },
  { name: 'validado', label: 'Validado', field: 'validado', align: 'center', sortable: true },
  { name: 'mayor60', label: 'Mayor 60', field: 'mayor60', align: 'center', sortable: true },
  { name: 'registro', label: 'Registro', field: 'registro', align: 'center', sortable: true },
  { name: 'circulo', label: 'Círculo', field: 'circulo', align: 'center', sortable: true },
  { name: 'nuevos', label: 'Nuevo', field: 'nuevos', align: 'center', sortable: true },
  { name: 'fallecido', label: 'Fallecido', field: 'fallecido', align: 'center', sortable: true },
  { name: 'excepcional', label: 'Excepcional', field: 'excepcional', align: 'center', sortable: true },
];

// --- Helpers ---
const formatNumber = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('de-DE').format(Math.round(num));
};

const formatDate = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

// --- Build query params from current filter state ---
const buildQueryParams = (pag) => {
  const params = {};

  if (search.value?.trim()) params.search = search.value.trim();
  if (filterEstados.value?.length) params.estados = filterEstados.value.join(',');
  if (filterMunicipios.value?.length) params.municipios = filterMunicipios.value.join(',');
  if (filterParroquias.value?.length) params.parroquias = filterParroquias.value.join(',');
  if (filterComunidades.value?.length) params.comunidades = filterComunidades.value.join(',');
  if (filterNac.value !== 'Todos') params.nac = filterNac.value;
  if (filterSexo.value !== 'Todos') params.sexo = filterSexo.value;
  if (filterPatria.value !== 'Todos') params.patria = filterPatria.value;
  if (filterValidado.value !== 'Todos') params.validado = filterValidado.value;
  if (filterMayor60.value !== 'Todos') params.mayor60 = filterMayor60.value;
  if (filterRegistro.value !== 'Todos') params.registro = filterRegistro.value;
  if (filterCirculo.value !== 'Todos') params.circulo = filterCirculo.value;
  if (filterNuevos.value !== 'Todos') params.nuevos = filterNuevos.value;
  if (filterFallecido.value !== 'Todos') params.fallecido = filterFallecido.value;
  if (filterExcepcional.value !== 'Todos') params.excepcional = filterExcepcional.value;
  if (pag.sortBy) {
    params.sortBy = pag.sortBy;
    params.descending = String(pag.descending);
  }
  params.page = pag.page;
  params.limit = pag.rowsPerPage;

  return params;
};

// --- Server-side request handler ---
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination;
  const params = buildQueryParams({ page, rowsPerPage, sortBy, descending });

  await dashboardStore.fetchPriorizados(params);

  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  pagination.value.sortBy = sortBy;
  pagination.value.descending = descending;
  pagination.value.rowsNumber = priorizadosTotalRows.value;
};

// --- Triggered when any filter changes ---
const onFiltersChanged = () => {
  // Reset to page 1 on filter change
  pagination.value.page = 1;
  // Trigger a server request
  onRequest({ pagination: pagination.value });
};

// --- Clear all filters ---
const clearAllFilters = async () => {
  search.value = '';
  filterEstados.value = [];
  filterMunicipios.value = [];
  filterParroquias.value = [];
  filterComunidades.value = [];
  filterNac.value = 'Todos';
  filterSexo.value = 'Todos';
  filterPatria.value = 'Todos';
  filterValidado.value = 'Todos';
  filterMayor60.value = 'Todos';
  filterRegistro.value = 'Todos';
  filterCirculo.value = 'Todos';
  filterNuevos.value = 'Todos';
  filterFallecido.value = 'Todos';
  filterExcepcional.value = 'Todos';
  pagination.value.sortBy = null;
  pagination.value.descending = false;
  pagination.value.page = 1;

  // Reset downstream options
  filteredMunicipioOptions.value = [];
  filteredParroquiaOptions.value = [];
  filteredComunidadOptions.value = [];

  // Limpiar caché de opciones de filtro para forzar re-consulta fresca
  dashboardStore.clearPriorizadosFilterCache();

  onRequest({ pagination: pagination.value });
};

// --- Cascade filter helpers ---
const buildCascadeParams = () => {
  const params = {};
  if (filterEstados.value?.length) params.estados = filterEstados.value.join(',');
  if (filterMunicipios.value?.length) params.municipios = filterMunicipios.value.join(',');
  if (filterParroquias.value?.length) params.parroquias = filterParroquias.value.join(',');
  return params;
};

const refreshFilterOptions = async () => {
  await dashboardStore.fetchPriorizadosFilterOptions(buildCascadeParams());
  // Sync the autocomplete refs with the freshly loaded store data
  filteredEstadoOptions.value = priorizadosFilterOptions.value.estados;
  filteredMunicipioOptions.value = priorizadosFilterOptions.value.municipios;
  filteredParroquiaOptions.value = priorizadosFilterOptions.value.parroquias;
  filteredComunidadOptions.value = priorizadosFilterOptions.value.comunidades;
};

// --- Cascade handlers ---
const onEstadosChanged = async () => {
  // Clear downstream selections
  filterMunicipios.value = [];
  filterParroquias.value = [];
  filterComunidades.value = [];
  filteredParroquiaOptions.value = [];
  filteredComunidadOptions.value = [];

  // Fetch municipios for selected estados (or clear if none)
  if (filterEstados.value?.length) {
    await refreshFilterOptions();
  } else {
    filteredMunicipioOptions.value = [];
  }
  onFiltersChanged();
};

const onMunicipiosChanged = async () => {
  // Clear downstream selections
  filterParroquias.value = [];
  filterComunidades.value = [];
  filteredComunidadOptions.value = [];

  // Fetch parroquias for selected municipios (or clear if none)
  if (filterMunicipios.value?.length) {
    await refreshFilterOptions();
  } else {
    filteredParroquiaOptions.value = [];
  }
  onFiltersChanged();
};

const onParroquiasChanged = async () => {
  // Clear downstream selections
  filterComunidades.value = [];

  // Fetch comunidades for selected parroquias (or clear if none)
  if (filterParroquias.value?.length) {
    await refreshFilterOptions();
  } else {
    filteredComunidadOptions.value = [];
  }
  onFiltersChanged();
};

// --- Filter q-select options (autocomplete typing) ---
const filterSelectOptions = (val, update, key) => {
  const sourceMap = {
    estados: priorizadosFilterOptions.value.estados,
    municipios: priorizadosFilterOptions.value.municipios,
    parroquias: priorizadosFilterOptions.value.parroquias,
    comunidades: priorizadosFilterOptions.value.comunidades,
  };
  const refMap = {
    estados: filteredEstadoOptions,
    municipios: filteredMunicipioOptions,
    parroquias: filteredParroquiaOptions,
    comunidades: filteredComunidadOptions,
  };
  const source = sourceMap[key] || [];
  const target = refMap[key];

  update(() => {
    if (!val || val === '') {
      target.value = source;
    } else {
      const needle = val.toUpperCase();
      target.value = source.filter(v => v && v.toUpperCase().includes(needle));
    }
  });
};

// --- Export ---
const exportData = async (scope, format) => {
  isExporting.value = true;
  try {
    let data;

    if (scope === 'page') {
      // Current page data — already loaded in the store
      data = dashboardStore.priorizados;
    } else {
      // Build params for export (filtered or all)
      const params = { export: 'true' };
      if (scope === 'filtered') {
        // Include current filters
        const filterParams = buildQueryParams(pagination.value);
        Object.assign(params, filterParams);
        delete params.page;
        delete params.limit;
      }
      // scope === 'all' → no filters, just export=true

      Notify.create({ type: 'info', message: 'Descargando datos para exportación...', timeout: 2000 });
      const response = await api.get('/dashboard/priorizados', { params });
      data = response.data.rows || [];
    }

    if (!data.length) {
      Notify.create({ type: 'warning', message: 'No hay datos para exportar' });
      return;
    }

    const filename = `priorizados_${scope}_${getTimestamp()}`;

    // Map data to user-friendly column names
    const mappedData = data.map(r => ({
      Estado: r.estado,
      Municipio: r.municipio,
      Parroquia: r.parroquia,
      Comunidad: r.comunidad,
      Nac: r.nac,
      Cédula: r.cedula,
      Nombre: r.nombre,
      Teléfono: r.telefono,
      'Fecha Nac.': r.fecha_nac ? formatDate(r.fecha_nac) : '',
      Sexo: r.sexo,
      Patria: r.patria,
      Validado: r.validado,
      'Mayor 60': r.mayor60,
      Registro: r.registro,
      Círculo: r.circulo,
      Nuevo: r.nuevos,
      Fallecido: r.fallecido,
      Excepcional: r.excepcional,
    }));

    if (format === 'xlsx') {
      const worksheet = utils.json_to_sheet(mappedData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Priorizados');
      writeFile(workbook, `${filename}.xlsx`);
      Notify.create({ type: 'positive', message: 'XLSX exportado exitosamente' });
    } else if (format === 'csv') {
      const headers = Object.keys(mappedData[0]).join(',');
      const rows = mappedData.map(row =>
        Object.values(row).map(v => {
          const s = String(v ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        }).join(',')
      );
      const csv = [headers, ...rows].join('\r\n');
      const status = exportFile(`${filename}.csv`, csv, 'text/csv');
      if (status === true) {
        Notify.create({ type: 'positive', message: 'CSV exportado exitosamente' });
      }
    } else if (format === 'json') {
      const content = JSON.stringify(mappedData, null, 2);
      const status = exportFile(`${filename}.json`, content, 'application/json');
      if (status === true) {
        Notify.create({ type: 'positive', message: 'JSON exportado exitosamente' });
      }
    }
  } catch (error) {
    console.error('Error al exportar priorizados:', error);
    Notify.create({ type: 'negative', message: 'Error al exportar datos' });
  } finally {
    isExporting.value = false;
  }
};

// --- Initialize when tab becomes active (lazy loading) ---
const loaded = ref(false);

const loadInitialData = async () => {
  // Fetch only estados initially (no cascade params = empty municipios/parroquias/comunidades)
  await dashboardStore.fetchPriorizadosFilterOptions();
  filteredEstadoOptions.value = priorizadosFilterOptions.value.estados;

  // Fetch first page of data
  await onRequest({ pagination: pagination.value });
};

watch(() => props.active, (isActive) => {
  if (isActive && !loaded.value) {
    loaded.value = true;
    loadInitialData();
  }
}, { immediate: true });

// --- Expuesto para IndexPage: filtrar por estado desde el mapa ---
const setStateFilter = async (stateName) => {
  filterEstados.value = stateName ? [stateName] : [];
  filterMunicipios.value = [];
  filterParroquias.value = [];
  filterComunidades.value = [];
  filteredMunicipioOptions.value = [];
  filteredParroquiaOptions.value = [];
  filteredComunidadOptions.value = [];
  if (filterEstados.value.length) {
    await refreshFilterOptions();
  }
  onFiltersChanged();
};

const clearStateFilter = () => setStateFilter(null);

defineExpose({ setStateFilter, clearStateFilter });
</script>

<style scoped>
.q-btn-toggle {
  border: 1px solid #bdbdbd;
  border-radius: 4px;
}
</style>
