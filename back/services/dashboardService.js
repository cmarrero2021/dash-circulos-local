// services/dashboardService.js
const pool = require('../config/db');
const {
    hasNationalDashboardAccess,
    getAllowedStatesForUser,
    getAllowedMunicipalitiesForUser,
} = require('./geoPermissionsService');

const DASHBOARD_DEADLINE = process.env.DASHBOARD_DEADLINE || '2025-11-30';

const getDaysRemaining = async () => {
    const { rows } = await pool.query(
        'SELECT GREATEST(($1::date - CURRENT_DATE), 0) AS dias_faltantes',
        [DASHBOARD_DEADLINE]
    );
    return Number(rows[0]?.dias_faltantes ?? 0);
};

const buildEmptyIndicators = (dias_faltantes) => ({
    meta: 0,
    acumulado: 0,
    diferencia: 0,
    dias_faltantes,
    promedio_necesario: 0,
    promedio_diario: 0,
    participantes: 0,
    promedio: 0,
});

/**
 * Construye la cláusula WHERE y los parámetros para las consultas del dashboard
 * basándose en los permisos geográficos del usuario.
 * @param {number} userId - El ID del usuario que realiza la solicitud.
 * @param {object} voluntaryFilters - Filtros opcionales de la query string (estado_id, municipio_id).
 * @returns {Promise<object>} Un objeto con { whereClause, params }.
 */
const buildFilterClause = async (userId, voluntaryFilters = {}) => {
    // 1. Verificar si el usuario tiene permiso de dashboard nacional
    const hasNationalAccess = await hasNationalDashboardAccess(userId);

    // Si tiene acceso nacional, no se aplica ningún filtro geográfico.
    if (hasNationalAccess) {
        // Pero sí puede aplicar filtros voluntarios
        let whereClause = '';
        const params = [];
        let paramIndex = 1;
        if (voluntaryFilters.estado_id) {
            whereClause += ` WHERE estado_id = $${paramIndex++}`;
            params.push(voluntaryFilters.estado_id);
        }
        if (voluntaryFilters.municipio_id) {
            whereClause += (whereClause ? ' AND' : ' WHERE') + ` municipio_id = $${paramIndex++}`;
            params.push(voluntaryFilters.municipio_id);
        }
        return { whereClause, params };
    }

    // 2. Si no tiene acceso nacional, obtener sus permisos geográficos específicos
    const [allowedStates, allowedMunicipalities] = await Promise.all([
        getAllowedStatesForUser(userId),
        getAllowedMunicipalitiesForUser(userId),
    ]);

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Construir condiciones basadas en permisos
    if (allowedStates.length > 0) {
        conditions.push(`estado_id = ANY($${paramIndex++})`);
        params.push(allowedStates);
    }
    if (allowedMunicipalities.length > 0) {
        const munConditions = allowedMunicipalities.map(m => {
            const estadoParam = paramIndex++;
            const municipioParam = paramIndex++;
            params.push(m.estado_id, m.municipio_id);
            return `(estado_id = $${estadoParam} AND municipio_id = $${municipioParam})`;
        });
        conditions.push(`(${munConditions.join(' OR ')})`);
    }

    // Si no hay permisos geográficos, no debe ver nada.
    if (conditions.length === 0) {
        return { whereClause: 'WHERE 1 = 0', params: [] }; // Condición que siempre es falsa
    }

    let whereClause = `WHERE (${conditions.join(' OR ')})`;

    // Aplicar filtros voluntarios si el usuario los proporciona en la URL
    // Estos filtros deben respetar los permisos del usuario
    if (voluntaryFilters.estado_id) {
        whereClause += ` AND estado_id = $${paramIndex++}`;
        params.push(voluntaryFilters.estado_id);
    }
    if (voluntaryFilters.municipio_id) {
        whereClause += ` AND municipio_id = $${paramIndex++}`;
        params.push(voluntaryFilters.municipio_id);
    }

    return { whereClause, params };
};

