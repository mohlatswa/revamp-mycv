/**
 * App configuration — reads admin-saved settings from localStorage,
 * falls back to defaults.
 *
 * ── PRODUCTION SETUP ──
 * Replace the placeholder values below with your real credentials:
 *
 * 1. SUPABASE: Create a project at https://supabase.com
 *    - Run supabase-schema.sql in the SQL editor
 *    - Copy your project URL and anon key
 *
 * 2. PAYSTACK: Create an account at https://paystack.com
 *    - Get your LIVE public key (pk_live_...)
 *    - Create subscription plans for Pro (R49) and Premium (R149)
 *    - Copy the plan codes (PLN_...)
 *
 * 3. WEB3FORMS: Get your access key at https://web3forms.com
 *
 * 4. GOOGLE ANALYTICS: Get your measurement ID at https://analytics.google.com
 *
 * Alternatively, set all values via the Admin Panel (admin.html) after first login.
 */
const APP_CONFIG = (() => {
    const defaults = {
        // ── Supabase (Database & Auth) ──
        // Currently using localStorage mode. Add your Supabase credentials
        // via the Admin Panel (admin.html > System Settings) when ready.
        SUPABASE_URL: 'https://uwxnbaicwfbygvkiyhcf.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eG5iYWljd2ZieWd2a2l5aGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzEwOTEsImV4cCI6MjA4ODc0NzA5MX0.eEf8iGPW43yPyt2tQU9W2r3rzLwXmGhVMtyNrgMXy5Y',

        // ── Paystack (Payments) ──
        // Currently using EFT-only mode (simulated payment dialog).
        // Set up Paystack at https://paystack.com when ready and enter
        // your live key + plan codes via Admin Panel.
        PAYSTACK_PUBLIC_KEY: 'pk_test_YOUR_KEY',
        PAYSTACK_PLAN_CODE: 'PLN_YOUR_PLAN_CODE',

        // ── Plan Pricing (amounts in kobo: R1 = 100) ──
        FREE_DOWNLOADS: 2,
        SUBSCRIPTION_AMOUNT: 4900,
        PRO_AMOUNT: 4900,           // R49/month
        PREMIUM_AMOUNT: 14900,      // R149/month
        PRO_PLAN_CODE: 'PLN_YOUR_PRO_PLAN',
        PREMIUM_PLAN_CODE: 'PLN_YOUR_PREMIUM_PLAN',

        // ── Saved CV Limits ──
        FREE_SAVED_CVS: 3,
        PRO_SAVED_CVS: 10,
        PREMIUM_SAVED_CVS: 999,

        // ── Email Notifications (Web3Forms — admin notifications) ──
        WEB3FORMS_KEY: 'c697111c-4475-4e48-9bb7-756a58234f6a',
        NOTIFICATION_EMAIL: 'revamp.mycv@outlook.com',

        // ── User Emails (sends directly TO users) ──
        GOOGLE_SCRIPT_URL: '',
        EMAILJS_PUBLIC_KEY: '',
        EMAILJS_SERVICE_ID: '',
        EMAILJS_TEMPLATE_ID: '',

        // ── Subscription Duration ──
        SUBSCRIPTION_DURATION_DAYS: 30,

        // ── Google Analytics ──
        // Set up at https://analytics.google.com when ready.
        // Enter your G-XXXXXXXXXX ID via Admin Panel.
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
        if (saved.googleScriptUrl) defaults.GOOGLE_SCRIPT_URL = saved.googleScriptUrl;
        if (saved.emailjsPublicKey) defaults.EMAILJS_PUBLIC_KEY = saved.emailjsPublicKey;
        if (saved.emailjsServiceId) defaults.EMAILJS_SERVICE_ID = saved.emailjsServiceId;
        if (saved.emailjsTemplateId) defaults.EMAILJS_TEMPLATE_ID = saved.emailjsTemplateId;
        if (saved.subDurationDays != null) defaults.SUBSCRIPTION_DURATION_DAYS = saved.subDurationDays;
        if (saved.gaMeasurementId) defaults.GA_MEASUREMENT_ID = saved.gaMeasurementId;
    } catch (e) {
        // localStorage unavailable — use defaults
    }

    return Object.freeze(defaults);
})();
