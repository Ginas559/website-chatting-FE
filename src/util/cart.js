import axios from './axios.customize';

const CART_CACHE_KEY = 'doan_cart_snapshot';

const emptyCartSnapshot = () => ({
    cartId: null,
    userId: null,
    items: [],
    totalItems: 0,
    totalQuantity: 0,
    subtotal: 0,
    pagination: null,
});

const safeParse = (value, fallback) => {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const readSnapshot = () => {
    const cached = safeParse(localStorage.getItem(CART_CACHE_KEY) || 'null', null);

    if (!cached || typeof cached !== 'object') {
        return emptyCartSnapshot();
    }

    return {
        ...emptyCartSnapshot(),
        ...cached,
        items: Array.isArray(cached.items) ? cached.items : [],
    };
};

const emitCartUpdated = () => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent('cart:updated'));
};

const writeSnapshot = (snapshot) => {
    const nextSnapshot = {
        ...emptyCartSnapshot(),
        ...snapshot,
        items: Array.isArray(snapshot?.items) ? snapshot.items : [],
        totalItems: Number(snapshot?.totalItems ?? snapshot?.items?.length ?? 0),
        totalQuantity: Number(snapshot?.totalQuantity ?? 0),
        subtotal: Number(snapshot?.subtotal ?? 0),
    };

    localStorage.setItem(CART_CACHE_KEY, JSON.stringify(nextSnapshot));
    emitCartUpdated();

    return nextSnapshot;
};

const normalizeItem = (item) => {
    const snapshot = item?.snapshot || {};
    const quantity = Number(item?.quantity ?? item?.qty ?? 0);
    const unitPrice = Number(item?.unitPrice ?? snapshot.price ?? 0);

    return {
        id: item?.id || item?.cartItemId || item?._id || item?.productId || null,
        cartItemId: item?.cartItemId || item?._id || item?.id || null,
        productId: item?.productId || item?.product?._id || null,
        quantity,
        qty: quantity,
        unitPrice,
        lineTotal: Number(item?.lineTotal ?? unitPrice * quantity),
        snapshot: {
            name: snapshot.name || item?.name || item?.product?.name || '',
            image: snapshot.image || item?.image || item?.product?.image || '',
            price: Number(snapshot.price ?? item?.price ?? unitPrice ?? 0),
            brand: snapshot.brand || item?.brand || item?.product?.brand || '',
        },
        availability: item?.availability || {
            inStock: true,
            stock: null,
            remainingToIncrease: null,
            canIncrease: true,
        },
        product: item?.product || null,
    };
};

const normalizeCartData = (payload) => {
    const data = payload?.data || payload || {};
    const items = Array.isArray(data.items) ? data.items.map(normalizeItem) : [];
    const totalItems = Number(data.totalItems ?? items.length);
    const totalQuantity = Number(data.totalQuantity ?? items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
    const subtotal = Number(data.subtotal ?? items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0));

    return {
        cartId: data.cartId ?? null,
        userId: data.userId ?? null,
        items,
        totalItems,
        totalQuantity,
        subtotal,
        pagination: data.pagination || null,
    };
};

const isSuccessResponse = (payload) => payload?.success === true || payload?.errCode === 0;

const handleApiResponse = (payload) => {
    if (!isSuccessResponse(payload)) {
        throw payload;
    }

    return writeSnapshot(normalizeCartData(payload));
};

export const getCartSnapshot = () => readSnapshot();

export const getCartItems = () => readSnapshot().items;

export const getCartCount = () => readSnapshot().totalQuantity;

export const getCartSubtotal = () => readSnapshot().subtotal;

export const fetchCart = async (params = {}) => {
    const response = await axios.get('cart', { params });
    return handleApiResponse(response);
};

export const addToCart = async (product, qty = 1) => {
    const productId = product?.id || product?._id || product?.productId;
    const response = await axios.post('cart/items', {
        productId,
        quantity: qty,
    });

    return handleApiResponse(response);
};

export const updateCartQty = async (productId, qty) => {
    const response = await axios.patch(`cart/items/${productId}`, {
        quantity: qty,
    });

    return handleApiResponse(response);
};

export const removeFromCart = async (productId) => {
    const response = await axios.delete(`cart/items/${productId}`);
    return handleApiResponse(response);
};

export const clearCart = async () => {
    const response = await axios.delete('cart');
    return handleApiResponse(response);
};

export const setCartSnapshot = (snapshot) => writeSnapshot(snapshot);

export const resetCartCache = () => writeSnapshot(emptyCartSnapshot());
