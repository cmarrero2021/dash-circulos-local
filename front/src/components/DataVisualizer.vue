<template>
  <q-card ref="cardRef" class="data-card" flat  bordered>
    <q-card-section>
      <div class="row items-center no-wrap">
        <div class="col">
          <div class="text-h6">{{ title }}</div>
        </div>
        <div class="col-auto">
          <!-- Menú de opciones (exportar, cambiar tipo) -->
          <q-btn color="grey-7" round flat icon="more_vert">
            <q-menu cover auto-close>
              <q-list style="min-width: 150px">
                <q-item v-if="type === 'table'" clickable @click="exportData('xlsx')" >
                  <q-item-section avatar><q-icon name="description" /></q-item-section>
                  <q-item-section>Exportar a XLSX</q-item-section>
                </q-item>
                <q-item  v-if="type === 'table'" clickable @click="exportData('csv')">
                   <q-item-section avatar><q-icon name="toc" /></q-item-section>
                  <q-item-section>Exportar a CSV</q-item-section>
                </q-item>
                <q-item v-if="type === 'table'" clickable @click="exportData('json')">
                  <q-item-section avatar><q-icon name="code" /></q-item-section>
                  <q-item-section>Exportar a JSON</q-item-section>
                </q-item>
                <q-item v-if="type !== 'table'" clickable @click="exportChart('png')" >
                  <q-item-section avatar><q-icon name="image" /></q-item-section>
                  <q-item-section>Exportar a PNG</q-item-section>
                </q-item>
                <q-item v-if="type !== 'table'" clickable @click="exportChart('pdf')" >
                  <q-item-section avatar><q-icon name="picture_as_pdf" /></q-item-section>
                  <q-item-section>Exportar a PDF</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <!-- Renderizado de la TABLA -->
          <q-table
            v-if="type === 'table'"
            ref="tableRef"
            v-model:pagination="pagination"
            :rows="tableRows"
            :columns="tableColumns"
            :row-key="rowKey"
            :row-class="rowClass"
            flat
            dense
          />

      <!-- Renderizado del GRÁFICO -->
      <div :id="`chart-container-${title.replace(/\s+/g, '-')}`">
        <vue-apex-charts
          v-if="type !== 'table'"
          ref="chartRef"
          :type="type"
          :height="height"
          :options="chartOptions"
          :series="chartSeries"
        ></vue-apex-charts>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { utils, writeFile } from 'xlsx';
import { exportFile } from 'quasar';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


// --- Emits ---
const emit = defineEmits(['update:height']);

// --- Props del Componente ---
const props = defineProps({
  title: { type: String, required: true },
  data: { type: Array, required: true },
  type: { type: String, default: 'bar' }, // 'table', 'bar', 'pie', 'donut'
  columnMap: { type: Object, required: true }, // { label: 'campo_label', value: 'campo_valor' o [{ name, key }, ...] }
  stacked: { type: Boolean, default: false }, // Para gráficos de barras apiladas
  rowKey: { type: String, default: 'estado_id' }, // clave estable para QTable
  height: { type: [String, Number], default: 350 },
});

const chartRef = ref(null);
const tableRef = ref(null);
const cardRef = ref(null);

// --- Resize Observer ---
let resizeObserver = null;

onMounted(() => {
  if (props.type !== 'table') {
    return;
  }

  nextTick(() => {
    const targetEl = cardRef.value?.$el || tableRef.value?.$el;
    if (!targetEl) {
      return;
    }

    resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const height = Math.max(
        Math.round(entries[0].contentRect.height),
        Number(props.height) || 0
      );
      if (height > 50) {
        emit('update:height', height);
      }
    });
    resizeObserver.observe(targetEl);
  });
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

const pagination = ref({
  rowsPerPage: 24
  // rowsPerPage: 10
});

// --- Lógica de la TABLA ---
const formatNumber = (value) => {
  // Parsea el valor a número. COUNT de postgres devuelve string para bigints.
  const num = Number(value);
  if (isNaN(num)) {
    return value; // Si no es un número válido, devuelve el original.
  }
  // Formato 'de-DE' usa punto como separador de miles.
  return new Intl.NumberFormat('de-DE').format(Math.round(num));
};

