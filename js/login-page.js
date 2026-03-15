/**
 * Login page controller — handles form toggling, validation, submission,
 * and plan selection after registration.
 */
(function () {
    'use strict';

    let _registeredEmail = null;
    let _registeredName = null;
    let _registeredPhone = null;
    const MAX_LOGIN_ATTEMPTS = 5;
    const BASE_LOCKOUT_SECONDS = 30;
    const RATE_LIMIT_KEY = 'cv_login_ratelimit';

    function _loadRateLimit() {
        try {
            const data = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY));
            if (!data) return { attempts: 0, lockoutUntil: 0, streak: 0 };
            return data;
        } catch { return { attempts: 0, lockoutUntil: 0, streak: 0 }; }
    }
    function _saveRateLimit(rl) { localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(rl)); }
    function _clearRateLimit() { localStorage.removeItem(RATE_LIMIT_KEY); }

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

        setupGreeting();
        setupFormToggle();
        setupLoginForm();
        setupRegisterForm();
        setupForgotPasswordForm();
        setupPlanSelection();
        setupPasswordToggles();
        setupAdminSetup();

        // Admin setup is shown only when the admin tries to log in (NEEDS_SETUP error),
        // not automatically — so regular visitors see the normal login/register forms.
    });

    function setupGreeting() {
        const el = document.getElementById('auth-greeting');
        if (!el) return;
        const hour = new Date().getHours();
        if (hour < 12) {
            el.textContent = 'Good morning!';
        } else if (hour < 17) {
            el.textContent = 'Good afternoon!';
        } else {
            el.textContent = 'Good evening!';
        }
    }

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

            // Persistent rate limiting check
            const rl = _loadRateLimit();
            const now = Date.now();
            if (rl.lockoutUntil > now) {
                const remaining = Math.ceil((rl.lockoutUntil - now) / 1000);
                showError('Too many attempts. Please wait ' + remaining + ' seconds before trying again.');
                startLockoutCountdown(rl.lockoutUntil);
                return;
            }

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                showError('Please enter both email and password.');
                return;
            }

            setLoading(true);
            try {
                await Auth.signIn(email, password);
                _clearRateLimit();
                window.location.replace('index.html');
            } catch (err) {
                // Admin needs to set up their password first
                if (err.message === 'NEEDS_SETUP') {
                    showAdminSetupForm(email);
                    showSuccess('Please create your admin password to get started.');
                    return;
                }

                rl.attempts = (rl.attempts || 0) + 1;
                if (rl.attempts >= MAX_LOGIN_ATTEMPTS) {
                    rl.streak = (rl.streak || 0) + 1;
                    const lockoutSecs = Math.min(BASE_LOCKOUT_SECONDS * Math.pow(2, rl.streak - 1), 900);
                    rl.lockoutUntil = Date.now() + (lockoutSecs * 1000);
                    rl.attempts = 0;
                    _saveRateLimit(rl);
                    showError('Too many failed attempts. Please wait ' + lockoutSecs + ' seconds before trying again.');
                    startLockoutCountdown(rl.lockoutUntil);
                } else {
                    _saveRateLimit(rl);
                    const remaining = MAX_LOGIN_ATTEMPTS - rl.attempts;
                    showError((err.message || 'Login failed.') + ' (' + remaining + ' attempt' + (remaining !== 1 ? 's' : '') + ' remaining)');
                }
            } finally {
                setLoading(false);
            }
        });
    }

    function startLockoutCountdown(lockoutUntil) {
        const btn = document.querySelector('#form-login button[type="submit"]');
        if (!btn) return;
        btn.disabled = true;
        const originalText = btn.textContent;
        const interval = setInterval(() => {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
            if (remaining <= 0) {
                clearInterval(interval);
                btn.disabled = false;
                btn.textContent = originalText;
                clearErrors();
            } else {
                btn.textContent = 'Wait ' + remaining + 's...';
            }
        }, 1000);
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
            if (password.length < 8) {
                showError('Password must be at least 8 characters.');
                return;
            }
            if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
                showError('Password must include uppercase, lowercase, and a number.');
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
                _registeredName = fullName;
                _registeredPhone = phone;

                if (Auth.isLocalMode()) {
                    // In local mode, show plan selection — welcome email sent after plan choice
                    showSuccess('Account created! Please select your plan below.');
                    showPlanSelection();
                } else {
                    showSuccess('Account created! Please check your email to confirm, then sign in.');
                    // Switch to login form
                    document.getElementById('register-form').classList.remove('active');
                    document.getElementById('login-form').classList.add('active');
                    // Send welcome email with Free plan (they can upgrade later after confirming)
                    sendWelcomeEmail(fullName, email, 'free');
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
                    showSuccess('If an account exists with that email, a reset link has been sent.');
                } else {
                    // Local mode — temp password sent via admin notification
                    // Show generic message to prevent account enumeration
                    if (result.tempPass) {
                        showSuccess('Your temporary password is: ' + result.tempPass + ' — Please sign in and change your password.');
                    } else {
                        showSuccess('If an account exists with that email, a reset has been processed. Contact support if you need help.');
                    }
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

    function showAdminSetupForm(email) {
        _adminSetupEmail = email || null;
        document.getElementById('login-form').classList.remove('active');
        document.getElementById('register-form').classList.remove('active');
        document.getElementById('forgot-form').classList.remove('active');
        document.getElementById('admin-setup-form').classList.add('active');
        // Update the displayed email in the admin setup form
        if (email) {
            const emailInput = document.querySelector('#admin-setup-form input[type="email"]');
            if (emailInput) emailInput.value = email;
            const subtitle = document.querySelector('#admin-setup-form .auth-subtitle');
            if (subtitle) subtitle.textContent = 'Welcome! Create a password to secure your super admin account.';
        }
        clearErrors();
    }

    let _adminSetupEmail = null; // Track which admin email needs setup

    function setupAdminSetup() {
        const form = document.getElementById('form-admin-setup');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors();

            const password = document.getElementById('admin-setup-password').value;
            const confirm = document.getElementById('admin-setup-confirm').value;

            if (!password) {
                showError('Please enter a password.');
                return;
            }
            if (password.length < 8) {
                showError('Password must be at least 8 characters.');
                return;
            }
            if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
                showError('Password must include uppercase, lowercase, and a number.');
                return;
            }
            if (password !== confirm) {
                showError('Passwords do not match.');
                return;
            }

            setLoading(true);
            try {
                const success = await Auth.completeAdminSetup(password, _adminSetupEmail);
                if (!success) {
                    showError('Setup failed. Please try again.');
                    return;
                }

                showSuccess('Admin account secured! You can now sign in.');
                document.getElementById('admin-setup-form').classList.remove('active');
                document.getElementById('login-form').classList.add('active');

                // Pre-fill the login email
                const loginEmail = document.getElementById('login-email');
                if (loginEmail && _adminSetupEmail) loginEmail.value = _adminSetupEmail;
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
                // Free tier — send welcome email with Free plan, then go to app
                localStorage.setItem('cv_selected_plan', 'free');
                if (_registeredName && _registeredEmail) {
                    sendWelcomeEmail(_registeredName, _registeredEmail, 'free');
                }
                showSuccess('Welcome! A confirmation email has been sent to ' + (_registeredEmail || 'your email') + '.');
                setTimeout(() => { window.location.replace('index.html'); }, 2000);
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
                // Success — send notifications and welcome email with plan details
                localStorage.setItem('cv_selected_plan', tier);
                var plan = tier === 'premium' ? 'Premium' : 'Pro';
                var price = tier === 'premium' ? 'R149' : 'R49';
                var fullName = _registeredName || 'Valued Customer';
                sendSubscriptionNotification(fullName, email, plan, price);
                sendWelcomeEmail(fullName, email, tier);
                showSuccess('Payment successful! A confirmation email has been sent to ' + email + '. Redirecting...');
                setTimeout(() => {
                    window.location.replace('index.html');
                }, 2500);
            },
            () => {
                // Closed — stay on plan selection
            }
        );
    }

    /** Send subscription notification to ADMIN via Web3Forms (admin only) */
    function sendSubscriptionNotification(fullName, email, plan, price) {
        var key = APP_CONFIG.WEB3FORMS_KEY;
        if (!key || key.includes('YOUR_')) return;

        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_key: key,
                subject: 'New Subscription: ' + plan + ' Plan - ' + price,
                from_name: 'Revamp MyCV',
                replyto: email,
                message: 'A user has subscribed on Revamp MyCV.\n\n' +
                    'Full Name: ' + fullName + '\n' +
                    'Email Address: ' + email + '\n' +
                    'Plan: ' + plan + '\n' +
                    'Amount: ' + price + '/month\n' +
                    'Date: ' + new Date().toLocaleString('en-ZA')
            })
        }).catch(function() {});
    }

    function setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const wrapper = btn.closest('.password-wrapper');
                const input = wrapper.querySelector('input');
                const eyeOpen = btn.querySelector('.eye-open');
                const eyeClosed = btn.querySelector('.eye-closed');
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                eyeOpen.style.display = isPassword ? 'none' : '';
                eyeClosed.style.display = isPassword ? '' : 'none';
            });
        });
    }

    function showError(msg) {
        const el = document.getElementById('auth-error');
        el.textContent = msg;
        el.classList.remove('hidden');
        const success = document.getElementById('auth-success');
        if (success) success.classList.add('hidden');
    }

    function showSuccess(msg) {
        const el = document.getElementById('auth-success');
        el.textContent = msg;
        el.classList.remove('hidden');
        const error = document.getElementById('auth-error');
        if (error) error.classList.add('hidden');
    }

    function clearErrors() {
        const error = document.getElementById('auth-error');
        const success = document.getElementById('auth-success');
        if (error) { error.textContent = ''; error.classList.add('hidden'); }
        if (success) { success.textContent = ''; success.classList.add('hidden'); }
    }

    /** Send signup notification to ADMIN via Web3Forms (admin only) */
    function sendSignupNotification(fullName, email, phone) {
        var key = APP_CONFIG.WEB3FORMS_KEY;
        if (!key || key.includes('YOUR_')) return;

        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_key: key,
                subject: 'New Signup: ' + fullName,
                from_name: 'Revamp MyCV',
                replyto: email,
                message: 'A new user has registered on Revamp MyCV.\n\n' +
                    'Full Name: ' + fullName + '\n' +
                    'Cellphone: ' + (phone || 'Not provided') + '\n' +
                    'Email Address: ' + email + '\n' +
                    'Date: ' + new Date().toLocaleString('en-ZA')
            })
        }).catch(function() {});
    }

    /** Build the welcome email message body based on plan */
    function buildWelcomeMessage(fullName, email, plan) {
        var siteLink = window.location.origin + '/login.html';
        var planName, planPrice, planFeatures, subjectLine, upgradeSection;

        if (plan === 'premium') {
            planName = 'Premium';
            planPrice = 'R149/month';
            planFeatures =
                '- Access to ALL 46 professional CV templates\n' +
                '- Unlimited PDF downloads\n' +
                '- Unlimited saved CVs\n' +
                '- Full ATS compatibility score with keyword suggestions\n' +
                '- Achievement bullet helper\n' +
                '- WhatsApp priority support\n' +
                '- Cover letter builder (coming soon)\n' +
                '- Search for jobs on Indeed SA, LinkedIn, Careers24, PNet, JobMail, CareerJunction, Gumtree, Adzuna & DPSA Gov Jobs\n' +
                '- Apply directly via top SA recruitment agencies: Hays, Michael Page, Robert Half, Kelly, Adcorp, Isilumko, Dante, Express Employment, Quest, Workforce, Unique & Kontak';
            subjectLine = 'Welcome to Revamp MyCV Premium, ' + fullName + '!';
            upgradeSection = '';
        } else if (plan === 'pro') {
            planName = 'Pro';
            planPrice = 'R49/month';
            planFeatures =
                '- 30 profession-specific CV templates\n' +
                '- Unlimited PDF downloads\n' +
                '- Save up to 10 CVs\n' +
                '- Full ATS score with improvement tips\n' +
                '- Achievement bullet helper\n' +
                '- Search for jobs on Indeed SA, LinkedIn, Careers24, PNet, JobMail, CareerJunction, Gumtree, Adzuna & DPSA Gov Jobs\n' +
                '- Apply directly via top SA recruitment agencies: Hays, Michael Page, Robert Half, Kelly, Adcorp, Isilumko, Dante, Express Employment, Quest, Workforce, Unique & Kontak';
            subjectLine = 'Welcome to Revamp MyCV Pro, ' + fullName + '!';
            upgradeSection =
                '========================================\n' +
                'UPGRADE TO PREMIUM - R149/month\n' +
                '========================================\n' +
                'Get even more with Premium:\n' +
                '  - All 46 templates (including premium exclusives)\n' +
                '  - Unlimited saved CVs\n' +
                '  - Full ATS + keyword suggestions\n' +
                '  - WhatsApp priority support\n' +
                '  - Cover letter builder (coming soon)\n\n' +
                'Upgrade anytime from the app after signing in.\n\n';
        } else {
            planName = 'Free (Mahala)';
            planPrice = 'R0';
            planFeatures =
                '- Build a professional CV using 16 general templates\n' +
                '- 1 free PDF download\n' +
                '- Save up to 3 CVs\n' +
                '- Basic ATS compatibility score\n' +
                '- Search for jobs on Indeed SA, LinkedIn, Careers24, PNet, JobMail, CareerJunction, Gumtree, Adzuna & DPSA Gov Jobs\n' +
                '- Apply directly via top SA recruitment agencies: Hays, Michael Page, Robert Half, Kelly, Adcorp, Isilumko, Dante, Express Employment, Quest, Workforce, Unique & Kontak';
            subjectLine = 'Welcome to Revamp MyCV, ' + fullName + '!';
            upgradeSection =
                '========================================\n' +
                'UPGRADE FOR MORE FEATURES\n' +
                '========================================\n' +
                'PRO PLAN - R49/month:\n' +
                '  - 30 profession-specific templates\n' +
                '  - Unlimited PDF downloads\n' +
                '  - Save up to 10 CVs\n' +
                '  - Full ATS score with improvement tips\n' +
                '  - Achievement bullet helper\n\n' +
                'PREMIUM PLAN - R149/month:\n' +
                '  - All 46 templates\n' +
                '  - Unlimited saved CVs\n' +
                '  - Full ATS + keyword suggestions\n' +
                '  - WhatsApp priority support\n' +
                '  - Cover letter builder (coming soon)\n\n' +
                'You can upgrade anytime from the app after signing in.\n\n';
        }

        var paymentNote = (plan === 'pro' || plan === 'premium')
            ? '========================================\n' +
              'PAYMENT CONFIRMATION\n' +
              '========================================\n' +
              'Plan: ' + planName + '\n' +
              'Amount: ' + planPrice + '\n' +
              'Payment Status: CONFIRMED\n' +
              'Next Billing Date: ' + getNextBillingDate() + '\n\n' +
              'Your subscription is now active. You have full access to all\n' +
              planName + ' features immediately.\n\n'
            : '';

        var eftSection = (plan === 'free')
            ? '========================================\n' +
              'UPGRADE ANYTIME\n' +
              '========================================\n' +
              'To upgrade to Pro or Premium, sign in and\n' +
              'click "Upgrade" in Settings. EFT bank details\n' +
              'are available on the upgrade page after sign-in.\n' +
              'Questions? Email: revamp.mycv@outlook.com\n\n'
            : '========================================\n' +
              'MANAGE YOUR SUBSCRIPTION\n' +
              '========================================\n' +
              'To cancel or change your plan, contact us:\n' +
              'Email: revamp.mycv@outlook.com\n' +
              'WhatsApp: 072 787 9085\n\n';

        var message = 'Hi ' + fullName + ',\n\n' +
            'Welcome to Revamp MyCV! Your account has been successfully created.\n\n' +
            '========================================\n' +
            'YOUR ACCOUNT DETAILS\n' +
            '========================================\n' +
            'Full Name: ' + fullName + '\n' +
            'Email: ' + email + '\n' +
            'Subscription Plan: ' + planName + (planPrice !== 'R0' ? ' (' + planPrice + ')' : '') + '\n' +
            'Date Registered: ' + new Date().toLocaleString('en-ZA') + '\n\n' +
            paymentNote +
            '========================================\n' +
            'SIGN IN TO YOUR ACCOUNT\n' +
            '========================================\n' +
            'Click here to sign in and start building your CV:\n' +
            siteLink + '\n\n' +
            '========================================\n' +
            'YOUR ' + planName.toUpperCase() + ' PLAN FEATURES\n' +
            '========================================\n' +
            planFeatures + '\n\n' +
            upgradeSection +
            eftSection +
            '========================================\n' +
            'NEED HELP?\n' +
            '========================================\n' +
            'Email: revamp.mycv@outlook.com\n' +
            'WhatsApp: 072 787 9085\n' +
            'Website: ' + window.location.origin + '\n\n' +
            'Thank you for choosing Revamp MyCV!\n' +
            'Good luck with your job search!\n\n' +
            'The Revamp MyCV Team\n' +
            'Revamp your CV. Land the job.';

        return { subject: subjectLine, message: message };
    }

    /** Send welcome/acknowledgement email directly TO the user.
     *  Tries Google Apps Script first (simplest), then EmailJS as fallback.
     *  Both work the same as Web3Forms — a simple fetch() POST.
     */
    function sendWelcomeEmail(fullName, email, plan) {
        var statusBar = document.getElementById('email-status');
        var content = buildWelcomeMessage(fullName, email, plan);

        // Option A: Google Apps Script
        var scriptUrl = APP_CONFIG.GOOGLE_SCRIPT_URL;
        if (scriptUrl && scriptUrl.startsWith('https://script.google.com/')) {
            sendViaGoogleScript(fullName, email, content, statusBar);
            return;
        }

        // Option B: EmailJS
        var ejsKey = APP_CONFIG.EMAILJS_PUBLIC_KEY;
        var ejsService = APP_CONFIG.EMAILJS_SERVICE_ID;
        var ejsTemplate = APP_CONFIG.EMAILJS_TEMPLATE_ID;
        if (ejsKey && ejsService && ejsTemplate) {
            sendViaEmailJS(fullName, email, content, statusBar, ejsKey, ejsService, ejsTemplate);
            return;
        }
    }

    /** Send email TO user via Google Apps Script — same fetch() as Web3Forms */
    function sendViaGoogleScript(fullName, email, content, statusBar) {
        if (statusBar) {
            statusBar.textContent = 'Sending confirmation email to ' + email + '...';
            statusBar.style.background = '#2563eb';
            statusBar.style.color = '#fff';
            statusBar.classList.remove('hidden');
        }

        fetch(APP_CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                to_email: email,
                to_name: fullName,
                subject: content.subject,
                message: content.message
            })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (statusBar) {
                if (d.success) {
                    statusBar.textContent = 'Confirmation email sent to ' + email;
                    statusBar.style.background = '#16a34a';
                } else {
                    statusBar.textContent = 'Email failed: ' + (d.error || 'Unknown error');
                    statusBar.style.background = '#dc2626';
                }
                setTimeout(function() { statusBar.classList.add('hidden'); }, 5000);
            }
        })
        .catch(function(err) {
            if (statusBar) {
                statusBar.textContent = 'Email error: ' + err.message;
                statusBar.style.background = '#dc2626';
                setTimeout(function() { statusBar.classList.add('hidden'); }, 5000);
            }
        });
    }

    /** Send email TO user via EmailJS — same fetch() as Web3Forms */
    function sendViaEmailJS(fullName, email, content, statusBar, key, service, template) {
        if (statusBar) {
            statusBar.textContent = 'Sending confirmation email to ' + email + '...';
            statusBar.style.background = '#2563eb';
            statusBar.style.color = '#fff';
            statusBar.classList.remove('hidden');
        }

        fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: service,
                template_id: template,
                user_id: key,
                template_params: {
                    to_name: fullName,
                    to_email: email,
                    subject: content.subject,
                    message: content.message
                }
            })
        })
        .then(function(r) {
            if (statusBar) {
                if (r.ok) {
                    statusBar.textContent = 'Confirmation email sent to ' + email;
                    statusBar.style.background = '#16a34a';
                } else {
                    statusBar.textContent = 'Email failed — check EmailJS settings';
                    statusBar.style.background = '#dc2626';
                }
                setTimeout(function() { statusBar.classList.add('hidden'); }, 5000);
            }
        })
        .catch(function(err) {
            if (statusBar) {
                statusBar.textContent = 'Email error: ' + err.message;
                statusBar.style.background = '#dc2626';
                setTimeout(function() { statusBar.classList.add('hidden'); }, 5000);
            }
        });
    }

    /** Get next billing date (1 month from now) formatted for SA locale */
    function getNextBillingDate() {
        var d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
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
