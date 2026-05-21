const CART_STORAGE_KEY = 'doan_cart_items';

const readCart = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeCart = (items) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:updated'));
};

export const getCartItems = () => readCart();

export const getCartCount = () => readCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);

export const addToCart = (product, qty = 1) => {
    const safeQty = Math.max(1, Number(qty || 1));
    const items = readCart();
    const productId = String(product.id || product._id || product.slug);

    const existingIndex = items.findIndex((item) => String(item.id) === productId);

    if (existingIndex >= 0) {
        const current = items[existingIndex];
        const maxStock = Number(product.stock || current.stock || 9999);
        items[existingIndex] = {
            ...current,
            qty: Math.min(maxStock, Number(current.qty || 1) + safeQty),
        };
    } else {
        items.push({
            id: productId,
            slug: product.slug || '',
            name: product.name || '',
            brand: product.brand || '',
            category: product.category || '',
            image: product.images?.[0] || product.image || '',
            price: Number(product.price || 0),
            oldPrice: Number(product.oldPrice || 0),
            stock: Number(product.stock || 0),
            qty: safeQty,
        });
    }

    writeCart(items);
    return items;
};

export const updateCartQty = (id, qty) => {
    const items = readCart();
    const nextQty = Math.max(1, Number(qty || 1));

    const nextItems = items.map((item) => {
        if (String(item.id) !== String(id)) return item;
        const maxStock = Number(item.stock || 9999);
        return {
            ...item,
            qty: Math.min(maxStock, nextQty),
        };
    });

    writeCart(nextItems);
    return nextItems;
};

export const removeFromCart = (id) => {
    const nextItems = readCart().filter((item) => String(item.id) !== String(id));
    writeCart(nextItems);
    return nextItems;
};

export const clearCart = () => {
    writeCart([]);
};
