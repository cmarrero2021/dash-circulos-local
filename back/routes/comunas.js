// routes/comunas.js
const express = require('express');
const router = express.Router();
const comunaController = require('../controllers/comunaController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', comunaController.getComunaData);

module.exports = router;
