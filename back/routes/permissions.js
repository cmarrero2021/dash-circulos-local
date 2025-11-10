// routes/permissions.js
const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const authMiddleware = require('../middleware/authMiddleware');

// Estas rutas son sensibles y más adelante las protegeremos
// para que solo un administrador pueda usarlas.
router.use(authMiddleware);
router.post('/', permissionController.createPermission);
router.get('/', permissionController.getAllPermissions);
router.put('/:id', permissionController.updatePermission);
router.delete('/:id', permissionController.deletePermission);

module.exports = router;