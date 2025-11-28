<template>
    <div class="mapa-venezuela-container">
        <div ref="mapContainer" class="map-container"></div>
        <q-btn
v-if="selectedState" round class="clear-filter-btn" color="primary" icon="close" size="md"
            @click="clearStateFilter">
            <q-tooltip>Limpiar filtro y ver vista nacional</q-tooltip>
        </q-btn>
        <div v-if="selectedState" class="selected-state-badge">
            <q-chip removable color="primary" text-color="white" icon="place" @remove="clearStateFilter">
                {{ selectedState.nombre }} - {{ selectedState.porcentaje }}%
            </q-chip>
        </div>
    </div>
</template>
<script>
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDashboardStore } from 'stores/dashboard-store';
import { api } from 'boot/axios';
export default defineComponent({
    name: 'MapaVenezuela',
    setup() {
        const dashboardStore = useDashboardStore();
        const mapContainer = ref(null);
        let map = null;
        let estadosLayer = null;
        const selectedState = ref(null);
        const estadosData = ref([]);
        const getColor = (p) => {
            if (p == null || p === undefined || isNaN(p)) return '#808080';
            const num = Number(p);
            if (num >= 80) return '#2e7d32';
            if (num >= 60) return '#c0ca33';
            if (num >= 40) return '#ffeb3b';
            if (num >= 20) return '#ff9800';
            return '#d32f2f';
        };
        const findEstadoById = (sid) => estadosData.value.find(e => Number(e.estado_id) === Number(sid));
        const stateStyle = (f) => {
            const est = findEstadoById(f.properties.state_id);
            return { fillColor: getColor(est ? parseFloat(est.porcentaje) : null), weight: 2, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 0.7 };
        };
        const highlightFeature = (e) => {
            e.target.setStyle({ weight: 3, color: '#666', dashArray: '', fillOpacity: 0.9 });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();
        };
        const resetHighlight = (e) => estadosLayer.resetStyle(e.target);
        const clickState = (e) => {
            const sid = e.target.feature.properties.state_id;
            const est = findEstadoById(sid);
            const nom = est ? (est.estado || est.estado_nombre || (e.target.feature.properties.NAM || '').replace(/^ESTADO\s+(BOLIVARIANO\s+)?/i, '')) : (e.target.feature.properties.NAM || '').replace(/^ESTADO\s+(BOLIVARIANO\s+)?/i, '');
            selectedState.value = { id: sid, nombre: nom, porcentaje: est ? parseFloat(est.porcentaje).toFixed(2) : '0.00' };
            dashboardStore.setManualStateFilter(Number(sid));
            map.fitBounds(e.target.getBounds());
        };
        const clearStateFilter = () => {
            selectedState.value = null;
            dashboardStore.clearManualStateFilter();
            if (map) map.setView([8, -66], 6);
        };
        const onEachFeature = (f, layer) => {
            const sid = f.properties.state_id;
            const est = findEstadoById(sid);
            const nom = est ? (est.estado || est.estado_nombre || (f.properties.NAM || '').replace(/^ESTADO\s+(BOLIVARIANO\s+)?/i, '')) : (f.properties.NAM || '').replace(/^ESTADO\s+(BOLIVARIANO\s+)?/i, '');
            const meta = est ? (est.meta_circulo || 0) : 0;
            const circulos = est ? (est.circulos || 0) : 0;
            const pct = est ? parseFloat(est.porcentaje) : 0;

            const popupContent = `
                <div style="text-align:center; padding: 5px;">
                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1976d2;">CÍRCULOS</div>
                    <div style="margin: 3px 0;"><strong>ESTADO:</strong> ${nom}</div>
                    <div style="margin: 3px 0;"><strong>META:</strong> ${meta.toLocaleString('de-DE')}</div>
                    <div style="margin: 3px 0;"><strong>CUMPLIMIENTO:</strong> ${circulos.toLocaleString('de-DE')}</div>
                    <div style="margin: 3px 0;"><strong>PORCENTAJE:</strong> ${pct.toFixed(2)}%</div>
                </div>
            `;
            layer.bindPopup(popupContent);
            layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: clickState });
        };
        const loadMapaData = async () => {
            try {
                const response = await api.get('/dashboard/mapa-estados');
                estadosData.value = response.data;
                console.log('[Mapa] Datos cargados:', estadosData.value.length, 'estados');
                if (estadosData.value.length > 0) {
                    console.log('[Mapa] Ejemplo:', estadosData.value[0]);
                }
                return true;
            } catch (error) {
                console.error('[Mapa] Error:', error.message);
                return false;
            }
        };
        const addLegend = () => {
            const legend = L.control({ position: 'bottomleft' });
            legend.onAdd = function () {
                const d = L.DomUtil.create('div', 'info legend');
                const g = [0, 20, 40, 60, 80];
                d.innerHTML = '<strong>Cumplimiento (%)</strong><br>';
                for (let i = 0; i < g.length; i++) {
                    d.innerHTML += '<i style="background:' + getColor(g[i] + 1) + '; width:18px;height:18px;float:left;margin-right:8px;opacity:0.7;"></i> ' + g[i] + (g[i + 1] ? '&ndash;' + g[i + 1] + '<br>' : '+');
                }
                return d;
            };
            legend.addTo(map);
        };
        const initMap = async () => {
            map = L.map(mapContainer.value, { center: [8, -66], zoom: 6, zoomControl: true });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 10, minZoom: 5 }).addTo(map);
            const dataLoaded = await loadMapaData();
            if (!dataLoaded) { console.error('[Mapa] No se pudieron cargar datos'); return; }
            try {
                const s = await (await fetch('/geojson/estados_final.geojson')).json();
                estadosLayer = L.geoJSON(s, { style: stateStyle, onEachFeature }).addTo(map);
                // Crear control de capas - Grupo "Círculos"
                L.control.layers(null, { 'Círculos - Estados': estadosLayer }, { position: 'topright', collapsed: false }).addTo(map);
            } catch (e) { console.error('[Mapa] Error GeoJSON:', e); }
            addLegend();
        };
        const cleanupMap = () => { if (map) { map.remove(); map = null; } };
        onMounted(initMap);
        onBeforeUnmount(cleanupMap);
        return { mapContainer, selectedState, clearStateFilter };
    }
});
</script>
<style scoped>
.mapa-venezuela-container {
    position: relative;
    width: 100%;
    height: 500px;
}

.map-container {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    overflow: hidden;
}

.clear-filter-btn {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
}

.selected-state-badge {
    position: absolute;
    top: 10px;
    left: 60px;
    z-index: 1000;
}

:deep(.legend) {
    padding: 10px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
    border-radius: 5px;
    line-height: 24px;
    color: #555;
}

:deep(.legend i) {
    width: 18px;
    height: 18px;
    float: left;
    margin-right: 8px;
    opacity: 0.7;
}

/* Ocultar elemento de atribución de Leaflet */
:deep(.leaflet-bottom.leaflet-right) {
    display: none !important;
}
</style>
