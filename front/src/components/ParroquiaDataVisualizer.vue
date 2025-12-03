<template>
    <q-card class="data-card" flat bordered>
        <q-card-section>
            <div class="row q-col-gutter-md items-center">
                <div class="col-auto text-h6">{{ title }}</div>

                <div class="col">
                    <q-select v-model="selectedEstado" :options="estadoOptions" label="Estado" multiple use-input
                        emit-value map-options outlined clearable dense @filter="filterEstados"
                        @update:model-value="onEstadoChange" />
                </div>
                <div class="col">
                    <q-select v-model="selectedMunicipio" :options="municipioOptions" label="Municipio" multiple
                        use-input emit-value outlined map-options clearable dense
                        :disable="!selectedEstado || selectedEstado.length === 0" @filter="filterMunicipios"
                        @update:model-value="onMunicipioChange" />
                </div>
                <div class="col">
                    <q-select v-model="selectedParroquia" :options="parroquiaOptions" label="Parroquia" multiple
                        use-input emit-value outlined map-options clearable dense
                        :disable="!selectedMunicipio || selectedMunicipio.length === 0" @filter="filterParroquias" />
                </div>
                <div class="col-auto">
                    <q-btn color="grey-7" round flat icon="more_vert">
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
                </div>
            </div>
            <div class="text-subtitle2">Fecha: {{ currentDate }}</div>

        </q-card-section>

        <q-card-section>
            <q-table v-model:pagination="pagination" :rows="filteredData" :columns="columns" row-key="parroquia" flat
                dense />
        </q-card-section>

    </q-card>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useDashboardStore } from 'src/stores/dashboard-store';
import { utils, writeFile } from 'xlsx';
import { exportFile } from 'quasar';
import { api } from 'boot/axios';
import { useAuthStore } from 'stores/auth-store';
const currentDate = ref(new Date().toLocaleDateString('es-ES'));

const props = defineProps({
    title: { type: String, required: true },
});

const dashboardStore = useDashboardStore();
const authStore = useAuthStore();

const selectedEstado = ref([]);
const selectedMunicipio = ref([]);
const selectedParroquia = ref([]);

const rawEstados = ref([]);
const allEstados = ref([]);
const allMunicipios = ref([]);
const allParroquias = ref([]);

const estadoOptions = ref([]);
const municipioOptions = ref([]);
const parroquiaOptions = ref([]);

const pagination = ref({
    rowsPerPage: 15
});

const columns = [
    { name: 'estado', label: 'Estado', field: 'estado', align: 'left', sortable: true },
    { name: 'municipio', label: 'Municipio', field: 'municipio', align: 'left', sortable: true },
    { name: 'parroquia', label: 'Parroquia', field: 'parroquia', align: 'left', sortable: true },
    { name: 'avance', label: 'Avance', field: 'avance', align: 'right', sortable: true },
];

watch(() => dashboardStore.lastUpdateAt, () => {
    dashboardStore.fetchCirclesByParroquias();
});

const allowedStateIds = computed(() => authStore.allowedStates);
const isAdmin = computed(() => authStore.user?.role === 'Administrador');

const sanitizeEstadoSelection = (ids = []) => {
    if (isAdmin.value) return ids;
    if (allowedStateIds.value.length === 0) return [];
    const allowedSet = new Set(allowedStateIds.value);
    return ids.filter(id => allowedSet.has(id));
};

