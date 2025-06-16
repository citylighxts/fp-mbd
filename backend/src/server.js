// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import your database connection pool
const db = require('./config/db'); // Ensure this path is correct
const { initializeTriggers } = require('./config/dbTrigger');
const { createViews } = require('./config/dbView');
const { createFunctions } = require('./config/dbFunction');

// Import your route modules
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mahasiswaRoutes = require('./routes/mahasiswaRoutes');
const konselorRoutes = require('./routes/konselorRoutes');
const topikRoutes = require('./routes/topikRoutes');
const sesiRoutes = require('./routes/sesiRoutes');

// Import your controllers that contain the view initialization functions
// Make sure these paths correctly point to your controllers
const sesiController = require('./controllers/sesiController');
const konselorController = require('./controllers/konselorController');

const app = express();

// Middleware
app.use(cors()); // Izinkan semua CORS
app.use(express.json()); // Untuk memparsing body request JSON

// Rute
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/mahasiswas', mahasiswaRoutes);
app.use('/api/konselors', konselorRoutes);
app.use('/api/topiks', topikRoutes);
app.use('/api/sesi', sesiRoutes);


// Rute testing
app.get('/', (req, res) => {
    res.send('API myITS Mental Health Berjalan!');
});

const PORT = process.env.PORT || 5000;

// Start the server and perform database initialization
app.listen(PORT, async () => {
    console.log(`Server berjalan di port ${PORT}`);
    try {
        // 1. Test Database Connection
        // This ensures your application can connect to the DB before proceeding
        await db.query('SELECT 1');
        console.log('Database terhubung dengan sukses.');

        // 2. Initialize or Refresh Database Views
        // These calls should be awaited to ensure views are ready before accepting requests
        await sesiController.initializeSesiLengkapView();
        await konselorController.initializeKonselorJumlahSesiView();

        console.log('Semua database views berhasil diinisialisasi.');

        await initializeTriggers();
        await createViews();
        await createFunctions();

    } catch (error) {
        console.error('Gagal terhubung ke database atau menginisialisasi views:', error.message);
        // If critical initialization fails, it's best to exit the process
        process.exit(1);
    }
});