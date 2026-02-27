/**
 * Subscription & payment module — Paystack integration + download tracking.
 * Supports 3-tier system: free, pro, premium.
 * Falls back to localStorage tracking when Supabase is not configured.
 */
const Subscription = (() => {
    'use strict';

    let supabase = null;
    const LOCAL_DOWNLOADS_KEY = 'cv_downloads';
    const LOCAL_SUBSCRIPTION_KEY = 'cv_subscription';

    function init() {
        supabase = Auth.getClient(); // null in local mode
    }

    // ── Local storage helpers ──
    function _getLocalDownloads() {
        try {
            const data = JSON.parse(localStorage.getItem(LOCAL_DOWNLOADS_KEY)) || {};
            return data;
        } catch { return {}; }
    }

    function _getLocalSubscription() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_SUBSCRIPTION_KEY));
        } catch { return null; }
    }

    /** Get current download count and subscription status */
    async function getStatus() {
        if (supabase && !Auth.isLocalMode()) {
            const user = await Auth.getUser();
            if (!user) return { downloads: 0, subscribed: false, plan: null };

            const { count } = await supabase
                .from('downloads')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            const { data: sub } = await supabase
                .from('subscriptions')
                .select('status, plan')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .maybeSingle();

            return {
                downloads: count || 0,
                subscribed: !!(sub && sub.status === 'active'),
                plan: sub ? sub.plan : null
            };
        }

        // Local mode
        const user = await Auth.getUser();
        if (!user) return { downloads: 0, subscribed: false, plan: null };

        const downloads = _getLocalDownloads();
        const userDownloads = downloads[user.id] || 0;

        const sub = _getLocalSubscription();
        const subscribed = !!(sub && sub.user_id === user.id && sub.status === 'active');
        const plan = (sub && sub.user_id === user.id) ? sub.plan : null;

        return { downloads: userDownloads, subscribed: subscribed, plan: plan };
    }

    /**
     * Get current tier: 'free', 'pro', or 'premium'.
     * Backward compat: existing plan='monthly' maps to 'pro'.
     */
    async function getTier() {
        try {
            const status = await getStatus();
            if (!status.subscribed || !status.plan) return 'free';
            const plan = status.plan.toLowerCase();
            if (plan === 'premium') return 'premium';
            // 'pro', 'monthly', or any other active plan = pro
            return 'pro';
        } catch (e) {
            return 'free';
        }
    }

    /** Max saved CVs allowed for current tier */
    async function getMaxSavedCVs() {
        const tier = await getTier();
        if (tier === 'premium') return APP_CONFIG.PREMIUM_SAVED_CVS;
        if (tier === 'pro') return APP_CONFIG.PRO_SAVED_CVS;
        return APP_CONFIG.FREE_SAVED_CVS;
    }

    /** Check if user can download (subscribed or free downloads remaining) */
    async function canDownload() {
        const status = await getStatus();
        if (status.subscribed) return true;
        return status.downloads < APP_CONFIG.FREE_DOWNLOADS;
    }

    /** Record a download */
    async function recordDownload() {
        if (supabase && !Auth.isLocalMode()) {
            const user = await Auth.getUser();
            if (!user) return;
            await supabase.from('downloads').insert({ user_id: user.id });
            return;
        }

        // Local mode
        const user = await Auth.getUser();
        if (!user) return;
        const downloads = _getLocalDownloads();
        downloads[user.id] = (downloads[user.id] || 0) + 1;
        localStorage.setItem(LOCAL_DOWNLOADS_KEY, JSON.stringify(downloads));
    }

    /**
     * Open Paystack payment popup for a specific tier.
     * @param {'pro'|'premium'} tier
     * @param {string} email
     * @param {function} onSuccess
     * @param {function} onClose
     */
    function startPaymentForTier(tier, email, onSuccess, onClose) {
        const amount = tier === 'premium' ? APP_CONFIG.PREMIUM_AMOUNT : APP_CONFIG.PRO_AMOUNT;
        const planCode = tier === 'premium' ? APP_CONFIG.PREMIUM_PLAN_CODE : APP_CONFIG.PRO_PLAN_CODE;
        const planName = tier === 'premium' ? 'premium' : 'pro';

        // If Paystack not available or in local/test mode, simulate payment
        if (typeof PaystackPop === 'undefined' || APP_CONFIG.PAYSTACK_PUBLIC_KEY.includes('YOUR_KEY')) {
            _simulatePayment(email, planName, amount, onSuccess, onClose);
            return;
        }

        const handler = PaystackPop.setup({
            key: APP_CONFIG.PAYSTACK_PUBLIC_KEY,
            email: email,
            amount: amount,
            currency: 'ZAR',
            plan: planCode,
            metadata: { custom_fields: [{ display_name: 'Plan', variable_name: 'plan', value: planName }] },
            callback: async function (response) {
                try {
                    const user = await Auth.getUser();
                    if (user && supabase && !Auth.isLocalMode()) {
                        await supabase
                            .from('subscriptions')
                            .upsert({
                                user_id: user.id,
                                paystack_reference: response.reference,
                                status: 'active',
                                plan: planName,
                                amount: amount,
                                started_at: new Date().toISOString()
                            }, { onConflict: 'user_id' });
                    }
                } catch (err) {
                    console.error('Failed to save subscription:', err);
                }
                _sendSubscriptionNotification(email, planName, amount);
                if (onSuccess) onSuccess(response);
            },
            onClose: function () {
                if (onClose) onClose();
            }
        });

        handler.openIframe();
    }

    /** Legacy wrapper — calls startPaymentForTier('pro', ...) */
    function startPayment(email, onSuccess, onClose) {
        startPaymentForTier('pro', email, onSuccess, onClose);
    }

    /** Simulate payment for local/test mode */
    function _simulatePayment(email, planName, amount, onSuccess, onClose) {
        const priceRand = (amount / 100).toFixed(0);
        const confirmed = confirm(
            'LOCAL TEST MODE\n\n' +
            'Subscribe to Revamp MyCV ' + planName.toUpperCase() + '?\n' +
            'R' + priceRand + '/month\n\n' +
            'Click OK to simulate successful payment.'
        );

        if (confirmed) {
            // Save local subscription
            Auth.getUser().then(user => {
                if (user) {
                    const sub = {
                        user_id: user.id,
                        paystack_reference: 'LOCAL_' + Date.now(),
                        status: 'active',
                        plan: planName,
                        amount: amount,
                        started_at: new Date().toISOString()
                    };
                    localStorage.setItem(LOCAL_SUBSCRIPTION_KEY, JSON.stringify(sub));
                }
                _sendSubscriptionNotification(email, planName, amount);
                if (onSuccess) onSuccess({ reference: 'LOCAL_' + Date.now() });
            });
        } else {
            if (onClose) onClose();
        }
    }

    /** Send subscription notification email via Web3Forms */
    function _sendSubscriptionNotification(email, planName, amount) {
        if (!APP_CONFIG.WEB3FORMS_KEY || APP_CONFIG.WEB3FORMS_KEY.includes('YOUR_')) return;
        var priceRand = (amount / 100).toFixed(0);
        Auth.getUser().then(function(user) {
            var fullName = (user && user.user_metadata && user.user_metadata.full_name) || 'Unknown';
            var payload = JSON.stringify({
                access_key: APP_CONFIG.WEB3FORMS_KEY,
                subject: 'New Subscription: ' + planName.charAt(0).toUpperCase() + planName.slice(1) + ' Plan - R' + priceRand,
                from_name: 'Revamp MyCV',
                to: APP_CONFIG.NOTIFICATION_EMAIL,
                message: 'A user has subscribed to a paid plan on Revamp MyCV.\n\nFull Name: ' + fullName + '\nEmail Address: ' + email + '\nPlan: ' + planName.charAt(0).toUpperCase() + planName.slice(1) + '\nAmount: R' + priceRand + '/month\nDate: ' + new Date().toLocaleString('en-ZA')
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
        }).catch(function() {});
    }

    /** Get subscription expiry info: { daysLeft, expiryDate, startedAt } or null */
    async function getSubscriptionExpiry() {
        try {
            const status = await getStatus();
            if (!status.subscribed) return null;

            let startedAt = null;

            if (supabase && !Auth.isLocalMode()) {
                const user = await Auth.getUser();
                if (!user) return null;
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('started_at')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .maybeSingle();
                if (sub && sub.started_at) startedAt = sub.started_at;
            } else {
                const sub = _getLocalSubscription();
                if (sub && sub.started_at) startedAt = sub.started_at;
            }

            if (!startedAt) return null;

            const start = new Date(startedAt);
            const expiry = new Date(start);
            expiry.setDate(expiry.getDate() + APP_CONFIG.SUBSCRIPTION_DURATION_DAYS);
            const now = new Date();
            const msLeft = expiry - now;
            const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

            return { daysLeft, expiryDate: expiry, startedAt: start };
        } catch (e) {
            return null;
        }
    }

    return { init, getStatus, getTier, getMaxSavedCVs, canDownload, recordDownload, startPayment, startPaymentForTier, getSubscriptionExpiry };
})();
