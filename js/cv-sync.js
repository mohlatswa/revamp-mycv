/**
 * CV Data Sync — persists CV data to Supabase for cross-device access and admin review.
 * Falls back gracefully to localStorage-only when Supabase is unavailable.
 */
const CVSync = (() => {
    'use strict';

    let _supabase = null;
    let _userId = null;
    let _syncTimer = null;
    let _dirty = false;
    const SYNC_DELAY = 3000; // Debounce writes by 3 seconds

    function init() {
        if (typeof window.__supabase !== 'undefined') {
            _supabase = window.__supabase;
        } else if (typeof supabase !== 'undefined' && typeof APP_CONFIG !== 'undefined' && APP_CONFIG.SUPABASE_URL) {
            try {
                _supabase = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_KEY);
            } catch (e) {
                _supabase = null;
            }
        }
    }

    /** Set the current user for sync operations */
    function setUser(userId) {
        _userId = userId;
    }

    /** Check if Supabase sync is available */
    function isAvailable() {
        return !!_supabase && !!_userId;
    }

    /**
     * Save current CV data to Supabase (debounced).
     * Call this on every auto-save event.
     */
    function syncToCloud() {
        if (!isAvailable()) return;

        _dirty = true;
        if (_syncTimer) clearTimeout(_syncTimer);
        _syncTimer = setTimeout(_doSync, SYNC_DELAY);
    }

    async function _doSync() {
        if (!_dirty || !isAvailable()) return;
        _dirty = false;

        try {
            const cvData = CVStorage.getAll();
            const template = CVStorage.getTemplate();
            const name = (cvData.step1 && cvData.step1.fullName) || 'My CV';

            // Upsert — use the user's active CV record
            const { data: existing } = await _supabase
                .from('cv_data')
                .select('id')
                .eq('user_id', _userId)
                .eq('is_active', true)
                .limit(1)
                .single();

            if (existing) {
                // Update existing record
                await _supabase
                    .from('cv_data')
                    .update({
                        name: name,
                        template: template,
                        data: cvData
                    })
                    .eq('id', existing.id);
            } else {
                // Insert new record
                await _supabase
                    .from('cv_data')
                    .insert({
                        user_id: _userId,
                        name: name,
                        template: template,
                        data: cvData,
                        is_active: true
                    });
            }
        } catch (e) {
            console.warn('CV cloud sync failed:', e);
            _dirty = true; // Retry on next trigger
        }
    }

    /**
     * Load CV data from Supabase into localStorage.
     * Called on login / page load to restore user's data.
     * Returns true if cloud data was loaded, false otherwise.
     */
    async function loadFromCloud() {
        if (!isAvailable()) return false;

        try {
            const { data, error } = await _supabase
                .from('cv_data')
                .select('*')
                .eq('user_id', _userId)
                .eq('is_active', true)
                .limit(1)
                .single();

            if (error || !data) return false;

            // Check if cloud data is newer than local data
            const localData = CVStorage.getAll();
            const localHasContent = localData.step1 && localData.step1.fullName;
            const cloudHasContent = data.data && data.data.step1 && data.data.step1.fullName;

            if (cloudHasContent && !localHasContent) {
                // Cloud has data but local is empty — restore from cloud
                CVStorage.saveAll(data.data);
                if (data.template) CVStorage.saveTemplate(data.template);
                return true;
            }

            return false;
        } catch (e) {
            console.warn('CV cloud load failed:', e);
            return false;
        }
    }

    /**
     * Save a named CV snapshot to Supabase.
     * Used by CVManager when user explicitly saves a CV.
     */
    async function saveSnapshot(cvEntry) {
        if (!isAvailable()) return;

        try {
            await _supabase
                .from('cv_data')
                .insert({
                    user_id: _userId,
                    name: cvEntry.name || 'Saved CV',
                    template: cvEntry.template || 'classic',
                    data: cvEntry.data || {},
                    is_active: false // Snapshots are not the active working CV
                });
        } catch (e) {
            console.warn('CV snapshot save failed:', e);
        }
    }

    /**
     * Admin: Get all CV data for all users.
     * Only works for admin users (RLS enforced).
     */
    async function adminGetAllCVs(page, limit) {
        if (!_supabase) return { data: [], count: 0 };

        page = page || 1;
        limit = limit || 50;
        const offset = (page - 1) * limit;

        try {
            const { data, error, count } = await _supabase
                .from('cv_data')
                .select('id, user_id, name, template, data, is_active, created_at, updated_at', { count: 'exact' })
                .order('updated_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return { data: data || [], count: count || 0 };
        } catch (e) {
            console.warn('Admin CV fetch failed:', e);
            return { data: [], count: 0 };
        }
    }

    /**
     * Admin: Get CV data for a specific user.
     */
    async function adminGetUserCVs(userId) {
        if (!_supabase) return [];

        try {
            const { data, error } = await _supabase
                .from('cv_data')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('Admin user CV fetch failed:', e);
            return [];
        }
    }

    /**
     * Admin: Search CVs by name, email, or content.
     */
    async function adminSearchCVs(query) {
        if (!_supabase || !query) return [];

        try {
            const { data, error } = await _supabase
                .from('cv_data')
                .select('id, user_id, name, template, data, is_active, created_at, updated_at')
                .or(`name.ilike.%${query}%,data->>step1.ilike.%${query}%`)
                .order('updated_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('Admin CV search failed:', e);
            return [];
        }
    }

    return {
        init,
        setUser,
        isAvailable,
        syncToCloud,
        loadFromCloud,
        saveSnapshot,
        adminGetAllCVs,
        adminGetUserCVs,
        adminSearchCVs
    };
})();
