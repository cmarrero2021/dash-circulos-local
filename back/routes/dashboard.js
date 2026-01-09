// routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// --- Endpoint de Indicadores ---
router.get('/indicators', dashboardController.getIndicators);
router.get('/state-indicators', dashboardController.getStateIndicatorsView);

// --- Endpoints de Agregación ---
router.get('/by-state', dashboardController.getCirclesByState);
router.get('/by-municipality', dashboardController.getCirclesByMunicipality);
router.get('/circles-states-municipios', dashboardController.getCirclesByStateMunicipios);
router.get('/circles-states-municipios-parroquias', dashboardController.getCirclesByStateMunicipiosParroquias);
router.get('/circles-states-municipios-parroquias-comunas', dashboardController.getCirclesByStateMunicipiosParroquiasComunas);
router.get('/circles-states-municipios-comunas', dashboardController.getCirclesByStateMunicipiosComunas);
router.get('/daily-certifications', dashboardController.getDailyCertifications);

// --- Endpoints de KPIs ---
router.get('/total', dashboardController.getTotalCircles);
router.get('/daily-average', dashboardController.getDailyAverage);

// --- Endpoint de Datos Crudos ---
router.get('/raw-data', dashboardController.getRawData);

// --- Endpoint de Mapa de Venezuela ---
router.get('/mapa-estados', dashboardController.getMapaEstados);
router.get('/mapa-participantes', dashboardController.getParticipantesPorEstado);

// --- Endpoint de Indicadores de Registros ---
router.get('/registros-indicadores', dashboardController.getRegistrosIndicadoresPorEstado);

module.exports = router;