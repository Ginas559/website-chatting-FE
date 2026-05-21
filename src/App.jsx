import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import StoreHomePage from './pages/StoreHomePage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/LoginPage';
import UserProfilePage from './pages/UserProfilePage';
import AdminProfilePage from './pages/AdminProfilePage';
import ModeratorProfilePage from './pages/ModeratorProfilePage';
import AdminManagementPage from './pages/AdminManagementPage';
import ModeratorUsersPage from './pages/ModeratorUsersPage';
import GuestRoute from './components/common/GuestRoute';
import ProductDetailPage from './pages/ProductDetailPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import SearchPage from './pages/SearchPage';
import CartPage from './pages/CartPage';

const getRoleIdFromToken = () => {
  const token = localStorage.getItem('accessToken');

  if (!token) return '';

  try {
    const payload = token.split('.')[1];
    if (!payload) return '';

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded)).roleId || '';
  } catch {
    return '';
  }
};

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const roleId = user?.roleId || getRoleIdFromToken();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(roleId)) {
    if (roleId === 'R3') {
      return <Navigate to="/moderator/users" />;
    }

    return <Navigate to="/user/profile" />;
  }

  return children;
};

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<StoreHomePage />} />
        
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />

        <Route path="/product/:slug" element={<ProductDetailPage />} />
        <Route path="/article/:slug" element={<ArticleDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/cart" element={<CartPage />} />
        
        <Route 
          path="/user/profile" 
          element={isAuthenticated ? <UserProfilePage /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/admin/profile" 
          element={isAuthenticated ? <AdminProfilePage /> : <Navigate to="/login" />} 
        />

        <Route 
          path="/moderator/profile" 
          element={isAuthenticated ? <ModeratorProfilePage /> : <Navigate to="/login" />} 
        />

        <Route 
          path="/management/users" 
          element={
            <ProtectedRoute allowedRoles={['R1']}>
              <AdminManagementPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/moderator/users" 
          element={
            <ProtectedRoute allowedRoles={['R3']}>
              <ModeratorUsersPage />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
