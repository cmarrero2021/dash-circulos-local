<template>
  <div class="pop-pyramid-root">

    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <div class="ppy-header row items-center justify-between q-px-md q-py-sm bg-grey-1 border-bottom-dash">
      <div class="row items-center q-gutter-x-sm">
        <q-icon name="people" size="20px" color="deep-purple-7" />
        <span class="text-subtitle2 text-weight-bold text-grey-8">Pirámide Poblacional (60+)</span>
        <q-badge color="deep-purple-1" text-color="deep-purple-9" dense class="q-ml-xs">
          Registros
        </q-badge>
        <q-badge v-if="rows.length" color="grey-3" text-color="grey-8" dense class="q-ml-xs gt-xs">
          {{ rows.length }} rangos · {{ fmtVal(grandTotal.total) }} personas
        </q-badge>
      </div>
      <q-btn
        flat round dense size="sm" icon="refresh"
        color="grey-7" :loading="loading"
        @click="fetchData"
      >
        <q-tooltip>Recargar datos</q-tooltip>
      </q-btn>
    </div>

    <!-- ── Controls bar ─────────────────────────────────────────────────────── -->
    <div v-if="rows.length || loading" class="ppy-controls-bar">

      <!-- Left controls -->
      <div class="row items-center q-gutter-sm flex-wrap">

        <!-- Age step toggle -->
        <div class="row items-center q-gutter-xs no-wrap">
          <q-icon name="linear_scale" size="13px" class="text-grey-6" />
          <span class="text-caption text-grey-6 gt-xs">Intervalo:</span>
          <q-btn-toggle
            v-model="ageStep"
            dense flat
            toggle-color="deep-purple-7"
            class="ppy-mode-toggle"
            :options="[
              { label: '5 años',  value: 5  },
              { label: '10 años', value: 10 },
            ]"
          />
        </div>

        <!-- Display mode -->
        <q-btn-toggle
          v-model="displayMode"
          dense flat
          toggle-color="primary"
          class="ppy-mode-toggle"
          :options="[
            { label: 'Valores', value: 'values' },
            { label: '%',       value: 'pct'    },
            { label: 'Ambos',   value: 'both'   },
          ]"
        />

        <!-- Color pickers (♂ y ♀) -->
        <div class="row items-center q-gutter-xs no-wrap">
          <span class="text-caption text-grey-6">Color:</span>

          <!-- Masculino color swatch -->
          <q-btn
            flat dense round size="xs"
            class="ppy-color-swatch"
            :style="{ background: mascColor }"
            @click="$refs.mascColorInput.click()"
          >
            <q-tooltip>Color ♂ Masculino</q-tooltip>
          </q-btn>
          <input
            ref="mascColorInput"
            type="color"
            :value="mascColor"
            class="ppy-color-input"
            @input="e => { mascColor = e.target.value; renderChart(); }"
          />
          <span class="text-caption text-grey-5">♂</span>

          <!-- Femenino color swatch -->
          <q-btn
            flat dense round size="xs"
            class="ppy-color-swatch"
            :style="{ background: femColor }"
            @click="$refs.femColorInput.click()"
          >
            <q-tooltip>Color ♀ Femenino</q-tooltip>
          </q-btn>
          <input
            ref="femColorInput"
            type="color"
            :value="femColor"
            class="ppy-color-input"
            @input="e => { femColor = e.target.value; renderChart(); }"
          />
          <span class="text-caption text-grey-5">♀</span>

          <!-- Restore defaults -->
          <q-btn
            flat dense round size="xs" icon="restart_alt" color="grey-5"
            @click="resetColors"
          >
            <q-tooltip>Restaurar colores predeterminados</q-tooltip>
          </q-btn>
        </div>

        <!-- Visible rows -->
        <div class="row items-center q-gutter-xs no-wrap">
          <q-icon name="height" size="13px" class="text-grey-6" />
          <q-select
            v-model="visibleRows"
            :options="rowOptions"
            dense outlined emit-value map-options
            class="ppy-rows-select"
            behavior="menu"
          />
        </div>
      </div>

      <!-- Right: exports -->
      <div class="row items-center q-gutter-xs">
        <q-btn-dropdown
          flat dense no-caps size="sm" color="primary"
          icon="download" label="Exportar"
        >
          <q-list dense>
            <q-item v-close-popup clickable @click="exportExcel">
              <q-item-section avatar>
                <q-icon name="table_chart" color="green-8" size="18px" />
              </q-item-section>
              <q-item-section>Excel (.xlsx)</q-item-section>
            </q-item>
            <q-item v-close-popup clickable @click="exportCSV">
              <q-item-section avatar>
                <q-icon name="csv" color="blue-8" size="18px" />
              </q-item-section>
              <q-item-section>CSV</q-item-section>
            </q-item>
            <q-item v-close-popup clickable @click="exportJSON">
              <q-item-section avatar>
                <q-icon name="data_object" color="grey-8" size="18px" />
              </q-item-section>
              <q-item-section>JSON</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-btn
          flat round dense size="sm" color="primary"
          icon="image" @click="exportPNG"
        >
          <q-tooltip>Exportar gráfica a PNG</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ── Empty (when not loading and no data) ────────────────────────── -->
    <div
      v-if="!loading && !raw5Rows.length"
      class="column items-center justify-center q-pa-xl text-grey-5"
    >
      <q-icon name="people_outline" size="52px" class="q-mb-sm" />
      <div class="text-body2">Sin datos de edad para el rango 60+</div>
      <div class="text-caption q-mt-xs">Verifica que existan registros con campo <code>fecha_nacimiento</code> válido.</div>
    </div>

    <!-- ── Content: tabla + gráfica (siempre presente para no desmontar el canvas) ── -->
    <div v-show="raw5Rows.length || loading" class="row q-col-gutter-none ppy-both-row relative-position">

      <!-- Spinner sobre el contenido sin desmontar el canvas del DOM -->
      <q-inner-loading :showing="loading" color="deep-purple-7">
        <q-spinner-dots size="48px" color="deep-purple-7" />
        <span class="text-caption text-grey-7 q-mt-sm">Consultando pirámide poblacional...</span>
      </q-inner-loading>

      <!-- TABLE col -->
      <div class="col-12 col-md-5 ppy-table-col">
        <div class="ppy-subtitle text-caption text-grey-6 row items-center q-gutter-xs">
          <q-icon name="grid_on" size="13px" />
          <span>Tabla</span>
        </div>

        <div class="ppy-table-scroll">
          <table class="ppy-tbl">
            <thead>
              <tr>
                <th class="ppy-th ppy-th-dim text-left">Rango</th>
                <th v-if="displayMode !== 'pct'"    class="ppy-th text-right" :style="{ color: mascColor }">♂ Masc.</th>
                <th v-if="displayMode !== 'values'" class="ppy-th ppy-th-pct text-right" :style="{ color: mascColor }">♂ %</th>
                <th v-if="displayMode !== 'pct'"    class="ppy-th text-right" :style="{ color: femColor }">♀ Fem.</th>
                <th v-if="displayMode !== 'values'" class="ppy-th ppy-th-pct text-right" :style="{ color: femColor }">♀ %</th>
                <th v-if="displayMode !== 'pct'"    class="ppy-th ppy-th-total text-right">Total</th>
                <th v-if="displayMode !== 'values'" class="ppy-th ppy-th-pct text-right">Total %</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="row in paginatedRows" :key="row.rango" class="ppy-row">
                <td class="ppy-td ppy-td-dim">{{ row.rango }}</td>
                <td v-if="displayMode !== 'pct'"    class="ppy-td text-right ppy-td-num" :style="{ color: mascColor }">{{ fmtVal(row.masculino) }}</td>
                <td v-if="displayMode !== 'values'" class="ppy-td text-right ppy-td-pct" :style="{ color: mascColor }">{{ fmtPct(row.masculino) }}</td>
                <td v-if="displayMode !== 'pct'"    class="ppy-td text-right ppy-td-num" :style="{ color: femColor }">{{ fmtVal(row.femenino) }}</td>
                <td v-if="displayMode !== 'values'" class="ppy-td text-right ppy-td-pct" :style="{ color: femColor }">{{ fmtPct(row.femenino) }}</td>
                <td v-if="displayMode !== 'pct'"    class="ppy-td text-right ppy-td-total">{{ fmtVal(row.total) }}</td>
                <td v-if="displayMode !== 'values'" class="ppy-td text-right ppy-td-pct">{{ fmtPct(row.total) }}</td>
              </tr>
            </tbody>

            <tfoot>
              <tr class="ppy-footer-row">
                <td class="ppy-td ppy-td-dim ppy-footer-cell">TOTAL</td>
                <td v-if="displayMode !== 'pct'"    class="ppy-td text-right ppy-footer-cell" :style="{ color: mascColor }">{{ fmtVal(grandTotal.masculino) }}</td>
                <td v-if="displayMode !== 'values'" class="ppy-td text-right ppy-footer-cell ppy-td-pct" :style="{ color: mascColor }">100%</td>
                <td v-if="displayMode !== 'pct'"    class="ppy-td text-right ppy-footer-cell" :style="{ color: femColor }">{{ fmtVal(grandTotal.femenino) }}</td>
                <td v-if="displayMode !== 'values'" class="ppy-td text-right ppy-footer-cell ppy-td-pct" :style="{ color: femColor }">100%</td>
                <td v-if="displayMode !== 'pct'"    class="ppy-td text-right ppy-footer-cell ppy-td-total">{{ fmtVal(grandTotal.total) }}</td>
                <td v-if="displayMode !== 'values'" class="ppy-td text-right ppy-footer-cell ppy-td-pct">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div
          v-if="visibleRows !== null && rows.length > visibleRows"
          class="text-caption text-grey-5 q-px-sm q-py-xs"
        >
          Mostrando {{ paginatedRows.length }} de {{ rows.length }} rangos
        </div>
      </div>

      <!-- CHART col -->
      <div class="col-12 col-md-7 ppy-chart-col">
        <div class="ppy-subtitle text-caption text-grey-6 row items-center justify-between">
          <div class="row items-center q-gutter-xs">
            <q-icon name="bar_chart" size="13px" />
            <span>Gráfica de Pirámide</span>
          </div>
          <div class="row items-center q-gutter-xs no-wrap q-pr-sm">
            <!-- Selector de modo display en la gráfica (Valores / % / Ambos) -->
            <q-btn-toggle
              v-model="displayMode"
              dense flat
              toggle-color="primary"
              class="ppy-mode-toggle gt-xs"
              :options="[
                { label: 'Valores', value: 'values' },
                { label: '%',       value: 'pct'    },
                { label: 'Ambos',   value: 'both'   },
              ]"
            />

            <!-- Toggle mostrar etiquetas de datos -->
            <q-btn
              flat dense round size="xs"
              :icon="chartShowLabels ? 'label' : 'label_off'"
              :color="chartShowLabels ? 'primary' : 'grey-5'"
              @click="chartShowLabels = !chartShowLabels; nextTick(renderChart);"
            >
              <q-tooltip>{{ chartShowLabels ? 'Ocultar etiquetas de datos en barras' : 'Mostrar etiquetas de datos en barras' }}</q-tooltip>
            </q-btn>

            <!-- Chart height selector -->
            <q-icon name="height" size="13px" class="text-grey-6" />
            <q-select
              v-model="chartHeightOption"
              :options="heightOptions"
              dense outlined emit-value map-options
              class="ppy-rows-select"
              behavior="menu"
            />
          </div>
        </div>

        <div class="ppy-chart-scroll" :style="chartScrollStyle">
          <div class="ppy-chart-inner" :style="innerStyle">
            <canvas ref="chartCanvas"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { api } from 'boot/axios';
