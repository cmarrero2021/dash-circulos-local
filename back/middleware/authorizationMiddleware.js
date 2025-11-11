// middleware/authorizationMiddleware.js
const pool = require('../config/db');

/**
 * Fábrica de middleware que crea una función para verificar si un usuario tiene un permiso específico.
 * Se debe usar DESPUÉS del middleware de autenticación.
 * @param {string} requiredPermission - El nombre del permiso (ej: 'manage_users') requerido para la ruta.
 * @returns {function} Una función de middleware de Express.
 */
const authorize = (requiredPermissionName) => {
  return async (req, res, next) => {
    // ... (la comprobación de req.user no cambia)
    const userId = req.user.id;
    try {
      const permissionQuery = `
        SELECT 1 FROM usuarios_permisos up
        JOIN permisos p ON up.permiso_id = p.id
        WHERE up.usuario_id = $1 AND LOWER(TRIM(p.nombre)) = LOWER(TRIM($2))
        UNION
        SELECT 1 FROM roles_permisos rp
        JOIN permisos p ON rp.permiso_id = p.id
        JOIN usuarios u ON u.rol_id = rp.rol_id
        WHERE u.id = $1 AND LOWER(TRIM(p.nombre)) = LOWER(TRIM($2));
      `;
      const result = await pool.query(permissionQuery, [userId, requiredPermissionName]);

      if (result.rowCount > 0) return next();
      
      return res.status(403).json({ message: 'Acceso prohibido. No tiene los permisos necesarios.' });
    } catch (error) {
      // ... (manejo de errores no cambia)
    }
  };
};
module.exports = authorize;