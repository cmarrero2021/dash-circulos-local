const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // Unauthorized si no hay token
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Forbidden si el token no es válido
    }

    // Adjuntamos el payload del token al objeto request
    // Este payload contendrá el id, rol y los estados autorizados del usuario
    req.user = user;

    next();
  });
}

module.exports = {
  authenticateToken,
};
