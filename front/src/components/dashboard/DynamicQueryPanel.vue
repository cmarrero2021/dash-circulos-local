<template>
  <div class="dynamic-query-panel-root">
    <!-- ═══ Toolbar ═══════════════════════════════════════════════════════ -->
    <div class="dashboard-toolbar q-py-sm q-px-md row no-wrap items-center justify-between">
      <div class="toolbar-left row items-center q-gutter-sm">
        <q-icon name="dashboard_customize" size="28px" class="text-primary-gradient" />
        <div>
          <span class="toolbar-title text-weight-bold">Generador Dinámico de Consultas</span>
          <div class="text-caption text-grey-6 text-xs">Tablas y Gráficas Pivot personalizadas</div>
        </div>
        <q-chip v-if="store.currentQueryName" color="primary" text-color="white" icon="star" class="q-ml-md" dense>
          {{ store.currentQueryName }}
        </q-chip>
      </div>

      <div class="toolbar-actions row items-center q-gutter-xs">
        <!-- Cargar Consulta -->
        <q-btn-dropdown flat dense no-caps icon="folder_open" label="Cargar" color="secondary" class="rounded-btn">
          <q-list style="min-width: 320px; max-height: 400px; overflow: auto" class="q-py-sm">
            <q-item-label header class="text-weight-bold text-primary">Consultas Guardadas</q-item-label>
            <q-separator q-my-xs />
            <q-item
