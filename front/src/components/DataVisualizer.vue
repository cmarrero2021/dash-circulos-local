<template>
  <q-card class="data-card" flat bordered>
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
        :rows="data"
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
          height="350"
          :options="chartOptions"
          :series="chartSeries"
        ></vue-apex-charts>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { utils, writeFile } from 'xlsx';
import { exportFile } from 'quasar';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


// --- Props del Componente ---
const props = defineProps({
  title: { type: String, required: true },
  data: { type: Array, required: true },
  type: { type: String, default: 'bar' }, // 'table', 'bar', 'pie', 'donut'
  columnMap: { type: Object, required: true }, // { label: 'campo_label', value: 'campo_valor' o [{ name, key }, ...] }
  stacked: { type: Boolean, default: false }, // Para gráficos de barras apiladas
  rowKey: { type: String, default: 'estado_id' }, // clave estable para QTable
});

const chartRef = ref(null);
const tableRef = ref(null);

const pagination = ref({
  rowsPerPage: 10
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
  const columns = [
    { name: 'label', label: props.columnMap.labelHeader || 'Categoría', field: props.columnMap.label, align: 'left', sortable: true }
  ];

  if (Array.isArray(props.columnMap.value)) {
    const metaColumnInfo = props.columnMap.value.find(c => c.key === 'meta_circulos');
    const certColumnInfo = props.columnMap.value.find(c => c.key === 'circulos_certificados');

    if (metaColumnInfo) {
      columns.push({
        name: metaColumnInfo.key,
        label: metaColumnInfo.name,
        field: metaColumnInfo.key,
        align: 'right',
        sortable: true,
        format: formatNumber,
      });
    }

    if (certColumnInfo) {
      columns.push({
        name: certColumnInfo.key,
        label: certColumnInfo.name,
        field: certColumnInfo.key,
        align: 'right',
        sortable: true,
        format: formatNumber,
      });
    }

    // Columna de porcentaje de cumplimiento
    columns.push({
      name: 'cumplimiento',
      label: '% Cumplimiento',
      align: 'right',
      sortable: true,
      field: row => (row.meta_circulos > 0 ? row.circulos_certificados / row.meta_circulos : 0),
      format: val => `${(val * 100).toFixed(2).replace('.', ',')}%`
    });

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


// --- Lógica del GRÁFICO ---
const chartOptions = computed(() => ({
  chart: {
    id: `chart-${props.title.replace(/\s+/g, '-')}`,
    toolbar: { show: false },
    stacked: props.stacked,
  },
   plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: props.stacked ? '70%' : '55%',
    },
  },
  labels: props.data.map(item => item[props.columnMap.label]),
  xaxis: {
    categories: (props.type === 'bar' || props.type === 'line') ? props.data.map(item => item[props.columnMap.label]) : undefined,
  },
  legend: { position: 'bottom' },
  dataLabels: {
    enabled: true,
    style: {
      colors: ['#000']
    }
  },
  tooltip: {
    y: {
      formatter: function (val) {
        return val;
      }
    }
  }
}));

const chartSeries = computed(() => {
  if (Array.isArray(props.columnMap.value)) {
    return props.columnMap.value.map(series => ({
      name: series.name,
      data: props.data.map(item => item[series.key] || 0)
    }));
  }

  const seriesData = props.data.map(item => item[props.columnMap.value]);
  if (props.type === 'pie' || props.type === 'donut') {
    return seriesData;
  }
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
    // Solo actualizar si el gráfico está renderizado y no es tabla
    if (!chartRef.value || props.type === 'table' || !newData || newData.length === 0) return;

    // Si es la primera vez, guardar los datos y no hacer nada
    if (!previousData.value) {
      previousData.value = JSON.parse(JSON.stringify(newData));
      return;
    }

    // Detectar qué índices cambiaron
    const changedIndices = [];
    for (let i = 0; i < newData.length; i++) {
      const oldItem = previousData.value[i];
      const newItem = newData[i];

      if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        changedIndices.push(i);
      }
    }

    // Si hay cambios, actualizar la serie usando updateSeries
    if (changedIndices.length > 0) {
      try {
        const newSeries = chartSeries.value;
        // updateSeries sin re-render completo
        if (chartRef.value && chartRef.value.updateSeries) {
          chartRef.value.updateSeries(newSeries, false);
        }
      } catch (e) {
        console.error('[DataVisualizer] Error actualizando serie:', e);
      }
      previousData.value = JSON.parse(JSON.stringify(newData));
    }
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
