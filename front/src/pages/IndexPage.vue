<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row q-col-gutter-md">
      <!-- Indicadores Principales -->
        <div v-for="indicator in indicators" :key="indicator.label" class="col-12 col-md-3">
          <q-card flat bordered>
            <q-card-section>
              <div class="row items-center no-wrap">
                <div class="col">
                  <div class="text-subtitle2 text-grey-8">{{ indicator.label }}</div>
                  <div class="text-h5 text-weight-bold">
                    {{ indicator.value }}
                    <q-icon :name="indicator.icon" :color="indicator.color" size="sm" />
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

      <!-- Filtros de la Página -->
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="row q-gutter-md items-center">
            <div class="text-h6">Filtros</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Indicador: Círculos por Estado (Gráfico) -->
      <!-- Par inicial: Certificaciones Diarias (Gráfico) -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer
            v-show="!dashboardStore.isLoading"
            title="CERTIFICACIONES DIARIAS"
            :data="dashboardStore.dailyCertifications"
            type="line"
            row-key="fecha"
            :column-map="{ label: 'fecha', value: 'certificaciones' }"
            :height="dailyCertificationsHeight"
          />
        </q-card>
      </div>

      <!-- Par inicial: Certificaciones Diarias (Tabla) -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer
            v-show="!dashboardStore.isLoading"
            title="Certificaciones Diarias"
            :data="dashboardStore.dailyCertifications"
            type="table"
            row-key="fecha"
            :column-map="{ label: 'fecha', labelHeader: 'Fecha', value: 'certificaciones' }"
            @update:height="newHeight => dailyCertificationsHeight = newHeight"
          />
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <!-- El spinner ahora se muestra SOBRE el contenido -->
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <!-- v-show mantiene el componente en el DOM pero oculto -->
          <DataVisualizer
            v-show="!dashboardStore.isLoading"
            title="CÍRCULOS CUMPLIMIENTO vs META"
            :data="dashboardStore.circlesByState"
            type="bar"
            row-key="estado"
            :column-map="{
              label: 'estado',
              value: [
                { name: 'Círculos Certificados', key: 'circulos_certificados' },
                { name: 'Meta de Círculos', key: 'meta_circulos' }
              ]
            }"
            stacked
            :height="circlesByStateHeight"
          />
        </q-card>
      </div>

      <!-- Indicador: Círculos por Estado (Tabla) -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
           <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer
            v-show="!dashboardStore.isLoading"
            title="Círculos por Estado"
            :data="dashboardStore.circlesByState"
            type="table"
            row-key="estado"
            :column-map="{
              label: 'estado',
              labelHeader: 'Estado',
              value: [
                { name: 'Círculos Certificados', key: 'circulos_certificados' },
                { name: 'Meta de Círculos', key: 'meta_circulos' }
              ]
            }"
            @update:height="newHeight => circlesByStateHeight = newHeight"
          />
        </q-card>
      </div>

      <!-- Nuevo par: Participantes por Estado (Gráfico) -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer
            v-show="!dashboardStore.isLoading"
            title="PARTICIPANTES CUMPLIMIENTO vs META"
            :data="dashboardStore.circlesByState"
            type="bar"
            row-key="estado"
            :column-map="{
              label: 'estado',
              value: [
                { name: 'Participantes Certificados', key: 'participantes_certificados' },
                { name: 'Meta de Participantes', key: 'meta_participantes' }
              ]
            }"
            stacked
            :height="participantsByStateHeight"
          />
        </q-card>
      </div>

      <!-- Nuevo par: Participantes por Estado (Tabla) -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer
            v-show="!dashboardStore.isLoading"
            title="Participantes por Estado"
            :data="dashboardStore.circlesByState"
            type="table"
            row-key="estado"
            :column-map="{
              label: 'estado',
              labelHeader: 'Estado',
              value: [
                { name: 'Participantes Certificados', key: 'participantes_certificados' },
                { name: 'Meta de Participantes', key: 'meta_participantes' }
              ]
            }"
            @update:height="newHeight => participantsByStateHeight = newHeight"
          />
        </q-card>
      </div>

      <!-- Tabla: Círculos por Estado / Municipio -->
      <div class="col-12">
        <q-card flat bordered style="min-height: 250px;">
          <q-card-section class="row items-center q-col-gutter-md">
            <div class="col">
              <div class="text-h6">CÍRCULOS POR ESTADO Y MUNICIPIO</div>
            </div>
            <div class="col-12 col-md-3">
              <q-select
                v-model="estadoFilter"
                clearable
                outlined
                dense
                label="Estado"
                :options="estadoOptions"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-select
                v-model="municipioFilter"
                v-model:input-value="municipioInput"
                multiple
                clearable
                outlined
                dense
                use-input
                input-debounce="300"
                label="Municipio (autocompletar)"
                :options="municipioOptions"
                :disable="!estadoFilter"
                map-options
                emit-value
              />
            </div>
            <div class="col-auto">
              <q-btn color="grey-7" round flat icon="more_vert">
                <q-menu cover auto-close>
                  <q-list style="min-width: 150px">
                    <q-item clickable @click="exportMunicipios('xlsx')">
                      <q-item-section avatar><q-icon name="description" /></q-item-section>
                      <q-item-section>Exportar a XLSX</q-item-section>
                    </q-item>
                    <q-item clickable @click="exportMunicipios('csv')">
                      <q-item-section avatar><q-icon name="toc" /></q-item-section>
                      <q-item-section>Exportar a CSV</q-item-section>
                    </q-item>
                    <q-item clickable @click="exportMunicipios('json')">
                      <q-item-section avatar><q-icon name="code" /></q-item-section>
                      <q-item-section>Exportar a JSON</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <q-inner-loading :showing="dashboardStore.isLoading">
              <q-spinner-dots size="30px" color="primary" />
            </q-inner-loading>

            <q-table
              v-model:pagination="municipioPagination"
              :rows="municipioTableRows"
              :columns="municipioTableColumns"
              :row-key="row => `${row.estado}__${row.municipio}`"
              flat
              dense
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Tabla: Círculos por Estado / Municipio / Comuna -->
      <div class="col-12">
        <ComunaDataVisualizer title="CÍRCULOS POR ESTADO, MUNICIPIO Y COMUNA" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, computed, ref, watch } from 'vue';
