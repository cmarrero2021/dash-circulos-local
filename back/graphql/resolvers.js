const crypto = require('crypto');
const pool = require('../config/db');
const { cache } = require('../services/cacheService');
const { buildPriorizadosPermissionClause } = require('../services/dashboardService');

// TTL para consultas dinámicas (corto para preservar naturaleza dinámica)
const GRAPHQL_DATA_TTL   = 60;    // 60 segundos — resultados de dashboardData
const GRAPHQL_FIELDS_TTL = 3600;  // 1 hora — availableFields es estático

// ─── FIELD_MAP para vpriorizados ────────────────────────────────────────────────

const FIELD_MAP = {
    // Ubicación
    'estado': { sql: 'p.estado', label: 'Estado', category: 'Ubicación' },
    'municipio': { sql: 'p.municipio', label: 'Municipio', category: 'Ubicación' },
    'parroquia': { sql: 'p.parroquia', label: 'Parroquia', category: 'Ubicación' },
    'comunidad': { sql: 'p.comunidad', label: 'Comunidad', category: 'Ubicación' },

    // Datos Personales
    'nombre': { sql: 'p.nombre', label: 'Nombre Completo', category: 'Datos Personales' },
    'cedula': { sql: 'p.cedula', label: 'Cédula', category: 'Datos Personales', numeric: true },
    'nac': { sql: 'p.nac', label: 'Nacionalidad (V/E)', category: 'Datos Personales' },
    'sexo': { sql: 'p.sexo', label: 'Sexo (M/F)', category: 'Datos Personales' },
    'fecha_nac': { sql: 'p.fecha_nac', label: 'Fecha de Nacimiento', category: 'Datos Personales', date: true },
    'telefono': { sql: 'p.telefono', label: 'Teléfono', category: 'Datos Personales' },

    // Atributos
    'patria': { sql: 'p.patria', label: 'Carnet de la Patria', category: 'Atributos' },
    'validado': { sql: 'p.validado', label: 'Validado', category: 'Atributos' },
    'mayor60': { sql: 'p.mayor60', label: 'Adulto Mayor (+60)', category: 'Atributos' },
    'registro': { sql: 'p.registro', label: 'Registrado en el Sistema', category: 'Atributos' },
    'circulo': { sql: 'p.circulo', label: 'Pertenece a Círculo', category: 'Atributos' },
    'nuevos': { sql: 'p.nuevos', label: 'Nuevo Registro', category: 'Atributos' },
    'fallecido': { sql: 'p.fallecido', label: 'Fallecido', category: 'Atributos' },
    'excepcional': { sql: 'p.excepcional', label: 'Excepcional', category: 'Atributos' }
};

// ─── Operadores de Filtro Dinámico ──────────────────────────────────────────────

function buildFilterCondition(filter, paramIdx) {
    const fieldDef = FIELD_MAP[filter.field];
    if (!fieldDef) return null;

    const sql = fieldDef.sql;
    const op = (filter.operator || 'eq').toLowerCase();

    switch (op) {
        case 'eq': return { clause: `${sql} = $${paramIdx}`, value: filter.value };
        case 'neq': return { clause: `${sql} != $${paramIdx}`, value: filter.value };
        case 'gt': return { clause: `${sql} > $${paramIdx}`, value: filter.value };
        case 'lt': return { clause: `${sql} < $${paramIdx}`, value: filter.value };
        case 'gte': return { clause: `${sql} >= $${paramIdx}`, value: filter.value };
        case 'lte': return { clause: `${sql} <= $${paramIdx}`, value: filter.value };
        case 'like': return { clause: `${sql} ILIKE $${paramIdx}`, value: `%${filter.value}%` };
        case 'in': return { clause: `${sql} = ANY($${paramIdx})`, value: filter.value.split(',') };
        default: return { clause: `${sql} = $${paramIdx}`, value: filter.value };
    }
}

/**
 * Genera un hash SHA-256 de los argumentos normalizados para usar como clave de caché.
 * Garantiza que el mismo conjunto de argumentos en diferente orden produce la misma clave.
 */
