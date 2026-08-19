const crypto = require('crypto');
const pool = require('../config/db');
const { cache } = require('../services/cacheService');
const { buildPriorizadosPermissionClause, buildRegistrosPermissionClause } = require('../services/dashboardService');

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

// ─── FIELD_MAP para rm_data_registros (tabla foránea → data_reportes.data_inass) ──

const FIELD_MAP_REGISTROS = {
    // Ubicación
    'estado': { sql: 'r.estado', label: 'Estado', category: 'Ubicación' },
    'cod_estado': { sql: 'r.cod_estado', label: 'Código de Estado', category: 'Ubicación' },
    'municipio': { sql: 'r.municipio', label: 'Municipio', category: 'Ubicación' },
    'parroquia': { sql: 'r.parroquia', label: 'Parroquia', category: 'Ubicación' },
    'calle': { sql: 'r.calle', label: 'Calle', category: 'Ubicación' },
    'calle2': { sql: 'r.calle2', label: 'Calle 2', category: 'Ubicación' },
    'num_casa': { sql: 'r.num_casa', label: 'Número de Casa', category: 'Ubicación' },
    'punto_referencia': { sql: 'r.punto_referencia', label: 'Punto de Referencia', category: 'Ubicación' },

    // Datos Personales
    'nombre_completo': { sql: 'r.nombre_completo', label: 'Nombre Completo', category: 'Datos Personales' },
    'cedula': { sql: 'r.cedula', label: 'Cédula', category: 'Datos Personales' },
    'email': { sql: 'r.email', label: 'Correo Electrónico', category: 'Datos Personales' },
    'phone': { sql: 'r.phone', label: 'Teléfono', category: 'Datos Personales' },
    'celular': { sql: 'r.celular', label: 'Celular', category: 'Datos Personales' },
    'nacionalidad': { sql: 'r.nacionalidad', label: 'Nacionalidad (V/E)', category: 'Datos Personales' },
    'genero': { sql: 'r.genero', label: 'Género (M/F)', category: 'Datos Personales' },
    'fecha_nacimiento': { sql: 'r.fecha_nacimiento', label: 'Fecha de Nacimiento', category: 'Datos Personales', date: true },
    'estado_civil': { sql: 'r.estado_civil', label: 'Estado Civil', category: 'Datos Personales' },

    // Vivienda
    'tipo_vivienda': { sql: 'r.tipo_vivienda', label: 'Tipo de Vivienda', category: 'Vivienda' },
    'condicion_casa': { sql: 'r.condicion_casa', label: 'Condición de la Casa', category: 'Vivienda' },
    'tipo_casa': { sql: 'r.tipo_casa', label: 'Tipo de Casa', category: 'Vivienda' },
    'otro_tipo_casa': { sql: 'r.otro_tipo_casa', label: 'Otro Tipo de Casa', category: 'Vivienda' },
    'vive_con': { sql: 'r.vive_con', label: 'Vive con', category: 'Vivienda' },
    'other_living_with': { sql: 'r.other_living_with', label: 'Otros con quien Vive', category: 'Vivienda' },
    'is_institutionalized_residency_center': { sql: 'r.is_institutionalized_residency_center', label: 'Reside en Centro (Sí/No)', category: 'Vivienda' },
    'residency_center': { sql: 'r.residency_center', label: 'Centro de Residencia', category: 'Vivienda' },

    // Alimentación
    'acceso_comida': { sql: 'r.acceso_comida', label: 'Acceso a Comida', category: 'Alimentación' },
    'frecuencia_alimentacion': { sql: 'r.frecuencia_alimentacion', label: 'Frecuencia de Alimentación', category: 'Alimentación' },
    'beneficio_clap': { sql: 'r.beneficio_clap', label: 'Beneficio CLAP', category: 'Alimentación' },
    'frecuencia_clap': { sql: 'r.frecuencia_clap', label: 'Frecuencia CLAP', category: 'Alimentación' },
    'complemento_clap': { sql: 'r.complemento_clap', label: 'Complemento CLAP', category: 'Alimentación' },
    'frecuencia_complemento': { sql: 'r.frecuencia_complemento', label: 'Frecuencia Complemento', category: 'Alimentación' },

    // Salud y Social
    'estatus_tratamiento': { sql: 'r.estatus_tratamiento', label: 'Estatus de Tratamiento', category: 'Salud y Social' },
    'discapacidades': { sql: 'r.discapacidades', label: 'Discapacidades', category: 'Salud y Social' },
    'enfermedades': { sql: 'r.enfermedades', label: 'Enfermedades', category: 'Salud y Social' },
    'otra_enfermedad': { sql: 'r.otra_enfermedad', label: 'Otra Enfermedad', category: 'Salud y Social' },
    'centros_salud': { sql: 'r.centros_salud', label: 'Centros de Salud', category: 'Salud y Social' },
    'organizacion_social': { sql: 'r.organizacion_social', label: 'Organización Social', category: 'Salud y Social' },
    'other_social_organization': { sql: 'r.other_social_organization', label: 'Otra Organización Social', category: 'Salud y Social' },

    // Educación
    'nivel_educativo': { sql: 'r.nivel_educativo', label: 'Nivel Educativo', category: 'Educación' },
    'compartir_conocimiento': { sql: 'r.compartir_conocimiento', label: 'Comparte Conocimiento', category: 'Educación' },
    'habilidades': { sql: 'r.habilidades', label: 'Habilidades', category: 'Educación' },
    'otra_habiidad': { sql: 'r.otra_habiidad', label: 'Otra Habilidad', category: 'Educación' },

    // Socioeconómico
    'fuente_ingresos': { sql: 'r.fuente_ingresos', label: 'Fuente de Ingresos', category: 'Socioeconómico' },
    'fuente_gastos': { sql: 'r.fuente_gastos', label: 'Fuente de Gastos', category: 'Socioeconómico' },
    'other_expense_source': { sql: 'r.other_expense_source', label: 'Otra Fuente de Gastos', category: 'Socioeconómico' },
    'etnicidad': { sql: 'r.etnicidad', label: 'Etnicidad', category: 'Socioeconómico' },
    'other_ethnicity': { sql: 'r.other_ethnicity', label: 'Otra Etnicidad', category: 'Socioeconómico' },
    'misiones_sociales': { sql: 'r.misiones_sociales', label: 'Misiones Sociales', category: 'Socioeconómico' },
    'medios_comunicacion': { sql: 'r.medios_comunicacion', label: 'Medios de Comunicación', category: 'Socioeconómico' },

    // Registro
    'create_date': { sql: 'r.create_date', label: 'Fecha de Registro', category: 'Registro', date: true },
    'tipo_actividades': { sql: 'r.tipo_actividades', label: 'Tipo de Actividades', category: 'Registro' },
};

