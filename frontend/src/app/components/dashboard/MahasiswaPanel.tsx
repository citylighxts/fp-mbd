'use client';

import React, { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import LoadingSpinner from '../LoadingSpinner';
import MessageDisplay from '../MessageDisplay';
import { Konselor, Topik, Sesi } from '../../types'; // Import types
import { FaCalendarPlus, FaUserMd, FaTags, FaBookOpen } from 'react-icons/fa';

export default function MahasiswaPanel() {
  const { user } = useAuth();
  const [konselors, setKonselors] = useState<Konselor[]>([]);
  const [topics, setTopics] = useState<Topik[]>([]);
  const [sesi, setSesi] = useState<Sesi[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedKonselor, setSelectedKonselor] = useState<string>('');
  const [selectedTopik, setSelectedTopik] = useState<string>('');

  const fetchMahasiswaData = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');
    try {
      // Fetch Konselors
      const konselorRes = await api.get<Konselor[]>('/api/konselors');
      setKonselors(konselorRes.data);

      // Fetch Topics
      const topikRes = await api.get<Topik[]>('/api/topiks');
      setTopics(topikRes.data);

      // Fetch Sesi for Mahasiswa
      const sesiRes = await api.get<Sesi[]>('/api/sesi/mahasiswa');
      setSesi(sesiRes.data);

      setMessage('Data berhasil dimuat.');
      setMessageType('success');
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setMessage(error.response?.data?.message || 'Gagal memuat data.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'Mahasiswa') {
      fetchMahasiswaData();
    }
  }, [user]);

  const handleRequestSesi = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      await api.post('/api/sesi', {
        konselor_nik: selectedKonselor,
        topik_id: selectedTopik,
      });
      setMessage('Permintaan sesi berhasil diajukan!');
      setMessageType('success');
      closeModal();
      fetchMahasiswaData(); // Refresh data sesi
    } catch (error: any) {
      console.error('Error requesting session:', error);
      setMessage(error.response?.data?.message || 'Gagal mengajukan permintaan sesi.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedKonselor('');
    setSelectedTopik('');
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-4xl font-extrabold text-primary mb-8 text-center">Dashboard Mahasiswa</h1>

      {message && <MessageDisplay message={message} type={messageType} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><FaUserMd /> Pilih Konselor & Topik</h2>
          {loading && <LoadingSpinner />}
          <div className="space-y-4">
            <button onClick={() => setIsModalOpen(true)} className="btn-primary w-full flex items-center justify-center gap-2">
              <FaCalendarPlus /> Ajukan Sesi Konseling Baru
            </button>
          </div>
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-3">Konselor Tersedia</h3>
            {konselors.length > 0 ? (
              <ul className="space-y-2">
                {konselors.map(konselor => (
                  <li key={konselor.NIK} className="bg-gray-50 p-3 rounded-md shadow-sm">
                    <p className="font-semibold text-gray-900">{konselor.nama} ({konselor.spesialisasi})</p>
                    <p className="text-sm text-gray-600">Kontak: {konselor.kontak}</p>
                    {konselor.topik_nama && konselor.topik_nama.length > 0 && konselor.topik_nama[0] !== null && (
                      <p className="text-xs text-gray-500">Topik: {konselor.topik_nama.join(', ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Tidak ada konselor yang tersedia.</p>
            )}
            <h3 className="text-xl font-semibold text-gray-700 mt-6 mb-3">Topik Konseling</h3>
            {topics.length > 0 ? (
              <ul className="space-y-2">
                {topics.map(topik => (
                  <li key={topik.topik_id} className="bg-gray-50 p-3 rounded-md shadow-sm">
                    <p className="font-semibold text-gray-900">{topik.topik_nama}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Tidak ada topik yang tersedia.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><FaBookOpen /> Sesi Konseling Saya</h2>
          {loading && <LoadingSpinner />}
          {sesi.length > 0 ? (
            <div className="space-y-4">
              {sesi.map(s => (
                <div key={s.sesi_id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                  <p className="text-lg font-semibold text-primary">Sesi ID: {s.sesi_id}</p>
                  <p className="text-gray-700">Tanggal: {new Date(s.tanggal).toLocaleString()}</p>
                  <p className="text-gray-700">Konselor: {s.konselor_nama} ({s.konselor_spesialisasi})</p>
                  <p className="text-gray-700">Topik: {s.topik_nama}</p>
                  <p className={`font-semibold mt-2 ${s.status === 'Requested' ? 'text-yellow-600' : s.status === 'Scheduled' ? 'text-blue-600' : s.status === 'Completed' ? 'text-green-600' : 'text-red-600'}`}>
                    Status: {s.status}
                  </p>
                  {s.catatan && (
                    <p className="text-sm text-gray-600 mt-2 italic">Catatan: {s.catatan}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Anda belum memiliki sesi konseling yang terdaftar.</p>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4 text-primary">Ajukan Sesi Konseling Baru</h3>
            {message && <MessageDisplay message={message} type={messageType} />}
            <form onSubmit={handleRequestSesi} className="space-y-4">
              <div>
                <label htmlFor="konselor">Pilih Konselor:</label>
                <select id="konselor" value={selectedKonselor} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedKonselor(e.target.value)} required>
                  <option value="">-- Pilih Konselor --</option>
                  {konselors.map(k => (
                    <option key={k.NIK} value={k.NIK}>{k.nama} ({k.spesialisasi})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="topik">Pilih Topik:</label>
                <select id="topik" value={selectedTopik} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedTopik(e.target.value)} required>
                  <option value="">-- Pilih Topik --</option>
                  {topics.map(t => (
                    <option key={t.topik_id} value={t.topik_id}>{t.topik_nama}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Mengajukan...' : 'Ajukan Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}