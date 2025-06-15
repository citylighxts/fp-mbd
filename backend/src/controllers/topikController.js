const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const generateCharId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Membuat topik baru (hanya admin yang bisa membuat)
const createTopik = async (req, res) => {
    const { topik_nama } = req.body;
    // req.user.user_id adalah user_id dari tabel User
    const loggedInUserUserId = req.user.user_id;

    if (!topik_nama) {
        return res.status(400).json({ message: 'Nama topik wajib' });
    }

    try {
        // Cari topik_id terakhir di database
        const lastIdResult = await db.query(
            "SELECT topik_id FROM Topik ORDER BY topik_id DESC LIMIT 1"
        );
        let newTopikId;
        if (lastIdResult.rows.length === 0) {
            newTopikId = "T001"; // Jika belum ada data sama sekali
        } else {
            const lastId = lastIdResult.rows[0].topik_id; // contoh: "T105"
            const lastNumber = parseInt(lastId.substring(1)); // ambil angka 105
            const nextNumber = lastNumber + 1;
            // Format dengan leading zero 3 digit
            newTopikId = `T${nextNumber.toString().padStart(3, '0')}`;
        }

        // Dapatkan admin_id dari tabel Admin berdasarkan user_id yang login
        const adminCheck = await db.query('SELECT admin_id FROM Admin WHERE User_user_id = $1', [loggedInUserUserId]);
        if (adminCheck.rows.length === 0) {
            // Ini seharusnya tidak terjadi jika middleware authorizeRoles berfungsi dengan benar
            // tetapi ini adalah double check keamanan
            return res.status(403).json({ message: 'Pengguna bukan admin yang valid untuk membuat topik' });
        }
        const actualAdminId = adminCheck.rows[0].admin_id;

        const result = await db.query(
            'INSERT INTO Topik (topik_id, topik_nama, Admin_admin_id) VALUES ($1, $2, $3) RETURNING *',
            [newTopikId, topik_nama, actualAdminId]
        );
        res.status(201).json({ message: 'Topik berhasil dibuat', topik: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Mendapatkan semua topik
const getTopiks = async (req, res) => {
    try {
        const result = await db.query('SELECT topik_id, topik_nama FROM Topik');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Mendapatkan topik berdasarkan ID
const getTopikById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT topik_id, topik_nama FROM Topik WHERE topik_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Topik tidak ditemukan' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Memperbarui topik
const updateTopik = async (req, res) => {
    const { id } = req.params;
    const { topik_nama } = req.body;
    try {
        const result = await db.query(
            'UPDATE Topik SET topik_nama = $1 WHERE topik_id = $2 RETURNING topik_id',
            [topik_nama, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Topik tidak ditemukan' });
        }
        res.json({ message: 'Topik berhasil diperbarui', topik_id: result.rows[0].topik_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

const deleteTopik = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM Topik WHERE topik_id = $1 RETURNING topik_id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Topik tidak ditemukan' });
        }
        res.json({ message: 'Topik berhasil dihapus' });
    } catch (err) {
        if (err.message && err.message.includes('Tidak dapat menghapus topik')) {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send('Kesalahan server saat menghapus topik');
    }
};

module.exports = {
    createTopik,
    getTopiks,
    getTopikById,
    updateTopik,
    deleteTopik,
};