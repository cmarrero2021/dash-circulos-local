<template>
  <div class="pivot-table-wrapper">

    <!-- ─── Controls bar ─────────────────────────────────────────────────────── -->
    <div v-if="tableData.bodyRows?.length" class="pivot-controls-bar">
      <!-- Row count label -->
      <div class="row items-center q-gutter-xs text-caption text-grey-7">
        <q-icon name="table_rows" size="14px" />
        <span><strong>{{ tableData.bodyRows.length }}</strong> filas</span>
        <span v-if="tableData.hasPivotColumns" class="pivot-mode-chip">Modo cruzado</span>
      </div>

      <div class="row items-center q-gutter-sm">
        <!-- Visible rows selector -->
        <div class="row items-center q-gutter-xs no-wrap">
          <q-icon name="height" size="13px" class="text-grey-6" />
          <q-select
            v-model="visibleRows"
            :options="rowOptions"
            dense outlined emit-value map-options
            class="rows-select"
            behavior="menu"
          />
        </div>

        <!-- Display mode toggle -->
        <q-btn-toggle
          v-model="displayMode"
          dense flat
          toggle-color="primary"
          class="mode-toggle"
          :options="[
            { label: 'Valores', value: 'values' },
            { label: '%',       value: 'pct'    },
            { label: 'Ambos',   value: 'both'   },
          ]"
        />
      </div>
    </div>

    <!-- ─── Scroll container ──────────────────────────────────────────────────── -->
    <div class="pivot-scroll" :style="tableScrollStyle">
      <table v-if="tableData.headers?.length" class="pivot-tbl">

        <!-- ══ THEAD ═══════════════════════════════════════════════════════════ -->
        <thead>

          <!-- Cross-tab: 2-row header ----------------------------------------- -->
          <tr v-if="tableData.hasPivotColumns">
            <!-- Row-dimension headers (span 2 rows) -->
            <th
              v-for="h in rowHeaders"
              :key="'rh-' + h.key"
              rowspan="2"
              class="pt-th pt-th-dim text-left"
              @dblclick="startRename(h, 'header')"
            >{{ h.label }}<q-icon name="edit" size="10px" class="edit-hint q-ml-xs" /></th>

            <!-- Column-group headers -->
            <th
              v-for="cv in tableData.colValues"
              :key="'cg-' + cv.raw"
              :colspan="subHeaderColspan"
              class="pt-th pt-th-colgroup text-center"
              @dblclick="startRename({ key: cv.raw, label: cv.display }, 'series')"
            >{{ cv.display }}<q-icon name="edit" size="10px" class="edit-hint q-ml-xs" /></th>

            <!-- Grand-total header -->
            <th v-if="tableData.colValues?.length" rowspan="2" class="pt-th pt-th-total text-right">TOTAL</th>
          </tr>

          <!-- Cross-tab row 2: sub-column headers (agg names) -->
          <tr v-if="tableData.hasPivotColumns">
            <template v-for="cv in tableData.colValues" :key="'cs-' + cv.raw">
              <template v-for="v in store.pivotValues" :key="'vs-' + cv.raw + v.key">
                <th v-if="displayMode !== 'pct'"    class="pt-th pt-th-val text-right">{{ aggLabel(v) }}</th>
                <th v-if="displayMode !== 'values'" class="pt-th pt-th-pct text-right">{{ aggLabel(v) }} %</th>
              </template>
            </template>
          </tr>

          <!-- Simple: 1-row header -------------------------------------------- -->
          <tr v-if="!tableData.hasPivotColumns">
            <th
              v-for="h in simpleRowHeaders"
              :key="'srh-' + h.key"
              class="pt-th pt-th-dim text-left"
              :class="{ 'sort-active': sortColumn === h.key }"
              @click="sortBy(h.key)"
            >
              {{ h.label }}
              <q-icon v-if="sortColumn === h.key" :name="sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" size="11px" />
              <q-icon name="edit" size="10px" class="edit-hint q-ml-xs" @click.stop="startRename(h, 'header')" />
            </th>

            <th
              v-for="h in effectiveSimpleValueHeaders"
              :key="'svh-' + h.key"
              class="pt-th text-right"
              :class="{
                'pt-th-val': !h._isPct,
                'pt-th-pct': h._isPct,
                'sort-active': !h._isPct && sortColumn === (h._srcKey || h.key),
              }"
              @click="!h._isPct ? sortBy(h._srcKey || h.key) : null"
            >
              {{ h.label }}
              <q-icon v-if="!h._isPct && sortColumn === (h._srcKey || h.key)" :name="sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" size="11px" />
              <q-icon v-if="!h._isPct" name="edit" size="10px" class="edit-hint q-ml-xs" @click.stop="startRename(h, 'header')" />
            </th>
          </tr>
        </thead>

        <!-- ══ TBODY ═══════════════════════════════════════════════════════════ -->
        <tbody>
          <tr
            v-for="(row, idx) in sortedRows"
            :key="rowKey(row, idx)"
            class="pivot-row"
            :class="{ 'row-odd': idx % 2 !== 0 }"
          >
            <!-- Simple mode -->
            <template v-if="!tableData.hasPivotColumns">
              <td v-for="h in simpleRowHeaders"  :key="'dr-' + h.key" class="pt-td pt-td-dim">{{ formatValue(row[h.key]) }}</td>
              <td
                v-for="h in effectiveSimpleValueHeaders"
                :key="'dv-' + h.key"
                class="pt-td text-right"
                :class="{ 'pt-td-pct': h._isPct }"
              >{{ h._isPct ? calcPct(row[h._srcKey], h._srcKey) : formatNumber(row[h.key]) }}</td>
            </template>

            <!-- Cross-tab mode -->
            <template v-else>
              <td v-for="h in rowHeaders" :key="'rr-' + h.key" class="pt-td pt-td-dim">{{ formatValue(row[h.key]) }}</td>

              <template v-for="cv in tableData.colValues" :key="'cvb-' + cv.raw">
                <template v-for="v in store.pivotValues" :key="'vb-' + cv.raw + v.key">
                  <td v-if="displayMode !== 'pct'"    class="pt-td text-right">{{ formatNumber(row[pivotCellKey(cv, v)]) }}</td>
                  <td v-if="displayMode !== 'values'" class="pt-td text-right pt-td-pct">{{ calcPct(row[pivotCellKey(cv, v)], pivotCellKey(cv, v)) }}</td>
                </template>
              </template>

              <td class="pt-td text-right pt-td-total">{{ formatNumber(rowTotal(row)) }}</td>
            </template>
          </tr>
        </tbody>

        <!-- ══ TFOOT ════════════════════════════════════════════════════════════ -->
        <tfoot v-if="tableData.grandTotals && Object.keys(tableData.grandTotals).length">
          <tr class="pivot-total-row">
            <!-- Simple -->
            <td
              v-if="!tableData.hasPivotColumns"
              :colspan="store.pivotRows.length || 1"
              class="pt-td pt-td-total-label"
            >TOTAL</td>
            <template v-if="!tableData.hasPivotColumns">
              <td
                v-for="h in effectiveSimpleValueHeaders"
                :key="'gt-' + h.key"
                class="pt-td text-right pt-td-total"
                :class="{ 'pt-td-pct': h._isPct }"
              >{{ h._isPct ? '100.0%' : formatNumber(tableData.grandTotals[h._srcKey || h.key]) }}</td>
            </template>

            <!-- Cross-tab -->
            <td
              v-if="tableData.hasPivotColumns"
              :colspan="store.pivotRows.length"
              class="pt-td pt-td-total-label"
            >TOTAL</td>
            <template v-if="tableData.hasPivotColumns">
              <template v-for="cv in tableData.colValues" :key="'cvgt-' + cv.raw">
                <template v-for="v in store.pivotValues" :key="'vgt-' + cv.raw + v.key">
                  <td v-if="displayMode !== 'pct'"    class="pt-td text-right pt-td-total">{{ formatNumber(tableData.grandTotals[pivotCellKey(cv, v)]) }}</td>
                  <td v-if="displayMode !== 'values'" class="pt-td text-right pt-td-pct pt-td-total">100.0%</td>
                </template>
              </template>
              <td class="pt-td text-right pt-td-total">{{ formatNumber(grandTotalSum) }}</td>
            </template>
          </tr>
        </tfoot>
      </table>

      <!-- Empty state -->
      <div v-else class="pivot-empty text-center text-grey-5 q-pa-xl">
        <q-icon name="table_chart" size="48px" class="q-mb-sm" />
        <div class="text-body2">Ejecuta una consulta para ver los datos aquí</div>
      </div>
    </div>

    <!-- ─── Inline rename dialog ─────────────────────────────────────────────── -->
    <q-dialog v-model="renamePopup" persistent>
      <q-card style="min-width: 320px;">
        <q-card-section class="row items-center q-pb-none">
          <span class="text-weight-medium">Renombrar {{ renameKind === 'header' ? 'columna' : renameKind === 'agg' ? 'agregación' : 'serie' }}</span>
          <q-space /><q-btn flat round dense icon="close" size="sm" @click="cancelRename" />
        </q-card-section>
        <q-card-section>
          <div class="text-caption text-grey-6 q-mb-sm">Original: "{{ renameOriginal }}"</div>
          <q-input
            ref="renameInput"
            v-model="renameValue"
            dense outlined autofocus
            placeholder="Nuevo nombre (vacío = restaurar)"
            @keyup.enter="commitRename"
          />
        </q-card-section>
        <q-card-actions align="right">
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

