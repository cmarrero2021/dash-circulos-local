// routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizationMiddleware');

router.use(authMiddleware);
// Protegemos todas las rutas con el permiso para ver el dashboard nacional.
router.use(authorize('ver_dashboard_nacional'));

// --- Endpoint de Indicadores ---
router.get('/indicators', dashboardController.getIndicators);

// --- Endpoints de Agregación ---
router.get('/by-state', dashboardController.getCirclesByState);
router.get('/by-municipality', dashboardController.getCirclesByMunicipality);
router.get('/daily-certifications', dashboardController.getDailyCertifications);

// --- Endpoints de KPIs ---
router.get('/total', dashboardController.getTotalCircles);
router.get('/daily-average', dashboardController.getDailyAverage);

// --- Endpoint de Datos Crudos ---
router.get('/raw-data', dashboardController.getRawData);

module.exports = router;