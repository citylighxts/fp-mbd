const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/laporan', protect, authorizeRoles('Admin'), adminController.getLaporanSesiBulanan);

router.route('/')
    .get(protect, authorizeRoles('Admin'), adminController.getAdmins);

router.route('/:id')
    .get(protect, authorizeRoles('Admin'), adminController.getAdminById)
    .put(protect, authorizeRoles('Admin'), adminController.updateAdmin)
    .delete(protect, authorizeRoles('Admin'), adminController.deleteAdmin);

module.exports = router;