// routes/locations.js
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const authMiddleware = require('../middleware/authMiddleware');

// Estas rutas deben estar protegidas, ya que exponen parte de la estructura de datos.
router.use(authMiddleware);

// Endpoint para obtener todos los estados
router.get('/states', locationController.getAllStates);

// Endpoint para obtener municipios de un estado por su ID
router.get('/states/:stateId/municipalities', locationController.getMunicipalitiesByState);

module.exports = router;