// --- Funciones de Indicadores ---
exports.getIndicators = async (userId) => {
    const diasFaltantes = await getDaysRemaining();
    const hasNationalAccess = await hasNationalDashboardAccess(userId);

    if (hasNationalAccess) {
        const query = `SELECT meta, acumulado, diferencia, dias_faltantes, promedio_necesario, promedio_diario, participantes, promedio FROM vindicadores;`;
        const result = await pool.query(query);
        const row = result.rows[0] || {};
        return {
            meta: Number(row.meta ?? 0),
            acumulado: Number(row.acumulado ?? 0),
            diferencia: Number(row.diferencia ?? 0),
            dias_faltantes: Number(row.dias_faltantes ?? diasFaltantes),
            promedio_necesario: Number(row.promedio_necesario ?? 0),
            promedio_diario: Number(row.promedio_diario ?? 0),
            participantes: Number(row.participantes ?? 0),
            promedio: Number(row.promedio ?? 0),
        };
    }

    const allowedStates = await getAllowedStatesForUser(userId);
    if (!allowedStates.length) {
        return buildEmptyIndicators(diasFaltantes);
    }

    const [metaResult, totalsResult, participantesResult] = await Promise.all([
        pool.query(
            'SELECT COALESCE(SUM(circulos), 0) AS meta FROM metas_estado WHERE estado_id = ANY($1)',
            [allowedStates]
        ),
        pool.query(
            `SELECT
                COUNT(*)::integer AS acumulado,
                COUNT(DISTINCT certificacion::date) AS dias_con_registro
            FROM rm_circulos_remoto
            WHERE estado_id = ANY($1);`,
            [allowedStates]
        ),
        pool.query(
            `SELECT 
                SUM(participantes)::integer AS total_participantes,
                AVG(participantes)::integer AS promedio_participantes
            FROM rm_circulos_remoto
            WHERE estado_id = ANY($1);`,
            [allowedStates]
        ),
    ]);

    const meta = Number(metaResult.rows[0]?.meta || 0);
    const acumulado = Number(totalsResult.rows[0]?.acumulado || 0);
    const diasConRegistro = Number(totalsResult.rows[0]?.dias_con_registro || 0);
    const participantes = Number(participantesResult.rows[0]?.total_participantes || 0);
    const promedio = Number(participantesResult.rows[0]?.promedio_participantes || 0);

    const diferencia = meta - acumulado;
    const restante = Math.max(diferencia, 0);
    const diasReferencia = diasFaltantes > 0 ? diasFaltantes : 0;
    const promedio_necesario = diasReferencia > 0 ? Math.trunc(restante / diasReferencia) : restante;
    const promedio_diario = diasConRegistro > 0 ? Math.trunc(acumulado / diasConRegistro) : 0;

    return {
        meta,
        acumulado,
        diferencia,
        dias_faltantes: diasFaltantes,
        promedio_necesario,
        promedio_diario,
        participantes,
        promedio,
    };
}

// --- Funciones de Agregación ---
exports.getCirclesByState = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT *
        FROM vcumplimiento_metas ${whereClause}
        ORDER BY estado;
    `;
    const result = await pool.query(query, params);
    return result.rows;
};

exports.getCirclesByStateMunicipiosComunas = async (userId, filters = {}) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT estado, municipio, comuna, COUNT(*) as avance
        FROM rm_circulos_remoto
        ${whereClause}
        GROUP BY estado, municipio, comuna
        ORDER BY estado, municipio, comuna;
    `;
    const result = await pool.query(query, params);
    return result.rows;
};

exports.getCirclesByStateMunicipios = async (userId, filters = {}) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT estado, municipio, COUNT(*) as avance
        FROM rm_circulos_remoto
        ${whereClause}
        GROUP BY estado, municipio
        ORDER BY estado, municipio;
    `;
    const result = await pool.query(query, params);
    return result.rows;
};

exports.getCirclesByMunicipality = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT estado, municipio, COUNT(id) as total_circulos
        FROM rm_circulos_remoto ${whereClause}
        GROUP BY estado, municipio ORDER BY estado, municipio;
    `;
    const result = await pool.query(query, params);
    return result.rows;
};

exports.getTotalCircles = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `SELECT COUNT(id) as total FROM rm_circulos_remoto ${whereClause}`;
    const result = await pool.query(query, params);
    return result.rows[0] || { total: 0 };
};

exports.getDailyAverage = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT 
            COUNT(id) as total_circulos,
            COUNT(DISTINCT certificacion::date) as total_dias,
            COUNT(id)::DECIMAL / GREATEST(COUNT(DISTINCT certificacion::date), 1) as promedio_diario
        FROM rm_circulos_remoto ${whereClause};
    `;
    const result = await pool.query(query, params);
    return result.rows[0];
};

exports.getRawData = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const limit = filters.limit || 100;
    const offset = filters.page ? (filters.page - 1) * limit : 0;

    const query = `
        SELECT * FROM rm_circulos_remoto ${whereClause} 
        ORDER BY estado, municipio, parroquia 
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const result = await pool.query(query, [...params, limit, offset]);
    return result.rows;
};

// --- Función para certificaciones diarias filtradas por permisos
exports.getDailyCertifications = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT certificacion::date AS fecha, COUNT(*)::integer AS certificaciones
        FROM rm_circulos_remoto
        ${whereClause}
        GROUP BY certificacion::date
        ORDER BY fecha DESC;
    `;
    const result = await pool.query(query, params);
    return result.rows;
};

exports.getStateIndicatorsView = async (userId, filters = {}) => {
    const hasNationalAccess = await hasNationalDashboardAccess(userId);
    const params = [];
    let whereClauses = [];

    if (!hasNationalAccess) {
        const allowedStates = await getAllowedStatesForUser(userId);
        if (!allowedStates.length) {
            return [];
        }
        params.push(allowedStates);
        whereClauses.push(`estado_id = ANY($${params.length})`);
    }

    if (filters.estado_id) {
        params.push(Number(filters.estado_id));
        whereClauses.push(`estado_id = $${params.length}`);
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `
        SELECT estado_id, estado_nombre, meta, acumulado, diferencia, dias_faltantes, promedio_necesario, promedio_diario, participantes, promedio
        FROM vindicadores_estados
        ${whereClause}
        ORDER BY estado_nombre;
    `;
    console.log('Query:', query);
    console.log('Params:', params);
    const { rows } = await pool.query(query, params);
    return rows;
};

// --- Función para obtener datos del mapa (porcentajes por estado) ---
exports.getMapaEstados = async () => {
    const query = `
        SELECT 
            estado_id, 
            estado, 
            meta_circulo, 
            circulos, 
            porcentaje
        FROM vcumplimiento_circulos_estados
        ORDER BY estado_id;
    `;
    const { rows } = await pool.query(query);
    return rows;
};

