// backend/src/config/dbSetup.js

const db = require('./db'); 

const createTriggerFunctionSQL = `
    CREATE OR REPLACE FUNCTION fn_kapitalisasi_nama()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.nama := INITCAP(NEW.nama);
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
`;

const createAdminTriggerSQL = `
    CREATE TRIGGER tg_kapitalisasi_nama_admin
    BEFORE INSERT OR UPDATE ON Admin
    FOR EACH ROW
    EXECUTE FUNCTION fn_kapitalisasi_nama();
`;

const createMahasiswaTriggerSQL = `
    CREATE TRIGGER tg_kapitalisasi_nama_mahasiswa
    BEFORE INSERT OR UPDATE ON Mahasiswa
    FOR EACH ROW
    EXECUTE FUNCTION fn_kapitalisasi_nama();
`;

const createKonselorTriggerSQL = `
    CREATE TRIGGER tg_kapitalisasi_nama_konselor
    BEFORE INSERT OR UPDATE ON Konselor
    FOR EACH ROW
    EXECUTE FUNCTION fn_kapitalisasi_nama();
`;

const createJadwalBentrokFunctionSQL = `
    CREATE OR REPLACE FUNCTION cek_jadwal_bentrok_konselor()
    RETURNS TRIGGER AS $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM sesi
            WHERE konselor_nik = NEW.konselor_nik
            AND tanggal = NEW.tanggal
            AND sesi_id <> NEW.sesi_id
        ) THEN
            RAISE EXCEPTION 'Jadwal bentrok! Konselor sudah memiliki sesi lain pada waktu yang sama.';
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
`;

const createJadwalBentrokTriggerSQL = `
    DROP TRIGGER IF EXISTS tg_cek_jadwal_bentrok_konselor ON sesi;
    CREATE TRIGGER tg_cek_jadwal_bentrok_konselor
    BEFORE INSERT OR UPDATE ON sesi
    FOR EACH ROW
    EXECUTE FUNCTION cek_jadwal_bentrok_konselor();
`;

const initializeTriggers = async () => {
    const client = await db.pool.connect();
    try {
        console.log('Mencoba membuat fungsi trigger...');
        await client.query(createTriggerFunctionSQL);
        console.log('Fungsi "fn_kapitalisasi_nama" berhasil dibuat/diperbarui.');

        console.log('Mencoba membuat trigger untuk Admin...');
        await client.query('DROP TRIGGER IF EXISTS tg_kapitalisasi_nama_admin ON Admin;');
        await client.query(createAdminTriggerSQL);
        console.log('Trigger untuk Admin berhasil dibuat.');

        console.log('Mencoba membuat trigger untuk Mahasiswa...');
        await client.query('DROP TRIGGER IF EXISTS tg_kapitalisasi_nama_mahasiswa ON Mahasiswa;');
        await client.query(createMahasiswaTriggerSQL);
        console.log('Trigger untuk Mahasiswa berhasil dibuat.');
        
        console.log('Mencoba membuat trigger untuk Konselor...');
        await client.query('DROP TRIGGER IF EXISTS tg_kapitalisasi_nama_konselor ON Konselor;');
        await client.query(createKonselorTriggerSQL);
        console.log('Trigger untuk Konselor berhasil dibuat.');

        console.log('Mencoba membuat fungsi "cek_jadwal_bentrok_konselor"...');
        await client.query(createJadwalBentrokFunctionSQL);
        console.log('Fungsi cek jadwal berhasil dibuat.');

        console.log('Mencoba membuat trigger untuk cek jadwal bentrok...');
        await client.query(createJadwalBentrokTriggerSQL);
        console.log('Trigger cek jadwal bentrok berhasil dibuat.');
        
        console.log('Semua trigger berhasil diinisialisasi.');
    } catch (error) {
        console.error('Gagal menginisialisasi trigger:', error.message);
    } finally {
        client.release();
    }
};

module.exports = { initializeTriggers };
