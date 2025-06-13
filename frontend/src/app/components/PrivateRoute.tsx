'use client';

import { useEffect, ReactNode } from 'react'; // Import ReactNode
import { useRouter, useSearchParams } from 'next/navigation'; // Import useSearchParams
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import MessageDisplay from './MessageDisplay';

interface PrivateRouteProps {
  children: ReactNode; // Tentukan tipe children
  allowedRoles: ('Admin' | 'Mahasiswa' | 'Konselor')[]; // Tentukan tipe array of literal
}

const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messageFromUrl = searchParams.get('message');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not authenticated, redirect to login
        router.push('/auth/login?message=Anda harus login untuk mengakses halaman ini.');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Authenticated but not authorized, redirect to unauthorized page or dashboard
        router.push('/auth/login?message=Anda tidak memiliki izin untuk mengakses halaman ini.');
      }
    }
  }, [user, loading, router, allowedRoles]);

  if (loading || !user || (allowedRoles && !allowedRoles.includes(user.role))) {
    // Show loading spinner while authenticating or if redirecting
    return (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-75 flex items-center justify-center z-50">
            <LoadingSpinner />
            <div className="mt-4 absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-10">
                {!user && messageFromUrl ? (
                    <MessageDisplay message={messageFromUrl} type="info" />
                ) : (user && !allowedRoles.includes(user.role) && messageFromUrl) ? (
                    <MessageDisplay message={messageFromUrl} type="error" />
                ) : null}
                {/* Fallback messages if no message from URL */}
                {!user && !messageFromUrl && (
                    <MessageDisplay message="Mengalihkan ke halaman login..." type="info" />
                )}
                {user && !allowedRoles.includes(user.role) && !messageFromUrl && (
                    <MessageDisplay message="Anda tidak memiliki izin. Mengalihkan..." type="error" />
                )}
            </div>
        </div>
    );
  }

  // If authenticated and authorized, render children
  return <>{children}</>;
};

export default PrivateRoute;