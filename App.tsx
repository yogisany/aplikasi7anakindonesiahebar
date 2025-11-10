
import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import { User } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize mock data if it doesn't exist
    if (!localStorage.getItem('users')) {
      const initialUsers: User[] = [
        { id: 'admin01', username: 'admin', password: 'password', role: 'admin', name: 'Admin Utama' },
        { id: 'teacher01', username: 'guru1', password: 'password', role: 'teacher', name: 'Budi S.', nip: '198001012010011001', kelas: '4A' },
        { id: 'teacher02', username: 'guru2', password: 'password', role: 'teacher', name: 'Ani W.', nip: '198502022012022002', kelas: '4B' },
      ];
      localStorage.setItem('users', JSON.stringify(initialUsers));
    }
    if (!localStorage.getItem('students')) {
        localStorage.setItem('students', JSON.stringify([]));
    }
    if (!localStorage.getItem('habit_records')) {
        localStorage.setItem('habit_records', JSON.stringify([]));
    }

    // Check for logged in user in session storage
    const loggedInUser = sessionStorage.getItem('currentUser');
    if (loggedInUser) {
      setCurrentUser(JSON.parse(loggedInUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
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