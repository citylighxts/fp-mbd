// backend/src/config/dbView.js
const db = require('./db');

const ViewAktivitasTerakhirMahasiswa = `
    CREATE OR REPLACE VIEW ViewAktivitasTerakhirMahasiswa AS
    SELECT
        m.nrp,
        m.nama,
        m.departemen,
        MAX(s.tanggal) AS tanggal_sesi_terakhir
    FROM Mahasiswa m
    LEFT JOIN Sesi s ON m.NRP = s.Mahasiswa_NRP
    GROUP BY m.NRP, m.nama, m.departemen
    ORDER BY tanggal_sesi_terakhir DESC NULLS LAST;
`;

// Function to create all necessary views
const createViews = async () => {
    try {
        console.log('Creating database views...');
        await db.query(ViewAktivitasTerakhirMahasiswa);
        console.log('View ViewAktivitasTerakhirMahasiswa created/updated successfully.');
        // Add more views here if you have them
    } catch (err) {
        console.error('Error creating database views:', err.message);
        throw err; // Re-throw to indicate failure
    }
};

// Optional: Function to drop views (useful for development/resetting)
const dropViews = async () => {
    try {
        console.log('Dropping database views...');
        await db.query('DROP VIEW IF EXISTS ViewAktivitasTerakhirMahasiswa;');
        console.log('View ViewAktivitasTerakhirMahasiswa dropped successfully.');
    } catch (err) {
        console.error('Error dropping database views:', err.message);
        throw err;
    }
};

module.exports = {
    createViews,
    dropViews,
    ViewAktivitasTerakhirMahasiswa: 'ViewAktivitasTerakhirMahasiswa'
};