import {
  Chart, BarController, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { utils, writeFile } from 'xlsx';

Chart.register(
  BarController, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
  ChartDataLabels,
);

// ── State ─────────────────────────────────────────────────────────────────────
const loading   = ref(false);
const raw5Rows  = ref([]);           // Datos base de 5 años obtenidos del servidor
const ageStep   = ref(5);            // 5 o 10 años
const displayMode = ref('values');
const visibleRows = ref(null);       // null = Todas
const chartHeightOption = ref(420);
const chartShowLabels   = ref(true); // Mostrar etiquetas de datos en las barras
const chartCanvas = ref(null);
let chartInstance = null;

// Colores personalizables por género
const DEFAULT_MASC = '#4472C4';
const DEFAULT_FEM  = '#ff0000';
const mascColor = ref(DEFAULT_MASC);
const femColor  = ref(DEFAULT_FEM);

function resetColors() {
  mascColor.value = DEFAULT_MASC;
  femColor.value  = DEFAULT_FEM;
  nextTick(renderChart);
}

// ── Opciones ──────────────────────────────────────────────────────────────────
const rowOptions = [
  { label: '5',     value: 5   },
  { label: '10',    value: 10  },
  { label: 'Todas', value: null },
];

const heightOptions = [
  { label: 'Bajo',     value: 300  },
  { label: 'Normal',   value: 420  },
  { label: 'Alto',     value: 560  },
  { label: 'Pantalla', value: 'fit' },
];

// ── Agregación client-side de 5 años a 10 años (0ms de latencia) ──────────────
function aggregateTo10(fiveYearRows) {
  if (!fiveYearRows || !fiveYearRows.length) return [];
  const result = [];
  for (let i = 0; i < fiveYearRows.length; i += 2) {
    const item1 = fiveYearRows[i];
    const item2 = fiveYearRows[i + 1];
    if (!item2) {
      // e.g. 100+ (último elemento impar)
      result.push({ ...item1 });
    } else {
      const start = item1.rango.split('-')[0].trim();
      const end   = item2.rango.split('-')[1]?.trim() || item2.rango;
      result.push({
        rango: `${start} - ${end}`,
        grupo_orden: Math.floor(i / 2),
        masculino: Number(item1.masculino || 0) + Number(item2.masculino || 0),
        femenino:  Number(item1.femenino  || 0) + Number(item2.femenino  || 0),
        total:     Number(item1.total     || 0) + Number(item2.total     || 0),
      });
    }
  }
  return result;
}

// ── Computed Rows ─────────────────────────────────────────────────────────────
const rows = computed(() => {
  if (ageStep.value === 10) {
    return aggregateTo10(raw5Rows.value);
  }
  return raw5Rows.value;
});

const grandTotal = computed(() => ({
  masculino: rows.value.reduce((s, r) => s + Number(r.masculino || 0), 0),
  femenino:  rows.value.reduce((s, r) => s + Number(r.femenino  || 0), 0),
  total:     rows.value.reduce((s, r) => s + Number(r.total     || 0), 0),
}));

const paginatedRows = computed(() => {
  if (visibleRows.value === null) return rows.value;
  return rows.value.slice(0, visibleRows.value);
});

const innerHeight = computed(() => {
  if (chartHeightOption.value === 'fit') return null;
  return Number(chartHeightOption.value) || 420;
});

const innerStyle = computed(() =>
  innerHeight.value == null
    ? { height: '100%', minHeight: '300px' }
    : { height: `${innerHeight.value}px` }
);

const chartScrollStyle = computed(() =>
  chartHeightOption.value === 'fit'
    ? { maxHeight: 'calc(100vh - 220px)', minHeight: '300px' }
    : { maxHeight: `${Math.max(Number(chartHeightOption.value) || 420, 300)}px`, minHeight: '300px' }
);

// ── Formatters ────────────────────────────────────────────────────────────────
const numFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

function fmtVal(val) {
  const n = Number(val);
  return isFinite(n) ? numFmt.format(n) : '';
}

function fmtPct(val) {
  const n   = Number(val);
  const tot = grandTotal.value.total;
  if (!isFinite(n) || !tot) return '0%';
  return (n / tot * 100).toFixed(1).replace('.', ',') + '%';
}

function fmtPoint(absVal) {
  const n = Number(absVal);
  if (!isFinite(n)) return '';
  const tot = grandTotal.value.total;
  if (displayMode.value === 'pct') {
    // En modo 'pct', el dataset del gráfico ya contiene el valor normalizado a porcentaje (ej. 11.1)
    return n.toFixed(1).replace('.', ',') + '%';
  }
  if (displayMode.value === 'both') {
    const pct = tot ? (n / tot * 100).toFixed(1).replace('.', ',') : '0';
    return `${fmtVal(n)} (${pct}%)`;
  }
  return fmtVal(n);
}

// ── Fetch data ────────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get('/dashboard/registros-piramide', {
      params: { step: 5 },
    });
    raw5Rows.value = res.data || [];
  } catch (err) {
    console.error('PopulationPyramid: error cargando pirámide:', err);
    raw5Rows.value = [];
  } finally {
    loading.value = false;
  }
}

