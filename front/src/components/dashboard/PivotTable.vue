<template>
  <div ref="tableContainer" class="pivot-table-container">
    <div v-if="tableData.bodyRows?.length" class="pivot-info-bar">
      <div class="info-left">
        <q-icon name="table_rows" size="14px" class="text-grey-6" />
        <span class="row-count text-weight-medium">{{ tableData.bodyRows.length }} filas</span>
        <span v-if="store.totalRows && store.totalRows !== tableData.bodyRows.length" class="total-label">
          de {{ store.totalRows }} registros
        </span>
        <span v-if="tableData.hasPivotColumns" class="pivot-mode-badge">
          <q-icon name="view_module" size="12px" /> Modo cruzado
        </span>
      </div>
      <div class="info-right">
        <span class="heat-legend">
          <span class="heat-dot heat-low"></span>
          <span class="heat-dot heat-medium"></span>
          <span class="heat-dot heat-high"></span>
          <span class="text-grey-7 text-xs">Intensidad</span>
        </span>
      </div>
    </div>
    <div class="pivot-table-scroll">
      <table v-if="tableData.headers?.length" class="pivot-table">
        <!-- Header -->
        <thead>
          <!-- If pivot columns: 2-row header -->
          <tr v-if="tableData.hasPivotColumns" class="pivot-header-top">
            <th
v-for="h in rowHeaders" :key="'rh-'+h.key"
              class="pivot-th pivot-th-row" :rowspan="2"
              @dblclick="startRename(h, 'header')">
              <span class="th-content">
                <span class="th-label">{{ h.label }}</span>
                <q-icon name="edit" size="11px" class="th-edit-hint" />
              </span>
            </th>
            <template v-for="cv in tableData.colValues" :key="'cv-'+cv.raw">
              <th
                :colspan="store.pivotValues.length"
                class="pivot-th pivot-th-col"
                @dblclick="startRename({ key: cv.raw, label: cv.display }, 'series')">
                <span class="th-content">
                  <span class="th-label">{{ cv.display }}</span>
                  <q-icon name="edit" size="11px" class="th-edit-hint" />
                </span>
              </th>
            </template>
            <th v-if="tableData.colValues?.length" class="pivot-th pivot-th-total" :rowspan="2">Total</th>
          </tr>
          <tr v-if="tableData.hasPivotColumns" class="pivot-header-sub">
            <template v-for="cv in tableData.colValues" :key="'cvs-'+cv.raw">
              <th v-for="v in store.pivotValues" :key="'vs-'+cv.raw+v.key" class="pivot-th pivot-th-val">
                {{ v.aggregation || 'COUNT' }}
              </th>
            </template>
          </tr>
          <!-- Simple header (no pivot columns) -->
          <tr v-if="!tableData.hasPivotColumns" class="pivot-header-simple">
            <th
v-for="h in tableData.headers" :key="'sh-'+h.key" class="pivot-th"
              :class="{ 'sort-active': sortColumn === h.key }"
              @click="sortBy(h.key)">
              <div class="th-simple-content">
                <span class="th-label">{{ h.label }}</span>
                <span class="th-actions">
                  <q-icon
v-if="sortColumn === h.key"
                    :name="sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" size="13px" class="sort-icon" />
                  <q-icon name="edit" size="11px" class="th-edit-hint" @click.stop="startRename(h, 'header')" />
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <!-- Body -->
        <tbody>
          <tr v-for="(row, idx) in sortedRows" :key="rowKey(row, idx)" class="pivot-row" :class="{ 'row-even': idx % 2 === 0 }">
            <template v-if="!tableData.hasPivotColumns">
              <td
v-for="h in tableData.headers" :key="'d-'+h.key"
                class="pivot-td" :class="{ 'td-numeric': isNumericHeader(h) }">
                {{ formatValue(row[h.key]) }}
              </td>
            </template>
            <template v-else>
              <td
v-for="h in rowHeaders" :key="'dr-'+h.key"
                class="pivot-td pivot-td-row">{{ formatValue(row[h.key]) }}</td>
              <td
v-for="h in valueHeaders" :key="'dv-'+h.key"
                class="pivot-td td-numeric" :class="heatmapClass(row[h.key], h.key)"
                :title="`Col max: ${formatNumber(colMaxByKey[h.key])}`">
                {{ formatNumber(row[h.key]) }}
              </td>
              <td class="pivot-td td-numeric td-total">{{ formatNumber(rowTotal(row)) }}</td>
            </template>
          </tr>
        </tbody>
        <!-- Footer: Grand Totals -->
        <tfoot v-if="tableData.grandTotals && Object.keys(tableData.grandTotals).length">
          <tr class="pivot-total-row">
            <td