// Calcular columnas una sola vez (no es computed para evitar re-renders)
const buildTableColumns = () => {
  const isDateLabel = props.columnMap && props.columnMap.label && String(props.columnMap.label).toLowerCase().includes('fecha');
  const formatDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const columns = [
    { name: 'label', label: props.columnMap.labelHeader || 'Categoría', field: props.columnMap.label, align: 'left', sortable: true, format: isDateLabel ? formatDate : undefined }
  ];

  if (Array.isArray(props.columnMap.value)) {
    // Push a column for each provided series
    props.columnMap.value.forEach(series => {
      columns.push({
        name: series.key,
        label: series.name,
        field: series.key,
        align: 'right',
        sortable: true,
        format: formatNumber,
      });
    });

    // Determine numerator (certified) and denominator (meta) keys for % cumplimiento
    const findCertKey = () => {
      const cert = props.columnMap.value.find(c => /certif|participantes_certificados|certificados/i.test(c.key) || /certif|participadores|participantes_certificados|certificados/i.test(c.name));
      return cert ? cert.key : null;
    };
    const findMetaKey = () => {
      const meta = props.columnMap.value.find(c => /meta/i.test(c.key) || /meta/i.test(c.name));
      return meta ? meta.key : null;
    };

    const certKey = findCertKey();
    const metaKey = findMetaKey();

    if (certKey && metaKey) {
      columns.push({
        name: 'cumplimiento',
        label: '% Cumplimiento',
        align: 'right',
        sortable: true,
        field: row => (row[metaKey] > 0 ? row[certKey] / row[metaKey] : 0),
        format: val => `${(val * 100).toFixed(2).replace('.', ',')}%`
      });
    }

  } else {
    columns.push({
      name: 'value',
      label: 'Valor',
      field: props.columnMap.value,
      align: 'right',
      sortable: true,
      format: formatNumber,
    });
  }
  return columns;
};

const tableColumns = ref(buildTableColumns());

// Prepare rows for table rendering. If label is a date, sort descending and keep formatted date via column format
const tableRows = computed(() => {
  if (!props.data) return [];
  const rows = (props.data || []).slice();
  if (props.columnMap && props.columnMap.label && String(props.columnMap.label).toLowerCase().includes('fecha')) {
    rows.sort((a, b) => new Date(b[props.columnMap.label]) - new Date(a[props.columnMap.label]));
  }
  return rows;
});


