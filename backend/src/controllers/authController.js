// backend/src/controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // Still useful for general UUID needs, though not for user_id here

// --- Utility Functions ---

// Function to get the latest user number (e.g., from 'U005' will return 5)
const getLatestUserNumber = async () => {
    try {
        console.log('Fetching latest user_id from DB...');
        const result = await db.query(
            `SELECT user_id FROM "User"
             WHERE user_id LIKE 'U%' AND LENGTH(user_id) = 4 AND SUBSTRING(user_id, 2, 3) ~ '^[0-9]+$'
             ORDER BY CAST(SUBSTRING(user_id, 2, 3) AS INTEGER) DESC
             LIMIT 1;`
        );
        if (result.rows.length > 0) {
            const lastId = result.rows[0].user_id; // Example: 'U005'
            const lastNumber = parseInt(lastId.substring(1), 10); // Extracts 5
            console.log('Latest user_id found:', lastId, 'Parsed number:', lastNumber);
            return lastNumber;
        }
    } catch (error) {
        console.error("Error getting latest user number from DB (will default to 0):", error.message);
        console.error("Detailed DB error:", error);
        return 0;
    }
    console.log('No existing user_id with "U###" format found. Starting from 0.');
    return 0;
};

// --- Controller Functions ---

const registerUser = async (req, res) => {
    const { username, password, role, nama, departemen, kontak, spesialisasi, NRP, NIK } = req.body;
    console.log(`[REGISTER DEBUG] Password for user '${username}': "${password}" (Length: ${password.length})`);
    console.log('--- Register Request Received ---');
    console.log('Register request data:', { username, role, nama, NRP, NIK });

    if (!username || !password || !role || !nama) {
        console.error('Error: Missing required fields for registration.');
        return res.status(400).json({ message: 'Harap lengkapi semua bidang wajib' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully for user:', username);

        let user_id;
        let maxRetries = 5;
        let currentRetry = 0;

        // Generate unique incremental user_id
        while (currentRetry < maxRetries) {
            const latestNumber = await getLatestUserNumber();
            const newNumber = latestNumber + 1;
            user_id = `U${String(newNumber).padStart(3, '0')}`;

            console.log(`Attempting to create user with generated user_id: ${user_id} (Attempt ${currentRetry + 1}/${maxRetries})`);

            // Check if the generated user_id already exists (though unlikely with proper incrementing)
            const userExists = await db.query('SELECT 1 FROM "User" WHERE user_id = $1', [user_id]);
            if (userExists.rows.length === 0) {
                console.log('Generated unique user_id:', user_id);
                break; // Exit loop if ID is unique
            } else {
                console.warn(`Duplicate user_id ${user_id} detected during generation. Retrying...`);
                currentRetry++;
                await new Promise(resolve => setTimeout(resolve, 50 + currentRetry * 20)); // Small delay before retrying
            }

            if (currentRetry === maxRetries) {
                console.error(`Max retries (${maxRetries}) reached for user creation. Failed to generate unique ID.`);
                return res.status(500).json({ message: 'Gagal mendaftar: Tidak dapat menghasilkan ID pengguna yang unik setelah beberapa kali percobaan.' });
            }
        }


        const client = await db.pool.connect();
        try {
            await client.query('BEGIN'); // Start transaction

            const userInsertQuery = `
                INSERT INTO "User" (user_id, username, password, role)
                VALUES ($1, $2, $3, $4) RETURNING user_id;
            `;
            const userResult = await client.query(userInsertQuery, [user_id, username, hashedPassword, role]);
            const newUserId = userResult.rows[0].user_id;
            console.log('User inserted into "User" table. New User ID:', newUserId);

            if (role === 'Mahasiswa') {
                if (!NRP || !departemen || !kontak) {
                    throw new Error('Bidang NRP, departemen, dan kontak wajib untuk Mahasiswa');
                }
                const mahasiswaInsertQuery = `
                    INSERT INTO Mahasiswa (NRP, nama, departemen, kontak, User_user_id)
                    VALUES ($1, $2, $3, $4, $5);
                `;
                await client.query(mahasiswaInsertQuery, [NRP, nama, departemen, kontak, newUserId]);
                console.log('Mahasiswa data inserted.');
            } else if (role === 'Konselor') {
                if (!NIK || !spesialisasi || !kontak) {
                    throw new Error('Bidang NIK, spesialisasi, dan kontak wajib untuk Konselor');
                }
                const konselorInsertQuery = `
                    INSERT INTO Konselor (NIK, nama, spesialisasi, kontak, User_user_id)
                    VALUES ($1, $2, $3, $4, $5);
                `;
                await client.query(konselorInsertQuery, [NIK, nama, spesialisasi, kontak, newUserId]);
                console.log('Konselor data inserted.');
            } else if (role === 'Admin') {
                // Your existing admin_id generation logic (A001, A002, etc.)
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
                const admin_id = 'A' + nextAdminNum;

                const adminInsertQuery = `
                    INSERT INTO Admin (admin_id, nama, User_user_id)
                    VALUES ($1, $2, $3);
                `;
                await client.query(adminInsertQuery, [admin_id, nama, newUserId]);
                console.log('Admin data inserted.');
            } else {
                throw new Error('Peran tidak valid');
            }

            await client.query('COMMIT'); // Commit transaction if all successful
            console.log('Transaction committed successfully for user:', username);
            res.status(201).json({ message: 'Pendaftaran pengguna berhasil' });
        } catch (transactionError) {
            await client.query('ROLLBACK'); // Rollback transaction if any error
            console.error('Error during registration transaction (rolled back):', transactionError.message);
            console.error('Detailed transaction error:', transactionError); // Log the full error object
            if (transactionError.code === '23505') { // PostgreSQL unique violation error code
                return res.status(400).json({ message: `Pendaftaran gagal: ${username} sudah terdaftar atau ID unik lainnya bentrok.` });
            }
            res.status(500).json({ message: `Pendaftaran gagal: ${transactionError.message}` });
        } finally {
            client.release(); // Release client connection
            console.log('Database client released.');
        }
    } catch (error) {
        console.error('Unhandled error during user registration:', error.message);
        console.error('Detailed unhandled error:', error); // Log the full error object
        if (error.code === '23505') { // PostgreSQL unique violation error code
            return res.status(400).json({ message: 'Username sudah digunakan' });
        }
        res.status(500).json({ message: 'Kesalahan server' });
    } finally {
        console.log('--- Register Request Finished ---');
    }
};


const loginUser = async (req, res) => {
    const { username, password } = req.body;
    console.log(`[LOGIN DEBUG] Password for user '${username}': "${password}" (Length: ${password.length})`);
    console.log('--- Login Request Received ---');
    console.log('Attempting login for username:', username);
    // CAUTION: DO NOT LOG PLAIN PASSWORDS IN PRODUCTION. ONLY FOR DEBUGGING.
    // console.log('Password received:', password);

    try {
        const userQuery = 'SELECT user_id, username, password, role FROM "User" WHERE username = $1';
        const userResult = await db.query(userQuery, [username]);

        if (userResult.rows.length === 0) {
            console.log('Login Failed: User not found for username:', username);
            return res.status(400).json({ message: 'Kredensial tidak valid' });
        }

        const user = userResult.rows[0];
        console.log('User found in DB. Stored Hashed Password:', user.password); // Display stored hash

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('bcrypt.compare result (isMatch):', isMatch); // This is the most important log!

        if (!isMatch) {
            console.log('Login Failed: Password mismatch for user:', username);
            return res.status(400).json({ message: 'Kredensial tidak valid' });
        }
        console.log('Login Successful: Password matched for user:', username);

        // When logging in, besides user_id and role, we also need to get NIK/NRP/admin_id
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
        console.log(`User ${username} logged in with role ${user.role} and entityId: ${entityId}`);

        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, entity_id: entityId },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('JWT Token generated.');

        res.json({
            message: 'Login berhasil',
            token,
            user: {
                id: user.user_id,
                username: user.username,
                role: user.role,
                entityId: entityId,
            },
        });
    } catch (error) {
        console.error('Unhandled error during user login:', error.message);
        console.error('Detailed unhandled error:', error);
        res.status(500).json({ message: 'Kesalahan server' });
    } finally {
        console.log('--- Login Request Finished ---');
    }
};

module.exports = { registerUser, loginUser };