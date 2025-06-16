const express = require('express');
const { createTopik, getTopiks, getTopikById, updateTopik, deleteTopik } = require('../controllers/topikController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
    .post(protect, authorizeRoles('Admin'), createTopik) // Hanya admin yang bisa membuat topik
    .get(getTopiks); // Semua orang bisa melihat topik yang tersedia

router.route('/:id')
    .get(getTopikById)
    .put(protect, authorizeRoles('Admin'), updateTopik) // Hanya admin yang bisa memperbarui
    .delete(protect, authorizeRoles('Admin'), deleteTopik); // Hanya admin yang bisa menghapus

module.exports = router;