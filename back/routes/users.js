// routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizationMiddleware');

// ==================================================================
// PUNTO #1 DE REVISIÓN: Esta línea NO debe tener paréntesis.
// CORRECTO: router.use(authMiddleware);
// INCORRECTO: router.use(authMiddleware());
// ==================================================================
router.use(authMiddleware);

// Esta función SÍ debe ser llamada con paréntesis, porque es una "fábrica"
// const manageUsersAuthorize = authorize('manage_users');

// ==================================================================
// PUNTO #2 DE REVISIÓN: Las funciones del controlador NO deben tener paréntesis.
// CORRECTO: userController.getAllUsers
// INCORRECTO: userController.getAllUsers()
// ==================================================================
router.get('/', authorize('user:view'), userController.getAllUsers);
router.post('/', authorize('user:create'), userController.createUser);
router.put('/:id', authorize('user:edit'), userController.updateUser);

module.exports = router;