import { useDashboardStore } from 'stores/dashboard-store';
import { useAuthStore } from 'stores/auth-store';
import { storeToRefs } from 'pinia';
import DataVisualizer from 'components/DataVisualizer.vue';
import ComunaDataVisualizer from 'components/ComunaDataVisualizer.vue';
import { utils, writeFile } from 'xlsx';
import { exportFile } from 'quasar';

const dashboardStore = useDashboardStore();
const authStore = useAuthStore();
const { indicators: rawIndicators, circlesByState, circlesByMunicipio } = storeToRefs(dashboardStore);

const dailyCertificationsHeight = ref(425);
const circlesByStateHeight = ref(425);
const participantsByStateHeight = ref(425);

// Filters for municipios table
const estadoFilter = ref(null);
const municipioInput = ref(''); // for autocomplete typing
const municipioFilter = ref([]); // selected municipio(s)

const allowedStateIds = computed(() => authStore.allowedStates);
const isAdmin = computed(() => authStore.user?.role === 'Administrador');

// Compute unique estado options from circlesByState
const estadoOptions = computed(() => {
  const optionsSet = new Set();
  const canSeeAll = isAdmin.value;
  const allowedIds = allowedStateIds.value || [];

  ((circlesByState && circlesByState.value) || []).forEach(r => {
    if (!r || !r.estado) return;
    if (canSeeAll) {
      optionsSet.add(r.estado);
      return;
    }

    if (!Array.isArray(allowedIds) || allowedIds.length === 0) {
      // Sin permisos explícitos no mostramos estados
      return;
    }

    const stateId = r.estado_id ?? r.estadoId ?? null;
    if (stateId && allowedIds.includes(stateId)) {
      optionsSet.add(r.estado);
    }
  });

  return Array.from(optionsSet).sort();
});

