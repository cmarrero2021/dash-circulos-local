// routes/roles.js
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');

// CRUD Básico para Roles
router.post('/', roleController.createRole);
router.get('/', roleController.getAllRoles);
// router.put('/:id', roleController.updateRole);
// router.delete('/:id', roleController.deleteRole);

// Rutas para gestionar los permisos de un rol
router.get('/:roleId/permissions', roleController.getRolePermissions);
router.post('/:roleId/permissions', roleController.assignPermissionToRole);
router.delete('/:roleId/permissions/:permissionId', roleController.removePermissionFromRole);

module.exports = router;