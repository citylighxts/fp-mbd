// backend/src/controllers/konselorController.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid'); // Masih digunakan untuk User ID di authController, dll.

// Fungsi utilitas untuk menghasilkan ID CHAR(4) acak (digunakan untuk User/Admin ID)
// Ini tidak digunakan untuk sesi_id
const generateCharId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Mendapatkan semua konselor beserta topiknya
const getKonselors = async (req, res) => {
    try {
        // Jika ada query param userId, filter berdasarkan itu
        const { userId } = req.query;
        let query = `
            SELECT
                k.NIK,
                k.nama,
                k.spesialisasi,
                k.kontak,
                u.username,
                ARRAY_AGG(t.topik_nama)
            FROM Konselor k
            JOIN "User" u ON k.User_user_id = u.user_id
            LEFT JOIN Konselor_Topik kt ON k.NIK = kt.Konselor_NIK
            LEFT JOIN Topik t ON kt.Topik_topik_id = t.topik_id
        `;
        const params = [];

        if (userId) {
            query += ` WHERE u.user_id = $1`;
            params.push(userId);
        }

        query += ` GROUP BY k.NIK, k.nama, k.spesialisasi, k.kontak, u.username ORDER BY k.nama;`;

        console.log("Executing getKonselors query:", query, "with params:", params); // Tambahkan log ini
        const result = await db.query(query, params);
        console.log("Konselors data fetched:", result.rows); // Tambahkan log ini
        res.json(result.rows);

    } catch (err) {
        console.error("Error in getKonselors:", err.message);
        console.error("Detailed error in getKonselors:", err); // Log error lengkap
        res.status(500).send('Kesalahan server saat mengambil data konselor');
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

// Menghapus konselor
const deleteKonselor = async (req, res) => {
    const { nik } = req.params;
    try {
        const konselorUserResult = await db.query('SELECT User_user_id FROM Konselor WHERE NIK = $1', [nik]);
        if (konselorUserResult.rows.length === 0) {
            return res.status(404).json({ message: 'Konselor tidak ditemukan' });
        }
        const userId = konselorUserResult.rows[0].user_user_id;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM Konselor_Topik WHERE Konselor_NIK = $1', [nik]);
            const relatedSessions = await client.query('SELECT 1 FROM Sesi WHERE Konselor_NIK = $1', [nik]);
            if (relatedSessions.rows.length > 0) {
                throw new Error('Konselor tidak dapat dihapus karena masih terkait dengan sesi.');
            }
            const delKonselor = await client.query('DELETE FROM Konselor WHERE NIK = $1', [nik]);
            const delUser = await client.query('DELETE FROM "User" WHERE user_id = $1', [userId]);
            await client.query('COMMIT');

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

// Menampilkan sesi selesai milik konselor dalam periode tertentu
const getSesiSelesaiKonselor = async (req, res) => {
    try {
        // Dapatkan NIK konselor yang sedang login
        const konselors = await db.query('SELECT NIK FROM Konselor WHERE User_user_id = $1', [req.user.user_id]);
        if (konselors.rows.length === 0) {
            return res.status(403).json({ message: 'Pengguna bukan konselor yang valid' });
        }
        const konselor_nik = konselors.rows[0].nik;

        // Ambil parameter periode dari query string
        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({ message: 'Parameter start dan end (YYYY-MM-DD) wajib diisi' });
        }

        // Query sesi selesai
        const result = await db.query(`
            SELECT
                s.sesi_id,
                s.tanggal,
                s.status,
                s.catatan,
                m.nama AS mahasiswa_nama,
                t.topik_nama
            FROM Sesi s
            JOIN Mahasiswa m ON s.Mahasiswa_NRP = m.NRP
            JOIN Topik t ON s.Topik_topik_id = t.topik_id
            WHERE s.Konselor_NIK = $1
              AND s.status = 'Selesai'
              AND s.tanggal BETWEEN $2 AND $3
            ORDER BY s.tanggal DESC
        `, [konselor_nik, start, end]);

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Menampilkan sesi konseling oleh konselor dengan spesialisasi tertentu
const getSesiBySpesialisasi = async (req, res) => {
    try {
        const { spesialisasi } = req.query;
        if (!spesialisasi) {
            return res.status(400).json({ message: 'Parameter spesialisasi wajib diisi' });
        }

        const result = await db.query(`
            SELECT
                s.sesi_id,
                s.tanggal,
                s.status,
                s.catatan,
                k.nama AS konselor_nama,
                k.spesialisasi,
                m.nama AS mahasiswa_nama,
                t.topik_nama
            FROM Sesi s
            JOIN Konselor k ON s.Konselor_NIK = k.NIK
            JOIN Mahasiswa m ON s.Mahasiswa_NRP = m.NRP
            JOIN Topik t ON s.Topik_topik_id = t.topik_id
            WHERE k.spesialisasi = $1
            ORDER BY s.tanggal DESC
        `, [spesialisasi]);

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

const getKonselorTanpaSesi = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                k.NIK,
                k.nama,
                k.spesialisasi,
                k.kontak,
                u.username
            FROM Konselor k
            JOIN "User" u ON k.User_user_id = u.user_id
            LEFT JOIN Sesi s ON k.NIK = s.Konselor_NIK
            WHERE s.Konselor_NIK IS NULL;
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching konselor tanpa sesi:", err.message);
        res.status(500).send('Kesalahan server saat mendapatkan konselor tanpa sesi');
    }
};


module.exports = {
    getKonselors,
    getKonselorByNIK,
    updateKonselor,
    deleteKonselor,
    addKonselorTopik,
    removeKonselorTopik,
    getSesiSelesaiKonselor,
    getSesiBySpesialisasi,
    getKonselorTanpaSesi
};
