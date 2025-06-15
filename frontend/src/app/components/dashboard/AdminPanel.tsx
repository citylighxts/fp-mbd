"use client";

import React, { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import LoadingSpinner from "../LoadingSpinner";
import MessageDisplay from "../MessageDisplay";
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
} from "react-icons/fa";
import { User, Admin, Mahasiswa, Konselor, Topik, Sesi } from "../../types"; // Import types

// Definisikan tipe untuk data yang akan dikelola di AdminPanel
type AdminDataState = {
  users: User[];
  admins: Admin[];
  mahasiswas: Mahasiswa[];
  konselors: Konselor[];
  topics: Topik[];
  sessions: Sesi[];
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

const statusLabels: { [key: string]: string } = {
  Requested: "Diminta",
  Scheduled: "Dijadwalkan",
  Completed: "Selesai",
  Cancelled: "Dibatalkan",
};

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<keyof AdminDataState>("users"); // Tipe tab aktif
  const [data, setData] = useState<AdminDataState>({
    users: [],
    admins: [],
    mahasiswas: [],
    konselors: [],
    topics: [],
    sessions: [],
  });
  const [loading, setLoading] = useState<boolean>(false);

  const [spesialisasiFilter, setSpesialisasiFilter] = useState<string>("");
  const [filteredSessions, setFilteredSessions] = useState<Sesi[]>([]);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);

  const [periode, setPeriode] = useState({ start: "", end: "" });
  const [sesiSelesai, setSesiSelesai] = useState<Sesi[]>([]);
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
      } else if (tab === "admins") {
        const response = await api.get<Admin[]>("/admins");
        setData((prev) => ({ ...prev, admins: response.data }));
      } else if (tab === "mahasiswas") {
        const response = await api.get<Mahasiswa[]>("/mahasiswas");
        setData((prev) => ({ ...prev, mahasiswas: response.data }));
      } else if (tab === "konselors") {
        // Konselor endpoint sudah mengambil topik_nama
        const response = await api.get<Konselor[]>("/konselors");
        setData((prev) => ({ ...prev, konselors: response.data }));
        // --- LOG UNTUK MEMERIKSA DATA KONSELOR ---
        console.log("DATA KONSELOR DITERIMA DARI BACKEND:", response.data);
        // ----------------------------------------------------
      } else if (tab === "topics") {
        const response = await api.get<Topik[]>("/topiks");
        setData((prev) => ({ ...prev, topics: response.data }));
      } else if (tab === "sessions") {
        const response = await api.get<Sesi[]>("/sesi/all");
        setData((prev) => ({ ...prev, sessions: response.data }));
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

  const fetchSessionsBySpesialisasi = async () => {
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
        `/sesi/spesialisasi?spesialisasi=${encodeURIComponent(spesialisasiFilter)}`
      );
      setFilteredSessions(response.data);
      setMessage(
        `Menampilkan sesi untuk konselor dengan spesialisasi "${spesialisasiFilter}".`
      );
      setMessageType("success");
    } catch (error: any) {
      setFilteredSessions([]);
      setMessage(
        error.response?.data?.message ||
          "Gagal memuat sesi untuk spesialisasi ini."
      );
      setMessageType("error");
    } finally {
      setIsFiltering(false);
    }
  };

  const fetchSesiSelesai = async () => {
    if (!periode.start || !periode.end) {
      setPesanSelesai("Pilih tanggal mulai dan akhir periode.");
      return;
    }
    setLoadingSelesai(true);
    setPesanSelesai("");
    try {
      const response = await api.get<Sesi[]>(
        `/sesi/konselor/selesai?start=${periode.start}&end=${periode.end}`
      );
      setSesiSelesai(response.data);
      if (response.data.length === 0) {
        setPesanSelesai("Tidak ada sesi selesai pada periode ini.");
      }
    } catch (err: any) {
      setPesanSelesai("Gagal memuat data sesi selesai.");
      setSesiSelesai([]);
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
        } else if (activeTab === "topics") {
          await api.post("/topiks", { topik_nama: formValues.topik_nama });
          setMessage("Topik berhasil ditambahkan!");
        }
      } else if (modalType === "edit") {
        if (activeTab === "users" && currentItem && "user_id" in currentItem) {
          await api.put(`/users/${currentItem.user_id}`, {
            username: formValues.username,
            role: formValues.role,
          });
          setMessage("Pengguna berhasil diperbarui!");
        } else if (
          activeTab === "admins" &&
          currentItem &&
          "admin_id" in currentItem
        ) {
          await api.put(`/admins/${currentItem.admin_id}`, {
            nama: formValues.nama,
          });
          setMessage("Admin berhasil diperbarui!");
        } else if (
          activeTab === "mahasiswas" &&
          currentItem &&
          "NRP" in currentItem
        ) {
          await api.put(`/mahasiswas/${currentItem.NRP}`, {
            nama: formValues.nama,
            departemen: formValues.departemen,
            kontak: formValues.kontak,
          });
          setMessage("Mahasiswa berhasil diperbarui!");
        } else if (
          activeTab === "konselors" &&
          currentItem &&
          "NIK" in currentItem
        ) {
          await api.put(`/konselors/${currentItem.NIK}`, {
            nama: formValues.nama,
            spesialisasi: formValues.spesialisasi,
            kontak: formValues.kontak,
          });
          setMessage("Konselor berhasil diperbarui!");
        } else if (
          activeTab === "topics" &&
          currentItem &&
          "topik_id" in currentItem
        ) {
          await api.put(`/topiks/${currentItem.topik_id}`, {
            topik_nama: formValues.topik_nama,
          });
          setMessage("Topik berhasil diperbarui!");
        } else if (
          activeTab === "sessions" &&
          currentItem &&
          "sesi_id" in currentItem
        ) {
          await api.put(`/sesi/${currentItem.sesi_id}`, {
            status: formValues.status,
            catatan: formValues.catatan,
          });
          setMessage("Sesi berhasil diperbarui!");
        }
      } else if (modalType === "delete") {
        if (activeTab === "users" && currentItem && "user_id" in currentItem) {
          await api.delete(`/users/${currentItem.user_id}`);
          setMessage("Pengguna berhasil dihapus!");
        } else if (
          activeTab === "admins" &&
          currentItem &&
          "admin_id" in currentItem
        ) {
          await api.delete(`/admins/${currentItem.admin_id}`);
          setMessage("Admin berhasil dihapus!");
        } else if (
          activeTab === "mahasiswas" &&
          currentItem &&
          "NRP" in currentItem
        ) {
          await api.delete(`/mahasiswas/${currentItem.NRP}`);
          setMessage("Mahasiswa berhasil dihapus!");
        } else if (
          activeTab === "konselors" &&
          currentItem &&
          "NIK" in currentItem
        ) {
          await api.delete(`/konselors/${currentItem.NIK}`);
          setMessage("Konselor berhasil dihapus!");
        } else if (
          activeTab === "topics" &&
          currentItem &&
          "topik_id" in currentItem
        ) {
          await api.delete(`/topiks/${currentItem.topik_id}`);
          setMessage("Topik berhasil dihapus!");
        } else if (
          activeTab === "sessions" &&
          currentItem &&
          "sesi_id" in currentItem
        ) {
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
    const isTopicTab = activeTab === "topics";
    const isSessionTab = activeTab === "sessions";

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
        {activeTab === "admins" && !isUserTab && (
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
        {activeTab === "mahasiswas" && !isUserTab && (
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
        {activeTab === "konselors" && !isUserTab && ( // Ini adalah bagian edit/add konselor di modal
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
        {isTopicTab && (
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
              activeTab === "admins"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("admins")}
          >
            <FaUserTie /> Admin
          </button>
          <button
            className={`btn-primary flex items-center justify-center gap-2 ${
              activeTab === "mahasiswas"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("mahasiswas")}
          >
            <FaGraduationCap /> Mahasiswa
          </button>
          <button
            className={`btn-primary flex items-center justify-center gap-2 ${
              activeTab === "konselors"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("konselors")}
          >
            <FaFileMedical /> Konselor
          </button>
          <button
            className={`btn-primary flex items-center justify-center gap-2 ${
              activeTab === "topics"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("topics")}
          >
            <FaTags /> Topik
          </button>
          <button
            className={`btn-primary flex items-center justify-center gap-2 ${
              activeTab === "sessions"
                ? "bg-primary"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={() => setActiveTab("sessions")}
          >
            <FaCheck /> Sesi
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 capitalize">
          Manajemen {activeTab}
        </h2>

        {(activeTab === "users" || activeTab === "topics") && (
          <button
            onClick={() => openModal("add")}
            className="btn-primary mb-4 flex items-center gap-2"
          >
            <FaPlus /> Tambah{" "}
            {activeTab === "users" ? "Pengguna Baru" : "Topik Baru"}
          </button>
        )}

{activeTab === "sessions" && (
  <>
    {/* --- FILTER SPESIALISASI --- */}
    <div className="mb-4 flex flex-col md:flex-row md:items-end gap-2">
      <div>
        <label htmlFor="spesialisasiFilter" className="block text-sm font-medium text-gray-700">
          Filter Sesi Konseling Berdasarkan Spesialisasi Konselor:
        </label>
        <input
          id="spesialisasiFilter"
          type="text"
          className="border rounded px-2 py-1 w-60"
          placeholder="Masukkan spesialisasi, misal: Masalah Akademik"
          value={spesialisasiFilter}
          onChange={(e) => setSpesialisasiFilter(e.target.value)}
        />
      </div>
      <button
        className="btn-primary mt-2 md:mt-0"
        onClick={fetchSessionsBySpesialisasi}
        disabled={isFiltering}
      >
        {isFiltering ? "Memuat..." : "Tampilkan Sesi"}
      </button>
      {filteredSessions.length > 0 && (
        <button
          className="btn-secondary ml-2"
          onClick={() => {
            setFilteredSessions([]);
            setSpesialisasiFilter("");
            setMessage("");
          }}
        >
          Reset Filter
        </button>
      )}
    </div>

    {/* --- LANGSUNG TAMBAHKAN KODE FILTER PERIODE DI SINI --- */}
    <div className="mb-4 flex flex-col md:flex-row gap-2 items-end">
      <div>
        <label className="block text-sm font-medium">Periode Mulai:</label>
        <input
          type="date"
          value={periode.start}
          onChange={e => setPeriode(p => ({ ...p, start: e.target.value }))}
          className="border rounded px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Periode Akhir:</label>
        <input
          type="date"
          value={periode.end}
          onChange={e => setPeriode(p => ({ ...p, end: e.target.value }))}
          className="border rounded px-2 py-1"
        />
      </div>
      <button
        className="btn-primary mt-2 md:mt-0"
        onClick={fetchSesiSelesai}
        disabled={loadingSelesai}
      >
        {loadingSelesai ? "Memuat..." : "Tampilkan Sesi Selesai"}
      </button>
    </div>

    {pesanSelesai && (
      <div className="mb-2 text-sm text-red-600">{pesanSelesai}</div>
    )}

    {!loadingSelesai && sesiSelesai.length > 0 && (
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full bg-white border border-gray-200 rounded-md">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Tanggal</th>
              <th className="py-2 px-4 border-b">Mahasiswa</th>
              <th className="py-2 px-4 border-b">Topik</th>
              <th className="py-2 px-4 border-b">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {sesiSelesai.map(sesi => (
              <tr key={sesi.sesi_id}>
                <td className="py-2 px-4 border-b">{sesi.tanggal}</td>
                <td className="py-2 px-4 border-b">{sesi.mahasiswa_nama}</td>
                <td className="py-2 px-4 border-b">{sesi.topik_nama}</td>
                <td className="py-2 px-4 border-b">{sesi.catatan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </>
)}

    {loading ? (
      <LoadingSpinner />
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-md">
          <thead className="bg-gray-50">
            <tr>
              {/* Headers for Users, Admins, Mahasiswas, Konselors, Topics */}
              {activeTab === "users" && (
                <>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">ID</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Username</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Role</th>
                </>
              )}
              {activeTab === "admins" && (
                <>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">ID Admin</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Nama</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Username</th>
                </>
              )}
              {activeTab === "mahasiswas" && (
                <>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">NRP</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Nama</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Departemen</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Kontak</th>
                </>
              )}
              {activeTab === "konselors" && ( // KONSOLER HEADERS
                <>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">NIK</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Nama</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Spesialisasi</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Topik</th> {/* NEW TOPIC COLUMN */}
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Kontak</th>
                </>
              )}
              {activeTab === "topics" && (
                <>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">ID Topik</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Nama Topik</th>
                </>
              )}
              {activeTab === "sessions" && (
                <>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Sesi ID</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Tanggal</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Mahasiswa</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Konselor</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Topik</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Catatan</th>
                </>
              )}
              <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {activeTab === "users" &&
              data.users.map((item: User) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.id}  
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.username}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.role}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal("edit", item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => openModal("delete", item)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {activeTab === "admins" &&
              data.admins.map((item: Admin) => (
                <tr key={item.admin_id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.admin_id}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.nama}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.username}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal("edit", item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => openModal("delete", item)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {activeTab === "mahasiswas" &&
              data.mahasiswas.map((item: Mahasiswa) => (
                <tr key={item.NRP} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.NRP}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.nama}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.departemen}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.kontak}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal("edit", item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => openModal("delete", item)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {activeTab === "konselors" && // KONSOLER ROWS
              data.konselors.map((item: Konselor) => (
                <tr key={item.nik} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.nik}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.nama}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.spesialisasi}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {/* Kolom Topik */}
                    {item.topik_nama && item.topik_nama.length > 0 && item.topik_nama[0] !== null ? (
                      <span className="text-sm text-gray-600">
                        {item.topik_nama.join(', ')}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.kontak}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal("edit", item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => openModal("delete", item)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {activeTab === "topics" &&
              data.topics.map((item: Topik) => (
                <tr key={item.topik_id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.topik_id}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.topik_nama}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal("edit", item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => openModal("delete", item)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {activeTab === "sessions" &&
                (filteredSessions.length > 0 ? filteredSessions : data.sessions).map((item: Sesi) => (
                <tr key={item.sesi_id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.sesi_id}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {new Date(item.tanggal).toLocaleString()}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {statusLabels[item.status] || item.status}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.mahasiswa_nama} ({item.mahasiswa_nrp})
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.konselor_nama} ({item.konselor_nik})
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.topik_nama}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    {item.catatan || "-"}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal("edit", item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => openModal("delete", item)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {data[activeTab]?.length === 0 && (
              <tr>
                <td
                  colSpan={Object.keys(data[activeTab][0] || {}).length + 2}
                  className="py-4 px-4 text-center text-gray-500"
                >
                  Tidak ada data untuk ditampilkan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>

  {isModalOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-2xl font-bold mb-4 text-primary capitalize">
          {modalType === "add"
            ? `Tambah ${
                activeTab === "users"
                  ? "Pengguna"
                  : activeTab === "topics"
                  ? "Topik"
                  : ""
              }`
            : modalType === "edit"
            ? `Edit ${
                (currentItem as User)?.username ||
                (currentItem as Admin)?.nama ||
                (currentItem as Mahasiswa)?.nama ||
                (currentItem as Konselor)?.nama ||
                (currentItem as Topik)?.topik_nama ||
                (currentItem as Sesi)?.sesi_id
              }`
            : "Konfirmasi Hapus"}
        </h3>
        {renderModalContent()}
      </div>
    </div>
  )}
</div>
  );
}