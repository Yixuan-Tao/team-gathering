// 确保先加载config.js
if (typeof CONFIG === 'undefined') {
    throw new Error('config.js not loaded');
}

const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const API_BASE_URL = CONFIG.API_BASE_URL;

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: '请求失败' }));
        throw new Error(error.message || '请求失败');
    }

    return response.json();
}

async function searchNearby(lat, lng, types, keyword = '') {
    return apiRequest('/search-nearby', {
        method: 'POST',
        body: JSON.stringify({ lat, lng, types, keyword }),
    });
}

async function getDirection(origin, destination, mode = 'driving') {
    return apiRequest('/direction', {
        method: 'POST',
        body: JSON.stringify({ origin, destination, mode }),
    });
}