// Fuentes de datos disponibles para la consulta dinámica:
//   'priorizados' → vista public.vpriorizados (tab Priorizados, se mantiene igual)
//   'registros'   → tabla foránea public.rm_data_registros (tab Registros)
const DATA_SOURCES = {
    priorizados: {
        table: 'public.vpriorizados p',
        fieldMap: FIELD_MAP,
        buildPerm: (userId) => buildPriorizadosPermissionClause(userId),
    },
    registros: {
        table: 'public.rm_data_registros r',
        fieldMap: FIELD_MAP_REGISTROS,
        buildPerm: (userId) => buildRegistrosPermissionClause(userId),
    },
};

function getDataSource(source) {
    return DATA_SOURCES[source] || DATA_SOURCES.priorizados;
}

// ─── Operadores de Filtro Dinámico ──────────────────────────────────────────────

// Builds a single SQL condition for one filter, advancing the param index.
// Returns null if the filter is invalid. Handles all advanced operators:
//   eq, neq, gt, lt, gte, lte, in, like, nlike, sw, nsw, ew, new,
//   between, nbetween, isnull, notnull, regex
//
// `value` can be empty only for isnull / notnull operators.
// `value2` is used by between / nbetween (min/max bounds).
function buildFilterCondition(filter, paramIdx, fieldMap = FIELD_MAP) {
    const fieldDef = fieldMap[filter.field];
    if (!fieldDef) return null;

    const sql = fieldDef.sql;
    const op = (filter.operator || 'eq').toLowerCase();
    const v  = filter.value;
    const v2 = filter.value2;

    const hasV  = v !== undefined && v !== null && v !== '';
    const hasV2 = v2 !== undefined && v2 !== null && v2 !== '';

    // ─── Null-check operators (no params consumed) ──────────────
    if (op === 'isnull')   return { clause: `${sql} IS NULL`,         value: null };
    if (op === 'notnull')  return { clause: `${sql} IS NOT NULL`,     value: null };

    // ─── Between / Not between (two params) ─────────────────────
    if (op === 'between' || op === 'nbetween') {
        if (!hasV || !hasV2) return null;
        const kw = op === 'between' ? 'BETWEEN' : 'NOT BETWEEN';
        return {
            clause: `${sql} ${kw} $${paramIdx} AND $${paramIdx + 1}`,
            value: [v, v2],
            paramCount: 2,
        };
    }

    // ─── Operators requiring a single value ────────────────────
    if (!hasV) return null;

    switch (op) {
        case 'eq':   return { clause: `${sql} = $${paramIdx}`,       value: v };
        case 'neq':  return { clause: `${sql} != $${paramIdx}`,      value: v };
        case 'gt':   return { clause: `${sql} > $${paramIdx}`,        value: v };
        case 'lt':   return { clause: `${sql} < $${paramIdx}`,        value: v };
        case 'gte':  return { clause: `${sql} >= $${paramIdx}`,       value: v };
        case 'lte':  return { clause: `${sql} <= $${paramIdx}`,       value: v };
        case 'like': return { clause: `${sql} ILIKE $${paramIdx}`,    value: `%${v}%` };
        case 'nlike':return { clause: `${sql} NOT ILIKE $${paramIdx}`,value: `%${v}%` };
        case 'sw':   return { clause: `${sql} ILIKE $${paramIdx}`,    value: `${v}%` };
        case 'nsw':  return { clause: `${sql} NOT ILIKE $${paramIdx}`,value: `${v}%` };
        case 'ew':   return { clause: `${sql} ILIKE $${paramIdx}`,    value: `%${v}` };
        case 'new':  return { clause: `${sql} NOT ILIKE $${paramIdx}`,value: `%${v}` };
        case 'in':   return { clause: `${sql} = ANY($${paramIdx})`,   value: String(v).split(',').map(s => s.trim()).filter(Boolean) };
        case 'nin':  return { clause: `${sql} != ALL($${paramIdx})`,  value: String(v).split(',').map(s => s.trim()).filter(Boolean) };
        case 'regex':return { clause: `${sql} ~ $${paramIdx}`,        value: v };
        default:     return { clause: `${sql} = $${paramIdx}`,        value: v };
    }
}

