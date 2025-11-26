<template>
  <q-card class="data-card" flat bordered>
    <q-card-section>
      <div class="row q-col-gutter-md items-center">
        <div class="col-auto text-h6">{{ title }}</div>

        <div class="col">
          <q-select
v-model="selectedEstado" :options="estadoOptions" label="Estado" multiple use-input emit-value
            map-options outlined clearable dense @filter="filterEstados" @update:model-value="onEstadoChange" />
        </div>
        <div class="col">
          <q-select
v-model="selectedMunicipio" :options="municipioOptions" label="Municipio" multiple use-input
            emit-value outlined map-options clearable dense :disable="!selectedEstado || selectedEstado.length === 0"
            @filter="filterMunicipios" @update:model-value="onMunicipioChange" />
        </div>
        <div class="col">
          <q-select
v-model="selectedComuna" :options="comunaOptions" label="Comuna" multiple use-input emit-value
            outlined map-options clearable dense :disable="!selectedMunicipio || selectedMunicipio.length === 0"
            @filter="filterComunas" />
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
    </q-card-section>

    <q-card-section>
      <q-table v-model:pagination="pagination" :rows="filteredData" :columns="columns" row-key="comuna" flat dense />
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

const props = defineProps({
  title: { type: String, required: true },
});

const dashboardStore = useDashboardStore();
const authStore = useAuthStore();

const selectedEstado = ref([]);
const selectedMunicipio = ref([]);
const selectedComuna = ref([]);

const rawEstados = ref([]);
const allEstados = ref([]);
const allMunicipios = ref([]);
const allComunas = ref([]);

const estadoOptions = ref([]);
const municipioOptions = ref([]);
const comunaOptions = ref([]);

const pagination = ref({
  rowsPerPage: 15
});

const columns = [
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left', sortable: true },
  { name: 'municipio', label: 'Municipio', field: 'municipio', align: 'left', sortable: true },
  { name: 'comuna', label: 'Comuna', field: 'comuna', align: 'left', sortable: true },
  { name: 'avance', label: 'Avance', field: 'avance', align: 'right', sortable: true },
];

// Watch for updates from the store
watch(() => dashboardStore.lastUpdateAt, () => {
  // The handleDBChange now performs granular updates, so a full refetch might not be needed.
  // However, if indicators or other parts need a refresh, you can call specific fetch actions.
  // For now, we assume the granular update is enough.
  // If a full refresh is desired, uncomment the line below.
  // dashboardStore.fetchCirclesByComunas();
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
  let filteredStates;

  // Si hay filtro manual del mapa, mostrar solo ese estado
  if (dashboardStore.manualStateFilter) {
    filteredStates = baseStates.filter(state => state.value === dashboardStore.manualStateFilter);
  } else if (isAdmin.value) {
    filteredStates = baseStates;
  } else if (allowedStateIds.value.length === 0) {
    filteredStates = [];
  } else {
    const allowedSet = new Set(allowedStateIds.value);
    filteredStates = baseStates.filter(state => allowedSet.has(state.value));
  }

  allEstados.value = filteredStates;
  estadoOptions.value = filteredStates;
  const sanitized = sanitizeEstadoSelection(selectedEstado.value);
  if (sanitized.length !== selectedEstado.value.length) {
    selectedEstado.value = sanitized;
  }
};

// const applyStateFilters = () => {
//   const baseStates = rawEstados.value;
//   let filteredStates;
//   if (isAdmin.value) {
//     filteredStates = baseStates;
//   } else if (allowedStateIds.value.length === 0) {
//     filteredStates = [];
//   } else {
//     const allowedSet = new Set(allowedStateIds.value);
//     filteredStates = baseStates.filter(state => allowedSet.has(state.value));
//   }
//   allEstados.value = filteredStates;
//   estadoOptions.value = filteredStates;
//   const sanitized = sanitizeEstadoSelection(selectedEstado.value);
//   if (sanitized.length !== selectedEstado.value.length) {
//     selectedEstado.value = sanitized;
//   }
// };

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

const fetchComunas = async (municipioIds) => {
  if (!municipioIds || municipioIds.length === 0) {
    allComunas.value = [];
    comunaOptions.value = [];
    return;
  }
  try {
    const requests = municipioIds.map(id => api.get(`/locations/municipalities/${id}/comunas`));
    const responses = await Promise.all(requests);
    const comunas = responses.flatMap(res => res.data);
    allComunas.value = comunas.map(c => ({ label: c.comuna, value: c.comuna_id }));
    comunaOptions.value = allComunas.value;
  } catch (error) {
    console.error('Error fetching comunas:', error);
  }
};

const onEstadoChange = (estadoIds) => {
  const validStateIds = sanitizeEstadoSelection(estadoIds || []);
  if (validStateIds.length !== (estadoIds || []).length) {
    selectedEstado.value = validStateIds;
  }
  selectedMunicipio.value = [];
  selectedComuna.value = [];
  allMunicipios.value = [];
  municipioOptions.value = [];
  allComunas.value = [];
  comunaOptions.value = [];
  if (validStateIds.length > 0) {
    fetchMunicipios(validStateIds);
  }
};

const onMunicipioChange = (municipioIds) => {
  selectedComuna.value = [];
  allComunas.value = [];
  comunaOptions.value = [];
  if (municipioIds && municipioIds.length > 0) {
    fetchComunas(municipioIds);
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

const filterComunas = (val, update) => {
  if (val === '') {
    update(() => {
      comunaOptions.value = allComunas.value;
    });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    comunaOptions.value = allComunas.value.filter(v => v.label.toLowerCase().indexOf(needle) > -1);
  });
};

const filteredData = computed(() => {
  let data = dashboardStore.circlesByComuna;

  if (selectedEstado.value?.length > 0) {
    const estadoNames = allEstados.value
      .filter(e => selectedEstado.value.includes(e.value))
      .map(e => e.label);
    data = data.filter(row => estadoNames.includes(row.estado));
  }

  if (selectedMunicipio.value?.length > 0) {
    const municipioNames = allMunicipios.value
      .filter(m => selectedMunicipio.value.includes(m.value))
      .map(m => m.label);
    data = data.filter(row => municipioNames.includes(row.municipio));
  }

  if (selectedComuna.value?.length > 0) {
    const comunaNames = allComunas.value
      .filter(c => selectedComuna.value.includes(c.value))
      .map(c => c.label);
    data = data.filter(row => comunaNames.includes(row.comuna));
  }

  return data;
});

onMounted(() => {
  fetchEstados();
  // Fetch initial data from the store
  dashboardStore.fetchCirclesByComunas();
});

watch([allowedStateIds, () => authStore.user?.role], () => {
  if (rawEstados.value.length > 0) {
    applyStateFilters();
  }
});
////////////////////CRMM////////////////
// Watch manualStateFilter del dashboard para sincronizar la selección de estado
watch(() => dashboardStore.manualStateFilter, (manualFilter) => {
  if (manualFilter) {
    // Actualizar opciones para mostrar solo el estado filtrado
    if (rawEstados.value.length > 0) {
      applyStateFilters();
    }
    // Seleccionar el estado
    selectedEstado.value = [manualFilter];
    onEstadoChange([manualFilter]);
  } else {
    // Limpiar selección primero
    selectedEstado.value = [];
    selectedMunicipio.value = [];
    selectedComuna.value = [];
    allMunicipios.value = [];
    municipioOptions.value = [];
    allComunas.value = [];
    comunaOptions.value = [];

    // Actualizar opciones para mostrar todos los estados
    if (rawEstados.value.length > 0) {
      applyStateFilters();
    }
  }
});
////////////////////CRMM////////////////
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
