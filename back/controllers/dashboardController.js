// controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');

const handleRequest = async (serviceFunction, req, res) => {
    try {
        const userId = req.user.id;
        const filters = {
            estado_id: req.query.estado_id,
            municipio_id: req.query.municipio_id,
            // Paginación para raw-data
            page: req.query.page,
            limit: req.query.limit,
        };
        const data = await serviceFunction(userId, filters);
        res.json(data);
    } catch (error) {
        console.error('Error en el controlador del dashboard:', error.message);
        res.status(500).send('Error del servidor');
    }
}

exports.getIndicators = async (req, res) => {
    try {
        const data = await dashboardService.getIndicators();
        res.json(data);
    } catch (error) {
        console.error('Error en el controlador de indicadores:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Exportamos TODAS las funciones que el router necesita
exports.getCirclesByState = (req, res) => handleRequest(dashboardService.getCirclesByState, req, res);
exports.getCirclesByMunicipality = (req, res) => handleRequest(dashboardService.getCirclesByMunicipality, req, res);
exports.getTotalCircles = (req, res) => handleRequest(dashboardService.getTotalCircles, req, res);
exports.getDailyAverage = (req, res) => handleRequest(dashboardService.getDailyAverage, req, res);
exports.getRawData = (req, res) => handleRequest(dashboardService.getRawData, req, res);
exports.getDailyCertifications = (req, res) => handleRequest(dashboardService.getDailyCertifications, req, res);