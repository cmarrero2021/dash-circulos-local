// controllers/comunaController.js
const pool = require('../config/db');

// @desc    Obtener datos de la vista vcirculos_estados_municipios_comunas
exports.getComunaData = async (req, res) => {
  try {
    const { estado, municipio, comuna } = req.query;
    let query = 'SELECT * FROM vcirculos_estados_municipios_comunas';
    const params = [];
    const conditions = [];

    if (estado) {
      params.push(estado);
      conditions.push(`estado = $${params.length}`);
    }
    if (municipio) {
      params.push(municipio);
      conditions.push(`municipio = $${params.length}`);
    }
    if (comuna) {
      params.push(comuna);
      conditions.push(`comuna = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error del servidor');
  }
};
