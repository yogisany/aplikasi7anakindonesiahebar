
import React, { useState } from 'react';
import { User } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // State for Sync Modal
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [syncError, setSyncError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      onLogin(user);
    } else {
      setError('Username atau password salah.');
    }
  };

  const handleSyncSubmit = () => {
    setSyncError('');
    if (!syncCode.trim()) {
      setSyncError('Kode tidak boleh kosong.');
      return;
    }
    try {
      const decodedString = atob(syncCode);
      const data = JSON.parse(decodedString);
      
      const requiredKeys = ['users', 'students', 'habit_records', 'admin_reports', 'messages'];
      const dataKeys = Object.keys(data);

      if (!requiredKeys.every(key => dataKeys.includes(key))) {
        throw new Error('Format kode tidak valid atau data tidak lengkap.');
      }

      localStorage.clear();

      requiredKeys.forEach(key => {
        localStorage.setItem(key, JSON.stringify(data[key]));
      });

      alert('Sinkronisasi berhasil! Halaman akan dimuat ulang agar perubahan diterapkan.');
      window.location.reload();

    } catch (error) {
      console.error('Sync failed:', error);
      setSyncError('Gagal melakukan sinkronisasi. Pastikan kode yang Anda masukkan benar dan tidak rusak.');
    }
  };

  return (
    <>
      <div className="min-h-screen bg-primary-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white shadow-2xl rounded-3xl overflow-hidden">
          {/* Image Section */}
          <div className="hidden md:block md:w-1/2">
            <img 
              src="https://i.ibb.co.com/fKQPG8t/Chat-GPT-Image-Nov-11-2025-10-59-32-PM.png" 
              alt="Ilustrasi Anak Sekolah Ceria" 
              className="object-cover w-full h-full"
            />
          </div>

          {/* Form Section */}
          <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-primary-800">Aplikasi Pemantauan 7 Kebiasaan Anak Indonesia Hebat</h1>
              <p className="mt-2 text-gray-500">Welcome Onboard</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-primary-200 bg-primary-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  aria-label="Username"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-primary-200 bg-primary-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-label="Password"
                />
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <Button type="submit" className="w-full !py-3 !rounded-full text-lg tracking-wider font-bold shadow-lg !bg-orange-500 hover:!bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-transform transform hover:scale-105">
                MASUK
              </Button>
            </form>

            <div className="text-center mt-6">
              <button 
                  type="button" 
                  onClick={() => setIsSyncModalOpen(true)}
                  className="text-sm text-primary-600 hover:underline font-semibold"
              >
                  Sinkronisasi Data dari Perangkat Admin
              </button>
            </div>

          </div>
        </div>
      </div>

      <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Sinkronisasi Data Aplikasi">
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                Tempelkan (paste) kode sinkronisasi yang Anda dapatkan dari admin utama di sini untuk memperbarui semua data di perangkat ini.
            </p>
            <textarea
                value={syncCode}
                onChange={(e) => setSyncCode(e.target.value)}
                className="w-full h-32 p-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Tempelkan kode di sini..."
                aria-label="Sync Code Input"
            />
            {syncError && <p className="text-sm text-red-500">{syncError}</p>}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setIsSyncModalOpen(false)}>Batal</Button>
                <Button onClick={handleSyncSubmit}>Sinkronkan</Button>
            </div>
        </div>
      </Modal>
    </>
  );
};

export default LoginPage;
