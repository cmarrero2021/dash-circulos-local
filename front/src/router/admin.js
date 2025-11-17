const express = require('express');
const router = express.Router();
const db = require('../db'); // Tu conexión a la base de datos
const { authenticateToken } = require('../middleware/auth'); // Asegúrate que la ruta a tu middleware sea correcta
const { isAdmin } = require('../middleware/adminAuth'); // Asegúrate que la ruta a tu middleware sea correcta

// --- RUTAS PÚBLICAS (SOLO REQUIEREN AUTENTICACIÓN) ---

// GET todos los estados (para los selectores en el frontend)
router.get('/states', authenticateToken, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM vestados ORDER BY estado');
  res.json(rows);
});

// --- RUTAS DE ADMINISTRACIÓN (REQUIEREN ROL DE ADMIN) ---
router.use(authenticateToken, isAdmin); // El middleware de admin se aplica desde aquí en adelante

// --- GESTIÓN DE USUARIOS ---

// GET todos los usuarios
router.get('/users', async (req, res) => {
  const { rows } = await db.query(`
    SELECT u.id, u.nombre, u.cedula, u.email, u.activo, u.rol_id, r.nombre as rol_nombre
    FROM usuarios u
    LEFT JOIN roles r ON u.rol_id = r.id
    ORDER BY u.nombre
  `);
  res.json(rows);
});

// PUT actualizar un usuario (incluyendo estado activo/inactivo)
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol_id, activo } = req.body;
  const { rows } = await db.query(
    'UPDATE usuarios SET nombre = $1, email = $2, rol_id = $3, activo = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
    [nombre, email, rol_id, activo, id]
  );
  res.json(rows[0]);
});

// GET estados permitidos para un usuario
router.get('/users/:id/states', async (req, res) => {
  const { id } = req.params;
  const { rows } = await db.query('SELECT estado_id FROM usuarios_estados_permitidos WHERE usuario_id = $1', [id]);
  res.json(rows.map(r => r.estado_id)); // Devolver un array de IDs [1, 5, 10]
});

// PUT actualizar estados permitidos para un usuario
router.put('/users/:id/states', async (req, res) => {
  const { id } = req.params;
  const { stateIds } = req.body; // Se espera un array de IDs de estado: [1, 5, 10]

  // Usar una transacción para asegurar la atomicidad
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // 1. Borrar los estados anteriores
    await client.query('DELETE FROM usuarios_estados_permitidos WHERE usuario_id = $1', [id]);
    // 2. Insertar los nuevos estados si el array no está vacío
    if (stateIds && stateIds.length > 0) {
      const insertQuery = 'INSERT INTO usuarios_estados_permitidos (usuario_id, estado_id) VALUES ' +
        stateIds.map((_, i) => `($1, $${i + 2})`).join(',');
      await client.query(insertQuery, [id, ...stateIds]);
    }
    await client.query('COMMIT');
    res.status(200).json({ message: 'Estados permitidos actualizados correctamente.' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al actualizar los estados.', error: e.message });
  } finally {
    client.release();
  }
});

// --- GESTIÓN DE ROLES ---

// GET todos los roles
router.get('/roles', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM roles ORDER BY nombre');
  res.json(rows);
});

// --- GESTIÓN DE PERMISOS (Asumimos que son fijos por ahora) ---

// GET todos los permisos
router.get('/permissions', async (req, res) => {
    const { rows } = await db.query('SELECT * FROM permisos ORDER BY nombre');
    res.json(rows);
});

module.exports = router;
