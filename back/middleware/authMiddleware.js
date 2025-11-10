// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
  // Usamos req.get() que es el método preferido en Express
  const authHeader = req.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token válido.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded.user;
    req.auditId = decoded.auditId;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token no válido.' });
  }
};