// --- Lógica del GRÁFICO ---
const chartOptions = computed(() => {
  // Work with a copy of data for date/time charts (ensure chronological order)
  const dataForChart = (props.type === 'line' && props.columnMap && props.columnMap.label && String(props.columnMap.label).toLowerCase().includes('fecha'))
    ? (props.data || []).slice().sort((a,b) => new Date(a[props.columnMap.label]) - new Date(b[props.columnMap.label]))
    : (props.data || []);

  const labels = dataForChart.map(item => item[props.columnMap.label]);
  const categories = (props.type === 'bar' || props.type === 'line') ? labels.map(l => {
    // if it's a date, convert to ISO string for datetime axis
    if (props.type === 'line' && props.columnMap && props.columnMap.label && String(props.columnMap.label).toLowerCase().includes('fecha')) {
      const d = new Date(l);
      return isNaN(d.getTime()) ? l : d.toISOString();
    }
    return l;
  }) : undefined;

  const baseOptions = {
    chart: {
      id: `chart-${props.title.replace(/\s+/g, '-')}`,
      toolbar: { show: false },
      stacked: true, // Siempre apilado para mantener la misma altura
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '70%',
        borderRadius: 4,
        dataLabels: {
          position: 'top', // Posición de las etiquetas si se muestran
        },
      },
    },
    labels,
    xaxis: {
      categories,
      type: (props.type === 'line' && String(props.columnMap.label).toLowerCase().includes('fecha')) ? 'datetime' : undefined,
    },
    legend: { position: 'bottom' },
    // Se ajustan los colores dinámicamente más abajo
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#000000'],
        fontSize: '12px',
        fontWeight: 'bold'
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 1,
        color: '#fff',
        opacity: 0.9
      },
      formatter: function(val, { seriesIndex }) {
        if (seriesIndex === 0) { // Solo mostrar etiqueta en la parte superior de la barra azul (certificados)
          const numVal = Number(val);
          return isNaN(numVal) ? '' : `${Math.round(numVal)}%`;
        }
        return ''; // No mostrar etiqueta para la parte naranja (faltante)
      },
      offsetY: -5,
      background: {
        enabled: false
      }
    },
    tooltip: {
      y: {
        formatter: (val, { seriesIndex, dataPointIndex }) => {
          const originalDataRow = props.data[dataPointIndex];
          if (originalDataRow && Array.isArray(props.columnMap.value) && props.columnMap.value.length === 2) {
            const progressKey = props.columnMap.value[0].key;
            const totalKey = props.columnMap.value[1].key;

            const certificados = Number(originalDataRow[progressKey] || 0);
            const faltantes = Number(originalDataRow[totalKey] || 0) - certificados;
            const total = certificados + faltantes;
            const porcentajeCertificados = total > 0 ? (certificados / total) * 100 : 0;

            const isProgress = seriesIndex === 0; // Primera serie es el progreso

            // Formatear la salida del tooltip
            return `
              <div>
                <div style="font-weight: bold; margin-bottom: 5px;">${originalDataRow[props.columnMap.label] || ''}</div>
                ${isProgress ? `
                  <div><strong>Certificados:</strong> ${formatNumber(certificados)} (${porcentajeCertificados.toFixed(1).replace('.', ',')}%)</div>
                  <div><strong>Faltante:</strong> ${formatNumber(faltantes)} (${(100 - porcentajeCertificados).toFixed(1).replace('.', ',')}%)</div>
                  <div style="margin-top: 5px; border-top: 1px solid #eee; padding-top: 5px;">
                    <strong>Total:</strong> ${formatNumber(total)}
                  </div>
                ` : ''}
              </div>
            `;
          }
          return formatNumber(val); // Fallback
        }
      }
    }
  };

  // Configuración para gráficos de barras apiladas
  if (props.type === 'bar' && Array.isArray(props.columnMap.value) && props.columnMap.value.length === 2) {
    baseOptions.colors = ['#008FFB', '#FFA500']; // Azul para certificados, Naranja para faltante

    // Configurar el eje Y para mostrar solo números enteros
    baseOptions.yaxis = {
      min: 0,
      max: 100,
      tickAmount: 5, // Muestra 5 marcas en el eje Y (0%, 25%, 50%, 75%, 100%)
      labels: {
        formatter: function(val) {
          // Mostrar solo la parte entera del porcentaje
          return Math.round(val) + '%';
        }
      }
    };

    // Asegurar que las etiquetas de datos muestren solo números enteros
    baseOptions.dataLabels = {
      enabled: true,
      style: {
        colors: ['#000000'],
        fontSize: '12px',
        fontWeight: 'bold'
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 1,
        color: '#fff',
        opacity: 0.9
      },
      formatter: function(val, { seriesIndex }) {
        if (seriesIndex === 0) { // Solo mostrar etiqueta en la parte superior de la barra azul (certificados)
          const numVal = Number(val);
          return isNaN(numVal) ? '' : `${Math.round(numVal)}%`; // Redondear al entero más cercano
        }
        return ''; // No mostrar etiqueta para la parte naranja (faltante)
      },
      offsetY: -5,
      background: {
        enabled: false
      }
    };
  } else {
    // Configuración por defecto para otros tipos de gráficos
    baseOptions.colors = ['#008FFB'];
  }

  // Configuración para gráficos de línea
  if (props.type === 'line') {
    baseOptions.stroke = {
      curve: 'straight',
      width: 3
    };
    baseOptions.colors = ['#008FFB'];

    // Configurar el eje X para mostrar todas las fechas
    if (dataForChart && dataForChart.length > 0) {
      const labelKey = props.columnMap?.label;
      if (labelKey) {
        // Obtener todas las fechas de los datos
        const dates = dataForChart
          .map(item => item[labelKey])
          .filter(date => date != null);

        if (dates.length > 0) {
          baseOptions.xaxis = {
            type: 'datetime',
            labels: {
              format: 'dd/MM/yy', // Formato de fecha corto (ej: 17/11/25)
              datetimeUTC: false,
              style: {
                fontSize: '11px',
                fontFamily: 'Arial, sans-serif'
              },
              formatter: function(value) {
                const date = new Date(value);
                return date.toLocaleDateString('es-VE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit'
                });
              }
            },
            categories: dates,
            tickAmount: 'dataPoints', // Muestra una marca por cada punto de datos
            tooltip: {
              enabled: false
            }
          };
        }
      }
    }

    // Configurar eje Y para números enteros con separador de miles
    baseOptions.yaxis = {
      labels: {
        formatter: function(value) {
          return value.toLocaleString('es-VE', { maximumFractionDigits: 0 });
        }
      },
      forceNiceScale: true,
      min: 0 // Asegurar que el eje Y empiece en 0
    };

    // Configurar tooltips
    baseOptions.tooltip = {
      x: {
        show: true,
        format: 'dd/MM/yyyy',
        formatter: function(_, ctx = {}) {
          const { dataPointIndex, w } = ctx;
          const rawLabel = w?.globals?.categoryLabels?.[dataPointIndex] ?? _;
          const date = new Date(rawLabel);
          if (Number.isNaN(date.getTime())) {
            return rawLabel ?? '';
          }
          return date.toLocaleDateString('es-VE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });
        }
      },
      y: {
        formatter: function(value) {
          return value.toLocaleString('es-VE', { maximumFractionDigits: 0 });
        }
      }
    };

    // Configurar etiquetas de datos
    baseOptions.dataLabels = {
      enabled: true,
      formatter: function(val) {
        return Number(val).toLocaleString('es-VE', { maximumFractionDigits: 0 });
      },
      style: {
        fontSize: '11px',
        fontWeight: 'bold',
        colors: ['#000']
      }
    };
  }

  return baseOptions;
});


