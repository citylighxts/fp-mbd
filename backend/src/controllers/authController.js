const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // Untuk membuat ID unik jika CHAR(4) tidak cocok

// Fungsi utilitas untuk menghasilkan ID CHAR(4)
const generateCharId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const registerUser = async (req, res) => {
    const { username, password, role, nama, departemen, kontak, spesialisasi, NRP, NIK } = req.body;

    if (!username || !password || !role || !nama) {
        return res.status(400).json({ message: 'Harap lengkapi semua bidang wajib' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let user_id;
        let isUnique = false;

        // Pastikan user_id unik
        while (!isUnique) {
            user_id = generateCharId();
            const userExists = await db.query('SELECT 1 FROM "User" WHERE user_id = $1', [user_id]);
            if (userExists.rows.length === 0) {
                isUnique = true;
            }
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const userInsertQuery = `
                INSERT INTO "User" (user_id, username, password, role)
                VALUES ($1, $2, $3, $4) RETURNING user_id;
            `;
            const userResult = await client.query(userInsertQuery, [user_id, username, hashedPassword, role]);
            const newUserId = userResult.rows[0].user_id;

            if (role === 'Mahasiswa') {
                if (!NRP || !departemen || !kontak) {
                    throw new Error('Bidang NRP, departemen, dan kontak wajib untuk Mahasiswa');
                }
                const mahasiswaInsertQuery = `
                    INSERT INTO Mahasiswa (NRP, nama, departemen, kontak, User_user_id)
                    VALUES ($1, $2, $3, $4, $5);
                `;
                await client.query(mahasiswaInsertQuery, [NRP, nama, departemen, kontak, newUserId]);
            } else if (role === 'Konselor') {
                if (!NIK || !spesialisasi || !kontak) {
                    throw new Error('Bidang NIK, spesialisasi, dan kontak wajib untuk Konselor');
                }
                const konselorInsertQuery = `
                    INSERT INTO Konselor (NIK, nama, spesialisasi, kontak, User_user_id)
                    VALUES ($1, $2, $3, $4, $5);
                `;
                await client.query(konselorInsertQuery, [NIK, nama, spesialisasi, kontak, newUserId]);
            } else if (role === 'Admin') {
                let admin_id;
                let isAdminIdUnique = false;
                while (!isAdminIdUnique) {
                    admin_id = generateCharId();
                    const adminExists = await db.query('SELECT 1 FROM Admin WHERE admin_id = $1', [admin_id]);
                    if (adminExists.rows.length === 0) {
                        isAdminIdUnique = true;
                    }
                }
                const adminInsertQuery = `
                    INSERT INTO Admin (admin_id, nama, User_user_id)
                    VALUES ($1, $2, $3);
                `;
                await client.query(adminInsertQuery, [admin_id, nama, newUserId]);
            } else {
                throw new Error('Peran tidak valid');
            }

            await client.query('COMMIT');
            res.status(201).json({ message: 'Pendaftaran pengguna berhasil' });
        } catch (transactionError) {
            await client.query('ROLLBACK');
            console.error('Error saat pendaftaran transaksi:', transactionError.message);
            res.status(500).json({ message: `Pendaftaran gagal: ${transactionError.message}` });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error saat pendaftaran pengguna:', error.message);
        if (error.code === '23505') { // Kode error untuk unique violation
            return res.status(400).json({ message: 'Username sudah digunakan' });
        }
        res.status(500).json({ message: 'Kesalahan server' });
    }
};


const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const userQuery = 'SELECT user_id, username, password, role FROM "User" WHERE username = $1';
        const userResult = await db.query(userQuery, [username]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Kredensial tidak valid' });
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Kredensial tidak valid' });
        }

        // Ketika login, selain user_id dan role, kita juga perlu mendapatkan NIK/NRP/admin_id
        // agar frontend bisa mengidentifikasi entitas spesifik mereka
        let entityId = null;
        if (user.role === 'Mahasiswa') {
            const mhsResult = await db.query('SELECT NRP FROM Mahasiswa WHERE User_user_id = $1', [user.user_id]);
            entityId = mhsResult.rows[0]?.nrp;
        } else if (user.role === 'Konselor') {
            const konselorResult = await db.query('SELECT NIK FROM Konselor WHERE User_user_id = $1', [user.user_id]);
            entityId = konselorResult.rows[0]?.nik;
        } else if (user.role === 'Admin') {
            const adminResult = await db.query('SELECT admin_id FROM Admin WHERE User_user_id = $1', [user.user_id]);
            entityId = adminResult.rows[0]?.admin_id;
        }


        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, entity_id: entityId }, // Tambahkan entity_id
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Login berhasil',
            token,
            user: {
                id: user.user_id,
                username: user.username,
                role: user.role,
                entityId: entityId, // Kirim juga entityId ke frontend
            },
        });
    } catch (error) {
        console.error('Error saat login pengguna:', error.message);
        res.status(500).json({ message: 'Kesalahan server' });
    }
};

module.exports = { registerUser, loginUser };