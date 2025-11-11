// routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizationMiddleware');

// Proteger todas las rutas del dashboard
router.use(authMiddleware);

// Opcional: puedes requerir un permiso general para ver el dashboard
// router.use(authorize('view_dashboard'));

// --- Endpoints de Agregación ---
router.get('/by-state', dashboardController.getCirclesByState);
router.get('/by-municipality', dashboardController.getCirclesByMunicipality);

// --- Endpoints de KPIs ---
router.get('/total', dashboardController.getTotalCircles);
router.get('/daily-average', dashboardController.getDailyAverage);

// --- Endpoint de Datos Crudos ---
router.get('/raw-data', dashboardController.getRawData);


module.exports = router;