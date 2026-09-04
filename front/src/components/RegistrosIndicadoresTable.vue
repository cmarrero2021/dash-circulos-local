<template>
    <q-expansion-item
        v-model="expanded"
        dense
        expand-separator
        icon="analytics"
        label="INDICADORES BÁSICOS DE REGISTROS POR ESTADO"
        header-class="text-subtitle2 text-weight-bold text-grey-8 bg-grey-2"
        class="indicadores-expansion"
    >
        <q-card flat bordered>
            <q-card-section class="row items-center justify-end q-py-xs">
                <q-btn color="grey-7" round flat icon="more_vert" size="sm">
                    <q-menu cover auto-close>
                        <q-list style="min-width: 150px">
                            <q-item clickable @click="exportData('xlsx')">
                                <q-item-section avatar><q-icon name="description" /></q-item-section>
                                <q-item-section>Exportar a XLSX</q-item-section>
                            </q-item>
                            <q-item clickable @click="exportData('csv')">
                                <q-item-section avatar><q-icon name="toc" /></q-item-section>
                                <q-item-section>Exportar a CSV</q-item-section>
                            </q-item>
                            <q-item clickable @click="exportData('json')">
                                <q-item-section avatar><q-icon name="code" /></q-item-section>
                                <q-item-section>Exportar a JSON</q-item-section>
                            </q-item>
                        </q-list>
                    </q-menu>
                </q-btn>
            </q-card-section>

            <q-separator />

            <q-card-section>
                <q-inner-loading :showing="isLoading">
                    <q-spinner-dots size="40px" color="primary" />
                </q-inner-loading>

                <q-table
                    v-show="!isLoading" :rows="tableData" :columns="columns" row-key="estado" flat dense
                    :pagination="{ rowsPerPage: 25 }" class="registros-table">
                    <!-- Custom header with two rows -->
                    <template #header>
                        <!-- First row: Group headers -->
                        <tr>
                            <th rowspan="2" class="text-left bg-grey-3">ESTADO</th>
                            <th rowspan="2" class="text-right bg-grey-3">REGISTROS</th>
                            <th colspan="2" class="text-center bg-blue-2">NACIONALIDAD</th>
                            <th colspan="2" class="text-center bg-green-2">SEXO</th>
                            <th colspan="3" class="text-center bg-orange-2">PROMEDIO EDAD</th>
                            <th colspan="5" class="text-center bg-purple-2">NIVEL ACADÉMICO</th>
                        </tr>
                        <!-- Second row: Column headers -->
                        <tr>
                            <th class="text-right bg-blue-1">VENEZOLANOS</th>
                            <th class="text-right bg-blue-1">EXTRANJEROS</th>
                            <th class="text-right bg-green-1">MASCULINOS</th>
                            <th class="text-right bg-green-1">FEMENINOS</th>
                            <th class="text-right bg-orange-1">GENERAL</th>
                            <th class="text-right bg-orange-1">FEMENINO</th>
                            <th class="text-right bg-orange-1">MASCULINO</th>
                            <th class="text-right bg-purple-1">NINGUNO</th>
                            <th class="text-right bg-purple-1">PRIMARIA</th>
                            <th class="text-right bg-purple-1">SECUNDARIA</th>
                            <th class="text-right bg-purple-1">UNIVERSIDAD</th>
                            <th class="text-right bg-purple-1">POSTGRADO</th>
                        </tr>
                    </template>
                </q-table>
            </q-card-section>
        </q-card>
    </q-expansion-item>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useDashboardStore } from 'stores/dashboard-store';
import { storeToRefs } from 'pinia';
import { utils, writeFile } from 'xlsx';
import { exportFile } from 'quasar';

const expanded = ref(true);

const dashboardStore = useDashboardStore();
const { registrosIndicadores, isLoadingRegistrosIndicadores } = storeToRefs(dashboardStore);

const isLoading = computed(() => isLoadingRegistrosIndicadores.value);

// Format numbers with thousands separator (Spanish format: punto)
const formatNumber = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return new Intl.NumberFormat('de-DE').format(Math.round(num));
};

