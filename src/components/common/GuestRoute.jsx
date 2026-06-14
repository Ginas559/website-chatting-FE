import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const GuestRoute = ({ children }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    if (!isAuthenticated) {
        return children;
    }

    if (user?.roleId !== 'R2') {
        return children;
    }

    return <Navigate to="/" />;
};

export default GuestRoute;
