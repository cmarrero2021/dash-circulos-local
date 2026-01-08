const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { refreshMaterializedView } = require('../services/materializedViewScheduler');

const formatDbUser = (row = {}) => ({
  id: row.id,
  nombre: row.nombre,
  email: row.email,
  rol_id: row.rol_id,
  rol_nombre: row.rol_nombre,
  activo: row.activo,
});

exports.getUsers = async (_req, res) => {
  try {
    const query = `
      SELECT u.id, u.nombre, u.email, u.rol_id, u.activo, COALESCE(r.nombre, 'Sin rol') AS rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      ORDER BY u.nombre;
    `;
    const { rows } = await pool.query(query);
    res.json(rows.map(formatDbUser));
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

exports.createUser = async (req, res) => {
  const { nombre, email, password, cedula, rol_id, activo = true } = req.body;

  if (!nombre || !email || !password || !cedula || rol_id == null) {
    return res.status(400).json({ message: 'Nombre, email, contraseña, cédula y rol son requeridos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(password, 10);
    const insertQuery = `
      INSERT INTO usuarios (nombre, email, password_hash, cedula, rol_id, activo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nombre, email, rol_id, activo;
    `;
    const { rows } = await client.query(insertQuery, [nombre, email, passwordHash, cedula, rol_id, activo]);

    const selectQuery = 'SELECT nombre AS rol_nombre FROM roles WHERE id = $1;';
    const roleResult = await client.query(selectQuery, [rol_id]);

    await client.query('COMMIT');
    res.status(201).json(formatDbUser({ ...rows[0], rol_nombre: roleResult.rows[0]?.rol_nombre || 'Sin rol' }));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  } finally {
    client.release();
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol_id, activo } = req.body;

  if (!nombre || !email || rol_id == null || activo == null) {
    return res.status(400).json({ message: 'Nombre, email, rol y estado son requeridos.' });
  }

  try {
    const query = `
      WITH updated AS (
        UPDATE usuarios
        SET nombre = $1, email = $2, rol_id = $3, activo = $4
        WHERE id = $5
        RETURNING id, nombre, email, rol_id, activo
      )
      SELECT u.*, r.nombre AS rol_nombre
      FROM updated u
      LEFT JOIN roles r ON u.rol_id = r.id;
    `;
    const { rows } = await pool.query(query, [nombre, email, rol_id, activo, id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json(formatDbUser(rows[0]));
  } catch (error) {
    console.error(`Error al actualizar usuario ${id}:`, error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

exports.getRoles = async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nombre FROM roles ORDER BY nombre;');
    res.json(rows);
  } catch (error) {
    console.error('Error al listar roles:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

exports.getStates = async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, estado FROM vestados ORDER BY estado;');
    res.json(rows);
  } catch (error) {
    console.error('Error al listar estados:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

exports.getUserStates = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT estado_id FROM usuarios_estados_permitidos WHERE usuario_id = $1 ORDER BY estado_id;',
      [id]
    );
    res.json(rows.map((row) => row.estado_id));
  } catch (error) {
    console.error(`Error al obtener estados del usuario ${id}:`, error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

exports.updateUserStates = async (req, res) => {
  const { id } = req.params;
  const stateIds = Array.isArray(req.body.stateIds) ? req.body.stateIds : [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM usuarios_estados_permitidos WHERE usuario_id = $1;', [id]);

    if (stateIds.length > 0) {
      const values = stateIds
        .filter((stateId) => Number.isInteger(Number(stateId)))
        .map((stateId) => `(${Number(id)}, ${Number(stateId)})`)
        .join(',');
      if (values.length > 0) {
        await client.query(`INSERT INTO usuarios_estados_permitidos (usuario_id, estado_id) VALUES ${values};`);
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Estados actualizados correctamente.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error al actualizar estados del usuario ${id}:`, error);
    res.status(500).json({ message: 'Error del servidor' });
  } finally {
    client.release();
  }
};

/**
 * Endpoint para refrescar manualmente la vista materializada vregistros_estados
 * Solo accesible para administradores
 */
exports.refreshMaterializedView = async (_req, res) => {
  try {
    await refreshMaterializedView();
    res.json({
      success: true,
      message: 'Vista materializada public.vregistros_estados actualizada exitosamente.'
    });
  } catch (error) {
    console.error('Error al refrescar vista materializada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la vista materializada.',
      error: error.message
    });
  }
};

