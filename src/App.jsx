import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import { WalletProvider } from './contexts/WalletContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}


function Header() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return <Navbar />;
}

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <BrowserRouter>
          <div className="min-h-screen">
            <Header />
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
