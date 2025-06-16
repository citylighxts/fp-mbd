-- DDL

-- Tabel User berfungsi sebagai pusat otentikasi.
CREATE TABLE "User" (
    user_id CHAR(4) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(10) NOT NULL
);

-- Tabel Admin menyimpan data admin.
CREATE TABLE Admin (
    admin_id CHAR(4) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    User_user_id CHAR(4) NOT NULL UNIQUE,
    CONSTRAINT fk_admin_user
        FOREIGN KEY(User_user_id)
        REFERENCES "User"(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabel Mahasiswa menyimpan data mahasiswa.
CREATE TABLE Mahasiswa (
    NRP CHAR(10) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    departemen VARCHAR(30) NOT NULL,
    kontak VARCHAR(15) NOT NULL,
    User_user_id CHAR(4) NOT NULL UNIQUE,
    CONSTRAINT fk_mahasiswa_user
        FOREIGN KEY(User_user_id)
        REFERENCES "User"(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabel Konselor menyimpan data para konselor.
CREATE TABLE Konselor (
    NIK CHAR(16) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    spesialisasi VARCHAR(100) NOT NULL,
    kontak VARCHAR(15) NOT NULL,
    User_user_id CHAR(4) NOT NULL UNIQUE,
    CONSTRAINT fk_konselor_user
        FOREIGN KEY(User_user_id)
        REFERENCES "User"(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabel Topik menyimpan jenis topik yang tersedia untuk konseling.
CREATE TABLE Topik (
    topik_id CHAR(4) PRIMARY KEY,
    topik_nama VARCHAR(100) NOT NULL,
    Admin_admin_id CHAR(4) NOT NULL,
    CONSTRAINT fk_topik_admin
        FOREIGN KEY(Admin_admin_id)
        REFERENCES Admin(admin_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Tabel Konselor_Topik adalah tabel penghubung (junction table)
CREATE TABLE Konselor_Topik (
    Konselor_NIK CHAR(16) NOT NULL,
    Topik_topik_id CHAR(4) NOT NULL,
    PRIMARY KEY (Konselor_NIK, Topik_topik_id),
    CONSTRAINT fk_konselor_topik_konselor
        FOREIGN KEY(Konselor_NIK)
        REFERENCES Konselor(NIK)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_konselor_topik_topik
        FOREIGN KEY(Topik_topik_id)
        REFERENCES Topik(topik_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabel Sesi adalah tabel transaksi utama yang mencatat setiap sesi konseling.
CREATE TABLE Sesi (
    sesi_id CHAR(4) PRIMARY KEY,
    tanggal TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,
    catatan TEXT,
    Mahasiswa_NRP CHAR(10) NOT NULL,
    Konselor_NIK CHAR(16) NOT NULL,
    Admin_admin_id CHAR(4) NOT NULL,
    Topik_topik_id CHAR(4) NOT NULL,

    CONSTRAINT fk_sesi_mahasiswa
        FOREIGN KEY(Mahasiswa_NRP)
        REFERENCES Mahasiswa(NRP)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sesi_konselor
        FOREIGN KEY(Konselor_NIK)
        REFERENCES Konselor(NIK)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sesi_admin
        FOREIGN KEY(Admin_admin_id)
        REFERENCES Admin(admin_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sesi_topik
        FOREIGN KEY(Topik_topik_id)
        REFERENCES Topik(topik_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- DML

-- 1. Tabel "User" (Total: 55 Baris -> 5 Admin, 10 Konselor, 40 Mahasiswa)
INSERT INTO "User" (user_id, username, password, role) VALUES
-- Admin Users (5)
('U001', 'admin_eko', 'hashed_password_placeholder', 'admin'),
('U002', 'admin_sari', 'hashed_password_placeholder', 'admin'),
('U003', 'admin_jaya', 'hashed_password_placeholder', 'admin'),
('U004', 'admin_rini', 'hashed_password_placeholder', 'admin'),
('U005', 'admin_putra', 'hashed_password_placeholder', 'admin'),
-- Konselor Users (10)
('U006', 'konselor_budi', 'hashed_password_placeholder', 'konselor'),
('U007', 'konselor_dewi', 'hashed_password_placeholder', 'konselor'),
('U008', 'konselor_agung', 'hashed_password_placeholder', 'konselor'),
('U009', 'konselor_fitri', 'hashed_password_placeholder', 'konselor'),
('U010', 'konselor_hendra', 'hashed_password_placeholder', 'konselor'),
('U011', 'konselor_indah', 'hashed_password_placeholder', 'konselor'),
('U012', 'konselor_lukman', 'hashed_password_placeholder', 'konselor'),
('U013', 'konselor_maya', 'hashed_password_placeholder', 'konselor'),
('U014', 'konselor_nanda', 'hashed_password_placeholder', 'konselor'),
('U015', 'konselor_olivia', 'hashed_password_placeholder', 'konselor'),
-- Mahasiswa Users (40)
('U016', 'mhs_adi', 'hashed_password_placeholder', 'mahasiswa'),
('U017', 'mhs_bella', 'hashed_password_placeholder', 'mahasiswa'),
('U018', 'mhs_chandra', 'hashed_password_placeholder', 'mahasiswa'),
('U019', 'mhs_diana', 'hashed_password_placeholder', 'mahasiswa'),
('U020', 'mhs_erwin', 'hashed_password_placeholder', 'mahasiswa'),
('U021', 'mhs_farah', 'hashed_password_placeholder', 'mahasiswa'),
('U022', 'mhs_ganjar', 'hashed_password_placeholder', 'mahasiswa'),
('U023', 'mhs_hana', 'hashed_password_placeholder', 'mahasiswa'),
('U024', 'mhs_ivan', 'hashed_password_placeholder', 'mahasiswa'),
('U025', 'mhs_jenny', 'hashed_password_placeholder', 'mahasiswa'),
('U026', 'mhs_kiki', 'hashed_password_placeholder', 'mahasiswa'),
('U027', 'mhs_leo', 'hashed_password_placeholder', 'mahasiswa'),
('U028', 'mhs_mona', 'hashed_password_placeholder', 'mahasiswa'),
('U029', 'mhs_nino', 'hashed_password_placeholder', 'mahasiswa'),
('U030', 'mhs_oscar', 'hashed_password_placeholder', 'mahasiswa'),
('U031', 'mhs_putri', 'hashed_password_placeholder', 'mahasiswa'),
('U032', 'mhs_qori', 'hashed_password_placeholder', 'mahasiswa'),
('U033', 'mhs_rama', 'hashed_password_placeholder', 'mahasiswa'),
('U034', 'mhs_sinta', 'hashed_password_placeholder', 'mahasiswa'),
('U035', 'mhs_toni', 'hashed_password_placeholder', 'mahasiswa'),
('U036', 'mhs_ulia', 'hashed_password_placeholder', 'mahasiswa'),
('U037', 'mhs_vino', 'hashed_password_placeholder', 'mahasiswa'),
('U038', 'mhs_wulan', 'hashed_password_placeholder', 'mahasiswa'),
('U039', 'mhs_xena', 'hashed_password_placeholder', 'mahasiswa'),
('U040', 'mhs_yuda', 'hashed_password_placeholder', 'mahasiswa'),
('U041', 'mhs_zara', 'hashed_password_placeholder', 'mahasiswa'),
('U042', 'mhs_angga', 'hashed_password_placeholder', 'mahasiswa'),
('U043', 'mhs_bima', 'hashed_password_placeholder', 'mahasiswa'),
('U044', 'mhs_citra', 'hashed_password_placeholder', 'mahasiswa'),
('U045', 'mhs_doni', 'hashed_password_placeholder', 'mahasiswa'),
('U046', 'mhs_elsa', 'hashed_password_placeholder', 'mahasiswa'),
('U047', 'mhs_fajar', 'hashed_password_placeholder', 'mahasiswa'),
('U048', 'mhs_gina', 'hashed_password_placeholder', 'mahasiswa'),
('U049', 'mhs_hari', 'hashed_password_placeholder', 'mahasiswa'),
('U050', 'mhs_irma', 'hashed_password_placeholder', 'mahasiswa'),
('U051', 'mhs_jaka', 'hashed_password_placeholder', 'mahasiswa'),
('U052', 'mhs_karen', 'hashed_password_placeholder', 'mahasiswa'),
('U053', 'mhs_lisa', 'hashed_password_placeholder', 'mahasiswa'),
('U054', 'mhs_mira', 'hashed_password_placeholder', 'mahasiswa'),
('U055', 'mhs_nita', 'hashed_password_placeholder', 'mahasiswa');

-- 2. Tabel Admin (Total: 5 Baris, memenuhi min. 20 baris dari gabungan tabel master)
INSERT INTO Admin (admin_id, nama, User_user_id) VALUES
('A001', 'Eko Prasetyo', 'U001'),
('A002', 'Sari Hartati', 'U002'),
('A003', 'Jaya Wijaya', 'U003'),
('A004', 'Rini Anggraini', 'U004'),
('A005', 'Putra Santoso', 'U005');

-- 3. Tabel Konselor (Total: 10 Baris, memenuhi min. 20 baris dari gabungan tabel master)
INSERT INTO Konselor (NIK, nama, spesialisasi, kontak, User_user_id) VALUES
('3578012345670001', 'Dr. Budi Santoso, M.Psi.', 'Karir dan Pekerjaan', '081234567890', 'U006'),
('3578012345670002', 'Dewi Lestari, S.Psi.', 'Kesehatan Mental', '081234567891', 'U007'),
('3578012345670003', 'Agung Nugroho, M.Psi.', 'Masalah Akademik', '081234567892', 'U008'),
('3578012345670004', 'Fitriani Hapsari, S.Psi.', 'Hubungan Interpersonal', '081234567893', 'U009'),
('3578012345670005', 'Hendra Setiawan, M.Psi.', 'Pengembangan Diri', '081234567894', 'U010'),
('3578012345670006', 'Indah Permata, S.Psi.', 'Manajemen Stres dan Kecemasan', '081234567895', 'U011'),
('3578012345670007', 'Lukman Hakim, M.Psi.', 'Masalah Keluarga', '081234567896', 'U012'),
('3578012345670008', 'Maya Sari, S.Psi.', 'Karir dan Pekerjaan', '081234567897', 'U013'),
('3578012345670009', 'Nanda Kusuma, M.Psi.', 'Masalah Akademik', '081234567898', 'U014'),
('3578012345670010', 'Olivia Rahma, S.Psi.', 'Kesehatan Mental', '081234567899', 'U015');

-- 4. Tabel Mahasiswa (Total: 40 Baris, memenuhi min. 20 baris)
INSERT INTO Mahasiswa (NRP, nama, departemen, kontak, User_user_id) VALUES
('5025211001', 'Adi Nugraha', 'Teknik Informatika', '085712340001', 'U016'),
('5025211002', 'Bella Safira', 'Sistem Informasi', '085712340002', 'U017'),
('5026211003', 'Chandra Wijaya', 'Manajemen Bisnis', '085712340003', 'U018'),
('5027211004', 'Diana Putri', 'Akuntansi', '085712340004', 'U019'),
('5025211005', 'Erwin Prasetya', 'Teknik Informatika', '085712340005', 'U020'),
('5028211006', 'Farah Nabila', 'Ilmu Komunikasi', '085712340006', 'U021'),
('5029211007', 'Ganjar Aditama', 'Desain Komunikasi Visual', '085712340007', 'U022'),
('5030211008', 'Hana Malika', 'Teknik Elektro', '085712340008', 'U023'),
('5025211009', 'Ivan Gunawan', 'Teknik Informatika', '085712340009', 'U024'),
('5026211010', 'Jenny Anggraini', 'Sistem Informasi', '085712340010', 'U025'),
('5027211011', 'Kiki Maulana', 'Manajemen Bisnis', '085712340011', 'U026'),
('5028211012', 'Leo Firmansyah', 'Ilmu Komunikasi', '085712340012', 'U027'),
('5029211013', 'Mona Lestari', 'Desain Komunikasi Visual', '085712340013', 'U028'),
('5030211014', 'Nino Setiawan', 'Teknik Elektro', '085712340014', 'U029'),
('5025211015', 'Oscar Haris', 'Teknik Informatika', '085712340015', 'U030'),
('5026211016', 'Putri Amelia', 'Sistem Informasi', '085712340016', 'U031'),
('5027211017', 'Qori Ramadhan', 'Manajemen Bisnis', '085712340017', 'U032'),
('5028211018', 'Rama Dhani', 'Ilmu Komunikasi', '085712340018', 'U033'),
('5029211019', 'Sinta Dewi', 'Desain Komunikasi Visual', '085712340019', 'U034'),
('5030211020', 'Toni Saputra', 'Teknik Elektro', '085712340020', 'U035'),
('5025211021', 'Ulia Rahma', 'Teknik Informatika', '085712340021', 'U036'),
('5026211022', 'Vino Bastian', 'Sistem Informasi', '085712340022', 'U037'),
('5027211023', 'Wulan Sari', 'Manajemen Bisnis', '085712340023', 'U038'),
('5028211024', 'Xena Gabriella', 'Ilmu Komunikasi', '085712340024', 'U039'),
('5029211025', 'Yuda Pratama', 'Desain Komunikasi Visual', '085712340025', 'U040'),
('5030211026', 'Zara Adhisty', 'Teknik Elektro', '085712340026', 'U041'),
('5025211027', 'Angga Yunanda', 'Teknik Informatika', '085712340027', 'U042'),
('5026211028', 'Bima Sakti', 'Sistem Informasi', '085712340028', 'U043'),
('5027211029', 'Citra Kirana', 'Manajemen Bisnis', '085712340029', 'U044'),
('5028211030', 'Doni Salmanan', 'Ilmu Komunikasi', '085712340030', 'U045'),
('5029211031', 'Elsa Japasal', 'Desain Komunikasi Visual', '085712340031', 'U046'),
('5030211032', 'Fajar Alfian', 'Teknik Elektro', '085712340032', 'U047'),
('5025211033', 'Gina Meidina', 'Teknik Informatika', '085712340033', 'U048'),
('5026211034', 'Hari Santoso', 'Sistem Informasi', '085712340034', 'U049'),
('5027211035', 'Irma Suryani', 'Manajemen Bisnis', '085712340035', 'U050'),
('5028211036', 'Jaka Tarub', 'Ilmu Komunikasi', '085712340036', 'U051'),
('5029211037', 'Karenina', 'Desain Komunikasi Visual', '085712340037', 'U052'),
('5030211038', 'Lisa Manoban', 'Teknik Elektro', '085712340038', 'U053'),
('5025211039', 'Mira Hayati', 'Teknik Informatika', '085712340039', 'U054'),
('5026211040', 'Nita Gunawan', 'Sistem Informasi', '085712340040', 'U055');

-- 5. Tabel Topik (Total: 20 Baris)
INSERT INTO Topik (topik_id, topik_nama, Admin_admin_id) VALUES
('T001', 'Manajemen Stres Ujian Akhir', 'A001'),
('T002', 'Prokrastinasi Akademik', 'A002'),
('T003', 'Strategi Belajar Efektif', 'A003'),
('T004', 'Persiapan Karir dan Wawancara Kerja', 'A004'),
('T005', 'Pembuatan CV dan Portofolio', 'A005'),
('T006', 'Konflik dengan Teman atau Pasangan', 'A001'),
('T007', 'Mengatasi Rasa Cemas dan Panik', 'A002'),
('T008', 'Quarter-Life Crisis', 'A003'),
('T009', 'Meningkatkan Kepercayaan Diri', 'A004'),
('T010', 'Manajemen Keuangan Pribadi', 'A005'),
('T011', 'Adaptasi di Lingkungan Kampus', 'A001'),
('T012', 'Masalah Keluarga', 'A002'),
('T013', 'Burnout Akademik', 'A003'),
('T014', 'Menentukan Pilihan Karir', 'A004'),
('T015', 'Kecanduan Media Sosial', 'A005'),
('T016', 'Mengatasi Kesepian', 'A001'),
('T017', 'Public Speaking Anxiety', 'A002'),
('T018', 'Membangun Kebiasaan Positif', 'A003'),
('T019', 'Pemilihan Mata Kuliah dan Rencana Studi', 'A004'),
('T020', 'Teknik Relaksasi dan Mindfulness', 'A005');

-- 6. Tabel Konselor_Topik (Total: 29 Baris)
INSERT INTO Konselor_Topik (Konselor_NIK, Topik_topik_id) VALUES
('3578012345670001', 'T004'), ('3578012345670001', 'T005'), ('3578012345670001', 'T014'),
('3578012345670002', 'T007'), ('3578012345670002', 'T015'), ('3578012345670002', 'T016'),
('3578012345670003', 'T002'), ('3578012345670003', 'T003'), ('3578012345670003', 'T019'),
('3578012345670004', 'T006'), ('3578012345670004', 'T011'), ('3578012345670004', 'T017'),
('3578012345670005', 'T008'), ('3578012345670005', 'T009'), ('3578012345670005', 'T018'),
('3578012345670006', 'T001'), ('3578012345670006', 'T007'), ('3578012345670006', 'T020'),
('3578012345670007', 'T012'), ('3578012345670007', 'T006'),
('3578012345670008', 'T004'), ('3578012345670008', 'T005'), ('3578012345670008', 'T014'),
('3578012345670009', 'T002'), ('3578012345670009', 'T013'), ('3578012345670009', 'T019'),
('3578012345670010', 'T007'), ('3578012345670010', 'T016'), ('3578012345670010', 'T020');

-- 7. Tabel Sesi (Total: 65 Baris)
INSERT INTO Sesi (sesi_id, tanggal, status, catatan, Mahasiswa_NRP, Konselor_NIK, Admin_admin_id, Topik_topik_id) VALUES
('S001', '2024-10-01 10:00:00', 'Selesai', 'Mahasiswa menunjukkan kemajuan dalam mengatasi prokrastinasi.', '5025211001', '3578012345670003', 'A001', 'T002'),
('S002', '2024-10-01 11:00:00', 'Selesai', 'Sesi awal untuk pembuatan CV.', '5025211002', '3578012345670001', 'A002', 'T005'),
('S003', '2024-10-02 13:00:00', 'Selesai', 'Membahas teknik relaksasi untuk mengatasi cemas.', '5026211003', '3578012345670002', 'A003', 'T007'),
('S004', '2024-10-02 14:00:00', 'Dijadwalkan', NULL, '5027211004', '3578012345670004', 'A004', 'T006'),
('S005', '2024-10-03 09:00:00', 'Selesai', 'Mahasiswa merasa lebih percaya diri.', '5025211005', '3578012345670005', 'A005', 'T009'),
('S006', '2024-10-03 10:00:00', 'Dibatalkan', 'Dibatalkan oleh mahasiswa.', '5028211006', '3578012345670006', 'A001', 'T001'),
('S007', '2024-10-04 11:00:00', 'Selesai', 'Diskusi mengenai masalah keluarga yang mempengaruhi studi.', '5029211007', '3578012345670007', 'A002', 'T012'),
('S008', '2024-10-04 13:00:00', 'Selesai', 'Follow-up sesi CV, portofolio sudah lebih baik.', '5025211009', '3578012345670008', 'A003', 'T005'),
('S009', '2024-10-05 14:00:00', 'Selesai', 'Mahasiswa mulai menerapkan strategi belajar baru.', '5026211010', '3578012345670009', 'A004', 'T003'),
('S010', '2024-10-05 15:00:00', 'Selesai', 'Latihan mindfulness.', '5027211011', '3578012345670010', 'A005', 'T020'),
('S011', '2024-11-06 10:00:00', 'Selesai', 'Mahasiswa berhasil mengurangi waktu di media sosial.', '5028211012', '3578012345670002', 'A001', 'T015'),
('S012', '2024-11-06 11:00:00', 'Selesai', 'Review CV untuk persiapan magang.', '5029211013', '3578012345670001', 'A002', 'T005'),
('S013', '2024-11-07 13:00:00', 'Selesai', 'Sesi lanjutan prokrastinasi, progres baik.', '5025211001', '3578012345670003', 'A003', 'T002'),
('S014', '2024-11-07 14:00:00', 'Dijadwalkan', NULL, '5030211014', '3578012345670004', 'A004', 'T011'),
('S015', '2024-11-08 09:00:00', 'Selesai', 'Diskusi tentang quarter-life crisis.', '5025211015', '3578012345670005', 'A005', 'T008'),
('S016', '2024-11-08 10:00:00', 'Selesai', 'Mengatasi stres menjelang UAS.', '5026211016', '3578012345670006', 'A001', 'T001'),
('S017', '2024-11-09 11:00:00', 'Dibatalkan', 'Konselor berhalangan.', '5027211017', '3578012345670007', 'A002', 'T012'),
('S018', '2024-11-09 13:00:00', 'Selesai', 'Simulasi wawancara kerja.', '5028211018', '3578012345670008', 'A003', 'T004'),
('S019', '2024-11-10 14:00:00', 'Selesai', 'Membahas burnout akademik dan solusinya.', '5029211019', '3578012345670009', 'A004', 'T013'),
('S020', '2024-11-10 15:00:00', 'Selesai', 'Membantu mahasiswa mengatasi rasa kesepian.', '5030211020', '3578012345670010', 'A005', 'T016'),
('S021', '2025-01-11 10:00:00', 'Selesai', 'Evaluasi strategi belajar, IPK meningkat.', '5025211021', '3578012345670003', 'A001', 'T003'),
('S022', '2025-01-11 11:00:00', 'Selesai', 'Membahas pilihan karir setelah lulus.', '5026211022', '3578012345670001', 'A002', 'T014'),
('S023', '2025-01-12 13:00:00', 'Selesai', 'Latihan pernapasan untuk mengatasi panik.', '5027211023', '3578012345670002', 'A003', 'T007'),
('S024', '2025-01-12 14:00:00', 'Dijadwalkan', NULL, '5028211024', '3578012345670004', 'A004', 'T017'),
('S025', '2025-01-13 09:00:00', 'Selesai', 'Membangun kebiasaan membaca buku.', '5029211025', '3578012345670005', 'A005', 'T018'),
('S026', '2025-01-13 10:00:00', 'Selesai', 'Diskusi manajemen stres.', '5030211026', '3578012345670006', 'A001', 'T001'),
('S027', '2025-01-14 11:00:00', 'Selesai', 'Menangani konflik dalam keluarga.', '5025211027', '3578012345670007', 'A002', 'T012'),
('S028', '2025-01-14 13:00:00', 'Selesai', 'Praktik wawancara lanjutan.', '5026211028', '3578012345670008', 'A003', 'T004'),
('S029', '2025-01-15 14:00:00', 'Selesai', 'Membantu menyusun rencana studi semester depan.', '5027211029', '3578012345670009', 'A004', 'T019'),
('S030', '2025-01-15 15:00:00', 'Selesai', 'Sesi relaksasi dan mindfulness.', '5028211030', '3578012345670010', 'A005', 'T020'),
('S031', '2025-02-16 10:00:00', 'Selesai', 'Mengatasi kecemasan sosial di kelas.', '5029211031', '3578012345670002', 'A001', 'T007'),
('S032', '2025-02-16 11:00:00', 'Selesai', 'Konsultasi portofolio desain.', '5030211032', '3578012345670001', 'A002', 'T005'),
('S033', '2025-02-17 13:00:00', 'Dijadwalkan', NULL, '5025211033', '3578012345670003', 'A003', 'T002'),
('S034', '2025-02-17 14:00:00', 'Selesai', 'Membantu mahasiswa beradaptasi dengan teman baru.', '5026211034', '3578012345670004', 'A004', 'T011'),
('S035', '2025-02-18 09:00:00', 'Selesai', 'Membangun kepercayaan diri untuk presentasi.', '5027211035', '3578012345670005', 'A005', 'T009'),
('S036', '2025-02-18 10:00:00', 'Selesai', 'Manajemen stres karena tugas menumpuk.', '5028211036', '3578012345670006', 'A001', 'T001'),
('S037', '2025-02-19 11:00:00', 'Selesai', 'Mediasi konflik keluarga.', '5029211037', '3578012345670007', 'A002', 'T012'),
('S038', '2025-02-19 13:00:00', 'Dibatalkan', 'Mahasiswa sakit.', '5030211038', '3578012345670008', 'A003', 'T014'),
('S039', '2025-02-20 14:00:00', 'Selesai', 'Diskusi rencana studi dan pemilihan mata kuliah.', '5025211039', '3578012345670009', 'A004', 'T019'),
('S040', '2025-02-20 15:00:00', 'Selesai', 'Mengatasi cemas dan overthinking.', '5026211040', '3578012345670010', 'A005', 'T007'),
('S041', '2025-03-21 10:00:00', 'Selesai', 'Sesi lanjutan prokrastinasi, sudah ada perbaikan.', '5025211001', '3578012345670003', 'A001', 'T002'),
('S042', '2025-03-21 11:00:00', 'Selesai', 'Review CV final.', '5025211002', '3578012345670001', 'A002', 'T005'),
('S043', '2025-03-22 13:00:00', 'Selesai', 'Latihan mindfulness rutin.', '5026211003', '3578012345670002', 'A003', 'T020'),
('S044', '2025-03-22 14:00:00', 'Dijadwalkan', NULL, '5027211004', '3578012345670004', 'A004', 'T006'),
('S045', '2025-03-23 09:00:00', 'Selesai', 'Mengatasi quarter life crisis.', '5025211005', '3578012345670005', 'A005', 'T008'),
('S046', '2025-03-23 10:00:00', 'Selesai', 'Sesi tentang stres ujian tengah semester.', '5028211006', '3578012345670006', 'A001', 'T001'),
('S047', '2025-03-24 11:00:00', 'Selesai', 'Diskusi masalah komunikasi dengan orang tua.', '5029211007', '3578012345670007', 'A002', 'T012'),
('S048', '2025-03-24 13:00:00', 'Selesai', 'Latihan wawancara HRD.', '5025211009', '3578012345670008', 'A003', 'T004'),
('S049', '2025-03-25 14:00:00', 'Selesai', 'Mengatasi burnout dan mengembalikan motivasi.', '5026211010', '3578012345670009', 'A004', 'T013'),
('S050', '2025-03-25 15:00:00', 'Selesai', 'Membantu mahasiswa yang merasa kesepian di perantauan.', '5027211011', '3578012345670010', 'A005', 'T016'),
('S051', '2025-04-26 10:00:00', 'Selesai', 'Detoks media sosial.', '5028211012', '3578012345670002', 'A001', 'T015'),
('S052', '2025-04-26 11:00:00', 'Selesai', 'Mencari jalur karir yang sesuai passion.', '5029211013', '3578012345670001', 'A002', 'T014'),
('S053', '2025-04-27 13:00:00', 'Selesai', 'Sesi evaluasi setelah ujian.', '5025211001', '3578012345670003', 'A003', 'T003'),
('S054', '2025-04-27 14:00:00', 'Selesai', 'Latihan presentasi untuk tugas akhir.', '5030211014', '3578012345670004', 'A004', 'T017'),
('S055', '2025-04-28 09:00:00', 'Selesai', 'Membicarakan rencana masa depan.', '5025211015', '3578012345670005', 'A005', 'T008'),
('S056', '2025-04-28 10:00:00', 'Selesai', 'Sesi relaksasi.', '5026211016', '3578012345670006', 'A001', 'T020'),
('S057', '2025-04-29 11:00:00', 'Dibatalkan', 'Jadwal bentrok.', '5027211017', '3578012345670007', 'A002', 'T012'),
('S058', '2025-04-29 13:00:00', 'Selesai', 'Finalisasi CV dan surat lamaran.', '5028211018', '3578012345670008', 'A003', 'T005'),
('S059', '2025-04-30 14:00:00', 'Selesai', 'Review rencana studi.', '5029211019', '3578012345670009', 'A004', 'T019'),
('S060', '2025-04-30 15:00:00', 'Selesai', 'Sesi penutup, mahasiswa merasa jauh lebih baik.', '5030211020', '3578012345670010', 'A005', 'T016'),
('S061', '2025-05-01 09:00:00', 'Dijadwalkan', NULL, '5025211039', '3578012345670001', 'A001', 'T004'),
('S062', '2025-05-01 10:00:00', 'Dijadwalkan', NULL, '5026211040', '3578012345670002', 'A002', 'T007'),
('S063', '2025-05-02 11:00:00', 'Dijadwalkan', NULL, '5027211029', '3578012345670003', 'A003', 'T002'),
('S064', '2025-05-02 13:00:00', 'Dijadwalkan', NULL, '5028211030', '3578012345670004', 'A004', 'T006'),
('S065', '2025-05-03 14:00:00', 'Dijadwalkan', NULL, '5029211031', '3578012345670005', 'A005', 'T009');