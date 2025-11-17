// controllers/authController.js

const pool = require('../config/db'); // Nuestro pool de conexión a la BD
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Registra un intento de login en la tabla de auditoría.
 * @param {string} emailIntroducido - El email usado para el intento.
 * @param {boolean} exitoso - Si el login fue exitoso o no.
 * @param {string} ip - La IP de origen de la petición.
 * @param {number|null} usuarioId - El ID del usuario si el login fue exitoso.
 * @returns {Promise<number|null>} El ID del registro de auditoría creado.
 */
const auditarLogin = async (emailIntroducido, exitoso, ip, usuarioId = null) => {
  const query = `
    INSERT INTO auditoria_sesiones (usuario_introducido, ingreso_exitoso, ip_origen, id_usuario_fk)
    VALUES ($1, $2, $3, $4)
    RETURNING id;
  `;
  try {
    const res = await pool.query(query, [emailIntroducido, exitoso, ip, usuarioId]);
    return res.rows[0].id;
  } catch (error) {
    console.error('Error al auditar el intento de login:', error);
    return null;
  }
};


/**
 * Maneja el login de un usuario.
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;
  // Obtenemos la IP. 'x-forwarded-for' es para cuando hay un proxy (como Nginx).
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // 1. Buscar al usuario por email
    const userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = userResult.rows[0];

    // Si el usuario no existe, registramos el fallo y respondemos
    if (!user) {
      await auditarLogin(email, false, ip);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // 2. Comparar la contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);

    // Si la contraseña no coincide, registramos el fallo y respondemos
    if (!isMatch) {
      await auditarLogin(email, false, ip, user.id);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Si el usuario está inactivo, no puede ingresar
    if (!user.activo) {
      await auditarLogin(email, false, ip, user.id);
      return res.status(403).json({ message: 'El usuario se encuentra suspendido.' });
    }

    // 3. Login exitoso: Auditar el éxito
    const auditId = await auditarLogin(email, true, ip, user.id);

    // 4. Obtener información del rol para incluirla en la sesión
    const roleId = user.rol_id ?? user.id_rol_fk ?? user.role_id ?? null;
    let roleName = 'Rol no definido';
    if (roleId) {
      const roleResult = await pool.query('SELECT nombre FROM roles WHERE id = $1', [roleId]);
      roleName = roleResult.rows[0]?.nombre || roleName;
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      roleId,
      role: roleName,
    };

    // 5. Crear el JWT con los datos necesarios para reconstruir la sesión
    const payload = {
      user: sessionUser,
      auditId, // Incluimos el ID de la auditoría en el token para el logout
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.json({ token, user: sessionUser });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};


const cache = require('../services/cacheService');

/**
 * Maneja el logout de un usuario.
 * Invalida el token y registra el evento.
 */
exports.logout = async (req, res) => {
  const auditId = req.auditId; // Obtenido del middleware de autenticación

  try {
    // 1. Invalidar el token añadiéndolo a la caché de "blocklist"
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token);

      if (decoded && decoded.exp) {
        const expiresAt = decoded.exp * 1000; // `exp` está en segundos, convertir a ms
        const remainingTime = Math.ceil((expiresAt - Date.now()) / 1000); // TTL en segundos

        if (remainingTime > 0) {
          // La clave es el token, el valor es 'invalidated', y el TTL es el tiempo que le queda al token
          cache.set(token, 'invalidated', remainingTime);
        }
      }
    }

    // 2. Actualizar la tabla de auditoría (si aplica)
    if (auditId) {
      const query = `
        UPDATE auditoria_sesiones
        SET timestamp_logout = CURRENT_TIMESTAMP
        WHERE id = $1;
      `;
      await pool.query(query, [auditId]);
    }

    res.status(200).json({ message: 'Sesión cerrada exitosamente.' });

  } catch (error) {
    console.error('Error al procesar el logout:', error);
    res.status(500).send('Error del servidor');
  }
};