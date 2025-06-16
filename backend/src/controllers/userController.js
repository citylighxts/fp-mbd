const db = require('../config/db');

// Mendapatkan semua pengguna
const getUsers = async (req, res) => {
    try {
        const result = await db.query('SELECT user_id, username, role FROM "User"');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Mendapatkan pengguna berdasarkan ID
const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT user_id, username, role FROM "User" WHERE user_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Memperbarui pengguna (hanya username dan role)
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, role } = req.body;
    try {
        const result = await db.query(
            'UPDATE "User" SET username = $1, role = $2 WHERE user_id = $3 RETURNING user_id',
            [username, role, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }
        res.json({ message: 'Pengguna berhasil diperbarui', user_id: result.rows[0].user_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Menghapus pengguna (CASCADE dari User_user_id akan menghapus entri terkait di Mahasiswa/Konselor/Admin)
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM "User" WHERE user_id = $1 RETURNING user_id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }
        res.json({ message: 'Pengguna berhasil dihapus' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

module.exports = {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
};
