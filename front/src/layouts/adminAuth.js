function isAdmin(req, res, next) {
  // Este middleware debe ejecutarse DESPUÉS de authenticateToken
  if (req.user && req.user.role === 'Administrador') {
    next();
  } else {
    res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
}

module.exports = { isAdmin };
