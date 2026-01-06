<template>
    <div class="mapa-venezuela-container">
        <div ref="mapContainer" class="map-container"></div>
        <q-btn
            v-if="selectedState"
            round
            class="clear-filter-btn"
            color="primary"
            icon="close"
            size="md"
            @click="clearStateFilter"
        >
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
        let participantesLayer = null;
        const selectedState = ref(null);
        const estadosData = ref([]);
        const participantesData = ref([]);

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
        const findParticipantesByStateId = (sid) => participantesData.value.find(p => Number(p.state_id) === Number(sid));

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
            layer.bindTooltip(nom, {
                permanent: false,
                direction: 'center',
                className: 'state-tooltip'
            });
            layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: clickState });
        };

        const loadMapaData = async () => {
            try {
                const response = await api.get('/dashboard/mapa-estados');
                estadosData.value = response.data;
                return true;
            } catch (error) {
                console.error('[Mapa] Error cargando círculos:', error.message);
                return false;
            }
        };

        const loadParticipantesData = async () => {
            try {
                const response = await api.get('/dashboard/mapa-participantes');
                participantesData.value = response.data;
                return true;
            } catch (error) {
                console.error('[Mapa] Error cargando participantes:', error.message);
                return false;
            }
        };

        // Calcula el radio del círculo proporcional basado en participantes
        const getParticipantesRadius = (participantes) => {
            if (!participantes || participantes <= 0) return 5;
            // Escala logarítmica para mejor visualización
            const baseRadius = 8;
            const scaleFactor = 3;
            return baseRadius + Math.log10(participantes + 1) * scaleFactor;
        };

        // Obtiene el centroide de un feature GeoJSON
        const getFeatureCentroid = (feature) => {
            const bounds = L.geoJSON(feature).getBounds();
            return bounds.getCenter();
        };

        // Crea la capa de participantes como círculos proporcionales
        const createParticipantesLayer = (geojsonData) => {
            const markers = [];

            geojsonData.features.forEach(feature => {
                const sid = feature.properties.state_id;
                const partData = findParticipantesByStateId(sid);

                if (partData && partData.participantes > 0) {
                    const centroid = getFeatureCentroid(feature);
                    const radius = getParticipantesRadius(partData.participantes);

                    const circleMarker = L.circleMarker(centroid, {
                        radius: radius,
                        fillColor: '#9c27b0',
                        color: '#7b1fa2',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.7
                    });

                    const popupContent = `
                        <div style="text-align:center; padding: 5px;">
                            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #9c27b0;">REGISTROS</div>
                            <div style="margin: 3px 0;"><strong>ESTADO:</strong> ${partData.estado}</div>
                            <div style="margin: 3px 0;"><strong>PARTICIPANTES:</strong> ${partData.participantes.toLocaleString('de-DE')}</div>
                        </div>
                    `;

                    circleMarker.bindPopup(popupContent);
                    circleMarker.bindTooltip(`${partData.estado}: ${partData.participantes.toLocaleString('de-DE')} participantes`, {
                        permanent: false,
                        direction: 'top',
                        className: 'participantes-tooltip'
                    });

                    markers.push(circleMarker);
                }
            });

            return L.layerGroup(markers);
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
                // Agregar leyenda de participantes
                d.innerHTML += '<br><strong>Participantes</strong><br>';
                d.innerHTML += '<i style="background:#9c27b0; width:18px;height:18px;float:left;margin-right:8px;opacity:0.7;border-radius:50%;"></i> Tamaño proporcional';
                return d;
            };
            legend.addTo(map);
        };

        const initMap = async () => {
            map = L.map(mapContainer.value, { center: [8, -66], zoom: 6, zoomControl: true });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 10, minZoom: 5 }).addTo(map);

            // Cargar ambos conjuntos de datos en paralelo
            const [circulosLoaded, participantesLoaded] = await Promise.all([
                loadMapaData(),
                loadParticipantesData()
            ]);

            if (!circulosLoaded) {
                console.error('[Mapa] No se pudieron cargar datos de círculos');
            }
            if (!participantesLoaded) {
                console.error('[Mapa] No se pudieron cargar datos de participantes');
            }

            try {
                const geojsonResponse = await fetch('/geojson/estados_final.geojson');
                const geojsonData = await geojsonResponse.json();

                // Crear capa de círculos (estados coloreados)
                estadosLayer = L.geoJSON(geojsonData, { style: stateStyle, onEachFeature });
                estadosLayer.addTo(map);

                // Crear capa de participantes (círculos proporcionales)
                if (participantesLoaded && participantesData.value.length > 0) {
                    participantesLayer = createParticipantesLayer(geojsonData);
                    participantesLayer.addTo(map);
                }

                // Crear control de capas con ambas capas
                const overlayMaps = {
                    'Círculos - Estados': estadosLayer
                };

                if (participantesLayer) {
                    overlayMaps['Registros - Estados'] = participantesLayer;
                }

                L.control.layers(null, overlayMaps, { position: 'topright', collapsed: false }).addTo(map);

            } catch (e) {
                console.error('[Mapa] Error GeoJSON:', e);
            }

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

/* Tooltip personalizado para estados */
:deep(.state-tooltip) {
    background: rgba(0, 0, 0, 0.8);
    border: none;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    font-size: 13px;
    padding: 6px 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:deep(.state-tooltip::before) {
    border-top-color: rgba(0, 0, 0, 0.8);
}

/* Tooltip para participantes */
:deep(.participantes-tooltip) {
    background: rgba(156, 39, 176, 0.9);
    border: none;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    font-size: 12px;
    padding: 6px 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:deep(.participantes-tooltip::before) {
    border-top-color: rgba(156, 39, 176, 0.9);
}

/* Ocultar elemento de atribución de Leaflet */
:deep(.leaflet-bottom.leaflet-right) {
    display: none !important;
}
</style>