v-for="sq in store.savedQueries" :key="sq.id" v-close-popup clickable
              class="q-mx-xs rounded-item" @click="store.loadSavedQuery(sq)">
              <q-item-section avatar>
                <q-icon name="analytics" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ sq.name }}</q-item-label>
                <q-item-label caption class="ellipsis-2-lines">{{ sq.description || 'Sin descripción' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="column items-end q-gutter-xs">
                  <q-badge
:color="sq.visibility === 'public' ? 'green-14' : 'amber-14'"
                    :label="sq.visibility === 'public' ? 'Público' : 'Privado'" dense />
                  <q-btn icon="delete" size="sm" flat round color="negative" @click.stop="confirmDeleteQuery(sq)" />
                </div>
              </q-item-section>
            </q-item>
            <q-item v-if="!store.savedQueries.length" class="text-center q-pa-md">
              <q-item-section class="text-grey-6 text-italic">No tienes consultas guardadas</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <!-- Guardar Consulta -->
        <q-btn-dropdown flat dense no-caps icon="save" label="Guardar" color="primary" :disable="!store.hasConfig" class="rounded-btn">
          <q-list class="q-py-xs">
            <q-item v-close-popup clickable @click="prepareSave(false)">
              <q-item-section avatar><q-icon name="save" color="primary" /></q-item-section>
              <q-item-section>Guardar consulta</q-item-section>
            </q-item>
            <q-item v-close-popup clickable :disable="!store.currentQueryId" @click="prepareSave(true)">
              <q-item-section avatar><q-icon name="save_as" color="secondary" /></q-item-section>
              <q-item-section>Guardar como nueva</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-separator vertical class="q-mx-xs" />

        <!-- Exportar -->
        <q-btn-dropdown flat dense no-caps icon="download" label="Exportar" color="positive" :disable="!store.rawData.length" class="rounded-btn">
          <q-list class="q-py-xs">
            <q-item-label header class="text-weight-bold">Formato de Tabla</q-item-label>
            <q-item v-close-popup clickable @click="exportExcel">
              <q-item-section avatar><q-icon name="grid_on" color="positive" /></q-item-section>
              <q-item-section>Excel (.xlsx)</q-item-section>
            </q-item>
            <q-item v-close-popup clickable @click="exportCSV">
              <q-item-section avatar><q-icon name="description" color="secondary" /></q-item-section>
              <q-item-section>Valores separados por coma (.csv)</q-item-section>
            </q-item>
            <q-item v-close-popup clickable @click="exportJSON">
              <q-item-section avatar><q-icon name="data_object" color="grey-8" /></q-item-section>
              <q-item-section>JSON Crudo</q-item-section>
            </q-item>
            <q-separator q-my-sm />
            <q-item-label header class="text-weight-bold">Formato de Gráfico</q-item-label>
            <q-item v-close-popup clickable @click="exportChartPNG">
              <q-item-section avatar><q-icon name="image" color="primary" /></q-item-section>
              <q-item-section>Gráfico PNG</q-item-section>
            </q-item>
            <q-item v-close-popup clickable @click="exportChartPDF">
              <q-item-section avatar><q-icon name="picture_as_pdf" color="red-14" /></q-item-section>
              <q-item-section>Gráfico PDF</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-separator vertical class="q-mx-xs" />

        <q-btn
flat round dense icon="refresh" color="primary" :loading="store.dataLoading" :disable="!store.hasConfig"
          @click="store.fetchData">
          <q-tooltip>Recargar datos de consulta</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="delete_sweep" color="negative" :disable="!store.hasConfig" @click="store.clearConfig">
          <q-tooltip>Limpiar configuración actual</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ═══ Main Content ════════════════════════════════════════════════ -->
    <div class="dashboard-content-layout row no-wrap">
      <!-- ─── Left Panel: Fields ─────────────────────────────────────── -->
      <div class="fields-sidebar col-auto column no-wrap">
        <div class="panel-header row items-center q-pa-md text-weight-medium">
          <q-icon name="tune" size="20px" class="q-mr-sm text-primary" />
          <span>Campos de Datos</span>
        </div>
        <div class="q-px-md q-pb-sm">
          <q-input v-model="fieldSearch" dense outlined placeholder="Filtrar campos..." clearable bg-color="white" class="custom-search">
            <template #prepend><q-icon name="search" size="18px" class="text-grey-6" /></template>
          </q-input>
        </div>
        <div class="fields-scroll-area col overflow-auto q-px-md q-pb-md">
          <div v-for="(fields, category) in filteredFields" :key="category" class="field-category-box q-mb-sm">
            <div class="category-header-title row items-center justify-between" @click="toggleCategory(category)">
              <div class="row items-center">
                <q-icon :name="expandedCategories[category] ? 'keyboard_arrow_down' : 'keyboard_arrow_right'" size="20px" class="text-grey-7" />
                <span class="text-weight-bold text-grey-8 text-sm">{{ category }}</span>
              </div>
              <q-badge :label="fields.length" color="grey-3" text-color="grey-9" class="q-py-xs" />
            </div>
            <transition name="slide">
              <div v-if="expandedCategories[category]" class="category-chips-list column q-gutter-xs q-mt-xs">
                <div
v-for="field in fields" :key="field.key" class="draggable-field-chip row items-center justify-between"
                  draggable="true" :title="field.label" @dragstart="onDragStart($event, field)">
                  <div class="row items-center q-gutter-xs text-xs">
                    <q-icon
:name="field.numeric ? 'tag' : field.date ? 'event' : 'text_fields'" size="14px"
                      class="text-primary opacity-8" />
                    <span class="field-label-text text-weight-medium">{{ field.label }}</span>
                  </div>
                  <div class="field-action-quick">
                    <q-btn icon="add" size="6px" round flat color="primary">
                      <q-menu dense>
                        <q-list dense style="min-width: 100px">
                          <q-item v-close-popup clickable @click="store.addFieldToZone(field, 'rows')">
                            <q-item-section avatar><q-icon name="table_rows" size="14px" /></q-item-section>
                            <q-item-section class="text-xs">Fila</q-item-section>
                          </q-item>
                          <q-item v-close-popup clickable @click="store.addFieldToZone(field, 'columns')">
                            <q-item-section avatar><q-icon name="view_column" size="14px" /></q-item-section>
                            <q-item-section class="text-xs">Columna</q-item-section>
                          </q-item>
                          <q-item v-close-popup clickable @click="store.addFieldToZone(field, 'values')">
                            <q-item-section avatar><q-icon name="functions" size="14px" /></q-item-section>
                            <q-item-section class="text-xs">Valor</q-item-section>
                          </q-item>
                          <q-item v-close-popup clickable @click="store.addFieldToZone(field, 'filters')">
                            <q-item-section avatar><q-icon name="filter_alt" size="14px" /></q-item-section>
                            <q-item-section class="text-xs">Filtro</q-item-section>
                          </q-item>
                        </q-list>
                      </q-menu>
                    </q-btn>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <!-- ─── Center Panel: Pivot Config + Table + Chart ─────────────── -->
      <div class="center-panel-workspace col column no-wrap q-pa-md">
        <!-- Drop Zones -->
        <div class="pivot-dropzones column q-gutter-sm bg-white q-pa-md rounded-borders shadow-light">
          <!-- Filtros Avanzados -->
          <div
class="dropzone-box" :class="{ 'dropzone-active': dragOverZone === 'filters' }" @dragover.prevent
            @dragenter.prevent="dragOverZone = 'filters'" @dragleave="dragOverZone = null"
            @drop="onDrop($event, 'filters')">
            <span class="dropzone-header row items-center justify-between">
              <span class="row items-center">
                <q-icon name="filter_alt" size="16px" class="q-mr-xs text-amber-9" />
                <span>Filtros Avanzados</span>
                <q-badge
                  v-if="totalFilterConditions > 0"
                  :label="`${totalFilterConditions}`"
                  color="amber-8" text-color="white" dense class="q-ml-sm" />
              </span>
              <span class="text-caption text-grey-6 text-xs">Doble-clic en un chip para combinar AND/OR</span>
            </span>
            <div class="dropzone-chips-container row items-center q-gutter-xs">
              <q-chip
v-for="f in store.pivotFilters" :key="f.field" removable dense
                color="amber-1" text-color="amber-10" clickable class="pivot-badge shadow-light"
                @remove="store.removeFieldFromZone(f.field, 'filters')">
                <q-icon name="tune" size="14px" class="q-mr-xs cursor-pointer" />
                <span class="text-weight-bold">{{ f.label }}</span>
                <q-badge
                  v-if="f.conditions.length > 1"
                  :label="`${f.conditions.length} reglas`"
                  color="amber-8" text-color="white" dense class="q-ml-xs" />
                <span v-else class="text-xs q-ml-xs">{{ conditionSummary(f) }}</span>
                <q-menu padding style="min-width: 600px; max-width: 720px;" class="glass-dropdown">
                  <FilterEditorPanel />
                  <div class="row justify-end q-gutter-sm q-pa-md bg-grey-1">
                    <q-btn v-close-popup flat label="Cerrar" size="sm" class="rounded-btn" />
                    <q-btn
                      v-close-popup color="primary" label="Aplicar Filtros" icon="play_arrow"
                      size="sm" class="rounded-btn shadow-xs" @click="store.fetchData" />
                  </div>
                </q-menu>
              </q-chip>
              <span
                v-if="!store.pivotFilters.length"
                class="dropzone-empty-text text-italic text-grey-5">
                Arrastra campos aquí para filtrar la consulta...
              </span>
            </div>
          </div>

          <div class="dropzones-row-container row q-col-gutter-sm">
            <!-- Filas -->
            <div class="col-12 col-md-4">
              <div
class="dropzone-box dropzone-rows" :class="{ 'dropzone-active': dragOverZone === 'rows' }" @dragover.prevent
                @dragenter.prevent="dragOverZone = 'rows'" @dragleave="dragOverZone = null"
                @drop="onDrop($event, 'rows')">
                <span class="dropzone-header row items-center">
                  <q-icon name="table_rows" size="16px" class="q-mr-xs text-blue-9" />
                  <span>Filas</span>
                </span>
                <div class="dropzone-chips-container row items-center q-gutter-xs">
                  <q-chip
v-for="f in store.pivotRows" :key="f.key" removable dense
                    color="blue-1" text-color="blue-10" class="pivot-badge shadow-light" @remove="store.removeFieldFromZone(f.key, 'rows')">
                    {{ f.label }}
                  </q-chip>
                  <span v-if="!store.pivotRows.length" class="dropzone-empty-text text-italic text-grey-5">Ej. Estado, Municipio...</span>
                </div>
              </div>
            </div>

            <!-- Columnas -->
            <div class="col-12 col-md-4">
              <div
class="dropzone-box dropzone-columns" :class="{ 'dropzone-active': dragOverZone === 'columns' }" @dragover.prevent
                @dragenter.prevent="dragOverZone = 'columns'" @dragleave="dragOverZone = null"
                @drop="onDrop($event, 'columns')">
                <span class="dropzone-header row items-center">
                  <q-icon name="view_column" size="16px" class="q-mr-xs text-green-9" />
                  <span>Columnas</span>
                </span>
                <div class="dropzone-chips-container row items-center q-gutter-xs">
                  <q-chip
v-for="f in store.pivotColumns" :key="f.key" removable dense
                    color="green-1" text-color="green-10" class="pivot-badge shadow-light" @remove="store.removeFieldFromZone(f.key, 'columns')">
                    {{ f.label }}
                  </q-chip>
                  <span v-if="!store.pivotColumns.length" class="dropzone-empty-text text-italic text-grey-5">Ej. Sexo...</span>
                </div>
              </div>
            </div>

            <!-- Valores -->
            <div class="col-12 col-md-4">
              <div
class="dropzone-box dropzone-values" :class="{ 'dropzone-active': dragOverZone === 'values' }" @dragover.prevent
                @dragenter.prevent="dragOverZone = 'values'" @dragleave="dragOverZone = null"
                @drop="onDrop($event, 'values')">
                <span class="dropzone-header row items-center">
                  <q-icon name="functions" size="16px" class="q-mr-xs text-purple-9" />
                  <span>Agregaciones (Valores)</span>
                </span>
                <div class="dropzone-chips-container row items-center q-gutter-xs">
                  <q-chip
v-for="f in store.pivotValues" :key="f.key" removable dense
                    color="purple-1" text-color="purple-10" class="pivot-badge shadow-light clickable-chip" @remove="store.removeFieldFromZone(f.key, 'values')">
                    {{ f.label }} <span class="text-weight-bold text-xs">({{ f.aggregation }})</span>
                    <q-menu class="glass-dropdown">
                      <q-list dense class="q-py-xs">
                        <q-item
v-for="agg in ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX']" :key="agg" v-close-popup clickable
                          class="rounded-item q-mx-xs" @click="store.changeAggregation(f.key, agg)">
                          <q-item-section class="text-xs text-weight-medium">{{ agg }}</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-chip>
                  <span v-if="!store.pivotValues.length" class="dropzone-empty-text text-italic text-grey-5">Ej. Cédula (COUNT)...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Execute action button -->
        <div v-if="store.hasConfig" class="execute-query-action q-my-md row justify-end">
          <q-btn
color="primary" icon="play_arrow" label="Ejecutar Consulta Dinámica" :loading="store.dataLoading"
            unelevated class="execute-animated-btn full-width shadow-md rounded-btn text-weight-bold" @click="store.fetchData" />
        </div>

        <!-- Results panel (Table / Charts) -->
        <div v-if="store.rawData.length" class="results-layout col column no-wrap">
          <div class="results-tabs-wrapper row items-center justify-between bg-white q-px-sm rounded-t-borders shadow-light-top">
            <q-tabs
v-model="activeTab" dense align="left" class="custom-tabs text-grey-8" active-color="primary"
              indicator-color="primary">
              <q-tab name="table" icon="grid_on" label="Tabla Dinámica" class="text-xs text-weight-bold q-py-sm" />
              <q-tab name="chart" icon="bar_chart" label="Gráfico Dinámico" class="text-xs text-weight-bold q-py-sm" />
            </q-tabs>
            
            <div v-if="activeTab === 'chart'" class="chart-options-bar row items-center q-gutter-sm q-py-xs">
              <q-btn-toggle
v-model="store.chartType" dense flat toggle-color="primary" class="chart-toggle-group" :options="[
                { label: 'Barras', value: 'bar', icon: 'bar_chart' },
                { label: 'H. Barras', value: 'hbar', icon: 'align_horizontal_left' },
                { label: 'Línea', value: 'line', icon: 'show_chart' },
                { label: 'Torta', value: 'pie', icon: 'pie_chart' },
                { label: 'Dona', value: 'doughnut', icon: 'donut_large' },
              ]" />
              <q-toggle
v-if="['bar', 'hbar', 'line'].includes(store.chartType)" v-model="store.chartStacked" label="Apilar"
                dense color="primary" class="text-xs" />
              <q-toggle v-model="store.chartShowLabels" label="Valores" dense color="primary" class="text-xs" />
              <q-btn flat round dense icon="palette" color="primary" @click="showColorDialog = true">
                <q-tooltip>Colores del gráfico</q-tooltip>
              </q-btn>
            </div>
            <div class="row items-center q-gutter-xs">
              <q-btn
                flat round dense icon="label" color="primary"
                :disable="!store.rawData.length"
                @click="showLabelsDialog = true">
                <q-tooltip>Renombrar columnas y series</q-tooltip>
              </q-btn>
            </div>
          </div>
          <q-separator />
          
          <div class="results-body-panel col bg-white rounded-b-borders shadow-light overflow-hidden column no-wrap relative-position">
            <q-tab-panels v-model="activeTab" animated class="col overflow-hidden bg-transparent">
              <q-tab-panel name="table" class="q-pa-none col column no-wrap overflow-hidden">
                <PivotTable ref="pivotTableRef" class="col" />
              </q-tab-panel>
              <q-tab-panel name="chart" class="q-pa-md col column no-wrap overflow-auto">
                <PivotChart ref="pivotChartRef" class="col flex flex-center" />
              </q-tab-panel>
            </q-tab-panels>
          </div>
        </div>

        <!-- Empty state default -->
        <div v-else-if="!store.dataLoading" class="empty-state-card col column items-center justify-center bg-white rounded-borders shadow-light border-light q-pa-xl text-center">
          <q-icon name="dashboard_customize" size="80px" class="text-primary opacity-3 q-mb-md" />
          <h2 class="text-h6 text-weight-bold text-grey-8 q-my-none">Crea tu reporte personalizado</h2>
          <p class="text-body2 text-grey-6 q-mt-sm max-w-sm">
            Arrastra los campos de datos de la columna izquierda y suéltalos en las zonas de <strong>Filas</strong>, <strong>Columnas</strong> o <strong>Valores</strong> para estructurar tu consulta, tal como en Excel.
          </p>
          <q-btn outline color="primary" icon="lightbulb" label="Ver ejemplos guardados" class="q-mt-md rounded-btn" :disable="!store.savedQueries.length">
            <q-menu class="glass-dropdown">
              <q-list style="min-width: 250px" class="q-py-sm">
                <q-item v-for="sq in store.savedQueries" :key="sq.id" v-close-popup clickable class="rounded-item q-mx-xs" @click="store.loadSavedQuery(sq)">
                  <q-item-section avatar><q-icon name="star" color="amber-8" /></q-item-section>
                  <q-item-section class="text-xs text-weight-medium">{{ sq.name }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>

        <!-- Loading overlay -->
        <q-inner-loading :showing="store.dataLoading" class="rounded-borders">
          <q-spinner-dots size="50px" color="primary" />
          <span class="text-caption text-grey-7 text-weight-bold q-mt-sm">Consultando al motor GraphQL...</span>
        </q-inner-loading>
      </div>
    </div>

    <!-- ═══ Save Dialog ══════════════════════════════════════════════════ -->
    <q-dialog v-model="showSaveDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px;" class="glass-card shadow-lg">
        <q-card-section class="bg-primary text-white q-py-md">
          <div class="text-h6 text-weight-bold row items-center">
            <q-icon name="save" class="q-mr-sm" />
            <span>Guardar Consulta</span>
          </div>
          <div class="text-caption opacity-8">Esta consulta se almacenará en tu cuenta</div>
        </q-card-section>
        
        <q-card-section class="q-pa-md">
          <q-input v-model="saveName" label="Nombre de la Consulta *" outlined dense class="q-mb-md rounded-input" autofocus />
          <q-input
v-model="saveDescription" label="Descripción de lo que analiza" outlined dense type="textarea" rows="3"
            class="q-mb-md rounded-input" />
          <q-select
v-model="saveVisibility"
            :options="[{ label: 'Privada (Solo yo)', value: 'private' }, { label: 'Pública (Todos en mi rol)', value: 'public' }]"
            label="Privacidad / Visibilidad" outlined dense emit-value map-options class="rounded-input" />
        </q-card-section>
        
        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn flat label="Cancelar" class="rounded-btn text-weight-medium" @click="showSaveDialog = false" />
          <q-btn color="primary" label="Guardar Consulta" :disable="!saveName" class="rounded-btn shadow-xs text-weight-bold" @click="handleSave" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══ Delete Confirmation Dialog ══════════════════════════════════ -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card style="min-width: 350px; border-radius: 12px;">
        <q-card-section class="bg-negative text-white q-py-md row items-center">
          <q-icon name="warning" size="28px" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">Eliminar Consulta</div>
        </q-card-section>

        <q-card-section class="q-pa-md text-body2">
          ¿Estás seguro de que deseas eliminar permanentemente la consulta guardada <strong class="text-negative">"{{ queryToDelete?.name }}"</strong>? Esta acción no se puede deshacer.
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn v-close-popup flat label="Cancelar" class="rounded-btn text-weight-medium" />
          <q-btn color="negative" label="Sí, Eliminar" class="rounded-btn text-weight-bold shadow-xs" @click="handleDeleteQuery" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══ Color Customization Dialog ══════════════════════════════════ -->
    <q-dialog v-model="showColorDialog">
      <q-card style="min-width: 380px; border-radius: 12px;">
        <q-card-section class="bg-primary text-white row items-center q-py-md">
          <div class="text-h6 text-weight-bold row items-center">
            <q-icon name="palette" class="q-mr-sm" />
            <span>Colores Personalizados</span>
          </div>
          <q-space />
          <q-btn v-close-popup icon="close" flat round dense />
        </q-card-section>

        <q-card-section class="q-pa-md" style="max-height: 50vh; overflow-y: auto">
          <div v-if="!currentChartSeries.length" class="text-center text-grey-6 q-pa-lg">
            No hay series o categorías en el gráfico actual para personalizar
          </div>
          <q-list v-else separator>
            <q-item v-for="series in currentChartSeries" :key="series" class="q-px-none row items-center">
              <q-item-section>
                <q-item-label class="text-weight-bold text-sm text-grey-8">{{ series }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-xs">
                  <q-btn round flat class="shadow-xs border-light">
                    <div
                      :style="{ background: store.chartCustomColors[series] || '#4472C4', width: '24px', height: '24px', borderRadius: '50%', border: '2px solid white' }">
                    </div>
                    <q-menu class="color-picker-menu">
                      <q-color v-model="store.chartCustomColors[series]" no-header no-footer default-view="palette" />
                    </q-menu>
                  </q-btn>
                  <q-btn v-if="store.chartCustomColors[series]" icon="restart_alt" size="sm" flat round color="grey-6" @click="delete store.chartCustomColors[series]">
                    <q-tooltip>Restaurar color por defecto</q-tooltip>
                  </q-btn>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-separator />

        <q-card-actions align="between" class="q-pa-md bg-grey-1">
          <q-btn flat label="Restablecer Todo" color="negative" class="rounded-btn" @click="store.chartCustomColors = {}" />
          <q-btn v-close-popup color="primary" label="Cerrar" class="rounded-btn text-weight-bold shadow-xs" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══ Labels Customization Dialog ══════════════════════════════════ -->
    <q-dialog v-model="showLabelsDialog">
      <q-card style="min-width: 600px; max-width: 800px; border-radius: 12px;">
        <q-card-section class="bg-primary text-white row items-center q-py-md">
          <div class="text-h6 text-weight-bold row items-center">
            <q-icon name="label" class="q-mr-sm" />
            <span>Renombrar Columnas y Series</span>
          </div>
          <q-space />
          <q-btn v-close-popup icon="close" flat round dense />
        </q-card-section>

        <q-card-section class="q-pa-md" style="max-height: 60vh; overflow-y: auto">
          <div
            v-if="!renameCandidates.length"
            class="text-center text-grey-6 q-pa-lg">
            <q-icon name="info" size="32px" class="q-mb-sm opacity-4" />
            <div>Ejecuta una consulta primero para renombrar sus columnas y series.</div>
          </div>

          <div v-else>
            <p class="text-caption text-grey-6 q-mb-md">
              Personaliza los nombres mostrados en la tabla y el gráfico.
              Deja el campo vacío para restaurar el nombre original.
              Doble-clic en cualquier cabecera de la tabla también abre este editor.
            </p>

            <!-- Headers section -->
            <div class="text-weight-bold text-grey-8 q-mb-sm row items-center">
              <q-icon name="view_column" size="16px" class="q-mr-xs text-primary" />
              Columnas
              <q-badge :label="`${renameCandidates.filter(c => c.kind === 'header').length}`" color="grey-3" text-color="grey-9" dense class="q-ml-sm" />
            </div>
            <q-list separator class="rounded-borders q-mb-md">
              <q-item
                v-for="cand in renameCandidates.filter(c => c.kind === 'header')"
                :key="cand.kind + '::' + cand.key"
                class="q-px-none row items-center">
                <q-item-section>
                  <q-item-label class="text-weight-medium text-grey-8 text-sm">
                    {{ cand.original }}
                    <q-icon
                      v-if="cand.isCustomized"
                      name="check_circle" size="13px" class="text-positive q-ml-xs" />
                  </q-item-label>
                  <q-item-label caption class="text-xs">Clave: {{ cand.key }}</q-item-label>
                </q-item-section>
                <q-item-section side style="min-width: 240px;">
                  <q-input
                    :model-value="cand.current"
                    dense outlined clearable
                    placeholder="Nombre personalizado"
                    @update:model-value="(v) => store.setCustomLabel('header', cand.key, v || '')" />
                </q-item-section>
              </q-item>
            </q-list>

            <!-- Series section -->
            <div
              v-if="renameCandidates.filter(c => c.kind === 'series').length"
              class="text-weight-bold text-grey-8 q-mb-sm row items-center">
              <q-icon name="stacked_bar_chart" size="16px" class="q-mr-xs text-secondary" />
              Series (valores de columnas pivote)
              <q-badge :label="`${renameCandidates.filter(c => c.kind === 'series').length}`" color="grey-3" text-color="grey-9" dense class="q-ml-sm" />
            </div>
            <q-list
              v-if="renameCandidates.filter(c => c.kind === 'series').length"
              separator class="rounded-borders">
              <q-item
                v-for="cand in renameCandidates.filter(c => c.kind === 'series')"
                :key="cand.kind + '::' + cand.key"
                class="q-px-none row items-center">
                <q-item-section>
                  <q-item-label class="text-weight-medium text-grey-8 text-sm">
                    {{ cand.original }}
                    <q-icon
                      v-if="cand.isCustomized"
                      name="check_circle" size="13px" class="text-positive q-ml-xs" />
                  </q-item-label>
                  <q-item-label caption class="text-xs">Clave: {{ cand.key }}</q-item-label>
                </q-item-section>
                <q-item-section side style="min-width: 240px;">
                  <q-input
                    :model-value="cand.current"
                    dense outlined clearable
                    placeholder="Nombre personalizado"
                    @update:model-value="(v) => store.setCustomLabel('series', cand.key, v || '')" />
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="between" class="q-pa-md bg-grey-1">
          <q-btn
            flat label="Restablecer Todo" color="negative" class="rounded-btn"
            :disable="!Object.keys(store.customLabels).length"
            @click="store.resetCustomLabels()" />
          <q-btn v-close-popup color="primary" label="Cerrar" class="rounded-btn text-weight-bold shadow-xs" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useDynamicQueryStore } from 'stores/dynamic-query-store';
import PivotTable from './PivotTable.vue';
import PivotChart from './PivotChart.vue';
import FilterEditorPanel from './FilterEditorPanel.vue';

const store = useDynamicQueryStore();

// ─── Local state ──────────────────────────────────────────────────────────────
const fieldSearch = ref('');
// Debounced search term, so `filteredFields` (which iterates all fields) doesn't
// recompute on every keystroke when there are many fields.
const debouncedSearch = ref('');
let searchTimer = null;
watch(fieldSearch, (val) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { debouncedSearch.value = val; }, 250);
});
const expandedCategories = ref({});
const dragOverZone = ref(null);
const activeTab = ref('table');
const pivotTableRef = ref(null);
const pivotChartRef = ref(null);

