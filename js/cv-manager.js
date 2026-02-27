/* ── CVManager — Save, Search, Filter, Load & Recycle Bin ── */
const CVManager = (() => {
    const STORAGE_KEY = 'cv_saved_cvs';
    const TRASH_KEY = 'cv_trash';
    const TRASH_EXPIRY_DAYS = 30;

    function _readAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn('CVManager: failed to read saved CVs', e);
            return [];
        }
    }

    function _writeAll(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            console.warn('CVManager: failed to write saved CVs', e);
        }
    }

    function _readTrash() {
        try {
            const raw = localStorage.getItem(TRASH_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function _writeTrash(list) {
        try {
            localStorage.setItem(TRASH_KEY, JSON.stringify(list));
        } catch (e) {
            console.warn('CVManager: failed to write trash', e);
        }
    }

    /** Snapshot working CV into saved list. Returns the new entry. */
    function save(name) {
        const data = CVStorage.getAll();
        const autoName = (data.step1 && data.step1.fullName) ? data.step1.fullName : '';
        const cvName = (name && name.trim()) ? name.trim() : (autoName || 'Untitled CV');
        const now = new Date().toISOString();
        const entry = {
            id: 'cv_' + Date.now(),
            name: cvName,
            createdAt: now,
            updatedAt: now,
            template: data.template || 'classic',
            data: JSON.parse(JSON.stringify(data))
        };
        const list = _readAll();
        list.push(entry);
        _writeAll(list);
        return entry;
    }

    /** Return full saved CVs array */
    function getAll() {
        return _readAll();
    }

    /** Return single saved CV by id */
    function get(id) {
        return _readAll().find(cv => cv.id === id) || null;
    }

    /** Soft-delete: move CV to recycle bin instead of permanent delete */
    function remove(id) {
        const list = _readAll();
        const idx = list.findIndex(cv => cv.id === id);
        if (idx === -1) return;

        const cv = list.splice(idx, 1)[0];
        cv.deletedAt = new Date().toISOString();
        _writeAll(list);

        const trash = _readTrash();
        trash.push(cv);
        _writeTrash(trash);
    }

    /** Rename a saved CV */
    function rename(id, newName) {
        const list = _readAll();
        const cv = list.find(c => c.id === id);
        if (cv) {
            cv.name = newName.trim() || cv.name;
            cv.updatedAt = new Date().toISOString();
            _writeAll(list);
        }
    }

    /** Duplicate a saved CV with "(copy)" suffix */
    function duplicate(id) {
        const list = _readAll();
        const original = list.find(c => c.id === id);
        if (!original) return null;
        const now = new Date().toISOString();
        const copy = {
            id: 'cv_' + Date.now(),
            name: original.name + ' (copy)',
            createdAt: now,
            updatedAt: now,
            template: original.template,
            data: JSON.parse(JSON.stringify(original.data))
        };
        list.push(copy);
        _writeAll(list);
        return copy;
    }

    /** Overwrite cv_generator_data with saved CV's data. Returns the data. */
    function load(id) {
        const cv = get(id);
        if (!cv) return null;
        CVStorage.saveAll(cv.data);
        return cv.data;
    }

    /** Re-snapshot working CV into an existing saved entry */
    function update(id) {
        const list = _readAll();
        const cv = list.find(c => c.id === id);
        if (!cv) return null;
        const data = CVStorage.getAll();
        cv.data = JSON.parse(JSON.stringify(data));
        cv.template = data.template || 'classic';
        cv.updatedAt = new Date().toISOString();
        _writeAll(list);
        return cv;
    }

    /** Filter CVs by name (case-insensitive substring match) */
    function search(query) {
        if (!query || !query.trim()) return _readAll();
        const q = query.trim().toLowerCase();
        return _readAll().filter(cv => cv.name.toLowerCase().includes(q));
    }

    /** Sort CV list by field and direction */
    function sort(list, field, dir) {
        const sorted = list.slice();
        const direction = dir === 'asc' ? 1 : -1;
        sorted.sort((a, b) => {
            if (field === 'name') {
                return direction * a.name.localeCompare(b.name);
            }
            const da = a[field] || '';
            const db = b[field] || '';
            return direction * da.localeCompare(db);
        });
        return sorted;
    }

    /** Number of saved CVs */
    function count() {
        return _readAll().length;
    }

    // ── Recycle Bin API ──

    /** Get all trashed CVs (auto-purge expired ones first) */
    function getTrash() {
        _purgeExpiredTrash();
        return _readTrash();
    }

    /** Number of items in trash */
    function trashCount() {
        return _readTrash().length;
    }

    /** Restore a CV from trash back to saved list */
    function restore(id) {
        const trash = _readTrash();
        const idx = trash.findIndex(cv => cv.id === id);
        if (idx === -1) return null;

        const cv = trash.splice(idx, 1)[0];
        delete cv.deletedAt;
        cv.updatedAt = new Date().toISOString();
        _writeTrash(trash);

        const list = _readAll();
        list.push(cv);
        _writeAll(list);
        return cv;
    }

    /** Permanently delete a CV from the recycle bin */
    function permanentDelete(id) {
        const trash = _readTrash().filter(cv => cv.id !== id);
        _writeTrash(trash);
    }

    /** Empty the entire recycle bin */
    function emptyTrash() {
        _writeTrash([]);
    }

    /** Remove items older than TRASH_EXPIRY_DAYS */
    function _purgeExpiredTrash() {
        const trash = _readTrash();
        const cutoff = Date.now() - (TRASH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        const kept = trash.filter(cv => {
            if (!cv.deletedAt) return true;
            return new Date(cv.deletedAt).getTime() > cutoff;
        });
        if (kept.length !== trash.length) {
            _writeTrash(kept);
        }
    }

    return {
        save, getAll, get, delete: remove, rename, duplicate, load, update,
        search, sort, count,
        getTrash, trashCount, restore, permanentDelete, emptyTrash
    };
})();