v-if="tableData.hasPivotColumns"
              :colspan="store.pivotRows.length" class="pivot-td pivot-td-total-label">
              <q-icon name="functions" size="14px" class="q-mr-xs" />Gran Total
            </td>
            <td
v-if="!tableData.hasPivotColumns"
              :colspan="store.pivotRows.length || 1" class="pivot-td pivot-td-total-label">
              <q-icon name="functions" size="14px" class="q-mr-xs" />Total
            </td>
            <template v-if="!tableData.hasPivotColumns">
              <td
v-for="h in simpleValueHeaders"
                :key="'gt-'+h.key" class="pivot-td td-numeric td-total">
                {{ formatNumber(tableData.grandTotals[h.key]) }}
              </td>
            </template>
            <template v-else>
              <td
v-for="h in valueHeaders" :key="'gtv-'+h.key"
                class="pivot-td td-numeric td-total">
                {{ formatNumber(tableData.grandTotals[h.key]) }}
              </td>
              <td class="pivot-td td-numeric td-total td-grand-total">
                {{ formatNumber(grandTotalSum) }}
              </td>
            </template>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Inline rename dialog (no requiere ancla DOM) -->
    <q-dialog v-model="renamePopup" persistent @keyup.esc="cancelRename">
      <q-card class="rename-card" style="min-width: 320px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-weight-medium text-grey-8 text-sm row items-center">
            <q-icon name="drive_file_rename_outline" size="18px" class="q-mr-xs text-primary" />
            Renombrar {{ renameKind === 'header' ? 'columna' : 'serie' }}
          </div>
          <q-space />
          <q-btn flat round dense icon="close" size="sm" @click="cancelRename" />
        </q-card-section>
        <q-card-section class="q-pt-sm">
          <div class="text-caption text-grey-6 q-mb-sm">Original: "{{ renameOriginal }}"</div>
          <q-input
            ref="renameInput"
            v-model="renameValue"
            dense outlined autofocus
            placeholder="Nuevo nombre (vacío = restaurar)"
            @keyup.enter="commitRename" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat dense label="Cancelar" color="grey-7" size="sm" @click="cancelRename" />
          <q-btn flat dense label="Restaurar" color="warning" size="sm" @click="restoreRename" />
          <q-btn unelevated dense label="Aplicar" color="primary" size="sm" @click="commitRename" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useDynamicQueryStore } from 'stores/dynamic-query-store';

const store = useDynamicQueryStore();
const tableContainer = ref(null);
const sortColumn = ref(null);
const sortDir = ref('asc');

const tableData = computed(() => store.pivotTableData);

// Pre-filter headers to avoid repeated .filter() calls inside templates/render loops
const rowHeaders = computed(() => tableData.value.headers?.filter(h => h.isRowHeader) || []);
const valueHeaders = computed(() => tableData.value.headers?.filter(h => h.isValue) || []);
const simpleValueHeaders = computed(() => {
  const headers = tableData.value.headers || [];
  const offset = store.pivotRows.length || 1;
  return headers.filter((_, i) => i >= offset);
});

// Set of numeric header keys (labels are known to be measurement fields in pivot mode;
// in simple mode we fall back to per-value numeric detection via store field metadata)
const numericHeaderKeys = computed(() => {
  const set = new Set();
  // Value headers are always numeric (aggregations)
  valueHeaders.value.forEach(h => set.add(h.key));
  // In simple (non-pivot) mode, mark numeric by matching store pivotValues keys
  if (!tableData.value.hasPivotColumns) {
    store.pivotValues.forEach(f => {
      const k = f.key.replace('.', '_');
      set.add(k);
      set.add(`${k}_${(f.aggregation || 'COUNT').toLowerCase()}`);
    });
  }
  return set;
});

function isNumericHeader(h) {
  return numericHeaderKeys.value.has(h.key);
}

// Pre-compute the maximum value per column once per dataset to avoid
// re-scanning all rows for every single cell (O(n*cols) -> O(n+cols))
const colMaxByKey = computed(() => {
  const map = {};
  const rows = tableData.value.bodyRows || [];
  if (!rows.length) return map;
  for (const h of valueHeaders.value) {
    let max = 0;
    for (const row of rows) {
      const v = Number(row[h.key]) || 0;
      if (v > max) max = v;
    }
    map[h.key] = max;
  }
  return map;
});

