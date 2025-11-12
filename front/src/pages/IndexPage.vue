<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row q-col-gutter-md">
      <!-- Indicadores Principales -->
      <div v-for="indicator in indicators" :key="indicator.label" class="col-12 col-md-3">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center no-wrap">
              <div class="col">
                <div class="text-subtitle2 text-grey-8">{{ indicator.label }}</div>
                <div class="text-h5 text-weight-bold">
                  {{ indicator.value }}
                  <q-icon :name="indicator.icon" :color="indicator.color" size="sm" />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

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
import { onMounted, computed } from 'vue';
import { useDashboardStore } from 'stores/dashboard-store';
import { storeToRefs } from 'pinia';
import DataVisualizer from 'components/DataVisualizer.vue';

const dashboardStore = useDashboardStore();
const { indicators: rawIndicators } = storeToRefs(dashboardStore);

const indicators = computed(() => {
  const data = rawIndicators.value || {};
  const formattedFechaMaxima = data.fecha_maxima
    ? new Date(data.fecha_maxima).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'N/A';

  return [
    { label: 'Meta', value: data.meta || 0, icon: 'flag', color: 'blue-grey-8' },
    { label: 'Acumulado', value: data.acumulado || 0, icon: 'leaderboard', color: 'green-7' },
    { label: 'Diferencia', value: data.diferencia || 0, icon: 'trending_down', color: 'red-7' },
    { label: 'Días Faltantes', value: data.dias_faltantes || 0, icon: 'calendar_today', color: 'orange-8' },
    { label: 'Promedio Necesario', value: data.promedio_necesario || 0, icon: 'speed', color: 'purple-8' },
    { label: 'Promedio Diario', value: data.promedio_diario || 0, icon: 'bar_chart', color: 'teal-7' },
    { label: 'Máximo por Fecha', value: data.maximo_por_fecha || 0, icon: 'military_tech', color: 'indigo-7' },
    { label: 'Fecha Máxima', value: formattedFechaMaxima, icon: 'event', color: 'brown-6' }
  ];
});

onMounted(() => {
  dashboardStore.fetchCirclesByState();
  dashboardStore.fetchIndicators();
});
</script>