// Automatically expand field categories when they load asynchronously.
// `fieldsByCategory` is a computed that returns a new object reference whenever
// `availableFields` changes, so shallow watching is enough (no `deep` needed).
watch(() => store.fieldsByCategory, (newCats) => {
  if (!newCats) return;
  for (const cat of Object.keys(newCats)) {
    if (expandedCategories.value[cat] === undefined) {
      expandedCategories.value[cat] = true;
    }
  }
}, { immediate: true });

// Dialogs state
const showSaveDialog = ref(false);
const showDeleteDialog = ref(false);
const showColorDialog = ref(false);
const showLabelsDialog = ref(false);
const saveAsNew = ref(false);
const saveName = ref('');
const saveDescription = ref('');
const saveVisibility = ref('private');
const queryToDelete = ref(null);

// ─── Computed ─────────────────────────────────────────────────────────────────
const filteredFields = computed(() => {
  const search = (debouncedSearch.value || '').toLowerCase();
  const result = {};
  for (const [cat, fields] of Object.entries(store.fieldsByCategory)) {
    const filtered = search
      ? fields.filter(f => f.label.toLowerCase().includes(search) || f.key.toLowerCase().includes(search))
      : fields;
    if (filtered.length) result[cat] = filtered;
  }
  return result;
});

