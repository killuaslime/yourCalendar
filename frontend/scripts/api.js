const API_URL = "https://functionality-lifetime-possibly-inexpensive.trycloudflare.com";
const ACCESS_TOKEN_KEY = "yourCalendarAccessToken";

function getAccessToken() {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

async function apiFetch(path, options = {}) {
    const accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error("Authentication required");
    }

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    if (response.status === 204) return null;

    return response.json();
}
