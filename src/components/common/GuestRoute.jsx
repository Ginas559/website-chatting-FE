import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const GuestRoute = ({ children }) => {
    const isAuthenticated = useSelector(state => state.user.isAuthenticated);
    return !isAuthenticated ? children : <Navigate to="/home" />;
};

export default GuestRoute;