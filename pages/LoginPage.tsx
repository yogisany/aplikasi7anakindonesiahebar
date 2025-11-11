
import React, { useState } from 'react';
import { User } from '../types';
import Button from '../components/Button';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl flex overflow-hidden">
        {/* Left Side - Illustration */}
        <div className="hidden md:flex md:w-1/2 bg-primary-200 p-8 flex-col justify-center items-center text-center text-primary-800">
           <img src="https://storage.googleapis.com/project-os-prod/images/845191f2-1a7f-473d-854c-1d98939c065f.jpeg" alt="Ilustrasi Anak Sekolah Dasar" className="w-full max-w-md rounded-lg shadow-lg" />
           <h1 className="text-3xl font-bold mt-6">7 Kebiasaan Anak Indonesia Hebat</h1>
           <p className="mt-2 text-primary-700">Membentuk Generasi Unggul Sejak Dini</p>
        </div>
        
        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-primary-800 mb-2 text-center">Selamat Datang!</h2>
            <p className="text-gray-600 mb-8 text-center">Silakan masuk untuk melanjutkan.</p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-primary-200 bg-primary-50 focus:outline-none focus:border-primary-400 transition-colors"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  aria-label="Username"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-primary-200 bg-primary-50 focus:outline-none focus:border-primary-400 transition-colors"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-label="Password"
                />
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <Button type="submit" className="w-full !py-3 !rounded-xl text-lg tracking-wider">
                LOGIN
              </Button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
