<template>
  <div class="records-timeline-root">

    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <div class="rtl-header row items-center justify-between q-px-md q-py-sm bg-grey-1 border-bottom-dash">
      <div class="row items-center q-gutter-x-sm flex-wrap">
        <q-icon name="timeline" size="20px" color="primary" />
        <span class="text-subtitle2 text-weight-bold text-grey-8">Línea de Tiempo de Registros</span>
        <q-badge color="blue-1" text-color="primary" dense class="q-ml-xs">
          {{ periodBadgeLabel }}
        </q-badge>
        <q-badge v-if="rawRows.length" color="grey-3" text-color="grey-8" dense class="q-ml-xs gt-xs">
          {{ grandTotal.totalFormatted }} registros · {{ rawRows.length }} {{ groupingLabelPlural }}
        </q-badge>
      </div>

      <div class="row items-center q-gutter-x-xs">
        <q-btn
          flat round dense size="sm" icon="refresh"
          color="grey-7" :loading="loading"
          @click="fetchData"
        >
          <q-tooltip>Recargar datos</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ── Controls bar ─────────────────────────────────────────────────────── -->
    <div class="rtl-controls-bar">
      <div class="row items-center q-gutter-sm flex-wrap justify-between">

        <!-- Left filters & selectors -->
        <div class="row items-center q-gutter-sm flex-wrap">

          <!-- Period selector -->
          <div class="row items-center q-gutter-xs no-wrap">
            <q-icon name="calendar_today" size="14px" class="text-grey-6" />
            <span class="text-caption text-grey-6 gt-xs">Período:</span>
            <q-btn-toggle
              v-model="period"
              dense flat
              toggle-color="primary"
              class="rtl-toggle-btn"
              :options="[
                { label: 'Semana Actual', value: 'current_week' },
                { label: 'Mes Actual',    value: 'current_month' },
                { label: 'Año Actual',    value: 'current_year' },
                { label: 'Personalizado', value: 'custom' },
              ]"
              @update:model-value="onPeriodChange"
            />
          </div>

          <!-- Custom date range (visible only when period is 'custom') -->
          <div v-if="period === 'custom'" class="row items-center q-gutter-xs no-wrap animate-fade">
            <q-input
              v-model="customStartDate"
              type="date"
              dense outlined
              label="Desde"
              class="rtl-date-input"
              @change="fetchData"
            />
            <span class="text-caption text-grey-6">-</span>
            <q-input
              v-model="customEndDate"
              type="date"
              dense outlined
              label="Hasta"
              class="rtl-date-input"
              @change="fetchData"
            />
            <q-btn
              flat round dense size="sm"
              icon="search"
              color="primary"
              @click="fetchData"
            >
              <q-tooltip>Consultar rango</q-tooltip>
            </q-btn>
          </div>

          <!-- Grouping selector -->
          <div class="row items-center q-gutter-xs no-wrap">
            <q-icon name="view_week" size="14px" class="text-grey-6" />
            <span class="text-caption text-grey-6 gt-xs">Agrupación:</span>
            <q-btn-toggle
              v-model="grouping"
              dense flat
              toggle-color="teal-8"
              class="rtl-toggle-btn"
              :options="[
                { label: 'Día',    value: 'day'   },
                { label: 'Semana', value: 'week'  },
                { label: 'Mes',    value: 'month' },
                { label: 'Año',    value: 'year'  },
              ]"
              @update:model-value="fetchData"
            />
          </div>

          <!-- Display Mode (Valores, %, Ambos) -->
          <div class="row items-center q-gutter-xs no-wrap">
            <q-btn-toggle
              v-model="displayMode"
              dense flat
              toggle-color="primary"
              class="rtl-toggle-btn"
              :options="[
                { label: 'Valores', value: 'values' },
                { label: '%',       value: 'pct'    },
                { label: 'Ambos',   value: 'both'   },
              ]"
            />
          </div>

          <!-- Color picker -->
          <div class="row items-center q-gutter-xs no-wrap">
            <span class="text-caption text-grey-6">Color:</span>
            <q-btn
              flat dense round size="xs"
              class="rtl-color-swatch"
              :style="{ background: seriesColor }"
              @click="$refs.colorInputRef.click()"
            >
              <q-tooltip>Personalizar color de la serie</q-tooltip>
            </q-btn>
            <input
              ref="colorInputRef"
              type="color"
              :value="seriesColor"
              class="rtl-color-input"
              @input="e => { seriesColor = e.target.value; renderChart(); }"
            />
            <q-btn
              flat dense round size="xs" icon="restart_alt" color="grey-5"
              @click="resetColor"
            >
              <q-tooltip>Restaurar color original</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- Right: Exports -->
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
    </div>

    <!-- ── Empty State ─────────────────────────────────────────────────────── -->
    <div
      v-if="!loading && !rawRows.length"
      class="column items-center justify-center q-pa-xl text-grey-5"
    >
      <q-icon name="event_busy" size="52px" class="q-mb-sm" />
      <div class="text-body2">No se encontraron registros para el período seleccionado</div>
      <div class="text-caption q-mt-xs">Intenta cambiar el rango de fechas o la agrupación.</div>
    </div>

    <!-- ── Content (Tabla + Gráfica) ──────────────────────────────────────── -->
    <div v-show="rawRows.length || loading" class="row q-col-gutter-none rtl-both-row relative-position">

      <!-- Inner loading overlay -->
      <q-inner-loading :showing="loading" color="primary">
        <q-spinner-dots size="48px" color="primary" />
        <span class="text-caption text-grey-7 q-mt-sm">Consultando línea de tiempo...</span>
      </q-inner-loading>

      <!-- ── TABLE COLUMN / CARD ── -->
      <div
        class="col-12 col-md-5 rtl-table-col"
        :class="{ 'rtl-fullscreen-overlay': tableFullscreen }"
      >
        <div class="rtl-card-header row items-center justify-between q-px-sm q-py-xs bg-grey-1 border-bottom">
          <div class="row items-center q-gutter-xs">
            <q-icon name="grid_on" size="14px" color="grey-7" />
            <span class="text-caption text-weight-bold text-grey-8">Tabla de Registros</span>
          </div>

          <div class="row items-center q-gutter-xs">
            <!-- Selector de filas por página -->
            <q-select
              v-model="pageSize"
              :options="pageSizeOptions"
              dense outlined emit-value map-options
              class="rtl-pagesize-select"
              behavior="menu"
            />

            <!-- Botón Pantalla Completa de Tabla -->
            <q-btn
              flat round dense size="sm"
              :icon="tableFullscreen ? 'fullscreen_exit' : 'fullscreen'"
              color="grey-7"
              @click="toggleTableFullscreen"
            >
              <q-tooltip>{{ tableFullscreen ? 'Salir de pantalla completa' : 'Ver tabla en pantalla completa' }}</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- Table Container -->
        <div class="rtl-table-scroll">
          <table class="rtl-tbl">
            <thead>
              <tr>
                <th class="rtl-th rtl-th-dim text-left">
                  {{ groupingColumnTitle }}
                </th>
                <th
                  v-if="displayMode !== 'pct'"
                  class="rtl-th text-right"
                  :style="{ color: seriesColor }"
                >
                  Registros
                </th>
                <th
                  v-if="displayMode !== 'values'"
                  class="rtl-th rtl-th-pct text-right"
                  :style="{ color: seriesColor }"
                >
                  % del Total
                </th>
                <th class="rtl-th text-right text-grey-7 gt-xs">
                  Acumulado
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="row in paginatedRows" :key="row.orden" class="rtl-row">
                <td class="rtl-td rtl-td-dim">{{ row.periodo }}</td>
                <td
                  v-if="displayMode !== 'pct'"
                  class="rtl-td text-right rtl-td-num font-weight-bold"
                  :style="{ color: seriesColor }"
                >
                  {{ fmtVal(row.total) }}
                </td>
                <td
                  v-if="displayMode !== 'values'"
                  class="rtl-td text-right rtl-td-pct"
                  :style="{ color: seriesColor }"
                >
                  {{ fmtPct(row.total) }}
                </td>
                <td class="rtl-td text-right rtl-td-acum gt-xs text-grey-8">
                  {{ fmtVal(row.acumulado) }}
                </td>
              </tr>
            </tbody>

            <tfoot>
              <tr class="rtl-footer-row">
                <td class="rtl-td rtl-td-dim rtl-footer-cell">TOTAL</td>
                <td
                  v-if="displayMode !== 'pct'"
                  class="rtl-td text-right rtl-footer-cell font-weight-bold"
                  :style="{ color: seriesColor }"
                >
                  {{ grandTotal.totalFormatted }}
                </td>
                <td
                  v-if="displayMode !== 'values'"
                  class="rtl-td text-right rtl-footer-cell rtl-td-pct font-weight-bold"
                  :style="{ color: seriesColor }"
                >
                  100%
                </td>
                <td class="rtl-td text-right rtl-footer-cell gt-xs text-grey-8">
                  {{ grandTotal.totalFormatted }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Table pagination footer -->
        <div class="rtl-table-pagination row items-center justify-between q-px-sm q-py-xs bg-grey-1 border-top">
          <div class="text-caption text-grey-6">
            {{ paginationSummary }}
          </div>
          <q-pagination
            v-if="totalPages > 1"
            v-model="currentPage"
            :max="totalPages"
            :max-pages="5"
            boundary-numbers
            direction-links
            dense size="sm"
            color="primary"
            active-color="primary"
          />
        </div>
      </div>

      <!-- ── CHART COLUMN / CARD ── -->
      <div
        class="col-12 col-md-7 rtl-chart-col"
        :class="{ 'rtl-fullscreen-overlay': chartFullscreen }"
      >
        <div class="rtl-card-header row items-center justify-between q-px-sm q-py-xs bg-grey-1 border-bottom">
          <div class="row items-center q-gutter-xs">
            <q-icon name="show_chart" size="14px" color="grey-7" />
            <span class="text-caption text-weight-bold text-grey-8">Gráfica de Línea de Tiempo</span>
          </div>

          <div class="row items-center q-gutter-xs">
            <!-- Tipo de gráfico (Línea / Barras) -->
            <q-btn-toggle
              v-model="chartType"
              dense flat
              toggle-color="primary"
              class="rtl-toggle-btn gt-xs"
              :options="[
                { icon: 'show_chart', value: 'line' },
                { icon: 'bar_chart',  value: 'bar'  },
              ]"
              @update:model-value="renderChart"
            />

            <!-- Toggle Datalabels -->
            <q-btn
              flat dense round size="sm"
              :icon="chartShowLabels ? 'label' : 'label_off'"
              :color="chartShowLabels ? 'primary' : 'grey-5'"
              @click="toggleLabels"
            >
              <q-tooltip>{{ chartShowLabels ? 'Ocultar etiquetas en puntos' : 'Mostrar etiquetas en puntos' }}</q-tooltip>
            </q-btn>

            <!-- Botón Pantalla Completa de Gráfica -->
            <q-btn
              flat round dense size="sm"
              :icon="chartFullscreen ? 'fullscreen_exit' : 'fullscreen'"
              color="grey-7"
              @click="toggleChartFullscreen"
            >
              <q-tooltip>{{ chartFullscreen ? 'Salir de pantalla completa' : 'Ver gráfica en pantalla completa' }}</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- Chart Container -->
        <div class="rtl-chart-container" :style="chartContainerStyle">
          <canvas ref="chartCanvasRef" />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { api } from 'boot/axios';
