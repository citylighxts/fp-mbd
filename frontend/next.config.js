/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Tambahkan ini jika Anda berencana untuk deployment standalone
  // Anda dapat menambahkan konfigurasi Next.js lainnya di sini
  // Misalnya, rewrites, headers, images, dll.
  // Untuk Next.js 14, trailingSlash sudah deprecated
  // images: {
  //   domains: ['example.com'], // Jika Anda menggunakan gambar eksternal
  // },
};

module.exports = nextConfig;
