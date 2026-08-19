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
router.get('/mapa-priorizados', dashboardController.getPriorizadosPorEstado);

// --- Endpoint de Indicadores de Registros ---
router.get('/registros-indicadores', dashboardController.getRegistrosIndicadoresPorEstado);
router.get('/registros-indicadores-nacionales', dashboardController.getRegistrosIndicadoresNacionales);

// --- Endpoints de Priorizados ---
router.get('/priorizados', dashboardController.getPriorizados);
router.get('/priorizados/filter-options', dashboardController.getPriorizadosFilterOptions);

// --- Endpoints de Consultas Guardadas (REST) ---
router.get('/saved-queries', dashboardController.listSavedQueries);
router.get('/saved-queries/:id', dashboardController.getSavedQuery);
router.post('/saved-queries', dashboardController.createSavedQuery);
router.put('/saved-queries/:id', dashboardController.updateSavedQuery);
router.delete('/saved-queries/:id', dashboardController.deleteSavedQuery);
router.put('/saved-queries/:id/pin', dashboardController.toggleSavedQueryPin);
router.post('/saved-queries/:id/grant', dashboardController.grantQueryAccess);
router.delete('/saved-queries/:id/grant', dashboardController.revokeQueryAccess);

module.exports = router;