import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import RegisterPage from './pages/auth/RegisterPage';
import LoginPage from './pages/LoginPage';
import UserProfilePage from './pages/UserProfilePage';
import AdminProfilePage from './pages/AdminProfilePage';

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/register" />} />
        
        <Route path="/register" element={<RegisterPage />} />
        
        <Route path="/login" element={<LoginPage />} />
        
        <Route 
          path="/user/profile" 
          element={isAuthenticated ? <UserProfilePage /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/admin/profile" 
          element={isAuthenticated ? <AdminProfilePage /> : <Navigate to="/login" />} 
        />
        
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;