const express = require('express');
const { getAdmins, getAdminById, updateAdmin, deleteAdmin } = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('Admin'), getAdmins);

router.route('/:id')
    .get(protect, authorizeRoles('Admin'), getAdminById)
    .put(protect, authorizeRoles('Admin'), updateAdmin)
    .delete(protect, authorizeRoles('Admin'), deleteAdmin);

module.exports = router;