const chartSeries = computed(() => {
  const labelKey = props.columnMap && props.columnMap.label ? props.columnMap.label : null;
  const isDateLabel = labelKey && String(labelKey).toLowerCase().includes('fecha');

  // Determine the data order used for the chart (ascending for date labels)
  const dataForChart = (props.type === 'line' && isDateLabel)
    ? (props.data || []).slice().sort((a, b) => new Date(a[labelKey]) - new Date(b[labelKey]))
    : (props.data || []);

  if (Array.isArray(props.columnMap.value)) {
    if (props.stacked && props.columnMap.value.length === 2) {
      const progressConfig = props.columnMap.value[0];
      const totalConfig = props.columnMap.value[1];

      const seriesData = dataForChart.map(item => {
        const certificados = item[progressConfig.key] != null ? Number(item[progressConfig.key]) : 0;
        const faltantes = item[totalConfig.key] != null ? (Number(item[totalConfig.key]) - certificados) : 0;
        const total = certificados + faltantes;
        const porcentajeCertificados = total > 0 ? (certificados / total) * 100 : 0;
        const porcentajeFaltantes = 100 - porcentajeCertificados;

        return {
          certificados,
          faltantes,
          total,
          porcentajeCertificados,
          porcentajeFaltantes
        };
      });

      // Para mostrar todas las columnas con la misma altura (100%)
      return [
        {
          name: 'Certificados',
          data: seriesData.map(d => d.porcentajeCertificados)
        },
        {
          name: 'Faltante',
          data: seriesData.map(d => d.porcentajeFaltantes)
        }
      ];
    }

    return props.columnMap.value.map(series => ({
      name: series.name,
      data: dataForChart.map(item => item[series.key] != null ? Number(item[series.key]) : 0)
    }));
  }

  // Para gráficos de líneas, usar valores absolutos
  if (props.type === 'line') {
    const values = Array.isArray(props.columnMap.value)
      ? props.columnMap.value.map(series => ({
          name: series.name,
          data: dataForChart.map(item => Number(item[series.key] || 0))
        }))
      : [{
          name: props.title,
          data: dataForChart.map(item => Number(item[props.columnMap.value] || 0))
        }];

    return values;
  }

  // Para gráficos de pastel o dona
  if (props.type === 'pie' || props.type === 'donut') {
    return dataForChart.map(item => Number(item[props.columnMap.value] || 0));
  }

  // Para otros tipos de gráficos (no debería llegar aquí para gráficos de barras apiladas)
  const seriesData = dataForChart.map(item => Number(item[props.columnMap.value] || 0));
  return [{ name: props.title, data: seriesData }];
});

