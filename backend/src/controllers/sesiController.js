// backend/src/controllers/sesiController.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid'); // Masih digunakan untuk User/Admin ID di authController

// Fungsi utilitas untuk menghasilkan ID CHAR(4) acak (digunakan untuk User/Admin ID di authController)
const generateCharId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Fungsi untuk mendapatkan nomor sesi terakhir (misalnya dari 'S005' akan mengembalikan 5)
const getLatestSesiNumber = async () => {
    try {
        console.log('Fetching latest sesi_id from DB...');
        const result = await db.query(
            `SELECT sesi_id FROM Sesi
             WHERE sesi_id LIKE 'S%' AND LENGTH(sesi_id) = 4 AND SUBSTRING(sesi_id, 2, 3) ~ '^[0-9]+$'
             ORDER BY CAST(SUBSTRING(sesi_id, 2, 3) AS INTEGER) DESC
             LIMIT 1;`
        );
        if (result.rows.length > 0) {
            const lastId = result.rows[0].sesi_id; // Contoh: 'S005'
            const lastNumber = parseInt(lastId.substring(1), 10); // Ekstrak 5
            console.log('Latest sesi_id found:', lastId, 'Parsed number:', lastNumber);
            return lastNumber;
        }
    } catch (error) {
        console.error("Error getting latest sesi number from DB (will default to 0):", error.message);
        console.error("Detailed DB error:", error);
        return 0;
    }
    console.log('No existing sesi_id with "S###" format found. Starting from 0.');
    return 0;
};

/**
 * Initializes or refreshes the 'sesi_lengkap_view' in the database.
 * This should be called once when the application starts.
 */
const initializeSesiLengkapView = async () => {
    const createViewQuery = `
        CREATE OR REPLACE VIEW sesi_lengkap_view AS
        SELECT
            s.sesi_id,
            s.tanggal,
            s.status,
            s.catatan,
            m.NRP AS mahasiswa_nrp,
            m.nama AS mahasiswa_nama,
            k.NIK AS konselor_nik,
            k.nama AS konselor_nama,
            t.topik_id AS topik_topik_id,
            t.topik_nama,
            a.admin_id AS admin_admin_id,
            a.nama AS admin_nama
        FROM
            Sesi s
        JOIN
            Mahasiswa m ON s.Mahasiswa_NRP = m.NRP
        JOIN
            Konselor k ON s.Konselor_NIK = k.NIK
        JOIN
            Topik t ON s.Topik_topik_id = t.topik_id
        JOIN
            Admin a ON s.Admin_admin_id = a.admin_id;
    `;
    try {
        await db.query(createViewQuery);
        console.log('View "sesi_lengkap_view" created or replaced successfully.');
    } catch (error) {
        console.error('Error creating or replacing "sesi_lengkap_view":', error.message);
        console.error('Detailed error:', error);
        // Depending on your application's robustness, you might want to exit or handle this more gracefully.
    }
};


