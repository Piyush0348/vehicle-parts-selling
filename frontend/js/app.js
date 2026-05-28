// Global application helpers for legacy pages
// Exposes `API` and `authHeader()` on window for non-module scripts
(function () {
    const API = 'http://localhost:5033/api';

    function authHeader() {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    }

    // Attach to window for pages that expect globals
    if (typeof window !== 'undefined') {
        window.API = API;
        window.authHeader = authHeader;
    }

    // Also export for module consumers (if any)
    try {
        if (typeof module !== 'undefined') module.exports = { API, authHeader };
    } catch { }

})();