const tableData = computed(() => store.pivotTableData);

// ─── Display controls ────────────────────────────────────────────────────────
const visibleRows  = ref(10);
const displayMode  = ref('values'); // 'values' | 'pct' | 'both'

const rowOptions = [
  { label: '10 filas',  value: 10   },
  { label: '20 filas',  value: 20   },
  { label: '50 filas',  value: 50   },
  { label: '100 filas', value: 100  },
  { label: 'Todas',     value: 'all' },
];

const ROW_H    = 30;   // px per data row (dense)
const THEAD_H  = 34;   // 1-row header
const THEAD2_H = 62;   // 2-row header (cross-tab)
const FOOT_H   = 34;   // sticky tfoot
const MIN_ROWS = 10;

const tableScrollStyle = computed(() => {
  const headerH = tableData.value.hasPivotColumns ? THEAD2_H : THEAD_H;
  const minH = `${MIN_ROWS * ROW_H + headerH + FOOT_H}px`;
  if (visibleRows.value === 'all') {
    return { maxHeight: 'calc(100vh - 360px)', minHeight: minH };
  }
  const h = visibleRows.value * ROW_H + headerH + FOOT_H;
  return { maxHeight: `${h}px`, minHeight: minH };
});

// ─── Cross-tab colspan ───────────────────────────────────────────────────────
const subHeaderColspan = computed(() => {
  const b = store.pivotValues.length;
  return displayMode.value === 'both' ? b * 2 : b;
});

