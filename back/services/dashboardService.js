// services/dashboardService.js
const pool = require('../config/db');

/**
 * CONSTRUCTOR DE FILTROS SEGUROS
 * Construye la cláusula WHERE y los parámetros para una consulta,
 * combinando los permisos OBLIGATORIOS del usuario con filtros VOLUNTARIOS de la UI.
 * @param {number} userId - El ID del usuario que realiza la petición.
 * @param {object} voluntaryFilters - Filtros opcionales { estado_id, municipio_id }.
 * @returns {Promise<{whereClause: string, params: Array<any>}>}
 */
const buildFilterClause = async (userId, voluntaryFilters = {}) => {
  const client = await pool.connect();
  try {
    // 1. Verificar si el usuario tiene acceso nacional
    // const nationalAccessRes = await client.query(
    //   `SELECT 1 FROM usuarios_permisos up JOIN permisos p ON up.permiso_id = p.id WHERE up.usuario_id = $1 AND p.nombre = 'ver_dashboard_nacional'`,
    //   [userId]
    // );
    const nationalAccessQuery = `
        SELECT 1 FROM usuarios_permisos up JOIN permisos p ON up.permiso_id = p.id WHERE up.usuario_id = $1 AND p.nombre = $2
        UNION
        SELECT 1 FROM roles_permisos rp JOIN permisos p ON rp.permiso_id = p.id JOIN usuarios u ON u.rol_id = rp.rol_id WHERE u.id = $1 AND p.nombre = $2;
    `;
    const nationalAccessRes = await client.query(nationalAccessQuery, [userId, 'ver_dashboard_nacional']);
    let permissionConditions = [];
    const params = [];
    let paramIndex = 1;

    if (nationalAccessRes.rowCount === 0) {
      // Si no tiene acceso nacional, obtenemos sus permisos geográficos
      const statesRes = await client.query('SELECT estado_id FROM usuarios_estados_permitidos WHERE usuario_id = $1', [userId]);
      const munisRes = await client.query('SELECT estado_id, municipio_id FROM usuarios_municipios_permitidos WHERE usuario_id = $1', [userId]);

      if (statesRes.rowCount === 0 && munisRes.rowCount === 0) {
        return { whereClause: 'WHERE 1 = 0', params: [] }; // No tiene permisos, no devuelve nada
      }

      if (statesRes.rowCount > 0) {
        permissionConditions.push(`estado_id = ANY($${paramIndex++})`);
        params.push(statesRes.rows.map(r => r.estado_id));
      }

      if (munisRes.rowCount > 0) {
        const muniClauses = munisRes.rows.map(m => {
          const stateParam = `$${paramIndex++}`;
          const muniParam = `$${paramIndex++}`;
          params.push(m.estado_id, m.municipio_id);
          return `(estado_id = ${stateParam} AND municipio_id = ${muniParam})`;
        });
        permissionConditions.push(`(${muniClauses.join(' OR ')})`);
      }
    }

    // 2. Construir la cláusula de filtros voluntarios (de la UI)
    let voluntaryConditions = [];
    if (voluntaryFilters.estado_id) {
        voluntaryConditions.push(`estado_id = $${paramIndex++}`);
        params.push(voluntaryFilters.estado_id);
    }
    if (voluntaryFilters.municipio_id) {
        voluntaryConditions.push(`municipio_id = $${paramIndex++}`);
        params.push(voluntaryFilters.municipio_id);
    }
    
    // 3. Combinar todo en la cláusula WHERE final
    const permissionClause = permissionConditions.length > 0 ? `(${permissionConditions.join(' OR ')})` : '1 = 1';
    const voluntaryClause = voluntaryConditions.length > 0 ? `(${voluntaryConditions.join(' AND ')})` : '1 = 1';
    
    return {
        whereClause: `WHERE ${permissionClause} AND ${voluntaryClause}`,
        params
    };

  } finally {
    client.release();
  }
};


// --- Funciones de Agregación para los Endpoints ---

exports.getCirclesByState = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT estado_id, estado, COUNT(id) as total_circulos
        FROM rm_circulos_remoto
        ${whereClause}
        GROUP BY estado_id, estado
        ORDER BY estado;
    `;
    const result = await pool.query(query, params);
    return result.rows;
};

exports.getCirclesByMunicipality = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT estado_id, estado, municipio_id, municipio, COUNT(id) as total_circulos
        FROM rm_circulos_remoto
        ${whereClause}
        GROUP BY estado_id, estado, municipio_id, municipio
        ORDER BY estado, municipio;
    `;
    const result = await pool.query(query, params);
    return result.rows;
};

// ... (Aquí irían las demás funciones: por comuna, por certificación, etc.) ...

exports.getTotalCircles = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `SELECT COUNT(id) as total FROM rm_circulos_remoto ${whereClause}`;
    const result = await pool.query(query, params);
    return result.rows[0];
};

exports.getDailyAverage = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    const query = `
        SELECT 
            COUNT(id) as total_circulos,
            COUNT(DISTINCT certificacion) as total_dias,
            -- Usamos GREATEST para evitar división por cero si no hay días
            COUNT(id)::DECIMAL / GREATEST(COUNT(DISTINCT certificacion), 1) as promedio_diario
        FROM rm_circulos_remoto
        ${whereClause};
    `;
    const result = await pool.query(query, params);
    return result.rows[0];
};

// Endpoint para la "tabla dinámica"
exports.getRawData = async (userId, filters) => {
    const { whereClause, params } = await buildFilterClause(userId, filters);
    // ADVERTENCIA: En producción, esto DEBE tener paginación (LIMIT/OFFSET)
    const query = `SELECT * FROM rm_circulos_remoto ${whereClause} ORDER BY estado, municipio, parroquia`;
    const result = await pool.query(query, params);
    return result.rows;
};