watch([estadoOptions, isAdmin, allowedStateIds], ([options]) => {
  if (!estadoFilter.value) return;
  if (isAdmin.value) return;
  if (!options.includes(estadoFilter.value)) {
    estadoFilter.value = null;
    municipioInput.value = '';
    municipioFilter.value = [];
  }
});

// When estadoFilter changes, fetch municipios for that estado
watch(estadoFilter, (val) => {
  if (val) {
    dashboardStore.fetchCirclesByMunicipios({ estado: val });
  } else {
    // fetch all
    dashboardStore.fetchCirclesByMunicipios();
  }
});
// Ensure municipio filters are cleared when estado is cleared
watch(estadoFilter, (val) => {
  if (!val) {
    municipioInput.value = '';
    municipioFilter.value = [];
  }
});

// Municipio options for the select (from fetched municipios); allow autocomplete via use-input in template
const municipioOptions = computed(() => {
  // Only provide municipio options when an estado is selected
  if (!estadoFilter.value) return [];
  const stateKey = String(estadoFilter.value).toUpperCase();
  const set = new Set();
  ((circlesByMunicipio && circlesByMunicipio.value) || [])
    .filter(r => r && r.estado && String(r.estado).toUpperCase() === stateKey)
    .forEach(r => { if (r && r.municipio) set.add(r.municipio); });
  return Array.from(set).sort();
});

// Table rows filtered by estado and municipio selection/input
const municipioTableRows = computed(() => {
  let rows = ((circlesByMunicipio && circlesByMunicipio.value) || []).slice();
  // If estado selected, only keep rows for that estado
  if (estadoFilter.value) {
    const stateKey = String(estadoFilter.value).toUpperCase();
    rows = rows.filter(r => r && r.estado && String(r.estado).toUpperCase() === stateKey);
  }
  if (Array.isArray(municipioFilter.value) && municipioFilter.value.length > 0) {
    const sel = municipioFilter.value.map(v => String(v).toUpperCase());
    rows = rows.filter(r => sel.includes((r.municipio || '').toUpperCase()));
  } else if (municipioInput.value && municipioInput.value.length > 0) {
    const q = String(municipioInput.value).toUpperCase();
    rows = rows.filter(r => (r.municipio || '').toUpperCase().includes(q));
  }
  return rows;
});

const municipioTableColumns = computed(() => ([
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
  { name: 'municipio', label: 'Municipio', field: 'municipio', align: 'left' },
  { name: 'avance', label: 'Avance', field: 'avance', align: 'right', format: v => formatNumber(v) },
]));

// Pagination for municipio table (default 15 rows)
const municipioPagination = ref({ rowsPerPage: 15 });

// Export helpers (xlsx/csv/json) — similar to DataVisualizer
const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const formatNumber = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('de-DE').format(Math.round(num));
};

const exportMunicipios = (format) => {
  const filename = `circulos_municipios_${getTimestamp()}`;
  const data = municipioTableRows.value.map(r => ({ Estado: r.estado, Municipio: r.municipio, Avance: r.avance }));
  if (format === 'xlsx') {
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Datos');
    writeFile(workbook, `${filename}.xlsx`);
  } else if (format === 'csv') {
    const csv = [Object.keys(data[0] || {}).join(',')]
      .concat((data || []).map(row => Object.values(row).join(','))).join('\r\n');
    const status = exportFile(`${filename}.csv`, csv, 'text/csv');
    if (status !== true) console.error('Error al exportar CSV');
  } else if (format === 'json') {
    const content = JSON.stringify(data, null, 2);
    const status = exportFile(`${filename}.json`, content, 'application/json');
    if (status !== true) console.error('Error al exportar JSON');
  }
};

