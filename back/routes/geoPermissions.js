// routes/geoPermissions.js
const express = require('express');
const router = express.Router();
const geoController = require('../controllers/geoPermissionController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizationMiddleware');

router.use(authMiddleware);
const geoAuthorize = authorize('assign_geo_permissions');

router.get('/users/:userId/states', geoAuthorize, geoController.getUserStates);
router.post('/users/:userId/states', geoAuthorize, geoController.assignStateToUser);
router.delete('/users/:userId/states/:stateId', geoAuthorize, geoController.removeStateFromUser);

router.get('/users/:userId/municipalities', geoAuthorize, geoController.getUserMunicipalities);
router.post('/users/:userId/municipalities', geoAuthorize, geoController.assignMunicipalityToUser);
router.delete('/users/:userId/states/:stateId/municipalities/:municipalityId', geoAuthorize, geoController.removeMunicipalityFromUser);

module.exports = router;