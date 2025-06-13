'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PrivateRoute from '../components/PrivateRoute';
import AdminPanel from '../components/dashboard/AdminPanel'; // Import panel-panel peran
import MahasiswaPanel from '../components/dashboard/MahasiswaPanel';
import KonselorPanel from '../components/dashboard/KonselorPanel';

export default function DashboardPage() {
  const { user, loading } = useAuth(); // Ambil user dan loading dari AuthContext
  const router = useRouter();

  // Tampilkan loading spinner sampai user dimuat
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Gunakan PrivateRoute untuk memastikan pengguna sudah login dan memiliki peran yang diizinkan
  // Jika user null atau perannya tidak valid, PrivateRoute akan menangani redirect.
  // Jika user valid, children dari PrivateRoute akan dirender.
  return (
    <PrivateRoute allowedRoles={['Admin', 'Mahasiswa', 'Konselor']}>
      {user?.role === 'Admin' && <AdminPanel />}
      {user?.role === 'Mahasiswa' && <MahasiswaPanel />}
      {user?.role === 'Konselor' && <KonselorPanel />}
    </PrivateRoute>
  );
}