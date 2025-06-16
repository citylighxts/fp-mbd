const express = require('express');
const { getUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

// Hanya admin yang bisa mengelola semua pengguna
router.route('/')
    .get(protect, authorizeRoles('Admin'), getUsers); // Get all users

router.route('/:id')
    .get(protect, authorizeRoles('Admin'), getUserById) // Get user by ID
    .put(protect, authorizeRoles('Admin'), updateUser) // Update user (username, role)
    .delete(protect, authorizeRoles('Admin'), deleteUser); // Delete user

module.exports = router;