/**
 * Genera un hash SHA-256 de los argumentos normalizados para usar como clave de caché.
 * Garantiza que el mismo conjunto de argumentos en diferente orden produce la misma clave.
 */
function buildArgsHash(args) {
    const normalized = JSON.stringify({
        source:  args.source || 'priorizados',
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
    // `source` permite distinguir el catálogo de campos entre vpriorizados y
    // rm_data_registros. Default 'priorizados' (comportamiento original).
    availableFields: async (_, args = {}) => {
        const source = args.source || 'priorizados';
        const fieldMap = getDataSource(source).fieldMap;
        const cacheKey = `graphql:availableFields:${source}`;
        const cached = await cache.get(cacheKey);
        if (cached) return cached;

        const fields = Object.entries(fieldMap).map(([key, def]) => ({
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
            const source = args.source || 'priorizados';
            const ds = getDataSource(source);
            const fieldMap = ds.fieldMap;
            const tableSQL = ds.table;

            const requestedFields = args.fields || ['nombre', 'cedula'];
            const filters = args.filters || [];
            const groupByFields = args.groupBy || [];
            const valueFields = args.values || [];
            const limit = args.limit || 5000;

            // 1. Obtener cláusula de permisos obligatorios (seguridad geográfica)
            const { permClause, permParams, nextParamIndex } = await ds.buildPerm(userId);

            let paramIdx = nextParamIndex;
            const queryParams = [...permParams];

            // 2. Construir filtros dinámicos del usuario.
            // Soporta agrupación AND/OR por campo: condiciones consecutivas con el
            // mismo `field` se agrupan con `(...)` y se combinan con `combine`.
            let filterGroups = [];
            let currentGroup = null; // { field, parts: [{ conn, fragment }] }
            for (const f of filters) {
                const condition = buildFilterCondition(f, paramIdx, fieldMap);
                if (!condition) continue;

                if (condition.value !== null) {
                    // between/nbetween push a [v, v2] array; others push scalar.
                    // pg treats array binding as a single $n param only when used
                    // with ANY/ALL, but BETWEEN uses two placeholders bound to v and v2.
                    if (condition.paramCount === 2) {
                        // value === [v, v2] → push twice (one per placeholder)
                        queryParams.push(condition.value[0]);
                        queryParams.push(condition.value[1]);
                    } else {
                        queryParams.push(condition.value);
                    }
                }
                paramIdx += condition.paramCount || 1;

                const fragment = condition.clause;
                if (currentGroup && currentGroup.field === f.field) {
                    const conn = (f.combine || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND';
                    currentGroup.parts.push({ conn, fragment });
                } else {
                    if (currentGroup) filterGroups.push(currentGroup);
                    currentGroup = { field: f.field, parts: [{ conn: 'AND', fragment }] };
                }
            }
            if (currentGroup) filterGroups.push(currentGroup);

            // Render each group: single-condition groups emit the bare fragment,
            // multi-condition groups emit `( frag1 OP frag2 OP ... )` where OP
            // is the `combine` declared by each condition (except the first one,
            // which always acts as the group opener).
            const renderedClauses = filterGroups.map(g => {
                if (g.parts.length === 1) return g.parts[0].fragment;
                const inner = g.parts.map((p, i) => (i === 0 ? p.fragment : `${p.conn} ${p.fragment}`)).join(' ');
                return `(${inner})`;
            });

            // Combinar permisos con filtros dinámicos
            let whereClause = permClause;
            if (renderedClauses.length > 0) {
                const filtersSQL = renderedClauses.join(' AND ');
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
                    const def = fieldMap[gf];
                    if (def) {
                        const alias = gf.replace('.', '_');
                        selectParts.push(`${def.sql} AS ${alias}`);
                        columnNames.push(gf);
                    }
                }
                for (const vf of valueFields) {
                    const def = fieldMap[vf.field];
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
                    const def = fieldMap[rf];
                    if (def) {
                        const alias = rf.replace('.', '_');
                        selectParts.push(`${def.sql} AS ${alias}`);
                        columnNames.push(rf);
                    }
                }
            }

            if (selectParts.length === 0) {
                selectParts.push('COUNT(*) AS count');
                columnNames.push('count');
            }

            const groupBySQL = groupByFields.length
                ? 'GROUP BY ' + groupByFields.map(gf => fieldMap[gf]?.sql).filter(Boolean).join(', ')
                : '';

            const sql = `
                SELECT ${selectParts.join(', ')}
                FROM ${tableSQL}
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
