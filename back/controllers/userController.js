// controllers/userController.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// @desc    Obtener todos los usuarios
// @access  Admin
exports.getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.nombre, u.email, u.cedula, u.activo, r.nombre as rol
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      ORDER BY u.nombre;
    `;
    const users = await pool.query(query);
    res.json(users.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};

// @desc    Crear un nuevo usuario
// @access  Admin
exports.createUser = async (req, res) => {
  // Añadimos 'cedula' a la desestructuración del body
  const { nombre, email, password, cedula, activo, rol_id } = req.body;

  // Actualizamos la validación
  if (!nombre || !email || !password || !cedula) {
    return res.status(400).json({ message: 'Nombre, email, contraseña y cédula son requeridos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Actualizamos la consulta INSERT
    const query = `
      INSERT INTO usuarios (nombre, email, password_hash, cedula, activo, rol_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nombre, email, cedula, activo, rol_id;
    `;
    const newUser = await client.query(query, [nombre, email, passwordHash, cedula, activo, rol_id]);

    await client.query('COMMIT');
    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    // Manejar errores de unicidad para email y/o cédula (si tienes una constraint UNIQUE)
    if (error.code === '23505') {
        if (error.constraint.includes('email')) {
            return res.status(409).json({ message: 'El email ya está en uso.' });
        }
        if (error.constraint.includes('cedula')) {
            return res.status(409).json({ message: 'La cédula ya está registrada.' });
        }
    }
    console.error(error.message);
    res.status(500).send('Error del servidor');
  } finally {
    client.release();
  }
};

// @desc    Actualizar un usuario (incluye suspender/reactivar)
// @access  Admin
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  // Añadimos 'cedula' a la desestructuración
  const { nombre, email, cedula, activo, rol_id } = req.body;

  if (!nombre || !email || !cedula) {
    return res.status(400).json({ message: 'Nombre, email y cédula son requeridos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Actualizamos la consulta UPDATE
    const query = `
      UPDATE usuarios
      SET nombre = $1, email = $2, cedula = $3, activo = $4, rol_id = $5
      WHERE id = $6
      RETURNING id, nombre, email, cedula, activo, rol_id;
    `;
    const updatedUser = await client.query(query, [nombre, email, cedula, activo, rol_id, id]);

    if (updatedUser.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    await client.query('COMMIT');
    res.json(updatedUser.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
        if (error.constraint.includes('email')) {
            return res.status(409).json({ message: 'El email ya está en uso por otro usuario.' });
        }
        if (error.constraint.includes('cedula')) {
            return res.status(409).json({ message: 'La cédula ya está en uso por otro usuario.' });
        }
    }
    console.error(error.message);
    res.status(500).send('Error del servidor');
  } finally {
    client.release();
  }
};