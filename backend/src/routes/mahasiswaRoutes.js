const express = require('express');
const {
  getMahasiswas,
  getMahasiswaByNRP,
  getMahasiswaByTopik,
  updateMahasiswa,
  deleteMahasiswa,
  ajukanSesiKonseling
} = require('../controllers/mahasiswaController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

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
  getMahasiswas
);

router.get(
  '/by-topik', // This path should come BEFORE /:nrp to avoid conflicts
  protect,
  authorizeRoles('Admin'),
  getMahasiswaByTopik
);

// GET mahasiswa by NRP (admin atau mahasiswa itu sendiri)
router.get(
  '/:nrp',
  protect,
  authorizeRoles('Admin', 'Mahasiswa'),
  getMahasiswaByNRP
);

// PUT update mahasiswa by NRP (admin atau mahasiswa itu sendiri)
router.put(
  '/:nrp', // 
  protect,
  authorizeRoles('Admin', 'Mahasiswa'),
  updateMahasiswa
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
  deleteMahasiswa
);

// POST ajukan sesi konseling (hanya mahasiswa)
router.post(
  '/ajukan-sesi',
  protect,
  authorizeRoles('Mahasiswa'),
  ajukanSesiKonseling
);

module.exports = router;
