// controllers/utilityController.js
const bcrypt = require('bcryptjs');

/**
 * Hashea una contraseña proporcionada en el body.
 * Endpoint solo para desarrollo.
 */
exports.hashPassword = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Por favor, proporciona una contraseña en el body.' });
  }

  try {
    // Generamos un 'salt'. 10 es un buen valor estándar.
    const salt = await bcrypt.genSalt(10);
    // Hasheamos la contraseña con el salt.
    const passwordHash = await bcrypt.hash(password, salt);

    res.json({
      originalPassword: password,
      passwordHash: passwordHash,
    });
  } catch (error) {
    console.error('Error al hashear la contraseña:', error);
    res.status(500).send('Error del servidor');
  }
};