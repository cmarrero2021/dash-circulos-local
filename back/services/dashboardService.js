// services/dashboardService.js
const pool = require('../config/db');
const { cache } = require('./cacheService');
const {
    hasNationalDashboardAccess,
    getAllowedStatesForUser,
    getAllowedMunicipalitiesForUser,
} = require('./geoPermissionsService');

const DASHBOARD_DEADLINE = process.env.DASHBOARD_DEADLINE || '2025-11-30';

// ─── TTL por tipo de dato ─────────────────────────────────────────────────────
const TTL = {
    INDICATORS:   120,  // indicadores y datos derivados
    AGGREGATED:   300,  // datos agregados estables (mapas, estados, municipios)
    PRIORIZADOS:   30,  // datos paginados de priorizados (alta variabilidad)
    FILTER_OPT:    60,  // opciones de filtros desplegables
};

/**
 * Genera una clave de caché determinista a partir de un prefijo y un objeto de parámetros.
 */
const buildCacheKey = (prefix, userId, params = {}) => {
    const sorted = Object.keys(params).sort().reduce((acc, k) => {
        acc[k] = params[k];
        return acc;
    }, {});
    return `${prefix}:${userId}:${JSON.stringify(sorted)}`;
};

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
    const cacheKey = `dashboard:indicators:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const diasFaltantes = await getDaysRemaining();
    const hasNationalAccess = await hasNationalDashboardAccess(userId);

    if (hasNationalAccess) {
        const query = `SELECT meta, acumulado, diferencia, dias_faltantes, promedio_necesario, promedio_diario, participantes, promedio FROM vindicadores;`;
        const result = await pool.query(query);
        const row = result.rows[0] || {};
        const data = {
            meta: Number(row.meta ?? 0),
            acumulado: Number(row.acumulado ?? 0),
            diferencia: Number(row.diferencia ?? 0),
            dias_faltantes: Number(row.dias_faltantes ?? diasFaltantes),
            promedio_necesario: Number(row.promedio_necesario ?? 0),
            promedio_diario: Number(row.promedio_diario ?? 0),
            participantes: Number(row.participantes ?? 0),
            promedio: Number(row.promedio ?? 0),
        };
        await cache.set(cacheKey, data, TTL.INDICATORS);
        return data;
    }

    const allowedStates = await getAllowedStatesForUser(userId);
    if (!allowedStates.length) {
        return buildEmptyIndicators(diasFaltantes);
    }

    // Fetch dias_faltantes from the view for state-level users
    const [metaResult, totalsResult, participantesResult, diasResult] = await Promise.all([
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
        pool.query(
            `SELECT dias_faltantes FROM vindicadores_estados WHERE estado_id = ANY($1) LIMIT 1;`,
            [allowedStates]
        ),
    ]);

    const meta = Number(metaResult.rows[0]?.meta || 0);
    const acumulado = Number(totalsResult.rows[0]?.acumulado || 0);
    const diasConRegistro = Number(totalsResult.rows[0]?.dias_con_registro || 0);
    const participantes = Number(participantesResult.rows[0]?.total_participantes || 0);
    const promedio = Number(participantesResult.rows[0]?.promedio_participantes || 0);
    const diasFaltantesFromView = Number(diasResult.rows[0]?.dias_faltantes ?? diasFaltantes);

    const diferencia = meta - acumulado;
    const restante = Math.max(diferencia, 0);
    const diasReferencia = diasFaltantesFromView > 0 ? diasFaltantesFromView : 0;
    const promedio_necesario = diasReferencia > 0 ? Math.trunc(restante / diasReferencia) : restante;
    const promedio_diario = diasConRegistro > 0 ? Math.trunc(acumulado / diasConRegistro) : 0;

    const data = {
        meta,
        acumulado,
        diferencia,
        dias_faltantes: diasFaltantesFromView,
        promedio_necesario,
        promedio_diario,
        participantes,
        promedio,
    };
    await cache.set(cacheKey, data, TTL.INDICATORS);
    return data;
};

// --- Funciones de Agregación ---
exports.getCirclesByState = async (userId, filters) => {
    const cacheKey = buildCacheKey('dashboard:by-state', userId, filters);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT *
        FROM vcumplimiento_metas ${whereClause}
        ORDER BY estado;
    `;
    const result = await pool.query(query, params);
    await cache.set(cacheKey, result.rows, TTL.AGGREGATED);
    return result.rows;
};

