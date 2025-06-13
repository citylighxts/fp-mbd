'use client';

import { useState, FormEvent } from 'react'; // Import FormEvent
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import MessageDisplay from '../../components/MessageDisplay';

export default function LoginPage() {
  const [username, setUsername] = useState<string>(''); // Tentukan tipe string
  const [password, setPassword] = useState<string>(''); // Tentukan tipe string
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>(''); // Tentukan tipe literal
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => { // Gunakan FormEvent
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      await login(username, password);
      // Redirection handled by AuthContext or main page
    } catch (error: any) { // Gunakan any untuk menangkap error yang tidak diketahui
      console.error('Login error:', error);
      setMessage(error.message || 'Login gagal. Periksa kembali kredensial Anda.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-100 p-4">
      <div className="card w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-primary mb-6">Masuk ke myITS Mental Health</h1>
        {message && <MessageDisplay message={message} type={messageType} />}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
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
      </div>
    </div>
  );
}