// Table columns configuration
const columns = [
    { name: 'estado', label: 'ESTADO', field: 'estado', align: 'left', sortable: true },
    { name: 'registros', label: 'REGISTROS', field: 'registros', align: 'right', format: formatNumber, sortable: true },
    { name: 'venezolano', label: 'VENEZOLANOS', field: 'venezolano', align: 'right', format: formatNumber },
    { name: 'extranjero', label: 'EXTRANJEROS', field: 'extranjero', align: 'right', format: formatNumber },
    { name: 'masculino', label: 'MASCULINOS', field: 'masculino', align: 'right', format: formatNumber },
    { name: 'femenino', label: 'FEMENINOS', field: 'femenino', align: 'right', format: formatNumber },
    { name: 'promedio_edad', label: 'GENERAL', field: 'promedio_edad', align: 'right', format: formatNumber },
    { name: 'prom_edad_fem', label: 'FEMENINO', field: 'prom_edad_fem', align: 'right', format: formatNumber },
    { name: 'prom_edad_masc', label: 'MASCULINO', field: 'prom_edad_masc', align: 'right', format: formatNumber },
    { name: 'ninguno', label: 'NINGUNO', field: 'ninguno', align: 'right', format: formatNumber },
    { name: 'primaria', label: 'PRIMARIA', field: 'primaria', align: 'right', format: formatNumber },
    { name: 'secundaria', label: 'SECUNDARIA', field: 'secundaria', align: 'right', format: formatNumber },
    { name: 'universidad', label: 'UNIVERSIDAD', field: 'universidad', align: 'right', format: formatNumber },
    { name: 'postgrado', label: 'POSTGRADO', field: 'postgrado', align: 'right', format: formatNumber }
];

const tableData = computed(() => registrosIndicadores.value || []);

// Helper function to get timestamp for filenames
const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

// Export function
const exportData = (format) => {
    const filename = `indicadores_registros_estados_${getTimestamp()}`;
    const data = tableData.value.map(row => ({
        Estado: row.estado,
        Registros: row.registros,
        Venezolanos: row.venezolano,
        Extranjeros: row.extranjero,
        Masculinos: row.masculino,
        Femeninos: row.femenino,
        'Promedio Edad General': row.promedio_edad,
        'Promedio Edad Femenino': row.prom_edad_fem,
        'Promedio Edad Masculino': row.prom_edad_masc,
        Ninguno: row.ninguno,
        Primaria: row.primaria,
        Secundaria: row.secundaria,
        Universidad: row.universidad,
        Postgrado: row.postgrado
    }));

    if (format === 'xlsx') {
        const worksheet = utils.json_to_sheet(data);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'Indicadores');
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

onMounted(() => {
    dashboardStore.fetchRegistrosIndicadores();
});
</script>

<style scoped>
.registros-table :deep(th) {
    font-weight: bold;
    font-size: 0.75rem;
    padding: 8px 4px;
    white-space: nowrap;
}

.registros-table :deep(td) {
    padding: 6px 4px;
    font-size: 0.85rem;
}

.registros-table :deep(.bg-grey-3) {
    background-color: #eeeeee;
}

.registros-table :deep(.bg-blue-1) {
    background-color: #e3f2fd;
}

.registros-table :deep(.bg-blue-2) {
    background-color: #bbdefb;
}

.registros-table :deep(.bg-green-1) {
    background-color: #e8f5e9;
}

.registros-table :deep(.bg-green-2) {
    background-color: #c8e6c9;
}

.registros-table :deep(.bg-orange-1) {
    background-color: #fff3e0;
}

.registros-table :deep(.bg-orange-2) {
    background-color: #ffe0b2;
}

.registros-table :deep(.bg-purple-1) {
    background-color: #f3e5f5;
}

.registros-table :deep(.bg-purple-2) {
    background-color: #e1bee7;
}

.indicadores-expansion {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
}

.indicadores-expansion :deep(.q-expansion-item__header) {
    min-height: 40px;
    padding: 0 12px;
    border-radius: 4px 4px 0 0;
    letter-spacing: 0.04em;
}

.indicadores-expansion :deep(.q-expansion-item__header .q-item__section--avatar) {
    min-width: 32px;
    padding-right: 8px;
}
</style>