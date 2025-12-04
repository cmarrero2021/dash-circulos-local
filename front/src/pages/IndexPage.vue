<template>
  <q-page class="q-pa-md bg-grey-2">
    <!-- Header banner image -->
    <q-img src="/images/cintillo.png" alt="Cintillo" class="full-width" style="width: 100%; max-height: 300px;" />
    <div class="row q-col-gutter-md" style="margin-top: 16px;">
      <div class="col-12">
        <!-- <div v-if="showStateIndicators" class="col-12"> -->
        <q-card flat bordered class="state-indicators-card">
          <q-card-section class="row items-center justify-between q-col-gutter-sm">
            <!-- Logo and Title Container -->
            <div class="col-12 col-md-8 row items-center q-gutter-x-md">
              <!-- <q-img 
              src="/images/logo_nobg.png" 
              alt="Logo" 
              style="max-width: 150px; height: auto;" 
              fit="contain"
            /> -->
              <div class="text-h5 text-weight-bold text-primary">DASHBOARD CERTIFICACIONES MINAAMP - {{ currentDate }}
              </div>
            </div>

            <!-- Export Options -->
            <div class="col-12 col-md-auto">
              <q-btn-dropdown color="primary" label="Exportar Página" icon="file_download" flat dense class="q-mr-sm">
                <q-list>
                  <q-item v-close-popup clickable @click="exportPage('png')">
                    <q-item-section avatar><q-icon name="image" /></q-item-section>
                    <q-item-section>PNG</q-item-section>
                  </q-item>
                  <q-item v-close-popup clickable @click="exportPage('pdf')">
                    <q-item-section avatar><q-icon name="picture_as_pdf" /></q-item-section>
                    <q-item-section>PDF</q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Indicadores Principales -->
      <template v-if="!manualStateFilter">
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
      </template>

      <!-- Mapa de Venezuela -->
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6 text-weight-bold text-primary q-mb-md">Mapa de Cumplimiento por Estado</div>
            <mapa-venezuela />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12">
        <!-- <div v-if="showStateIndicators" class="col-12"> -->
        <q-card flat bordered class="state-indicators-card">
          <!-- <q-card-section class="row items-center justify-between q-col-gutter-sm">
            <div class="text-h6">DASHBOARD CERTIFICACIONES MINAAMP</div>
          </q-card-section> -->
          <!-- <q-separator /> -->
          <q-card-section>
            <q-inner-loading :showing="isStateIndicatorsLoading">
              <q-spinner-dots size="40px" color="primary" />
            </q-inner-loading>
            <DataVisualizer v-show="!isStateIndicatorsLoading" title="Indicadores por Estado" type="table"
              :data="filteredStateIndicators" row-key="estado_id" :column-map="stateIndicatorColumnMap"
              :height="stateIndicatorsHeight" class="state-indicators-table"
              @update:height="val => stateIndicatorsHeight = val" />
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
          <DataVisualizer v-show="!dashboardStore.isLoading" title="CERTIFICACIONES DIARIAS"
            :data="dashboardStore.dailyCertifications" type="line" row-key="fecha"
            :column-map="{ label: 'fecha', value: 'certificaciones' }" :height="dailyCertificationsHeight" />
        </q-card>
      </div>

      <!-- Par inicial: Certificaciones Diarias (Tabla) -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer v-show="!dashboardStore.isLoading" title="Certificaciones Diarias"
            :data="dashboardStore.dailyCertifications" type="table" row-key="fecha"
            :column-map="{ label: 'fecha', labelHeader: 'Fecha', value: 'certificaciones' }"
            :pagination="{ rowsPerPage: 13 }" />
        </q-card>
      </div>


      <!-- Gráfica de Anillo: Círculos (cuando hay filtro de estado) -->
      <div v-if="showDonutCharts" class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer v-show="!dashboardStore.isLoading" title="CÍRCULOS - Certificados vs Faltante" :data="[
            { label: 'Certificados', value: circlesDonutData[0] },
            { label: 'Faltante', value: circlesDonutData[1] }
          ]" type="donut" row-key="label" :column-map="{ label: 'label', value: 'value' }" />
        </q-card>
      </div>

      <div v-if="!showDonutCharts" class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <!-- El spinner ahora se muestra SOBRE el contenido -->
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <!-- v-show mantiene el componente en el DOM pero oculto -->
          <DataVisualizer v-show="!dashboardStore.isLoading" title="CÍRCULOS CUMPLIMIENTO vs META"
            :data="dashboardStore.circlesByState" type="bar" row-key="estado" :column-map="{
              label: 'estado',
              value: [
                { name: 'Círculos Certificados', key: 'circulos_certificados' },
                { name: 'Meta de Círculos', key: 'meta_circulos' }
              ]
            }" stacked />
        </q-card>
      </div>



      <!-- Gráfica de Anillo: Participantes (cuando hay filtro de estado) -->
      <div v-if="showDonutCharts" class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer v-show="!dashboardStore.isLoading" title="PARTICIPANTES - Certificados vs Faltante" :data="[
            { label: 'Certificados', value: participantsDonutData[0] },
            { label: 'Faltante', value: participantsDonutData[1] }
          ]" type="donut" row-key="label" :column-map="{ label: 'label', value: 'value' }" />
        </q-card>
      </div>

      <!-- Nuevo par: Participantes por Estado (Gráfico) -->
      <div v-if="!showDonutCharts" class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer v-show="!dashboardStore.isLoading" title="PARTICIPANTES CUMPLIMIENTO vs META"
            :data="dashboardStore.circlesByState" type="bar" row-key="estado" :column-map="{
              label: 'estado',
              value: [
                { name: 'Participantes Certificados', key: 'participantes_certificados' },
                { name: 'Meta de Participantes', key: 'meta_participantes' }
              ]
            }" stacked />
        </q-card>
      </div>

      <!-- Nuevo par: Participantes por Estado (Tabla) -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer v-show="!dashboardStore.isLoading" title="Participantes por Estado"
            :data="dashboardStore.circlesByState" type="table" row-key="estado" :column-map="{
              label: 'estado',
              labelHeader: 'Estado',
              value: [
                { name: 'Participantes Certificados', key: 'participantes_certificados' },
                { name: 'Meta de Participantes', key: 'meta_participantes' }
              ]
            }" />
        </q-card>
      </div>





      <!-- Indicador: Círculos por Estado (Tabla) -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer v-show="!dashboardStore.isLoading" title="Círculos por Estado"
            :data="dashboardStore.circlesByState" type="table" row-key="estado" :column-map="{
              label: 'estado',
              labelHeader: 'Estado',
              value: [
                { name: 'Círculos Certificados', key: 'circulos_certificados' },
                { name: 'Meta de Círculos', key: 'meta_circulos' }
              ]
            }" />
        </q-card>
      </div>
      <!-- Tabla: Círculos por Estado / Municipio -->
      <div class="col-12">
        <q-card flat bordered style="min-height: 250px;">
          <q-card-section class="row items-center q-col-gutter-md">
            <div class="col">
              <div class="text-h6">CÍRCULOS POR ESTADO Y MUNICIPIO</div>
              <div class="text-subtitle2">Fecha: {{ currentDate }}</div>
            </div>
            <div class="col-12 col-md-3">
              <q-select v-model="estadoFilter" clearable outlined dense label="Estado" :options="estadoOptions" />
            </div>
            <div class="col-12 col-md-4">
              <q-select v-model="municipioFilter" v-model:input-value="municipioInput" multiple clearable outlined dense
                use-input input-debounce="300" label="Municipio (autocompletar)" :options="municipioOptions"
                :disable="!estadoFilter" map-options emit-value />
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

            <q-table v-model:pagination="municipioPagination" :rows="municipioTableRows"
              :columns="municipioTableColumns" :row-key="row => `${row.estado}__${row.municipio}`" flat dense />
          </q-card-section>
        </q-card>
      </div>

      <!-- Tabla: Círculos por Estado / Municipio / Parroquia -->
      <div class="col-12">
        <ParroquiaDataVisualizer title="CÍRCULOS POR ESTADO, MUNICIPIO Y PARROQUIA" />
      </div>

      <!-- Tabla: Círculos por Estado / Municipio / Parroquia / Comuna -->
      <div class="col-12">
        <ComunaParroquiaDataVisualizer title="CÍRCULOS POR ESTADO, MUNICIPIO, PARROQUIA Y COMUNA" />
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
import ParroquiaDataVisualizer from 'components/ParroquiaDataVisualizer.vue';
import ComunaParroquiaDataVisualizer from 'components/ComunaParroquiaDataVisualizer.vue';
import MapaVenezuela from 'components/MapaVenezuela.vue';
import { utils, writeFile } from 'xlsx';
import { exportFile, Notify } from 'quasar';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
// New ref for current date
const currentDate = ref(new Date().toLocaleDateString('es-ES'));

