// controllers/geoPermissionController.js
const pool = require('../config/db');

// @desc    Obtener los IDs de estados permitidos para un usuario
exports.getUserStates = async (req, res) => {
  const { userId } = req.params;
  try {
    const query = 'SELECT estado_id FROM usuarios_estados_permitidos WHERE usuario_id = $1';
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};

// @desc    Obtener los IDs de municipios permitidos para un usuario
exports.getUserMunicipalities = async (req, res) => {
    const { userId } = req.params;
    try {
      const query = 'SELECT estado_id, municipio_id FROM usuarios_municipios_permitidos WHERE usuario_id = $1';
      const result = await pool.query(query, [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Error del servidor');
    }
};

// @desc    Asignar un estado (por ID) a un usuario
exports.assignStateToUser = async (req, res) => {
  const { userId } = req.params;
  const { estado_id } = req.body;

  if (!estado_id) {
    return res.status(400).json({ message: 'El campo "estado_id" es requerido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const deleteMuniQuery = 'DELETE FROM usuarios_municipios_permitidos WHERE usuario_id = $1 AND estado_id = $2';
    await client.query(deleteMuniQuery, [userId, estado_id]);

    const insertStateQuery = `
        INSERT INTO usuarios_estados_permitidos (usuario_id, estado_id) VALUES ($1, $2)
        ON CONFLICT (usuario_id, estado_id) DO NOTHING;`;
    await client.query(insertStateQuery, [userId, estado_id]);

    await client.query('COMMIT');
    res.status(200).json({ message: `Permiso para el estado ID ${estado_id} asignado.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    res.status(500).send('Error del servidor');
  } finally {
    client.release();
  }
};

// @desc    Asignar un municipio (por IDs) a un usuario
exports.assignMunicipalityToUser = async (req, res) => {
    const { userId } = req.params;
    const { estado_id, municipio_id } = req.body;

    if (!estado_id || !municipio_id) {
        return res.status(400).json({ message: 'Los campos "estado_id" y "municipio_id" son requeridos.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. PASO DE VALIDACIÓN: Verificar si el municipio pertenece al estado.
        const validationQuery = `
            SELECT 1 FROM rm_comunas 
            WHERE estado_id = $1 AND municipio_id = $2 
            LIMIT 1;
        `;
        const validationResult = await client.query(validationQuery, [estado_id, municipio_id]);

        // Si la consulta de validación no devuelve ninguna fila, la combinación es inválida.
        if (validationResult.rowCount === 0) {
            await client.query('ROLLBACK'); // Cancelamos la transacción
            return res.status(400).json({ message: 'La combinación de estado y municipio no es válida.' });
        }
        
        // 2. PASO DE INSERCIÓN: Si la validación es exitosa, procedemos a insertar el permiso.
        // ON CONFLICT evita errores si el permiso ya fue asignado.
        const insertQuery = `
            INSERT INTO usuarios_municipios_permitidos (usuario_id, estado_id, municipio_id) VALUES ($1, $2, $3)
            ON CONFLICT (usuario_id, estado_id, municipio_id) DO NOTHING;`;
        
        await client.query(insertQuery, [userId, estado_id, municipio_id]);

        await client.query('COMMIT'); // Confirmamos la transacción
        res.status(200).json({ message: `Permiso para el municipio ID ${municipio_id} asignado correctamente.` });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error del servidor');
    } finally {
        client.release();
    }
};

// @desc    Quitar un permiso de estado a un usuario
exports.removeStateFromUser = async (req, res) => {
    const { userId, stateId } = req.params;
    try {
        await pool.query('DELETE FROM usuarios_estados_permitidos WHERE usuario_id = $1 AND estado_id = $2', [userId, stateId]);
        res.status(200).json({ message: `Permiso para el estado ID ${stateId} quitado.` });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Quitar un permiso de municipio a un usuario
exports.removeMunicipalityFromUser = async (req, res) => {
    const { userId, stateId, municipalityId } = req.params;
    try {
        await pool.query(
            'DELETE FROM usuarios_municipios_permitidos WHERE usuario_id = $1 AND estado_id = $2 AND municipio_id = $3',
            [userId, stateId, municipalityId]
        );
        res.status(200).json({ message: `Permiso para el municipio ID ${municipalityId} quitado.` });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error del servidor');
    }
};