const applyStateFilters = () => {
    const baseStates = rawEstados.value;
    console.log('🔍 applyStateFilters - baseStates:', baseStates.length);
    console.log('👤 isAdmin:', isAdmin.value);
    console.log('🔐 allowedStateIds:', allowedStateIds.value);
    console.log('🖐 manualStateFilter:', dashboardStore.manualStateFilter);

    let filteredStates;

    if (dashboardStore.manualStateFilter) {
        console.log('🎯 Filtering by manualStateFilter');
        filteredStates = baseStates.filter(state => Number(state.value) === Number(dashboardStore.manualStateFilter));
    } else if (isAdmin.value) {
        console.log('👑 User is Admin, showing all states');
        filteredStates = baseStates;
    } else if (allowedStateIds.value.length === 0) {
        console.warn('⚠️ Non-admin user with no allowed states');
        filteredStates = [];
    } else {
        console.log('🔒 Filtering by allowedStateIds');
        const allowedSet = new Set(allowedStateIds.value.map(id => Number(id)));
        filteredStates = baseStates.filter(state => allowedSet.has(Number(state.value)));
    }

    console.log('✅ filteredStates result:', filteredStates.length);
    allEstados.value = filteredStates;
    estadoOptions.value = filteredStates;

    const sanitized = sanitizeEstadoSelection(selectedEstado.value);
    if (sanitized.length !== selectedEstado.value.length) {
        console.log('🧹 Sanitizing selectedEstado');
        selectedEstado.value = sanitized;
    }
};

const fetchEstados = async () => {
    try {
        const response = await api.get('/locations/states');
        rawEstados.value = response.data.map(e => ({ label: e.estado, value: e.estado_id }));
        applyStateFilters();
    } catch (error) {
        console.error('Error fetching states:', error);
    }
};

const fetchMunicipios = async (estadoIds) => {
    if (!estadoIds || estadoIds.length === 0) {
        allMunicipios.value = [];
        municipioOptions.value = [];
        return;
    }
    try {
        const requests = estadoIds.map(id => api.get(`/locations/states/${id}/municipalities`));
        const responses = await Promise.all(requests);
        const municipios = responses.flatMap(res => res.data);
        allMunicipios.value = municipios.map(m => ({ label: m.municipio, value: m.municipio_id }));
        municipioOptions.value = allMunicipios.value;
    } catch (error) {
        console.error('Error fetching municipalities:', error);
    }
};

const fetchParroquias = async (municipioIds) => {
    console.log('🔍 fetchParroquias called with:', municipioIds);
    if (!municipioIds || municipioIds.length === 0) {
        console.log('⚠️ No municipio IDs provided');
        allParroquias.value = [];
        parroquiaOptions.value = [];
        return;
    }
    try {
        const requests = municipioIds.map(id => {
            const url = `/locations/municipalities/${id}/parroquias`;
            console.log('📡 Fetching from:', url);
            return api.get(url);
        });
        const responses = await Promise.all(requests);
        console.log('✅ Responses received:', responses.length);
        const parroquias = responses.flatMap(res => res.data);
        console.log('📊 Total parroquias:', parroquias.length, parroquias);
        allParroquias.value = parroquias.map(p => ({ label: p.parroquia, value: p.parroquia_id }));
        parroquiaOptions.value = allParroquias.value;
        console.log('✨ Parroquia options set:', parroquiaOptions.value.length);
    } catch (error) {
        console.error('❌ Error fetching parroquias:', error);
        console.error('Error response:', error.response?.data);
    }
};

const onEstadoChange = (estadoIds) => {
    const validStateIds = sanitizeEstadoSelection(estadoIds || []);
    if (validStateIds.length !== (estadoIds || []).length) {
        selectedEstado.value = validStateIds;
    }

    // Clear downstream selections and options
    selectedMunicipio.value = [];
    selectedParroquia.value = [];
    allMunicipios.value = [];
    municipioOptions.value = [];
    allParroquias.value = [];
    parroquiaOptions.value = [];

    if (validStateIds.length > 0) {
        console.log('🔄 State changed, fetching municipios for:', validStateIds);
        fetchMunicipios(validStateIds);
    }
};

const onMunicipioChange = (municipioIds) => {
    console.log('🎯 onMunicipioChange called with:', municipioIds);

    // Ensure we have an array of numbers
    const validIds = (municipioIds || []).map(id => Number(id)).filter(id => !isNaN(id));
    console.log('🔢 Validated IDs:', validIds);

    // Clear downstream selections and options
    selectedParroquia.value = [];
    allParroquias.value = [];
    parroquiaOptions.value = [];

    if (validIds.length > 0) {
        console.log('✅ Calling fetchParroquias with:', validIds);
        fetchParroquias(validIds);
    } else {
        console.log('⚠️ No valid municipio IDs to fetch');
    }
};

