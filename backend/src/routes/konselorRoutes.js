const express = require('express');
const { 
  getKonselors, 
  getKonselorByNIK, 
  updateKonselor, 
  deleteKonselor, 
  addKonselorTopik, 
  removeKonselorTopik, 
  getKonselorTanpaSesi,
  getKonselorSessionSummary
} = require('../controllers/konselorController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Ensure correct import

const router = express.Router();

// --- Debugging Log (Optional, remove in production) ---
router.use((req, res, next) => {
  console.log(`[KONSELOR ROUTES] ${req.method} ${req.originalUrl}`);
  next();
});
// --- End Debugging Log ---

// --- Main Routes ---

// GET all counselors (only Admin can access this specific route for all counselors)
// Note: Your getKonselors controller also has logic for filtering by userId.
// If you want everyone to see a list of counselors *without* authentication,
// you'd define a separate route for that.
router.get(
  '/',
  protect, // Protect this route
  authorizeRoles('Admin'), // Only Admin can get the full list of all counselors
  getKonselors
);

// GET counselors who haven't handled any sessions (only Admin)
router.get(
  '/tanpa-sesi',
  protect,
  authorizeRoles('Admin'),
  getKonselorTanpaSesi
);

router.get(
  '/rekap-sesi',
  protect,
  authorizeRoles('Admin'),
  getKonselorSessionSummary
);

// Routes for a specific counselor by NIK
router.route('/:nik')
  .get(protect, authorizeRoles('Admin', 'Konselor'), getKonselorByNIK) // Admin or the Konselor themselves can get details
  .put(protect, authorizeRoles('Admin', 'Konselor'), updateKonselor)   // Admin or the Konselor themselves can update
  .delete(protect, authorizeRoles('Admin'), deleteKonselor);          // Only Admin can delete

// Routes for managing counselor topics
router.post(
  '/topik/add', 
  protect, 
  authorizeRoles('Admin', 'Konselor'), 
  addKonselorTopik
); 

router.post(
  '/topik/remove', 
  protect, 
  authorizeRoles('Admin', 'Konselor'), 
  removeKonselorTopik
); 

module.exports = router;