// --- Watcher para actualizar gráfico de forma granular ---
// Mantener referencia de los datos anteriores para detectar cambios puntuales
const previousData = ref(null);

// Row highlight: remain highlighted while the store keeps __highlightedAt on the row
const rowClass = (row) => {
  if (!row) return '';
  const ts = row.__highlightedAt;
  if (!ts) return '';
  // persistent highlight for debugging removed
  return 'row-highlight';
};

// Debug: watch data prop to detect highlighted flags on incoming rows
watch(
  () => props.data,
  (newData) => {
    if (!newData) return;
    const highlighted = newData.filter(r => r && r.__highlightedAt);
    if (highlighted.length > 0) {
      // Apply DOM-level highlight to matching table rows so the user sees the change
      highlighted.forEach(r => {
        const key = r.estado || r.estado_id;
        applyDomHighlight(String(key));
          // If there's an incoming payload with new values, update the DOM cells
          if (r.__pendingUpdate) {
            try {
              updateRowDomValues(String(key), r.__pendingUpdate, r);
              // remove pending after applying
              delete r.__pendingUpdate;
            } catch (e) {
              console.error('[DataVisualizer] error applying DOM value update', e);
            }
          }
      });
    }
  },
  { deep: true, immediate: true }
);

// Apply and remove highlight on the actual table row element matching the state text
const applyDomHighlight = (stateKey) => {
  if (!tableRef.value || !tableRef.value.$el) return;
  const el = tableRef.value.$el; // component root
  // Clear any previous inline highlights we added
  el.querySelectorAll('tr').forEach(tr => {
    if (tr.__wasHighlightedByScript) {
      tr.classList.remove('row-highlight');
      tr.__wasHighlightedByScript = false;
    }
  });

  // Find a tr whose cell text matches the stateKey (case-insensitive)
  const rows = Array.from(el.querySelectorAll('tr'));
  const target = rows.find(tr => {
    return Array.from(tr.querySelectorAll('td, th')).some(cell => {
      const text = (cell.textContent || '').trim();
      return text.toUpperCase() === stateKey.toUpperCase();
    });
  });

    if (!target) {
      return;
    }

  target.classList.add('row-highlight');
  target.__wasHighlightedByScript = true;

  // Leave the DOM-applied highlight in place; the store will clear
  // the __highlightedAt flag on the previously highlighted row when a
  // new state is highlighted, and the next props.data change will
  // trigger clearing of the element via the initial cleanup above.
};

