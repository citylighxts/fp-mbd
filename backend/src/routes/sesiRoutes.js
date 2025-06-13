const express = require('express');
const {
    createSesi,
    getAllSesi,
    getSesiForMahasiswa,
    getSesiForKonselor,
    updateSesi,
    deleteSesi
} = require('../controllers/sesiController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

// Mahasiswa dapat membuat sesi baru
router.post('/', protect, authorizeRoles('Mahasiswa'), createSesi);

// Admin dapat melihat semua sesi
router.get('/all', protect, authorizeRoles('Admin'), getAllSesi);

// Mahasiswa dapat melihat sesi mereka sendiri
router.get('/mahasiswa', protect, authorizeRoles('Mahasiswa'), getSesiForMahasiswa);

// Konselor dapat melihat sesi mereka sendiri
router.get('/konselor', protect, authorizeRoles('Konselor'), getSesiForKonselor);

// Konselor atau Admin dapat memperbarui status/catatan sesi
router.put('/:id', protect, authorizeRoles('Konselor', 'Admin'), updateSesi);

// Hanya admin yang dapat menghapus sesi
router.delete('/:id', protect, authorizeRoles('Admin'), deleteSesi);

module.exports = router;
