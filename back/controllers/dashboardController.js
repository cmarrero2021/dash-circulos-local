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
        const data = await dashboardService.getIndicators(req.user.id);
        res.json(data);
    } catch (error) {
        console.error('Error en el controlador de indicadores:', error.message);
        res.status(500).send('Error del servidor');
    }
};

exports.getStateIndicatorsView = async (req, res) => {
    try {
        const data = await dashboardService.getStateIndicatorsView(req.user.id, req.query);
        res.json(data);
    } catch (error) {
        console.error('Error en el controlador de indicadores por estado:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Exportamos TODAS las funciones que el router necesita
exports.getCirclesByState = (req, res) => handleRequest(dashboardService.getCirclesByState, req, res);
exports.getCirclesByMunicipality = (req, res) => handleRequest(dashboardService.getCirclesByMunicipality, req, res);
exports.getCirclesByStateMunicipios = (req, res) => handleRequest(dashboardService.getCirclesByStateMunicipios, req, res);
exports.getCirclesByStateMunicipiosParroquias = (req, res) => handleRequest(dashboardService.getCirclesByStateMunicipiosParroquias, req, res);
exports.getCirclesByStateMunicipiosParroquiasComunas = (req, res) => handleRequest(dashboardService.getCirclesByStateMunicipiosParroquiasComunas, req, res);
exports.getCirclesByStateMunicipiosComunas = (req, res) => handleRequest(dashboardService.getCirclesByStateMunicipiosComunas, req, res);
exports.getTotalCircles = (req, res) => handleRequest(dashboardService.getTotalCircles, req, res);
exports.getDailyAverage = (req, res) => handleRequest(dashboardService.getDailyAverage, req, res);
exports.getRawData = (req, res) => handleRequest(dashboardService.getRawData, req, res);
exports.getDailyCertifications = (req, res) => handleRequest(dashboardService.getDailyCertifications, req, res);

// Endpoint para obtener datos del mapa de Venezuela (porcentajes por estado)
exports.getMapaEstados = async (req, res) => {
    try {
        const data = await dashboardService.getMapaEstados();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener datos del mapa:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Endpoint para obtener participantes por estado (capa de dispersión)
exports.getParticipantesPorEstado = async (req, res) => {
    try {
        const data = await dashboardService.getParticipantesPorEstado();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener participantes por estado:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Endpoint para obtener indicadores de registros básicos por estado
exports.getRegistrosIndicadoresPorEstado = async (req, res) => {
    try {
        const data = await dashboardService.getRegistrosIndicadoresPorEstado(req.user.id);
        res.json(data);
    } catch (error) {
        console.error('Error al obtener indicadores de registros por estado:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Endpoint para obtener indicadores de registros básicos nacionales
exports.getRegistrosIndicadoresNacionales = async (req, res) => {
    try {
        const data = await dashboardService.getRegistrosIndicadoresNacionales();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener indicadores de registros nacionales:', error.message);
        res.status(500).send('Error del servidor');
    }
};
