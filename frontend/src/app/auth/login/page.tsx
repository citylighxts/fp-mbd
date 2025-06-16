'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import MessageDisplay from '../../components/MessageDisplay';

export default function AuthPage() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false); // State untuk mode register

  // State untuk form register
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    role: '', // 'Mahasiswa', 'Konselor', 'Admin'
    nama: '',
    departemen: '', // Untuk Mahasiswa
    kontak: '',     // Untuk Mahasiswa & Konselor
    spesialisasi: '', // Untuk Konselor
    NRP: '',        // Untuk Mahasiswa
    NIK: '',         // Untuk Konselor
  });

  const router = useRouter();
  const { login } = useAuth(); // Fungsi login dari AuthContext

  // Handle perubahan input untuk form register
  const handleRegisterFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  };

  // Fungsi untuk submit form login
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      await login(username, password);
      // Redirection handled by AuthContext
    } catch (error: any) {
      console.error('Login error:', error);
      setMessage(error.message || 'Login gagal. Periksa kembali kredensial Anda.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk submit form register
  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      // Panggil endpoint register di backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Pendaftaran berhasil! Silakan login.');
        setMessageType('success');
        setIsRegisterMode(false); // Kembali ke mode login
        // Reset form register
        setRegisterForm({
            username: '', password: '', role: '', nama: '', departemen: '',
            kontak: '', spesialisasi: '', NRP: '', NIK: '',
        });
        setUsername(''); // Pre-fill username di form login
        setPassword('');
      } else {
        setMessage(data.message || 'Pendaftaran gagal.');
        setMessageType('error');
      }
    } catch (error: any) {
      console.error('Register error:', error);
      setMessage('Terjadi kesalahan jaringan atau server.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-100 p-4">
      <div className="card w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-primary mb-6">
          {isRegisterMode ? 'Daftar Akun Baru' : 'Masuk ke myITS Mental Health'}
        </h1>
        {message && messageType && <MessageDisplay message={message} type={messageType} />}

        {/* Form Login */}
        {!isRegisterMode && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username">Username:</label>
              <input
                type="text"
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="login-password">Password:</label>
              <input
                type="password"
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full py-3 text-lg font-semibold flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memuat...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        )}

        {/* Form Register */}
        {isRegisterMode && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-username">Username:</label>
              <input
                type="text"
                id="register-username"
                name="username"
                value={registerForm.username}
                onChange={handleRegisterFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="register-password">Password:</label>
              <input
                type="password"
                id="register-password"
                name="password"
                value={registerForm.password}
                onChange={handleRegisterFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="register-role">Peran:</label>
              <select
                id="register-role"
                name="role"
                value={registerForm.role}
                onChange={handleRegisterFormChange}
                required
              >
                <option value="">Pilih Peran</option>
                <option value="Mahasiswa">Mahasiswa</option>
                <option value="Konselor">Konselor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="register-nama">Nama Lengkap:</label>
              <input
                type="text"
                id="register-nama"
                name="nama"
                value={registerForm.nama}
                onChange={handleRegisterFormChange}
                required
              />
            </div>

            {/* Field kondisional berdasarkan peran */}
            {registerForm.role === 'Mahasiswa' && (
              <>
                <div>
                  <label htmlFor="register-nrp">NRP:</label>
                  <input
                    type="text"
                    id="register-nrp"
                    name="NRP"
                    value={registerForm.NRP}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-departemen">Departemen:</label>
                  <input
                    type="text"
                    id="register-departemen"
                    name="departemen"
                    value={registerForm.departemen}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-kontak-mhs">Kontak (Mahasiswa):</label>
                  <input
                    type="text"
                    id="register-kontak-mhs"
                    name="kontak"
                    value={registerForm.kontak}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
              </>
            )}

            {registerForm.role === 'Konselor' && (
              <>
                <div>
                  <label htmlFor="register-nik">NIK:</label>
                  <input
                    type="text"
                    id="register-nik"
                    name="NIK"
                    value={registerForm.NIK}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-spesialisasi">Spesialisasi:</label>
                  <input
                    type="text"
                    id="register-spesialisasi"
                    name="spesialisasi"
                    value={registerForm.spesialisasi}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-kontak-konselor">Kontak (Konselor):</label>
                  <input
                    type="text"
                    id="register-kontak-konselor"
                    name="kontak"
                    value={registerForm.kontak}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
              </>
            )}
            {/* Untuk Admin, hanya username, password, dan nama yang diperlukan, yang sudah ada di atas */}

            <button
              type="submit"
              className="btn-primary w-full py-3 text-lg font-semibold flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mendaftar...
                </>
              ) : (
                'Daftar'
              )}
            </button>
          </form>
        )}

        {/* Tombol untuk beralih mode */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegisterMode(prev => !prev);
              setMessage(''); // Hapus pesan saat beralih mode
              setMessageType('');
              setUsername(''); // Reset input saat beralih
              setPassword('');
              setRegisterForm({ // Reset form register saat beralih
                  username: '', password: '', role: '', nama: '', departemen: '',
                  kontak: '', spesialisasi: '', NRP: '', NIK: '',
              });
            }}
            className="text-primary hover:underline"
          >
            {isRegisterMode ? 'Sudah punya akun? Login di sini.' : 'Belum punya akun? Daftar di sini.'}
          </button>
        </div>
      </div>
    </div>
  );
}
