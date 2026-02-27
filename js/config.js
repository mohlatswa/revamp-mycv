/**
 * App configuration — reads admin-saved settings from localStorage,
 * falls back to defaults. Replace placeholder values for production.
 */
const APP_CONFIG = (() => {
    const defaults = {
        SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
        SUPABASE_ANON_KEY: 'YOUR_ANON_KEY_HERE',
        PAYSTACK_PUBLIC_KEY: 'pk_test_YOUR_KEY',
        PAYSTACK_PLAN_CODE: 'PLN_YOUR_PLAN_CODE',
        FREE_DOWNLOADS: 1,
        SUBSCRIPTION_AMOUNT: 4900,  // R49 in kobo (legacy)
        // 3-tier pricing
        PRO_AMOUNT: 4900,           // R49
        PREMIUM_AMOUNT: 14900,      // R149
        PRO_PLAN_CODE: 'PLN_YOUR_PRO_PLAN',
        PREMIUM_PLAN_CODE: 'PLN_YOUR_PREMIUM_PLAN',
        FREE_SAVED_CVS: 3,
        PRO_SAVED_CVS: 10,
        PREMIUM_SAVED_CVS: 999,
        // Web3Forms configuration
        WEB3FORMS_KEY: 'c697111c-4475-4e48-9bb7-756a58234f6a',
        NOTIFICATION_EMAIL: 'revamp.mycv@outlook.com',
        SUBSCRIPTION_DURATION_DAYS: 30,
        GA_MEASUREMENT_ID: 'G-XXXXXXXXXX'
    };

    // Override from admin-saved settings if available
    try {
        const saved = JSON.parse(localStorage.getItem('cv_admin_settings')) || {};
        if (saved.supabaseUrl) defaults.SUPABASE_URL = saved.supabaseUrl;
        if (saved.supabaseKey) defaults.SUPABASE_ANON_KEY = saved.supabaseKey;
        if (saved.paystackKey) defaults.PAYSTACK_PUBLIC_KEY = saved.paystackKey;
        if (saved.paystackPlan) defaults.PAYSTACK_PLAN_CODE = saved.paystackPlan;
        if (saved.freeDownloads != null) defaults.FREE_DOWNLOADS = saved.freeDownloads;
        if (saved.subPrice != null) defaults.SUBSCRIPTION_AMOUNT = saved.subPrice * 100;
        if (saved.proPrice != null) defaults.PRO_AMOUNT = saved.proPrice * 100;
        if (saved.premiumPrice != null) defaults.PREMIUM_AMOUNT = saved.premiumPrice * 100;
        if (saved.proPlan) defaults.PRO_PLAN_CODE = saved.proPlan;
        if (saved.premiumPlan) defaults.PREMIUM_PLAN_CODE = saved.premiumPlan;
        if (saved.web3formsKey) defaults.WEB3FORMS_KEY = saved.web3formsKey;
        if (saved.notificationEmail) defaults.NOTIFICATION_EMAIL = saved.notificationEmail;
        if (saved.subDurationDays != null) defaults.SUBSCRIPTION_DURATION_DAYS = saved.subDurationDays;
        if (saved.gaMeasurementId) defaults.GA_MEASUREMENT_ID = saved.gaMeasurementId;
    } catch (e) {
        // localStorage unavailable — use defaults
    }

    return Object.freeze(defaults);
})();
