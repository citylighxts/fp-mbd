const express = require('express');
const { getMahasiswas, getMahasiswaByNRP, updateMahasiswa, deleteMahasiswa } = require('../controllers/mahasiswaController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('Admin'), getMahasiswas); // Admin bisa melihat semua

router.route('/:nrp')
    .get(protect, authorizeRoles('Admin', 'Mahasiswa'), getMahasiswaByNRP) // Mahasiswa bisa melihat datanya sendiri, Admin bisa melihat semua
    .put(protect, authorizeRoles('Admin', 'Mahasiswa'), updateMahasiswa) // Mahasiswa bisa update datanya sendiri, Admin bisa semua
    .delete(protect, authorizeRoles('Admin'), deleteMahasiswa); // Hanya admin yang bisa menghapus

module.exports = router;