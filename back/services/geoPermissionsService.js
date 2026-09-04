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

/**
 * Verifica si un usuario puede actualizar el email en rm_credenciales
 * aunque el par vat+user_nationality no exista en rm_registros.
 *
 * Se concede si el usuario cumple CUALQUIERA de estas condiciones:
 *   1. Tiene acceso nacional (permiso 'ver_dashboard_nacional'), por rol o directo.
 *   2. Tiene el permiso especial 'editar_email_sin_registro', por rol o directo.
 *
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
const hasEmailWithoutRegistroPermission = async (userId) => {
  const query = `
    SELECT EXISTS (
      -- Condición 1: acceso nacional por rol
      SELECT 1
      FROM usuarios u
      JOIN roles_permisos rp ON u.rol_id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE u.id = $1 AND p.nombre = 'ver_dashboard_nacional'

      UNION

      -- Condición 1: acceso nacional por permiso directo
      SELECT 1
      FROM usuarios_permisos up
      JOIN permisos p ON up.permiso_id = p.id
      WHERE up.usuario_id = $1 AND p.nombre = 'ver_dashboard_nacional'

      UNION

      -- Condición 2: permiso especial por rol
      SELECT 1
      FROM usuarios u
      JOIN roles_permisos rp ON u.rol_id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE u.id = $1 AND p.nombre = 'editar_email_sin_registro'

      UNION

      -- Condición 2: permiso especial por asignación directa
      SELECT 1
      FROM usuarios_permisos up
      JOIN permisos p ON up.permiso_id = p.id
      WHERE up.usuario_id = $1 AND p.nombre = 'editar_email_sin_registro'
    );
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows[0]?.exists || false;
};

module.exports = {
  hasNationalDashboardAccess,
  getAllowedStatesForUser,
  getAllowedMunicipalitiesForUser,
  hasEmailWithoutRegistroPermission,
};
