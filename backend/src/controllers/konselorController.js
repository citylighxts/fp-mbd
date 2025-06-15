const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Mendapatkan semua konselor beserta topiknya
const getKonselors = async (req, res) => {
    try {
        // Menggunakan query paling sederhana untuk menjamin data NIK benar.
        const result = await db.query('SELECT NIK, nama, spesialisasi, kontak FROM konselor ORDER BY nama ASC');

        // Mengirim data yang sudah pasti benar ke frontend.
    res.json(result.rows);

    } catch (err) {
        console.error("Error di getKonselors:", err.message);
        res.status(500).send('Kesalahan server');
}
};
// Mendapatkan konselor berdasarkan NIK beserta topiknya
const getKonselorByNIK = async (req, res) => {
    const { nik } = req.params;
    try {
        const result = await db.query(`
            SELECT
                k.NIK,
                k.nama,
                k.spesialisasi,
                k.kontak,
                u.username,
                ARRAY_AGG(t.topik_nama) FILTER (WHERE t.topik_nama IS NOT NULL) AS topik_nama
            FROM Konselor k
            JOIN "User" u ON k.User_user_id = u.user_id
            LEFT JOIN Konselor_Topik kt ON k.NIK = kt.Konselor_NIK
            LEFT JOIN Topik t ON kt.Topik_topik_id = t.topik_id
            WHERE k.NIK = $1
            GROUP BY k.NIK, k.nama, k.spesialisasi, k.kontak, u.username;
        `, [nik]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Konselor tidak ditemukan' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Memperbarui konselor
const updateKonselor = async (req, res) => {
    const { nik } = req.params;
    const { nama, spesialisasi, kontak } = req.body;
    try {
        const result = await db.query(
            'UPDATE Konselor SET nama = $1, spesialisasi = $2, kontak = $3 WHERE NIK = $4 RETURNING NIK',
            [nama, spesialisasi, kontak, nik]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Konselor tidak ditemukan' });
        }
        res.json({ message: 'Konselor berhasil diperbarui', NIK: result.rows[0].nik });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Menghapus konselor -- PERBAIKAN ADA DI SINI!
const deleteKonselor = async (req, res) => {
    const { nik } = req.params;
    try {
        // Cek apakah konselor ada
        const konselorUserResult = await db.query('SELECT User_user_id FROM Konselor WHERE NIK = $1', [nik]);
        if (konselorUserResult.rows.length === 0) {
            return res.status(404).json({ message: 'Konselor tidak ditemukan' });
        }
        const userId = konselorUserResult.rows[0].user_user_id;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            // Hapus relasi Konselor_Topik
            await client.query('DELETE FROM Konselor_Topik WHERE Konselor_NIK = $1', [nik]);
            // Cek apakah ada sesi terkait (jika ada, batalkan hapus)
            const relatedSessions = await client.query('SELECT 1 FROM Sesi WHERE Konselor_NIK = $1', [nik]);
            if (relatedSessions.rows.length > 0) {
                throw new Error('Konselor tidak dapat dihapus karena masih terkait dengan sesi.');
            }
            // Hapus dari Konselor
            const delKonselor = await client.query('DELETE FROM Konselor WHERE NIK = $1', [nik]);
            // Hapus dari User
            const delUser = await client.query('DELETE FROM "User" WHERE user_id = $1', [userId]);
            await client.query('COMMIT');

            // Pastikan baris benar-benar terhapus
            if (delKonselor.rowCount === 0) {
                return res.status(404).json({ message: 'Konselor tidak ditemukan (saat hapus).' });
            }
            res.json({ message: 'Konselor dan pengguna terkait berhasil dihapus' });
        } catch (transactionError) {
            await client.query('ROLLBACK');
            console.error('Error saat menghapus konselor transaksi:', transactionError.message);
            res.status(500).json({ message: `Gagal menghapus konselor: ${transactionError.message}` });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Menambahkan topik ke konselor
const addKonselorTopik = async (req, res) => {
    const { konselorNik, topikId } = req.body;
    try {
        const konselorExists = await db.query('SELECT 1 FROM Konselor WHERE NIK = $1', [konselorNik]);
        const topikExists = await db.query('SELECT 1 FROM Topik WHERE topik_id = $1', [topikId]);

        if (konselorExists.rows.length === 0 || topikExists.rows.length === 0) {
            return res.status(404).json({ message: 'Konselor atau Topik tidak ditemukan' });
        }

        const result = await db.query(
            'INSERT INTO Konselor_Topik (Konselor_NIK, Topik_topik_id) VALUES ($1, $2) ON CONFLICT (Konselor_NIK, Topik_topik_id) DO NOTHING RETURNING *',
            [konselorNik, topikId]
        );

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'Topik sudah ditambahkan ke konselor' });
        }
        res.status(201).json({ message: 'Topik berhasil ditambahkan ke konselor' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Menghapus topik dari konselor
const removeKonselorTopik = async (req, res) => {
    const { konselorNik, topikId } = req.body;
    try {
        const result = await db.query(
            'DELETE FROM Konselor_Topik WHERE Konselor_NIK = $1 AND Topik_topik_id = $2 RETURNING *',
            [konselorNik, topikId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Topik tidak ditemukan pada konselor ini' });
        }
        res.json({ message: 'Topik berhasil dihapus dari konselor' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

module.exports = {
    getKonselors,
    getKonselorByNIK,
    updateKonselor,
    deleteKonselor,
    addKonselorTopik,
    removeKonselorTopik,
};
