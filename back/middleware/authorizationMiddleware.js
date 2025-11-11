const pool = require('../config/db');

/**
 * Fábrica de middleware para verificar si un usuario tiene un permiso específico.
 * @param {string} requiredPermissionName - El nombre del permiso requerido.
 * @returns {function} Middleware de Express.
 */
const authorize = (requiredPermissionName) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Autenticación requerida.' });
    }

    const userId = req.user.id;

    try {
      // Consulta final y corregida usando los nombres de columna de las tablas proporcionadas.
      const query = `
        SELECT EXISTS (
          -- Permisos heredados a través del rol del usuario
          SELECT 1
          FROM usuarios u
          -- CORRECCIÓN: La columna en la tabla 'usuarios' es 'rol_id'
          JOIN roles_permisos rp ON u.rol_id = rp.rol_id 
          JOIN permisos p ON rp.permiso_id = p.id
          WHERE u.id = $1 AND p.nombre = $2
          
          UNION
          
          -- Permisos asignados directamente al usuario
          SELECT 1
          FROM usuarios_permisos up
          JOIN permisos p ON up.permiso_id = p.id
          WHERE up.usuario_id = $1 AND p.nombre = $2
        );
      `;

      const { rows } = await pool.query(query, [userId, requiredPermissionName]);
      const hasPermission = rows[0].exists;

      if (hasPermission) {
        return next(); // El usuario tiene el permiso, continuar.
      }

      // Si no tiene el permiso, denegar acceso.
      return res.status(403).json({ message: 'Acceso prohibido. No tiene los permisos necesarios.' });

    } catch (error) {
      console.error('Error en el middleware de autorización:', error);
      return res.status(500).send('Error del servidor al verificar permisos.');
    }
  };
};

module.exports = authorize;