exports.getCirclesByStateMunicipiosComunas = async (userId, filters = {}) => {
    const cacheKey = buildCacheKey('dashboard:by-state-mun-com', userId, filters);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT estado, municipio, comuna, COUNT(*) as avance
        FROM rm_circulos_remoto
        ${whereClause}
        GROUP BY estado, municipio, comuna
        ORDER BY estado, municipio, comuna;
    `;
    const result = await pool.query(query, params);
    await cache.set(cacheKey, result.rows, TTL.AGGREGATED);
    return result.rows;
};

exports.getCirclesByStateMunicipios = async (userId, filters = {}) => {
    const cacheKey = buildCacheKey('dashboard:by-state-mun', userId, filters);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT estado_id, estado, municipio_id, municipio, COUNT(*) as avance
        FROM rm_circulos_remoto
        ${whereClause}
        GROUP BY estado_id, estado, municipio_id, municipio
        ORDER BY estado, municipio;
    `;
    const result = await pool.query(query, params);
    await cache.set(cacheKey, result.rows, TTL.AGGREGATED);
    return result.rows;
};

exports.getCirclesByStateMunicipiosParroquias = async (userId, filters = {}) => {
    const cacheKey = buildCacheKey('dashboard:by-state-mun-par', userId, filters);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { whereClause, params } = await buildFilterClause(userId, filters);

    /**
     * La query usa el mismo whereClause ($1, $2…) en dos CTEs distintos.
     * PostgreSQL reutiliza correctamente los parámetros posicionales, por lo que
     * no es necesario duplicar el array de params.
     *
     * Dos problemas resueltos:
     *  1. El JOIN ahora incluye estado_id (evita contar círculos de otro estado
     *     que comparten el mismo parroquia_id).
     *  2. El CTE "huerfanos" captura círculos cuya parroquia_id NO existe en
     *     rm_comunas para ese estado (garantiza que el total siempre cuadre).
     */
    const query = `
        WITH parroquias_catalogo AS (
            SELECT DISTINCT estado_id, estado, municipio_id, municipio, parroquia_id, parroquia
            FROM rm_comunas
            ${whereClause}
        ),
        circulos_usuario AS (
            SELECT id, estado_id, estado, municipio_id, municipio, parroquia_id, parroquia
            FROM rm_circulos_remoto
            ${whereClause}
        ),
        result_catalogo AS (
            SELECT
                p.estado_id, p.estado,
                p.municipio_id, p.municipio,
                p.parroquia_id, p.parroquia,
                COUNT(r.id) AS avance
            FROM parroquias_catalogo p
            LEFT JOIN circulos_usuario r
                   ON p.parroquia_id = r.parroquia_id
                  AND p.estado_id    = r.estado_id
            GROUP BY p.estado_id, p.estado, p.municipio_id, p.municipio, p.parroquia_id, p.parroquia
        ),
        result_huerfanos AS (
            -- Círculos cuya parroquia_id no existe en rm_comunas para ese estado
            SELECT
                c.estado_id, c.estado,
                c.municipio_id,
                COALESCE(c.municipio,  'Sin municipio')   AS municipio,
                c.parroquia_id,
                COALESCE(c.parroquia,  'Sin clasificar')  AS parroquia,
                COUNT(c.id) AS avance
            FROM circulos_usuario c
            LEFT JOIN parroquias_catalogo p
                   ON c.parroquia_id = p.parroquia_id
                  AND c.estado_id    = p.estado_id
            WHERE p.parroquia_id IS NULL
            GROUP BY c.estado_id, c.estado, c.municipio_id, c.municipio, c.parroquia_id, c.parroquia
        )
        SELECT * FROM result_catalogo
        UNION ALL
        SELECT * FROM result_huerfanos WHERE avance > 0
        ORDER BY estado, municipio, parroquia;
    `;
    const result = await pool.query(query, params);
    await cache.set(cacheKey, result.rows, TTL.AGGREGATED);
    return result.rows;
};

exports.getCirclesByStateMunicipiosParroquiasComunas = async (userId, filters = {}) => {
    const cacheKey = buildCacheKey('dashboard:by-state-mun-par-com', userId, filters);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        WITH comunas_filtradas AS (
            SELECT estado_id, estado, municipio_id, municipio, parroquia_id, parroquia, comuna_id, comuna
            FROM rm_comunas
            ${whereClause}
        )
        SELECT 
            c.estado_id, c.estado, 
            c.municipio_id, c.municipio, 
            c.parroquia_id, c.parroquia, 
            c.comuna_id, c.comuna, 
            COUNT(r.id) as avance
        FROM comunas_filtradas c
        LEFT JOIN rm_circulos_remoto r ON c.comuna_id = r.comuna_id
        GROUP BY c.estado_id, c.estado, c.municipio_id, c.municipio, c.parroquia_id, c.parroquia, c.comuna_id, c.comuna
        ORDER BY c.estado, c.municipio, c.parroquia, c.comuna;
    `;
    const result = await pool.query(query, params);
    await cache.set(cacheKey, result.rows, TTL.AGGREGATED);
    return result.rows;
};

exports.getCirclesByMunicipality = async (userId, filters) => {
    const cacheKey = buildCacheKey('dashboard:by-municipality', userId, filters);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT estado, municipio, COUNT(id) as total_circulos
        FROM rm_circulos_remoto ${whereClause}
        GROUP BY estado, municipio ORDER BY estado, municipio;
    `;
    const result = await pool.query(query, params);
    await cache.set(cacheKey, result.rows, TTL.AGGREGATED);
    return result.rows;
};

