// controllers/permissionController.js
const pool = require('../config/db');

// @desc    Crear un nuevo permiso
exports.createPermission = async (req, res) => {
    // res.status(500).send('ABORTANDO...');
  const { nombre, descripcion } = req.body;
  if (!nombre) {
    return res.status(400).json({ message: 'El nombre del permiso es requerido.' });
  }

  // 1. Obtener un cliente del pool
  const client = await pool.connect();

  try {
    // 2. Iniciar la transacción
    await client.query('BEGIN');

    // 3. Ejecutar la consulta de inserción
    const queryText = 'INSERT INTO permisos (nombre, descripcion) VALUES ($1, $2) RETURNING *';
    const newPermission = await client.query(queryText, [nombre, descripcion]);

    // 4. Confirmar la transacción
    await client.query('COMMIT');

    // 5. Enviar la respuesta con los datos insertados
    res.status(201).json(newPermission.rows[0]);

  } catch (error) {
    // 6. Si hay un error, revertir la transacción
    await client.query('ROLLBACK');
    console.error('Error en la transacción, rollback ejecutado:', error.message);
    res.status(500).send('Error del servidor');
  } finally {
    // 7. Liberar el cliente de vuelta al pool, SIEMPRE
    client.release();
  }
};

// @desc    Obtener todos los permisos (esta función no escribe, no necesita transacción)
exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await pool.query('SELECT * FROM permisos ORDER BY nombre ASC');
    res.json(permissions.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};

// @desc    Actualizar un permiso (Aplicando el patrón de transacción)
exports.updatePermission = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const queryText = 'UPDATE permisos SET nombre = $1, descripcion = $2 WHERE id = $3 RETURNING *';
    const updatedPermission = await client.query(queryText, [nombre, descripcion, id]);
    
    if (updatedPermission.rows.length === 0) {
      // Si no se encontró la fila, no es necesario hacer commit, pero sí rollback para cerrar la tx
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Permiso no encontrado.' });
    }

    await client.query('COMMIT');
    res.json(updatedPermission.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    res.status(500).send('Error del servidor');
  } finally {
    client.release();
  }
};

// @desc    Eliminar un permiso (Aplicando el patrón de transacción)
exports.deletePermission = async (req, res) => {
  const { id } = req.params;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const deleteOp = await client.query('DELETE FROM permisos WHERE id = $1', [id]);

    if (deleteOp.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Permiso no encontrado.' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Permiso eliminado exitosamente.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    res.status(500).send('Error del servidor');
  } finally {
    client.release();
  }
};