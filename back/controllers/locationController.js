// controllers/locationController.js
const pool = require('../config/db');

// @desc    Obtener una lista única de todos los estados
exports.getAllStates = async (req, res) => {
  try {
    // Usamos DISTINCT ON para obtener cada estado_id solo una vez.
    const query = `
      SELECT DISTINCT ON (estado_id) estado_id, estado
      FROM rm_comunas
      ORDER BY estado_id, estado;
    `;
    const result = await pool.query(query);
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
    const query = `
      SELECT DISTINCT ON (comuna_id) comuna_id, comuna
      FROM rm_comunas
      WHERE municipio_id = $1
      ORDER BY comuna_id, comuna;
    `;
    const result = await pool.query(query, [municipalityId]);
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
    const query = `
      SELECT DISTINCT ON (municipio_id) municipio_id, municipio
      FROM rm_comunas
      WHERE estado_id = $1
      ORDER BY municipio_id, municipio;
    `;
    const result = await pool.query(query, [stateId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};