exports.getTotalCircles = async (userId, filters) => {
    const cacheKey = buildCacheKey('dashboard:total', userId, filters);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `SELECT COUNT(id) as total FROM rm_circulos_remoto ${whereClause}`;
    const result = await pool.query(query, params);
    const data = result.rows[0] || { total: 0 };
    await cache.set(cacheKey, data, TTL.AGGREGATED);
    return data;
};

exports.getDailyAverage = async (userId, filters) => {
    const cacheKey = buildCacheKey('dashboard:daily-avg', userId, filters);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT 
            COUNT(id) as total_circulos,
            COUNT(DISTINCT certificacion::date) as total_dias,
            COUNT(id)::DECIMAL / GREATEST(COUNT(DISTINCT certificacion::date), 1) as promedio_diario
        FROM rm_circulos_remoto ${whereClause};
    `;
    const result = await pool.query(query, params);
    await cache.set(cacheKey, result.rows[0], TTL.INDICATORS);
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
    const cacheKey = buildCacheKey('dashboard:daily-cert', userId, filters);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT certificacion::date AS fecha, COUNT(*)::integer AS certificaciones
        FROM rm_circulos_remoto
        ${whereClause}
        GROUP BY certificacion::date
        ORDER BY fecha DESC;
    `;
    const result = await pool.query(query, params);
    await cache.set(cacheKey, result.rows, TTL.INDICATORS);
    return result.rows;
};

exports.getStateIndicatorsView = async (userId, filters = {}) => {
    const cacheKey = buildCacheKey('dashboard:state-indicators', userId, filters);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

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
    const { rows } = await pool.query(query, params);
    await cache.set(cacheKey, rows, TTL.INDICATORS);
    return rows;
};

// --- Función para obtener datos del mapa (porcentajes por estado) ---
exports.getMapaEstados = async (userId) => {
    const cacheKey = `dashboard:mapa:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const hasNationalAccess = await hasNationalDashboardAccess(userId);
    let whereClause = '';
    const params = [];

    if (!hasNationalAccess) {
        const allowedStates = await getAllowedStatesForUser(userId);
        if (!allowedStates.length) return [];
        params.push(allowedStates);
        whereClause = `WHERE estado_id = ANY($1)`;
    }

    const query = `
        SELECT 
            estado_id, 
            estado, 
            meta_circulo, 
            circulos, 
            porcentaje
        FROM vcumplimiento_circulos_estados
        ${whereClause}
        ORDER BY estado_id;
    `;
    const { rows } = await pool.query(query, params);
    await cache.set(cacheKey, rows, TTL.AGGREGATED);
    return rows;
};

// --- Función para obtener participantes por estado (capa de dispersión) ---
exports.getParticipantesPorEstado = async (userId) => {
    const cacheKey = `dashboard:participantes:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const hasNationalAccess = await hasNationalDashboardAccess(userId);
    let whereClause = '';
    const params = [];

    if (!hasNationalAccess) {
        const allowedStates = await getAllowedStatesForUser(userId);
        if (!allowedStates.length) return [];
        params.push(allowedStates);
        whereClause = `WHERE state_id = ANY($1)`;
    }

    const query = `
        SELECT 
            state_id, 
            estado, 
            registros AS participantes
        FROM vregistros_estados
        ${whereClause}
        ORDER BY state_id;
    `;
    const { rows } = await pool.query(query, params);
    await cache.set(cacheKey, rows, TTL.AGGREGATED);
    return rows;
};

