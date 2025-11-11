// controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');
const cache = require('../services/cacheService');

// Función helper para manejar la lógica repetitiva
const handleRequest = async (serviceFunction, req, res) => {
    try {
        const userId = req.user.id;
        const filters = { /* ... */ };
        
        // Construir una clave única para el caché
        const cacheKey = `${serviceFunction.name}_user:${userId}_filters:${JSON.stringify(filters)}`;

        // 1. Revisar el caché primero
        if (cache.has(cacheKey)) {
            console.log(`[Cache HIT] para la clave: ${cacheKey}`);
            return res.json(cache.get(cacheKey));
        }

        console.log(`[Cache MISS] para la clave: ${cacheKey}`);
        
        // 2. Si no está en caché, obtener los datos
        const data = await serviceFunction(userId, filters);

        // 3. Guardar en caché antes de devolver
        cache.set(cacheKey, data);
        
        res.json(data);
    } catch (error) { /* ... */ }
}
// const handleRequest = async (serviceFunction, req, res) => {
//     try {
//         const userId = req.user.id;
//         // Obtenemos los filtros voluntarios de los query params (ej: ?estado_id=4)
//         const filters = {
//             estado_id: req.query.estado_id,
//             municipio_id: req.query.municipio_id
//         };
//         const data = await serviceFunction(userId, filters);
//         res.json(data);
//     } catch (error) {
//         console.error(error.message);
//         res.status(500).send('Error del servidor');
//     }
// }

exports.getCirclesByState = (req, res) => handleRequest(dashboardService.getCirclesByState, req, res);
exports.getCirclesByMunicipality = (req, res) => handleRequest(dashboardService.getCirclesByMunicipality, req, res);
exports.getTotalCircles = (req, res) => handleRequest(dashboardService.getTotalCircles, req, res);
exports.getDailyAverage = (req, res) => handleRequest(dashboardService.getDailyAverage, req, res);
exports.getRawData = (req, res) => handleRequest(dashboardService.getRawData, req, res);

// Aquí añadirías las exportaciones para los demás endpoints que crees...