import {
  Chart, LineController, BarController, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { utils, writeFile } from 'xlsx';

// Registrar plugins y controladores de Chart.js
if (!Chart.registry.plugins.get('datalabels')) {
  Chart.register(
    LineController, BarController, CategoryScale, LinearScale,
    PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler,
    ChartDataLabels
  );
}

// ── State ─────────────────────────────────────────────────────────────────────
const loading = ref(false);
const rawRows = ref([]);
const period = ref('current_month'); // 'current_week' | 'current_month' | 'current_year' | 'custom'
const grouping = ref('day');          // 'year' | 'month' | 'week' | 'day'
const displayMode = ref('values');    // 'values' | 'pct' | 'both'
const chartType = ref('line');        // 'line' | 'bar'
const chartShowLabels = ref(true);

const DEFAULT_COLOR = '#1976D2';
const seriesColor = ref(DEFAULT_COLOR);

// Fechas para rango personalizado
const customStartDate = ref('');
const customEndDate = ref('');

// Paginación
const currentPage = ref(1);
const pageSize = ref(10); // 5, 10, 25, 50, 100, null (Todas)
const pageSizeOptions = [
  { label: '5 por pág.',   value: 5    },
  { label: '10 por pág.',  value: 10   },
  { label: '25 por pág.',  value: 25   },
  { label: '50 por pág.',  value: 50   },
  { label: 'Todas',        value: null },
];

// Pantalla completa independiente
const tableFullscreen = ref(false);
const chartFullscreen = ref(false);

// Refs DOM
const chartCanvasRef = ref(null);
let chartInstance = null;

// ── Formatters ────────────────────────────────────────────────────────────────
const numFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

function fmtVal(val) {
  const n = Number(val);
  return isFinite(n) ? numFmt.format(n) : '0';
}

function fmtPct(val) {
  const n = Number(val);
  const tot = grandTotal.value.total;
  if (!isFinite(n) || !tot) return '0%';
  return (n / tot * 100).toFixed(1).replace('.', ',') + '%';
}

function fmtPoint(absVal) {
  const n = Number(absVal);
  if (!isFinite(n)) return '';
  const tot = grandTotal.value.total;
  if (displayMode.value === 'pct') {
    return n.toFixed(1).replace('.', ',') + '%';
  }
  if (displayMode.value === 'both') {
    const pct = tot ? (n / tot * 100).toFixed(1).replace('.', ',') : '0';
    return `${fmtVal(n)} (${pct}%)`;
  }
  return fmtVal(n);
}

// ── Computed Rows & Calculations ──────────────────────────────────────────────
const processedRows = computed(() => {
  let runningTotal = 0;
  return rawRows.value.map(r => {
    const totalNum = Number(r.total || 0);
    runningTotal += totalNum;
    return {
      ...r,
      total: totalNum,
      acumulado: runningTotal,
    };
  });
});

const grandTotal = computed(() => {
  const total = rawRows.value.reduce((acc, r) => acc + Number(r.total || 0), 0);
  return {
    total,
    totalFormatted: fmtVal(total),
  };
});

const totalPages = computed(() => {
  if (pageSize.value === null || pageSize.value <= 0) return 1;
  return Math.ceil(processedRows.value.length / pageSize.value) || 1;
});

const paginatedRows = computed(() => {
  if (pageSize.value === null) return processedRows.value;
  const start = (currentPage.value - 1) * pageSize.value;
  return processedRows.value.slice(start, start + pageSize.value);
});

const paginationSummary = computed(() => {
  const total = processedRows.value.length;
  if (!total) return 'Sin registros';
  if (pageSize.value === null) return `Mostrando todos los ${total} registros`;
  const start = (currentPage.value - 1) * pageSize.value + 1;
  const end = Math.min(start + pageSize.value - 1, total);
  return `Mostrando ${start}-${end} de ${total}`;
});

const periodBadgeLabel = computed(() => {
  switch (period.value) {
    case 'current_week': return 'Semana Actual (Dom - Sáb)';
    case 'current_month': return 'Mes Actual';
    case 'current_year': return 'Año Actual';
    case 'custom':
      return customStartDate.value && customEndDate.value
        ? `${customStartDate.value} al ${customEndDate.value}`
        : 'Rango Personalizado';
    default: return '';
  }
});

const groupingLabelPlural = computed(() => {
  switch (grouping.value) {
    case 'year': return 'años';
    case 'month': return 'meses';
    case 'week': return 'semanas';
    case 'day': return 'días';
    default: return 'períodos';
  }
});

const groupingColumnTitle = computed(() => {
  switch (grouping.value) {
    case 'year': return 'Año';
    case 'month': return 'Mes';
    case 'week': return 'Semana (Dom - Sáb)';
    case 'day': return 'Fecha / Día';
    default: return 'Período';
  }
});

const chartContainerStyle = computed(() => {
  if (chartFullscreen.value) {
    return { height: 'calc(100vh - 80px)', width: '100%' };
  }
  return { height: '360px', width: '100%', position: 'relative' };
});

// ── Smart Grouping Helper ─────────────────────────────────────────────────────
function onPeriodChange(val) {
  if (val === 'current_week') {
    grouping.value = 'day';
  } else if (val === 'current_month') {
    grouping.value = 'day';
  } else if (val === 'current_year') {
    grouping.value = 'month';
  }
  currentPage.value = 1;
  fetchData();
}

function resetColor() {
  seriesColor.value = DEFAULT_COLOR;
  renderChart();
}

function toggleLabels() {
  chartShowLabels.value = !chartShowLabels.value;
  renderChart();
}

function toggleTableFullscreen() {
  tableFullscreen.value = !tableFullscreen.value;
  if (chartFullscreen.value) chartFullscreen.value = false;
}

function toggleChartFullscreen() {
  chartFullscreen.value = !chartFullscreen.value;
  if (tableFullscreen.value) tableFullscreen.value = false;
  nextTick(() => {
    renderChart();
  });
}

// ── Fetch Data ────────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true;
  currentPage.value = 1;
  try {
    const params = {
      period: period.value,
      grouping: grouping.value,
    };
    if (period.value === 'custom') {
      if (customStartDate.value) params.startDate = customStartDate.value;
      if (customEndDate.value) params.endDate = customEndDate.value;
    }

    const res = await api.get('/dashboard/registros-timeline', { params });
    rawRows.value = res.data || [];
  } catch (err) {
    console.error('RecordsTimeline: error cargando datos:', err);
    rawRows.value = [];
  } finally {
    loading.value = false;
    nextTick(renderChart);
  }
}

