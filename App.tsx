import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import { User } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cek sesi login dari localStorage saat aplikasi pertama kali dimuat
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Gagal memuat sesi pengguna:", error);
      localStorage.removeItem('currentUser'); // Hapus data yang korup
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback((user: User) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary-50">
        <div className="text-primary-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="bg-primary-50 min-h-screen">
      {currentUser.role === 'admin' && <AdminDashboard user={currentUser} onLogout={handleLogout} />}
      {currentUser.role === 'teacher' && <TeacherDashboard user={currentUser} onLogout={handleLogout} />}
    </div>
  );
};

export default App;