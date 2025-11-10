// routes/auth.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// @route   POST api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', authController.login);


// @route   POST api/auth/logout
// @desc    Cerrar sesión del usuario
// @access  Private (requerirá un token)
// Por ahora no lo protegeremos, pero lo haremos en el siguiente paso con un middleware.
router.post('/logout', authController.logout);


module.exports = router;