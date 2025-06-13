const express = require('express');
const { getKonselors, getKonselorByNIK, updateKonselor, deleteKonselor, addKonselorTopik, removeKonselorTopik } = require('../controllers/konselorController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

// getKonselors sekarang bisa menerima query param userId untuk mencari konselor berdasarkan User_user_id
router.route('/')
    .get(getKonselors); // Semua orang bisa melihat daftar konselor

router.route('/:nik')
    .get(getKonselorByNIK) // Semua orang bisa melihat detail konselor
    .put(protect, authorizeRoles('Admin', 'Konselor'), updateKonselor) // Konselor bisa update datanya sendiri, Admin bisa semua
    .delete(protect, authorizeRoles('Admin'), deleteKonselor); // Hanya admin yang bisa menghapus

// Rute untuk mengelola topik konselor
router.post('/topik/add', protect, authorizeRoles('Admin', 'Konselor'), addKonselorTopik); // Admin atau Konselor bisa menambahkan topik
router.post('/topik/remove', protect, authorizeRoles('Admin', 'Konselor'), removeKonselorTopik); // Admin atau Konselor bisa menghapus topik

module.exports = router;