// --- Función para obtener priorizados por estado (capa de dispersión triángulos) ---
exports.getPriorizadosPorEstado = async (userId) => {
    const cacheKey = `dashboard:priorizados-estado:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const hasNationalAccess = await hasNationalDashboardAccess(userId);
    let whereClause = '';
    const params = [];

    if (!hasNationalAccess) {
        const allowedStates = await getAllowedStatesForUser(userId);
        if (!allowedStates.length) return [];
        params.push(allowedStates);
        whereClause = `WHERE estado_id = ANY($1)`;
    }

    const query = `
        SELECT
            estado_id AS state_id,
            estado,
            COUNT(*) AS priorizados
        FROM vpriorizados
        ${whereClause}
        GROUP BY estado_id, estado
        ORDER BY estado_id;
    `;
    const { rows } = await pool.query(query, params);
    await cache.set(cacheKey, rows, TTL.AGGREGATED);
    return rows;
};

// --- Función para obtener indicadores de registros básicos por estado ---
exports.getRegistrosIndicadoresPorEstado = async (userId) => {
    const cacheKey = `dashboard:registros-estados:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const hasNationalAccess = await hasNationalDashboardAccess(userId);
    const params = [];
    let whereClause = '';

    if (!hasNationalAccess) {
        const allowedStates = await getAllowedStatesForUser(userId);
        if (!allowedStates.length) {
            return [];
        }
        params.push(allowedStates);
        // La vista no tiene estado_id; filtra usando el nombre del estado (UPPER)
        // via subquery a vestados para hacer la correspondencia por ID
        whereClause = `WHERE estado = ANY(SELECT UPPER(estado) FROM vestados WHERE id = ANY($${params.length}))`;
    }

    const query = `
        SELECT 
            estado,
            registros,
            venezolano,
            extranjero,
            masculino,
            femenino,
            promedio_edad,
            prom_edad_masc,
            prom_edad_fem,
            ninguno,
            primaria,
            secundaria,
            universidad,
            postgrado
        FROM vindicadores_registros_basicos_estados
        ${whereClause}
        ORDER BY estado;
    `;
    const { rows } = await pool.query(query, params);
    await cache.set(cacheKey, rows, TTL.AGGREGATED);
    return rows;
};

