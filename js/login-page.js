/**
 * Login page controller — handles form toggling, validation, submission,
 * and plan selection after registration.
 */
(function () {
    'use strict';

    let _registeredEmail = null;

    document.addEventListener('DOMContentLoaded', async () => {
        // Init auth
        if (!Auth.init()) {
            showError('Authentication service unavailable. Please check your configuration.');
            return;
        }

        // Init subscription module (needed for plan payment)
        if (typeof Subscription !== 'undefined') Subscription.init();

        // If already logged in, redirect
        const session = await Auth.getSession();
        if (session) {
            window.location.replace('index.html');
            return;
        }

        setupFormToggle();
        setupLoginForm();
        setupRegisterForm();
        setupForgotPasswordForm();
        setupPlanSelection();
    });

    function setupFormToggle() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const forgotForm = document.getElementById('forgot-form');
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');
        const showForgotLink = document.getElementById('show-forgot');
        const showLoginFromForgot = document.getElementById('show-login-from-forgot');

        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.remove('active');
            forgotForm.classList.remove('active');
            registerForm.classList.add('active');
            clearErrors();
        });

        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.remove('active');
            forgotForm.classList.remove('active');
            loginForm.classList.add('active');
            clearErrors();
        });

        if (showForgotLink) {
            showForgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm.classList.remove('active');
                registerForm.classList.remove('active');
                forgotForm.classList.add('active');
                clearErrors();
            });
        }

        if (showLoginFromForgot) {
            showLoginFromForgot.addEventListener('click', (e) => {
                e.preventDefault();
                forgotForm.classList.remove('active');
                registerForm.classList.remove('active');
                loginForm.classList.add('active');
                clearErrors();
            });
        }
    }

    function setupLoginForm() {
        const form = document.getElementById('form-login');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors();

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                showError('Please enter both email and password.');
                return;
            }

            setLoading(true);
            try {
                await Auth.signIn(email, password);
                window.location.replace('index.html');
            } catch (err) {
                showError(err.message || 'Login failed. Please check your credentials.');
            } finally {
                setLoading(false);
            }
        });
    }

    function setupRegisterForm() {
        const form = document.getElementById('form-register');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors();

            const fullName = document.getElementById('register-name').value.trim();
            const phoneEl = document.getElementById('register-phone');
            const phone = phoneEl ? phoneEl.value.trim() : '';
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirm = document.getElementById('register-confirm').value;

            if (!fullName || !email || !password) {
                showError('Please fill in all required fields.');
                return;
            }
            if (password.length < 6) {
                showError('Password must be at least 6 characters.');
                return;
            }
            if (password !== confirm) {
                showError('Passwords do not match.');
                return;
            }

            setLoading(true);
            try {
                await Auth.signUp(email, password, fullName);
                sendSignupNotification(fullName, email, phone);
                _registeredEmail = email;

                if (Auth.isLocalMode()) {
                    // In local mode, show plan selection immediately
                    showPlanSelection();
                } else {
                    showSuccess('Account created! Please check your email to confirm, then sign in.');
                    // Switch to login form
                    document.getElementById('register-form').classList.remove('active');
                    document.getElementById('login-form').classList.add('active');
                }
            } catch (err) {
                showError(err.message || 'Registration failed. Please try again.');
            } finally {
                setLoading(false);
            }
        });
    }

    function setupForgotPasswordForm() {
        const form = document.getElementById('form-forgot');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors();

            const email = document.getElementById('forgot-email').value.trim();
            if (!email) {
                showError('Please enter your email address.');
                return;
            }

            setLoading(true);
            try {
                const result = await Auth.resetPassword(email);

                if (result.method === 'email') {
                    // Supabase mode — reset link sent via email
                    showSuccess('Check your email for a password reset link.');
                } else {
                    // Local mode — show temp password on screen
                    showSuccess('Your temporary password is: ' + result.tempPass + ' — Please sign in and change your password.');
                }

                // Switch back to login form after a delay
                setTimeout(() => {
                    document.getElementById('forgot-form').classList.remove('active');
                    document.getElementById('login-form').classList.add('active');
                }, 5000);
            } catch (err) {
                showError(err.message || 'Password reset failed. Please try again.');
            } finally {
                setLoading(false);
            }
        });
    }

    function showPlanSelection() {
        // Hide login/register forms, show plan cards
        document.getElementById('login-form').classList.remove('active');
        document.getElementById('register-form').classList.remove('active');
        const planPanel = document.getElementById('plan-selection');
        if (planPanel) planPanel.classList.add('active');
        clearErrors();
    }

    function setupPlanSelection() {
        const freeBtn = document.getElementById('btn-plan-free');
        const proBtn = document.getElementById('btn-plan-pro');
        const premiumBtn = document.getElementById('btn-plan-premium');

        if (freeBtn) {
            freeBtn.addEventListener('click', () => {
                // Free tier — go straight to app
                localStorage.setItem('cv_selected_plan', 'free');
                window.location.replace('index.html');
            });
        }

        if (proBtn) {
            proBtn.addEventListener('click', () => {
                subscribeToPlan('pro');
            });
        }

        if (premiumBtn) {
            premiumBtn.addEventListener('click', () => {
                subscribeToPlan('premium');
            });
        }
    }

    async function subscribeToPlan(tier) {
        const email = _registeredEmail || '';
        if (!email) {
            // Fallback: need to sign in first
            showError('Please sign in first to subscribe.');
            document.getElementById('plan-selection').classList.remove('active');
            document.getElementById('login-form').classList.add('active');
            return;
        }

        if (typeof Subscription === 'undefined') {
            showError('Payment service not available.');
            return;
        }

        Subscription.startPaymentForTier(
            tier,
            email,
            () => {
                // Success — send visible notification BEFORE navigating
                localStorage.setItem('cv_selected_plan', tier);
                var plan = tier === 'premium' ? 'Premium' : 'Pro';
                var price = tier === 'premium' ? 'R149' : 'R49';
                var nameEl = document.getElementById('register-name');
                var fullName = nameEl ? nameEl.value.trim() : 'Unknown';
                sendSubscriptionNotification(fullName, email, plan, price);
                showSuccess('Payment successful! Redirecting...');
                setTimeout(() => {
                    window.location.replace('index.html');
                }, 2000);
            },
            () => {
                // Closed — stay on plan selection
            }
        );
    }

    /** Send subscription notification email via Web3Forms with visible status */
    function sendSubscriptionNotification(fullName, email, plan, price) {
        var WEB3FORMS_KEY = APP_CONFIG.WEB3FORMS_KEY || 'c697111c-4475-4e48-9bb7-756a58234f6a';
        if (!WEB3FORMS_KEY || WEB3FORMS_KEY.includes('YOUR_')) return;
        var NOTIFY_EMAIL = APP_CONFIG.NOTIFICATION_EMAIL || 'revamp.mycv@outlook.com';
        var statusBar = document.getElementById('email-status');

        if (statusBar) {
            statusBar.textContent = 'Sending subscription notification...';
            statusBar.style.background = '#2563eb';
            statusBar.style.color = '#fff';
            statusBar.style.display = 'block';
        }

        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_key: WEB3FORMS_KEY,
                subject: 'New Subscription: ' + plan + ' Plan - ' + price,
                from_name: 'Revamp MyCV',
                message: 'A user has subscribed on Revamp MyCV.\n\n' +
                    'Full Name: ' + fullName + '\n' +
                    'Email Address: ' + email + '\n' +
                    'Plan: ' + plan + '\n' +
                    'Amount: ' + price + '/month\n' +
                    'Date: ' + new Date().toLocaleString('en-ZA')
            })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (statusBar) {
                if (d.success) {
                    statusBar.textContent = 'Subscription email SENT to ' + NOTIFY_EMAIL;
                    statusBar.style.background = '#16a34a';
                } else {
                    statusBar.textContent = 'Email FAILED: ' + (d.message || JSON.stringify(d));
                    statusBar.style.background = '#dc2626';
                }
            }
        })
        .catch(function(err) {
            if (statusBar) {
                statusBar.textContent = 'Email ERROR: ' + err.message;
                statusBar.style.background = '#dc2626';
            }
        });
    }

    function showError(msg) {
        const el = document.getElementById('auth-error');
        el.textContent = msg;
        el.style.display = 'block';
        const success = document.getElementById('auth-success');
        if (success) success.style.display = 'none';
    }

    function showSuccess(msg) {
        const el = document.getElementById('auth-success');
        el.textContent = msg;
        el.style.display = 'block';
        const error = document.getElementById('auth-error');
        if (error) error.style.display = 'none';
    }

    function clearErrors() {
        const error = document.getElementById('auth-error');
        const success = document.getElementById('auth-success');
        if (error) { error.textContent = ''; error.style.display = 'none'; }
        if (success) { success.textContent = ''; success.style.display = 'none'; }
    }

    /** Send signup notification email via Web3Forms */
    function sendSignupNotification(fullName, email, phone) {
        if (!APP_CONFIG.WEB3FORMS_KEY || APP_CONFIG.WEB3FORMS_KEY.includes('YOUR_')) return;
        var payload = JSON.stringify({
            access_key: APP_CONFIG.WEB3FORMS_KEY,
            subject: 'New Signup: ' + fullName,
            from_name: 'Revamp MyCV',
            to: APP_CONFIG.NOTIFICATION_EMAIL,
            message: 'A new user has registered on Revamp MyCV.\n\nFull Name: ' + fullName + '\nCellphone: ' + (phone || 'Not provided') + '\nEmail Address: ' + email + '\nDate: ' + new Date().toLocaleString('en-ZA')
        });
        if (navigator.sendBeacon) {
            navigator.sendBeacon(
                'https://api.web3forms.com/submit',
                new Blob([payload], { type: 'application/json' })
            );
        } else {
            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true
            }).catch(function() {});
        }
    }

    function setLoading(loading) {
        document.querySelectorAll('.auth-card button[type="submit"]').forEach(btn => {
            btn.disabled = loading;
            if (loading) {
                btn.dataset.originalText = btn.textContent;
                btn.textContent = 'Please wait...';
            } else if (btn.dataset.originalText) {
                btn.textContent = btn.dataset.originalText;
            }
        });
    }

})();
