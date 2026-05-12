import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const GuestRoute = ({ children }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    if (!isAuthenticated) {
        return children;
    }

    if (user?.roleId === 'R1') {
        return <Navigate to="/admin/profile" />;
    }

    if (user?.roleId === 'R3') {
        return <Navigate to="/moderator/profile" />;
    }

    return <Navigate to="/user/profile" />;
};

export default GuestRoute;
