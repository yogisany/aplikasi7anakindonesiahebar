import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import { User } from './types';
import { auth, db } from './utils/firebase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // FIX: Changed to v8 compat syntax `auth.onAuthStateChanged` to resolve module export error.
    const unsubscribe = auth.onAuthStateChanged(async (userAuth) => {
      if (userAuth) {
        // Pengguna login, ambil data profil dari Firestore
        try {
          // FIX: Changed Firestore call to v8 compat syntax.
          const userDocRef = db.collection('users').doc(userAuth.uid);
          const userDoc = await userDocRef.get();
          if (userDoc.exists) {
            const userData = userDoc.data() as Omit<User, 'id'>;
            setCurrentUser({ id: userAuth.uid, ...userData });
          } else {
            console.error("Profil pengguna tidak ditemukan di Firestore. Sesi logout dimulai.");
            await auth.signOut();
            setCurrentUser(null);
          }
        } catch (error) {
           console.error("Gagal mengambil profil pengguna:", error);
           await auth.signOut();
           setCurrentUser(null);
        }
      } else {
        // Pengguna logout
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      setCurrentUser(null);
    } catch (error) {
      console.error("Gagal saat logout:", error);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary-50">
        <div className="text-primary-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="bg-primary-50 min-h-screen">
      {currentUser.role === 'admin' && <AdminDashboard user={currentUser} onLogout={handleLogout} />}
      {currentUser.role === 'teacher' && <TeacherDashboard user={currentUser} onLogout={handleLogout} />}
    </div>
  );
};

export default App;
