import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import StoreHomePage from './pages/StoreHomePage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/LoginPage';
import UserProfilePage from './pages/UserProfilePage';
import GuestRoute from './components/common/GuestRoute';
import ProductDetailPage from './pages/ProductDetailPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import SearchPage from './pages/SearchPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import VnpayReturnPage from './pages/VnpayReturnPage';
import OrdersPage from './pages/OrdersPage';

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
        <Route path="/checkout" element={isAuthenticated ? <CheckoutPage /> : <Navigate to="/login" replace />} />
        <Route path="/orders" element={isAuthenticated ? <OrdersPage /> : <Navigate to="/login" replace />} />
        <Route path="/vnpay-return" element={<VnpayReturnPage />} />

        <Route
          path="/user/profile"
          element={isAuthenticated ? <UserProfilePage /> : <Navigate to="/login" replace />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
