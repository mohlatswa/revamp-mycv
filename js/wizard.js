/**
 * Wizard step navigation and form validation.
 */
const Wizard = (() => {
    let currentStep = 1;
    const totalSteps = 6;
    let onStepChange = null;

    function init(stepChangeCallback) {
        onStepChange = stepChangeCallback;
        setupNavButtons();
        goToStep(1);
    }

    function setupNavButtons() {
        document.getElementById('btn-prev').addEventListener('click', prevStep);
        document.getElementById('btn-next').addEventListener('click', nextStep);
    }

    function goToStep(step) {
        if (step < 1 || step > totalSteps) return;

        // Hide all steps
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        // Show target step
        document.getElementById(`step-${step}`).classList.add('active');

        // Update progress bar
        document.querySelectorAll('.progress-step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.remove('active', 'completed');
            if (s === step) el.classList.add('active');
            else if (s < step) el.classList.add('completed');
        });

        currentStep = step;

        // Update nav buttons
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        btnPrev.disabled = step === 1;

        if (step === totalSteps) {
            btnNext.classList.add('btn-hidden');
        } else {
            btnNext.classList.remove('btn-hidden');
            btnNext.textContent = 'Next \u2192';
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (onStepChange) onStepChange(step);
    }

    function nextStep() {
        if (currentStep >= totalSteps) return;
        if (!validateCurrentStep()) return;
        goToStep(currentStep + 1);
    }

    function prevStep() {
        if (currentStep <= 1) return;
        goToStep(currentStep - 1);
    }

    function validateCurrentStep() {
        switch (currentStep) {
            case 1: return validatePersonalInfo();
            case 2: return true; // Experience is optional
            case 3: return true; // Education entries validated on add
            case 4: return true; // Skills optional
            case 5: return true; // References optional
            default: return true;
        }
    }

    function validatePersonalInfo() {
        let valid = true;

        valid = validateField('fullName', val => val.trim().length >= 2, 'Please enter your full name') && valid;
        valid = validateField('phone', val => /^[\d\s\-+()]{7,15}$/.test(val.trim()), 'Please enter a valid phone number') && valid;

        const email = document.getElementById('email').value.trim();
        if (email) {
            valid = validateField('email', val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()), 'Please enter a valid email address') && valid;
        } else {
            clearFieldError('email');
        }

        valid = validateField('location', val => val.trim().length >= 2, 'Please enter your town or city') && valid;
        valid = validateField('province', val => val !== '', 'Please select your province') && valid;

        return valid;
    }

    function validateField(fieldId, testFn, errorMsg) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(`error-${fieldId}`);
        const value = field.value;

        if (!testFn(value)) {
            field.classList.add('invalid');
            if (errorEl) errorEl.textContent = errorMsg;
            return false;
        } else {
            field.classList.remove('invalid');
            if (errorEl) errorEl.textContent = '';
            return true;
        }
    }

    function clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(`error-${fieldId}`);
        if (field) field.classList.remove('invalid');
        if (errorEl) errorEl.textContent = '';
    }

    function validateEntryForm(formId, fields) {
        let valid = true;
        fields.forEach(({ id, test, msg }) => {
            valid = validateField(id, test, msg) && valid;
        });
        return valid;
    }

    function getCurrentStep() {
        return currentStep;
    }

    return { init, goToStep, nextStep, prevStep, getCurrentStep, validateField, validateEntryForm, clearFieldError };
})();
