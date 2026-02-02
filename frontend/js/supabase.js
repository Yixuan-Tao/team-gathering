const SUPABASE_URL = 'https://nfslocwxeizcautcgljz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mc2xvY3d4ZWl6Y2F1dGNnbGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNzI1NzUsImV4cCI6MjA4NDc0ODU3NX0.ijTZI0Gv8I5MjKUgrR23_pEYdlwrjc4VRvOVJ1ERH8I';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_BASE_URL = '/api';

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
