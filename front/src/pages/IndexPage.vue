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
            row-key="estado"
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
            row-key="estado"
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

  // Robust helper to format numbers with '.' as thousands separator (Spanish style)
  // Accepts numbers or strings that may already contain thousand/decimal separators
  const formatNumber = (val) => {
    if (val === null || val === undefined || val === '') return '0';

    let num;

    if (typeof val === 'number') {
      num = val;
    } else if (typeof val === 'string') {
      // Normalize string: trim, remove spaces and underscores
      let s = val.trim().replace(/\s+/g, '').replace(/_/g, '');

      // If contains both '.' and ',' decide which is decimal
      if (s.includes('.') && s.includes(',')) {
        // If '.' appears before ',' assume '.' thousands and ',' decimal: remove dots and replace comma with dot
        if (s.indexOf('.') < s.indexOf(',')) {
          s = s.replace(/\./g, '').replace(',', '.');
        } else {
          // otherwise assume ',' thousands, '.' decimal -> remove commas
          s = s.replace(/,/g, '');
        }
      } else if (s.includes('.')) {
        // Only dots: if more than one dot or dot followed by 3 digits, treat as thousands separators
        const dotCount = (s.match(/\./g) || []).length;
        if (dotCount > 1) {
          s = s.replace(/\./g, '');
        } else {
          const parts = s.split('.');
          if (parts[1] && parts[1].length === 3) {
            s = s.replace(/\./g, '');
          }
          // else single dot as decimal -> keep it
        }
      } else if (s.includes(',')) {
        // Only commas: if more than one comma or comma followed by 3 digits, treat as thousands separators
        const commaCount = (s.match(/,/g) || []).length;
        if (commaCount > 1) {
          s = s.replace(/,/g, '');
        } else {
          const parts = s.split(',');
          if (parts[1] && parts[1].length === 3) {
            s = s.replace(/,/g, '');
          } else {
            // single comma as decimal separator -> convert to dot
            s = s.replace(',', '.');
          }
        }
      }

      num = Number(s);
    } else {
      // Fallback: try coercion
      num = Number(val);
    }

    if (Number.isNaN(num)) return String(val);

    // Deterministic formatting: ensure '.' as thousands separator and ',' for decimals
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);
    const [intPart, decPart] = String(abs).split('.');
    const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return sign + intWithDots + (decPart ? ',' + decPart : '');
  };


  return [
    { label: 'Meta', value: formatNumber(data.meta), icon: 'flag', color: 'blue-grey-8' },
    { label: 'Acumulado', value: formatNumber(data.acumulado), icon: 'leaderboard', color: 'green-7' },
    { label: 'Diferencia', value: formatNumber(data.diferencia), icon: 'trending_down', color: 'red-7' },
    { label: 'Días Faltantes', value: data.dias_faltantes || 0, icon: 'calendar_today', color: 'orange-8' },
    { label: 'Promedio Necesario', value: formatNumber(data.promedio_necesario), icon: 'speed', color: 'purple-8' },
    { label: 'Promedio Diario', value: formatNumber(data.promedio_diario), icon: 'bar_chart', color: 'teal-7' },
    { label: 'Máximo por Fecha', value: formatNumber(data.maximo_por_fecha), icon: 'military_tech', color: 'indigo-7' },
    { label: 'Fecha Máxima', value: formattedFechaMaxima, icon: 'event', color: 'brown-6' }
  ];
});

onMounted(() => {
  dashboardStore.fetchCirclesByState();
  dashboardStore.fetchIndicators();
});

// (debug logs removed)
</script>
