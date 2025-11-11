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
                <q-item v-if="type !== 'table'" clickable @click="exportChart" >
                  <q-item-section avatar><q-icon name="image" /></q-item-section>
                  <q-item-section>Exportar a PNG</q-item-section>
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
        :rows="data"
        :columns="tableColumns"
        row-key="name"
        flat
        dense
      />

      <!-- Renderizado del GRÁFICO -->
      <vue-apex-charts
        v-else
        ref="chartRef"
        :type="type"
        height="350"
        :options="chartOptions"
        :series="chartSeries"
      ></vue-apex-charts>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { utils, writeFile } from 'xlsx';
import { exportFile } from 'quasar';

// --- Props del Componente ---
const props = defineProps({
  title: { type: String, required: true },
  data: { type: Array, required: true },
  type: { type: String, default: 'bar' }, // 'table', 'bar', 'pie', 'donut'
  columnMap: { type: Object, required: true }, // { label: 'campo_label', value: 'campo_valor' }
});

const chartRef = ref(null);

// --- Lógica de la TABLA ---
const tableColumns = computed(() => [
  { name: 'label', label: 'Categoría', field: props.columnMap.label, align: 'left', sortable: true },
  { name: 'value', label: 'Valor', field: props.columnMap.value, align: 'right', sortable: true },
]);

// --- Lógica del GRÁFICO ---
const chartOptions = computed(() => ({
  chart: {
    id: `chart-${props.title.replace(/\s+/g, '-')}`,
    toolbar: { show: false },
  },
  labels: props.data.map(item => item[props.columnMap.label]),
  xaxis: {
    categories: (props.type === 'bar' || props.type === 'line') ? props.data.map(item => item[props.columnMap.label]) : undefined,
  },
  legend: { position: 'bottom' },
  // Para gráficos de torta/dona, podemos mostrar el valor en el tooltip
  tooltip: {
    y: {
      formatter: function (val) {
        return val;
      }
    }
  }
}));

const chartSeries = computed(() => {
  const seriesData = props.data.map(item => item[props.columnMap.value]);
  if (props.type === 'pie' || props.type === 'donut') {
    return seriesData;
  }
  return [{ name: props.title, data: seriesData }];
});

// --- Lógica de EXPORTACIÓN ---
const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

// Exportación para tablas (XLSX, CSV)
const exportData = (format) => {
  const timestamp = getTimestamp();
  const filename = `${props.title.replace(/\s+/g, '_')}_${timestamp}`;

  if (format === 'xlsx') {
    const worksheet = utils.json_to_sheet(props.data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Datos');
    writeFile(workbook, `${filename}.xlsx`);
  } else if (format === 'csv') {
      const content = [tableColumns.value.map(col => col.label).join(',')]
        .concat(props.data.map(row => tableColumns.value.map(col => row[col.field]).join(',')))
        .join('\r\n');

      const status = exportFile(filename, content, 'text/csv');
      if (status !== true) {
        // Manejar error si el navegador lo bloquea
        console.error('Error al descargar el archivo CSV');
      }
  }
};

// Exportación para gráficos (PNG)
const exportChart = () => {
  if (chartRef.value) {
    const timestamp = getTimestamp();
    const filename = `${props.title.replace(/\s+/g, '_')}_${timestamp}.png`;
    chartRef.value.dataURI().then(({ imgURI }) => {
      const link = document.createElement('a');
      link.href = imgURI;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
};
</script>

<style scoped>
.data-card {
  height: 100%;
}
</style>