// ─── Aggregation label with alias ────────────────────────────────────────────
function aggLabel(v) {
  return store.customLabels[`agg::${v.key}`] || v.aggregation || 'COUNT';
}

// ─── Cell key (cross-tab) ────────────────────────────────────────────────────
function pivotCellKey(cv, v) {
  return `${cv.raw}__${v.key}`;
}

// ─── Percentage ──────────────────────────────────────────────────────────────
function calcPct(val, key) {
  const num = Number(val) || 0;
  const gt  = Number(tableData.value.grandTotals?.[key]) || 0;
  if (!gt) return '—';
  return (num / gt * 100).toFixed(1) + '%';
}

// ─── Header partitions ───────────────────────────────────────────────────────
const rowHeaders = computed(() => tableData.value.headers?.filter(h => h.isRowHeader) || []);
const valueHeaders = computed(() => tableData.value.headers?.filter(h => h.isValue) || []);

const simpleRowHeaders = computed(() => {
  if (tableData.value.hasPivotColumns) return [];
  return (tableData.value.headers || []).slice(0, store.pivotRows.length);
});
const simpleValueHeaders = computed(() =>
  (tableData.value.headers || []).slice(store.pivotRows.length)
);
const effectiveSimpleValueHeaders = computed(() => {
  const base = simpleValueHeaders.value;
  if (displayMode.value === 'values') return base.map(h => ({ ...h, _isPct: false }));
  if (displayMode.value === 'pct')    return base.map(h => ({ ...h, label: h.label + ' %', _isPct: true, _srcKey: h.key }));
  const result = [];
  for (const h of base) {
    result.push({ ...h, _isPct: false });
    result.push({ ...h, key: h.key + '__pct', label: h.label + ' %', _isPct: true, _srcKey: h.key });
  }
  return result;
});

