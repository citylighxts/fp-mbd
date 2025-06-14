"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api from "../lib/api"; // Pastikan path ini benar
import { User as UserType } from "../types"; // Import tipe User dari file types

// Definisikan tipe untuk data pengguna yang disimpan di konteks
interface UserData extends UserType {
  entityId?: string; // NIK, NRP, atau admin_id
}

// Definisikan tipe untuk nilai konteks otentikasi
interface AuthContextType {
  user: UserData | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// Buat konteks dengan nilai default undefined atau null, kemudian pastikan digunakan dengan cek non-null
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook untuk menggunakan konteks otentikasi
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode; // Tentukan tipe children
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const loadUserFromCookies = async () => {
      const token = Cookies.get("token");
      const storedUser = Cookies.get("user");

      if (token && storedUser) {
        try {
          const parsedUser: UserData = JSON.parse(storedUser);
          // Set token di header default Axios
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          setUser(parsedUser);
        } catch (error) {
          console.error("Failed to parse user data from cookies:", error);
          Cookies.remove("token");
          Cookies.remove("user");
        }
      }
      setLoading(false);
    };

    loadUserFromCookies();

    // Interceptor untuk menangani token kedaluwarsa atau error otorisasi
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response &&
          (error.response.status === 401 || error.response.status === 403)
        ) {
          console.log("Token expired or unauthorized. Logging out...");
          logout(); // Panggil logout untuk membersihkan state dan cookies
          router.push(
            "/auth/login?message=Sesi Anda telah berakhir. Harap login kembali."
          ); // Redirect ke login
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [router]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      // Tentukan tipe respons dari API login
      const res = await api.post<{ token: string; user: UserData }>(
        "/auth/login",
        { username, password }
      );
      const { token, user: userData } = res.data;

      // Simpan token dan data pengguna di cookies
      Cookies.set("token", token, {
        expires: 1 / 24,
        secure: process.env.NODE_ENV === "production",
      }); // 1 jam
      Cookies.set("user", JSON.stringify(userData), {
        expires: 1 / 24,
        secure: process.env.NODE_ENV === "production",
      });

      // Atur token di header default Axios
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(userData);

      // Arahkan ke dashboard tunggal
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login failed:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Login gagal. Periksa kembali kredensial Anda.";
      throw new Error(errorMessage); // Lemparkan error agar bisa ditangkap di komponen
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    Cookies.remove("token");
    Cookies.remove("user");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    router.push("/auth/login"); // Arahkan ke halaman login setelah logout
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
