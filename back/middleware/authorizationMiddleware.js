// middleware/authorizationMiddleware.js
const pool = require('../config/db');

/**
 * Fábrica de middleware que crea una función para verificar si un usuario tiene un permiso específico.
 * Se debe usar DESPUÉS del middleware de autenticación.
 * @param {string} requiredPermission - El nombre del permiso (ej: 'manage_users') requerido para la ruta.
 * @returns {function} Una función de middleware de Express.
 */
const authorize = (requiredPermission) => {
  // Devolvemos la función de middleware asíncrona que Express ejecutará
  return async (req, res, next) => {
    // El objeto req.user debe haber sido adjuntado previamente por authMiddleware
    if (!req.user || !req.user.id) {
      // Esto es una salvaguarda, pero authMiddleware ya debería haberlo manejado
      return res.status(401).json({ message: 'No se ha autenticado el usuario para la autorización.' });
    }

    const userId = req.user.id;

    try {
      // Esta consulta SQL es el corazón de la autorización.
      // Busca el permiso requerido en dos lugares:
      // 1. En los permisos directos del usuario (tabla usuarios_permisos).
      // 2. En los permisos del rol que tiene asignado el usuario (tablas roles_permisos y usuarios).
      // El UNION combina los resultados de ambas búsquedas.
      const permissionQuery = `
        SELECT 1 FROM usuarios_permisos up
        JOIN permisos p ON up.permiso_id = p.id
        WHERE up.usuario_id = $1 AND p.nombre = $2
        UNION
        SELECT 1 FROM roles_permisos rp
        JOIN permisos p ON rp.permiso_id = p.id
        JOIN usuarios u ON u.rol_id = rp.rol_id
        WHERE u.id = $1 AND p.nombre = $2;
      `;

      const result = await pool.query(permissionQuery, [userId, requiredPermission]);

      // Si la consulta devuelve CUALQUIER fila (rowCount > 0), significa que se encontró el permiso.
      if (result.rowCount > 0) {
        // El usuario tiene el permiso, así que llamamos a next() para que continúe a la siguiente función (el controlador).
        return next();
      } else {
        // El usuario está autenticado, pero no tiene el permiso específico para esta acción.
        // Devolvemos un error 403 Forbidden.
        return res.status(403).json({ message: 'Acceso prohibido. No tiene los permisos necesarios.' });
      }
    } catch (error) {
      console.error('Error en el middleware de autorización:', error);
      return res.status(500).send('Error del servidor');
    }
  };
};

module.exports = authorize;