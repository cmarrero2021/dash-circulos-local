// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const { cache } = require('../services/cacheService'); // Importar el servicio de caché
require('dotenv').config();

module.exports = async function (req, res, next) {
  // Usamos req.get() que es el método preferido en Express
  const authHeader = req.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token válido.' });
  }

  try {
    const token = authHeader.split(' ')[1];

    // Verificar si el token está en la "blocklist" de la caché
    const isBlocked = await cache.get(token);
    if (isBlocked) {
      return res.status(401).json({ message: 'Token inválido o sesión cerrada.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded.user;
    req.auditId = decoded.auditId;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token no válido.' });
  }
};