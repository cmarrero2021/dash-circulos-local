const pool = require('../config/db');

const hasNationalDashboardAccess = async (userId) => {
  const query = `
        SELECT EXISTS (
            SELECT 1
            FROM usuarios u
            LEFT JOIN roles_permisos rp ON u.rol_id = rp.rol_id AND rp.permiso_id = (SELECT id FROM permisos WHERE nombre = 'ver_dashboard_nacional')
            LEFT JOIN usuarios_permisos up ON u.id = up.usuario_id AND up.permiso_id = (SELECT id FROM permisos WHERE nombre = 'ver_dashboard_nacional')
            WHERE u.id = $1 AND (rp.permiso_id IS NOT NULL OR up.permiso_id IS NOT NULL)
        );
    `;
  const { rows } = await pool.query(query, [userId]);
  return rows[0]?.exists || false;
};

const getAllowedStatesForUser = async (userId) => {
  const { rows } = await pool.query(
    'SELECT estado_id FROM usuarios_estados_permitidos WHERE usuario_id = $1 ORDER BY estado_id',
    [userId]
  );
  return rows.map((row) => row.estado_id);
};

const getAllowedMunicipalitiesForUser = async (userId) => {
  const { rows } = await pool.query(
    'SELECT estado_id, municipio_id FROM usuarios_municipios_permitidos WHERE usuario_id = $1',
    [userId]
  );
  return rows;
};

module.exports = {
  hasNationalDashboardAccess,
  getAllowedStatesForUser,
  getAllowedMunicipalitiesForUser,
};
