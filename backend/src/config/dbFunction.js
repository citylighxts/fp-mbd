const db = require('./db');

const FunctionGetSesiBulanan = `
    CREATE OR REPLACE FUNCTION fn_get_laporan_bulanan(p_bulan INTEGER, p_tahun INTEGER)
        RETURNS TABLE(
            total_sesi BIGINT,
            sesi_selesai BIGINT,
            sesi_dibatalkan BIGINT,
            topik_paling_populer VARCHAR
        ) AS $$
        BEGIN
            RETURN QUERY
            WITH SesiBulanIni AS (
                SELECT * FROM Sesi
                WHERE EXTRACT(MONTH FROM tanggal) = p_bulan AND EXTRACT(YEAR FROM tanggal) = p_tahun
            ),
            TopikPopuler AS (
                SELECT t.topik_nama
                FROM SesiBulanIni s JOIN Topik t ON s.Topik_topik_id = t.topik_id
                GROUP BY t.topik_nama ORDER BY COUNT(*) DESC LIMIT 1
            )
            SELECT
                (SELECT COUNT(*) FROM SesiBulanIni),
                (SELECT COUNT(*) FROM SesiBulanIni WHERE status = 'Selesai'),
                (SELECT COUNT(*) FROM SesiBulanIni WHERE status = 'Dibatalkan'),
                (SELECT topik_nama FROM TopikPopuler);
        END;
        $$ LANGUAGE plpgsql;
`;

const getLaporanBulanan = async (bulan, tahun) => {
    try {
        const result = await db.query('SELECT * FROM fn_get_laporan_bulanan($1, $2)', [bulan, tahun]);
        return result.rows[0];
    } catch (error) {
        console.error('Error calling fn_get_laporan_bulanan:', error.message);
        throw error;
    }
};

const FunctionGetRekomendasiTopikDanKonselor = `
    CREATE OR REPLACE FUNCTION GetRekomendasiTopikDanKonselor(p_nrp CHAR(10))
    RETURNS TABLE (
        topik_id CHAR(4),
        topik_nama VARCHAR(100),
        jumlah_sesi_terkait BIGINT,
        konselor_rekomendasi_nik CHAR(16),
        konselor_rekomendasi_nama VARCHAR(100),
        konselor_rekomendasi_spesialisasi VARCHAR(100)
    ) AS $$
    BEGIN
        RETURN QUERY
        WITH MahasiswaTopikSeringDiulang AS (
            -- Temukan topik yang paling sering diambil oleh mahasiswa ini
            SELECT
                s.Topik_topik_id,
                COUNT(s.sesi_id) AS jumlah_sesi_topik
            FROM
                Sesi s
            WHERE
                s.mahasiswa_nrp = '5025231148' AND s.status = 'Completed'
            GROUP BY
                s.Topik_topik_id
            ORDER BY
                COUNT(s.sesi_id) DESC
            LIMIT 3 
        ),
        KonselorAhliPerTopik AS (
            -- Temukan konselor terbaik untuk setiap topik yang sering diulang
            SELECT DISTINCT ON (s.Topik_topik_id)
                s.Topik_topik_id,
                s.Konselor_NIK,
                k.nama AS konselor_nama,
                k.spesialisasi AS konselor_spesialisasi,
                COUNT(s.sesi_id) AS jumlah_sesi_ditangani_konselor
            FROM
                Sesi s
            JOIN
                Konselor k ON s.Konselor_NIK = k.NIK
            WHERE
                s.status = 'Selesai'
            GROUP BY
                s.Topik_topik_id, s.Konselor_NIK, k.nama, k.spesialisasi
            ORDER BY
                s.Topik_topik_id, COUNT(s.sesi_id) DESC -- Konselor dengan sesi terbanyak untuk topik tersebut
        )
        SELECT
            mtsd.Topik_topik_id AS topik_id,
            t.topik_nama,
            mtsd.jumlah_sesi_topik AS jumlah_sesi_terkait,
            kap.Konselor_NIK AS konselor_rekomendasi_nik,
            kap.konselor_nama AS konselor_rekomendasi_nama,
            kap.konselor_spesialisasi AS konselor_rekomendasi_spesialisasi
        FROM
            MahasiswaTopikSeringDiulang mtsd
        JOIN
            Topik t ON mtsd.Topik_topik_id = t.topik_id
        LEFT JOIN
            KonselorAhliPerTopik kap ON mtsd.Topik_topik_id = kap.Topik_topik_id
        ORDER BY
            mtsd.jumlah_sesi_topik DESC;
    END;
    $$ LANGUAGE plpgsql;
`;

const getRekomendasiTopikDanKonselor = async (nrp) => {
    try {
        const result = await db.query('SELECT * FROM GetRekomendasiTopikDanKonselor($1)', [nrp]);
        return result.rows;
    } catch (error) {
        console.error('Error calling GetRekomendasiTopikDanKonselor:', error.message);
        throw error;
    }
};

