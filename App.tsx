
import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import { User } from './types';
import { initializeData } from './utils/mockApi';

// Initialize mock data on first load
initializeData();

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for logged in user in local storage for persistence across tabs/browsers
    try {
      const loggedInUser = localStorage.getItem('currentUser');
      if (loggedInUser) {
        setCurrentUser(JSON.parse(loggedInUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('currentUser');
    }
    setLoading(false);
  }, []);

  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
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