// ─── Row total (cross-tab) ───────────────────────────────────────────────────
function rowTotal(row) {
  return valueHeaders.value.reduce((s, h) => s + (Number(row[h.key]) || 0), 0);
}

const grandTotalSum = computed(() =>
  Object.values(tableData.value.grandTotals || {}).reduce((s, v) => s + (Number(v) || 0), 0)
);

// ─── Sorting ─────────────────────────────────────────────────────────────────
const sortColumn = ref(null);
const sortDir    = ref('asc');

function sortBy(key) {
  if (sortColumn.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = key;
    sortDir.value = 'asc';
  }
}

const sortedRows = computed(() => {
  const rows = [...(tableData.value.bodyRows || [])];
  if (sortColumn.value) {
    rows.sort((a, b) => {
      const va = a[sortColumn.value], vb = b[sortColumn.value];
      const num = !isNaN(Number(va)) && !isNaN(Number(vb));
      if (num) return sortDir.value === 'asc' ? Number(va) - Number(vb) : Number(vb) - Number(va);
      return sortDir.value === 'asc'
        ? String(va || '').localeCompare(String(vb || ''))
        : String(vb || '').localeCompare(String(va || ''));
    });
  }
  return rows;
});

watch(() => tableData.value.headers, () => { sortColumn.value = null; sortDir.value = 'asc'; });

// ─── Row key ─────────────────────────────────────────────────────────────────
function rowKey(row, idx) {
  const keys = rowHeaders.value.length ? rowHeaders.value : (tableData.value.headers || []);
  const k = keys.map(h => row[h.key]).join('|||');
  return k || `r-${idx}`;
}

// ─── Formatters ──────────────────────────────────────────────────────────────
function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  return val;
}
function formatNumber(val) {
  if (val === null || val === undefined) return '—';
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return val;
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(num);
}

// ─── Inline rename ────────────────────────────────────────────────────────────
const renamePopup    = ref(false);
const renameKind     = ref('header');
const renameKey      = ref('');
const renameOriginal = ref('');
const renameValue    = ref('');

function startRename(header, kind) {
  renameKind.value     = kind;
  renameKey.value      = header.key;
  renameOriginal.value = header.label || '';
  renameValue.value    = store.customLabels[`${kind}::${header.key}`] || '';
  renamePopup.value    = true;
}
function commitRename() {
  store.setCustomLabel(renameKind.value, renameKey.value, (renameValue.value || '').trim());
  renamePopup.value = false;
}
function restoreRename() {
  store.setCustomLabel(renameKind.value, renameKey.value, '');
  renamePopup.value = false;
}
function cancelRename() { renamePopup.value = false; }

defineExpose({ startRename });
</script>

<style scoped>
/* ─── Wrapper ────────────────────────────────────────────────────────────────── */
.pivot-table-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: 'Roboto', 'Segoe UI', -apple-system, sans-serif;
}