const FunctionRekapStatus = `
    CREATE OR REPLACE FUNCTION get_session_status_distribution()
    RETURNS TABLE (
        status_sesi TEXT,
        jumlah_sesi BIGINT,
        persentase_dari_total NUMERIC(5,2)
    ) AS $$
    DECLARE
        total_all_sessions BIGINT;
    BEGIN
        SELECT COUNT(sesi_id) INTO total_all_sessions FROM Sesi;

        IF total_all_sessions > 0 THEN
            RETURN QUERY
            SELECT
                s.status AS status_sesi,
                COUNT(s.sesi_id) AS jumlah_sesi,
                (COUNT(s.sesi_id)::NUMERIC * 100 / total_all_sessions)::NUMERIC(5,2) AS persentase_dari_total
            FROM Sesi s
            GROUP BY s.status
            ORDER BY jumlah_sesi DESC;
        ELSE
            RETURN;
        END IF;
    END;
    $$ LANGUAGE plpgsql;
`;

const createRekapStatusFunction = async () => {
    try {
        console.log('Creating session status distribution function...');
        await db.query(FunctionRekapStatus);
        console.log('Function get_session_status_distribution created/updated successfully.');
    } catch (err) {
        console.error('Error creating session status distribution function:', err.message);
        throw err;
    }
};

const getRekapStatusFunction = async () => {
    try {
        const result = await db.query('SELECT * FROM get_session_status_distribution()');
        return result.rows;
    } catch (error) {
        console.error('Error calling get_session_status_distribution:', error.message);
        throw error;
    }
}

const ProcedureTransferSesiKonselor = `
    CREATE OR REPLACE PROCEDURE transfer_sesi_konselor(
        p_sesi_id VARCHAR(255),
        p_konselor_nik_baru VARCHAR(255)
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
        current_konselor_nik VARCHAR(255);
        sesi_status TEXT;
        topik_sesi_id VARCHAR(255);
        mahasiswa_sesi_nrp VARCHAR(255);
        konselor_baru_ada BOOLEAN;
        keahlian_sesuai BOOLEAN;
        original_tanggal DATE;
    BEGIN
        SELECT Konselor_NIK, status, Topik_topik_id, Mahasiswa_NRP, tanggal
        INTO current_konselor_nik, sesi_status, topik_sesi_id, mahasiswa_sesi_nrp, original_tanggal
        FROM Sesi
        WHERE sesi_id = p_sesi_id;

        IF current_konselor_nik IS NULL THEN
            RAISE EXCEPTION 'Sesi dengan ID %s tidak ditemukan.', p_sesi_id;
        END IF;

        SELECT EXISTS (SELECT 1 FROM Konselor WHERE NIK = p_konselor_nik_baru)
        INTO konselor_baru_ada;

        IF NOT konselor_baru_ada THEN
            RAISE EXCEPTION 'Konselor baru dengan NIK %s tidak ditemukan.', p_konselor_nik_baru;
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM Konselor_Topik
            WHERE Konselor_NIK = p_konselor_nik_baru
            AND Topik_topik_id = topik_sesi_id
        ) INTO keahlian_sesuai;

        IF NOT keahlian_sesuai THEN
            RAISE EXCEPTION 'Konselor baru dengan NIK %s tidak memiliki keahlian untuk topik sesi ini.', p_konselor_nik_baru;
        END IF;

        IF sesi_status IN ('Completed', 'Cancelled') THEN
            RAISE EXCEPTION 'Sesi dengan ID %s tidak dapat ditransfer karena statusnya sudah %s.', p_sesi_id, sesi_status;
        END IF;

        UPDATE Sesi
        SET
            Konselor_NIK = p_konselor_nik_baru,
            tanggal = original_tanggal,
            catatan = COALESCE(catatan, '') || E'\n-- Ditransfer dari ' || current_konselor_nik || ' ke ' || p_konselor_nik_baru || ' pada ' || NOW() || ' --'
        WHERE sesi_id = p_sesi_id;

        RAISE NOTICE 'Sesi %s berhasil ditransfer dari %s ke %s.', p_sesi_id, current_konselor_nik, p_konselor_nik_baru;
    END;
    $$;
`;

const createTransferSesiKonselorProcedure = async () => {
    try {
        console.log('Creating transfer session procedure...');
        await db.query(ProcedureTransferSesiKonselor);
        console.log('Procedure transfer_sesi_konselor created/updated successfully.');
    } catch (err) {
        console.error('Error creating transfer session procedure:', err.message);
        throw err;
    }
};

const createFunctions = async () => {
    try {
        console.log('Creating database function...');
        await db.query(FunctionGetSesiBulanan);
        console.log('Function FunctionGetSesiBulanan created/updated successfully.');
        await db.query(FunctionGetRekomendasiTopikDanKonselor);
        console.log('Function GetRekomendasiTopikDanKonselor created/updated successfully.');
    } catch (err) {
        console.error('Error creating database functions:', err.message);
        throw err;
    }
};

module.exports = {
    createFunctions,
    getLaporanBulanan,
    getRekomendasiTopikDanKonselor,
    createRekapStatusFunction,
    getRekapStatusFunction,
    createTransferSesiKonselorProcedure
};