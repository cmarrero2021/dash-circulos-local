// controllers/locationController.js
const pool = require('../config/db');
const {
  hasNationalDashboardAccess,
  getAllowedStatesForUser,
} = require('../services/geoPermissionsService');

const ensureStateAccess = async (userId, stateId) => {
  const hasNationalAccess = await hasNationalDashboardAccess(userId);
  if (hasNationalAccess) return { allowed: true };

  const allowedStates = await getAllowedStatesForUser(userId);
  const allowed = allowedStates.includes(stateId);
  return { allowed, allowedStates };
};

// @desc    Obtener una lista única de todos los estados
exports.getAllStates = async (req, res) => {
  try {
    const userId = req.user.id;
    const hasNationalAccess = await hasNationalDashboardAccess(userId);

    let query;
    let params = [];

    if (hasNationalAccess) {
      query = `
        SELECT DISTINCT ON (estado_id) estado_id, estado
        FROM rm_comunas
        ORDER BY estado_id, estado;
      `;
    } else {
      const allowedStates = await getAllowedStatesForUser(userId);
      if (allowedStates.length === 0) {
        return res.json([]);
      }
      query = `
        SELECT DISTINCT ON (estado_id) estado_id, estado
        FROM rm_comunas
        WHERE estado_id = ANY($1)
        ORDER BY estado_id, estado;
      `;
      params = [allowedStates];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};

// @desc    Obtener una lista única de comunas para un municipio específico
exports.getComunasByMunicipality = async (req, res) => {
  const { municipalityId } = req.params;
  try {
    const parsedMunicipalityId = Number(municipalityId);
    const userId = req.user.id;
    const hasAccess = await ensureMunicipalityAccess(userId, parsedMunicipalityId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'No tiene permisos para ver comunas de este municipio.' });
    }

    const query = `
      SELECT DISTINCT ON (comuna_id) comuna_id, comuna
      FROM rm_comunas
      WHERE municipio_id = $1
      ORDER BY comuna_id, comuna;
    `;
    const result = await pool.query(query, [parsedMunicipalityId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};

// @desc    Obtener una lista única de municipios para un estado específico
exports.getMunicipalitiesByState = async (req, res) => {
  const { stateId } = req.params;
  try {
    const parsedStateId = Number(stateId);
    const userId = req.user.id;
    const { allowed } = await ensureStateAccess(userId, parsedStateId);

    if (!allowed) {
      return res.status(403).json({ message: 'No tiene permisos para ver municipios de este estado.' });
    }

    const query = `
      SELECT DISTINCT ON (municipio_id) municipio_id, municipio
      FROM rm_comunas
      WHERE estado_id = $1
      ORDER BY municipio_id, municipio;
    `;
    const result = await pool.query(query, [parsedStateId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};

// Helper para validar acceso por municipio (derivado del estado)
const ensureMunicipalityAccess = async (userId, municipalityId) => {
  const hasNationalAccess = await hasNationalDashboardAccess(userId);
  if (hasNationalAccess) return true;

  const lookupQuery = `SELECT estado_id FROM rm_comunas WHERE municipio_id = $1 LIMIT 1`;
  const { rows } = await pool.query(lookupQuery, [municipalityId]);
  const stateId = rows[0]?.estado_id;
  if (!stateId) return false;

  const allowedStates = await getAllowedStatesForUser(userId);
  return allowedStates.includes(stateId);
};