const currentChartSeries = computed(() => {
  const td = store.pivotTableData;
  if (!td.bodyRows?.length) return [];
  const type = store.chartType;
  const isPie = type === 'pie' || type === 'doughnut';

  if (isPie) {
    if (store.pivotRows.length === 0) {
      if (td.hasPivotColumns) {
        const valueHeaders = td.headers.filter(h => h.isValue);
        return valueHeaders.map(h => `${h.label} - ${h.subLabel}`);
      }
      const valueHeaderKeys = td.headers.filter((_, i) => i >= store.pivotRows.length);
      return valueHeaderKeys.map(h => h.label);
    }
    const rowHeaderKeys = td.headers.filter(h => h.isRowHeader).map(h => h.key);
    return td.bodyRows.map(row => rowHeaderKeys.map(k => row[k] || '').join(' | '));
  }

  if (td.hasPivotColumns) {
    const valueHeaders = td.headers.filter(h => h.isValue);
    const colValuesSet = [...new Set(valueHeaders.map(h => h.label))];
    return colValuesSet;
  }

  const valueHeaderKeys = td.headers.filter((_, i) => i >= store.pivotRows.length);
  return valueHeaderKeys.map(h => h.label);
});

// Candidatos a renombrar: lista combinada de headers + series del dataset actual.
// Cada entrada: { kind, key, original, current }
// `kind` distingue 'header' (columnas de la tabla) de 'series' (valores de columnas pivote / datasets del gráfico).
const renameCandidates = computed(() => {
  const td = store.pivotTableData;
  const result = [];
  if (!td.headers?.length) return result;

  // Headers (todas las columnas de la tabla)
  td.headers.forEach(h => {
    if (h.isRowHeader || !td.hasPivotColumns || h.isValue) {
      const kind = 'header';
      const mapKey = `${kind}::${h.key}`;
      const current = store.customLabels[mapKey];
      result.push({
        kind,
        key: h.key,
        original: h.rawLabel || h.label,
        current: current || '',
        isCustomized: !!current,
      });
    }
  });

  // Series (valores de columnas pivote) — solo aplica en cross-tab
  if (td.hasPivotColumns && td.colValues?.length) {
    td.colValues.forEach(cv => {
      const kind = 'series';
      const mapKey = `${kind}::${cv.raw}`;
      const current = store.customLabels[mapKey];
      result.push({
        kind,
        key: cv.raw,
        original: cv.raw,
        current: current || '',
        isCustomized: !!current,
      });
    });
  } else if (!td.hasPivotColumns) {
    // Modo simple: cada valor distinto de las columnas pivote = una serie (en el chart).
    // Lo derive de los labels del primer dataset del chartData.
    currentChartSeries.value.forEach(label => {
      const kind = 'series';
      const mapKey = `${kind}::${label}`;
      const current = store.customLabels[mapKey];
      result.push({
        kind,
        key: label,
        original: label,
        current: current || '',
        isCustomized: !!current,
      });
    });
  }

  return result;
});