const dashboardStore = useDashboardStore();
const authStore = useAuthStore();
const { indicators: rawIndicators, circlesByState, circlesByMunicipio, stateIndicators, manualStateFilter } = storeToRefs(dashboardStore);
const { isStateIndicatorsLoading } = storeToRefs(dashboardStore);

const dailyCertificationsHeight = ref(425);
// const circlesByStateHeight = ref(425);
// const participantsByStateHeight = ref(425);
const stateIndicatorsHeight = ref(425);

// Filters for municipios table
const estadoFilter = ref(null);
const municipioInput = ref(''); // for autocomplete typing
const municipioFilter = ref([]); // selected municipio(s)

const allowedStateIds = computed(() => authStore.allowedStates);
const isAdmin = computed(() => authStore.user?.role === 'Administrador');
const showStateIndicators = computed(() => true); // Always show - backend filters by user permissions

// Determine whether to show donut charts or stacked bar charts
const showDonutCharts = computed(() => {
  if (manualStateFilter.value) return true;
  if (!isAdmin.value && allowedStateIds.value?.length === 1) return true;
  return false;
});

// Prepare data for circles donut chart
const circlesDonutData = computed(() => {
  const data = circlesByState.value[0] || {};
  const certificados = Number(data.circulos_certificados || 0);
  const meta = Number(data.meta_circulos || 0);
  const faltante = Math.max(0, meta - certificados);
  return [certificados, faltante];
});