/* ─── Controls bar ───────────────────────────────────────────────────────────── */
.pivot-controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  padding: 5px 10px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
}

.pivot-mode-chip {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 10px;
  background: #e3f2fd;
  color: #1565c0;
  font-size: 10.5px;
  font-weight: 600;
}

/* Compact select */
.rows-select { min-width: 105px; }
.rows-select :deep(.q-field__control) { height: 26px; min-height: 26px; padding: 0 8px; font-size: 11.5px; }
.rows-select :deep(.q-field__native)  { font-size: 11.5px; padding: 0; min-height: unset; }
.rows-select :deep(.q-field__append)  { height: 26px; }

.mode-toggle { border: 1px solid #e0e0e0; border-radius: 4px; background: #f5f5f5; font-size: 11.5px; }
.mode-toggle :deep(.q-btn) { padding: 0 8px; height: 24px; font-size: 11.5px; min-height: unset; }

/* ─── Scroll area ────────────────────────────────────────────────────────────── */
.pivot-scroll {
  overflow: auto;
  flex: 1;
  position: relative;
}

/* ─── Table  (mirrors q-table flat dense) ────────────────────────────────────── */
.pivot-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  color: #212121;
}

/* ── Headers ─────────────────────────────────────────────────────────────────── */
.pt-th {
  font-weight: bold;
  font-size: 0.74rem;
  padding: 7px 5px;
  white-space: nowrap;
  border-bottom: 1px solid #bdbdbd;
  border-right: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  background: #eeeeee;    /* matches bg-grey-3 from the reference table */
  z-index: 2;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.pt-th:last-child { border-right: none; }

/* Dimension (row-group) column header */
.pt-th-dim { background: #eeeeee; color: #424242; }

/* Column-group (pivot cross) header — each group gets a tint */
.pt-th-colgroup { background: #bbdefb; color: #0d47a1; }  /* blue-2 */

/* Value sub-column header */
.pt-th-val { background: #e3f2fd; color: #1565c0; }       /* blue-1 */

/* Percentage sub-column header */
.pt-th-pct { background: #f3e5f5; color: #6a1b9a; }       /* purple-1 */

/* Grand total column header */
.pt-th-total { background: #eeeeee; color: #37474f; }

/* Sorting active */
.pt-th.sort-active { background: #c8e6c9; color: #1b5e20; }

/* Edit hint icon */
.edit-hint { opacity: 0; transition: opacity 0.15s; cursor: pointer; }
.pt-th:hover .edit-hint { opacity: 0.55; }
.edit-hint:hover { opacity: 1 !important; }

/* ── Cells ───────────────────────────────────────────────────────────────────── */
.pt-td {
  padding: 5px 5px;
  font-size: 0.84rem;
  border-bottom: 1px solid #f5f5f5;
  border-right: 1px solid #f5f5f5;
  white-space: nowrap;
}
.pt-td:last-child { border-right: none; }

/* Zebra stripes */
.pivot-row.row-odd { background: #fafafa; }
.pivot-row:hover { background: #e3f2fd !important; }

/* Dimension cell */
.pt-td-dim { font-weight: 500; color: #37474f; }

/* Percentage cells */
.pt-td-pct { background: rgba(243, 229, 245, 0.4); color: #6a1b9a; font-size: 0.78rem; }

/* Total column cell */
.pt-td-total { font-weight: bold; }

/* ── Footer (sticky totals) ──────────────────────────────────────────────────── */
.pivot-total-row { position: sticky; bottom: 0; z-index: 1; }
.pivot-total-row .pt-td {
  background: #eeeeee;
  font-weight: bold;
  font-size: 0.82rem;
  border-top: 2px solid #9e9e9e;
  border-bottom: none;
  color: #212121;
}
.pt-td-total-label { text-align: left; color: #424242; }

/* ── Empty state ─────────────────────────────────────────────────────────────── */
.pivot-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: #9e9e9e;
}
</style>
