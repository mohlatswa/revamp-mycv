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

        const role = session.user.user_metadata && session.user.user_metadata.role;
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
                users.push({ id: 'user-' + Date.now(), email, password, full_name: name, role, created_at: new Date().toISOString() });
            }

            saveUsers(users);
            closeModal('user-modal');
            renderUsers();
            _audit(id ? 'user.update' : 'user.create', email, id ? 'Role: ' + role : 'New user, role: ' + role);
            showToast(id ? 'User updated.' : 'User created.');
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

            users[idx].password = pw;
            saveUsers(users);
            closeModal('reset-modal');
            _audit('user.password_reset', users[idx].email, 'Password reset by admin');
            showToast('Password reset for ' + users[idx].email);
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
            await Auth.signOut();
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
