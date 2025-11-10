// controllers/roleController.js
const pool = require('../config/db');

// --- CRUD Básico de Roles ---

exports.createRole = async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) {
    return res.status(400).json({ message: 'El nombre del rol es requerido.' });
  }
  try {
    const newRole = await pool.query(
      'INSERT INTO roles (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre, descripcion]
    );
    res.status(201).json(newRole.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await pool.query('SELECT * FROM roles ORDER BY nombre ASC');
    res.json(roles.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};

// ... (Implementar updateRole y deleteRole de forma similar a los de permisos) ...

// --- Gestión de Permisos en Roles ---

// @desc    Asignar un permiso a un rol
exports.assignPermissionToRole = async (req, res) => {
  const { roleId } = req.params;
  const { permissionId } = req.body;
  try {
    await pool.query(
      'INSERT INTO roles_permisos (rol_id, permiso_id) VALUES ($1, $2)',
      [roleId, permissionId]
    );
    res.status(200).json({ message: 'Permiso asignado al rol exitosamente.' });
  } catch (error) {
    // Manejar el caso de que la asignación ya exista (violación de clave primaria)
    if (error.code === '23505') {
        return res.status(409).json({ message: 'Este permiso ya está asignado a este rol.' });
    }
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};

// @desc    Quitar un permiso de un rol
exports.removePermissionFromRole = async (req, res) => {
  const { roleId, permissionId } = req.params;
  try {
    const deleteOp = await pool.query(
      'DELETE FROM roles_permisos WHERE rol_id = $1 AND permiso_id = $2',
      [roleId, permissionId]
    );
    if (deleteOp.rowCount === 0) {
        return res.status(404).json({ message: 'Asignación de permiso no encontrada.' });
    }
    res.status(200).json({ message: 'Permiso quitado del rol exitosamente.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};

// @desc    Obtener todos los permisos de un rol específico
exports.getRolePermissions = async (req, res) => {
  const { roleId } = req.params;
  try {
    const permissions = await pool.query(
      `SELECT p.id, p.nombre, p.descripcion FROM permisos p
       JOIN roles_permisos rp ON p.id = rp.permiso_id
       WHERE rp.rol_id = $1`,
      [roleId]
    );
    res.json(permissions.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};