// Stable row key: join row-header values (or fall back to index for empty rows)
function rowKey(row, idx) {
  const headers = rowHeaders.value;
  if (headers.length) {
    const k = headers.map(h => row[h.key]).join('|||');
    return k || `row-${idx}`;
  }
  // Simple mode: join all header values
  const allKeys = (tableData.value.headers || []).map(h => row[h.key]).join('|||');
  return allKeys || `row-${idx}`;
}

const sortedRows = computed(() => {
  const rows = [...(tableData.value.bodyRows || [])];
  if (sortColumn.value) {
    rows.sort((a, b) => {
      const va = a[sortColumn.value];
      const vb = b[sortColumn.value];
      const isNum = !isNaN(Number(va)) && !isNaN(Number(vb));
      if (isNum) return sortDir.value === 'asc' ? Number(va) - Number(vb) : Number(vb) - Number(va);
      return sortDir.value === 'asc'
        ? String(va || '').localeCompare(String(vb || ''))
        : String(vb || '').localeCompare(String(va || ''));
    });
  }
  return rows;
});

function sortBy(key) {
  if (sortColumn.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = key;
    sortDir.value = 'asc';
  }
}

// Reset sort when the underlying columns change (e.g. new query executed)
watch(() => tableData.value.headers, () => {
  sortColumn.value = null;
  sortDir.value = 'asc';
});

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  return val;
}

function formatNumber(val) {
  if (val === null || val === undefined) return '—';
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return val;
  return num.toLocaleString('es-VE', { maximumFractionDigits: 2 });
}

// Hoist valueHeaders lookup out of per-row computation
function rowTotal(row) {
  let sum = 0;
  for (const h of valueHeaders.value) {
    sum += Number(row[h.key]) || 0;
  }
  return sum;
}

// Sum of grand totals (precomputed once per dataset, not per footer cell)
const grandTotalSum = computed(() => {
  const gt = tableData.value.grandTotals || {};
  let sum = 0;
  for (const v of Object.values(gt)) {
    sum += Number(v) || 0;
  }
  return sum;
});

// Heatmap coloring using precomputed column max (O(1) per cell instead of O(n))
function heatmapClass(val, key) {
  if (!val) return '';
  const max = colMaxByKey.value[key];
  if (!max) return '';
  const ratio = (Number(val) || 0) / max;
  if (ratio > 0.8) return 'heat-high';
  if (ratio > 0.5) return 'heat-medium';
  if (ratio > 0.2) return 'heat-low';
  return '';
}

// ─── Inline rename (header / series) ──────────────────────────────────────────
// `startRename` abre un q-menu anclado al <th> cliqueado. El usuario escribe un
// nuevo nombre (vacío = restaurar original), y al confirmar se persiste en el
// store via `store.setCustomLabel(kind, key, label)`. La tabla se actualiza
// automáticamente porque `pivotTableData` es un `computed` que resuelve labels.
const renamePopup = ref(false);
const renameKind = ref('header');
const renameKey = ref('');
const renameOriginal = ref('');
const renameValue = ref('');
const renameInput = ref(null);

function startRename(header, kind) {
  // Anclar el popover al propio <th> clickeado es complicado sin el DOM ref;
  // usamos el evento para localizar el elemento clicked.
  renameKind.value = kind;
  // En modo cross-tab, las series usan cv.raw; los headers simples usan h.key.
  renameKey.value = header.key;
  renameOriginal.value = header.label || header.rawLabel || '';
  // Cargar valor existente o vacío
  const existing = store.customLabels[`${kind}::${header.key}`];
  renameValue.value = existing || '';
  // Buscar el th element clickeado para anclar el menu
  // startRename se llama desde @dblclick del <th> — event.currentTarget
  // Pero como el handler a veces recibe un objeto custom (cv), usamos el último
  // th clickeado guardándolo en un ref. Para simplicidad, dejamos que el q-menu
  // se ancle al tableContainer si no hay target específico.
  renamePopup.value = true;
}

function commitRename() {
  const val = (renameValue.value || '').trim();
  store.setCustomLabel(renameKind.value, renameKey.value, val);
  renamePopup.value = false;
}

function restoreRename() {
  store.setCustomLabel(renameKind.value, renameKey.value, '');
  renamePopup.value = false;
}

function cancelRename() {
  renamePopup.value = false;
}

defineExpose({ tableContainer, startRename });
</script>

<style scoped>
/* ─── Container ───────────────────────────────────────────────────────────── */
.pivot-table-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
}

