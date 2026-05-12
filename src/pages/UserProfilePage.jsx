import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, logoutUser } from '../redux/slices/authSlice';
import ProfileCard from '../components/common/ProfileCard';

const UserProfilePage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, profileLoading, profileError } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(fetchUserProfile());
    }, [dispatch]);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    return (
        <ProfileCard
            title="User Profile"
            roleLabel="User (R2)"
            roleAccentClass="bg-gradient-to-br from-indigo-500 to-blue-500"
            loading={profileLoading}
            error={profileError}
            email={user?.email}
            footerText="Trang này sẽ được phát triển bởi thành viên khác."
            onLogout={handleLogout}
            icon={(
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
            )}
        />
    );
};

export default UserProfilePage;