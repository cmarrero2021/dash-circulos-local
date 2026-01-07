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
        <!-- Botones de exportacion -->
        <div class="export-buttons">
            <q-btn round color="secondary" icon="image" size="sm" @click="exportToPNG">
                <q-tooltip>Exportar a PNG</q-tooltip>
            </q-btn>
            <q-btn round color="accent" icon="picture_as_pdf" size="sm" @click="exportToPDF">
                <q-tooltip>Exportar a PDF</q-tooltip>
            </q-btn>
        </div>
    </div>
</template>
<script>
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import { useQuasar } from 'quasar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDashboardStore } from 'stores/dashboard-store';
import { api } from 'boot/axios';
// import html2canvas from 'html2canvas';
import domtoimage from 'dom-to-image-more';
import { jsPDF } from 'jspdf';
export default defineComponent({
    name: 'MapaVenezuela',
    setup() {
        const dashboardStore = useDashboardStore();
        const $q = useQuasar();
        const mapContainer = ref(null);
        let map = null;
        let estadosLayer = null;
        let tileLayer = null;
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

        // Calcula la cantidad de puntos a generar basado en registros
        const getPointCount = (registros) => {
            if (!registros || registros <= 0) return 0;
            // Escalar: 1 punto por cada 1000 registros, máximo 200
            const points = Math.floor(registros / 1000);
            return Math.min(points, 200);
        };

        // Verifica si un punto está dentro de un polígono usando ray-casting
        const isPointInPolygon = (point, polygon) => {
            const [x, y] = point;
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const [xi, yi] = polygon[i];
                const [xj, yj] = polygon[j];
                if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }
            return inside;
        };

        // Genera puntos aleatorios dentro de un feature GeoJSON
        const generateRandomPointsInFeature = (feature, count) => {
            const points = [];
            if (count <= 0) return points;

            // Obtener el bounding box del feature
            const bounds = L.geoJSON(feature).getBounds();
            const minLat = bounds.getSouth();
            const maxLat = bounds.getNorth();
            const minLng = bounds.getWest();
            const maxLng = bounds.getEast();

            // Obtener los anillos del polígono
            const geometry = feature.geometry;
            let rings = [];

            if (geometry.type === 'Polygon') {
                rings = [geometry.coordinates[0]]; // Solo el anillo exterior
            } else if (geometry.type === 'MultiPolygon') {
                // Para MultiPolygon, usar todos los anillos exteriores
                rings = geometry.coordinates.map(poly => poly[0]);
            }

            // Generar puntos aleatorios dentro del polígono
            let attempts = 0;
            const maxAttempts = count * 20; // Evitar bucle infinito

            while (points.length < count && attempts < maxAttempts) {
                attempts++;
                const lat = minLat + Math.random() * (maxLat - minLat);
                const lng = minLng + Math.random() * (maxLng - minLng);

                // Verificar si el punto está dentro de alguno de los polígonos
                for (const ring of rings) {
                    // GeoJSON usa [lng, lat], convertir para la comprobación
                    const polygonCoords = ring.map(coord => [coord[0], coord[1]]);
                    if (isPointInPolygon([lng, lat], polygonCoords)) {
                        points.push([lat, lng]);
                        break;
                    }
                }
            }

            return points;
        };

        // Crea la capa de registros como dot-density (solo puntos)
        const createRegistrosLayer = (geojsonData) => {
            const markers = [];

            // Crear contorno de estados (una sola capa GeoJSON para todos)
            const outlineLayer = L.geoJSON(geojsonData, {
                style: {
                    fill: false, // Sin relleno
                    color: '#333333',
                    weight: 1.5,
                    opacity: 0.6
                },
                onEachFeature: (feature, layer) => {
                    const sid = feature.properties.state_id;
                    const partData = findParticipantesByStateId(sid);
                    const registros = partData ? partData.participantes : 0;
                    const estadoNombre = partData ? partData.estado : (feature.properties.NAM || '').replace(/^ESTADO\s+(BOLIVARIANO\s+)?/i, '');

                    const popupContent = `
                        <div style="text-align:center; padding: 5px;">
                            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #9c27b0;">REGISTROS</div>
                            <div style="margin: 3px 0;"><strong>ESTADO:</strong> ${estadoNombre}</div>
                            <div style="margin: 3px 0;"><strong>REGISTROS:</strong> ${registros.toLocaleString('de-DE')}</div>
                        </div>
                    `;
                    layer.bindPopup(popupContent);
                }
            });
            markers.push(outlineLayer);

            // Generar puntos aleatorios dentro de cada estado
            geojsonData.features.forEach(feature => {
                const sid = feature.properties.state_id;
                const partData = findParticipantesByStateId(sid);
                const registros = partData ? partData.participantes : 0;

                if (registros > 0) {
                    const pointCount = getPointCount(registros);
                    const randomPoints = generateRandomPointsInFeature(feature, pointCount);

                    randomPoints.forEach(([lat, lng]) => {
                        const dotMarker = L.circleMarker([lat, lng], {
                            radius: 3,
                            fillColor: '#9c27b0',
                            color: '#7b1fa2',
                            weight: 1,
                            opacity: 0.8,
                            fillOpacity: 0.6
                        });
                        markers.push(dotMarker);
                    });
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
                // Agregar leyenda de registros
                d.innerHTML += '<br><strong>Registros</strong><br>';
                d.innerHTML += '<i style="background:#9c27b0; width:6px;height:6px;float:left;margin-right:8px;margin-top:6px;opacity:0.7;border-radius:50%;"></i> 1 punto por cada 1.000 registros';
                return d;
            };
            legend.addTo(map);
        };

        const initMap = async () => {
            map = L.map(mapContainer.value, { center: [8, -66], zoom: 6, zoomControl: true });
            // IMPORTANTE: Base cartográfica - debe estar siempre visible
            tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 10,
                minZoom: 5,
                zIndex: 1
            });
            tileLayer.addTo(map);
            tileLayer.bringToBack();

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

                // Crear capa de registros (dot-density)
                if (participantesLoaded && participantesData.value.length > 0) {
                    participantesLayer = createRegistrosLayer(geojsonData);
                    participantesLayer.addTo(map);
                }

                // Crear control de capas con ambas capas
                const overlayMaps = {
                    'Círculos': estadosLayer
                    // 'Círculos - Estados': estadosLayer
                };

                if (participantesLayer) {
                    overlayMaps['Registros'] = participantesLayer;
                    // overlayMaps['Registros - Estados'] = participantesLayer;
                }

                L.control.layers(null, overlayMaps, { position: 'topright', collapsed: false }).addTo(map);

            } catch (e) {
                console.error('[Mapa] Error GeoJSON:', e);
            }

            addLegend();
        };

        // Función para exportar el mapa a PNG
        const exportToPNG = async () => {
            if (!mapContainer.value || !map) return;
            $q.loading.show({ message: 'Exportando a PNG...' });
            try {
                // Ocultar base cartográfica y centrar mapa
                if (tileLayer) map.removeLayer(tileLayer);
                map.setView([8, -66], 6);
                map.invalidateSize();
                await new Promise(resolve => setTimeout(resolve, 600));

                // Usar dom-to-image-more que maneja mejor las transformaciones CSS
                const dataUrl = await domtoimage.toPng(mapContainer.value, {
                    bgcolor: '#e8e8e8'
                });
                // Convertir dataUrl a canvas para compatibilidad con el resto del c�digo
                const img = new Image();
                await new Promise(resolve => { img.onload = resolve; img.src = dataUrl; });
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                const link = document.createElement('a');
                link.download = `mapa-venezuela-${new Date().toISOString().slice(0, 10)}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (error) {
                console.error('[Mapa] Error exportando a PNG:', error);
            } finally {
                // Restaurar base cartográfica
                if (tileLayer) { tileLayer.addTo(map); tileLayer.bringToBack(); }
                $q.loading.hide();
            }
        };

        // Función para exportar el mapa a PDF
        const exportToPDF = async () => {
            if (!mapContainer.value || !map) return;
            $q.loading.show({ message: 'Exportando a PDF...' });
            try {
                // Ocultar base cartográfica y centrar mapa
                if (tileLayer) map.removeLayer(tileLayer);
                map.setView([8, -66], 6);
                map.invalidateSize();
                await new Promise(resolve => setTimeout(resolve, 600));

                // Usar dom-to-image-more que maneja mejor las transformaciones CSS
                const dataUrl = await domtoimage.toPng(mapContainer.value, {
                    bgcolor: '#e8e8e8'
                });
                // Convertir dataUrl a canvas para compatibilidad con el resto del c�digo
                const img = new Image();
                await new Promise(resolve => { img.onload = resolve; img.src = dataUrl; });
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`mapa-venezuela-${new Date().toISOString().slice(0, 10)}.pdf`);
            } catch (error) {
                console.error('[Mapa] Error exportando a PDF:', error);
            } finally {
                // Restaurar base cartográfica
                if (tileLayer) { tileLayer.addTo(map); tileLayer.bringToBack(); }
                $q.loading.hide();
            }
        };

        const cleanupMap = () => { if (map) { map.remove(); map = null; } };
        onMounted(initMap);
        onBeforeUnmount(cleanupMap);
        return { mapContainer, selectedState, clearStateFilter, exportToPNG, exportToPDF };
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

.export-buttons {
    position: absolute;
    bottom: 20px;
    right: 10px;
    z-index: 1000;
    display: flex;
    gap: 8px;
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

/* Tooltip para registros */
:deep(.registros-tooltip) {
    background: rgba(156, 39, 176, 0.9);
    border: none;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    font-size: 12px;
    padding: 6px 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:deep(.registros-tooltip::before) {
    border-top-color: rgba(156, 39, 176, 0.9);
}

/* Ocultar elemento de atribución de Leaflet */
:deep(.leaflet-bottom.leaflet-right) {
    display: none !important;
}

/* Estilos para control de capas (mejora exportación) */
:deep(.leaflet-control-layers) {
    font-family: Arial, sans-serif;
}

:deep(.leaflet-control-layers-overlays) {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

:deep(.leaflet-control-layers-overlays label) {
    display: flex !important;
    align-items: center;
    gap: 8px;
    margin: 2px 0;
    white-space: nowrap;
}

:deep(.leaflet-control-layers-overlays input[type="checkbox"]) {
    appearance: none;
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border: 2px solid #666;
    border-radius: 3px;
    background: white;
    cursor: pointer;
    flex-shrink: 0;
}

:deep(.leaflet-control-layers-overlays input[type="checkbox"]:checked) {
    background: #2196f3;
    border-color: #2196f3;
}

:deep(.leaflet-control-layers-overlays input[type="checkbox"]:checked::after) {
    content: '✓';
    display: block;
    color: white;
    font-size: 12px;
    text-align: center;
    line-height: 12px;
}
</style>