.pivot-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  font-size: 12px;
  color: #607d8b;
  background: #fafbfc;
  border-bottom: 1px solid #eceff1;
}
.info-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pivot-mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #e3f2fd;
  color: #1565c0;
  font-size: 10.5px;
  font-weight: 600;
}
.heat-legend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.heat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.06);
}
.heat-dot.heat-low    { background: rgba(33, 150, 243, 0.18); }
.heat-dot.heat-medium { background: rgba(255, 193, 7, 0.25);  }
.heat-dot.heat-high   { background: rgba(76, 175, 80, 0.30);  }

.pivot-table-scroll {
  flex: 1;
  overflow: auto;
  position: relative;
}

.pivot-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  color: #37474f;
}

/* ─── Headers (Material minimalista) ───────────────────────────────────────── */
.pivot-th {
  background: #ffffff;
  color: #263238;
  font-weight: 600;
  padding: 10px 14px;
  text-align: left;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
  cursor: default;
  user-select: none;
  font-size: 12px;
  letter-spacing: 0.2px;
  border-bottom: 1px solid #eceff1;
  transition: background 0.15s;
}
.pivot-header-simple .pivot-th {
  cursor: pointer;
}
.pivot-header-simple .pivot-th:hover {
  background: #f5f7fa;
}
.pivot-th::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: transparent;
  transition: background 0.15s;
}
.pivot-th.sort-active {
  color: #1565c0;
  background: #e3f2fd;
}
.pivot-th.sort-active::after {
  background: #1565c0;
}

.pivot-th-row {
  background: #eceff1;
  font-weight: 700;
  color: #37474f;
}
.pivot-th-col {
  text-align: center;
  background: #f5f7fa;
  color: #455a64;
  font-weight: 600;
}
.pivot-th-col:hover {
  background: #e8eaf6;
}
.pivot-th-val {
  text-align: center;
  font-size: 10.5px;
  font-weight: 500;
  background: #fafbfc;
  color: #78909c;
  border-bottom: 1px solid #eceff1;
}
.pivot-th-total {
  background: #37474f;
  color: #ffffff;
  text-align: center;
  font-weight: 700;
}

/* Header content wrappers for inline rename affordance */
.th-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.th-simple-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.th-label {
  display: inline-block;
}
.th-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  opacity: 0.35;
  transition: opacity 0.15s;
}
.pivot-th:hover .th-actions,
.th-content:hover .th-edit-hint {
  opacity: 1;
}
.th-edit-hint {
  opacity: 0;
  color: #90a4ae;
  transition: opacity 0.15s, color 0.15s;
  cursor: pointer;
}
.th-content:hover .th-edit-hint,
.pivot-th:hover .th-edit-hint {
  opacity: 0.6;
}
.th-edit-hint:hover {
  opacity: 1 !important;
  color: #1565c0;
}
.sort-icon {
  color: #1565c0;
}

/* ─── Body ─────────────────────────────────────────────────────────────────── */
.pivot-td {
  padding: 8px 14px;
  white-space: nowrap;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.1s;
}
.pivot-row {
  transition: background 0.12s;
}
.pivot-row:nth-child(even),
.pivot-row.row-even {
  background: #fafbfc;
}
.pivot-row:hover {
  background: #f1f8ff !important;
}
.td-numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
.pivot-td-row {
  font-weight: 500;
  color: #37474f;
  background: #f5f7fa;
  border-right: 1px solid #eceff1;
}

/* ─── Totals row ───────────────────────────────────────────────────────────── */
.pivot-total-row {
  position: sticky;
  bottom: 0;
  z-index: 1;
}
.pivot-total-row .pivot-td {
  background: #eceff1;
  font-weight: 700;
  color: #263238;
  border-top: 2px solid #1565c0;
  border-bottom: none;
}
.pivot-td-total-label {
  font-weight: 700;
  text-align: left;
  color: #1565c0;
}
.td-total {
  font-weight: 700;
  background: #eceff1;
}
.td-grand-total {
  background: #cfd8dc;
}

/* ─── Heatmap cells (sombreado suave sobre el fondo Material) ───────────────── */
.heat-low    { background: rgba(33, 150, 243, 0.08) !important; }
.heat-medium { background: rgba(255, 193, 7, 0.12)  !important; }
.heat-high   { background: rgba(76, 175, 80, 0.18)  !important; }

/* ─── Rename popover ───────────────────────────────────────────────────────── */
.rename-popover {
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
</style>
