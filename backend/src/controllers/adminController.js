const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { getLaporanBulanan } = require('../config/dbFunction');
const { get } = require('../routes/authRoutes');

// Menambah admin baru dengan admin_id urut (A001, A002, dst, tanpa loncatan)
const tambahAdmin = async (req, res) => {
    const { nama, username, password } = req.body;

    try {
        // Cari nomor admin_id terkecil yang belum dipakai
        const nextIdResult = await db.query(`
            SELECT
                LPAD((
                    SELECT MIN(t.missing_id)
                    FROM (
                        SELECT generate_series(1, COALESCE(MAX(CAST(SUBSTRING(admin_id, 2) AS INTEGER)), 0) + 1) AS missing_id
                        FROM Admin
                    ) t
                    LEFT JOIN Admin a ON t.missing_id = CAST(SUBSTRING(a.admin_id, 2) AS INTEGER)
                    WHERE a.admin_id IS NULL
                )::text, 3, '0') AS next_admin_num
        `);

        let nextAdminNum = '001';
        if (nextIdResult.rows.length > 0 && nextIdResult.rows[0].next_admin_num) {
            nextAdminNum = nextIdResult.rows[0].next_admin_num;
        }
        const newAdminId = 'A' + nextAdminNum;

        // Generate user_id baru (pakai uuid)
        const newUserId = uuidv4();

        // Insert ke tabel User
        await db.query(
            'INSERT INTO "User" (user_id, username, password, role) VALUES ($1, $2, $3, $4)',
            [newUserId, username, password, 'admin']
        );

        // Insert ke tabel Admin dengan admin_id custom
        await db.query(
            'INSERT INTO Admin (admin_id, nama, User_user_id) VALUES ($1, $2, $3)',
            [newAdminId, nama, newUserId]
        );

        res.status(201).json({ message: 'Admin berhasil ditambahkan', admin_id: newAdminId });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Mendapatkan semua admin
const getAdmins = async (req, res) => {
    try {
        const result = await db.query('SELECT a.admin_id, a.nama, u.username FROM Admin a JOIN "User" u ON a.User_user_id = u.user_id');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Mendapatkan admin berdasarkan ID
const getAdminById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT a.admin_id, a.nama, u.username FROM Admin a JOIN "User" u ON a.User_user_id = u.user_id WHERE a.admin_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Admin tidak ditemukan' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Memperbarui admin (nama)
const updateAdmin = async (req, res) => {
    const { id } = req.params;
    const { nama } = req.body;
    try {
        const result = await db.query(
            'UPDATE Admin SET nama = $1 WHERE admin_id = $2 RETURNING admin_id',
            [nama, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Admin tidak ditemukan' });
        }
        res.json({ message: 'Admin berhasil diperbarui', admin_id: result.rows[0].admin_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Menghapus admin
const deleteAdmin = async (req, res) => {
    const { id } = req.params; // admin_id
    try {
        // Pertama, dapatkan User_user_id yang terkait dengan admin_id ini
        const adminUserResult = await db.query('SELECT User_user_id FROM Admin WHERE admin_id = $1', [id]);
        if (adminUserResult.rows.length === 0) {
            return res.status(404).json({ message: 'Admin tidak ditemukan' });
        }
        const userId = adminUserResult.rows[0].user_user_id;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            // Hapus entri di tabel Admin
            await client.query('DELETE FROM Admin WHERE admin_id = $1', [id]);
            // Hapus entri di tabel User (akan CASCADE ke Admin jika constraintnya ada, tapi lebih aman hapus eksplisit)
            await client.query('DELETE FROM "User" WHERE user_id = $1', [userId]);

            await client.query('COMMIT');
            res.json({ message: 'Admin dan pengguna terkait berhasil dihapus' });
        } catch (transactionError) {
            await client.query('ROLLBACK');
            console.error('Error saat menghapus admin transaksi:', transactionError.message);
            res.status(500).json({ message: `Gagal menghapus admin: ${transactionError.message}` });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Menghapus mahasiswa
const deleteMahasiswa = async (req, res) => {
    const { id } = req.params; // id = nrp mahasiswa
    try {
        // Dapatkan user_id terkait mahasiswa
        const mhsResult = await db.query('SELECT User_user_id FROM Mahasiswa WHERE nrp = $1', [id]);
        if (mhsResult.rows.length === 0) {
            return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });
        }
        const userId = mhsResult.rows[0].user_user_id;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            // Hapus dari Mahasiswa
            await client.query('DELETE FROM Mahasiswa WHERE nrp = $1', [id]);
            // Hapus dari User
            await client.query('DELETE FROM "User" WHERE user_id = $1', [userId]);
            await client.query('COMMIT');
            res.json({ message: 'Mahasiswa dan user terkait berhasil dihapus' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error saat menghapus mahasiswa:', err.message);
            res.status(500).json({ message: `Gagal menghapus mahasiswa: ${err.message}` });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Menghapus konselor
const deleteKonselor = async (req, res) => {
    const { id } = req.params; // id = nik konselor
    try {
        // Dapatkan user_id terkait konselor
        const konsResult = await db.query('SELECT User_user_id FROM Konselor WHERE nik = $1', [id]);
        if (konsResult.rows.length === 0) {
            return res.status(404).json({ message: 'Konselor tidak ditemukan' });
        }
        const userId = konsResult.rows[0].user_user_id;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            // Hapus dari Konselor
            await client.query('DELETE FROM Konselor WHERE nik = $1', [id]);
            // Hapus dari User
            await client.query('DELETE FROM "User" WHERE user_id = $1', [userId]);
            await client.query('COMMIT');
            res.json({ message: 'Konselor dan user terkait berhasil dihapus' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error saat menghapus konselor:', err.message);
            res.status(500).json({ message: `Gagal menghapus konselor: ${err.message}` });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

const getSesiSelesaiKonselor = async (req, res) => {
    const { role, user_id } = req.user;
    let konselor_nik = null;

    if (role === 'Konselor') {
        // Konselor hanya bisa akses sesi miliknya sendiri
        const konselors = await db.query('SELECT NIK FROM Konselor WHERE User_user_id = $1', [user_id]);
        if (konselors.rows.length === 0) {
            return res.status(403).json({ message: 'Pengguna bukan konselor yang valid' });
        }
        konselor_nik = konselors.rows[0].nik;
    } else if (role === 'Admin') {
        // Admin bisa pilih konselor lewat query param
        konselor_nik = req.query.nik;
        if (!konselor_nik) {
            return res.status(400).json({ message: 'Admin harus memilih konselor (nik) untuk melihat sesi selesai.' });
        }
    } else {
        return res.status(403).json({ message: 'Tidak diizinkan.' });
    }

    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ message: 'Parameter start dan end (YYYY-MM-DD) wajib diisi' });
    }

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
};

const getLaporanSesiBulanan = async (req, res) => {
    const { bulan, tahun } = req.query;

    if (!bulan || !tahun) {
        return res.status(400).json({ message: 'Parameter bulan dan tahun wajib diisi.' });
    }

    try {
        const laporan = await getLaporanBulanan(parseInt(bulan, 10), parseInt(tahun, 10));
        if (laporan) {
            res.json(laporan);
        } else {
            res.status(404).json({ message: 'Tidak ada data laporan untuk bulan dan tahun yang ditentukan.' });
        }
    } catch (error) {
        console.error('Error in getLaporanSesiBulanan controller:', error.message);
        res.status(500).json({ message: 'Gagal mengambil laporan sesi bulanan.', error: error.message });
    }
};

module.exports = {
    tambahAdmin,
    getAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin,
    deleteMahasiswa, 
    deleteKonselor,
    getSesiSelesaiKonselor,
    getLaporanSesiBulanan
};
