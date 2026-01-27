export function checkAuth() {
    const isAuthenticated = sessionStorage.getItem('manager_auth');
    const overlay = document.getElementById('login-overlay');
    if (isAuthenticated === 'true') {
        overlay.style.display = 'none';
    } else {
        overlay.style.display = 'flex';
    }
}

export function attemptLogin() {
    const password = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('login-error');
    
    // Simple client-side check
    if (password === 'defibrilatör') {
        sessionStorage.setItem('manager_auth', 'true');
        document.getElementById('login-overlay').style.display = 'none';
        errorMsg.style.display = 'none';
        document.getElementById('password-input').value = '';
    } else {
        errorMsg.style.display = 'block';
    }
}

export function logout() {
    sessionStorage.removeItem('manager_auth');
    location.reload();
}
