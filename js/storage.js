/**
 * localStorage auto-save/load for CV data.
 * Schema: { step1: {...}, step2: [...], step3: [...], step4: [...], step5: [...], template: 'classic' }
 */
const CVStorage = (() => {
    const STORAGE_KEY = 'cv_generator_data';

    function getAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : getDefault();
        } catch (e) {
            console.warn('Failed to load CV data:', e);
            return getDefault();
        }
    }

    function getDefault() {
        return {
            step1: { fullName: '', phone: '', email: '', address: '', location: '', province: '', dateOfBirth: '', gender: '', nationality: '', maritalStatus: '', languages: '', driversLicence: '', disability: '', disabilityOther: '', objective: '' },
            step2: [],
            step3: [],
            step4: [],
            step5: [],
            template: 'classic'
        };
    }

    function saveAll(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save CV data:', e);
        }
    }

    function saveStep(stepKey, value) {
        const data = getAll();
        data[stepKey] = value;
        saveAll(data);
    }

    function getStep(stepKey) {
        return getAll()[stepKey];
    }

    function clearAll() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to clear CV data:', e);
        }
    }

    function saveTemplate(templateName) {
        const data = getAll();
        data.template = templateName;
        saveAll(data);
    }

    function getTemplate() {
        return getAll().template || 'classic';
    }

    function saveAccentColor(color) {
        const data = getAll();
        data.accentColor = color;
        saveAll(data);
    }

    function getAccentColor() {
        return getAll().accentColor || '';
    }

    return { getAll, saveAll, saveStep, getStep, clearAll, getDefault, saveTemplate, getTemplate, saveAccentColor, getAccentColor };
})();