// --- Función para obtener indicadores de registros básicos nacionales (o del scope del usuario) ---
exports.getRegistrosIndicadoresNacionales = async (userId) => {
    const cacheKey = `dashboard:registros-nacionales:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const hasNationalAccess = await hasNationalDashboardAccess(userId);

    // Usuarios con acceso nacional: consultan la vista nacional optimizada
    if (hasNationalAccess) {
        const query = `
            SELECT 
                registros,
                venezolanos,
                extranjero,
                masculino,
                femenino,
                promedio_edad,
                prom_edad_masc,
                prom_edad_fem
            FROM vindicadores_registros_basicos_nacionales
            LIMIT 1;
        `;
        const { rows } = await pool.query(query);
        const data = rows[0] || {};
        await cache.set(cacheKey, data, TTL.AGGREGATED);
        return data;
    }

    // Usuarios con acceso restringido: agregar desde la vista por estados
    // usando promedio ponderado para las edades (estadísticamente correcto)
    const allowedStates = await getAllowedStatesForUser(userId);
    if (!allowedStates.length) return {};

    const query = `
        SELECT 
            SUM(registros)::bigint                                                              AS registros,
            SUM(venezolano)::bigint                                                             AS venezolanos,
            SUM(extranjero)::bigint                                                             AS extranjero,
            SUM(masculino)::bigint                                                              AS masculino,
            SUM(femenino)::bigint                                                               AS femenino,
            ROUND(SUM(promedio_edad::numeric  * registros) / NULLIF(SUM(registros), 0))::integer AS promedio_edad,
            ROUND(SUM(prom_edad_masc::numeric * masculino) / NULLIF(SUM(masculino), 0))::integer AS prom_edad_masc,
            ROUND(SUM(prom_edad_fem::numeric  * femenino)  / NULLIF(SUM(femenino),  0))::integer AS prom_edad_fem
        FROM vindicadores_registros_basicos_estados
        WHERE estado = ANY(SELECT UPPER(estado) FROM vestados WHERE id = ANY($1))
    `;
    const { rows } = await pool.query(query, [allowedStates]);
    const data = rows[0] || {};
    await cache.set(cacheKey, data, TTL.AGGREGATED);
    return data;
};

// --- Funciones para Priorizados (server-side pagination + filtering) ---

/**
 * Construye la cláusula de permisos geográficos para vpriorizados.
 * Retorna { permClause, permParams, nextParamIndex }.
 */
const buildPriorizadosPermissionClause = async (userId) => {
    const hasNationalAccess = await hasNationalDashboardAccess(userId);
    if (hasNationalAccess) {
        return { permClause: '', permParams: [], nextParamIndex: 1 };
    }
    const allowedStates = await getAllowedStatesForUser(userId);
    if (!allowedStates.length) {
        return { permClause: 'WHERE 1 = 0', permParams: [], nextParamIndex: 1 };
    }
    return {
        permClause: 'WHERE estado_id = ANY($1)',
        permParams: [allowedStates],
        nextParamIndex: 2,
    };
};

exports.buildPriorizadosPermissionClause = buildPriorizadosPermissionClause;

/**
 * Construye la cláusula de permisos geográficos para rm_data_registros.
 * La tabla foránea no tiene estado_id; filtra por nombre de estado (UPPER)
 * mediante subquery a vestados para hacer la correspondencia por ID.
 * Retorna { permClause, permParams, nextParamIndex }.
 */
const buildRegistrosPermissionClause = async (userId) => {
    const hasNationalAccess = await hasNationalDashboardAccess(userId);
    if (hasNationalAccess) {
        return { permClause: '', permParams: [], nextParamIndex: 1 };
    }
    const allowedStates = await getAllowedStatesForUser(userId);
    if (!allowedStates.length) {
        return { permClause: 'WHERE 1 = 0', permParams: [], nextParamIndex: 1 };
    }
    return {
        permClause: 'WHERE UPPER(estado) = ANY(SELECT estado FROM vestados WHERE id = ANY($1))',
        permParams: [allowedStates],
        nextParamIndex: 2,
    };
};

exports.buildRegistrosPermissionClause = buildRegistrosPermissionClause;

/**
 * Obtiene datos paginados de vpriorizados con filtrado server-side.
 * @param {number} userId
 * @param {object} query - Query params del request HTTP
 * @returns {Promise<{ rows: object[], totalRows: number }>}
 */
exports.getPriorizados = async (userId, query = {}) => {
    // Exportaciones no se cachean (son operaciones puntuales)
    const isExport = query.export === 'true';
    if (!isExport) {
        const cacheKey = buildCacheKey('dashboard:priorizados', userId, query);
        const cached = await cache.get(cacheKey);
        if (cached) return cached;
    }

    const { permClause, permParams, nextParamIndex } = await buildPriorizadosPermissionClause(userId);

    const conditions = [];
    const params = [...permParams];
    let pi = nextParamIndex; // param index

    // --- Búsqueda global ---
    if (query.search && query.search.trim()) {
        const searchTerm = query.search.trim();
        conditions.push(`(
            nombre ILIKE $${pi}
            OR cedula::text ILIKE $${pi}
            OR telefono ILIKE $${pi}
            OR comunidad ILIKE $${pi}
            OR estado ILIKE $${pi}
            OR municipio ILIKE $${pi}
            OR parroquia ILIKE $${pi}
            OR registro ILIKE $${pi}
            OR circulo ILIKE $${pi}
            OR patria ILIKE $${pi}
            OR validado ILIKE $${pi}
            OR mayor60 ILIKE $${pi}
            OR nuevos ILIKE $${pi}
            OR fallecido ILIKE $${pi}
            OR excepcional ILIKE $${pi}
        )`);
        params.push(`%${searchTerm}%`);
        pi++;
    }

    // --- Filtros multi-select ---
    if (query.estados) {
        const arr = Array.isArray(query.estados) ? query.estados : query.estados.split(',');
        if (arr.length > 0) {
            conditions.push(`estado = ANY($${pi})`);
            params.push(arr);
            pi++;
        }
    }
    if (query.municipios) {
        const arr = Array.isArray(query.municipios) ? query.municipios : query.municipios.split(',');
        if (arr.length > 0) {
            conditions.push(`municipio = ANY($${pi})`);
            params.push(arr);
            pi++;
        }
    }
    if (query.parroquias) {
        const arr = Array.isArray(query.parroquias) ? query.parroquias : query.parroquias.split(',');
        if (arr.length > 0) {
            conditions.push(`parroquia = ANY($${pi})`);
            params.push(arr);
            pi++;
        }
    }
    if (query.comunidades) {
        const arr = Array.isArray(query.comunidades) ? query.comunidades : query.comunidades.split(',');
        if (arr.length > 0) {
            conditions.push(`comunidad = ANY($${pi})`);
            params.push(arr);
            pi++;
        }
    }

    // --- Filtros toggle (slider) ---
    if (query.nac && query.nac !== 'Todos') {
        conditions.push(`nac = $${pi}`);
        params.push(query.nac);
        pi++;
    }
    if (query.sexo && query.sexo !== 'Todos') {
        conditions.push(`sexo = $${pi}`);
        params.push(query.sexo);
        pi++;
    }
    if (query.patria && query.patria !== 'Todos') {
        conditions.push(`patria = $${pi}`);
        params.push(query.patria);
        pi++;
    }
    if (query.validado && query.validado !== 'Todos') {
        conditions.push(`validado = $${pi}`);
        params.push(query.validado);
        pi++;
    }
    if (query.mayor60 && query.mayor60 !== 'Todos') {
        conditions.push(`mayor60 = $${pi}`);
        params.push(query.mayor60);
        pi++;
    }
    if (query.registro && query.registro !== 'Todos') {
        conditions.push(`registro = $${pi}`);
        params.push(query.registro);
        pi++;
    }
    if (query.circulo && query.circulo !== 'Todos') {
        conditions.push(`circulo = $${pi}`);
        params.push(query.circulo);
        pi++;
    }
    if (query.nuevos && query.nuevos !== 'Todos') {
        conditions.push(`nuevos = $${pi}`);
        params.push(query.nuevos);
        pi++;
    }
    if (query.fallecido && query.fallecido !== 'Todos') {
        conditions.push(`fallecido = $${pi}`);
        params.push(query.fallecido);
        pi++;
    }
    if (query.excepcional && query.excepcional !== 'Todos') {
        conditions.push(`excepcional = $${pi}`);
        params.push(query.excepcional);
        pi++;
    }

    // --- Construir WHERE completo ---
    let whereClause = permClause;
    if (conditions.length > 0) {
        const filterSql = conditions.join(' AND ');
        if (whereClause) {
            whereClause += ' AND ' + filterSql;
        } else {
            whereClause = 'WHERE ' + filterSql;
        }
    }

    // --- Ordenación ---
    const allowedSortCols = [
        'id', 'estado_id', 'estado', 'municipio_id', 'municipio',
        'parroquia_id', 'parroquia', 'nac', 'cedula', 'nombre',
        'telefono', 'fecha_nac', 'sexo', 'comunidad', 'patria',
        'validado', 'mayor60', 'registro', 'circulo', 'nuevos',
        'fallecido', 'excepcional',
    ];
    let orderClause = 'ORDER BY estado, municipio, parroquia, nombre';
    if (query.sortBy && allowedSortCols.includes(query.sortBy)) {
        const dir = query.descending === 'true' ? 'DESC' : 'ASC';
        orderClause = `ORDER BY ${query.sortBy} ${dir}`;
    }

    // --- Paginación ---
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 500);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    // Modo exportación: sin paginación (isExport ya declarado arriba)

    let sql;
    if (isExport) {
        sql = `SELECT * FROM vpriorizados ${whereClause} ${orderClause}`;
    } else {
        // COUNT(*) OVER() evita un segundo query de conteo
        sql = `
            SELECT *, COUNT(*) OVER() AS total_rows
            FROM vpriorizados
            ${whereClause}
            ${orderClause}
            LIMIT $${pi} OFFSET $${pi + 1}
        `;
        params.push(limit, offset);
    }

    const { rows } = await pool.query(sql, params);

    if (isExport) {
        return { rows, totalRows: rows.length };
    }

    const totalRows = rows.length > 0 ? parseInt(rows[0].total_rows, 10) : 0;
    // Eliminar el campo auxiliar total_rows de cada fila
    rows.forEach(r => delete r.total_rows);

    const result = { rows, totalRows };

    // Guardar en caché (solo consultas paginadas, no exportaciones)
    const cacheKey = buildCacheKey('dashboard:priorizados', userId, query);
    await cache.set(cacheKey, result, TTL.PRIORIZADOS);

    return result;
};

/**
 * Obtiene los valores únicos para los filtros desplegables de vpriorizados,
 * respetando los permisos del usuario y cascada geográfica.
 * @param {number} userId
 * @param {object} query - { estados, municipios, parroquias } (comma-separated strings)
 */
exports.getPriorizadosFilterOptions = async (userId, query = {}) => {
    // Verificar caché
    const cacheKey = buildCacheKey('dashboard:priorizados-fo', userId, query);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { permClause, permParams } = await buildPriorizadosPermissionClause(userId);
    const baseParamCount = permParams.length;

    // Helper: builds a WHERE string appending extra conditions to the permission clause
    const buildWhere = (extraConditions) => {
        if (!extraConditions.length) return permClause;
        const extra = extraConditions.join(' AND ');
        return permClause ? `${permClause} AND ${extra}` : `WHERE ${extra}`;
    };

    const distinctQuery = (col, where, params) =>
        pool.query(
            `SELECT COALESCE(json_agg(DISTINCT ${col}) FILTER (WHERE ${col} IS NOT NULL), '[]') AS vals FROM vpriorizados ${where}`,
            params,
        );

    // --- Estados: solo permisos ---
    const estRes = await distinctQuery('estado', permClause, permParams);

    // --- Municipios: filtrados por estados seleccionados ---
    let munVals = [];
    if (query.estados) {
        const arr = Array.isArray(query.estados) ? query.estados : query.estados.split(',');
        const pi = baseParamCount + 1;
        const where = buildWhere([`estado = ANY($${pi})`]);
        const res = await distinctQuery('municipio', where, [...permParams, arr]);
        munVals = res.rows[0]?.vals || [];
    }

    // --- Parroquias: filtradas por estados + municipios seleccionados ---
    let parVals = [];
    if (query.municipios) {
        const conditions = [];
        const params = [...permParams];
        let pi = baseParamCount + 1;
        if (query.estados) {
            const arr = Array.isArray(query.estados) ? query.estados : query.estados.split(',');
            conditions.push(`estado = ANY($${pi})`);
            params.push(arr);
            pi++;
        }
        const munArr = Array.isArray(query.municipios) ? query.municipios : query.municipios.split(',');
        conditions.push(`municipio = ANY($${pi})`);
        params.push(munArr);
        const where = buildWhere(conditions);
        const res = await distinctQuery('parroquia', where, params);
        parVals = res.rows[0]?.vals || [];
    }

    // --- Comunidades: filtradas por estados + municipios + parroquias seleccionados ---
    let comVals = [];
    if (query.parroquias) {
        const conditions = [];
        const params = [...permParams];
        let pi = baseParamCount + 1;
        if (query.estados) {
            const arr = Array.isArray(query.estados) ? query.estados : query.estados.split(',');
            conditions.push(`estado = ANY($${pi})`);
            params.push(arr);
            pi++;
        }
        if (query.municipios) {
            const munArr = Array.isArray(query.municipios) ? query.municipios : query.municipios.split(',');
            conditions.push(`municipio = ANY($${pi})`);
            params.push(munArr);
            pi++;
        }
        const parArr = Array.isArray(query.parroquias) ? query.parroquias : query.parroquias.split(',');
        conditions.push(`parroquia = ANY($${pi})`);
        params.push(parArr);
        const where = buildWhere(conditions);
        const res = await distinctQuery('comunidad', where, params);
        comVals = res.rows[0]?.vals || [];
    }

    const result = {
        estados: (estRes.rows[0]?.vals || []).sort(),
        municipios: munVals.sort(),
        parroquias: parVals.sort(),
        comunidades: comVals.sort(),
    };

    // Guardar en caché
    await cache.set(cacheKey, result, TTL.FILTER_OPT);

    return result;
};

// ─── Pirámide Poblacional ──────────────────────────────────────────────────────

/**
 * Obtiene la distribución de registros por rangos etarios (60 a 100+) y género,
 * usando la tabla foránea rm_data_registros.
 *
 * @param {number} userId  - ID del usuario (para permisos geográficos).
 * @param {number} step    - Amplitud del rango etario: 5 o 10 (default 5).
 * @returns {Promise<Array<{rango, grupo_orden, masculino, femenino, total}>>}
 */
exports.getPyramideEdad = async (userId, step = 5) => {
    const stepInt = [5, 10].includes(Number(step)) ? Number(step) : 5;
    const cacheKey = `dashboard:piramide-edad:${userId}:step${stepInt}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Permisos geográficos
    const { permClause, permParams } = await buildRegistrosPermissionClause(userId);
    if (permClause === 'WHERE 1 = 0') return [];

    const today = new Date();
    const curYear = today.getFullYear();
    const cutoffDate = new Date(curYear - 60, today.getMonth(), today.getDate());
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    // Condición de fecha de nacimiento pushable a postgres_fdw
    const baseCond = `fecha_nacimiento <= '${cutoffStr}'
              AND fecha_nacimiento >= '1900-01-01'`;

    let whereClause;
    if (!permClause) {
        whereClause = `WHERE ${baseCond}`;
    } else {
        const geoCondition = permClause.replace(/^\s*WHERE\s+/i, '');
        whereClause = `WHERE ${baseCond} AND (${geoCondition})`;
    }

    const query = `
        SELECT
            CASE
                WHEN (${curYear} - SUBSTRING(fecha_nacimiento, 1, 4)::integer) >= 100 THEN '100+'
                ELSE (FLOOR(((${curYear} - SUBSTRING(fecha_nacimiento, 1, 4)::integer) - 60)::numeric / $1) * $1 + 60)::integer::text
                     || ' - ' ||
                     (FLOOR(((${curYear} - SUBSTRING(fecha_nacimiento, 1, 4)::integer) - 60)::numeric / $1) * $1 + 60 + $1 - 1)::integer::text
            END AS rango,
            CASE
                WHEN (${curYear} - SUBSTRING(fecha_nacimiento, 1, 4)::integer) >= 100 THEN 9999
                ELSE FLOOR(((${curYear} - SUBSTRING(fecha_nacimiento, 1, 4)::integer) - 60)::numeric / $1)::integer
            END AS grupo_orden,
            COUNT(*) FILTER (WHERE genero = 'M') AS masculino,
            COUNT(*) FILTER (WHERE genero = 'F') AS femenino,
            COUNT(*) AS total
        FROM rm_data_registros
        ${whereClause}
        GROUP BY rango, grupo_orden
        ORDER BY grupo_orden
    `;

    const { rows } = await pool.query(query, [stepInt, ...permParams]);
    // Cachear por 1 hora (datos demográficos muy estables)
    await cache.set(cacheKey, rows, 3600);
    return rows;
};

