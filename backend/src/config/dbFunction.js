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

const createFunctions = async () => {
    try {
        console.log('Creating database function...');
        await db.query(FunctionGetSesiBulanan);
        console.log('Function FunctionGetSesiBulanan created/updated successfully.');
    } catch (err) {
        console.error('Error creating database functions:', err.message);
        throw err;
    }
};

const getLaporanBulanan = async (bulan, tahun) => {
    try {
        const result = await db.query('SELECT * FROM fn_get_laporan_bulanan($1, $2)', [bulan, tahun]);
        return result.rows[0];
    } catch (error) {
        console.error('Error calling fn_get_laporan_bulanan:', error.message);
        throw error;
    }
};


module.exports = {
    createFunctions,
    getLaporanBulanan
};