/**
 * Auth wrapper — uses Supabase when configured, falls back to localStorage auth.
 * Local mode pre-seeds a super admin account.
 */
const Auth = (() => {
    'use strict';

    let supabase = null;
    let useLocal = false;
    const LOCAL_USERS_KEY = 'cv_auth_users';
    const LOCAL_SESSION_KEY = 'cv_auth_session';
    let _authChangeCallback = null;

    // ── Pre-seeded admin account ──
    // Password is base64-encoded to avoid plain-text exposure in source.
    // Decode at runtime only during seed check.
    const _SA = { i: 'admin-001', e: 'aGVubmllLm1vaGxhdHN3YUBnemljYW4uY29t', p: 'SGVubmllNkA=', n: 'QWRtaW4=', r: 'super_admin' };
    function _d(b) { try { return atob(b); } catch { return ''; } }

    function isPlaceholder() {
        return !APP_CONFIG.SUPABASE_URL || APP_CONFIG.SUPABASE_URL.includes('YOUR_PROJECT');
    }

    function init() {
        // If credentials are real, try Supabase
        if (!isPlaceholder() && typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            try {
                supabase = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
                useLocal = false;
                return true;
            } catch (e) {
                console.warn('Supabase init failed, falling back to local auth:', e);
            }
        }

        // Fall back to localStorage auth
        useLocal = true;
        _seedAdmin();
        console.info('Running in local auth mode (no Supabase configured)');
        return true;
    }

    function getClient() {
        return supabase; // null in local mode
    }

    function isLocalMode() {
        return useLocal;
    }

    // ── Local storage helpers ──
    function _getUsers() {
        try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || []; }
        catch { return []; }
    }

    function _saveUsers(users) {
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    }

    function _getLocalSession() {
        try { return JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY)); }
        catch { return null; }
    }

    function _saveLocalSession(user) {
        const session = {
            user: {
                id: user.id,
                email: user.email,
                user_metadata: { full_name: user.full_name, role: user.role || 'user' }
            },
            access_token: 'local_' + Date.now()
        };
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
        return session;
    }

    function _clearLocalSession() {
        localStorage.removeItem(LOCAL_SESSION_KEY);
    }

    function _seedAdmin() {
        const users = _getUsers();
        const email = _d(_SA.e);
        const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!exists) {
            users.push({
                id: _SA.i,
                email: email,
                password: _d(_SA.p),
                full_name: _d(_SA.n),
                role: _SA.r,
                created_at: new Date().toISOString()
            });
            _saveUsers(users);
        }
    }

    // ── Public API ──

    async function signUp(email, password, fullName) {
        if (!useLocal) {
            if (!supabase) throw new Error('Auth not initialised');
            const { data, error } = await supabase.auth.signUp({
                email, password,
                options: { data: { full_name: fullName } }
            });
            if (error) throw error;
            return data;
        }

        // Local mode
        const users = _getUsers();
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            throw new Error('An account with this email already exists.');
        }
        const newUser = {
            id: 'user-' + Date.now(),
            email: email,
            password: password,
            full_name: fullName,
            role: 'user',
            created_at: new Date().toISOString()
        };
        users.push(newUser);
        _saveUsers(users);
        _saveLocalSession(newUser);
        return { user: { id: newUser.id, email: newUser.email } };
    }

    async function signIn(email, password) {
        if (!useLocal) {
            if (!supabase) throw new Error('Auth not initialised');
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return data;
        }

        // Local mode
        const users = _getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
            throw new Error('Invalid login credentials. No account found with this email.');
        }
        if (user.password !== password) {
            throw new Error('Invalid login credentials. Incorrect password.');
        }
        const session = _saveLocalSession(user);
        if (_authChangeCallback) _authChangeCallback('SIGNED_IN', session);
        return session;
    }

    async function signOut() {
        if (!useLocal) {
            if (!supabase) return;
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return;
        }

        // Local mode
        _clearLocalSession();
        if (_authChangeCallback) _authChangeCallback('SIGNED_OUT', null);
    }

    async function getUser() {
        if (!useLocal) {
            if (!supabase) return null;
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        }

        // Local mode
        const session = _getLocalSession();
        return session ? session.user : null;
    }

    async function getSession() {
        if (!useLocal) {
            if (!supabase) return null;
            const { data: { session } } = await supabase.auth.getSession();
            return session;
        }

        // Local mode
        return _getLocalSession();
    }

    function onAuthStateChange(callback) {
        if (!useLocal) {
            if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
            return supabase.auth.onAuthStateChange(callback);
        }

        // Local mode — store callback for manual triggering
        _authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: () => { _authChangeCallback = null; } } } };
    }

    async function resetPassword(email) {
        if (!useLocal) {
            if (!supabase) throw new Error('Auth not initialised');
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/login.html'
            });
            if (error) throw error;
            return { method: 'email' };
        }

        // Local mode: find user, generate temp password, notify via Web3Forms
        const users = _getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) throw new Error('No account found with that email.');
        const tempPass = 'Reset' + Math.random().toString(36).slice(2, 8);
        user.password = tempPass;
        _saveUsers(users);

        // Send temp password via Web3Forms
        if (APP_CONFIG.WEB3FORMS_KEY && !APP_CONFIG.WEB3FORMS_KEY.includes('YOUR_')) {
            var payload = JSON.stringify({
                access_key: APP_CONFIG.WEB3FORMS_KEY,
                subject: 'Password Reset — CV Generator',
                from_name: 'CV Generator',
                to: APP_CONFIG.NOTIFICATION_EMAIL,
                message: 'Password reset requested for: ' + email +
                         '\n\nTemporary password: ' + tempPass +
                         '\n\nPlease sign in and change your password.\n\n' +
                         'If you did not request this, please ignore this email.'
            });
            if (navigator.sendBeacon) {
                navigator.sendBeacon('https://api.web3forms.com/submit',
                    new Blob([payload], { type: 'application/json' }));
            }
        }

        return { method: 'local', tempPass: tempPass };
    }

    return { init, getClient, isLocalMode, signUp, signIn, signOut, resetPassword, getUser, getSession, onAuthStateChange };
})();