// ─── Drag & Drop ──────────────────────────────────────────────────────────────
function onDragStart(event, field) {
  event.dataTransfer.setData('application/json', JSON.stringify(field));
  event.dataTransfer.effectAllowed = 'move';
}

function onDrop(event, zone) {
  dragOverZone.value = null;
  try {
    const field = JSON.parse(event.dataTransfer.getData('application/json'));
    store.addFieldToZone(field, zone);
  } catch { /* ignore */ }
}

function toggleCategory(cat) {
  expandedCategories.value[cat] = !expandedCategories.value[cat];
}

// Total de condiciones en todos los grupos (para badge superior)
const totalFilterConditions = computed(() =>
  store.pivotFilters.reduce((acc, g) => acc + g.conditions.length, 0)
);

// Resumen legible para el chip cuando hay una sola condición: "Estado = Miranda"
function conditionSummary(group) {
  if (!group.conditions.length) return '';
  const c = group.conditions[0];
  const op = store.getOperatorLabel(c.operator);
  const ar = store.operatorArity(c.operator);
  if (ar === 0) return op;
  if (ar === 2) return `${op} ${c.value}–${c.value2}`;
  return `${op} ${c.value}`;
}

// ─── Query Save Operations ────────────────────────────────────────────────────
function prepareSave(asNew = false) {
  saveAsNew.value = asNew;
  if (!asNew && store.currentQueryId) {
    // If updating, fill dialog with current details
    const curr = store.savedQueries.find(q => q.id === store.currentQueryId);
    saveName.value = curr?.name || store.currentQueryName || '';
    saveDescription.value = curr?.description || '';
    saveVisibility.value = curr?.visibility || 'private';
  } else {
    // New query
    saveName.value = store.currentQueryName ? `${store.currentQueryName} (copia)` : '';
    saveDescription.value = '';
    saveVisibility.value = 'private';
  }
  showSaveDialog.value = true;
}

