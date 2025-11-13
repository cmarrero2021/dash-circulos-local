<template>
  <q-card class="data-card" flat bordered>
    <q-card-section>
      <div class="text-h6">{{ title }}</div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-4">
          <q-select
            v-model="selectedEstado"
            :options="estadoOptions"
            label="Estado"
            multiple
            use-input
            emit-value
            map-options
            clearable
            dense
            @filter="filterEstados"
            @update:model-value="onEstadoChange"
          />
        </div>
        <div class="col-12 col-md-4">
          <q-select
            v-model="selectedMunicipio"
            :options="municipioOptions"
            label="Municipio"
            multiple
            use-input
            emit-value
            map-options
            clearable
            dense
            :disable="!selectedEstado || selectedEstado.length === 0"
            @filter="filterMunicipios"
            @update:model-value="onMunicipioChange"
          />
        </div>
        <div class="col-12 col-md-4">
          <q-select
            v-model="selectedComuna"
            :options="comunaOptions"
            label="Comuna"
            multiple
            use-input
            emit-value
            map-options
            clearable
            dense
            :disable="!selectedMunicipio || selectedMunicipio.length === 0"
            @filter="filterComunas"
          />
        </div>
      </div>
    </q-card-section>

    <q-card-section>
      <q-table
        v-model:pagination="pagination"
        :rows="filteredData"
        :columns="columns"
        row-key="comuna"
        flat
        dense
      />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

import { api } from 'boot/axios';

defineProps({
  title: { type: String, required: true },
});



const selectedEstado = ref([]);
const selectedMunicipio = ref([]);
const selectedComuna = ref([]);

const allEstados = ref([]);
const allMunicipios = ref([]);
const allComunas = ref([]);

const estadoOptions = ref([]);
const municipioOptions = ref([]);
const comunaOptions = ref([]);

const comunaData = ref([]);

const pagination = ref({
  rowsPerPage: 15
});

const columns = [
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left', sortable: true },
  { name: 'municipio', label: 'Municipio', field: 'municipio', align: 'left', sortable: true },
  { name: 'comuna', label: 'Comuna', field: 'comuna', align: 'left', sortable: true },
  { name: 'avance', label: 'Avance', field: 'avance', align: 'right', sortable: true },
];

const fetchEstados = async () => {
  try {
    const response = await api.get('/locations/states');
    allEstados.value = response.data.map(e => ({ label: e.estado, value: e.estado_id }));
    estadoOptions.value = allEstados.value;
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

const fetchComunaData = async () => {
  try {
    const response = await api.get('/comunas');
    comunaData.value = response.data;
  } catch (error) {
    console.error('Error fetching comuna data:', error);
  }
};

const onEstadoChange = (estadoIds) => {
  selectedMunicipio.value = [];
  selectedComuna.value = [];
  allMunicipios.value = [];
  municipioOptions.value = [];
  allComunas.value = [];
  comunaOptions.value = [];
  if (estadoIds && estadoIds.length > 0) {
    fetchMunicipios(estadoIds);
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
  let data = comunaData.value;

  if (selectedEstado.value.length > 0) {
    const estadoNames = allEstados.value
      .filter(e => selectedEstado.value.includes(e.value))
      .map(e => e.label);
    data = data.filter(row => estadoNames.includes(row.estado));
  }

  if (selectedMunicipio.value.length > 0) {
    const municipioNames = allMunicipios.value
      .filter(m => selectedMunicipio.value.includes(m.value))
      .map(m => m.label);
    data = data.filter(row => municipioNames.includes(row.municipio));
  }

  if (selectedComuna.value.length > 0) {
    const comunaNames = allComunas.value
      .filter(c => selectedComuna.value.includes(c.value))
      .map(c => c.label);
    data = data.filter(row => comunaNames.includes(row.comuna));
  }

  return data;
});

onMounted(() => {
  fetchEstados();
  fetchComunaData();
});
</script>

<style scoped>
.data-card {
  height: 100%;
}
</style>
