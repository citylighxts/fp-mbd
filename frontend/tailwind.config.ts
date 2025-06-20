import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Menggunakan font Inter
      },
      colors: {
        primary: '#4F46E5', // Contoh warna primer
        secondary: '#6D28D9', // Contoh warna sekunder
      },
    },
  },
  plugins: [],
};
export default config;