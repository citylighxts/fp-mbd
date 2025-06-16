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

const MahasiswaDenganMasalahBerulang = `
    CREATE OR REPLACE VIEW MahasiswaDenganMasalahBerulang AS -- Gunakan CREATE OR REPLACE VIEW untuk pembaruan
    SELECT
        m.nrp,
        m.nama AS nama_mahasiswa,
        t.topik_nama,
        COUNT(s.sesi_id) AS jumlah_sesi_dengan_topik
    FROM
        Mahasiswa m
    JOIN
        Sesi s ON m.NRP = s.Mahasiswa_NRP
    JOIN
        Topik t ON s.Topik_topik_id = t.topik_id
    WHERE
        s.status = 'Selesai'
    GROUP BY
        m.NRP, m.nama, t.topik_nama
    HAVING
        COUNT(s.sesi_id) > 1
    ORDER BY
        jumlah_sesi_dengan_topik DESC, m.nama ASC;
`;


const createViews = async () => {
    try {
        console.log('Creating database views...');
        await db.query(ViewAktivitasTerakhirMahasiswa);
        console.log('View ViewAktivitasTerakhirMahasiswa created/updated successfully.');
        await db.query(MahasiswaDenganMasalahBerulang); 
        console.log('View MahasiswaDenganMasalahBerulang created/updated successfully.');
    } catch (err) {
        console.error('Error creating database views:', err.message);
        throw err; // Re-throw to indicate failure
    }
};

const dropViews = async () => {
    try {
        console.log('Dropping database views...');
        await db.query('DROP VIEW IF EXISTS MahasiswaDenganMasalahBerulang;');
        await db.query('DROP VIEW IF EXISTS ViewAktivitasTerakhirMahasiswa;');
        console.log('Views dropped successfully.');
    } catch (err) {
        console.error('Error dropping database views:', err.message);
        throw err;
    }
};

module.exports = {
    createViews,
    dropViews,
};