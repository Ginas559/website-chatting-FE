/** Chuẩn hóa MongoDB product id từ object API hoặc chuỗi thuần. */
export const getProductId = (productOrId) => {
    if (productOrId == null || productOrId === '') {
        return '';
    }

    if (typeof productOrId === 'string' || typeof productOrId === 'number') {
        return String(productOrId).trim();
    }

    const raw = productOrId.id ?? productOrId._id;
    if (raw == null) {
        return '';
    }

    if (typeof raw === 'string' || typeof raw === 'number') {
        return String(raw).trim();
    }

    if (typeof raw === 'object' && typeof raw.toString === 'function') {
        const asString = raw.toString();
        if (asString && asString !== '[object Object]') {
            return asString;
        }
    }

    return '';
};