// Update specific cells in the row for given stateKey using payload values (no table re-render)
const updateRowDomValues = (stateKey, payload = {}, rowData = {}) => {
  if (!tableRef.value || !tableRef.value.$el) return;
  const el = tableRef.value.$el;

  // Build header label -> index map from rendered headers
  const headers = Array.from(el.querySelectorAll('thead th'));
  const headerText = headers.map(h => (h.textContent || '').trim());

  // Determine target column labels used by our tableColumns (fall back to expected names)
  const certLabel = tableColumns.value.find(c => c.name === 'circulos_certificados')?.label || 'Círculos Certificados';
  const cumplimientoLabel = tableColumns.value.find(c => c.name === 'cumplimiento')?.label || '% Cumplimiento';

  const certIdx = headerText.findIndex(t => t === certLabel);
  const cumpIdx = headerText.findIndex(t => t === cumplimientoLabel);

  // Find the target tr
  const rows = Array.from(el.querySelectorAll('tbody tr'));
  const target = rows.find(tr => {
    return Array.from(tr.querySelectorAll('td, th')).some(cell => {
      const text = (cell.textContent || '').trim();
      return text.toUpperCase() === stateKey.toUpperCase();
    });
  });

  if (!target) {
    return;
  }

  const tds = Array.from(target.querySelectorAll('td'));

  // Update circulos_certificados cell
  if (certIdx !== -1 && tds[certIdx]) {
    const newCert = payload.circulos_certificados != null ? payload.circulos_certificados : rowData.circulos_certificados;
    tds[certIdx].textContent = formatNumber(newCert);
  }

  // Update cumplimiento cell (compute from meta_circulos if available)
  if (cumpIdx !== -1 && tds[cumpIdx]) {
    const newCert = payload.circulos_certificados != null ? Number(payload.circulos_certificados) : Number(rowData.circulos_certificados || 0);
    const meta = Number(rowData.meta_circulos || 0);
    const percent = meta > 0 ? (newCert / meta) * 100 : 0;
    tds[cumpIdx].textContent = `${percent.toFixed(2).replace('.', ',')}%`;
  }
};

watch(
  () => props.data,
  (newData) => {
    // Only update for charts (not tables) and when chart instance exists
    if (!chartRef.value || props.type === 'table' || !newData || newData.length === 0) return;

    // Determine ordering used by the chart: ascending by date when label is fecha
    const labelKey = props.columnMap && props.columnMap.label ? props.columnMap.label : null;
    const isDateLabel = labelKey && String(labelKey).toLowerCase().includes('fecha');

    const buildChartOrdered = (arr) => {
      if (!Array.isArray(arr)) return [];
      if (props.type === 'line' && isDateLabel) {
        return arr.slice().sort((a, b) => new Date(a[labelKey]) - new Date(b[labelKey]));
      }
      return arr.slice();
    };

    const newOrdered = buildChartOrdered(newData);

    // If first time, store ordered data and do nothing
    if (!previousData.value) {
      previousData.value = JSON.parse(JSON.stringify(newOrdered));
      return;
    }

    // Detect which indices changed by comparing ordered arrays
    const changedIndices = [];
    const maxLen = Math.max(previousData.value.length, newOrdered.length);
    for (let i = 0; i < maxLen; i++) {
      const oldItem = previousData.value[i];
      const newItem = newOrdered[i];
      if (!oldItem || !newItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        changedIndices.push(i);
      }
    }

    if (changedIndices.length === 0) {
      previousData.value = JSON.parse(JSON.stringify(newOrdered));
      return;
    }

    try {
      if (!chartRef.value || !chartRef.value.updateSeries) {
        previousData.value = JSON.parse(JSON.stringify(newOrdered));
        return;
      }

      // Build a shallow copy of current series and update only the changed indices
      if (Array.isArray(props.columnMap.value)) {
        const existingSeries = chartSeries.value.map(s => ({ name: s.name, data: Array.isArray(s.data) ? s.data.slice() : [] }));
        changedIndices.forEach(i => {
          props.columnMap.value.forEach((seriesCfg, si) => {
            const val = (newOrdered[i] && newOrdered[i][seriesCfg.key]) != null ? newOrdered[i][seriesCfg.key] : 0;
            if (!existingSeries[si]) existingSeries[si] = { name: seriesCfg.name, data: [] };
            existingSeries[si].data[i] = val;
          });
        });
        chartRef.value.updateSeries(existingSeries, false);
      } else {
        const existing = chartSeries.value[0] ? { name: chartSeries.value[0].name, data: Array.isArray(chartSeries.value[0].data) ? chartSeries.value[0].data.slice() : [] } : { name: props.title, data: [] };
        changedIndices.forEach(i => {
          const val = (newOrdered[i] && newOrdered[i][props.columnMap.value]) != null ? newOrdered[i][props.columnMap.value] : 0;
          existing.data[i] = val;
        });
        chartRef.value.updateSeries([existing], false);
      }
    } catch (e) {
      console.error('[DataVisualizer] Error actualizando serie:', e);
    }

    previousData.value = JSON.parse(JSON.stringify(newOrdered));
  },
  { deep: true }
);

