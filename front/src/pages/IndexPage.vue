<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row q-col-gutter-md">
      <!-- Filtros de la Página -->
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="row q-gutter-md items-center">
            <div class="text-h6">Filtros</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Indicador: Círculos por Estado (Gráfico) -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
          <!-- El spinner ahora se muestra SOBRE el contenido -->
          <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <!-- v-show mantiene el componente en el DOM pero oculto -->
          <DataVisualizer
            v-show="!dashboardStore.isLoading"
            title="Cumplimiento de Metas por Estado"
            :data="dashboardStore.circlesByState"
            type="bar"
            :column-map="{ 
              label: 'estado', 
              value: [
                { name: 'Círculos Certificados', key: 'circulos_certificados' },
                { name: 'Meta de Círculos', key: 'meta_circulos' }
              ] 
            }"
            stacked
          />
        </q-card>
      </div>

      <!-- Indicador: Círculos por Estado (Tabla) -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="min-height: 425px;">
           <q-inner-loading :showing="dashboardStore.isLoading">
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
          <DataVisualizer
            v-show="!dashboardStore.isLoading"
            title="Tabla: Cumplimiento de Metas por Estado"
            :data="dashboardStore.circlesByState"
            type="table"
            :column-map="{ 
              label: 'estado', 
              labelHeader: 'Estado',
              value: [
                { name: 'Círculos Certificados', key: 'circulos_certificados' },
                { name: 'Meta de Círculos', key: 'meta_circulos' }
              ] 
            }"
          />
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue';
import { useDashboardStore } from 'stores/dashboard-store';
import DataVisualizer from 'components/DataVisualizer.vue';

const dashboardStore = useDashboardStore();

onMounted(() => {
  dashboardStore.fetchCirclesByState();
});
</script>