const indicators = computed(() => {
  const data = rawIndicators.value || {};
  const formattedFechaMaxima = data.fecha_maxima
    ? new Date(data.fecha_maxima).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'N/A';

  // Robust helper to format numbers with '.' as thousands separator (Spanish style)
  // Accepts numbers or strings that may already contain thousand/decimal separators
  const formatNumber = (val) => {
    if (val === null || val === undefined || val === '') return '0';

    let num;

    if (typeof val === 'number') {
      num = val;
    } else if (typeof val === 'string') {
      // Normalize string: trim, remove spaces and underscores
      let s = val.trim().replace(/\s+/g, '').replace(/_/g, '');

      // If contains both '.' and ',' decide which is decimal
      if (s.includes('.') && s.includes(',')) {
        // If '.' appears before ',' assume '.' thousands and ',' decimal: remove dots and replace comma with dot
        if (s.indexOf('.') < s.indexOf(',')) {
          s = s.replace(/\./g, '').replace(',', '.');
        } else {
          // otherwise assume ',' thousands, '.' decimal -> remove commas
          s = s.replace(/,/g, '');
        }
      } else if (s.includes('.')) {
        // Only dots: if more than one dot or dot followed by 3 digits, treat as thousands separators
        const dotCount = (s.match(/\./g) || []).length;
        if (dotCount > 1) {
          s = s.replace(/\./g, '');
        } else {
          const parts = s.split('.');
          if (parts[1] && parts[1].length === 3) {
            s = s.replace(/\./g, '');
          }
          // else single dot as decimal -> keep it
        }
      } else if (s.includes(',')) {
        // Only commas: if more than one comma or comma followed by 3 digits, treat as thousands separators
        const commaCount = (s.match(/,/g) || []).length;
        if (commaCount > 1) {
          s = s.replace(/,/g, '');
        } else {
          const parts = s.split(',');
          if (parts[1] && parts[1].length === 3) {
            s = s.replace(/,/g, '');
          } else {
            // single comma as decimal separator -> convert to dot
            s = s.replace(',', '.');
          }
        }
      }

      num = Number(s);
    } else {
      // Fallback: try coercion
      num = Number(val);
    }

    if (Number.isNaN(num)) return String(val);

    // Deterministic formatting: ensure '.' as thousands separator and ',' for decimals
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);
    const [intPart, decPart] = String(abs).split('.');
    const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return sign + intWithDots + (decPart ? ',' + decPart : '');
  };


  return [
    { label: 'Meta', value: formatNumber(data.meta), icon: 'flag', color: 'blue-grey-8' },
    { label: 'Acumulado', value: formatNumber(data.acumulado), icon: 'leaderboard', color: 'green-7' },
    { label: 'Diferencia', value: formatNumber(data.diferencia), icon: 'trending_down', color: 'red-7' },
    { label: 'Días Faltantes', value: data.dias_faltantes || 0, icon: 'calendar_today', color: 'orange-8' },
    { label: 'Promedio Necesario', value: formatNumber(data.promedio_necesario), icon: 'speed', color: 'purple-8' },
    { label: 'Promedio Diario', value: formatNumber(data.promedio_diario), icon: 'bar_chart', color: 'teal-7' },
    { label: 'Máximo por Fecha', value: formatNumber(data.maximo_por_fecha), icon: 'military_tech', color: 'indigo-7' },
    { label: 'Fecha Máxima', value: formattedFechaMaxima, icon: 'event', color: 'brown-6' }
  ];
});

onMounted(() => {
  dashboardStore.fetchCirclesByState();
  dashboardStore.fetchIndicators();
  dashboardStore.fetchDailyCertifications();
  dashboardStore.fetchCirclesByMunicipios();
});

// (debug logs removed)
</script>
