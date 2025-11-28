// routes/emailRoutes.js
const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const authMiddleware = require('../middleware/authMiddleware');

// Ambas rutas requieren autenticación
router.get('/:vat/:nationality', authMiddleware, emailController.getEmailByVat);
router.put('/:vat/:nationality', authMiddleware, emailController.updateEmailByVat);

module.exports = router;
