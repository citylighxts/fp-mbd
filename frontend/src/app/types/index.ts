export interface User {
  id: string;
  username: string;
  role: 'Admin' | 'Mahasiswa' | 'Konselor';
}

export interface Admin {
  admin_id: string;
  nama: string;
  username?: string; // from User table
  User_user_id: string;
}

export interface Mahasiswa {
  NRP: string;
  nama: string;
  departemen: string;
  kontak: string;
  username?: string; // from User table
  User_user_id: string;
}

export interface Konselor {
  NIK: string;
  nama: string;
  spesialisasi: string;
  kontak: string;
  username?: string; // from User table
  User_user_id: string;
  topik_nama?: string[]; // Array of topic names
}

export interface Topik {
  topik_id: string;
  topik_nama: string;
  Admin_admin_id?: string; // Optional, only if fetched with admin info
}

export interface Sesi {
  sesi_id: string;
  tanggal: string; // ISO string
  status: 'Requested' | 'Scheduled' | 'Completed' | 'Cancelled';
  catatan: string | null;
  Mahasiswa_NRP: string;
  Konselor_NIK: string;
  Admin_admin_id: string;
  Topik_topik_id: string;
  // Joined fields for display (optional as they come from JOINs)
  mahasiswa_nama?: string;
  mahasiswa_nrp?: string;
  mahasiswa_departemen?: string;
  konselor_nama?: string;
  konselor_nik?: string;
  konselor_spesialisasi?: string;
  topik_nama?: string;
  admin_nama?: string;
}
