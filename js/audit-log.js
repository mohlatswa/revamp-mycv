/**
 * Audit logging module — records admin actions in localStorage.
 * Provides a tamper-evident log of user management and system changes.
 */
const AuditLog = (() => {
    'use strict';

    const STORAGE_KEY = 'cv_audit_log';
    const MAX_ENTRIES = 500;

    function _getEntries() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch { return []; }
    }

    function _save(entries) {
        // Keep only the most recent MAX_ENTRIES
        if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }

    /**
     * Log an audit event.
     * @param {string} action — e.g. 'user.create', 'user.delete', 'sub.activate'
     * @param {string} actor — email of the admin performing the action
     * @param {string} target — email or ID of the affected user/entity
     * @param {string} [details] — optional description
     */
    function log(action, actor, target, details) {
        const entries = _getEntries();
        entries.push({
            ts: new Date().toISOString(),
            action: action,
            actor: actor || 'system',
            target: target || '',
            details: details || ''
        });
        _save(entries);
    }

    /** Get all log entries (newest first) */
    function getAll() {
        return _getEntries().reverse();
    }

    /** Clear the entire audit log */
    function clear() {
        localStorage.removeItem(STORAGE_KEY);
    }

    /** Get entries filtered by action prefix, e.g. 'user.' */
    function getByAction(prefix) {
        return _getEntries().filter(e => e.action.startsWith(prefix)).reverse();
    }

    return { log, getAll, clear, getByAction };
})();
