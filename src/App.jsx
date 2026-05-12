import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './pages/auth/RegisterPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Đường dẫn mặc định sẽ tự chuyển hướng sang trang đăng ký */}
        <Route path="/" element={<Navigate to="/register" />} />
        
        {/* Định nghĩa đường dẫn cho trang Register */}
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Bạn có thể thêm trang Login sau này tại đây */}
        <Route path="/login" element={<div>Trang Login (Sẽ làm ở bước sau)</div>} />
      </Routes>
    </Router>
  );
}

export default App;