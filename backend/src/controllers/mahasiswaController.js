const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Mendapatkan semua mahasiswa
const getMahasiswas = async (req, res) => {
    try {
        const result = await db.query('SELECT m.NRP, m.nama, m.departemen, m.kontak, u.username FROM Mahasiswa m JOIN "User" u ON m.User_user_id = u.user_id');
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
        const result = await db.query('SELECT m.NRP, m.nama, m.departemen, m.kontak, u.username FROM Mahasiswa m JOIN "User" u ON m.User_user_id = u.user_id WHERE m.NRP = $1', [nrp]);
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

    // --- LOGGING UNTUK MEMASTIKAN DATA MASUK ---
    console.log(`[UPDATE MHS] Menerima request untuk NRP: ${nrp}`);
    console.log(`[UPDATE MHS] Data baru:`, { nama, departemen, kontak });

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');
        console.log('[UPDATE MHS] Transaksi DIMULAI.');

        const result = await client.query(
            'UPDATE Mahasiswa SET nama = $1, departemen = $2, kontak = $3 WHERE NRP = $4 RETURNING *',
            [nama, departemen, kontak, nrp]
        );

        console.log('[UPDATE MHS] Query UPDATE dijalankan. rowCount:', result.rowCount);
        
        if (result.rowCount === 0) {
            console.log('[UPDATE MHS] Tidak ada baris yang ter-update. Melakukan ROLLBACK.');
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Mahasiswa dengan NRP tersebut tidak ditemukan.' });
        }

        console.log('[UPDATE MHS] Update berhasil. Melakukan COMMIT.');
        await client.query('COMMIT'); // <-- Perintah Simpan Permanen

        res.status(200).json({ 
            message: 'Mahasiswa berhasil diperbarui secara permanen!', 
            mahasiswa: result.rows[0] 
        });

    } catch (err) {
        console.log('[UPDATE MHS] Terjadi error. Melakukan ROLLBACK.');
        await client.query('ROLLBACK');
        console.error('[UPDATE MHS] Detail Error:', err.message);
        res.status(500).send('Kesalahan server saat update.');
    } finally {
        console.log('[UPDATE MHS] Koneksi dilepaskan.');
        client.release();
    }
};

// Menghapus mahasiswa
const deleteMahasiswa = async (req, res) => {
    const { nrp } = req.params; // NRP
    try {
        // Pertama, dapatkan User_user_id yang terkait dengan NRP ini
        const mhsUserResult = await db.query('SELECT User_user_id FROM Mahasiswa WHERE NRP = $1', [nrp]);
        if (mhsUserResult.rows.length === 0) {
            return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });
        }
        const userId = mhsUserResult.rows[0].user_user_id;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            // Hapus entri di tabel Mahasiswa
            await client.query('DELETE FROM Mahasiswa WHERE NRP = $1', [nrp]);
            // Hapus entri di tabel User
            await client.query('DELETE FROM "User" WHERE user_id = $1', [userId]);

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

module.exports = {
    getMahasiswas,
    getMahasiswaByNRP,
    updateMahasiswa,
    deleteMahasiswa,
};
