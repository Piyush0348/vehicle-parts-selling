function decodeBase64Url(input) {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat(
        (4 - (normalized.length % 4)) % 4
    );
    return atob(padded);
}

function parseToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
        return JSON.parse(decodeBase64Url(parts[1]));
    } catch {
        return null;
    }
}

const RBAC = {
    getToken() {
        return localStorage.getItem('token');
    },

    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    getUserId() {
        const payload = parseToken();
        if (!payload) return '';

        // Your JWT uses "nameid" directly
        const id =
            payload.nameid ||
            payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
            payload.sub ||
            '';

        console.log("RBAC.getUserId() →", id);
        return id;
    },

    getUserRole() {
        const payload = parseToken();
        if (!payload) return 'Customer';

        return payload.role ||
               payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
               'Customer';
    },

    getUserName() {
        const payload = parseToken();
        if (!payload) return '';

        const email =
            payload.email ||
            payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
            '';

        if (email) return email.split('@')[0];
        return this.getUserRole();
    }
};

export default RBAC;