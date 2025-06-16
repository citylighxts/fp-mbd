const express = require('express');
const router = express.Router();
const mahasiswaController = require('../controllers/mahasiswaController'); // Import seluruh objek controller
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/masalah-berulang', protect, authorizeRoles('Admin'), mahasiswaController.getMahasiswaMasalahBerulang);

router.route('/aktivitas-terakhir')
    .get(protect, authorizeRoles('Admin'), mahasiswaController.getAktivitasTerakhir);

// Logging untuk memastikan route dipanggil (debugging)
router.use((req, res, next) => {
  // Log setiap request yang masuk ke mahasiswaRoutes
  console.log(`[MAHASISWA ROUTES] ${req.method} ${req.originalUrl}`);
  next();
});

// GET semua mahasiswa (hanya admin)
router.get(
  '/',
  protect,
  authorizeRoles('Admin', 'Mahasiswa'),
  mahasiswaController.getMahasiswas
);

router.get(
  '/by-topik', // This path should come BEFORE /:nrp to avoid conflicts
  protect,
  authorizeRoles('Admin'),
  mahasiswaController.getMahasiswaByTopik
);

router.get('/rekomendasi/me', protect, authorizeRoles('Mahasiswa'), mahasiswaController.getMyRekomendasi);

// GET mahasiswa by NRP (admin atau mahasiswa itu sendiri)
router.get(
  '/:nrp',
  protect,
  authorizeRoles('Admin', 'Mahasiswa'),
  mahasiswaController.getMahasiswaByNRP
);

// PUT update mahasiswa by NRP (admin atau mahasiswa itu sendiri)
router.put(
  '/:nrp', // 
  protect,
  authorizeRoles('Admin', 'Mahasiswa'),
  mahasiswaController.updateMahasiswa
);

// DELETE mahasiswa by NRP (hanya admin)
router.delete(
  '/:nrp',
  (req, res, next) => {
    // Log khusus untuk debugging route DELETE
    console.log(`[MAHASISWA ROUTES] DELETE /${req.params.nrp} dipanggil`);
    next();
  },
  protect,
  authorizeRoles('Admin'),
  mahasiswaController.deleteMahasiswa
);

// POST ajukan sesi konseling (hanya mahasiswa)
router.post(
  '/ajukan-sesi',
  protect,
  authorizeRoles('Mahasiswa'),
  mahasiswaController.ajukanSesiKonseling
);

module.exports = router;