// ── Chart ─────────────────────────────────────────────────────────────────────

function buildChartData() {
  const tot = grandTotal.value.total;
  const pct = displayMode.value === 'pct';

  const normalize = (v) => {
    const n = Number(v);
    return pct && tot ? n / tot * 100 : n;
  };

  // Usamos valores negativos para masculino (barras hacia la izquierda)
  // y positivos para femenino (hacia la derecha). Con stacked:true ambas
  // series se dibujan en la MISMA fila (mismo rango etario).
  return {
    labels: rows.value.map(r => r.rango),
    datasets: [
      {
        label: '♂ Masculino',
        data:  rows.value.map(r => -normalize(r.masculino)),
        backgroundColor: mascColor.value + 'cc',
        borderColor:     mascColor.value,
        borderWidth: 1,
        borderRadius: 2,
        stack: 'pyramid',
      },
      {
        label: '♀ Femenino',
        data:  rows.value.map(r =>  normalize(r.femenino)),
        backgroundColor: femColor.value + 'cc',
        borderColor:     femColor.value,
        borderWidth: 1,
        borderRadius: 2,
        stack: 'pyramid',
      },
    ],
  };
}

function buildChartOptions() {
  const pctMode = displayMode.value === 'pct';
  const suffix  = pctMode ? '%' : '';

  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 30,
        right: 30,
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const raw = ctx.parsed?.x ?? ctx.raw ?? 0;
            const absVal = Math.abs(Number(raw));
            return `${ctx.dataset.label}: ${fmtPoint(absVal)}`;
          },
        },
      },
      datalabels: {
        display: chartShowLabels.value,
        anchor: (ctx) => (ctx.datasetIndex === 0 ? 'start' : 'end'),
        align:  (ctx) => (ctx.datasetIndex === 0 ? 'left' : 'right'),
        formatter(val, ctx) {
          const raw = val !== undefined && val !== null ? val : (ctx.parsed?.x ?? 0);
          const absVal = Math.abs(Number(raw));
          if (!absVal) return '';
          return fmtPoint(absVal);
        },
        font: { weight: 'bold', size: 10 },
        color: (ctx) => (ctx.datasetIndex === 0 ? mascColor.value : femColor.value),
        offset: 4,
        clip: false,
      },
    },
    scales: {
      x: {
        stacked: true,   // stacked=true + valores negativos/positivos = pirámide alineada
        ticks: {
          callback: val => fmtVal(Math.abs(val)) + suffix,
          font: { size: 11 },
        },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      y: {
        stacked: true,   // cada rango etario ocupa UNA sola fila en el eje Y
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  };
}

function renderChart() {
  if (!chartCanvas.value) return;

  // Limpiar cualquier gráfico previo registrado en este canvas por Chart.js
  const existing = Chart.getChart(chartCanvas.value);
  if (existing) {
    existing.destroy();
  }
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (!rows.value.length) return;

  const data    = buildChartData();
  const options = buildChartOptions();

  chartInstance = new Chart(chartCanvas.value, { type: 'bar', data, options });
}

// ── Exports ───────────────────────────────────────────────────────────────────
function exportPNG() {
  if (!chartCanvas.value) return;
  const canvas = chartCanvas.value;

  // Crear un canvas temporal con fondo blanco para que el PNG no sea transparente
  const offscreen = document.createElement('canvas');
  offscreen.width = canvas.width;
  offscreen.height = canvas.height;
  const ctx = offscreen.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, offscreen.width, offscreen.height);
  ctx.drawImage(canvas, 0, 0);

  const a = document.createElement('a');
  a.href = offscreen.toDataURL('image/png');
  a.download = `piramide-poblacional-${ageStep.value}a-${displayMode.value}.png`;
  a.click();
}