// Prepare data for participants donut chart
const participantsDonutData = computed(() => {
  const data = circlesByState.value[0] || {};
  const certificados = Number(data.participantes_certificados || 0);
  const meta = Number(data.meta_participantes || 0);
  const faltante = Math.max(0, meta - certificados);
  return [certificados, faltante];
});

// Filter state indicators based on map selection
const filteredStateIndicators = computed(() => {
  if (!manualStateFilter.value) {
    return stateIndicators.value;
  }
  return stateIndicators.value.filter(row => Number(row.estado_id) === Number(manualStateFilter.value));
});

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

const stateIndicatorColumnMap = computed(() => ({
  label: 'estado_nombre',
  labelHeader: 'Estado',
  value: [
    { name: 'Meta', key: 'meta' },
    { name: 'Acumulado', key: 'acumulado' },
    { name: 'Diferencia', key: 'diferencia' },
    { name: 'Promedio Necesario', key: 'promedio_necesario' },
    { name: 'Promedio Diario', key: 'promedio_diario' },

    { name: 'Participantes', key: 'participantes' },
    { name: 'Promedio Integrantes/Círculo', key: 'promedio' },

    // { name: 'Máximo por Fecha', key: 'maximo_por_fecha' },
    // { name: 'Fecha Máxima', key: 'fecha_maxima' },
  ],
}));

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

const exportPage = async (format) => {
  try {
    Notify.create({
      type: 'info',
      message: 'Generando exportación...',
      timeout: 2000
    });

    // Capture the entire page
    const canvas = await html2canvas(document.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#f5f5f5'
    });

    const filename = `dashboard_${getTimestamp()}`;

    if (format === 'png') {
      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.png`;
        link.click();
        URL.revokeObjectURL(url);
        Notify.create({
          type: 'positive',
          message: 'PNG exportado exitosamente'
        });
      });
    } else if (format === 'pdf') {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${filename}.pdf`);
      Notify.create({
        type: 'positive',
        message: 'PDF exportado exitosamente'
      });
    }
  } catch (error) {
    console.error('Error al exportar:', error);
    Notify.create({
      type: 'negative',
      message: 'Error al exportar la página'
    });
  }
};

const indicators = computed(() => {
  const data = rawIndicators.value || {};
  // const formattedFechaMaxima = data.fecha_maxima
  //   ? new Date(data.fecha_maxima).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  //   : 'N/A';

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
    // { label: 'Días Faltantes', value: 18, icon: 'calendar_today', color: 'orange-8' },
    { label: 'Días Faltantes', value: data.dias_faltantes || 0, icon: 'calendar_today', color: 'orange-8' },
    // { label: 'Promedio Necesario', value: formatNumber(data.promedio_necesario), icon: 'speed', color: 'purple-8' },
    { label: 'Promedio Diario', value: formatNumber(data.promedio_diario), icon: 'bar_chart', color: 'teal-7' },
    { label: 'Total de Participantes', value: formatNumber(data.participantes), icon: 'groups', color: 'orange' },
    { label: 'Promedio Integrantes/Círculo', value: formatNumber(data.promedio), icon: 'people_alt', color: 'teal' }
    // { label: 'Máximo por Fecha', value: formatNumber(data.maximo_por_fecha), icon: 'military_tech', color: 'indigo-7' },
    // { label: 'Fecha Máxima', value: formattedFechaMaxima, icon: 'event', color: 'brown-6' }
  ];
});

onMounted(() => {
  dashboardStore.fetchCirclesByState();
  dashboardStore.fetchIndicators();
  dashboardStore.fetchDailyCertifications();
  dashboardStore.fetchCirclesByMunicipios();
  if (showStateIndicators.value) {
    dashboardStore.fetchStateIndicators();
  }
});

watch(showStateIndicators, (val) => {
  if (val) {
    dashboardStore.fetchStateIndicators();
  }
});

// (debug logs removed)
// (debug logs removed)
</script>

<style scoped>
.state-indicators-card {
  background: #ffffff;
}

.state-indicators-table :deep(tbody tr) {
  transition: background-color 0.4s ease, box-shadow 0.4s ease;
}

.state-indicators-table :deep(tbody tr.row-highlight) {
  background-color: rgba(76, 175, 80, 0.18);
  box-shadow: inset 0 0 0 2px rgba(76, 175, 80, 0.4);
}
</style>
