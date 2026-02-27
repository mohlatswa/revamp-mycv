/**
 * Settings module — manages user preferences (theme, font, session timeout, etc.)
 */
const Settings = (() => {
    'use strict';

    const STORAGE_KEY = 'cv_user_settings';

    const DEFAULTS = {
        theme: 'light',
        fontSize: 'medium',
        uiAccentColor: '',
        sessionTimeout: 7,
        autoSave: true,
        toastDuration: 3,
        autoSaveNotify: true
    };

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const saved = raw ? JSON.parse(raw) : {};
            return Object.assign({}, DEFAULTS, saved);
        } catch (e) {
            return Object.assign({}, DEFAULTS);
        }
    }

    function save(settings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }

    function get(key) {
        return load()[key];
    }

    function set(key, value) {
        const s = load();
        s[key] = value;
        save(s);
    }

    /** Apply theme, font size, and accent to the DOM */
    function apply(settings) {
        if (!settings) settings = load();

        // Theme
        if (settings.theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Font size
        document.body.classList.remove('font-small', 'font-medium', 'font-large');
        if (settings.fontSize && settings.fontSize !== 'medium') {
            document.body.classList.add('font-' + settings.fontSize);
        }

        // UI accent colour (optional override)
        if (settings.uiAccentColor) {
            document.documentElement.style.setProperty('--color-primary', settings.uiAccentColor);
        } else {
            document.documentElement.style.removeProperty('--color-primary');
        }
    }

    function resetToDefaults() {
        save(Object.assign({}, DEFAULTS));
        apply(DEFAULTS);
    }

    /** Export all CV data as a JSON file download */
    function exportData() {
        var data = {};
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key.startsWith('cv_') || key === 'cv_generator_data') {
                try {
                    data[key] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    data[key] = localStorage.getItem(key);
                }
            }
        }
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'revamp-mycv-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /** Import CV data from a JSON file — returns a Promise */
    function importData(file) {
        return new Promise(function (resolve, reject) {
            if (!file || !file.name.endsWith('.json')) {
                reject(new Error('Please select a .json file'));
                return;
            }
            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    var data = JSON.parse(e.target.result);
                    Object.keys(data).forEach(function (key) {
                        if (typeof data[key] === 'object') {
                            localStorage.setItem(key, JSON.stringify(data[key]));
                        } else {
                            localStorage.setItem(key, data[key]);
                        }
                    });
                    resolve();
                } catch (err) {
                    reject(new Error('Invalid JSON file'));
                }
            };
            reader.onerror = function () { reject(new Error('Failed to read file')); };
            reader.readAsText(file);
        });
    }

    /** Get estimated localStorage usage in KB */
    function getStorageUsage() {
        var total = 0;
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            var val = localStorage.getItem(key) || '';
            total += key.length + val.length;
        }
        return (total * 2 / 1024).toFixed(1); // chars × 2 bytes (UTF-16)
    }

    /** Clear all CV-related data from localStorage */
    function clearAllData() {
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key.startsWith('cv_') || key === 'cv_generator_data') {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(function (key) {
            localStorage.removeItem(key);
        });
    }

    return {
        load: load,
        save: save,
        get: get,
        set: set,
        apply: apply,
        resetToDefaults: resetToDefaults,
        exportData: exportData,
        importData: importData,
        getStorageUsage: getStorageUsage,
        clearAllData: clearAllData,
        DEFAULTS: DEFAULTS
    };
})();
