"use client";

import React, { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import LoadingSpinner from "../LoadingSpinner";
import MessageDisplay from "../MessageDisplay";
import { Konselor, Topik, Sesi } from "../../types"; // Import types
import { FaCalendarPlus, FaUserMd, FaTags, FaBookOpen } from "react-icons/fa";

interface RekomendasiItem {
  topik_id: string;
  topik_nama: string;
  jumlah_sesi_terkait: number;
  konselor_rekomendasi_nik: string;
  konselor_rekomendasi_nama: string;
  konselor_rekomendasi_spesialisasi: string;
}

const statusLabels: { [key: string]: string } = {
  Requested: "Diminta",
  Scheduled: "Dijadwalkan",
  Completed: "Selesai",
  Cancelled: "Dibatalkan",
};

export default function MahasiswaPanel() {
  const { user } = useAuth();
  const [konselors, setKonselors] = useState<Konselor[]>([]);
  const [allTopics, setAllTopics] = useState<Topik[]>([]); // Menyimpan semua topik
  const [filteredTopics, setFilteredTopics] = useState<Topik[]>([]); // Topik yang difilter sesuai konselor
  const [sesi, setSesi] = useState<Sesi[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "info" | ""
  >("");
  const [modalMessage, setModalMessage] = useState<string>("");
  const [modalMessageType, setModalMessageType] = useState<
    "success" | "error" | "info" | ""
  >("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedKonselor, setSelectedKonselor] = useState<string>("");
  const [selectedTopik, setSelectedTopik] = useState<string>("");
  const [selectedRequestedDate, setSelectedRequestedDate] =
    useState<string>(""); // State baru untuk tanggal permintaan
  const [rekomendasi, setRekomendasi] = useState<RekomendasiItem[]>([]);
  const [loadingRekomendasi, setLoadingRekomendasi] = useState(true);
  const [pesanRekomendasi, setPesanRekomendasi] = useState("");
  const [tipePesanRekomendasi, setTipePesanRekomendasi] = useState<
  "success" | "error" | "info"
  >("info");

  const fetchMahasiswaData = async () => {
    setLoading(true);
    setMessage("");
    setMessageType("");
    try {
      // Fetch Konselors
      const konselorRes = await api.get<Konselor[]>("/konselors");
      setKonselors(konselorRes.data);

      // Fetch ALL Topics
      const topikRes = await api.get<Topik[]>("/topiks");
      setAllTopics(topikRes.data); // Simpan semua topik di allTopics

      // Fetch Sesi for Mahasiswa
      const sesiRes = await api.get<Sesi[]>("/sesi/mahasiswa");
      setSesi(sesiRes.data);

      setMessage("Data berhasil dimuat.");
      setMessageType("success");
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setMessage(error.response?.data?.message || "Gagal memuat data.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "Mahasiswa") {
      fetchMahasiswaData();
      fetchMyRekomendasi();
    }
  }, [user]);

  const fetchMyRekomendasi = async () => {
    setLoadingRekomendasi(true);
    setPesanRekomendasi("");
    setTipePesanRekomendasi("info"); 
    try {
      // Pastikan api.get menggunakan endpoint yang benar dan mengirim token
      const response = await api.get<RekomendasiItem[]>(
        "/mahasiswas/rekomendasi/me"
      );
      setRekomendasi(response.data);
      if (response.data.length === 0) {
        setPesanRekomendasi(
          "Tidak ada rekomendasi yang tersedia saat ini. Selesaikan beberapa sesi untuk mendapatkan rekomendasi!"
        );
        setTipePesanRekomendasi("info");
      } else {
        setPesanRekomendasi("Rekomendasi topik dan konselor berhasil dimuat.");
        setTipePesanRekomendasi("success");
      }
    } catch (err: any) {
      console.error("Error fetching my recommendations:", err);
      setRekomendasi([]);
      setPesanRekomendasi(
        err.response?.data?.message || "Gagal memuat rekomendasi."
      );
      setTipePesanRekomendasi("error");
    } finally {
      setLoadingRekomendasi(false);
    }
  };

  // Efek untuk memfilter topik berdasarkan konselor yang dipilih
  useEffect(() => {
    if (selectedKonselor && allTopics.length > 0 && konselors.length > 0) {
      const konselorObj = konselors.find((k) => k.nik === selectedKonselor);

      if (
        konselorObj &&
        konselorObj.topik_nama &&
        konselorObj.topik_nama.length > 0 &&
        konselorObj.topik_nama[0] !== null
      ) {
        const topicsForSelectedKonselor = allTopics.filter((topic) =>
          konselorObj.topik_nama?.includes(topic.topik_nama)
        );
        setFilteredTopics(topicsForSelectedKonselor);
        if (
          !topicsForSelectedKonselor.some((t) => t.topik_id === selectedTopik)
        ) {
          setSelectedTopik("");
        }
      } else {
        setFilteredTopics([]);
        setSelectedTopik("");
      }
    } else {
      setFilteredTopics([]);
      setSelectedTopik("");
    }
  }, [selectedKonselor, allTopics, konselors, selectedTopik]);

  const handleRequestSesi = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setModalMessage("");
    setModalMessageType("");

    try {
      if (!selectedRequestedDate) {
        setModalMessage("Pilih tanggal permintaan sesi.");
        setModalMessageType("error");
        setLoading(false);
        return;
      }

      console.log("Data yang akan dikirim ke backend:", {
        konselor_nik: selectedKonselor,
        topik_id: selectedTopik,
        tanggal: selectedRequestedDate,
      });
      await api.post("/sesi", {
        konselor_nik: selectedKonselor,
        topik_id: selectedTopik,
        tanggal: selectedRequestedDate,
      });
      setModalMessage("Permintaan sesi berhasil diajukan!");
      setModalMessageType("success");
      await fetchMahasiswaData(); // Refresh data sesi
      closeModal();
    } catch (error: any) {
      console.error("Error requesting session:", error);
      setModalMessage(
        error.response?.data?.message || "Gagal mengajukan permintaan sesi."
      );
      setModalMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedKonselor("");
    setSelectedTopik("");
    setSelectedRequestedDate(""); // Reset tanggal yang dipilih
    setModalMessage("");
    setModalMessageType("");
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-4xl font-extrabold text-primary mb-8 text-center">
        Dashboard Mahasiswa
      </h1>

      {message && messageType && (
        <MessageDisplay message={message} type={messageType} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaUserMd /> Pilih Konselor & Topik
          </h2>
          {loading && <LoadingSpinner />}
          <div className="space-y-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <FaCalendarPlus /> Ajukan Sesi Konseling Baru
            </button>
          </div>
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-3">
              Konselor Tersedia
            </h3>
            {konselors.length > 0 ? (
              <ul className="space-y-2">
                {konselors.map((konselor) => (
                  <li
                    key={konselor.nik}
                    className="bg-gray-50 p-3 rounded-md shadow-sm"
                  >
                    <p className="font-semibold text-gray-900">
                      {konselor.nama} ({konselor.spesialisasi})
                    </p>
                    <p className="text-sm text-gray-600">
                      Kontak: {konselor.kontak}
                    </p>
                    {konselor.topik_nama &&
                      konselor.topik_nama.length > 0 &&
                      konselor.topik_nama[0] !== null && (
                        <p className="text-xs text-gray-500">
                          Topik: {konselor.topik_nama.join(", ")}
                        </p>
                      )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Tidak ada konselor yang tersedia.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaBookOpen /> Sesi Konseling Saya
          </h2>
          {loading && <LoadingSpinner />}
          {sesi.length > 0 ? (
            <div className="space-y-4">
              {sesi.map((s) => (
                <div
                  key={s.sesi_id}
                  className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200"
                >
                  <p className="text-lg font-semibold text-primary">
                    Sesi ID: {s.sesi_id}
                  </p>
                  <p className="text-gray-700">
                    Tanggal Permintaan: {new Date(s.tanggal).toLocaleString()}{" "}
                    {/* Ini tanggal permintaan */}
                  </p>
                  <p className="text-gray-700">
                    Konselor: {s.konselor_nama} ({s.konselor_spesialisasi})
                  </p>
                  <p className="text-gray-700">Topik: {s.topik_nama}</p>
                  <p
                    className={`font-semibold mt-2 ${
                      s.status === "Requested"
                        ? "text-yellow-600"
                        : s.status === "Scheduled"
                        ? "text-blue-600"
                        : s.status === "Completed"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    Status: {statusLabels[s.status] || s.status}
                  </p>
                  {s.catatan && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      Catatan: {s.catatan}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              Anda belum memiliki sesi konseling yang terdaftar.
            </p>
          )}
        </div>

        <div className="card lg:col-span-2"> {/* Pakai lg:col-span-2 agar memenuhi lebar penuh di layar besar */}
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaTags /> Rekomendasi Topik dan Konselor
            </h2>

            {loadingRekomendasi ? (
                <LoadingSpinner />
            ) : rekomendasi.length > 0 ? (
                <div className="overflow-x-auto mt-4">
                    <table className="min-w-full bg-white border border-gray-200 rounded-md">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Topik</th>
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Sesi Terkait (Anda)</th>
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Konselor Rekomendasi</th>
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Spesialisasi Konselor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rekomendasi.map((item) => (
                                <tr key={item.topik_id + item.konselor_rekomendasi_nik} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{item.topik_nama}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{item.jumlah_sesi_terkait}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{item.konselor_rekomendasi_nama || 'Tidak Tersedia'}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{item.konselor_rekomendasi_spesialisasi || 'Tidak Tersedia'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-600">{pesanRekomendasi}</p>
            )}
            {/* Tampilkan pesan rekomendasi di luar tabel jika tidak ada data */}
            {!loadingRekomendasi && rekomendasi.length === 0 && pesanRekomendasi && (
                <MessageDisplay message={pesanRekomendasi} type={tipePesanRekomendasi} />
            )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4 text-primary">
              Ajukan Sesi Konseling Baru
            </h3>
            {modalMessage && modalMessageType && (
              <MessageDisplay message={modalMessage} type={modalMessageType} />
            )}
            <form onSubmit={handleRequestSesi} className="space-y-4">
              <div>
                <label htmlFor="konselor">Pilih Konselor:</label>
                <select
                  id="konselor"
                  value={selectedKonselor}
                  onChange={(e) => setSelectedKonselor(e.target.value)}
                  required
                  className="w-full p-2 border rounded"
                >
                  <option value="">-- Pilih Konselor --</option>
                  {konselors.map((k) => {
                    return (
                      <option key={k.nik} value={k.nik}>
                        {k.nama} ({k.spesialisasi})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label htmlFor="topik">Pilih Topik:</label>
                <select
                  id="topik"
                  value={selectedTopik}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setSelectedTopik(e.target.value)
                  }
                  required
                >
                  <option value="">-- Pilih Topik --</option>
                  {filteredTopics.map(
                    (
                      t // Gunakan filteredTopics di sini
                    ) => (
                      <option key={t.topik_id} value={t.topik_id}>
                        {t.topik_nama}
                      </option>
                    )
                  )}
                </select>
                {/* Pesan bantuan untuk pengguna */}
                {filteredTopics.length === 0 && selectedKonselor && (
                  <p className="text-sm text-gray-500 mt-1">
                    Konselor ini tidak memiliki topik yang tersedia.
                  </p>
                )}
                {filteredTopics.length === 0 && !selectedKonselor && (
                  <p className="text-sm text-gray-500 mt-1">
                    Pilih konselor terlebih dahulu untuk melihat topik.
                  </p>
                )}
              </div>
              {/* Input Tanggal Permintaan */}
              <div>
                <label htmlFor="requestedDate">Tanggal yang Diminta:</label>
                <input
                  type="date"
                  id="requestedDate"
                  value={selectedRequestedDate}
                  onChange={(e) => setSelectedRequestedDate(e.target.value)}
                  required
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? "Mengajukan..." : "Ajukan Sesi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
