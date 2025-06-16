"use client";

import React, { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api"; // Path sudah benar
import LoadingSpinner from "../../components/LoadingSpinner"; // Path sudah benar
import MessageDisplay from "../../components/MessageDisplay"; // Path sudah benar
import {
  FaUser,
  FaUserTie,
  FaGraduationCap,
  FaFileMedical,
  FaTags,
  FaTrash,
  FaEdit,
  FaPlus,
  FaCheck,
  FaListAlt,
} from "react-icons/fa";
import { User, Admin, Mahasiswa, Konselor, Topik, Sesi } from "../../types"; // Import types

// Definisikan tipe untuk data yang akan dikelola di AdminPanel
type AdminDataState = {
  users: User[];
  admin: Admin[];
  mahasiswa: Mahasiswa[];
  konselor: Konselor[];
  topik: Topik[];
  session: Sesi[];
  Aktifitas: any[];
};

// Definisikan tipe untuk formValues
type FormValues = {
  username: string;
  password?: string; // Password hanya untuk register
  role: "Admin" | "Mahasiswa" | "Konselor" | "";
  nama: string;
  departemen: string;
  kontak: string;
  spesialisasi: string;
  NRP: string;
  NIK: string;
  topik_nama: string; // Untuk topik
  status: "Requested" | "Scheduled" | "Completed" | "Cancelled" | ""; // Untuk sesi
  catatan: string; // Untuk sesi
};

// NEW: Definisikan ulang Sesi untuk hasil rekap sesi selesai
// Berdasarkan query backend: sesi_id, tanggal, status, nama_mahasiswa, nama_konselor, nama_topik, catatan
interface CompletedSesi extends Sesi {
  nama_mahasiswa: string;
  nama_konselor: string;
  nama_topik: string;
}

const statusLabels: { [key: string]: string } = {
  Requested: "Diminta",
  Scheduled: "Dijadwalkan",
  Completed: "Selesai",
  Cancelled: "Dibatalkan",
};

interface KonselorSessionSummary {
  konselor_nik: string;
  konselor_nama: string;
  konselor_spesialisasi: string;
  total_sesi_ditangani: number;
  total_sesi_selesai: number;
  total_sesi_aktif_pending: number;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<keyof AdminDataState>("users"); // Tipe tab aktif
  const [data, setData] = useState<AdminDataState>({
    users: [],
    admin: [],
    mahasiswa: [],
    konselor: [],
    topik: [],
    session: [],
    Aktifitas: [],
  });
  const [loading, setLoading] = useState<boolean>(false);

  // States untuk filter sesi berdasarkan spesialisasi konselor
  const [spesialisasiFilter, setSpesialisasiFilter] = useState<string>("");
  const [filteredsession, setFilteredsession] = useState<Sesi[]>([]);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);

  // NEW: States untuk filter mahasiswa berdasarkan topik
  const [mahasiswaTopikFilter, setMahasiswaTopikFilter] = useState<string>("");
  const [filteredMahasiswa, setFilteredMahasiswa] = useState<Mahasiswa[]>([]); // Mahasiswa[] karena hanya data mahasiswa
  const [isMahasiswaFiltering, setIsMahasiswaFiltering] =
    useState<boolean>(false);
  const [mahasiswaFilterMessage, setMahasiswaFilterMessage] =
    useState<string>("");

  // NEW: States for konselor filter (konselor tanpa sesi)
  const [filteredKonselor, setFilteredKonselor] = useState<Konselor[]>([]);
  const [isKonselorFiltering, setIsKonselorFiltering] =
    useState<boolean>(false);
  const [konselorFilterMessage, setKonselorFilterMessage] =
    useState<string>("");

  const [konselorSessionSummary, setKonselorSessionSummary] = useState<
    KonselorSessionSummary[]
  >([]);
  const [loadingKonselorSummary, setLoadingKonselorSummary] =
    useState<boolean>(false);
  const [konselorSummaryMessage, setKonselorSummaryMessage] =
    useState<string>("");

  // States untuk filter periode sesi selesai
  const [periode, setPeriode] = useState({ start: "", end: "" });
  // Menggunakan tipe CompletedSesi untuk menampung hasil rekap
  const [sesiSelesai, setSesiSelesai] = useState<CompletedSesi[]>([]);
  const [loadingSelesai, setLoadingSelesai] = useState(false);
  const [pesanSelesai, setPesanSelesai] = useState("");

  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<"add" | "edit" | "delete" | null>(
    null
  );
  const [currentItem, setCurrentItem] = useState<
    User | Admin | Mahasiswa | Konselor | Topik | Sesi | null
  >(null);

  const [formValues, setFormValues] = useState<FormValues>({
    username: "",
    password: "",
    role: "",
    nama: "",
    departemen: "",
    kontak: "",
    spesialisasi: "",
    NRP: "",
    NIK: "",
    topik_nama: "",
    status: "",
    catatan: "",
  });

  const fetchData = async (tab: keyof AdminDataState) => {
    setLoading(true);
    setMessage("");
    setMessageType("info");
    try {
      if (tab === "users") {
        const response = await api.get<User[]>("/users"); // Tentukan tipe respons
        setData((prev) => ({ ...prev, users: response.data }));
      } else if (tab === "admin") {
        const response = await api.get<Admin[]>("/admins");
        setData((prev) => ({ ...prev, admin: response.data }));
      } else if (tab === "mahasiswa") {
        const response = await api.get<Mahasiswa[]>("/mahasiswas");
        setData((prev) => ({ ...prev, mahasiswa: response.data }));
        // Reset filter mahasiswa saat pindah tab atau refresh semua
        setFilteredMahasiswa([]);
        setMahasiswaTopikFilter("");
        setMahasiswaFilterMessage("");
      } else if (tab === "konselor") {
        const response = await api.get<Konselor[]>("/konselors");
        setData((prev) => ({ ...prev, konselor: response.data }));
        // Reset konselor filter when switching tabs or refreshing all data
        setFilteredKonselor([]);
        setIsKonselorFiltering(false); // Reset loading state
        setKonselorFilterMessage(""); // Clear filter message
      } else if (tab === "topik") {
        const response = await api.get<Topik[]>("/topiks");
        setData((prev) => ({ ...prev, topik: response.data }));
      } else if (tab === "session") {
        const response = await api.get<Sesi[]>("/sesi/all");
        setData((prev) => ({ ...prev, session: response.data }));
      } else if (tab === "Aktifitas") {
        const response = await api.get("/mahasiswas/aktivitas-terakhir");
        setData((prev) => ({ ...prev, Aktifitas: response.data }));
      }
      setMessage(`Data ${tab} berhasil dimuat.`);
      setMessageType("success");
    } catch (error: any) {
      console.error(`Error fetching ${tab} data:`, error);
      setMessage(`Gagal memuat data ${tab}.`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "Admin") {
      fetchData(activeTab);
    }
  }, [user, activeTab]);

  const fetchsessionBySpesialisasi = async () => {
    if (!spesialisasiFilter) {
      setMessage("Masukkan spesialisasi konselor yang ingin dicari.");
      setMessageType("error");
      return;
    }
    setIsFiltering(true);
    setMessage("");
    setMessageType("info");
    try {
      const response = await api.get<Sesi[]>(
        `/sesi/spesialisasi?spesialisasi=${encodeURIComponent(
          spesialisasiFilter
        )}`
      );
      setFilteredsession(response.data);
      setMessage(
        `Menampilkan sesi untuk konselor dengan spesialisasi "${spesialisasiFilter}".`
      );
      setMessageType("success");
    } catch (error: any) {
      setFilteredsession([]);
      setMessage(
        error.response?.data?.message ||
          "Gagal memuat sesi untuk spesialisasi ini."
      );
      setMessageType("error");
    } finally {
      setIsFiltering(false);
    }
  };

  // NEW: Fungsi untuk mendapatkan mahasiswa berdasarkan topik
  const fetchMahasiswaByTopik = async () => {
    if (!mahasiswaTopikFilter) {
      setMahasiswaFilterMessage("Masukkan nama topik untuk memfilter.");
      setMessageType("error");
      setFilteredMahasiswa([]); // Pastikan dikosongkan
      return;
    }
    setIsMahasiswaFiltering(true);
    setMahasiswaFilterMessage("");
    setMessageType("info"); // Reset message type
    try {
      // Menggunakan endpoint baru: /mahasiswas/by-topik
      const response = await api.get<Mahasiswa[]>(
        `/mahasiswas/by-topik?topikNama=${encodeURIComponent(
          mahasiswaTopikFilter
        )}`
      );
      setFilteredMahasiswa(response.data);
      if (response.data.length === 0) {
        setMahasiswaFilterMessage(
          `Tidak ada mahasiswa yang ditemukan untuk topik "${mahasiswaTopikFilter}".`
        );
        setMessageType("info"); // Atau 'warning' jika ada
      } else {
        setMahasiswaFilterMessage(
          `Menampilkan ${response.data.length} mahasiswa yang pernah sesi dengan topik "${mahasiswaTopikFilter}".`
        );
        setMessageType("success");
      }
    } catch (error: any) {
      setFilteredMahasiswa([]);
      setMahasiswaFilterMessage(
        error.response?.data?.message ||
          "Gagal memuat mahasiswa untuk topik ini."
      );
      setMessageType("error");
    } finally {
      setIsMahasiswaFiltering(false);
    }
  };

  // NEW: Fungsi untuk mendapatkan konselor yang belum pernah menangani sesi
  const fetchKonselorTanpaSesi = async () => {
    setIsKonselorFiltering(true);
    setKonselorFilterMessage("");
    setMessage(""); // Clear general message
    setMessageType("info");

    try {
      const response = await api.get<Konselor[]>("/konselors/tanpa-sesi");
      setFilteredKonselor(response.data);
      if (response.data.length === 0) {
        setKonselorFilterMessage(
          "Tidak ada konselor yang belum pernah menangani sesi."
        );
      } else {
        setKonselorFilterMessage(
          `Menampilkan ${response.data.length} konselor yang belum pernah menangani sesi.`
        );
      }
      setMessageType("success");
    } catch (error: any) {
      setFilteredKonselor([]);
      setKonselorFilterMessage(
        error.response?.data?.message ||
          "Gagal memuat daftar konselor tanpa sesi."
      );
      setMessageType("error");
    } finally {
      setIsKonselorFiltering(false);
    }
  };

  const fetchKonselorSessionSummary = async () => {
    setLoadingKonselorSummary(true);
    setKonselorSummaryMessage("");
    setMessageType("info"); // Reset message type

    try {
      const response = await api.get<KonselorSessionSummary[]>(
        "/konselors/rekap-sesi"
      );
      console.log(
        "Data diterima dari backend (Rekap Konselor):",
        response.data
      ); // Ini PENTING
      setKonselorSessionSummary(response.data);
      if (response.data.length === 0) {
        setKonselorSummaryMessage(
          "Tidak ada data rekapitulasi sesi konselor ditemukan."
        );
      } else {
        setKonselorSummaryMessage(
          `Menampilkan rekapitulasi sesi untuk ${response.data.length} konselor.`
        );
      }
      setMessageType("success");
    } catch (error: any) {
      console.error("Error fetching konselor session summary:", error);
      setKonselorSessionSummary([]);
      setKonselorSummaryMessage(
        error.response?.data?.message ||
          "Gagal memuat rekapitulasi sesi konselor."
      );
      setMessageType("error");
    } finally {
      setLoadingKonselorSummary(false);
    }
  };

  // Fungsi baru untuk memanggil endpoint rekap sesi selesai
  const fetchSesiSelesai = async () => {
    if (!periode.start || !periode.end) {
      setPesanSelesai("Pilih tanggal mulai dan akhir periode.");
      setMessageType("error"); // Set messageType for error
      return;
    }
    setLoadingSelesai(true);
    setPesanSelesai("");
    setSesiSelesai([]); // Kosongkan data sebelumnya
    setMessageType("info"); // Reset message type
    try {
      // Menggunakan endpoint baru: /api/sesi/completed
      // Pastikan format tanggal sesuai dengan yang diharapkan backend (YYYY-MM-DD)
      const response = await api.get<CompletedSesi[]>(
        `/sesi/completed?start_date=${periode.start}&end_date=${periode.end}`
      );
      setSesiSelesai(response.data);
      if (response.data.length === 0) {
        setPesanSelesai("Tidak ada sesi selesai ditemukan pada periode ini.");
        setMessageType("info"); // Atau 'warning' jika ada
      } else {
        setPesanSelesai(`Ditemukan ${response.data.length} sesi selesai.`);
        setMessageType("success");
      }
    } catch (err: any) {
      console.error("Error fetching completed sessions:", err);
      setPesanSelesai(
        err.response?.data?.message || "Gagal memuat data sesi selesai."
      );
      setSesiSelesai([]);
      setMessageType("error");
    } finally {
      setLoadingSelesai(false);
    }
  };

  const openModal = (type: "add" | "edit" | "delete", item: any = null) => {
    setModalType(type);
    setCurrentItem(item);
    setFormValues({
      username: item?.username || "",
      password: "", // Password tidak diisi saat edit
      role: item?.role || "",
      nama: item?.nama || "",
      departemen: item?.departemen || "",
      kontak: item?.kontak || "",
      spesialisasi: item?.spesialisasi || "",
      NRP: item?.NRP || item?.nrp || "", // Menangani NRP dari Mahasiswa atau string kosong
      NIK: item?.NIK || item?.nik || "", // Menangani NIK dari Konselor atau string kosong
      topik_nama: item?.topik_nama || "",
      status: item?.status || "",
      catatan: item?.catatan || "",
    });

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentItem(null);
    setFormValues({
      username: "",
      password: "",
      role: "",
      nama: "",
      departemen: "",
      kontak: "",
      spesialisasi: "",
      NRP: "",
      NIK: "",
      topik_nama: "",
      status: "",
      catatan: "",
    });
    setMessage("");
    setMessageType("info");
  };

  const handleFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageType("info");

    try {
      if (modalType === "add") {
        if (activeTab === "users") {
          await api.post("/auth/register", formValues);
          setMessage("Pengguna berhasil ditambahkan!");
        } else if (activeTab === "topik") {
          await api.post("/topiks", { topik_nama: formValues.topik_nama });
          setMessage("Topik berhasil ditambahkan!");
        }
      } else if (modalType === "edit" && currentItem) {
        if ("nrp" in currentItem) {
          await api.put(`/mahasiswas/${currentItem.nrp}`, {
            nama: formValues.nama,
            departemen: formValues.departemen,
            kontak: formValues.kontak,
          });
          setMessage("Mahasiswa berhasil diperbarui!");
        } else if ("nik" in currentItem) {
          await api.put(`/konselors/${currentItem.nik}`, {
            nama: formValues.nama,
            spesialisasi: formValues.spesialisasi,
            kontak: formValues.kontak,
          });
          setMessage("Konselor berhasil diperbarui!");
        } else if ("user_id" in currentItem) {
          await api.put(`/users/${currentItem.user_id}`, {
            username: formValues.username,
            role: formValues.role,
          });
          setMessage("Pengguna berhasil diperbarui!");
        } else if ("admin_id" in currentItem) {
          await api.put(`/admins/${currentItem.admin_id}`, {
            nama: formValues.nama,
          });
          setMessage("Admin berhasil diperbarui!");
        } else if ("topik_id" in currentItem) {
          await api.put(`/topiks/${currentItem.topik_id}`, {
            topik_nama: formValues.topik_nama,
          });
          setMessage("Topik berhasil diperbarui!");
        } else if ("sesi_id" in currentItem) {
          await api.put(`/sesi/${currentItem.sesi_id}`, {
            status: formValues.status,
            catatan: formValues.catatan,
          });
          setMessage("Sesi berhasil diperbarui!");
        }
      } else if (modalType === "delete" && currentItem) {
        if ("nrp" in currentItem) {
          await api.delete(`/mahasiswas/${currentItem.nrp}`);
          setMessage("Mahasiswa berhasil dihapus!");
        } else if ("nik" in currentItem) {
          await api.delete(`/konselors/${currentItem.nik}`);
          setMessage("Konselor berhasil dihapus!");
        } else if ("user_id" in currentItem) {
          await api.delete(`/users/${currentItem.user_id}`);
          setMessage("Pengguna berhasil dihapus!");
        } else if ("admin_id" in currentItem) {
          await api.delete(`/admins/${currentItem.admin_id}`);
          setMessage("Admin berhasil dihapus!");
        } else if ("topik_id" in currentItem) {
          await api.delete(`/topiks/${currentItem.topik_id}`);
          setMessage("Topik berhasil dihapus!");
        } else if ("sesi_id" in currentItem) {
          await api.delete(`/sesi/${currentItem.sesi_id}`);
          setMessage("Sesi berhasil dihapus!");
        }
      }

      setMessageType("success");
      closeModal();
      fetchData(activeTab); // Refresh data setelah operasi
    } catch (error: any) {
      console.error("Error submitting form:", error);
      setMessage(error.response?.data?.message || "Terjadi kesalahan.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const renderModalContent = () => {
    if (modalType === "delete") {
      return (
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <p>
            Anda yakin ingin menghapus{" "}
            {(currentItem as User)?.username ||
              (currentItem as Admin)?.nama ||
              (currentItem as Topik)?.topik_nama ||
              (currentItem as Sesi)?.sesi_id}
            ?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="btn-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary bg-red-500 hover:bg-red-600"
              disabled={loading}
            >
              {loading ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </form>
      );
    }

    const isUserTab = activeTab === "users";
    const istopikTab = activeTab === "topik";
    const isSessionTab = activeTab === "session";

    return (
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {isUserTab && (
          <>
            <div>
              <label htmlFor="username">Username:</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formValues.username}
                onChange={handleFormChange}
                required
              />
            </div>
            {modalType === "add" && (
              <div>
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formValues.password}
                  onChange={handleFormChange}
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="role">Role:</label>
              <select
                id="role"
                name="role"
                value={formValues.role}
                onChange={handleFormChange}
                required
              >
                <option value="">Pilih Role</option>
                <option value="Mahasiswa">Mahasiswa</option>
                <option value="Konselor">Konselor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            {formValues.role === "Mahasiswa" && (
              <>
                <div>
                  <label htmlFor="NRP">NRP:</label>
                  <input
                    type="text"
                    id="NRP"
                    name="NRP"
                    value={formValues.NRP}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="nama">Nama:</label>
                  <input
                    type="text"
                    id="nama"
                    name="nama"
                    value={formValues.nama}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="departemen">Departemen:</label>
                  <input
                    type="text"
                    id="departemen"
                    name="departemen"
                    value={formValues.departemen}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="kontak">Kontak:</label>
                  <input
                    type="text"
                    id="kontak"
                    name="kontak"
                    value={formValues.kontak}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </>
            )}
            {formValues.role === "Konselor" && (
              <>
                <div>
                  <label htmlFor="NIK">NIK:</label>
                  <input
                    type="text"
                    id="NIK"
                    name="NIK"
                    value={formValues.NIK}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="nama">Nama:</label>
                  <input
                    type="text"
                    id="nama"
                    name="nama"
                    value={formValues.nama}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="spesialisasi">Spesialisasi:</label>
                  <input
                    type="text"
                    id="spesialisasi"
                    name="spesialisasi"
                    value={formValues.spesialisasi}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="kontak">Kontak:</label>
                  <input
                    type="text"
                    id="kontak"
                    name="kontak"
                    value={formValues.kontak}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </>
            )}
            {formValues.role === "Admin" && modalType === "add" && (
              <div>
                <label htmlFor="nama">Nama:</label>
                <input
                  type="text"
                  id="nama"
                  name="nama"
                  value={formValues.nama}
                  onChange={handleFormChange}
                  required
                />
              </div>
            )}
          </>
        )}
        {activeTab === "admin" && !isUserTab && (
          <div>
            <label htmlFor="nama">Nama:</label>
            <input
              type="text"
              id="nama"
              name="nama"
              value={formValues.nama}
              onChange={handleFormChange}
              required
            />
          </div>
        )}
        {activeTab === "mahasiswa" && !isUserTab && (
          <>
            <div>
              <label htmlFor="nama">Nama:</label>
              <input
                type="text"
                id="nama"
                name="nama"
                value={formValues.nama}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="departemen">Departemen:</label>
              <input
                type="text"
                id="departemen"
                name="departemen"
                value={formValues.departemen}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="kontak">Kontak:</label>
              <input
                type="text"
                id="kontak"
                name="kontak"
                value={formValues.kontak}
                onChange={handleFormChange}
                required
              />
            </div>
          </>
        )}
        {activeTab === "konselor" &&
          !isUserTab && ( // Ini adalah bagian edit/add konselor di modal
            <>
              <div>
                <label htmlFor="nama">Nama:</label>
                <input
                  type="text"
                  id="nama"
                  name="nama"
                  value={formValues.nama}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="spesialisasi">Spesialisasi:</label>
                <input
                  type="text"
                  id="spesialisasi"
                  name="spesialisasi"
                  value={formValues.spesialisasi}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="kontak">Kontak:</label>
                <input
                  type="text"
                  id="kontak"
                  name="kontak"
                  value={formValues.kontak}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </>
          )}
        {istopikTab && (
          <div>
            <label htmlFor="topik_nama">Nama Topik:</label>
            <input
              type="text"
              id="topik_nama"
              name="topik_nama"
              value={formValues.topik_nama}
              onChange={handleFormChange}
              required
            />
          </div>
        )}
        {isSessionTab && (
          <>
            <div>
              <label htmlFor="status">Status:</label>
              <select
                id="status"
                name="status"
                value={formValues.status}
                onChange={handleFormChange}
                required
              >
                <option value="">Pilih Status</option>
                <option value="Requested">Diminta</option>
                <option value="Scheduled">Dijadwalkan</option>
                <option value="Completed">Selesai</option>
                <option value="Cancelled">Dibatalkan</option>
              </select>
            </div>
            <div>
              <label htmlFor="catatan">Catatan:</label>
              <textarea
                id="catatan"
                name="catatan"
                value={formValues.catatan || ""}
                onChange={handleFormChange}
                rows={3}
              ></textarea>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={closeModal} className="btn-secondary">
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? "Memproses..."
              : modalType === "add"
              ? "Tambah"
              : "Simpan"}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-4xl font-extrabold text-primary mb-8 text-center">
        Dashboard Admin
      </h1>

      {/* Menampilkan pesan umum */}
      {message && <MessageDisplay message={message} type={messageType} />}

      <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Navigasi Admin</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            className={`btn-primary flex items-center justify-center gap-2 ${
              activeTab === "users"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("users")}
          >
            <FaUser /> Pengguna
          </button>
          <button
            className={`btn-primary flex items-center justify-center gap-2 ${
              activeTab === "admin"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("admin")}
          >
            <FaUserTie /> Admin
          </button>
          <button
            className={`btn-primary flex items-center justify-center gap-2 ${
              activeTab === "mahasiswa"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("mahasiswa")}
          >
            <FaGraduationCap /> Mahasiswa
          </button>
          <button
            className={`btn-primary flex items-center justify-center gap-2 ${
              activeTab === "konselor"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("konselor")}
          >
            <FaFileMedical /> Konselor
          </button>
          <button
            className={`btn-primary flex items-center justify-center gap-2 ${
              activeTab === "topik"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("topik")}
          >
            <FaTags /> Topik
          </button>
          <button
            className={`btn-primary flex items-center justify-center gap-2 ${
              activeTab === "session"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("session")}
          >
            <FaCheck /> Sesi
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 capitalize">
          Manajemen {activeTab}
        </h2>

        {(activeTab === "users" || activeTab === "topik") && (
          <button
            onClick={() => openModal("add")}
            className="btn-primary mb-4 flex items-center gap-2"
          >
            <FaPlus /> Tambah{" "}
            {activeTab === "users" ? "Pengguna Baru" : "Topik Baru"}
          </button>
        )}

        {activeTab === "mahasiswa" && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("Aktifitas")}
              className="btn-secondary flex items-center gap-2"
            >
              <FaListAlt /> Lihat Laporan Aktivitas Mahasiswa
            </button>
          </div>
        )}

        {/* --- NEW: Filter Mahasiswa berdasarkan Topik --- */}
        {activeTab === "mahasiswa" && (
          <div className="mb-4 p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-2">
              Filter Mahasiswa Berdasarkan Topik Sesi
            </h3>
            <div className="flex flex-col md:flex-row md:items-end gap-2">
              <div>
                <label
                  htmlFor="mahasiswaTopikFilter"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nama Topik Sesi:
                </label>
                <input
                  id="mahasiswaTopikFilter"
                  type="text"
                  className="border rounded px-2 py-1 w-60"
                  placeholder="Misal: Stres Akademik"
                  value={mahasiswaTopikFilter}
                  onChange={(e) => setMahasiswaTopikFilter(e.target.value)}
                />
              </div>
              <button
                className="btn-primary mt-2 md:mt-0"
                onClick={fetchMahasiswaByTopik}
                disabled={isMahasiswaFiltering}
              >
                {isMahasiswaFiltering ? "Memuat..." : "Tampilkan Mahasiswa"}
              </button>
              {(filteredMahasiswa.length > 0 || mahasiswaFilterMessage) && (
                <button
                  className="btn-secondary ml-2"
                  onClick={() => {
                    setFilteredMahasiswa([]);
                    setMahasiswaTopikFilter("");
                    setMahasiswaFilterMessage("");
                    setMessageType("info"); // Bersihkan pesan umum juga
                    fetchData("mahasiswa"); // Muat ulang semua data mahasiswa
                  }}
                >
                  Reset Filter
                </button>
              )}
            </div>
            {mahasiswaFilterMessage && (
              <div
                className={`mt-2 text-sm ${
                  messageType === "error" ? "text-red-600" : "text-green-600"
                }`}
              >
                {mahasiswaFilterMessage}
              </div>
            )}

            {!isMahasiswaFiltering && filteredMahasiswa.length > 0 && (
              <div className="overflow-x-auto mt-4">
                <h4 className="text-md font-semibold mb-2">
                  Hasil Filter Mahasiswa
                </h4>
                <table className="min-w-full bg-white border border-gray-200 rounded-md">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        NRP
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Nama
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Departemen
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Kontak
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMahasiswa.map((item) => (
                      <tr key={item.nrp} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                          {item.nrp}
                        </td>
                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                          {item.nama}
                        </td>
                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                          {item.departemen}
                        </td>
                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                          {item.kontak}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* --- END NEW FILTER MAHASISWA --- */}

        {activeTab === "konselor" && (
          // Outer container for all counselor-related filters/reports
          <div className="mb-4 p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">
              Filter dan Rekap Konselor
            </h3>{" "}
            {/* Unified heading */}
            {/* --- Filter Konselor Tanpa Sesi --- */}
            {/* Wrapped for better logical grouping */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              {" "}
              {/* Added border-b for separation */}
              <h4 className="text-md font-semibold mb-2">
                Konselor Tanpa Sesi
              </h4>
              <div className="flex flex-col md:flex-row md:items-end gap-2">
                <button
                  className="btn-primary mt-2 md:mt-0"
                  onClick={fetchKonselorTanpaSesi}
                  disabled={isKonselorFiltering}
                >
                  {isKonselorFiltering
                    ? "Memuat..."
                    : "Tampilkan Konselor Tanpa Sesi"}
                </button>
                {(filteredKonselor.length > 0 || konselorFilterMessage) && (
                  <button
                    className="btn-secondary ml-2"
                    onClick={() => {
                      setFilteredKonselor([]);
                      setKonselorFilterMessage("");
                      setMessage(""); // Clear general message
                      fetchData("konselor"); // Reload all konselor data
                    }}
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              {konselorFilterMessage && (
                <div
                  className={`mt-2 text-sm ${
                    messageType === "error" ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {konselorFilterMessage}
                </div>
              )}
            </div>
            {/* --- END Filter Konselor Tanpa Sesi --- */}
            {/* --- Rekapitulasi Jumlah Sesi Konselor --- */}
            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2">
                Rekapitulasi Jumlah Sesi Konselor
              </h4>
              <div className="flex flex-col md:flex-row md:items-end gap-2">
                <button
                  className="btn-primary mt-2 md:mt-0"
                  onClick={fetchKonselorSessionSummary}
                  disabled={loadingKonselorSummary}
                >
                  {loadingKonselorSummary
                    ? "Memuat Rekap..."
                    : "Tampilkan Rekap Sesi Konselor"}
                </button>
                {(konselorSessionSummary.length > 0 ||
                  konselorSummaryMessage) && (
                  <button
                    className="btn-secondary ml-2"
                    onClick={() => {
                      setKonselorSessionSummary([]);
                      setKonselorSummaryMessage("");
                      setMessageType("info");
                    }}
                  >
                    Reset Rekap
                  </button>
                )}
              </div>
              {konselorSummaryMessage && (
                <div
                  className={`mt-2 text-sm ${
                    messageType === "error" ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {konselorSummaryMessage}
                </div>
              )}
              {/* === PASTIKAN KONDISI INI BENAR === */}
              {!loadingKonselorSummary && konselorSessionSummary.length > 0 && (
                <div className="overflow-x-auto mt-4">
                  <h5 className="text-md font-semibold mb-2 text-gray-700">
                    Hasil Rekapitulasi
                  </h5>
                  <table className="min-w-full bg-white border border-gray-200 rounded-md">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          NIK
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Nama Konselor
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Spesialisasi
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Total Sesi
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Sesi Selesai
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Sesi Aktif/Pending
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {konselorSessionSummary.map((item) => (
                        <tr
                          key={item.konselor_nik}
                          className="hover:bg-gray-50"
                        >
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {item.konselor_nik}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {item.konselor_nama}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {item.konselor_spesialisasi}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {item.total_sesi_ditangani}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {item.total_sesi_selesai}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {item.total_sesi_aktif_pending}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* === AKHIR KONDISI INI === */}
            </div>
            {/* --- END Rekapitulasi Jumlah Sesi Konselor --- */}
          </div>
        )}

        {activeTab === "session" && (
          <>
            {/* --- FILTER SPESIALISASI KONSELOR --- */}
            <div className="mb-4 p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">
                Filter Sesi Berdasarkan Spesialisasi Konselor
              </h3>
              <div className="flex flex-col md:flex-row md:items-end gap-2">
                <div>
                  <label
                    htmlFor="spesialisasiFilter"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Spesialisasi Konselor:
                  </label>
                  <input
                    id="spesialisasiFilter"
                    type="text"
                    className="border rounded px-2 py-1 w-60"
                    placeholder="Misal: Masalah Akademik"
                    value={spesialisasiFilter}
                    onChange={(e) => setSpesialisasiFilter(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary mt-2 md:mt-0"
                  onClick={fetchsessionBySpesialisasi}
                  disabled={isFiltering}
                >
                  {isFiltering ? "Memuat..." : "Tampilkan Sesi"}
                </button>
                {filteredsession.length > 0 && (
                  <button
                    className="btn-secondary ml-2"
                    onClick={() => {
                      setFilteredsession([]);
                      setSpesialisasiFilter("");
                      setMessage("");
                      fetchData("session"); // Muat ulang semua sesi
                    }}
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* --- REKAP SESI SELESAI PERIODE --- */}
            <div className="mb-4 p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">
                Rekap Sesi Selesai per Periode
              </h3>
              <div className="flex flex-col md:flex-row gap-2 md:items-end">
                <div>
                  <label
                    htmlFor="periodeStart"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Periode Mulai:
                  </label>
                  <input
                    type="date"
                    id="periodeStart"
                    value={periode.start}
                    onChange={(e) =>
                      setPeriode((p) => ({ ...p, start: e.target.value }))
                    }
                    className="border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label
                    htmlFor="periodeEnd"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Periode Akhir:
                  </label>
                  <input
                    type="date"
                    id="periodeEnd"
                    value={periode.end}
                    onChange={(e) =>
                      setPeriode((p) => ({ ...p, end: e.target.value }))
                    }
                    className="border rounded px-2 py-1"
                  />
                </div>
                <button
                  className="btn-primary mt-2 md:mt-0"
                  onClick={fetchSesiSelesai}
                  disabled={loadingSelesai}
                >
                  {loadingSelesai
                    ? "Memuat Rekap..."
                    : "Tampilkan Rekap Sesi Selesai"}
                </button>
              </div>

              {pesanSelesai && (
                <MessageDisplay message={pesanSelesai} type={messageType} />
              )}

              {!loadingSelesai && sesiSelesai.length > 0 && (
                <div className="overflow-x-auto mt-4">
                  <h4 className="text-md font-semibold mb-2">
                    Hasil Rekap Sesi Selesai
                  </h4>
                  <table className="min-w-full bg-white border border-gray-200 rounded-md">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          ID Sesi
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Tanggal
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Status
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Mahasiswa
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Konselor
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Topik
                        </th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Catatan
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sesiSelesai.map((sesi) => (
                        <tr key={sesi.sesi_id} className="hover:bg-gray-50">
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {sesi.sesi_id}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {new Date(sesi.tanggal).toLocaleDateString(
                              "id-ID",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {statusLabels[sesi.status] || sesi.status}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {sesi.nama_mahasiswa}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {sesi.nama_konselor}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {sesi.nama_topik}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            {sesi.catatan || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* --- MAIN DATA TABLE --- */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-md">
              <thead className="bg-gray-50">
                <tr>
                  {activeTab === "users" && (
                    <>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        ID
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Username
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Role
                      </th>
                    </>
                  )}
                  {activeTab === "admin" && (
                    <>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        ID Admin
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Nama
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Username
                      </th>
                    </>
                  )}
                  {activeTab === "mahasiswa" &&
                    filteredMahasiswa.length === 0 && (
                      <>
                        <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          NRP
                        </th>
                        <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Nama
                        </th>
                        <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Departemen
                        </th>
                        <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Kontak
                        </th>
                      </>
                    )}
                  {activeTab === "konselor" && (
                    <>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        NIK
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Nama
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Spesialisasi
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Kontak
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Aksi
                      </th>
                    </>
                  )}
                  {activeTab === "topik" && (
                    <>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        ID Topik
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Nama Topik
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Aksi
                      </th>
                    </>
                  )}
                  {activeTab === "session" && filteredsession.length === 0 && (
                    <>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        ID Sesi
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Tanggal
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Status
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Mahasiswa
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Konselor
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Topik
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Catatan
                      </th>
                    </>
                  )}
                  {activeTab === "session" && filteredsession.length > 0 && (
                    <>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        ID Sesi
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Tanggal
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Status
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Mahasiswa
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Konselor
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Topik
                      </th>
                      <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                        Catatan
                      </th>
                    </>
                  )}
                  {/* Kolom Aksi hanya tampil jika tidak sedang memfilter Mahasiswa */}
                  {activeTab !== "mahasiswa" ||
                    (activeTab === "mahasiswa" &&
                      filteredMahasiswa.length === 0 && (
                        <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                          Aksi
                        </th>
                      ))}
                </tr>
              </thead>
              <tbody>
                {activeTab === "users" &&
                  data.users.map((item) => (
                    <tr key={item.user_id}>
                      <td className="py-2 px-4 border-b">{item.user_id}</td>
                      <td className="py-2 px-4 border-b">{item.username}</td>
                      <td className="py-2 px-4 border-b">{item.role}</td>
                      <td className="py-2 px-4 border-b text-center">
                        <button
                          onClick={() => openModal("edit", item)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openModal("delete", item)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                {activeTab === "admin" &&
                  data.admin.map((item) => (
                    <tr key={item.admin_id}>
                      <td className="py-2 px-4 border-b">{item.admin_id}</td>
                      <td className="py-2 px-4 border-b">{item.nama}</td>
                      <td className="py-2 px-4 border-b">
                        {item.username || "N/A"}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        <button
                          onClick={() => openModal("edit", item)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openModal("delete", item)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                {activeTab === "mahasiswa" &&
                  filteredMahasiswa.length === 0 &&
                  // Tampilkan semua mahasiswa jika tidak ada filter aktif
                  data.mahasiswa.map((item) => (
                    <tr key={item.nrp}>
                      <td className="py-2 px-4 border-b">{item.nrp}</td>
                      <td className="py-2 px-4 border-b">{item.nama}</td>
                      <td className="py-2 px-4 border-b">{item.departemen}</td>
                      <td className="py-2 px-4 border-b">{item.kontak}</td>
                      <td className="py-2 px-4 border-b text-center">
                        <button
                          onClick={() => openModal("edit", item)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openModal("delete", item)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                {activeTab === "konselor" &&
                  // Conditional rendering based on whether filtering is active and has results
                  (isKonselorFiltering || filteredKonselor.length > 0
                    ? filteredKonselor
                    : data.konselor
                  ).map((item) => (
                    <tr key={item.nik}>
                      <td className="py-2 px-4 border-b">{item.nik}</td>
                      <td className="py-2 px-4 border-b">{item.nama}</td>
                      <td className="py-2 px-4 border-b">
                        {item.spesialisasi}
                      </td>
                      <td className="py-2 px-4 border-b">{item.kontak}</td>
                      <td className="py-2 px-4 border-b text-center">
                        <button
                          onClick={() => openModal("edit", item)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openModal("delete", item)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                {activeTab === "topik" &&
                  data.topik.map((item) => (
                    <tr key={item.topik_id}>
                      <td className="py-2 px-4 border-b">{item.topik_id}</td>
                      <td className="py-2 px-4 border-b">{item.topik_nama}</td>
                      <td className="py-2 px-4 border-b text-center">
                        <button
                          onClick={() => openModal("edit", item)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openModal("delete", item)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                {activeTab === "session" &&
                  filteredsession.length === 0 &&
                  // Tampilkan semua sesi jika tidak ada filter spesialisasi aktif
                  data.session.map((item) => (
                    <tr key={item.sesi_id}>
                      <td className="py-2 px-4 border-b">{item.sesi_id}</td>
                      <td className="py-2 px-4 border-b">
                        {new Date(item.tanggal).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {statusLabels[item.status] || item.status}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {item.mahasiswa_nama}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {item.konselor_nama}
                      </td>
                      <td className="py-2 px-4 border-b">{item.topik_nama}</td>
                      <td className="py-2 px-4 border-b">
                        {item.catatan || "-"}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        <button
                          onClick={() => openModal("edit", item)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openModal("delete", item)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                {activeTab === "session" &&
                  filteredsession.length > 0 &&
                  // Tampilkan sesi yang difilter berdasarkan spesialisasi
                  filteredsession.map((item) => (
                    <tr key={item.sesi_id}>
                      <td className="py-2 px-4 border-b">{item.sesi_id}</td>
                      <td className="py-2 px-4 border-b">
                        {new Date(item.tanggal).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {statusLabels[item.status] || item.status}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {item.mahasiswa_nama}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {item.konselor_nama}
                      </td>
                      <td className="py-2 px-4 border-b">{item.topik_nama}</td>
                      <td className="py-2 px-4 border-b">
                        {item.catatan || "-"}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        <button
                          onClick={() => openModal("edit", item)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openModal("delete", item)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === "Aktifitas" && (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                    NRP
                  </th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                    Nama Mahasiswa
                  </th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                    Departemen
                  </th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">
                    Tanggal Sesi Terakhir
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4}>
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : (
                  data.Aktifitas.map((item) => (
                    <tr key={item.nrp} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{item.nrp}</td>
                      <td className="py-2 px-4 border-b">{item.nama}</td>
                      <td className="py-2 px-4 border-b">{item.departemen}</td>
                      <td className="py-2 px-4 border-b">
                        {item.tanggal_sesi_terakhir ? (
                          new Date(item.tanggal_sesi_terakhir).toLocaleString(
                            "id-ID"
                          )
                        ) : (
                          <span className="text-gray-400 italic">
                            Belum pernah sesi
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 md:w-1/2 lg:w-1/3">
            <h2 className="text-2xl font-bold mb-4">
              {modalType === "add"
                ? `Tambah ${activeTab === "users" ? "Pengguna" : "Topik"}`
                : modalType === "edit"
                ? `Edit ${
                    activeTab === "users"
                      ? "Pengguna"
                      : activeTab === "topik"
                      ? "Topik"
                      : activeTab === "session"
                      ? "Sesi"
                      : "Data"
                  }`
                : "Hapus Data"}
            </h2>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
}