/**
 * Obtiene la línea de tiempo de registros realizados según período y agrupación.
 *
 * @param {number} userId - ID del usuario solicitante
 * @param {object} options - { period, grouping, startDate, endDate }
 * @returns {Promise<Array<{periodo: string, orden: string, total: number}>>}
 */
exports.getRecordsTimeline = async (userId, options = {}) => {
    const period = ['current_week', 'current_month', 'current_year', 'custom'].includes(options.period)
        ? options.period
        : 'current_month';

    const grouping = ['year', 'month', 'week', 'day'].includes(options.grouping)
        ? options.grouping
        : 'day';

    const startDate = options.startDate && /^\d{4}-\d{2}-\d{2}$/.test(options.startDate) ? options.startDate : null;
    const endDate = options.endDate && /^\d{4}-\d{2}-\d{2}$/.test(options.endDate) ? options.endDate : null;

    const cacheKey = `dashboard:timeline:${userId}:${period}:${grouping}:${startDate || ''}:${endDate || ''}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Permisos geográficos
    const { permClause, permParams } = await buildRegistrosPermissionClause(userId);
    if (permClause === 'WHERE 1 = 0') return [];

    // Construcción de condiciones de fecha
    const dateConditions = ['create_date IS NOT NULL'];
    const queryParams = [...permParams];
    let paramIndex = queryParams.length + 1;

    if (period === 'current_week') {
        // Semana actual de Domingo a Sábado
        dateConditions.push(`create_date >= (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int * INTERVAL '1 day'))::date`);
        dateConditions.push(`create_date < ((CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int * INTERVAL '1 day'))::date + INTERVAL '7 days')::date`);
    } else if (period === 'current_month') {
        dateConditions.push(`create_date >= DATE_TRUNC('month', CURRENT_DATE)::date`);
        dateConditions.push(`create_date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date`);
    } else if (period === 'current_year') {
        dateConditions.push(`create_date >= DATE_TRUNC('year', CURRENT_DATE)::date`);
        dateConditions.push(`create_date < (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year')::date`);
    } else if (period === 'custom') {
        if (startDate) {
            dateConditions.push(`create_date >= $${paramIndex++}::date`);
            queryParams.push(startDate);
        }
        if (endDate) {
            dateConditions.push(`create_date < ($${paramIndex++}::date + INTERVAL '1 day')`);
            queryParams.push(endDate);
        }
    }

    const baseDateCond = dateConditions.join(' AND ');

    let whereClause;
    if (!permClause) {
        whereClause = `WHERE ${baseDateCond}`;
    } else {
        const geoCondition = permClause.replace(/^\s*WHERE\s+/i, '');
        whereClause = `WHERE ${baseDateCond} AND (${geoCondition})`;
    }

    // Expresiones de agrupación
    let selectPeriodo = "TO_CHAR(create_date, 'YYYY-MM-DD')";
    let selectOrden = "DATE_TRUNC('day', create_date)::date";

    if (grouping === 'year') {
        selectPeriodo = "TO_CHAR(create_date, 'YYYY')";
        selectOrden = "DATE_TRUNC('year', create_date)::date";
    } else if (grouping === 'month') {
        selectPeriodo = "TO_CHAR(create_date, 'YYYY-MM')";
        selectOrden = "DATE_TRUNC('month', create_date)::date";
    } else if (grouping === 'week') {
        selectPeriodo = `TO_CHAR((DATE_TRUNC('day', create_date) - (EXTRACT(DOW FROM create_date)::int * INTERVAL '1 day'))::date, 'DD/MM/YYYY')
                         || ' al ' ||
                         TO_CHAR(((DATE_TRUNC('day', create_date) - (EXTRACT(DOW FROM create_date)::int * INTERVAL '1 day'))::date + INTERVAL '6 days')::date, 'DD/MM/YYYY')`;
        selectOrden = "(DATE_TRUNC('day', create_date) - (EXTRACT(DOW FROM create_date)::int * INTERVAL '1 day'))::date";
    }

    const query = `
        SELECT
            ${selectPeriodo} AS periodo,
            ${selectOrden} AS orden,
            COUNT(*)::integer AS total
        FROM rm_data_registros
        ${whereClause}
        GROUP BY periodo, orden
        ORDER BY orden ASC
    `;

    const { rows } = await pool.query(query, queryParams);
    // Cachear 5 minutos
    await cache.set(cacheKey, rows, 300);
    return rows;
};
