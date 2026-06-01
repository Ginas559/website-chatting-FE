import { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFavoriteProductIds } from '../redux/slices/authSlice';
import { toggleFavoriteProductApi } from '../util/api';
import { getProductId } from '../util/productId';

const normalizeFavoriteIds = (user) => {
    if (!user) return [];
    const ids = Array.isArray(user.favoriteProductIds)
        ? user.favoriteProductIds
        : Array.isArray(user.favoriteProducts)
            ? user.favoriteProducts
            : [];
    return [...new Set(ids.map((id) => String(id)).filter(Boolean))];
};

const isSuccessResponse = (response) => {
    if (!response) return false;
    if (response.errCode === 0) return true;
    if (response.success === true && response.data) return true;
    return false;
};

export const useFavorites = () => {
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [loadingMap, setLoadingMap] = useState({});

    const pendingRef = useRef(new Set());

    const favoriteIds = useMemo(() => normalizeFavoriteIds(user), [user]);
    const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

    const isFavorite = useCallback((productOrId) => {
        const key = getProductId(productOrId);
        if (!key) return false;
        return favoriteIdSet.has(key);
    }, [favoriteIdSet]);

    const syncFavoriteIds = useCallback((ids) => {
        dispatch(setFavoriteProductIds(ids));
        window.dispatchEvent(new Event('favorites:updated'));
    }, [dispatch]);

    const toggleFavorite = useCallback(async (productOrId, onRequireLogin) => {
        const key = getProductId(productOrId);
        if (!key) {
            return { error: 'Không xác định được mã sản phẩm' };
        }

        if (!isAuthenticated) {
            if (typeof onRequireLogin === 'function') onRequireLogin();
            return { error: 'LOGIN_REQUIRED' };
        }

        if (pendingRef.current.has(key)) {
            return null;
        }

        pendingRef.current.add(key);
        setLoadingMap((current) => ({ ...current, [key]: true }));

        try {
            const response = await toggleFavoriteProductApi(key);

            if (isSuccessResponse(response) && response.data) {
                const ids = response.data.favoriteProductIds
                    || (Array.isArray(response.data.favoriteProducts)
                        ? response.data.favoriteProducts.map((item) => getProductId(item)).filter(Boolean)
                        : []);

                syncFavoriteIds(ids);
                return response.data;
            }

            const message = response?.errMessage || response?.message || 'Không thể cập nhật sản phẩm yêu thích';
            throw new Error(message);
        } catch (error) {
            const message = error?.errMessage
                || error?.message
                || (typeof error === 'string' ? error : 'Không thể cập nhật sản phẩm yêu thích');

            return { error: message };
        } finally {
            pendingRef.current.delete(key);
            setLoadingMap((current) => ({ ...current, [key]: false }));
        }
    }, [isAuthenticated, syncFavoriteIds]);

    return {
        isAuthenticated,
        favoriteIds,
        isFavorite,
        toggleFavorite,
        loadingMap,
    };
};

export default useFavorites;