// --- Lógica de EXPORTACIÓN ---
const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const getFormattedDateTime = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Exportación para tablas (XLSX, CSV)
const exportData = (format) => {
  const timestamp = getTimestamp();
  const filename = `${props.title.replace(/\s+/g, '_')}_${timestamp}`;

  // Usar las columnas de la tabla para asegurar consistencia
  const columns = tableColumns.value;
  const dataToExport = props.data.map(row => {
    const newRow = {};
    columns.forEach(col => {
      newRow[col.label] = row[col.field];
    });
    return newRow;
  });


  if (format === 'xlsx') {
    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Datos');
    writeFile(workbook, `${filename}.xlsx`);
  } else if (format === 'csv') {
      const content = [columns.map(col => col.label).join(',')]
        .concat(
          props.data.map(row =>
            columns.map(col => row[col.field]).join(',')
          )
        )
        .join('\r\n');

      const status = exportFile(`${filename}.csv`, content, 'text/csv');
      if (status !== true) {
        console.error('Error al descargar el archivo CSV');
      }
  } else if (format === 'json') {
    const content = JSON.stringify(props.data, null, 2);
    const status = exportFile(`${filename}.json`, content, 'application/json');
    if (status !== true) {
      console.error('Error al descargar el archivo JSON');
    }
  }
};

// Exportación para gráficos (PNG, PDF)
const exportChart = async (format) => {
  const timestamp = getTimestamp();
  const filename = `${props.title.replace(/\s+/g, '_')}_${timestamp}`;
  const chartEl = document.getElementById(`chart-container-${props.title.replace(/\s+/g, '-')}`);

  if (!chartEl) return;

  const chartCanvas = await html2canvas(chartEl);

  // Crear un nuevo canvas para añadir el título
  const finalCanvas = document.createElement('canvas');
  const ctx = finalCanvas.getContext('2d');

  const titleHeight = 40; // Espacio para el título
  const padding = 20; // Espacio alrededor

  finalCanvas.width = chartCanvas.width + padding * 2;
  finalCanvas.height = chartCanvas.height + titleHeight + padding;

  // Fondo blanco
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // Título
  const titleText = `CÍRCULOS DE ABUELOS CERTIFICADOS POR ESTADO AL ${getFormattedDateTime()}`;
  ctx.fillStyle = 'black';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(titleText, finalCanvas.width / 2, titleHeight / 2 + 6);

  // Dibujar el gráfico original en el nuevo canvas
  ctx.drawImage(chartCanvas, padding, titleHeight);

  const imgURI = finalCanvas.toDataURL('image/png');


  if (format === 'png') {
    const link = document.createElement('a');
    link.href = imgURI;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (format === 'pdf') {
    const pdf = new jsPDF({
      orientation: finalCanvas.width > finalCanvas.height ? 'landscape' : 'portrait',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (finalCanvas.height * pdfWidth) / finalCanvas.width;
    pdf.addImage(imgURI, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${filename}.pdf`);
  }
};
</script>

<style scoped>
.data-card {
  height: 100%;
}
  /* Highlighted row style for persistent change indication (green) */
  .row-highlight {
    background-color: rgba(0, 128, 0, 0.12) !important;
  }
</style>

<!-- Global style so QTable internal rows (rendered by child component) pick up the class -->
<style>
  .row-highlight {
    background-color: rgba(0, 128, 0, 0.12) !important;
  }
</style>