async function handleSave() {
  if (saveAsNew.value) {
    store.currentQueryId = null;
  }
  const ok = await store.saveCurrentQuery(saveName.value, saveDescription.value, saveVisibility.value);
  if (ok) {
    showSaveDialog.value = false;
    saveAsNew.value = false;
  }
}

function confirmDeleteQuery(query) {
  queryToDelete.value = query;
  showDeleteDialog.value = true;
}

async function handleDeleteQuery() {
  if (!queryToDelete.value) return;
  const ok = await store.deleteSavedQuery(queryToDelete.value.id);
  if (ok) {
    showDeleteDialog.value = false;
    queryToDelete.value = null;
  }
}

// ─── Export functions ─────────────────────────────────────────────────────────
function exportCSV() {
  const data = store.pivotTableData;
  if (!data.bodyRows?.length) return;
  const headers = data.headers.map(h => h.subLabel ? `${h.label} - ${h.subLabel}` : h.label);
  const keys = data.headers.map(h => h.key);
  let csv = '\uFEFF' + headers.join(',') + '\n'; // Add UTF-8 BOM for Spanish characters in Excel
  data.bodyRows.forEach(row => {
    csv += keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return '""';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',') + '\n';
  });
  downloadFile(csv, `consulta-pivot-${store.currentQueryName || 'priorizados'}.csv`, 'text/csv;charset=utf-8');
}

