const db = require('../config/db');
const { v4: uuidv4 } = require('uuid'); // Make sure you have uuid installed if using for session_id

// --- Get All Students ---
const getMahasiswas = async (req, res) => {
    try {
        const result = await db.query('SELECT m.nrp as nrp, m.nama, m.departemen, m.kontak, u.username FROM Mahasiswa m JOIN "User" u ON m.User_user_id = u.user_id');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// --- Get Student by NRP ---
const getMahasiswaByNRP = async (req, res) => {
    const { nrp } = req.params;
    try {
        const result = await db.query('SELECT m.nrp as nrp, m.nama, m.departemen, m.kontak, u.username, u.user_id FROM Mahasiswa m JOIN "User" u ON m.User_user_id = u.user_id WHERE m.nrp = $1', [nrp]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// --- Update Student ---
const updateMahasiswa = async (req, res) => {
    const { nrp } = req.params;
    const { nama, departemen, kontak } = req.body;

    if (!nama || !departemen || !kontak) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const queryText = 'UPDATE mahasiswa SET nama = $1, departemen = $2, kontak = $3 WHERE nrp = $4 RETURNING *';
        const queryValues = [nama, departemen, kontak, nrp];
        const result = await client.query(queryText, queryValues);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: `Mahasiswa dengan NRP ${nrp} tidak ditemukan.` });
        }

        await client.query('COMMIT');

        res.status(200).json({
            message: 'Mahasiswa berhasil diperbarui!',
            mahasiswa: result.rows[0],
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('DATABASE ERROR:', err);
        res.status(500).json({ message: `Database Error: ${err.message}` });
    } finally {
        client.release();
    }
};

// --- Delete Student ---
const deleteMahasiswa = async (req, res) => {
    const { nrp } = req.params;
    console.log("Request hapus mahasiswa NRP:", nrp);
    try {
        const mhsUserResult = await db.query('SELECT User_user_id FROM Mahasiswa WHERE NRP = $1', [nrp]);
        console.log("Hasil select user:", mhsUserResult.rows);
        if (mhsUserResult.rows.length === 0) {
            console.log("Mahasiswa tidak ditemukan");
            return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });
        }
        const userId = mhsUserResult.rows[0].user_user_id;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const delMhs = await client.query('DELETE FROM Mahasiswa WHERE NRP = $1', [nrp]);
            console.log("Baris mahasiswa dihapus:", delMhs.rowCount);
            const delUser = await client.query('DELETE FROM "User" WHERE user_id = $1', [userId]);
            console.log("Baris user dihapus:", delUser.rowCount);
            await client.query('COMMIT');
            res.json({ message: 'Mahasiswa dan pengguna terkait berhasil dihapus' });
        } catch (transactionError) {
            await client.query('ROLLBACK');
            console.error('Error saat menghapus mahasiswa transaksi:', transactionError.message);
            res.status(500).json({ message: `Gagal menghapus mahasiswa: ${transactionError.message}` });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Kesalahan server');
    }
};

// --- Submit Counseling Session Request (ajukanSesiKonseling) ---
const ajukanSesiKonseling = async (req, res) => {
    const { konselor_id, topik_id, tanggal, waktu } = req.body;
    // Assuming req.user is populated by auth middleware and has 'entity_id' for Mahasiswa's NRP
    const mahasiswa_nrp = req.user.entity_id; // Use entity_id from auth token for Mahasiswa's NRP

    try {
        // Data validation
        if (!konselor_id || !topik_id || !tanggal || !waktu) {
            return res.status(400).json({ message: 'Data tidak lengkap' });
        }

        // Check for existing active session with the same counselor and topic for this student
        const cek = await db.query(
            'SELECT * FROM Sesi WHERE Mahasiswa_NRP = $1 AND Konselor_NIK = $2 AND Topik_topik_id = $3 AND status IN (\'Requested\', \'Scheduled\')', // Adjusted table/column names to match previous schema
            [mahasiswa_nrp, konselor_id, topik_id]
        );
        if (cek.rows.length > 0) {
            return res.status(409).json({ message: 'Anda sudah memiliki sesi aktif untuk topik ini.' });
        }

        // --- Important: You'll need an Admin_admin_id for Sesi table ---
        // Fetch any Admin's admin_id (assuming at least one admin exists)
        const adminResult = await db.query('SELECT admin_id FROM Admin LIMIT 1');
        if (adminResult.rows.length === 0) {
            return res.status(500).json({ message: 'Admin tidak ditemukan. Tidak dapat mengajukan sesi.' });
        }
        const admin_id_for_session = adminResult.rows[0].admin_id;
        // --- End of Admin_admin_id handling ---

        // Insert new session (sesi_id will be generated by the SesiController's createSesi if using that,
        // otherwise you'd need to generate it here like uuidv4() if Sesi table is independent)
        // If ajukanSesiKonseling here is meant to bypass the SesiController's ID generation,
        // then uuidv4() is fine, but ensure consistency.
        const result = await db.query(
            'INSERT INTO Sesi (sesi_id, Mahasiswa_NRP, Konselor_NIK, Topik_topik_id, tanggal, status, catatan, Admin_admin_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [uuidv4(), mahasiswa_nrp, konselor_id, topik_id, tanggal, 'Requested', null, admin_id_for_session] // 'Requested' as initial status, null for catatan
        );
        res.status(201).json({ message: 'Sesi konseling berhasil diajukan', sesi: result.rows[0] });
    } catch (err) {
        console.error('[AJUKAN SESI] Error:', err.message);
        console.error('[AJUKAN SESI] Detailed Error:', err); // Log full error for more context
        res.status(500).json({ message: 'Gagal mengajukan sesi konseling' });
    }
};

const getMahasiswaByTopik = async (req, res) => {
    const { topikNama } = req.query;
    if (!topikNama) {
        return res.status(400).json({ message: 'Parameter topikNama wajib diisi' });
    }

    try {
        const result = await db.query(
            `SELECT DISTINCT m.NRP, m.nama, m.departemen, m.kontak, u.username, u.user_id
             FROM Mahasiswa m
             JOIN "User" u ON m.User_user_id = u.user_id
             JOIN Sesi s ON s.Mahasiswa_NRP = m.NRP
             JOIN Topik t ON s.Topik_topik_id = t.topik_id
             WHERE t.topik_nama ILIKE $1;`,
            [`%${topikNama}%`]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching Mahasiswa by Topik:", err.message);
        res.status(500).send('Kesalahan server saat mencari mahasiswa berdasarkan topik');
    }
};

const getMahasiswaMasalahBerulang = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM MahasiswaDenganMasalahBerulang');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching Mahasiswa Dengan Masalah Berulang:', error.message);
        res.status(500).json({ message: 'Gagal mengambil data mahasiswa dengan masalah berulang.', error: error.message });
    }
};

const getAktivitasTerakhir = async (req, res) => {
    try {
        // Directly query the view
        const result = await db.query(`SELECT * FROM ViewAktivitasTerakhirMahasiswa;`);
        res.json(result.rows);
    } catch (err) {
        console.error('Error saat mengambil data aktivitas terakhir dari view:', err.message);
        res.status(500).send('Kesalahan server');
    }
};

module.exports = {
    getMahasiswas,
    getMahasiswaByNRP,
    getMahasiswaByTopik,
    updateMahasiswa,
    deleteMahasiswa,
    ajukanSesiKonseling,
    getMahasiswaMasalahBerulang,
    getAktivitasTerakhir
};