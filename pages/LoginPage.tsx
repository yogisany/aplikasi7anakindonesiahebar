import React, { useState } from 'react';
import { User } from '../types';
import Button from '../components/Button';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');

  const handleSync = (code: string): boolean => {
    try {
      // FIX: Use decodeURIComponent to correctly handle special/unicode characters.
      const jsonString = decodeURIComponent(escape(atob(code)));
      const data = JSON.parse(jsonString);
      
      const requiredKeys = ['users', 'students', 'habit_records', 'admin_reports', 'messages'];
      const dataKeys = Object.keys(data);

      if (!requiredKeys.every(key => dataKeys.includes(key))) {
        throw new Error('Format kode tidak valid atau data tidak lengkap.');
      }

      // We don't clear, just overwrite. This is safer.
      requiredKeys.forEach(key => {
        localStorage.setItem(key, JSON.stringify(data[key]));
      });
      
      alert('Sinkronisasi berhasil! Perangkat ini sekarang memiliki data terbaru.');
      return true;
    } catch (err) {
      console.error('Sync failed:', err);
      setError('Gagal melakukan sinkronisasi. Pastikan Kode Akses yang Anda masukkan benar.');
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Step 1: Handle synchronization if access code is provided
    if (accessCode.trim()) {
      const syncSuccess = handleSync(accessCode);
      if (!syncSuccess) {
        return; // Stop if sync fails
      }
    }

    // Step 2: Proceed with login attempt
    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      onLogin(user);
    } else {
      let errorMessage = 'Username atau password salah.';
      if (accessCode.trim()) {
        errorMessage += ' Silakan coba login lagi.';
      } else {
        errorMessage += " Jika ini perangkat baru, Anda memerlukan 'Kode Akses' dari admin.";
      }
      setError(errorMessage);
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

              <div>
                <textarea
                  className="w-full px-4 py-3 rounded-2xl border-2 border-primary-200 bg-primary-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all text-sm"
                  placeholder="Kode Akses (Opsional, isi HANYA untuk login di perangkat baru)"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  aria-label="Kode Akses"
                  rows={3}
                />
              </div>


              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <Button type="submit" className="w-full !py-3 !rounded-full text-lg tracking-wider font-bold shadow-lg !bg-orange-500 hover:!bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-transform transform hover:scale-105">
                MASUK
              </Button>
            </form>

          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;