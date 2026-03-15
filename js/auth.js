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

    // ── Super admin accounts ──
    const ADMIN_EMAIL = 'mohlatswa96@gmail.com';
    const ADMIN_NAME = 'Hennie Mohlatswa';
    const ADMIN_EMAILS = ['mohlatswa96@gmail.com', 'hennie.mohlatswa@outlook.com'];

    // ── Password hashing (SHA-256 via Web Crypto API) ──
    // Note: For production, use bcrypt/scrypt on a real server.
    // This is a significant improvement over plaintext but not as
    // strong as bcrypt due to lack of salting/key stretching.
    async function _hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + '_revampmycv_salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ── Cryptographic token generation ──
    function _generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }

    // ── Secure temporary password generation ──
    function _generateTempPassword() {
        const array = new Uint8Array(12);
        crypto.getRandomValues(array);
        return 'R' + Array.from(array, b => b.toString(36)).join('').slice(0, 15);
    }

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
            access_token: 'local_' + _generateToken()
        };
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
        return session;
    }

    function _clearLocalSession() {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        // Also clear Supabase auth tokens (stored as sb-<ref>-auth-token)
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) { /* ignore */ }
    }

    function _seedAdmin() {
        let users = _getUsers();

        // Seed all admin accounts
        ADMIN_EMAILS.forEach((email, idx) => {
            const id = 'admin-' + String(idx + 1).padStart(3, '0');
            const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (!existing) {
                users.push({
                    id: id,
                    email: email,
                    password: null,          // No password yet — must be set on first login
                    full_name: ADMIN_NAME,
                    role: 'super_admin',
                    needsSetup: true,
                    created_at: new Date().toISOString()
                });
            } else if (existing.role !== 'super_admin') {
                // Ensure existing account has super_admin role
                existing.role = 'super_admin';
            }
        });
        _saveUsers(users);
    }

    function adminNeedsSetup() {
        if (!useLocal) return false;
        const users = _getUsers();
        return ADMIN_EMAILS.some(email => {
            const admin = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            return admin && admin.needsSetup === true;
        });
    }

    /** Check if a specific email needs admin setup */
    function emailNeedsSetup(email) {
        if (!useLocal) return false;
        const users = _getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        return user && user.needsSetup === true;
    }

    async function completeAdminSetup(password, email) {
        if (!useLocal) return false;
        const users = _getUsers();
        // Find admin by email if provided, otherwise find any admin needing setup
        let admin;
        if (email) {
            admin = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        } else {
            admin = users.find(u => ADMIN_EMAILS.includes(u.email.toLowerCase()) && u.needsSetup);
        }
        if (!admin) return false;
        admin.password = await _hashPassword(password);
        admin.needsSetup = false;
        _saveUsers(users);
        return true;
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
            id: 'user-' + _generateToken().slice(0, 16),
            email: email,
            password: await _hashPassword(password),
            full_name: fullName,
            role: 'user',
            verified: false,
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
        const genericError = 'Invalid login credentials. Please check your email and password.';
        if (!user) {
            // Hash anyway to prevent timing attacks
            await _hashPassword(password);
            throw new Error(genericError);
        }
        if (user.suspended) {
            throw new Error('Your account has been suspended. Please contact support.');
        }
        if (user.needsSetup) {
            throw new Error('NEEDS_SETUP');
        }
        const hashedInput = await _hashPassword(password);
        if (user.password === hashedInput) {
            // Hashed password matches — normal login
        } else if (user.password === password) {
            // Legacy plaintext password — migrate to hashed on successful login
            user.password = hashedInput;
            _saveUsers(users);
        } else {
            throw new Error(genericError);
        }
        const session = _saveLocalSession(user);
        if (_authChangeCallback) _authChangeCallback('SIGNED_IN', session);
        return session;
    }

    async function signOut() {
        // Always clear local data first — ensures sign-out works even if Supabase API fails
        if (typeof CVStorage !== 'undefined') {
            try { CVStorage.clearAll(); } catch (e) {}
        }
        _clearLocalSession();

        if (!useLocal) {
            if (supabase) {
                try {
                    await supabase.auth.signOut();
                } catch (e) {
                    // Supabase API failed — local session already cleared above, so sign-out still works
                    console.warn('Supabase signOut API failed (local session cleared):', e);
                }
            }
        }

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
        if (!user) {
            // Return success anyway to prevent account enumeration
            return { method: 'local', message: 'If an account exists, a reset has been sent.' };
        }
        const tempPass = _generateTempPassword();
        user.password = await _hashPassword(tempPass);
        _saveUsers(users);

        // Send temp password via Web3Forms
        if (APP_CONFIG.WEB3FORMS_KEY && !APP_CONFIG.WEB3FORMS_KEY.includes('YOUR_')) {
            var payload = JSON.stringify({
                access_key: APP_CONFIG.WEB3FORMS_KEY,
                subject: 'Password Reset — Revamp MyCV',
                from_name: 'Revamp MyCV',
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

    /**
     * Get the user's role from the profiles table (Supabase) or session (local).
     * This is the ONLY trusted source for role — never trust user_metadata.role.
     */
    async function getRole() {
        if (!useLocal) {
            if (!supabase) return 'user';
            const user = await getUser();
            if (!user) return 'user';
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                return (data && data.role) ? data.role : 'user';
            } catch {
                return 'user';
            }
        }
        // Local mode — check users array for up-to-date role (not stale session)
        const session = _getLocalSession();
        if (!session) return 'user';
        const users = _getUsers();
        const user = users.find(u => u.id === session.user.id || u.email.toLowerCase() === session.user.email.toLowerCase());
        return user ? (user.role || 'user') : (session.user.user_metadata.role || 'user');
    }

    /**
     * Get the user's profile from the profiles table (Supabase) or session (local).
     */
    async function getProfile() {
        if (!useLocal) {
            if (!supabase) return null;
            const user = await getUser();
            if (!user) return null;
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                return data;
            } catch {
                return null;
            }
        }
        // Local mode
        const session = _getLocalSession();
        return session ? session.user : null;
    }

    return { init, getClient, isLocalMode, signUp, signIn, signOut, resetPassword, getUser, getSession, getRole, getProfile, onAuthStateChange, adminNeedsSetup, emailNeedsSetup, completeAdminSetup };
})();