// Membuat sesi baru (oleh mahasiswa)
const createSesi = async (req, res) => {
    // Ambil tanggal dari request body
    const { konselor_nik, topik_id, tanggal } = req.body;
    const status = 'Requested'; // Status awal
    const catatan = null; // Awalnya catatan kosong

    console.log('--- Create Sesi Request Received ---');
    console.log('Request data:', { konselor_nik, topik_id, tanggal }); // Log tanggal juga

    // Validasi pengguna yang login
    if (!req.user || !req.user.user_id || req.user.role !== 'Mahasiswa') {
        console.error('Error: User not authenticated or not a Mahasiswa.');
        return res.status(403).json({ message: 'Akses ditolak: Hanya Mahasiswa yang dapat membuat sesi.' });
    }

    let mahasiswa_nrp;
    try {
        const mahasiswas = await db.query('SELECT NRP FROM Mahasiswa WHERE User_user_id = $1', [req.user.user_id]);
        if (mahasiswas.rows.length === 0) {
            console.error('Error: No Mahasiswa entry found for user_id:', req.user.user_id);
            return res.status(403).json({ message: 'Pengguna bukan mahasiswa yang valid' });
        }
        mahasiswa_nrp = mahasiswas.rows[0].nrp;
        console.log('Mahasiswa NRP found:', mahasiswa_nrp);
    } catch (e) {
        console.error("Error fetching Mahasiswa NRP:", e.message);
        console.error("Detailed Mahasiswa fetch error:", e);
        return res.status(500).json({ message: 'Gagal mendapatkan data mahasiswa.' });
    }

    // Mendapatkan Admin_admin_id (ambil admin pertama yang ditemukan)
    let admin_id;
    try {
        const adminResult = await db.query('SELECT admin_id FROM Admin LIMIT 1');
        if (adminResult.rows.length > 0) {
            admin_id = adminResult.rows[0].admin_id;
            console.log('Admin ID found for session creation:', admin_id);
        } else {
            console.error('Tidak ada admin ditemukan di database. Pastikan ada setidaknya satu admin terdaftar.');
            return res.status(500).json({ message: 'Tidak dapat membuat sesi: Admin tidak ditemukan.' });
        }
    } catch (e) {
        console.error("Gagal mendapatkan admin_id untuk sesi:", e.message);
        console.error("Detailed Admin ID fetch error:", e);
        return res.status(500).json({ message: 'Gagal mendapatkan admin_id untuk sesi' });
    }

    // Validasi input wajib dari request body (termasuk tanggal)
    if (!konselor_nik || !topik_id || !tanggal) {
        console.error('Error: Missing Konselor NIK, Topik ID, or Tanggal in request body.');
        return res.status(400).json({ message: 'Konselor, Topik, dan Tanggal wajib untuk membuat sesi.' });
    }

    // Validasi format tanggal (opsional, tapi disarankan)
    if (isNaN(new Date(tanggal).getTime())) {
        console.error('Error: Invalid date format received for tanggal:', tanggal);
        return res.status(400).json({ message: 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.' });
    }

    let sesi_id;
    let maxRetries = 5;
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
        try {
            const latestNumber = await getLatestSesiNumber();
            const newNumber = latestNumber + 1;
            sesi_id = `S${String(newNumber).padStart(3, '0')}`;

            console.log(`Attempting to create sesi with generated sesi_id: ${sesi_id} (Attempt ${currentRetry + 1}/${maxRetries})`);

            const result = await db.query(
                `INSERT INTO Sesi (sesi_id, tanggal, status, catatan, Mahasiswa_NRP, Konselor_NIK, Admin_admin_id, Topik_topik_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [sesi_id, tanggal, status, catatan, mahasiswa_nrp, konselor_nik, admin_id, topik_id]
            );
            console.log('Sesi created successfully:', result.rows[0]);
            return res.status(201).json({ message: 'Sesi konseling berhasil diminta', sesi: result.rows[0] });

        } catch (err) {
            console.error(`Error creating sesi with sesi_id ${sesi_id}:`, err.message);
            console.error('Detailed Sesi creation error:', err);

            if (err.message.includes('Jadwal bentrok!')) {
                return res.status(409).json({ message: 'Gagal: Jadwal konselor pada waktu tersebut sudah terisi.' });
            }
            else if (err.code === '23505' && err.constraint === 'sesi_pkey') {
                console.warn(`Duplicate sesi_id ${sesi_id} detected. Retrying...`);
                currentRetry++;
                await new Promise(resolve => setTimeout(resolve, 50 + currentRetry * 20));
                continue;
            }
            else if (err.code === '23503') {
                let detail = 'Pastikan Konselor NIK, Topik ID, dan Admin ID yang Anda pilih valid.';
                if (err.constraint === 'fk_sesi_konselor') detail = 'Konselor yang dipilih tidak ditemukan.';
                else if (err.constraint === 'fk_sesi_topik') detail = 'Topik yang dipilih tidak ditemukan.';
                else if (err.constraint === 'fk_sesi_admin') detail = 'Admin untuk sesi tidak ditemukan.';
                else if (err.constraint === 'fk_sesi_mahasiswa') detail = 'Mahasiswa untuk sesi tidak ditemukan.';
                return res.status(400).json({ message: `Gagal membuat sesi: ${detail}` });
            }
            else {
                return res.status(500).send('Kesalahan server saat membuat sesi');
            }
        }
    }

    console.error(`Max retries (${maxRetries}) reached for sesi creation. Failed to generate unique ID.`);
    return res.status(500).json({ message: 'Gagal membuat sesi: Tidak dapat menghasilkan ID unik setelah beberapa kali percobaan.' });
};

// --- Fungsi Controller Lainnya ---

// Mendapatkan semua sesi (untuk admin)
const getAllSesi = async (req, res) => {
    const { status } = req.query;
    try {
        let query = `SELECT * FROM sesi_lengkap_view`;
        const params = [];

        if (status) {
            query += ` WHERE status = $1`;
            params.push(status);
        }

        query += ` ORDER BY tanggal DESC;`;
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in getAllSesi using view:", err.message);
        res.status(500).send('Kesalahan server saat mengambil semua sesi');
    }
};

// Mendapatkan sesi untuk mahasiswa yang login
const getSesiForMahasiswa = async (req, res) => {
    try {
        const mahasiswas = await db.query('SELECT NRP FROM Mahasiswa WHERE User_user_id = $1', [req.user.user_id]);
        if (mahasiswas.rows.length === 0) {
            return res.status(403).json({ message: 'Pengguna bukan mahasiswa yang valid' });
        }
        const mahasiswa_nrp = mahasiswas.rows[0].nrp;

        const result = await db.query(`
            SELECT
                s.sesi_id,
                s.tanggal,
                s.status,
                s.catatan,
                k.nama AS konselor_nama,
                k.spesialisasi AS konselor_spesialisasi,
                t.topik_nama
            FROM Sesi s
            JOIN Konselor k ON s.Konselor_NIK = k.NIK
            JOIN Topik t ON s.Topik_topik_id = t.topik_id
            WHERE s.Mahasiswa_NRP = $1
            ORDER BY s.tanggal DESC;
        `, [mahasiswa_nrp]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Mendapatkan sesi untuk konselor yang login
const getSesiForKonselor = async (req, res) => {
    try {
        const konselors = await db.query('SELECT NIK FROM Konselor WHERE User_user_id = $1', [req.user.user_id]);
        if (konselors.rows.length === 0) {
            return res.status(403).json({ message: 'Pengguna bukan konselor yang valid' });
        }
        const konselor_nik = konselors.rows[0].nik;

        const result = await db.query(`
            SELECT
                s.sesi_id,
                s.tanggal,
                s.status,
                s.catatan,
                m.nama AS mahasiswa_nama,
                m.departemen AS mahasiswa_departemen,
                t.topik_nama
            FROM Sesi s
            JOIN Mahasiswa m ON s.Mahasiswa_NRP = m.NRP
            JOIN Topik t ON s.Topik_topik_id = t.topik_id
            WHERE s.Konselor_NIK = $1
            ORDER BY s.tanggal DESC;
        `, [konselor_nik]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Memperbarui status dan/atau catatan sesi (oleh konselor atau admin)
const updateSesi = async (req, res) => {
    const { id } = req.params;
    const { status, catatan } = req.body;
    const { role, user_id, entity_id } = req.user; // entity_id akan berisi NIK konselor atau admin_id

    try {
        const sesi = await db.query('SELECT * FROM Sesi WHERE sesi_id = $1', [id]);
        if (sesi.rows.length === 0) {
            return res.status(404).json({ message: 'Sesi tidak ditemukan' });
        }

        // Hanya konselor yang terkait atau admin yang bisa memperbarui
        if (role === 'Konselor') {
            if (entity_id !== sesi.rows[0].konselor_nik) {
                return res.status(403).json({ message: 'Tidak diizinkan untuk memperbarui sesi ini' });
            }
        } else if (role !== 'Admin') {
            return res.status(403).json({ message: 'Tidak diizinkan untuk memperbarui sesi' });
        }

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (status) {
            updateFields.push(`status = $${paramIndex++}`);
            updateValues.push(status);
        }
        if (catatan !== undefined) {
            updateFields.push(`catatan = $${paramIndex++}`);
            updateValues.push(catatan);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'Tidak ada bidang yang disediakan untuk pembaruan' });
        }

        const query = `UPDATE Sesi SET ${updateFields.join(', ')} WHERE sesi_id = $${paramIndex} RETURNING sesi_id`;
        updateValues.push(id);

        const result = await db.query(query, updateValues);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sesi tidak ditemukan' });
        }
        res.json({ message: 'Sesi berhasil diperbarui', sesi_id: result.rows[0].sesi_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Menghapus sesi (hanya admin)
const deleteSesi = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM Sesi WHERE sesi_id = $1 RETURNING sesi_id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sesi tidak ditemukan' });
        }
        res.json({ message: 'Sesi berhasil dihapus' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

const getCompletedSessions = async (req, res) => {
    // Pastikan req.user tersedia dan memiliki role 'Admin'
    // Asumsi middleware autentikasi sudah berjalan dan mengisi req.user
    if (!req.user || req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Akses ditolak: Hanya Admin yang dapat melihat rekap sesi selesai.' });
    }

    const { start_date, end_date } = req.query; // Ambil dari query parameter

    // Validasi parameter tanggal
    if (!start_date || !end_date) {
        return res.status(400).json({ message: 'Parameter start_date dan end_date wajib diisi untuk rekap sesi selesai.' });
    }

    // Validasi format tanggal (sederhana, bisa ditingkatkan)
    // Coba buat objek Date, jika NaN maka formatnya tidak valid
    const parsedStartDate = new Date(start_date);
    const parsedEndDate = new Date(end_date);

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ message: 'Format tanggal tidak valid. Gunakan format yang dikenali (misal: YYYY-MM-DD).' });
    }

    // Pastikan end_date tidak lebih awal dari start_date
    if (parsedStartDate.getTime() > parsedEndDate.getTime()) {
        return res.status(400).json({ message: 'Tanggal mulai tidak boleh lebih lambat dari tanggal akhir.' });
    }

    try {
        const query = `
            SELECT
                S.sesi_id,
                S.tanggal,
                S.status,
                M.nama AS nama_mahasiswa,
                K.nama AS nama_konselor,
                T.topik_nama AS nama_topik,
                S.catatan
            FROM
                Sesi AS S
            JOIN
                Mahasiswa AS M ON S.Mahasiswa_NRP = M.NRP
            JOIN
                Konselor AS K ON S.Konselor_NIK = K.NIK
            JOIN
                Topik AS T ON S.Topik_topik_id = T.topik_id
            WHERE
                S.status = 'Selesai'
                AND S.tanggal BETWEEN $1 AND $2
            ORDER BY
                S.tanggal DESC;
        `;

        // Menambahkan 23:59:59 ke end_date agar mencakup seluruh hari terakhir
        // Atau pastikan tipe data tanggal di DB Anda hanya menyimpan tanggal tanpa waktu
        // Jika DB menyimpan TIMESTAMP, lebih baik menggunakan format 'YYYY-MM-DD 00:00:00' dan 'YYYY-MM-DD 23:59:59'
        const endDateWithTime = `${end_date} 23:59:59`;

        console.log(`Fetching completed sessions from ${start_date} to ${endDateWithTime}`);
        const result = await db.query(query, [start_date, endDateWithTime]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tidak ada sesi selesai ditemukan dalam periode yang diminta.' });
        }

        res.status(200).json(result.rows);

    } catch (err) {
        console.error('Error fetching completed sessions:', err.message);
        res.status(500).send('Kesalahan server saat mengambil rekap sesi selesai.');
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

const getSessionStatusDistribution = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM get_session_status_distribution();'
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching session status distribution:", err.message);
        res.status(500).send('Kesalahan server saat mengambil distribusi sesi berdasarkan status.');
    }
};

const transferSesi = async (req, res) => {
    const { sesiId, newKonselorNik } = req.body;

    if (!sesiId || !newKonselorNik) {
        return res.status(400).json({ message: 'ID Sesi dan NIK konselor baru wajib diisi.' });
    }

    try {
        // Memanggil prosedur database
        await db.query('CALL transfer_sesi_konselor($1, $2);', [sesiId, newKonselorNik]);
        res.status(200).json({ message: `Sesi ${sesiId} berhasil ditransfer ke konselor ${newKonselorNik}.` });
    } catch (err) {
        console.error("Error transferring session:", err.message);
        // Tangkap pesan exception dari prosedur
        if (err.message && err.message.includes('Sesi dengan ID') || err.message.includes('Konselor baru dengan NIK') || err.message.includes('tidak memiliki keahlian') || err.message.includes('tidak dapat ditransfer')) {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send('Kesalahan server saat mentransfer sesi.');
    }
};

module.exports = {
    createSesi,
    getAllSesi,
    getSesiForMahasiswa,
    getSesiForKonselor,
    updateSesi,
    deleteSesi,
    getCompletedSessions,
    getSesiBySpesialisasi,
    initializeSesiLengkapView,
    getSessionStatusDistribution,
    transferSesi
};