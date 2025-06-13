import { Inter } from "next/font/google";
import "./styles/globals.css";
// import { AuthProvider } from '../context/AuthContext';
// import Navbar from '../components/Navbar';
import type { Metadata } from 'next'; // Impor Metadata type

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = { // Gunakan Metadata type
  title: "myITS Mental Health",
  description: "Portal digital untuk kesejahteraan mental sivitas akademika ITS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 flex flex-col min-h-screen`}>
        {/* <AuthProvider>
          <Navbar /> */}
          <main className="flex-grow container mx-auto p-4">
            {children}
          </main>
        {/* </AuthProvider> */}
      </body>
    </html>
  );
}