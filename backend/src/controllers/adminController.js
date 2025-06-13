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

module.exports = {
    getAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin,
};