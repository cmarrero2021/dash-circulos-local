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

    return {
        meta,
        acumulado,
        diferencia,
        dias_faltantes: diasFaltantesFromView,
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
        SELECT estado_id, estado, municipio_id, municipio, COUNT(*) as avance
        FROM rm_circulos_remoto
        ${whereClause}
        GROUP BY estado_id, estado, municipio_id, municipio
        ORDER BY estado, municipio;
    `;
    const result = await pool.query(query, params);
    return result.rows;
};

exports.getCirclesByStateMunicipiosParroquias = async (userId, filters = {}) => {
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
    return result.rows;
};

exports.getCirclesByStateMunicipiosParroquiasComunas = async (userId, filters = {}) => {
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
    const { rows } = await pool.query(query, params);
    return rows;
};

// --- Función para obtener datos del mapa (porcentajes por estado) ---
exports.getMapaEstados = async (userId) => {
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
    return rows;
};

// --- Función para obtener participantes por estado (capa de dispersión) ---
exports.getParticipantesPorEstado = async (userId) => {
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
    return rows;
};

// --- Función para obtener priorizados por estado (capa de dispersión triángulos) ---
exports.getPriorizadosPorEstado = async (userId) => {
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
    return rows;
};

// --- Función para obtener indicadores de registros básicos por estado ---
exports.getRegistrosIndicadoresPorEstado = async (userId) => {
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
    return rows;
};

// --- Función para obtener indicadores de registros básicos nacionales (o del scope del usuario) ---
exports.getRegistrosIndicadoresNacionales = async (userId) => {
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
        return rows[0] || {};
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
    return rows[0] || {};
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

/**
 * Obtiene datos paginados de vpriorizados con filtrado server-side.
 * @param {number} userId
 * @param {object} query - Query params del request HTTP
 * @returns {Promise<{ rows: object[], totalRows: number }>}
 */
exports.getPriorizados = async (userId, query = {}) => {
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
    if (query.sexo && query.sexo !== 'Todos') {
        conditions.push(`sexo = $${pi}`);
        params.push(query.sexo);
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
        'telefono', 'fecha_nac', 'sexo', 'comunidad', 'integrantes',
        'menores', 'registro', 'circulo',
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

    // Modo exportación: sin paginación
    const isExport = query.export === 'true';

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

    return { rows, totalRows };
};

/**
 * Obtiene los valores únicos para los filtros desplegables de vpriorizados,
 * respetando los permisos del usuario y cascada geográfica.
 * @param {number} userId
 * @param {object} query - { estados, municipios, parroquias } (comma-separated strings)
 */
exports.getPriorizadosFilterOptions = async (userId, query = {}) => {
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

    return {
        estados: (estRes.rows[0]?.vals || []).sort(),
        municipios: munVals.sort(),
        parroquias: parVals.sort(),
        comunidades: comVals.sort(),
    };
};
