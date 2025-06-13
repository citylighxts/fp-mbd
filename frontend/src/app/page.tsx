'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/LoadingSpinner';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Jika belum login, arahkan ke halaman login
        router.push('/auth/login');
      } else {
        // Jika sudah login, arahkan ke halaman dashboard tunggal
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="text-center p-8">
      <h1 className="text-3xl font-bold text-gray-800">Memuat aplikasi...</h1>
      <p className="text-gray-600 mt-2">Anda akan segera diarahkan.</p>
    </div>
  );
}