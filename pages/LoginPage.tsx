import React, { useState } from 'react';
import Button from '../components/Button';
import { login } from '../utils/api'; // Import fungsi login baru

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Panggil fungsi login yang berinteraksi dengan Firebase Authentication
      await login(username, password);
      // Tidak perlu memanggil onLogin, App.tsx akan merespons secara otomatis
    } catch (err: any) {
      let message = 'Terjadi kesalahan saat mencoba login.';
      // Memberikan pesan error yang lebih user-friendly berdasarkan kode error dari Firebase
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(err.code)) {
          message = 'Username atau password salah.';
      } else if (err.code === 'auth/too-many-requests') {
          message = 'Terlalu banyak percobaan login. Coba lagi nanti.';
      }
      setError(message);
    } finally {
      setLoading(false);
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <Button type="submit" disabled={loading} className="w-full !py-3 !rounded-full text-lg tracking-wider font-bold shadow-lg !bg-orange-500 hover:!bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-transform transform hover:scale-105">
                {loading ? 'MEMPROSES...' : 'MASUK'}
              </Button>
            </form>

          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;