const filterEstados = (val, update) => {
    if (val === '') {
        update(() => {
            estadoOptions.value = allEstados.value;
        });
        return;
    }
    update(() => {
        const needle = val.toLowerCase();
        estadoOptions.value = allEstados.value.filter(v => v.label.toLowerCase().indexOf(needle) > -1);
    });
};

const filterMunicipios = (val, update) => {
    if (val === '') {
        update(() => {
            municipioOptions.value = allMunicipios.value;
        });
        return;
    }
    update(() => {
        const needle = val.toLowerCase();
        municipioOptions.value = allMunicipios.value.filter(v => v.label.toLowerCase().indexOf(needle) > -1);
    });
};

const filterParroquias = (val, update) => {
    if (val === '') {
        update(() => {
            parroquiaOptions.value = allParroquias.value;
        });
        return;
    }
    update(() => {
        const needle = val.toLowerCase();
        parroquiaOptions.value = allParroquias.value.filter(v => v.label.toLowerCase().indexOf(needle) > -1);
    });
};

const filteredData = computed(() => {
    let data = dashboardStore.circlesByParroquia;

    if (selectedEstado.value?.length > 0) {
        data = data.filter(row => selectedEstado.value.includes(row.estado_id));
    }

    if (selectedMunicipio.value?.length > 0) {
        data = data.filter(row => selectedMunicipio.value.includes(row.municipio_id));
    }

    if (selectedParroquia.value?.length > 0) {
        data = data.filter(row => selectedParroquia.value.includes(row.parroquia_id));
    }

    return data;
});

onMounted(() => {
    fetchEstados();
    dashboardStore.fetchCirclesByParroquias();
});

watch([allowedStateIds, () => authStore.user?.role], () => {
    if (rawEstados.value.length > 0) {
        applyStateFilters();
    }
});

watch(() => dashboardStore.manualStateFilter, (manualFilter) => {
    if (manualFilter) {
        if (rawEstados.value.length > 0) {
            applyStateFilters();
        }
        selectedEstado.value = [manualFilter];
        onEstadoChange([manualFilter]);
    } else {
        selectedEstado.value = [];
        selectedMunicipio.value = [];
        selectedParroquia.value = [];
        allMunicipios.value = [];
        municipioOptions.value = [];
        allParroquias.value = [];
        parroquiaOptions.value = [];

        if (rawEstados.value.length > 0) {
            applyStateFilters();
        }
    }
});

const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const exportData = (format) => {
    const timestamp = getTimestamp();
    const filename = `${props.title.replace(/\s+/g, '_')}_${timestamp}`;

    const dataForExport = filteredData.value;

    if (format === 'xlsx') {
        const worksheet = utils.json_to_sheet(dataForExport.map(row => {
            const newRow = {};
            columns.forEach(col => {
                newRow[col.label] = row[col.field];
            });
            return newRow;
        }));
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'Datos');
        writeFile(workbook, `${filename}.xlsx`);
    } else if (format === 'csv') {
        const content = [columns.map(col => col.label).join(',')]
            .concat(
                dataForExport.map(row =>
                    columns.map(col => row[col.field]).join(',')
                )
            )
            .join('\r\n');

        const status = exportFile(`${filename}.csv`, content, 'text/csv');
        if (status !== true) {
            console.error('Error al descargar el archivo CSV');
        }
    } else if (format === 'json') {
        const content = JSON.stringify(dataForExport, null, 2);
        const status = exportFile(`${filename}.json`, content, 'application/json');
        if (status !== true) {
            console.error('Error al descargar el archivo JSON');
        }
    }
};
</script>

<style scoped>
.data-card {
    height: 100%;
}
</style>
