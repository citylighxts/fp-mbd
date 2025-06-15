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

// Membuat sesi baru (oleh mahasiswa)
const createSesi = async (req, res) => {
    const { konselor_nik, topik_id } = req.body;
    const tanggal = new Date(); // Waktu saat ini
    const status = 'Requested'; // Status awal
    const catatan = null; // Awalnya catatan kosong

    // Dapatkan Mahasiswa_NRP dari pengguna yang login (req.user.user_id)
    const mahasiswas = await db.query('SELECT NRP FROM Mahasiswa WHERE User_user_id = $1', [req.user.user_id]);
    if (mahasiswas.rows.length === 0) {
        return res.status(403).json({ message: 'Pengguna bukan mahasiswa yang valid' });
    }
    const mahasiswa_nrp = mahasiswas.rows[0].nrp;

    // Admin_admin_id: Asumsi ada admin default atau ambil dari request jika admin yang membuat sesi
    // Untuk demo ini, kita akan ambil admin pertama yang ditemukan atau buat dummy
    let admin_id;
    try {
        const adminResult = await db.query('SELECT admin_id FROM Admin LIMIT 1');
        if (adminResult.rows.length > 0) {
            admin_id = adminResult.rows[0].admin_id;
        } else {
            // Ini akan membuat error jika tidak ada admin dan tidak ada cara untuk membuat admin
            console.error('Tidak ada admin ditemukan di database. Pastikan ada setidaknya satu admin terdaftar.');
            return res.status(500).json({ message: 'Tidak dapat membuat sesi: Admin tidak ditemukan.' });
        }
    } catch (e) {
        console.error("Gagal mendapatkan admin_id", e);
        return res.status(500).json({ message: 'Gagal mendapatkan admin_id untuk sesi' });
    }


    if (!mahasiswa_nrp || !konselor_nik || !topik_id) {
        return res.status(400).json({ message: 'Mahasiswa, Konselor, dan Topik wajib' });
    }

    try {
        let sesi_id;
        let isUnique = false;

        while (!isUnique) {
            sesi_id = generateCharId();
            const sesiExists = await db.query('SELECT 1 FROM Sesi WHERE sesi_id = $1', [sesi_id]);
            if (sesiExists.rows.length === 0) {
                isUnique = true;
            }
        }

        const result = await db.query(
            `INSERT INTO Sesi (sesi_id, tanggal, status, catatan, Mahasiswa_NRP, Konselor_NIK, Admin_admin_id, Topik_topik_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [sesi_id, tanggal, status, catatan, mahasiswa_nrp, konselor_nik, admin_id, topik_id]
        );
        res.status(201).json({ message: 'Sesi konseling berhasil diminta', sesi: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// Mendapatkan semua sesi (untuk admin)
const getAllSesi = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                s.sesi_id,
                s.tanggal,
                s.status,
                s.catatan,
                m.nama AS mahasiswa_nama,
                m.NRP AS mahasiswa_nrp,
                k.nama AS konselor_nama,
                k.NIK AS konselor_nik,
                t.topik_nama,
                a.nama AS admin_nama
            FROM Sesi s
            JOIN Mahasiswa m ON s.Mahasiswa_NRP = m.NRP
            JOIN Konselor k ON s.Konselor_NIK = k.NIK
            JOIN Topik t ON s.Topik_topik_id = t.topik_id
            JOIN Admin a ON s.Admin_admin_id = a.admin_id
            ORDER BY s.tanggal DESC;
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
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
            // Memastikan konselor yang login adalah konselor yang ditugaskan untuk sesi ini
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
        if (catatan !== undefined) { // Izinkan catatan menjadi null
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


module.exports = {
    createSesi,
    getAllSesi,
    getSesiForMahasiswa,
    getSesiForKonselor,
    updateSesi,
    deleteSesi,
    getSesiSelesaiKonselor,
    getSesiBySpesialisasi
};