function exportJSON() {
  const data = store.rawData;
  downloadFile(JSON.stringify(data, null, 2), `datos-raw-${store.currentQueryName || 'priorizados'}.json`, 'application/json');
}

async function exportExcel() {
  const XLSX = await import('xlsx');
  const data = store.pivotTableData;
  if (!data.bodyRows?.length) return;
  const headers = data.headers.map(h => h.subLabel ? `${h.label} - ${h.subLabel}` : h.label);
  const keys = data.headers.map(h => h.key);
  
  // Format numeric values
  const wsData = [
    headers,
    ...data.bodyRows.map(row => keys.map(k => {
      const val = row[k];
      const num = Number(val);
      return (!isNaN(num) && val !== '' && val !== null) ? num : (val ?? '');
    }))
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos Pivot');
  XLSX.writeFile(wb, `consulta-pivot-${store.currentQueryName || 'priorizados'}.xlsx`);
}

function exportChartPNG() {
  pivotChartRef.value?.exportPNG();
}

function exportChartPDF() {
  pivotChartRef.value?.exportPDF();
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
// Both loads run in parallel; category expansion is handled reactively by the
// `fieldsByCategory` watcher above (immediate:true), so no manual loop needed.
onMounted(() => {
  store.loadAvailableFields();
  store.loadSavedQueries();
});
</script>

<style scoped>
.dynamic-query-panel-root {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 180px); /* Adapt gracefully within the Quasar index tab */
  min-height: 580px;
  background: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* ─── Toolbar Styling ───────────────────────────────────────────── */
.dashboard-toolbar {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.text-primary-gradient {
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.toolbar-title {
  font-size: 16px;
  color: #1e293b;
}

.rounded-btn {
  border-radius: 8px;
}

.rounded-item {
  border-radius: 6px;
  transition: background 0.2s;
}
.rounded-item:hover {
  background: #f1f5f9;
}

/* ─── Layout ────────────────────────────────────────────────────── */
.dashboard-content-layout {
  flex: 1;
  overflow: hidden;
}

/* ─── Fields Sidebar ────────────────────────────────────────────── */
.fields-sidebar {
  width: 250px;
  min-width: 250px;
  background: white;
  border-right: 1px solid #e2e8f0;
  box-shadow: 1px 0 3px rgba(0, 0, 0, 0.01);
}

.panel-header {
  color: #1e293b;
  font-size: 14px;
}

.custom-search :deep(.q-field__control) {
  border-radius: 8px;
}

.field-category-box {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 4px;
}

.category-header-title {
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 6px;
}
.category-header-title:hover {
  background: #e2e8f0;
}

.draggable-field-chip {
  padding: 6px 10px;
  border-radius: 6px;
  background: white;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  cursor: grab;
  transition: all 0.2s;
  user-select: none;
}
.draggable-field-chip:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.08);
}
.draggable-field-chip:active {
  cursor: grabbing;
}

.field-label-text {
  color: #334155;
  font-size: 11.5px;
  max-width: 145px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.field-action-quick {
  opacity: 0;
  transition: opacity 0.2s;
}
.draggable-field-chip:hover .field-action-quick {
  opacity: 1;
}

/* ─── Center Workspace ──────────────────────────────────────────── */
.center-panel-workspace {
  background: #f8fafc;
  overflow-y: auto;
}

.shadow-light {
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);
  border: 1px solid #e2e8f0;
}

.shadow-light-top {
  box-shadow: 0 -2px 6px rgba(0,0,0,0.01);
  border: 1px solid #e2e8f0;
  border-bottom: none;
}

/* Dropzones */
.pivot-dropzones {
  border-radius: 12px;
}

.dropzone-box {
  border: 2px dashed #cbd5e1;
  background: #fafafb;
  border-radius: 8px;
  padding: 10px 12px;
  transition: all 0.2s;
  min-height: 48px;
  display: flex;
  flex-direction: column;
}
.dropzone-box.dropzone-active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.dropzone-header {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.dropzone-chips-container {
  flex: 1;
}

.dropzone-empty-text {
  font-size: 11px;
  user-select: none;
}

.pivot-badge {
  border-radius: 6px;
  font-size: 11px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.clickable-chip {
  cursor: pointer;
}

/* Execute animated button */
.execute-animated-btn {
  background: linear-gradient(135deg, #1e3b8b 0%, #2e5cb8 100%) !important;
  color: white !important;
  transition: all 0.3s;
  border-radius: 8px;
}
.execute-animated-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 92, 184, 0.3) !important;
}

/* Results panel */
.results-layout {
  min-height: 450px;
}

.rounded-t-borders {
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.rounded-b-borders {
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  border: 1px solid #e2e8f0;
}

.custom-tabs :deep(.q-tab__label) {
  font-size: 12px;
  font-weight: 600;
}

.chart-options-bar {
  border-radius: 8px;
}

.chart-toggle-group {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
}

.empty-state-card {
  border-radius: 12px;
}
.max-w-sm {
  max-width: 420px;
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease-out;
  overflow: hidden;
}
.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}
.slide-enter-to,
.slide-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* Dialog styling adjustments */
.glass-dropdown {
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}
</style>
