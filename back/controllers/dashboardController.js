// controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');

// Función helper para manejar la lógica repetitiva
const handleRequest = async (serviceFunction, req, res) => {
    try {
        const userId = req.user.id;
        // Obtenemos los filtros voluntarios de los query params (ej: ?estado_id=4)
        const filters = {
            estado_id: req.query.estado_id,
            municipio_id: req.query.municipio_id
        };
        const data = await serviceFunction(userId, filters);
        res.json(data);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error del servidor');
    }
}

exports.getCirclesByState = (req, res) => handleRequest(dashboardService.getCirclesByState, req, res);
exports.getCirclesByMunicipality = (req, res) => handleRequest(dashboardService.getCirclesByMunicipality, req, res);
exports.getTotalCircles = (req, res) => handleRequest(dashboardService.getTotalCircles, req, res);
exports.getDailyAverage = (req, res) => handleRequest(dashboardService.getDailyAverage, req, res);
exports.getRawData = (req, res) => handleRequest(dashboardService.getRawData, req, res);

// Aquí añadirías las exportaciones para los demás endpoints que crees...