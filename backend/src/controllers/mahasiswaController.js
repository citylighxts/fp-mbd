const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Mendapatkan semua mahasiswa
const getMahasiswas = async (req, res) => {
    try {
        const result = await db.query('SELECT m.nrp as nrp, m.nama, m.departemen, m.kontak, u.username FROM Mahasiswa m JOIN "User" u ON m.User_user_id = u.user_id');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Mendapatkan mahasiswa berdasarkan NRP
const getMahasiswaByNRP = async (req, res) => {
    const { nrp } = req.params;
    try {
        const result = await db.query('SELECT m.nrp as nrp, m.nama, m.departemen, m.kontak, u.username FROM Mahasiswa m JOIN "User" u ON m.User_user_id = u.user_id WHERE m.nrp = $1', [nrp]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Memperbarui mahasiswa
const updateMahasiswa = async (req, res) => {
    const { nrp } = req.params;
    const { nama, departemen, kontak } = req.body;

    if (!nama || !departemen || !kontak) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const queryText = 'UPDATE mahasiswa SET nama = $1, departemen = $2, kontak = $3 WHERE nrp = $4 RETURNING *';
        const queryValues = [nama, departemen, kontak, nrp];
        const result = await client.query(queryText, queryValues);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: `Mahasiswa dengan NRP ${nrp} tidak ditemukan.` });
        }

        await client.query('COMMIT');

        res.status(200).json({
            message: 'Mahasiswa berhasil diperbarui!',
            mahasiswa: result.rows[0],
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('DATABASE ERROR:', err); // Tetap log error di backend untuk admin
        res.status(500).json({ message: `Database Error: ${err.message}` });
    } finally {
        client.release();
    }
};

// Menghapus mahasiswa
const deleteMahasiswa = async (req, res) => {
    const { nrp } = req.params;
    console.log("Request hapus mahasiswa NRP:", nrp);
    try {
        const mhsUserResult = await db.query('SELECT User_user_id FROM Mahasiswa WHERE NRP = $1', [nrp]);
        console.log("Hasil select user:", mhsUserResult.rows);
        if (mhsUserResult.rows.length === 0) {
            console.log("Mahasiswa tidak ditemukan");
            return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });
        }
        const userId = mhsUserResult.rows[0].user_user_id;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const delMhs = await client.query('DELETE FROM Mahasiswa WHERE NRP = $1', [nrp]);
            console.log("Baris mahasiswa dihapus:", delMhs.rowCount);
            const delUser = await client.query('DELETE FROM "User" WHERE user_id = $1', [userId]);
            console.log("Baris user dihapus:", delUser.rowCount);
            await client.query('COMMIT');
            res.json({ message: 'Mahasiswa dan pengguna terkait berhasil dihapus' });
        } catch (transactionError) {
            await client.query('ROLLBACK');
            console.error('Error saat menghapus mahasiswa transaksi:', transactionError.message);
            res.status(500).json({ message: `Gagal menghapus mahasiswa: ${transactionError.message}` });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Tambahkan di atas module.exports
const ajukanSesiKonseling = async (req, res) => {
    const { konselor_id, topik_id, tanggal, waktu } = req.body;
    const mahasiswa_nrp = req.user.nrp; // pastikan middleware auth mengisi req.user.nrp

    try {
        // Validasi data
        if (!konselor_id || !topik_id || !tanggal || !waktu) {
            return res.status(400).json({ message: 'Data tidak lengkap' });
        }

        // Cek apakah sudah ada sesi aktif dengan konselor dan topik yang sama
        const cek = await db.query(
            'SELECT * FROM SesiKonseling WHERE mahasiswa_nrp = $1 AND konselor_id = $2 AND topik_id = $3 AND status IN (\'Menunggu\', \'Disetujui\')',
            [mahasiswa_nrp, konselor_id, topik_id]
        );
        if (cek.rows.length > 0) {
            return res.status(409).json({ message: 'Anda sudah memiliki sesi aktif untuk topik ini.' });
        }

        // Insert sesi baru
        const result = await db.query(
            'INSERT INTO SesiKonseling (sesi_id, mahasiswa_nrp, konselor_id, topik_id, tanggal, waktu, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [uuidv4(), mahasiswa_nrp, konselor_id, topik_id, tanggal, waktu, 'Menunggu']
        );
        res.status(201).json({ message: 'Sesi konseling berhasil diajukan', sesi: result.rows[0] });
    } catch (err) {
        console.error('[AJUKAN SESI] Error:', err.message);
        res.status(500).json({ message: 'Gagal mengajukan sesi konseling' });
    }
};



module.exports = {
    getMahasiswas,
    getMahasiswaByNRP,
    updateMahasiswa,
    deleteMahasiswa,
    ajukanSesiKonseling
};
