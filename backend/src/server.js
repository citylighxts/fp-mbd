const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mahasiswaRoutes = require('./routes/mahasiswaRoutes');
const konselorRoutes = require('./routes/konselorRoutes');
const topikRoutes = require('./routes/topikRoutes');
const sesiRoutes = require('./routes/sesiRoutes');

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

app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
