const express = require('express');
const {
    createSesi,
    getAllSesi,
    getSesiForMahasiswa,
    getSesiForKonselor,
    updateSesi,
    deleteSesi,
    getSesiSelesaiKonselor,
    getSesiBySpesialisasi
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

// Admin/Konselor: sesi selesai dalam periode tertentu
router.get('/konselor/selesai', protect, authorizeRoles('Admin', 'Konselor'), getSesiSelesaiKonselor);

// Admin/Konselor: sesi berdasarkan spesialisasi konselor
router.get('/spesialisasi', protect, authorizeRoles('Admin', 'Konselor'), getSesiBySpesialisasi);


module.exports = router;