function buildExportRows() {
  const tot = grandTotal.value.total || 1;
  return rows.value.map(r => ({
    'Rango':        r.rango,
    'Masculino':    Number(r.masculino),
    'Masculino %':  `${(Number(r.masculino) / tot * 100).toFixed(2)}%`,
    'Femenino':     Number(r.femenino),
    'Femenino %':   `${(Number(r.femenino)  / tot * 100).toFixed(2)}%`,
    'Total':        Number(r.total),
    'Total %':      `${(Number(r.total)     / tot * 100).toFixed(2)}%`,
  }));
}

function exportExcel() {
  const wb = utils.book_new();
  const ws = utils.json_to_sheet(buildExportRows());
  utils.book_append_sheet(wb, ws, 'Pirámide Poblacional');
  writeFile(wb, `piramide-poblacional-${ageStep.value}a.xlsx`);
}

function exportCSV() {
  const data    = buildExportRows();
  const headers = Object.keys(data[0]);
  const lines   = [
    headers.join(','),
    ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `piramide-poblacional-${ageStep.value}a.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON() {
  const blob = new Blob(
    [JSON.stringify(buildExportRows(), null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url;
  a.download = `piramide-poblacional-${ageStep.value}a.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(rows, () => nextTick(renderChart));
watch(displayMode, () => nextTick(renderChart));
watch(chartHeightOption, () => nextTick(renderChart));

onMounted(fetchData);
onBeforeUnmount(() => {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
});
</script>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────────────── */
.pop-pyramid-root { overflow: hidden; }

/* ── Header ────────────────────────────────────────────────────────────────── */
.ppy-header { flex-wrap: wrap; gap: 4px; border-bottom: 1px solid #e2e8f0; }

/* ── Controls bar ──────────────────────────────────────────────────────────── */
.ppy-controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  padding: 5px 10px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
}

.ppy-mode-toggle {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #f5f5f5;
  font-size: 11.5px;
}
.ppy-mode-toggle :deep(.q-btn) { padding: 0 8px; height: 24px; font-size: 11.5px; min-height: unset; }

.ppy-rows-select { min-width: 90px; }
.ppy-rows-select :deep(.q-field__control)  { height: 26px; min-height: 26px; padding: 0 8px; font-size: 11.5px; }
.ppy-rows-select :deep(.q-field__native)   { font-size: 11.5px; padding: 0; min-height: unset; }
.ppy-rows-select :deep(.q-field__append)   { height: 26px; }

/* ── Layout ────────────────────────────────────────────────────────────────── */
.ppy-both-row { display: flex; flex-wrap: wrap; }

/* ── Subtitle bar ──────────────────────────────────────────────────────────── */
.ppy-subtitle {
  font-weight: 600;
  padding: 5px 10px;
  background: #fafafa;
  border-bottom: 1px solid #eef2f7;
  min-height: 30px;
}

/* ── TABLE col ─────────────────────────────────────────────────────────────── */
.ppy-table-col { min-width: 0; }

.ppy-table-scroll {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 420px;
}

.ppy-tbl {
  border-collapse: collapse;
  width: 100%;
  font-size: 12.5px;
  font-family: 'Roboto', 'Segoe UI', sans-serif;
}

.ppy-th {
  position: sticky; top: 0; z-index: 2;
  padding: 7px 10px;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: #f0f4ff;
  border-bottom: 2px solid #c7d2fe;
  color: #374151;
}
.ppy-th-dim   { background: #e8edf8; }
.ppy-th-masc  { color: #4472C4; }
.ppy-th-fem   { color: #ED7D31; }
.ppy-th-total { background: #eff6ff; }
.ppy-th-pct   { background: #f0f4ff; font-style: italic; }

.ppy-row { transition: background 0.12s; }
.ppy-row:hover { background: #f0f9ff; }
.ppy-row:nth-child(even) { background: #fafbff; }
.ppy-row:nth-child(even):hover { background: #e8f4ff; }

.ppy-td {
  padding: 6px 10px;
  border-bottom: 1px solid #eef2f7;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ppy-td-dim   { font-weight: 600; color: #374151; min-width: 80px; }
.ppy-td-num   { font-weight: 500; }
.ppy-td-total { font-weight: 700; color: #1d4ed8; }
.ppy-td-pct   { font-size: 11.5px; opacity: 0.9; }

.ppy-footer-row { background: #eff6ff; }
.ppy-footer-cell { font-weight: 700; font-size: 12px; border-top: 2px solid #bfdbfe; color: #1e40af; }

/* ── CHART col ─────────────────────────────────────────────────────────────── */
.ppy-chart-col { min-width: 0; }

@media (min-width: 1024px) {
  .ppy-chart-col { border-left: 1px solid #eef2f7; }
}
@media (max-width: 1023px) {
  .ppy-chart-col { border-top: 1px solid #eef2f7; }
  .ppy-table-scroll { max-height: 300px; }
}

.ppy-chart-scroll {
  flex: 1;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  display: block;
  padding: 10px;
  background: #fafafa;
}

.ppy-chart-inner { width: 100%; }
.ppy-chart-inner canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
}

/* ── Utilities ─────────────────────────────────────────────────────────────── */
.border-bottom-dash { border-bottom: 1px solid #e2e8f0; }

@media (max-width: 599px) {
  .ppy-controls-bar { flex-direction: column; align-items: flex-start; }
  .ppy-tbl { font-size: 11.5px; }
  .ppy-td, .ppy-th { padding: 5px 7px; }
}

/* ── Color swatch ───────────────────────────────────────────────────────────── */
/* Botón cuadrado que actúa de muestra de color; al hacer click delega al input */
.ppy-color-swatch {
  width: 22px !important;
  height: 22px !important;
  min-width: 22px !important;
  min-height: 22px !important;
  border-radius: 4px !important;
  border: 1.5px solid rgba(0,0,0,0.18) !important;
  padding: 0 !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: box-shadow 0.15s, transform 0.1s;
  cursor: pointer;
}
.ppy-color-swatch:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  transform: scale(1.12);
}

/* El input nativo de color queda invisible pero funcional (disparado por JS) */
.ppy-color-input {
  position: absolute;
  width: 0;
  height: 0;
  padding: 0;
  margin: 0;
  border: none;
  opacity: 0;
  pointer-events: none;
}
</style>