// ── Chart.js Setup ────────────────────────────────────────────────────────────
function buildChartData() {
  const tot = grandTotal.value.total;
  const pct = displayMode.value === 'pct';

  const normalize = (v) => {
    const n = Number(v);
    return pct && tot ? (n / tot * 100) : n;
  };

  const labels = processedRows.value.map(r => r.periodo);
  const dataValues = processedRows.value.map(r => normalize(r.total));

  return {
    labels,
    datasets: [
      {
        label: 'Registros',
        type: chartType.value,
        data: dataValues,
        borderColor: seriesColor.value,
        backgroundColor: chartType.value === 'line'
          ? (ctx) => {
              const chart = ctx.chart;
              const { ctx: canvasCtx, chartArea } = chart;
              if (!chartArea) return `${seriesColor.value}22`;
              const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, `${seriesColor.value}55`);
              gradient.addColorStop(1, `${seriesColor.value}05`);
              return gradient;
            }
          : `${seriesColor.value}CC`,
        borderWidth: 2,
        pointBackgroundColor: seriesColor.value,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: processedRows.value.length > 30 ? 2 : 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      },
    ],
  };
}

function buildChartOptions() {
  const pctMode = displayMode.value === 'pct';
  const suffix = pctMode ? '%' : '';

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Registros por ${groupingColumnTitle.value} (${periodBadgeLabel.value})`,
        font: { size: 13, weight: 'bold' },
        color: '#475569',
        padding: { top: 4, bottom: 12 },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 10,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        callbacks: {
          label: (ctx) => {
            const raw = ctx.parsed?.y ?? 0;
            return `Registros: ${fmtPoint(raw)}`;
          },
        },
      },
      datalabels: {
        display: (ctx) => {
          if (!chartShowLabels.value) return false;
          // Si hay demasiados puntos, mostrar sólo si no satura
          if (processedRows.value.length > 35) return false;
          return Number(ctx.dataset.data[ctx.dataIndex]) > 0;
        },
        align: 'top',
        anchor: 'end',
        formatter: (val, ctx) => {
          const raw = val !== undefined && val !== null ? val : (ctx.parsed?.y ?? 0);
          const num = Number(raw);
          if (!num) return '';
          return fmtPoint(num);
        },
        font: { weight: 'bold', size: 10 },
        color: seriesColor.value,
        offset: 4,
        clip: false,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          minRotation: processedRows.value.length > 15 ? 45 : 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          callback: (val) => fmtVal(val) + suffix,
          font: { size: 11 },
        },
      },
    },
  };
}

function renderChart() {
  if (!chartCanvasRef.value) return;

  const existing = Chart.getChart(chartCanvasRef.value);
  if (existing) {
    existing.destroy();
  }

  const ctx = chartCanvasRef.value.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: chartType.value,
    data: buildChartData(),
    options: buildChartOptions(),
  });
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch([displayMode, seriesColor], () => {
  nextTick(renderChart);
});

watch(pageSize, () => {
  currentPage.value = 1;
});

// ── Exports ───────────────────────────────────────────────────────────────────
function exportExcel() {
  const headers = [groupingColumnTitle.value, 'Registros', '% del Total', 'Acumulado'];
  const dataRows = processedRows.value.map(r => [
    r.periodo,
    r.total,
    fmtPct(r.total),
    r.acumulado,
  ]);
  const footerRow = ['TOTAL', grandTotal.value.total, '100%', grandTotal.value.total];

  const ws = utils.aoa_to_sheet([headers, ...dataRows, footerRow]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Linea_Tiempo');
  writeFile(wb, `linea_tiempo_registros_${period.value}_${grouping.value}.xlsx`);
}

function exportCSV() {
  const headers = [groupingColumnTitle.value, 'Registros', 'Porcentaje', 'Acumulado'];
  const dataRows = processedRows.value.map(r => [
    `"${r.periodo}"`,
    r.total,
    `"${fmtPct(r.total)}"`,
    r.acumulado,
  ]);
  const footerRow = ['"TOTAL"', grandTotal.value.total, '"100%"', grandTotal.value.total];

  const csvContent = '\uFEFF' + [headers.join(';'), ...dataRows.map(r => r.join(';')), footerRow.join(';')].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `linea_tiempo_registros_${period.value}_${grouping.value}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON() {
  const payload = {
    periodo: period.value,
    agrupacion: grouping.value,
    gran_total: grandTotal.value.total,
    generado_en: new Date().toISOString(),
    datos: processedRows.value,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `linea_tiempo_registros_${period.value}_${grouping.value}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPNG() {
  if (!chartInstance) return;
  const canvas = chartCanvasRef.value;
  if (!canvas) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height + 40;
  const ctx = tempCanvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(`Línea de Tiempo de Registros · ${periodBadgeLabel.value}`, 16, 26);

  ctx.drawImage(canvas, 0, 40);

  const a = document.createElement('a');
  a.download = `grafica_linea_tiempo_${period.value}_${grouping.value}.png`;
  a.href = tempCanvas.toDataURL('image/png');
  a.click();
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  // Inicializar fechas para rango personalizado
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  customStartDate.value = firstDay.toISOString().slice(0, 10);
  customEndDate.value = today.toISOString().slice(0, 10);

  fetchData();
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});
</script>

<style scoped>
.records-timeline-root {
  font-family: inherit;
  border-radius: 8px;
  overflow: hidden;
}

.border-bottom-dash {
  border-bottom: 1px solid #e2e8f0;
}

.rtl-controls-bar {
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.rtl-toggle-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  border-radius: 4px;
  font-size: 11px;
}

.rtl-date-input {
  max-width: 130px;
  font-size: 11px;
}

.rtl-date-input :deep(.q-field__control) {
  height: 28px;
  padding: 0 6px;
}

.rtl-date-input :deep(input) {
  font-size: 11px;
}

.rtl-color-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px #cbd5e1;
  cursor: pointer;
}

.rtl-color-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.rtl-pagesize-select {
  width: 105px;
  font-size: 11px;
}

.rtl-pagesize-select :deep(.q-field__control) {
  height: 24px;
  min-height: 24px;
  padding: 0 6px;
}

.rtl-pagesize-select :deep(.q-field__native) {
  font-size: 11px;
  padding: 0;
  min-height: 24px;
}

/* ── Content Layout ── */
.rtl-both-row {
  min-height: 380px;
}

.rtl-table-col {
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.rtl-chart-col {
  display: flex;
  flex-direction: column;
}

.rtl-card-header {
  min-height: 34px;
}

.rtl-table-scroll {
  flex: 1;
  overflow-y: auto;
  max-height: 340px;
}

/* ── Table Styling ── */
.rtl-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.rtl-th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 2;
  white-space: nowrap;
}

.rtl-td {
  padding: 6px 10px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  white-space: nowrap;
}

.rtl-row:hover {
  background: #f8fafc;
}

.rtl-td-dim {
  font-weight: 600;
  color: #1e293b;
}

.rtl-td-num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.rtl-td-pct {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.rtl-td-acum {
  font-variant-numeric: tabular-nums;
}

.rtl-footer-row {
  background: #f8fafc;
  border-top: 2px solid #cbd5e1;
}

.rtl-footer-cell {
  font-weight: 700;
  padding: 7px 10px;
  color: #1e293b;
}

.rtl-chart-container {
  flex: 1;
  padding: 8px 12px;
}

/* ── Fullscreen Overlay Mode ── */
.rtl-fullscreen-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 6000 !important;
  background: #ffffff !important;
  width: 100vw !important;
  height: 100vh !important;
  max-height: 100vh !important;
  padding: 16px !important;
  overflow: auto !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

.rtl-fullscreen-overlay .rtl-table-scroll {
  max-height: calc(100vh - 120px) !important;
}

.rtl-fullscreen-overlay .rtl-chart-container {
  height: calc(100vh - 90px) !important;
}

/* ── Responsiveness ── */
@media (max-width: 1023px) {
  .rtl-table-col {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
}
</style>
