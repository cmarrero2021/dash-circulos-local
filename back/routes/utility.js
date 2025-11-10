// routes/utility.js
const express = require('express');
const router = express.Router();
const utilityController = require('../controllers/utilityController');

// @route   POST /api/utility/hash-password
// @desc    Genera un hash de bcrypt para una contraseña. SOLO PARA DESARROLLO.
// @access  Public
router.post('/hash-password', utilityController.hashPassword);

module.exports = router;