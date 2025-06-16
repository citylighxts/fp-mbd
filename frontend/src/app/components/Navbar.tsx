'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { FaSignOutAlt, FaUserCircle, FaHome } from 'react-icons/fa';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <nav className="bg-primary p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-2xl font-bold flex items-center gap-2">
            <FaHome /> myITS Mental Health
        </Link>
        <div className="flex items-center space-x-4">
          {!loading && user && (
            <>
              <span className="text-white text-md flex items-center gap-1">
                <FaUserCircle /> Halo, {user.username} ({user.role})
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition duration-200 flex items-center gap-2"
              >
                <FaSignOutAlt /> Keluar
              </button>
            </>
          )}
          {!loading && !user && (
            <Link href="/auth/login" className="bg-white text-primary py-2 px-4 rounded-md hover:bg-gray-100 transition duration-200">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}