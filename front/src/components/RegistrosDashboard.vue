<template>
  <div class="registros-dashboard-root column q-gutter-md q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between">
      <div class="row items-center q-gutter-x-sm">
        <q-icon name="push_pin" size="22px" color="red-14" />
        <span class="text-subtitle2 text-weight-bold text-grey-8">
          Tablas y Gráficas Fijadas
        </span>
        <q-badge color="red-2" text-color="red-10" dense class="q-ml-sm">
          {{ pinnedItems.length }}
        </q-badge>
      </div>
      <q-btn
        flat dense no-caps size="sm" color="primary" icon="refresh"
        label="Recargar" :loading="loading" @click="loadPinned" />
    </div>

    <!-- Empty state -->
    <div
      v-if="!loading && !pinnedItems.length"
      class="pinned-empty-card column items-center justify-center bg-white rounded-borders shadow-light q-pa-lg text-center">
      <q-icon name="push_pin_outlined" size="64px" class="text-grey-4 q-mb-sm" />
      <div class="text-body2 text-grey-6">
        No hay tablas ni gráficas fijadas todavía.
      </div>
      <div class="text-caption text-grey-5 q-mt-xs">
        Abre el Generador Dinámico de Consultas, ejecuta una consulta y usa el botón
        <q-icon name="push_pin" size="13px" color="primary" class="q-ml-xs" /> para fijar su
        tabla o gráfica.
      </div>
    </div>

    <!-- Loading -->
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="40px" color="primary" />
      <span class="text-caption text-grey-7 text-weight-bold q-mt-sm">
        Cargando consultas fijadas...
      </span>
    </q-inner-loading>

    <!-- Pinned items -->
    <div v-if="pinnedItems.length" class="pinned-grid column q-gutter-md">
      <div
        v-for="item in pinnedItems" :key="item.query.id"
        class="pinned-card bg-white rounded-borders shadow-light">
        <!-- Card header -->
        <div class="row items-center justify-between q-px-md q-py-sm bg-grey-1 border-bottom-dash">
          <div class="row items-center q-gutter-x-sm">
            <q-icon name="star" size="16px" color="amber-8" />
            <span class="text-weight-bold text-grey-8 text-subtitle2">{{ item.query.name }}</span>
            <q-badge v-if="item.query.visibility === 'public'" color="green-14" label="Público" dense />
            <q-badge v-else color="amber-14" label="Privado" dense />
          </div>
          <div class="row items-center q-gutter-xs">
            <q-badge v-if="item.query.pin_table" color="red-14" icon="grid_on" label="Tabla fijada" dense />
            <q-badge v-if="item.query.pin_chart" color="red-14" icon="bar_chart" label="Gráfica fijada" dense />
            <q-btn-dropdown
              v-if="item.query.pin_table"
              flat dense no-caps size="sm" color="primary" icon="download"
              label="Exportar" class="export-btn">
              <q-list dense>
                <q-item v-close-popup clickable @click="exportTableExcel(item)">
                  <q-item-section avatar><q-icon name="table_chart" color="green-8" size="18px" /></q-item-section>
                  <q-item-section>Excel (.xlsx)</q-item-section>
                </q-item>
                <q-item v-close-popup clickable @click="exportTableCSV(item)">
                  <q-item-section avatar><q-icon name="csv" color="blue-8" size="18px" /></q-item-section>
                  <q-item-section>CSV</q-item-section>
                </q-item>
                <q-item v-close-popup clickable @click="exportTableJSON(item)">
                  <q-item-section avatar><q-icon name="data_object" color="grey-8" size="18px" /></q-item-section>
                  <q-item-section>JSON</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
            <q-btn
              v-if="item.query.pin_chart" flat round dense size="sm" color="primary"
              icon="image" :loading="item.exporting" @click="exportChartPNG(item)">
              <q-tooltip>Exportar gráfica a PNG</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- Body: pinned table and/or chart -->
        <div class="pinned-body">
          <template v-if="item.query.pin_table && item.query.pin_chart">
            <div class="row no-wrap">
              <div class="col pinned-table-col">
                <div class="pinned-subtitle text-caption text-grey-6 row items-center q-gutter-xs">
                  <q-icon name="grid_on" size="13px" /> Tabla
                </div>
                <PivotTable :store="item.store" class="pinned-table-height" />
              </div>
              <div class="col pinned-chart-col">
                <div class="pinned-subtitle text-caption text-grey-6 row items-center q-gutter-xs">
                  <q-icon name="bar_chart" size="13px" /> Gráfica
                </div>
                <PivotChart :ref="(el) => setChartRef(item, el)" :store="item.store" class="pinned-chart-height" />
              </div>
            </div>
          </template>
          <template v-else-if="item.query.pin_table">
            <div class="pinned-subtitle text-caption text-grey-6 row items-center q-gutter-xs q-px-md q-pt-sm">
              <q-icon name="grid_on" size="13px" /> Tabla
            </div>
            <PivotTable :store="item.store" class="pinned-table-only-height" />
          </template>
          <template v-else-if="item.query.pin_chart">
            <div class="pinned-subtitle text-caption text-grey-6 row items-center q-gutter-xs q-px-md q-pt-sm">
              <q-icon name="bar_chart" size="13px" /> Gráfica
            </div>
            <PivotChart :ref="(el) => setChartRef(item, el)" :store="item.store" class="pinned-chart-only-height" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from 'boot/axios';
