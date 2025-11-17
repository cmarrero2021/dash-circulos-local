const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

const ensureAdmin = (req, res, next) => {
  if (req.user?.role !== 'Administrador') {
    return res.status(403).json({ message: 'Solo los administradores pueden acceder a esta ruta.' });
  }
  next();
};

router.use(authMiddleware, ensureAdmin);

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.get('/roles', adminController.getRoles);
router.get('/states', adminController.getStates);
router.get('/users/:id/states', adminController.getUserStates);
router.put('/users/:id/states', adminController.updateUserStates);

module.exports = router;
