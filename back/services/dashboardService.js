// services/dashboardService.js

const pool = require('../config/db'); // Necesitamos el pool para consultar los permisos del usuario
const cache = require('./cacheService'); // Importamos nuestro servicio de caché

/**
 * Función de utilidad para obtener los permisos geográficos de un usuario.
 * Esta función SÍ consulta la BD de permisos, pero estas tablas son pequeñas y rápidas.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<{accessType: 'national'|'state'|'municipality'|'none', states: number[], munis: Map<number, number[]>}>}
 */
const getUserGeoPermissions = async (userId) => {
    // Primero, revisamos si los permisos de este usuario ya están cacheados para evitar consultas repetidas
    const cacheKey = `user_permissions:${userId}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const client = await pool.connect();
    try {
        const nationalAccessRes = await client.query(
            "SELECT 1 FROM roles_permisos rp JOIN usuarios u ON u.rol_id = rp.rol_id JOIN permisos p ON rp.permiso_id = p.id WHERE u.id = $1 AND p.nombre = 'dashboard:view-unrestricted'",
            [userId]
        );
        if (nationalAccessRes.rowCount > 0) {
            const permissions = { accessType: 'national', states: [], munis: new Map() };
            cache.set(cacheKey, permissions);
            return permissions;
        }

        const statesRes = await client.query('SELECT estado_id FROM usuarios_estados_permitidos WHERE usuario_id = $1', [userId]);
        const munisRes = await client.query('SELECT estado_id, municipio_id FROM usuarios_municipios_permitidos WHERE usuario_id = $1', [userId]);

        const allowedStates = statesRes.rows.map(r => r.estado_id);
        const allowedMunis = new Map();
        munisRes.rows.forEach(r => {
            if (!allowedMunis.has(r.estado_id)) {
                allowedMunis.set(r.estado_id, []);
            }
            allowedMunis.get(r.estado_id).push(r.municipio_id);
        });
        
        const accessType = allowedStates.length > 0 ? 'state' : (allowedMunis.size > 0 ? 'municipality' : 'none');
        const permissions = { accessType, states: allowedStates, munis: allowedMunis };
        cache.set(cacheKey, permissions); // Cachear los permisos del usuario por un tiempo
        return permissions;

    } finally {
        client.release();
    }
};


// --- Endpoints del Servicio ---

exports.getCirclesByState = async (userId, filters) => {
    const permissions = await getUserGeoPermissions(userId);
    const allData = cache.get('dashboard:by-state') || {}; // Obtener datos pre-agregados

    if (permissions.accessType === 'none') {
        return [];
    }
    if (permissions.accessType === 'national') {
        return allData; // El admin nacional ve todo
    }

    // Filtrar en memoria
    const filteredData = {};
    for (const stateId in allData) {
        const numericStateId = parseInt(stateId, 10);
        // El usuario tiene acceso si el estado está en su lista de estados permitidos...
        if (permissions.states.includes(numericStateId) || 
            // ...o si tiene permiso para al menos un municipio dentro de ese estado.
            permissions.munis.has(numericStateId)) {
            filteredData[stateId] = allData[stateId];
        }
    }
    return filteredData;
};

exports.getCirclesByMunicipality = async (userId, filters) => {
    const permissions = await getUserGeoPermissions(userId);
    const allData = cache.get('dashboard:by-municipality') || {};
    
    if (permissions.accessType === 'none') {
        return {};
    }
    if (permissions.accessType === 'national') {
        return allData;
    }

    // Filtrar en memoria
    const filteredData = {};
    for (const key in allData) { // key es "estado_id|municipio_id"
        const [stateId, muniId] = key.split('|').map(Number);

        // El usuario tiene acceso si tiene permiso para el estado completo...
        if (permissions.states.includes(stateId)) {
            filteredData[key] = allData[key];
        } 
        // ...o si tiene permiso específico para ese municipio.
        else if (permissions.munis.has(stateId) && permissions.munis.get(stateId).includes(muniId)) {
            filteredData[key] = allData[key];
        }
    }
    return filteredData;
};

exports.getTotalCircles = async (userId, filters) => {
    // Para el total, no podemos simplemente devolver el total cacheado.
    // Debemos calcularlo basado en los permisos del usuario.
    const permissions = await getUserGeoPermissions(userId);
    
    if (permissions.accessType === 'none') return { total: 0 };
    if (permissions.accessType === 'national') return { total: cache.get('dashboard:total') || 0 };

    // Si el acceso es parcial, necesitamos los datos por municipio para sumar
    const byMunicipalityData = cache.get('dashboard:by-municipality') || {};
    let total = 0;

    for (const key in byMunicipalityData) {
        const [stateId, muniId] = key.split('|').map(Number);

        if (permissions.states.includes(stateId) ||
           (permissions.munis.has(stateId) && permissions.munis.get(stateId).includes(muniId))) {
            total += byMunicipalityData[key];
        }
    }
    return { total };
};


// Para la "tabla dinámica", devolvemos los datos crudos, pero filtrados.
// ¡ADVERTENCIA! Esto puede seguir siendo muy pesado si el permiso de un usuario
// abarca muchos miles de registros. La paginación en el endpoint es OBLIGATORIA.
exports.getRawData = async (userId, filters) => {
    const permissions = await getUserGeoPermissions(userId);
    const allRawData = cache.get('dashboard:raw-data') || [];

    if (permissions.accessType === 'none') return [];
    if (permissions.accessType === 'national') return allRawData;

    return allRawData.filter(row => {
        return permissions.states.includes(row.estado_id) ||
               (permissions.munis.has(row.estado_id) && permissions.munis.get(row.estado_id).includes(row.municipio_id));
    });
};