import { createDynamicQueryStore } from 'stores/dynamic-query-store';
import PivotTable from './dashboard/PivotTable.vue';
import PivotChart from './dashboard/PivotChart.vue';
import {
  exportTableCSV as exportTableCSVShared,
  exportTableJSON as exportTableJSONShared,
  exportTableExcel as exportTableExcelShared,
} from './dashboard/pivotExports';

const loading = ref(false);
const pinnedItems = ref([]);
const chartRefs = new Map();
let storeInstances = [];

// Referencias a los PivotChart montados por item (para export PNG independiente)
function setChartRef(item, el) {
  if (el) chartRefs.set(item.query.id, el);
  else chartRefs.delete(item.query.id);
}

async function exportChartPNG(item) {
  const ref = chartRefs.get(item.query.id);
  if (!ref || typeof ref.exportPNG !== 'function') return;
  item.exporting = true;
  try {
    ref.exportPNG();
  } finally {
    item.exporting = false;
  }
}

function exportTableCSV(item) {
  exportTableCSVShared(item.store);
}

function exportTableJSON(item) {
  exportTableJSONShared(item.store);
}

async function exportTableExcel(item) {
  await exportTableExcelShared(item.store);
}

// Carga la lista de consultas guardadas accesibles y arma un store aislado por
// cada una que tenga fijada su tabla y/o gráfica. Cada store carga su config y
// ejecuta la consulta (fetchData) de forma independiente.
async function loadPinned() {
  loading.value = true;
  try {
    const res = await api.get('/dashboard/saved-queries');
    const queries = (res.data || []).filter(q => q.pin_table || q.pin_chart);

    // Destruye stores previos (estado ya no necesario)
    storeInstances.forEach(s => s.$dispose && s.$dispose());
    storeInstances = [];

    pinnedItems.value = queries.map(query => {
      const store = createDynamicQueryStore(`pinned_${query.id}`)();
      storeInstances.push(store);
      store.loadSavedQuery(query);
      return { query, store, exporting: false };
    });
  } catch (err) {
    console.error('Error cargando consultas fijadas:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(loadPinned);
onUnmounted(() => {
  storeInstances.forEach(s => s.$dispose && s.$dispose());
  storeInstances = [];
});
</script>

<style scoped>
.registros-dashboard-root {
  min-height: 200px;
}

.shadow-light {
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);
  border: 1px solid #e2e8f0;
}

.pinned-empty-card {
  border-radius: 12px;
}

.border-bottom-dash {
  border-bottom: 1px solid #e2e8f0;
}

.pinned-card {
  border-radius: 12px;
  overflow: hidden;
}

.pinned-subtitle {
  font-weight: 600;
  padding: 6px 10px;
  background: #fafafa;
  border-bottom: 1px solid #eef2f7;
}

/* Table/Chart heights depending on layout.
   El selector de filas del PivotTable (10/20/50/100/Todas) controla la altura
   visible via max-height del .pivot-scroll. Para que funcione en las tarjetas
   fijadas el wrapper no debe forzar 100% ni el scroll estirarse con flex:1. */
.pinned-table-height,
.pinned-table-only-height {
  min-height: 420px;
}
.pinned-table-height :deep(.pivot-table-wrapper),
.pinned-table-only-height :deep(.pivot-table-wrapper) {
  height: auto !important;
}
.pinned-table-height :deep(.pivot-scroll),
.pinned-table-only-height :deep(.pivot-scroll) {
  flex: none !important;
}
.pinned-chart-height {
  min-height: 420px;
  border-left: 1px solid #eef2f7;
}
.pinned-chart-only-height {
  min-height: 420px;
}
.pinned-table-col,
.pinned-chart-col {
  min-width: 0;
}
.pinned-chart-height :deep(.pivot-chart-wrapper),
.pinned-chart-only-height :deep(.pivot-chart-wrapper) {
  height: 100% !important;
}
</style>
