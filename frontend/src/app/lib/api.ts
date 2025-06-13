import axios from 'axios';
import Cookies from 'js-cookie';

// Buat instance Axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api', // Ganti dengan URL backend Anda
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor request untuk menambahkan token JWT
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor response untuk menangani error (misalnya token kedaluwarsa)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Anda bisa menambahkan logika penanganan error global di sini
    // Contoh: jika status 401 atau 403, arahkan ke halaman login
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Ini akan ditangani oleh AuthContext di useEffect, jadi tidak perlu redirect di sini
      // console.log('Unauthorized or token expired, handled by AuthContext.');
    }
    return Promise.reject(error);
  }
);

export default api;