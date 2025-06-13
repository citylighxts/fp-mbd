'use client';

import React, { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import LoadingSpinner from '../LoadingSpinner';
import MessageDisplay from '../MessageDisplay';
import { Sesi, Topik, Konselor as KonselorType } from '../../types'; // Import types
import { FaClipboardList, FaTags, FaEdit, FaPlus, FaTimes } from 'react-icons/fa';

// Tipe untuk form update sesi
type SesiFormValues = {
    status: Sesi['status'];
    catatan: string;
};

// Tipe untuk form tambah/hapus topik
type TopikFormValues = {
    topikId: string;
};

export default function KonselorPanel() {
  const { user } = useAuth();
  const [sesi, setSesi] = useState<Sesi[]>([]);
  const [konselorTopiks, setKonselorTopiks] = useState<string[]>([]); // Array of topic names
  const [allTopiks, setAllTopiks] = useState<Topik[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'editSesi' | 'manageTopics'>('');
  const [currentItem, setCurrentItem] = useState<Sesi | null>(null); // Sesi yang sedang diedit
  const [formSesiValues, setFormSesiValues] = useState<SesiFormValues>({
    status: 'Requested',
    catatan: '',
  });
  const [formTopikValues, setFormTopikValues] = useState<TopikFormValues>({
    topikId: '',
  });

  const fetchKonselorData = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');
    try {
      // Fetch Sesi for Konselor
      const sesiRes = await api.get<Sesi[]>('/api/sesi/konselor');
      setSesi(sesiRes.data);

      // Fetch all available topics
      const allTopikRes = await api.get<Topik[]>('/api/topiks');
      setAllTopiks(allTopikRes.data);

      // Fetch Konselor's current topics using user.entityId (NIK)
      if (user && user.entityId) {
        const konselorRes = await api.get<KonselorType>(`/api/konselors/${user.entityId}`);
        setKonselorTopiks(konselorRes.data.topik_nama || []);
      }

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
    if (user && user.role === 'Konselor') {
      fetchKonselorData();
    }
  }, [user]);

  const openModal = (type: 'editSesi' | 'manageTopics', item: Sesi | null = null) => {
    setModalType(type);
    setCurrentItem(item);
    if (type === 'editSesi' && item) {
      setFormSesiValues({ status: item.status, catatan: item.catatan || '' });
    } else if (type === 'manageTopics') {
        setFormTopikValues({ topikId: '' }); // Reset
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentItem(null);
    setFormSesiValues({ status: 'Requested', catatan: '' });
    setFormTopikValues({ topikId: '' });
    setMessage('');
    setMessageType('');
  };

  const handleSesiFormChange = (e: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormSesiValues(prev => ({ ...prev, [name]: value as SesiFormValues[keyof SesiFormValues] }));
  };

  const handleTopikFormChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormTopikValues(prev => ({ ...prev, [name]: value }));
  };


  const handleUpdateSesi = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');
    try {
      if (currentItem?.sesi_id) {
        await api.put(`/api/sesi/${currentItem.sesi_id}`, formSesiValues);
        setMessage('Sesi berhasil diperbarui!');
        setMessageType('success');
        closeModal();
        fetchKonselorData(); // Refresh data sesi
      }
    } catch (error: any) {
      console.error('Error updating session:', error);
      setMessage(error.response?.data?.message || 'Gagal memperbarui sesi.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTopikToKonselor = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    if (!user || !user.entityId) {
        setMessage('Informasi konselor tidak tersedia.');
        setMessageType('error');
        setLoading(false);
        return;
    }

    try {
      await api.post('/api/konselors/topik/add', {
        konselorNik: user.entityId,
        topikId: formTopikValues.topikId,
      });
      setMessage('Topik berhasil ditambahkan ke profil Anda!');
      setMessageType('success');
      setFormTopikValues({ topikId: '' }); // Reset
      fetchKonselorData(); // Refresh data topik konselor
    } catch (error: any) {
      console.error('Error adding topic:', error);
      setMessage(error.response?.data?.message || 'Gagal menambahkan topik.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTopikFromKonselor = async (topikIdToRemove: string) => {
    setLoading(true);
    setMessage('');
    setMessageType('');

    if (!user || !user.entityId) {
        setMessage('Informasi konselor tidak tersedia.');
        setMessageType('error');
        setLoading(false);
        return;
    }

    try {
      await api.post('/api/konselors/topik/remove', {
        konselorNik: user.entityId,
        topikId: topikIdToRemove,
      });
      setMessage('Topik berhasil dihapus dari profil Anda!');
      setMessageType('success');
      fetchKonselorData(); // Refresh data topik konselor
    } catch (error: any) {
      console.error('Error removing topic:', error);
      setMessage(error.response?.data?.message || 'Gagal menghapus topik.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };


  const renderModalContent = () => {
    if (modalType === 'editSesi') {
      return (
        <form onSubmit={handleUpdateSesi} className="space-y-4">
          <div>
            <label htmlFor="status">Status Sesi:</label>
            <select id="status" name="status" value={formSesiValues.status} onChange={handleSesiFormChange} required>
              <option value="">Pilih Status</option>
              <option value="Requested">Diminta</option>
              <option value="Scheduled">Terjadwal</option>
              <option value="Completed">Selesai</option>
              <option value="Cancelled">Dibatalkan</option>
            </select>
          </div>
          <div>
            <label htmlFor="catatan">Catatan:</label>
            <textarea id="catatan" name="catatan" value={formSesiValues.catatan || ''} onChange={handleSesiFormChange} rows={3}></textarea>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Memperbarui...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      );
    } else if (modalType === 'manageTopics') {
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">Topik yang Tersedia:</h4>
          <form onSubmit={handleAddTopikToKonselor} className="flex gap-2">
            <select name="topikId" value={formTopikValues.topikId} onChange={handleTopikFormChange} className="flex-grow" required>
              <option value="">-- Tambah Topik --</option>
              {allTopiks.map(topik => (
                <option key={topik.topik_id} value={topik.topik_id}>{topik.topik_nama}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary" disabled={loading}>
              <FaPlus />
            </button>
          </form>

          <h4 className="font-semibold mt-4">Topik Saya:</h4>
          {konselorTopiks.length > 0 && konselorTopiks[0] !== null ? (
            <ul className="space-y-2">
              {konselorTopiks.map((topikName, index) => {
                const topicObj = allTopiks.find(t => t.topik_nama === topikName);
                if (!topicObj) return null; // Fallback if topic not found in allTopiks
                return (
                  <li key={topicObj.topik_id || index} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                    <span>{topikName}</span>
                    <button onClick={() => handleRemoveTopikFromKonselor(topicObj.topik_id)} className="text-red-500 hover:text-red-700" disabled={loading}>
                      <FaTimes />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500">Belum ada topik yang ditugaskan.</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={closeModal} className="btn-secondary">Selesai</button>
          </div>
        </div>
      );
    }
  };


  return (
    <div className="p-4 md:p-8">
      <h1 className="text-4xl font-extrabold text-primary mb-8 text-center">Dashboard Konselor</h1>

      {message && <MessageDisplay message={message} type={messageType} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><FaClipboardList /> Sesi Konseling Mendatang/Tertunda</h2>
          {loading && <LoadingSpinner />}
          {sesi.length > 0 ? (
            <div className="space-y-4">
              {sesi.map(s => (
                <div key={s.sesi_id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                  <p className="text-lg font-semibold text-primary">Sesi ID: {s.sesi_id}</p>
                  <p className="text-gray-700">Tanggal: {new Date(s.tanggal).toLocaleString()}</p>
                  <p className="text-gray-700">Mahasiswa: {s.mahasiswa_nama} ({s.mahasiswa_departemen})</p>
                  <p className="text-gray-700">Topik: {s.topik_nama}</p>
                  <p className={`font-semibold mt-2 ${s.status === 'Requested' ? 'text-yellow-600' : s.status === 'Scheduled' ? 'text-blue-600' : s.status === 'Completed' ? 'text-green-600' : 'text-red-600'}`}>
                    Status: {s.status}
                  </p>
                  {s.catatan && (
                    <p className="text-sm text-gray-600 mt-2 italic">Catatan: {s.catatan}</p>
                  )}
                  <button onClick={() => openModal('editSesi', s)} className="btn-secondary mt-3 flex items-center gap-1">
                    <FaEdit /> Edit Sesi
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Tidak ada sesi konseling yang terdaftar untuk Anda.</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><FaTags /> Manajemen Topik Konseling</h2>
          {loading && <LoadingSpinner />}
          <div className="space-y-4">
            <p className="font-semibold text-gray-700">Topik yang Anda tangani:</p>
            {konselorTopiks.length > 0 && konselorTopiks[0] !== null ? (
              <ul className="space-y-2">
                {konselorTopiks.map((topik, index) => (
                  <li key={index} className="bg-gray-100 p-3 rounded-md shadow-sm">
                    {topik}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Anda belum memiliki topik konseling yang ditugaskan.</p>
            )}
            <button onClick={() => openModal('manageTopics')} className="btn-primary w-full flex items-center justify-center gap-2">
              <FaEdit /> Kelola Topik
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4 text-primary">
              {modalType === 'editSesi' ? `Edit Sesi ID: ${currentItem?.sesi_id}` : 'Kelola Topik Konseling Anda'}
            </h3>
            {message && <MessageDisplay message={message} type={messageType} />}
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
}