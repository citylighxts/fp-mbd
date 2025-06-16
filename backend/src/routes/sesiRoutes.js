    const express = require('express');
    const {
        createSesi,
        getAllSesi,
        getSesiForMahasiswa,
        getSesiForKonselor,
        updateSesi,
        deleteSesi,
        getCompletedSessions, // Pastikan ini diimpor
        getSesiBySpesialisasi,
        getSessionStatusDistribution,
        transferSesi
    } = require('../controllers/sesiController'); // Impor dari sesiController
    const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Impor middleware otentikasi dan otorisasi
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

    // Rute baru: Menampilkan sesi selesai milik konselor dalam periode tertentu
    // Hanya Konselor atau Admin yang bisa mengakses rute ini
   router.get('/completed', protect, authorizeRoles('Admin'), getCompletedSessions);

    // Rute baru: Menampilkan sesi konseling oleh konselor dengan spesialisasi tertentu
    // Hanya Admin yang bisa mengakses rute ini (sesuai spesifikasi fungsi yang ada di controller)
    router.get('/spesialisasi', protect, authorizeRoles('Admin'), getSesiBySpesialisasi);

    router.get(
    '/status-distribution', // Contoh: /api/sesi/status-distribution
    protect,
    authorizeRoles('Admin'), // Hanya admin yang bisa melihat laporan ini
    getSessionStatusDistribution
    );

    router.post(
    '/transfer',
    protect,
    authorizeRoles('Admin'), // Hanya admin yang bisa mentransfer sesi
    transferSesi
    );

    module.exports = router;
    