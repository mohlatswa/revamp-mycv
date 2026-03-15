/**
 * Admin page controller — full user CRUD, subscription management, system settings.
 * Only accessible to super_admin users.
 */
(function () {
    'use strict';

    const LOCAL_USERS_KEY = 'cv_auth_users';
    const LOCAL_SUBSCRIPTION_KEY = 'cv_subscription';
    const LOCAL_SUBS_ALL_KEY = 'cv_subscriptions_all';
    const LOCAL_DOWNLOADS_KEY = 'cv_downloads';
    const LOCAL_SETTINGS_KEY = 'cv_admin_settings';

    document.addEventListener('DOMContentLoaded', async () => {
        if (!Auth.init()) { showAccessDenied(); return; }

        const session = await Auth.getSession();
        if (!session) { window.location.replace('login.html'); return; }

        // Check role from profiles table (server-side) — never trust user_metadata
        const role = await Auth.getRole();
        if (role !== 'super_admin') { showAccessDenied(); return; }

        document.getElementById('admin-content').style.display = 'block';

        setupLogout();
        setupTabs();
        setupUserModal();
        setupResetModal();
        setupDeleteModal();
        setupSuspendModal();
        setupSubModal();
        setupSettings();
        setupAuditLog();
        document.getElementById('btn-add-user').addEventListener('click', openAddModal);
        document.getElementById('btn-add-sub').addEventListener('click', openAddSubModal);

        renderUsers();
        renderSubscriptions();
        renderAuditLog();
        loadSettings();
        setupCVDataPanel();
    });

    // ════════════════════════════════════════
    // DATA ACCESS
    // ════════════════════════════════════════

    function getUsers() {
        try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || []; } catch { return []; }
    }
    function saveUsers(users) { localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users)); }

    function getAllSubs() {
        try {
            // Try consolidated store first
            const all = JSON.parse(localStorage.getItem(LOCAL_SUBS_ALL_KEY));
            if (all && all.length) return all;
            // Fall back to single-sub legacy key
            const single = JSON.parse(localStorage.getItem(LOCAL_SUBSCRIPTION_KEY));
            return single ? [single] : [];
        } catch { return []; }
    }
    function _subIntegrity(sub) {
        const fields = (sub.user_id || '') + '|' + (sub.status || '') + '|' + (sub.plan || '') + '|' + (sub.amount || 0) + '|' + (sub.started_at || '');
        let h = 0x1a6b3c;
        const str = 'rmcv_' + fields;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
            h ^= h >>> 15;
        }
        return 'sig_' + (h >>> 0).toString(36);
    }

    function saveAllSubs(subs) {
        localStorage.setItem(LOCAL_SUBS_ALL_KEY, JSON.stringify(subs));
        // Keep legacy key in sync for Subscription module (with integrity signature)
        const active = subs.find(s => s.status === 'active');
        if (active) {
            const signed = { ...active };
            delete signed._sig;
            signed._sig = _subIntegrity(signed);
            localStorage.setItem(LOCAL_SUBSCRIPTION_KEY, JSON.stringify(signed));
        } else {
            localStorage.removeItem(LOCAL_SUBSCRIPTION_KEY);
        }
    }

    function getDownloads() {
        try { return JSON.parse(localStorage.getItem(LOCAL_DOWNLOADS_KEY)) || {}; } catch { return {}; }
    }

    function getSettings() {
        try { return JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY)) || {}; } catch { return {}; }
    }
    function saveSettings(s) { localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(s)); }

    function getUserEmail(userId) {
        const u = getUsers().find(u => u.id === userId);
        return u ? u.email : userId;
    }

    // ════════════════════════════════════════
    // TABS
    // ════════════════════════════════════════

    function setupTabs() {
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.panel).classList.add('active');
            });
        });
    }

    // ════════════════════════════════════════
    // USERS TABLE
    // ════════════════════════════════════════

    function renderUsers() {
        const users = getUsers();
        const subs = getAllSubs();
        const downloads = getDownloads();
        const tbody = document.getElementById('users-tbody');
        const noUsers = document.getElementById('no-users');
        tbody.innerHTML = '';

        if (!users.length) { noUsers.style.display = 'block'; updateStats(); return; }
        noUsers.style.display = 'none';

        users.forEach(user => {
            const tr = document.createElement('tr');
            const created = user.created_at ? new Date(user.created_at).toLocaleDateString('en-ZA') : '—';
            const sub = subs.find(s => s.user_id === user.id);
            const subLabel = sub ? sub.status : 'none';
            const subClass = sub ? 'sub-' + sub.status : 'sub-none';

            const isSuspended = user.suspended === true;
            const statusLabel = isSuspended ? 'Suspended' : 'Active';
            const statusClass = isSuspended ? 'status-suspended' : 'status-active';
            const suspendBtnClass = isSuspended ? 'btn-unsuspend' : 'btn-suspend';
            const suspendBtnLabel = isSuspended ? 'Unsuspend' : 'Suspend';

            const isVerified = user.verified !== false;
            const verifyLabel = isVerified ? 'Verified' : 'Unverified';
            const verifyClass = isVerified ? 'status-active' : 'status-suspended';

            var isSuperAdmin = user.role === 'super_admin';
            var deleteDisabled = isSuperAdmin ? ' disabled title="Super Admin cannot be deleted" style="opacity:0.4;cursor:not-allowed"' : ' title="Delete"';
            var suspendDisabled = isSuperAdmin ? ' disabled title="Super Admin cannot be suspended" style="opacity:0.4;cursor:not-allowed"' : ' title="' + suspendBtnLabel + '"';

            tr.innerHTML =
                '<td><strong>' + esc(user.full_name || '—') + '</strong></td>' +
                '<td>' + esc(user.email) + '</td>' +
                '<td>' + esc(user.phone || '—') + '</td>' +
                '<td><span class="role-badge role-' + (user.role || 'user') + '">' + formatRole(user.role) + '</span></td>' +
                '<td><span class="status-badge ' + statusClass + '">' + statusLabel + '</span>' +
                    ' <span class="status-badge ' + verifyClass + '" style="font-size:0.7rem">' + verifyLabel + '</span></td>' +
                '<td><span class="sub-badge ' + subClass + '">' + subLabel + '</span></td>' +
                '<td>' + created + '</td>' +
                '<td class="actions-cell">' +
                    '<button class="btn-action btn-edit" title="Edit">Edit</button>' +
                    '<button class="btn-action ' + suspendBtnClass + '"' + suspendDisabled + '>' + suspendBtnLabel + '</button>' +
                    '<button class="btn-action btn-reset-pw" title="Reset Password">Reset</button>' +
                    (!isVerified && !isSuperAdmin ? '<button class="btn-action btn-verify" title="Mark as verified">Verify</button>' : '') +
                    '<button class="btn-action btn-delete"' + deleteDisabled + '>Delete</button>' +
                '</td>';

            tr.querySelector('.btn-edit').addEventListener('click', () => openEditModal(user));
            if (!isSuperAdmin) {
                tr.querySelector('.' + suspendBtnClass).addEventListener('click', () => openSuspendModal(user));
            }
            tr.querySelector('.btn-reset-pw').addEventListener('click', () => openResetModal(user));
            const verifyBtn = tr.querySelector('.btn-verify');
            if (verifyBtn) {
                verifyBtn.addEventListener('click', () => {
                    const users = getUsers();
                    const u = users.find(x => x.id === user.id);
                    if (u) { u.verified = true; saveUsers(users); }
                    _audit('user.verify', user.email, 'Email marked as verified');
                    renderUsers();
                    showToast(user.email + ' verified.');
                });
            }
            if (!isSuperAdmin) {
                tr.querySelector('.btn-delete').addEventListener('click', () => openDeleteModal(user));
            }
            tbody.appendChild(tr);
        });

        updateStats();
    }

    function updateStats() {
        const users = getUsers();
        const subs = getAllSubs();
        const downloads = getDownloads();
        let totalDl = 0;
        Object.values(downloads).forEach(c => totalDl += c);

        document.getElementById('stat-total').textContent = users.length;
        document.getElementById('stat-admins').textContent = users.filter(u => u.role === 'super_admin' || u.role === 'admin').length;
        document.getElementById('stat-subscribers').textContent = subs.filter(s => s.status === 'active').length;
        document.getElementById('stat-downloads').textContent = totalDl;
        document.getElementById('stat-suspended').textContent = users.filter(u => u.suspended === true).length;
    }

    function formatRole(r) { return r === 'super_admin' ? 'Super Admin' : r === 'admin' ? 'Admin' : 'User'; }

    // ════════════════════════════════════════
    // USER MODAL (Add / Edit)
    // ════════════════════════════════════════

    function openAddModal() {
        document.getElementById('modal-title').textContent = 'Add User';
        document.getElementById('edit-user-id').value = '';
        document.getElementById('user-name').value = '';
        document.getElementById('user-email').value = '';
        document.getElementById('user-password').value = '';
        document.getElementById('user-role').value = 'user';
        document.getElementById('password-field').style.display = 'block';
        document.getElementById('user-password').required = true;
        hideEl('modal-error');
        showModal('user-modal');
    }

    function openEditModal(user) {
        document.getElementById('modal-title').textContent = 'Edit User';
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('user-name').value = user.full_name || '';
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-password').value = '';
        document.getElementById('user-role').value = user.role || 'user';
        document.getElementById('password-field').style.display = 'none';
        document.getElementById('user-password').required = false;
        hideEl('modal-error');
        showModal('user-modal');
    }

    function setupUserModal() {
        document.getElementById('form-user').addEventListener('submit', (e) => {
            e.preventDefault();
            hideEl('modal-error');

            const id = document.getElementById('edit-user-id').value;
            const name = document.getElementById('user-name').value.trim();
            const email = document.getElementById('user-email').value.trim();
            const password = document.getElementById('user-password').value;
            const role = document.getElementById('user-role').value;

            if (!name || !email) { showEl('modal-error', 'Name and email are required.'); return; }

            const users = getUsers();

            if (id) {
                const idx = users.findIndex(u => u.id === id);
                if (idx === -1) { showEl('modal-error', 'User not found.'); return; }
                if (users.find(u => u.id !== id && u.email.toLowerCase() === email.toLowerCase())) {
                    showEl('modal-error', 'Another user with this email already exists.'); return;
                }
                users[idx].full_name = name;
                users[idx].email = email;
                users[idx].role = role;
            } else {
                if (!password || password.length < 6) { showEl('modal-error', 'Password must be at least 6 characters.'); return; }
                if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
                    showEl('modal-error', 'A user with this email already exists.'); return;
                }
                // Hash password before storing (local mode)
                const encoder = new TextEncoder();
                const pwData = encoder.encode(password + '_revampmycv_salt');
                crypto.subtle.digest('SHA-256', pwData).then(hashBuffer => {
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashedPw = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    users.push({ id: 'user-' + Date.now(), email, password: hashedPw, full_name: name, role, created_at: new Date().toISOString() });
                    saveUsers(users);
                    renderUsers();
                    _audit('user.create', email, 'New user, role: ' + role);
                    showToast('User created.');
                });
                closeModal('user-modal');
                return;
            }

            saveUsers(users);
            closeModal('user-modal');
            renderUsers();
            _audit('user.update', email, 'Role: ' + role);
            showToast('User updated.');
        });
        document.getElementById('btn-cancel-modal').addEventListener('click', () => closeModal('user-modal'));
    }

    // ════════════════════════════════════════
    // RESET PASSWORD MODAL
    // ════════════════════════════════════════

    function openResetModal(user) {
        document.getElementById('reset-user-id').value = user.id;
        document.getElementById('reset-user-label').textContent = 'User: ' + user.email;
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';
        hideEl('reset-error');
        showModal('reset-modal');
    }

    function setupResetModal() {
        document.getElementById('form-reset').addEventListener('submit', (e) => {
            e.preventDefault();
            hideEl('reset-error');
            const id = document.getElementById('reset-user-id').value;
            const pw = document.getElementById('new-password').value;
            const confirm = document.getElementById('confirm-new-password').value;

            if (!pw || pw.length < 6) { showEl('reset-error', 'Password must be at least 6 characters.'); return; }
            if (pw !== confirm) { showEl('reset-error', 'Passwords do not match.'); return; }

            const users = getUsers();
            const idx = users.findIndex(u => u.id === id);
            if (idx === -1) { showEl('reset-error', 'User not found.'); return; }

            // Hash the password before storing (local mode)
            const encoder = new TextEncoder();
            const data = encoder.encode(pw + '_revampmycv_salt');
            crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                users[idx].password = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                saveUsers(users);
                _audit('user.password_reset', users[idx].email, 'Password reset by admin');
                showToast('Password reset for ' + users[idx].email);
            });
            closeModal('reset-modal');
        });
        document.getElementById('btn-cancel-reset').addEventListener('click', () => closeModal('reset-modal'));
    }

    // ════════════════════════════════════════
    // DELETE MODAL
    // ════════════════════════════════════════

    function openDeleteModal(user) {
        // Block deletion of super_admin accounts entirely
        if (user.role === 'super_admin') {
            showToast('Super Admin accounts cannot be deleted.');
            return;
        }
        document.getElementById('delete-user-id').value = user.id;
        document.getElementById('delete-confirm-text').textContent = 'Delete "' + user.email + '"? This cannot be undone.';
        showModal('delete-modal');
    }

    function setupDeleteModal() {
        document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
            const id = document.getElementById('delete-user-id').value;

            // Double-check: prevent deleting super_admin accounts
            const users = getUsers();
            const target = users.find(u => u.id === id);
            if (target && target.role === 'super_admin') {
                closeModal('delete-modal');
                showToast('Super Admin accounts cannot be deleted.');
                return;
            }

            // Prevent deleting your own account
            const currentUser = await Auth.getUser();
            if (currentUser && currentUser.id === id) {
                closeModal('delete-modal');
                showToast('You cannot delete your own account.');
                return;
            }

            const idx = users.findIndex(u => u.id === id);
            if (idx > -1) {
                const deletedEmail = users[idx].email;
                users.splice(idx, 1);
                saveUsers(users);
                // Also remove their subscription
                const subs = getAllSubs().filter(s => s.user_id !== id);
                saveAllSubs(subs);
                _audit('user.delete', deletedEmail, 'User and subscriptions removed');
            }
            closeModal('delete-modal');
            renderUsers();
            renderSubscriptions();
            showToast('User deleted.');
        });
        document.getElementById('btn-cancel-delete').addEventListener('click', () => closeModal('delete-modal'));
    }

    // ════════════════════════════════════════
    // SUSPEND / UNSUSPEND MODAL
    // ════════════════════════════════════════

    function openSuspendModal(user) {
        const isSuspended = user.suspended === true;
        document.getElementById('suspend-user-id').value = user.id;
        document.getElementById('suspend-action').value = isSuspended ? 'unsuspend' : 'suspend';
        document.getElementById('suspend-modal-title').textContent = isSuspended ? 'Unsuspend User' : 'Suspend User';
        document.getElementById('suspend-confirm-text').textContent = isSuspended
            ? 'Unsuspend "' + user.email + '"? They will be able to sign in again.'
            : 'Suspend "' + user.email + '"? They will not be able to sign in.';
        const confirmBtn = document.getElementById('btn-confirm-suspend');
        confirmBtn.textContent = isSuspended ? 'Unsuspend' : 'Suspend';
        confirmBtn.className = isSuspended ? 'btn btn-primary' : 'btn btn-danger';
        showModal('suspend-modal');
    }

    function setupSuspendModal() {
        document.getElementById('btn-confirm-suspend').addEventListener('click', async () => {
            const id = document.getElementById('suspend-user-id').value;
            const action = document.getElementById('suspend-action').value;

            // Prevent suspending yourself
            const currentUser = await Auth.getUser();
            if (currentUser && currentUser.id === id) {
                closeModal('suspend-modal');
                showToast('You cannot suspend your own account.');
                return;
            }

            const users = getUsers();
            const user = users.find(u => u.id === id);
            if (!user) { closeModal('suspend-modal'); return; }

            // Prevent suspending super_admin accounts
            if (action === 'suspend' && user.role === 'super_admin') {
                closeModal('suspend-modal');
                showToast('Super Admin accounts cannot be suspended.');
                return;
            }

            user.suspended = action === 'suspend';
            saveUsers(users);
            closeModal('suspend-modal');
            renderUsers();
            _audit(action === 'suspend' ? 'user.suspend' : 'user.unsuspend', user.email, '');
            showToast(action === 'suspend' ? 'User suspended.' : 'User unsuspended.');
        });
        document.getElementById('btn-cancel-suspend').addEventListener('click', () => closeModal('suspend-modal'));
    }

    // ════════════════════════════════════════
    // SUBSCRIPTIONS TABLE
    // ════════════════════════════════════════

    function renderSubscriptions() {
        const subs = getAllSubs();
        const tbody = document.getElementById('subs-tbody');
        const noSubs = document.getElementById('no-subs');
        tbody.innerHTML = '';

        if (!subs.length) { noSubs.style.display = 'block'; return; }
        noSubs.style.display = 'none';

        subs.forEach(sub => {
            const tr = document.createElement('tr');
            const startDate = sub.started_at ? new Date(sub.started_at).toLocaleDateString('en-ZA') : '—';
            const amount = sub.amount ? 'R' + (sub.amount / 100) : '—';

            tr.innerHTML =
                '<td>' + esc(getUserEmail(sub.user_id)) + '</td>' +
                '<td><span class="sub-badge sub-' + sub.status + '">' + sub.status + '</span></td>' +
                '<td>' + esc(sub.plan || 'monthly') + '</td>' +
                '<td>' + amount + '</td>' +
                '<td>' + startDate + '</td>' +
                '<td>' + esc(sub.paystack_reference || '—') + '</td>' +
                '<td class="actions-cell">' +
                    '<button class="btn-action btn-edit">Edit</button>' +
                    '<button class="btn-action btn-delete">Cancel</button>' +
                '</td>';

            tr.querySelector('.btn-edit').addEventListener('click', () => openEditSubModal(sub));
            tr.querySelector('.btn-delete').addEventListener('click', () => {
                if (confirm('Cancel subscription for ' + getUserEmail(sub.user_id) + '?')) {
                    const allSubs = getAllSubs();
                    const s = allSubs.find(x => x.user_id === sub.user_id);
                    if (s) s.status = 'cancelled';
                    saveAllSubs(allSubs);
                    renderSubscriptions();
                    renderUsers();
                    _audit('sub.cancel', getUserEmail(sub.user_id), 'Subscription cancelled');
                    showToast('Subscription cancelled.');
                }
            });
            tbody.appendChild(tr);
        });
    }

    // ════════════════════════════════════════
    // SUBSCRIPTION MODAL (Add / Edit)
    // ════════════════════════════════════════

    function openAddSubModal() {
        document.getElementById('sub-modal-title').textContent = 'Add Subscription';
        document.getElementById('sub-edit-user-id').value = '';
        populateUserSelect('');
        document.getElementById('sub-user-select').disabled = false;
        document.getElementById('sub-status').value = 'active';
        document.getElementById('sub-start-date').value = new Date().toISOString().slice(0, 10);
        document.getElementById('sub-reference').value = '';
        hideEl('sub-error');
        showModal('sub-modal');
    }

    function openEditSubModal(sub) {
        document.getElementById('sub-modal-title').textContent = 'Edit Subscription';
        document.getElementById('sub-edit-user-id').value = sub.user_id;
        populateUserSelect(sub.user_id);
        document.getElementById('sub-user-select').value = sub.user_id;
        document.getElementById('sub-user-select').disabled = true;
        document.getElementById('sub-status').value = sub.status || 'active';
        document.getElementById('sub-start-date').value = sub.started_at ? sub.started_at.slice(0, 10) : '';
        document.getElementById('sub-reference').value = sub.paystack_reference || '';
        hideEl('sub-error');
        showModal('sub-modal');
    }

    function populateUserSelect(selectedId) {
        const sel = document.getElementById('sub-user-select');
        sel.innerHTML = '<option value="">— Select user —</option>';
        getUsers().forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.email + (u.full_name ? ' (' + u.full_name + ')' : '');
            if (u.id === selectedId) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    function setupSubModal() {
        document.getElementById('form-sub').addEventListener('submit', (e) => {
            e.preventDefault();
            hideEl('sub-error');

            const editId = document.getElementById('sub-edit-user-id').value;
            const userId = editId || document.getElementById('sub-user-select').value;
            const status = document.getElementById('sub-status').value;
            const startDate = document.getElementById('sub-start-date').value;
            const reference = document.getElementById('sub-reference').value.trim();

            if (!userId) { showEl('sub-error', 'Please select a user.'); return; }

            const settings = getSettings();
            const amount = (settings.subPrice || 49) * 100;
            const subs = getAllSubs();

            if (editId) {
                const s = subs.find(x => x.user_id === editId);
                if (s) {
                    s.status = status;
                    s.started_at = startDate ? new Date(startDate).toISOString() : s.started_at;
                    s.paystack_reference = reference || s.paystack_reference;
                }
            } else {
                if (subs.find(s => s.user_id === userId)) {
                    showEl('sub-error', 'This user already has a subscription. Edit it instead.'); return;
                }
                subs.push({
                    user_id: userId,
                    paystack_reference: reference || 'ADMIN_' + Date.now(),
                    status: status,
                    plan: 'monthly',
                    amount: amount,
                    started_at: startDate ? new Date(startDate).toISOString() : new Date().toISOString()
                });
            }

            saveAllSubs(subs);
            closeModal('sub-modal');
            renderSubscriptions();
            renderUsers();
            _audit(editId ? 'sub.update' : 'sub.create', getUserEmail(userId), 'Status: ' + status);
            showToast(editId ? 'Subscription updated.' : 'Subscription added.');
        });
        document.getElementById('btn-cancel-sub').addEventListener('click', () => closeModal('sub-modal'));
    }

    // ════════════════════════════════════════
    // SYSTEM SETTINGS
    // ════════════════════════════════════════

    function loadSettings() {
        const s = getSettings();
        document.getElementById('set-free-downloads').value = s.freeDownloads != null ? s.freeDownloads : 1;
        document.getElementById('set-sub-price').value = s.subPrice != null ? s.subPrice : 49;
        document.getElementById('set-paystack-key').value = s.paystackKey || '';
        document.getElementById('set-paystack-plan').value = s.paystackPlan || '';
        document.getElementById('set-supabase-url').value = s.supabaseUrl || '';
        document.getElementById('set-supabase-key').value = s.supabaseKey || '';
        document.getElementById('set-ga-id').value = s.gaMeasurementId || '';
        document.getElementById('set-web3forms-key').value = s.web3formsKey || '';
        document.getElementById('set-notify-email').value = s.notificationEmail || '';
        document.getElementById('set-google-script-url').value = s.googleScriptUrl || '';
        document.getElementById('set-emailjs-public-key').value = s.emailjsPublicKey || '';
        document.getElementById('set-emailjs-service-id').value = s.emailjsServiceId || '';
        document.getElementById('set-emailjs-template-id').value = s.emailjsTemplateId || '';
    }

    function setupSettings() {
        document.getElementById('btn-save-free-downloads').addEventListener('click', () => {
            const s = getSettings();
            s.freeDownloads = parseInt(document.getElementById('set-free-downloads').value) || 1;
            saveSettings(s);
            showToast('Free downloads set to ' + s.freeDownloads);
        });

        document.getElementById('btn-save-sub-price').addEventListener('click', () => {
            const s = getSettings();
            s.subPrice = parseInt(document.getElementById('set-sub-price').value) || 49;
            saveSettings(s);
            showToast('Subscription price set to R' + s.subPrice);
        });

        document.getElementById('btn-save-paystack').addEventListener('click', () => {
            const s = getSettings();
            s.paystackKey = document.getElementById('set-paystack-key').value.trim();
            s.paystackPlan = document.getElementById('set-paystack-plan').value.trim();
            saveSettings(s);
            showToast('Paystack keys saved.');
        });

        document.getElementById('btn-save-supabase').addEventListener('click', () => {
            const s = getSettings();
            s.supabaseUrl = document.getElementById('set-supabase-url').value.trim();
            s.supabaseKey = document.getElementById('set-supabase-key').value.trim();
            saveSettings(s);
            showToast('Supabase credentials saved.');
        });

        document.getElementById('btn-save-ga').addEventListener('click', () => {
            const s = getSettings();
            s.gaMeasurementId = document.getElementById('set-ga-id').value.trim();
            saveSettings(s);
            showToast('Google Analytics ID saved. Reload pages to activate.');
        });

        document.getElementById('btn-save-email-settings').addEventListener('click', () => {
            const s = getSettings();
            s.web3formsKey = document.getElementById('set-web3forms-key').value.trim();
            s.notificationEmail = document.getElementById('set-notify-email').value.trim();
            saveSettings(s);
            showToast('Email notification settings saved.');
        });

        document.getElementById('btn-save-google-script').addEventListener('click', () => {
            const s = getSettings();
            s.googleScriptUrl = document.getElementById('set-google-script-url').value.trim();
            saveSettings(s);
            showToast('Google Apps Script URL saved.');
        });

        document.getElementById('btn-save-emailjs').addEventListener('click', () => {
            const s = getSettings();
            s.emailjsPublicKey = document.getElementById('set-emailjs-public-key').value.trim();
            s.emailjsServiceId = document.getElementById('set-emailjs-service-id').value.trim();
            s.emailjsTemplateId = document.getElementById('set-emailjs-template-id').value.trim();
            saveSettings(s);
            showToast('EmailJS settings saved.');
        });

        document.getElementById('btn-clear-all-downloads').addEventListener('click', () => {
            if (confirm('Reset ALL download counts to zero?')) {
                localStorage.setItem(LOCAL_DOWNLOADS_KEY, JSON.stringify({}));
                updateStats();
                _audit('system.reset_downloads', '', 'All download counts reset to zero');
                showToast('All download counts reset.');
            }
        });

        document.getElementById('btn-clear-all-subs').addEventListener('click', () => {
            if (confirm('Cancel ALL active subscriptions?')) {
                const subs = getAllSubs();
                subs.forEach(s => { if (s.status === 'active') s.status = 'cancelled'; });
                saveAllSubs(subs);
                renderSubscriptions();
                renderUsers();
                _audit('system.cancel_all_subs', '', 'All active subscriptions cancelled');
                showToast('All subscriptions cancelled.');
            }
        });
    }

    // ════════════════════════════════════════
    // LOGOUT
    // ════════════════════════════════════════

    function setupLogout() {
        document.getElementById('btn-logout').addEventListener('click', async () => {
            try { await Auth.signOut(); } catch (e) { console.warn('Sign out error:', e); }
            window.location.replace('login.html');
        });
    }

    // ════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════

    function showModal(id) { document.getElementById(id).classList.add('show'); }
    function closeModal(id) { document.getElementById(id).classList.remove('show'); }
    function showEl(id, msg) { const el = document.getElementById(id); el.textContent = msg; el.style.display = 'block'; }
    function hideEl(id) { const el = document.getElementById(id); el.textContent = ''; el.style.display = 'none'; }
    function showAccessDenied() { document.getElementById('access-denied').style.display = 'block'; }

    function esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function showToast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }

    async function _getAdminEmail() {
        try {
            const user = await Auth.getUser();
            return user && user.email ? user.email : 'admin';
        } catch { return 'admin'; }
    }

    function _audit(action, target, details) {
        _getAdminEmail().then(actor => {
            if (typeof AuditLog !== 'undefined') AuditLog.log(action, actor, target, details);
        });
    }

    // ════════════════════════════════════════
    // AUDIT LOG
    // ════════════════════════════════════════

    function setupAuditLog() {
        const clearBtn = document.getElementById('btn-clear-audit');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear the entire audit log?')) {
                    if (typeof AuditLog !== 'undefined') AuditLog.clear();
                    renderAuditLog();
                    showToast('Audit log cleared.');
                }
            });
        }
    }

    // ════════════════════════════════════════
    // CV DATA PANEL — View/print all learners' CV data
    // ════════════════════════════════════════
    let _cvdataPage = 1;
    const _cvdataLimit = 50;

    function setupCVDataPanel() {
        if (typeof CVSync === 'undefined') return;
        CVSync.init();

        const searchInput = document.getElementById('cvdata-search');
        const refreshBtn = document.getElementById('btn-refresh-cvdata');
        const modalOverlay = document.getElementById('cvdata-modal');
        const modalClose = document.getElementById('cvdata-modal-close');
        const closeBtn = document.getElementById('btn-close-cv-modal');
        const printBtn = document.getElementById('btn-print-cv');

        if (refreshBtn) refreshBtn.addEventListener('click', () => renderCVDataTable());
        if (searchInput) {
            let searchTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => renderCVDataTable(searchInput.value.trim()), 400);
            });
        }

        // Modal close handlers
        if (modalClose) modalClose.addEventListener('click', closeCVModal);
        if (closeBtn) closeBtn.addEventListener('click', closeCVModal);
        if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeCVModal();
        });

        // Print CV
        if (printBtn) printBtn.addEventListener('click', () => {
            const body = document.getElementById('cvdata-modal-body');
            if (!body) return;
            const printWin = window.open('', '_blank');
            printWin.document.write('<html><head><title>Print CV</title>');
            printWin.document.write('<link rel="stylesheet" href="css/templates.css">');
            printWin.document.write('<style>body{font-family:sans-serif;margin:20px} .cv-detail-section{margin:0 0 16px} .cv-detail-label{font-weight:700;color:#333} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:6px 10px;text-align:left} th{background:#f5f5f5}</style>');
            printWin.document.write('</head><body>');
            printWin.document.write(body.innerHTML);
            printWin.document.write('</body></html>');
            printWin.document.close();
            printWin.focus();
            setTimeout(() => { printWin.print(); }, 500);
        });

        // Table row click delegation
        const tbody = document.getElementById('cvdata-tbody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                const action = btn.dataset.action;
                const cvJson = btn.dataset.cv;
                if (action === 'view' && cvJson) {
                    try { openCVDetail(JSON.parse(decodeURIComponent(cvJson))); } catch (er) { console.warn(er); }
                }
            });
        }

        renderCVDataTable();
    }

    async function renderCVDataTable(searchQuery) {
        const tbody = document.getElementById('cvdata-tbody');
        const noData = document.getElementById('no-cvdata');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:24px">Loading CV data...</td></tr>';

        let cvList = [];
        try {
            if (searchQuery) {
                cvList = await CVSync.adminSearchCVs(searchQuery);
            } else {
                const result = await CVSync.adminGetAllCVs(_cvdataPage, _cvdataLimit);
                cvList = result.data;
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#dc2626;padding:24px">Failed to load CV data. Ensure the cv_data table exists in Supabase.</td></tr>';
            return;
        }

        if (!cvList.length) {
            tbody.innerHTML = '';
            if (noData) noData.style.display = 'block';
            return;
        }
        if (noData) noData.style.display = 'none';

        tbody.innerHTML = '';
        cvList.forEach(cv => {
            const d = cv.data || {};
            const p = d.step1 || {};
            const exp = d.step2 || [];
            const edu = d.step3 || [];
            const sk = d.step4 || [];
            const ref = d.step5 || [];
            const updated = cv.updated_at ? new Date(cv.updated_at).toLocaleDateString('en-ZA') : '—';

            const cvEncoded = encodeURIComponent(JSON.stringify(cv));
            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td><strong>' + esc(p.fullName || '—') + '</strong></td>' +
                '<td>' + esc(p.email || '—') + '</td>' +
                '<td>' + esc(p.phone || '—') + '</td>' +
                '<td>' + esc([p.location, p.province].filter(Boolean).join(', ') || '—') + '</td>' +
                '<td>' + esc(cv.template || 'classic') + '</td>' +
                '<td>' + exp.length + ' job' + (exp.length !== 1 ? 's' : '') + '</td>' +
                '<td>' + edu.length + '</td>' +
                '<td>' + sk.length + '</td>' +
                '<td>' + ref.length + '</td>' +
                '<td style="white-space:nowrap">' + updated + '</td>' +
                '<td><button class="btn btn-primary btn-sm" data-action="view" data-cv="' + cvEncoded.replace(/"/g, '&quot;') + '">View</button></td>';
            tbody.appendChild(tr);
        });
    }

    function openCVDetail(cv) {
        const modal = document.getElementById('cvdata-modal');
        const title = document.getElementById('cvdata-modal-title');
        const body = document.getElementById('cvdata-modal-body');
        if (!modal || !body) return;

        const d = cv.data || {};
        const p = d.step1 || {};
        const exp = d.step2 || [];
        const edu = d.step3 || [];
        const sk = d.step4 || [];
        const ref = d.step5 || [];
        const s6 = d.step6 || {};

        title.textContent = 'CV: ' + (p.fullName || 'Unknown');

        let html = '';

        // Personal Details
        html += '<div class="cv-detail-section"><h4>Personal Information</h4>';
        html += '<table><tbody>';
        html += '<tr><td class="cv-detail-label">Full Name</td><td>' + esc(p.fullName || '—') + '</td></tr>';
        html += '<tr><td class="cv-detail-label">Phone</td><td>' + esc(p.phone || '—') + '</td></tr>';
        html += '<tr><td class="cv-detail-label">Email</td><td>' + esc(p.email || '—') + '</td></tr>';
        if (p.linkedin) html += '<tr><td class="cv-detail-label">LinkedIn / Portfolio</td><td>' + esc(p.linkedin) + '</td></tr>';
        html += '<tr><td class="cv-detail-label">Address</td><td>' + esc([p.address, p.location, p.province].filter(Boolean).join(', ') || '—') + '</td></tr>';
        if (p.dateOfBirth) html += '<tr><td class="cv-detail-label">Date of Birth</td><td>' + esc(p.dateOfBirth) + '</td></tr>';
        if (p.gender) html += '<tr><td class="cv-detail-label">Gender</td><td>' + esc(p.gender) + '</td></tr>';
        if (p.nationality) html += '<tr><td class="cv-detail-label">Nationality</td><td>' + esc(p.nationality) + '</td></tr>';
        if (p.maritalStatus) html += '<tr><td class="cv-detail-label">Marital Status</td><td>' + esc(p.maritalStatus) + '</td></tr>';
        if (p.languages) html += '<tr><td class="cv-detail-label">Languages</td><td>' + esc(p.languages) + '</td></tr>';
        if (p.driversLicence) html += '<tr><td class="cv-detail-label">Driver\'s Licence</td><td>' + esc(p.driversLicence) + '</td></tr>';
        if (p.disability && p.disability !== 'None' && p.disability !== 'Prefer not to say') {
            html += '<tr><td class="cv-detail-label">Disability</td><td>' + esc(p.disability === 'Other' ? (p.disabilityOther || 'Other') : p.disability) + '</td></tr>';
        }
        if (p.objective) html += '<tr><td class="cv-detail-label">Career Objective</td><td>' + esc(p.objective) + '</td></tr>';
        html += '</tbody></table></div>';

        // Work Experience
        if (exp.length) {
            html += '<div class="cv-detail-section"><h4>Work Experience (' + exp.length + ')</h4>';
            html += '<table><thead><tr><th>Job Title</th><th>Company</th><th>Period</th><th>Duties</th></tr></thead><tbody>';
            exp.forEach(j => {
                const period = (j.startDate || '?') + ' – ' + (j.currentJob ? 'Present' : (j.endDate || '?'));
                html += '<tr><td>' + esc(j.jobTitle) + '</td><td>' + esc(j.company) + '</td><td>' + esc(period) + '</td><td>' + esc((j.duties || '').substring(0, 150)) + '</td></tr>';
            });
            html += '</tbody></table></div>';
        }

        // Education
        if (edu.length) {
            html += '<div class="cv-detail-section"><h4>Education (' + edu.length + ')</h4>';
            html += '<table><thead><tr><th>Institution</th><th>Qualification</th><th>Year</th></tr></thead><tbody>';
            edu.forEach(e => {
                html += '<tr><td>' + esc(e.institution) + '</td><td>' + esc(e.qualification) + '</td><td>' + esc(e.year || '—') + '</td></tr>';
            });
            html += '</tbody></table></div>';
        }

        // Skills
        if (sk.length) {
            html += '<div class="cv-detail-section"><h4>Skills (' + sk.length + ')</h4>';
            html += '<p>' + sk.map(s => '<span style="display:inline-block;background:#e8f5e9;padding:2px 10px;margin:2px;border-radius:4px;font-size:0.85rem">' + esc(s) + '</span>').join('') + '</p></div>';
        }

        // Hobbies & Achievements
        if (s6.hobbies) {
            html += '<div class="cv-detail-section"><h4>Hobbies & Interests</h4><p>' + esc(s6.hobbies) + '</p></div>';
        }
        if (s6.achievements) {
            html += '<div class="cv-detail-section"><h4>Achievements & Awards</h4>';
            html += '<ul>' + s6.achievements.split('\n').filter(Boolean).map(a => '<li>' + esc(a.trim()) + '</li>').join('') + '</ul></div>';
        }

        // References
        if (ref.length) {
            html += '<div class="cv-detail-section"><h4>References (' + ref.length + ')</h4>';
            html += '<table><thead><tr><th>Name</th><th>Relationship</th><th>Company</th><th>Phone</th><th>Email</th></tr></thead><tbody>';
            ref.forEach(r => {
                html += '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.relationship) + '</td><td>' + esc(r.company || '—') + '</td><td>' + esc(r.phone) + '</td><td>' + esc(r.email || '—') + '</td></tr>';
            });
            html += '</tbody></table></div>';
        }

        // Template & Metadata
        html += '<div class="cv-detail-section" style="margin-top:20px;padding-top:12px;border-top:1px solid #ddd"><small style="color:#888">Template: ' + esc(cv.template || 'classic') + ' | Updated: ' + (cv.updated_at ? new Date(cv.updated_at).toLocaleString('en-ZA') : '—') + ' | Active: ' + (cv.is_active ? 'Yes' : 'No') + '</small></div>';

        body.innerHTML = html;
        modal.style.display = 'flex';
    }

    function closeCVModal() {
        const modal = document.getElementById('cvdata-modal');
        if (modal) modal.style.display = 'none';
    }

    // ════════════════════════════════════════
    // AUDIT LOG
    // ════════════════════════════════════════
    function renderAuditLog() {
        const tbody = document.getElementById('audit-tbody');
        const noAudit = document.getElementById('no-audit');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (typeof AuditLog === 'undefined') {
            if (noAudit) noAudit.style.display = 'block';
            return;
        }

        const entries = AuditLog.getAll();
        if (!entries.length) { if (noAudit) noAudit.style.display = 'block'; return; }
        if (noAudit) noAudit.style.display = 'none';

        entries.forEach(entry => {
            const tr = document.createElement('tr');
            const ts = entry.ts ? new Date(entry.ts).toLocaleString('en-ZA') : '—';
            tr.innerHTML =
                '<td style="white-space:nowrap">' + esc(ts) + '</td>' +
                '<td><span class="role-badge">' + esc(entry.action) + '</span></td>' +
                '<td>' + esc(entry.actor) + '</td>' +
                '<td>' + esc(entry.target) + '</td>' +
                '<td>' + esc(entry.details) + '</td>';
            tbody.appendChild(tr);
        });
    }

})();
