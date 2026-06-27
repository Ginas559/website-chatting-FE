import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageOutlined, SearchOutlined, ShoppingCartOutlined, SnippetsOutlined } from '@ant-design/icons';
import { logoutUser } from '../../redux/slices/authSlice';
import { fetchCart, getCartCount } from '../../util/cart';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationBell from '../common/NotificationBell';
import ToastNotification from '../common/ToastNotification';

const decodeJwtPayload = (token) => {
    if (!token) return {};
    try {
        const payload = token.split('.')[1];
        if (!payload) return {};
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        return JSON.parse(window.atob(padded));
    } catch {
        return {};
    }
};

const Header = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const notificationsProps = useNotifications();

    const [searchValue, setSearchValue] = useState('');
    const [cartCount, setCartCount] = useState(() => getCartCount());
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    const userMenuRef = useRef(null);
    const searchInputRef = useRef(null);

    // Sync search value with URL query param
    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    useEffect(() => {
        const query = searchParams.get('q') || '';
        setSearchValue(query);
    }, [searchParams]);

    // Detect click outside user dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync cart count
    useEffect(() => {
        let isMounted = true;
        const syncCartCount = () => setCartCount(getCartCount());
        const loadCartCount = async () => {
            try {
                await fetchCart();
            } catch {
                // ignore
            } finally {
                if (isMounted) syncCartCount();
            }
        };

        loadCartCount();
        window.addEventListener('cart:updated', syncCartCount);
        window.addEventListener('storage', syncCartCount);

        return () => {
            isMounted = false;
            window.removeEventListener('cart:updated', syncCartCount);
            window.removeEventListener('storage', syncCartCount);
        };
    }, []);

    const member = useMemo(() => {
        const fromLocalStorage = (() => {
            try {
                return JSON.parse(localStorage.getItem('authUser') || '{}');
            } catch {
                return {};
            }
        })();
        const fromToken = decodeJwtPayload(localStorage.getItem('accessToken'));

        return {
            firstName: user?.firstName || fromLocalStorage?.firstName || fromToken?.firstName || '',
            lastName: user?.lastName || fromLocalStorage?.lastName || fromToken?.lastName || '',
            email: user?.email || fromLocalStorage?.email || fromToken?.email || '',
            roleId: user?.roleId || fromLocalStorage?.roleId || fromToken?.roleId || '',
        };
    }, [user]);

    const memberName = `${member.firstName} ${member.lastName}`.trim();

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const onSubmitSearch = (event) => {
        event.preventDefault();
        if (searchValue.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`);
        } else {
            navigate('/search');
        }
    };

    const navLinks = useMemo(() => [
        { label: 'Điện thoại', path: '/search?category=Điện%20thoại' },
        { label: 'Laptop', path: '/search?category=Laptop' },
        { label: 'Phụ kiện', path: '/search?category=Phụ%20kiện' },
        { label: 'Khuyến mãi', path: '/#khuyen-mai' },
        { label: 'Tin công nghệ', path: '/#tin-tuc', hideOnLg: true },
        ...(isAuthenticated ? [{ label: 'Livestream', path: '/livestream', hideOnLg: true }] : []),
    ], [isAuthenticated]);

    const isLinkActive = (path) => {
        if (path.startsWith('/#')) {
            return location.pathname === '/' && location.hash === path.substring(1);
        }
        try {
            return decodeURIComponent(location.pathname + location.search) === decodeURIComponent(path);
        } catch {
            return location.pathname + location.search === path;
        }
    };

    const handleNavClick = useCallback((e, link) => {
        if (!link.path.startsWith('/#')) return;
        e.preventDefault();
        const hash = link.path.substring(1); // e.g. "#khuyen-mai" or "#tin-tuc"
        const sectionId = hash.substring(1); // e.g. "khuyen-mai" or "tin-tuc"

        if (location.pathname === '/') {
            // Already on homepage → just scroll and update hash silently
            const el = document.getElementById(sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            navigate('/' + hash, { replace: true });
        } else {
            // Navigate to homepage with hash
            navigate('/' + hash);
        }
    }, [location.pathname, navigate]);

    return (
        <>
            <header className="sticky top-0 z-40 w-full border-b border-border-color bg-brand-bg/95 backdrop-blur-md">
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-6 gap-2 md:gap-3">
                    
                    {/* Left Brand and Hamburger Block */}
                    <div className="flex items-center gap-2 md:gap-3.5 lg:gap-4 xl:gap-5 flex-shrink-0">
                        {/* Mobile Hamburger Button */}
                        <button 
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            type="button"
                            className="grid h-9 w-9 place-items-center rounded-full text-brand-dark hover:bg-black/5 lg:hidden flex-shrink-0"
                            aria-label="Menu"
                        >
                            {mobileMenuOpen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>

                        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xl md:text-2xl font-black tracking-tight text-brand-red font-sans flex-shrink-0">SmartZone</span>
                        </Link>

                        {/* Desktop Navigation Links */}
                        <nav className="hidden items-center lg:flex lg:gap-2.5 xl:gap-3.5 flex-shrink-0">
                            {navLinks.map((link) => {
                                const active = isLinkActive(link.path);
                                return (
                                    <Link
                                        key={link.label}
                                        to={link.path}
                                        onClick={(e) => handleNavClick(e, link)}
                                        className={`relative text-xs xl:text-sm font-medium transition duration-200 py-1 hover:text-brand-red whitespace-nowrap flex-shrink-0 ${
                                            link.hideOnLg ? 'hidden xl:inline-block' : 'inline-block'
                                        } ${
                                            active ? 'text-brand-red font-semibold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-brand-red' : 'text-brand-dark'
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 min-w-[120px] md:min-w-[150px] max-w-[200px] xl:max-w-[240px] mx-1 md:mx-2">
                        <form 
                            onSubmit={onSubmitSearch} 
                            onClick={() => searchInputRef.current?.focus()}
                            className="relative flex h-9 w-full items-center rounded-full bg-[#EEEEEE] px-3 md:px-4 text-brand-gray cursor-text transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-red/20 border border-transparent focus-within:border-brand-red/35"
                        >
                            <SearchOutlined className="text-xs md:text-sm flex-shrink-0" />
                            <input
                                ref={searchInputRef}
                                value={searchValue}
                                onChange={(event) => setSearchValue(event.target.value)}
                                placeholder="Tìm kiếm..."
                                className="w-full flex-1 min-w-0 bg-transparent pl-1.5 md:pl-2 text-xs md:text-sm text-brand-dark outline-none placeholder:text-brand-gray"
                            />
                        </form>
                    </div>

                    {/* Trailing Actions */}
                    <div className="flex items-center gap-1 md:gap-1.5 xl:gap-2 flex-shrink-0">
                        
                        {/* Quick links & Cart & Bell */}
                        <div className="flex items-center gap-1 md:gap-1.5 xl:gap-2 flex-shrink-0">
                            {isAuthenticated && (
                                <>
                                    <Link to="/chat" className="hidden md:grid h-8 w-8 lg:h-9 lg:w-9 xl:h-9 xl:w-9 place-items-center rounded-full border border-border-color bg-white text-brand-dark transition hover:bg-brand-bg hover:text-brand-red flex-shrink-0" title="Tin nhắn">
                                        <MessageOutlined className="text-xs lg:text-sm xl:text-base" />
                                    </Link>

                                    <Link to="/orders" className="hidden md:grid h-8 w-8 lg:h-9 lg:w-9 xl:h-9 xl:w-9 place-items-center rounded-full border border-border-color bg-white text-brand-dark transition hover:bg-brand-bg hover:text-brand-red flex-shrink-0" title="Đơn hàng">
                                        <SnippetsOutlined className="text-xs lg:text-sm xl:text-base" />
                                    </Link>
                                </>
                            )}

                            {/* Notification & Cart Badges */}
                            <div className="flex items-center gap-1 md:gap-1.5 border-l border-border-color pl-1.5 md:pl-2 xl:pl-2.5 flex-shrink-0">
                                {/* Cart Button */}
                                <Link to="/cart" className="relative grid h-8 w-8 lg:h-9 lg:w-9 xl:h-9 xl:w-9 place-items-center rounded-full text-brand-dark transition hover:bg-brand-bg hover:text-brand-red flex-shrink-0">
                                    <ShoppingCartOutlined className="text-lg lg:text-xl" />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 md:h-5 md:min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-[9px] md:text-[10px] font-bold text-white">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>

                                {/* Notification Bell */}
                                {isAuthenticated && <div className="flex-shrink-0 scale-90 lg:scale-95"><NotificationBell {...notificationsProps} /></div>}
                            </div>
                        </div>

                        {/* User Account / Profile Dropdown on the far right */}
                        <div className="flex items-center flex-shrink-0 border-l border-border-color pl-1.5 md:pl-2 xl:pl-2.5">
                            {!isAuthenticated ? (
                                <div className="flex items-center gap-1 xl:gap-1.5 flex-shrink-0">
                                    <Link to="/login" className="rounded-lg px-2 py-1 text-xs xl:text-sm font-medium text-brand-dark transition hover:bg-black/5 whitespace-nowrap flex-shrink-0">
                                        Đăng nhập
                                    </Link>
                                    <Link to="/register" className="rounded-lg bg-brand-red px-2.5 py-1 text-xs xl:text-sm font-medium text-white shadow-md shadow-brand-red/20 transition hover:bg-brand-red-hover hover:shadow-lg whitespace-nowrap flex-shrink-0">
                                        Đăng ký
                                    </Link>
                                </div>
                            ) : (
                                <div className="relative flex-shrink-0" ref={userMenuRef}>
                                    <button 
                                        onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                        type="button" 
                                        className="flex items-center gap-1.5 rounded-xl border border-brand-red/15 bg-brand-red/5 px-2.5 py-1.5 text-left hover:bg-brand-red/10 transition-all flex-shrink-0 cursor-pointer"
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-wider text-white bg-brand-red px-1.5 py-0.5 rounded">TV</span>
                                        <span className="hidden md:inline text-xs font-bold text-brand-dark max-w-[80px] truncate">{memberName || member.email}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-brand-gray transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Box */}
                                    {userDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                                            <div className="px-2.5 py-2">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-red">Thành viên</p>
                                                <p className="text-xs font-bold text-slate-800 truncate">{memberName}</p>
                                                <p className="text-[11px] text-slate-500 truncate">{member.email}</p>
                                            </div>
                                            <div className="h-[1px] bg-slate-100 my-1"></div>
                                            <Link 
                                                to="/user/profile" 
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-red transition-all"
                                            >
                                                👤 Xem thông tin cá nhân
                                            </Link>
                                            <Link 
                                                to="/chat" 
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-red transition-all"
                                            >
                                                💬 Tin nhắn hỗ trợ
                                            </Link>
                                            <Link 
                                                to="/orders" 
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-red transition-all"
                                            >
                                                📦 Đơn hàng của tôi
                                            </Link>
                                            <div className="h-[1px] bg-slate-100 my-1"></div>
                                            <button 
                                                onClick={() => {
                                                    setUserDropdownOpen(false);
                                                    handleLogout();
                                                }}
                                                type="button"
                                                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all text-left"
                                            >
                                                🚪 Đăng xuất
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Mobile/Tablet Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="border-t border-border-color bg-white lg:hidden">
                        <nav className="flex flex-col p-4 gap-2.5">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.label}
                                    to={link.path}
                                    onClick={(e) => { handleNavClick(e, link); setMobileMenuOpen(false); }}
                                    className="rounded-xl px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-bg hover:text-brand-red transition-all text-left"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            {isAuthenticated && (
                                <div className="mt-2 border-t border-border-color pt-3 flex flex-col gap-2">
                                    <Link
                                        to="/chat"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-bg hover:text-brand-red transition-all text-left"
                                    >
                                        <MessageOutlined /> Tin nhắn
                                    </Link>
                                    <Link
                                        to="/orders"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-bg hover:text-brand-red transition-all text-left"
                                    >
                                        <SnippetsOutlined /> Đơn hàng
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            handleLogout();
                                        }}
                                        type="button"
                                        className="mt-1 w-full rounded-xl bg-brand-dark py-2.5 text-sm font-semibold text-white transition hover:bg-black/80 text-center"
                                    >
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </nav>
                    </div>
                )}
            </header>
            <ToastNotification toastMessage={notificationsProps.toastMessage} setToastMessage={notificationsProps.setToastMessage} />
        </>
    );
};

export default Header;