function buildArgsHash(args) {
    const normalized = JSON.stringify({
        fields:  [...(args.fields  || [])].sort(),
        filters: [...(args.filters || [])].sort((a, b) => a.field.localeCompare(b.field)),
        groupBy: [...(args.groupBy || [])].sort(),
        values:  [...(args.values  || [])].sort((a, b) => a.field.localeCompare(b.field)),
        limit:   args.limit || 5000,
    });
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

// ─── Resolvers ──────────────────────────────────────────────────────────────────

const resolvers = {
    // metadata de campos disponibles — se cachea 1 hora (es completamente estático)
    availableFields: async () => {
        const cacheKey = 'graphql:availableFields';
        const cached = await cache.get(cacheKey);
        if (cached) return cached;

        const fields = Object.entries(FIELD_MAP).map(([key, def]) => ({
            key,
            label: def.label,
            category: def.category,
            numeric: !!def.numeric,
            date: !!def.date,
        }));
        const result = JSON.stringify(fields);
        await cache.set(cacheKey, result, GRAPHQL_FIELDS_TTL);
        return result;
    },

    // Consulta flexible para tabla/gráfico dinámicos —
    // se cachea 60 segundos por combinación única de (userId + args).
    // La naturaleza dinámica se preserva porque:
    //   1. TTL corto: tras 60s se reconsulta la BD directamente
    //   2. Cambiar cualquier argumento produce un hash diferente → nueva consulta
    //   3. Un evento de BD (notificationListener) invalida TODAS las claves graphql:dashboardData:*
    dashboardData: async (_, args, context) => {
        const userId = context.userId;
        const argsHash = buildArgsHash(args);
        const cacheKey = `graphql:dashboardData:${userId}:${argsHash}`;

        // Verificar caché antes de conectar a la BD
        const cached = await cache.get(cacheKey);
        if (cached) return cached;

        const client = await pool.connect();
        try {
            const requestedFields = args.fields || ['nombre', 'cedula'];
            const filters = args.filters || [];
            const groupByFields = args.groupBy || [];
            const valueFields = args.values || [];
            const limit = args.limit || 5000;

            // 1. Obtener cláusula de permisos obligatorios (seguridad geográfica)
            const { permClause, permParams, nextParamIndex } = await buildPriorizadosPermissionClause(userId);

            let paramIdx = nextParamIndex;
            const queryParams = [...permParams];

            // 2. Construir filtros dinámicos del usuario
            let filterClauses = [];
            for (const f of filters) {
                const condition = buildFilterCondition(f, paramIdx);
                if (condition) {
                    filterClauses.push(condition.clause);
                    queryParams.push(condition.value);
                    paramIdx++;
                }
            }

            // Combinar permisos con filtros dinámicos
            let whereClause = permClause;
            if (filterClauses.length > 0) {
                const filtersSQL = filterClauses.join(' AND ');
                if (whereClause) {
                    whereClause += ' AND ' + filtersSQL;
                } else {
                    whereClause = 'WHERE ' + filtersSQL;
                }
            }

            // 3. SELECT y agrupación dinámicos
            let selectParts = [];
            let columnNames = [];

            if (groupByFields.length > 0 || valueFields.length > 0) {
                // Modo Agrupación/Agregación (Pivot)
                for (const gf of groupByFields) {
                    const def = FIELD_MAP[gf];
                    if (def) {
                        const alias = gf.replace('.', '_');
                        selectParts.push(`${def.sql} AS ${alias}`);
                        columnNames.push(gf);
                    }
                }
                for (const vf of valueFields) {
                    const def = FIELD_MAP[vf.field];
                    if (def) {
                        const agg = vf.aggregation || 'COUNT';
                        const alias = `${vf.field.replace('.', '_')}_${agg.toLowerCase()}`;
                        if (agg === 'COUNT') {
                            selectParts.push(`COUNT(${def.sql}) AS ${alias}`);
                        } else {
                            selectParts.push(`${agg}(${def.sql}::numeric) AS ${alias}`);
                        }
                        columnNames.push(`${vf.field}(${agg})`);
                    }
                }
                // Si hay valores pero no hay agrupación, da una sola fila
                if (groupByFields.length === 0 && valueFields.length === 0) {
                    selectParts.push('COUNT(*) AS count');
                    columnNames.push('count');
                }
            } else {
                // Modo Detalle raw (Sin agrupación)
                for (const rf of requestedFields) {
                    const def = FIELD_MAP[rf];
                    if (def) {
                        const alias = rf.replace('.', '_');
                        selectParts.push(`${def.sql} AS ${alias}`);
                        columnNames.push(rf);
                    }
                }
            }

            if (selectParts.length === 0) {
                selectParts.push('p.id AS p_id');
                columnNames.push('id');
            }

            const groupBySQL = groupByFields.length
                ? 'GROUP BY ' + groupByFields.map(gf => FIELD_MAP[gf]?.sql).filter(Boolean).join(', ')
                : '';

            const sql = `
                SELECT ${selectParts.join(', ')}
                FROM public.vpriorizados p
                ${whereClause}
                ${groupBySQL}
                ORDER BY 1
                LIMIT ${Math.min(limit, 10000)}
            `;

            const result = await client.query(sql, queryParams);

            const data = {
                columns: columnNames,
                rows: JSON.stringify(result.rows),
                totalRows: result.rows.length,
            };

            // Guardar en caché con TTL corto (60s)
            await cache.set(cacheKey, data, GRAPHQL_DATA_TTL);

            return data;
        } finally {
            client.release();
        }
    }
};

module.exports = { resolvers, FIELD_MAP };
