
import { useEffect, useState } from 'react';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useAuthData } from '@neondatabase/neon-js/auth/react';
import { authClient, getAuthToken } from './lib/auth';
import { Account } from './pages/Account';
import { Auth } from './pages/Auth';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { RegisterClub } from './pages/RegisterClub';
import { Toaster } from 'sonner';

export default function App() {
  const { data: session, isPending } = useAuthData({ queryFn: () => authClient.getSession() });
  const navigate = useNavigate();
  const location = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      if (session && !isSyncing && !isPending) {
        setIsSyncing(true);
        try {
          const token = await getAuthToken(session);
          if (!token) {
            console.warn('No token found in session object:', session);
            setIsSyncing(false);
            return;
          }
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const userData = await res.json();
          
          // Role-based redirection logic
          if (location.pathname.startsWith('/auth')) {
            if (userData.role === 'ADMIN' || userData.role === 'SUPER_ADMIN') {
              navigate('/admin');
            } else if (userData.status === 'PENDING_APPROVAL' || userData.status === 'REJECTED') {
              navigate('/register-club');
            } else {
              // For fans, redirect back to home or where they were
              navigate('/');
            }
          }
        } catch (err) {
          console.error('Sync failed', err);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    syncUser();
  }, [session, navigate, location.pathname]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/register-club" element={<RegisterClub />} />
        <Route path="/auth/*" element={<Auth />} />
        <Route path="/account/*" element={<Account />} />
      </Routes>
    </>
  );
}
