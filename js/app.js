/**
 * App initialization — wires together wizard, storage, skills, renderer, export, auth, and subscription.
 */
(function () {
    'use strict';

    // ============================
    // Init
    // ============================
    document.addEventListener('DOMContentLoaded', async () => {
        // Apply user settings early (theme, font size, accent)
        Settings.apply(Settings.load());

        // Auth gate — redirect to login if not signed in
        const authReady = Auth.init();
        if (authReady) {
            const session = await Auth.getSession();
            if (!session) {
                window.location.replace('login.html');
                return;
            }

            // Clear CV data if a different user signed in
            clearDataIfNewUser(session.user.id);

            // Init subscription module
            Subscription.init();

            // Show user menu
            setupUserMenu(session);

            // Start session timeout (only for signed-in users)
            SessionTimer.init();

            // Listen for auth state changes (e.g. sign out from another tab)
            Auth.onAuthStateChange((event) => {
                if (event === 'SIGNED_OUT') {
                    window.location.replace('login.html');
                }
            });
        }

        loadSavedData();
        Wizard.init(onStepChange);
        setupAutoSave();
        setupExperienceForm();
        setupEducationForm();
        setupSkillsUI();
        setupReferencesForm();
        setupTemplateChooser();
        setupExportButtons();
        setupPhotoUpload();
        setupCVImport();
        setupPaywall();
        setupCVManager();
        setupDisabilityOther();
        setupSettings();
        registerServiceWorker();
    });

    // ============================
    // Clear CV data when a different user signs in
    // ============================
    function clearDataIfNewUser(userId) {
        const LAST_USER_KEY = 'cv_last_user';
        const lastUser = localStorage.getItem(LAST_USER_KEY);
        if (lastUser && lastUser !== userId) {
            // Different user — wipe previous CV data
            CVStorage.clearAll();
        }
        localStorage.setItem(LAST_USER_KEY, userId);
    }

    // ============================
    // User Menu
    // ============================
    async function setupUserMenu(session) {
        const menu = document.getElementById('user-menu');
        const emailEl = document.getElementById('user-email');
        const badge = document.getElementById('pro-badge');
        const logoutBtn = document.getElementById('btn-logout');

        if (!menu) return;

        emailEl.textContent = session.user.email;
        menu.style.display = 'flex';

        // Show Admin link for super_admin users
        const role = session.user.user_metadata && session.user.user_metadata.role;
        const adminBtn = document.getElementById('btn-admin');
        if (adminBtn && role === 'super_admin') {
            adminBtn.style.display = 'inline-block';
        }

        // Check subscription status and show tier badge + expiry countdown
        try {
            const tier = await Subscription.getTier();
            if (tier === 'pro' || tier === 'premium') {
                badge.textContent = tier.toUpperCase();
                badge.style.display = 'inline-block';

                // Show expiry countdown
                const expirySpan = document.getElementById('subscription-expiry');
                if (expirySpan) {
                    const expiry = await Subscription.getSubscriptionExpiry();
                    if (expiry) {
                        expirySpan.textContent = expiry.daysLeft > 0 ? expiry.daysLeft + 'd left' : 'Expired';
                        expirySpan.className = 'subscription-expiry';
                        if (expiry.daysLeft <= 3) {
                            expirySpan.classList.add('expiry-urgent');
                        } else if (expiry.daysLeft <= 7) {
                            expirySpan.classList.add('expiry-warning');
                        }
                        expirySpan.style.display = 'inline-block';
                    }
                }
            }
        } catch (e) {
            // Subscription check failed — continue without badge
        }

        logoutBtn.addEventListener('click', async () => {
            try {
                await Auth.signOut();
                window.location.replace('login.html');
            } catch (e) {
                showToast('Sign out failed. Please try again.');
            }
        });
    }

    // ============================
    // Paywall
    // ============================
    function setupPaywall() {
        const overlay = document.getElementById('paywall-overlay');
        const closeBtn = document.getElementById('btn-paywall-close');

        if (!overlay) return;

        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('show');
        });

        // Handle tier subscribe buttons (Pro and Premium)
        overlay.querySelectorAll('.btn-subscribe[data-tier]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tier = btn.dataset.tier;
                const user = await Auth.getUser();
                if (!user) return;

                Subscription.startPaymentForTier(
                    tier,
                    user.email,
                    // On success
                    async () => {
                        overlay.classList.remove('show');
                        const badge = document.getElementById('pro-badge');
                        if (badge) {
                            badge.textContent = tier.toUpperCase();
                            badge.style.display = 'inline-block';
                        }
                        // Show expiry countdown after payment
                        const expirySpan = document.getElementById('subscription-expiry');
                        if (expirySpan) {
                            expirySpan.textContent = APP_CONFIG.SUBSCRIPTION_DURATION_DAYS + 'd left';
                            expirySpan.className = 'subscription-expiry';
                            expirySpan.style.display = 'inline-block';
                        }
                        // Unlock profession templates if they were locked
                        unlockProfessionTemplates();
                        showToast('Subscription activated! Downloading your CV...');
                        await performDownload();
                    },
                    // On close
                    () => {}
                );
            });
        });
    }

    function showPaywall() {
        const overlay = document.getElementById('paywall-overlay');
        if (overlay) overlay.classList.add('show');
    }

    // ============================
    // Load saved data into forms
    // ============================
    function loadSavedData() {
        const data = CVStorage.getAll();

        // Step 1: Personal info
        const p = data.step1 || {};
        setVal('fullName', p.fullName);
        setVal('phone', p.phone);
        setVal('email', p.email);
        setVal('address', p.address);
        setVal('location', p.location);
        setVal('province', p.province);
        setVal('dateOfBirth', p.dateOfBirth);
        setVal('gender', p.gender);
        setVal('nationality', p.nationality);
        setVal('maritalStatus', p.maritalStatus);
        setVal('languages', p.languages);
        setVal('driversLicence', p.driversLicence);
        setVal('disability', p.disability);
        setVal('disabilityOther', p.disabilityOther);
        // Show "Other" input if disability is "Other"
        if (p.disability === 'Other') {
            var otherGroup = document.getElementById('disabilityOtherGroup');
            if (otherGroup) otherGroup.style.display = '';
        }
        setVal('objective', p.objective);

        // Restore photo
        if (p.photo) {
            const preview = document.getElementById('photo-preview');
            if (preview) {
                preview.innerHTML = '<img src="' + p.photo + '" alt="Photo">';
                const removeBtn = document.getElementById('btn-remove-photo');
                if (removeBtn) removeBtn.style.display = 'inline';
            }
        }

        // Step 2: Experience
        (data.step2 || []).forEach(job => renderExperienceCard(job));

        // Step 3: Education
        (data.step3 || []).forEach(edu => renderEducationCard(edu));

        // Step 4: Skills — loaded in setupSkillsUI

        // Step 5: References
        (data.step5 || []).forEach(ref => renderReferenceCard(ref));
    }

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    }

    // ============================
    // Auto-save on input change
    // ============================
    function setupAutoSave() {
        // Step 1 fields
        const step1Fields = ['fullName', 'phone', 'email', 'address', 'location', 'province', 'dateOfBirth', 'gender', 'nationality', 'maritalStatus', 'languages', 'driversLicence', 'disability', 'disabilityOther', 'objective'];
        step1Fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => savePersonalInfo());
                el.addEventListener('change', () => savePersonalInfo());
            }
        });
    }

    function savePersonalInfo() {
        CVStorage.saveStep('step1', {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            location: document.getElementById('location').value,
            province: document.getElementById('province').value,
            dateOfBirth: document.getElementById('dateOfBirth').value,
            gender: document.getElementById('gender').value,
            nationality: document.getElementById('nationality').value,
            maritalStatus: document.getElementById('maritalStatus').value,
            languages: document.getElementById('languages').value,
            driversLicence: document.getElementById('driversLicence').value,
            disability: document.getElementById('disability').value,
            disabilityOther: (document.getElementById('disabilityOther') || {}).value || '',
            objective: document.getElementById('objective').value,
            photo: (CVStorage.getStep('step1') || {}).photo || ''
        });
    }

    // ============================
    // Photo Upload
    // ============================
    function setupPhotoUpload() {
        const input = document.getElementById('photoUpload');
        const preview = document.getElementById('photo-preview');
        const removeBtn = document.getElementById('btn-remove-photo');

        if (!input || !preview) return;

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate: image only, max 2MB
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file.');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                showToast('Image must be under 2MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target.result;
                preview.innerHTML = '<img src="' + dataUrl + '" alt="Photo">';
                removeBtn.style.display = 'inline';

                // Save to storage
                const data = CVStorage.getStep('step1') || {};
                data.photo = dataUrl;
                CVStorage.saveStep('step1', data);
            };
            reader.readAsDataURL(file);
        });

        removeBtn.addEventListener('click', () => {
            preview.innerHTML = '<span class="photo-placeholder">+</span>';
            removeBtn.style.display = 'none';
            input.value = '';

            const data = CVStorage.getStep('step1') || {};
            data.photo = '';
            CVStorage.saveStep('step1', data);
        });
    }

    // ============================
    // CV Import (Optional)
    // ============================
    function setupCVImport() {
        const banner = document.getElementById('cv-import-banner');
        const fileInput = document.getElementById('cvFileUpload');
        const dismissBtn = document.getElementById('btn-import-dismiss');
        const progress = document.getElementById('cv-import-progress');

        if (!banner || !fileInput) return;

        // Hide banner if user already has data saved
        const existing = CVStorage.getAll();
        if (existing.step1 && existing.step1.fullName) {
            banner.style.display = 'none';
        }

        dismissBtn.addEventListener('click', () => {
            banner.classList.add('dismissed');
            setTimeout(() => { banner.style.display = 'none'; }, 300);
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Show progress
            progress.style.display = 'flex';

            try {
                const data = await CVParser.parse(file);

                // Fill Step 1: Personal info
                if (data.step1) {
                    const p = data.step1;
                    if (p.fullName) setVal('fullName', p.fullName);
                    if (p.phone) setVal('phone', p.phone);
                    if (p.email) setVal('email', p.email);
                    if (p.address) setVal('address', p.address);
                    if (p.location) setVal('location', p.location);
                    if (p.province) { document.getElementById('province').value = p.province; }
                    if (p.nationality) setVal('nationality', p.nationality);
                    if (p.gender) { document.getElementById('gender').value = p.gender; }
                    if (p.maritalStatus) { document.getElementById('maritalStatus').value = p.maritalStatus; }
                    if (p.languages) setVal('languages', p.languages);
                    if (p.driversLicence) { document.getElementById('driversLicence').value = p.driversLicence; }
                    savePersonalInfo();
                }

                // Fill Step 2: Experience
                if (data.step2 && data.step2.length) {
                    CVStorage.saveStep('step2', data.step2);
                    document.getElementById('experience-list').innerHTML = '';
                    data.step2.forEach(job => renderExperienceCard(job));
                }

                // Fill Step 3: Education
                if (data.step3 && data.step3.length) {
                    CVStorage.saveStep('step3', data.step3);
                    document.getElementById('education-list').innerHTML = '';
                    data.step3.forEach(edu => renderEducationCard(edu));
                }

                // Fill Step 4: Skills
                if (data.step4 && data.step4.length) {
                    CVStorage.saveStep('step4', data.step4);
                }

                // Fill Step 5: References
                if (data.step5 && data.step5.length) {
                    CVStorage.saveStep('step5', data.step5);
                    document.getElementById('references-list').innerHTML = '';
                    data.step5.forEach(ref => renderReferenceCard(ref));
                }

                // Hide banner
                banner.classList.add('dismissed');
                setTimeout(() => { banner.style.display = 'none'; }, 300);

                showToast('CV imported! Review and edit your details below.');

            } catch (err) {
                showToast(err.message || 'Failed to parse CV. Try a different file.');
            } finally {
                progress.style.display = 'none';
                fileInput.value = '';
            }
        });
    }

    // ============================
    // Step change handler
    // ============================
    function onStepChange(step) {
        if (step === 6) {
            renderCVPreview();
        }
    }

    // ============================
    // EXPERIENCE (Step 2)
    // ============================
    function setupExperienceForm() {
        document.getElementById('btn-add-experience').addEventListener('click', () => {
            const valid = Wizard.validateEntryForm('form-experience', [
                { id: 'jobTitle', test: v => v.trim().length >= 2, msg: 'Please enter a job title' },
                { id: 'company', test: v => v.trim().length >= 2, msg: 'Please enter the company name' },
                { id: 'startDate', test: v => v !== '', msg: 'Please enter a start date' }
            ]);
            if (!valid) return;

            const job = {
                jobTitle: document.getElementById('jobTitle').value.trim(),
                company: document.getElementById('company').value.trim(),
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                currentJob: document.getElementById('currentJob').checked,
                duties: document.getElementById('duties').value.trim()
            };

            const jobs = CVStorage.getStep('step2') || [];
            jobs.push(job);
            CVStorage.saveStep('step2', jobs);
            renderExperienceCard(job);
            clearForm('form-experience');
            showToast('Job added!');
        });

        document.getElementById('currentJob').addEventListener('change', function () {
            document.getElementById('endDate').disabled = this.checked;
            if (this.checked) document.getElementById('endDate').value = '';
        });
    }

    function renderExperienceCard(job) {
        const list = document.getElementById('experience-list');
        const card = document.createElement('div');
        card.className = 'entry-card';

        const dateRange = formatDateShort(job.startDate) + ' \u2013 ' +
            (job.currentJob ? 'Present' : formatDateShort(job.endDate));

        card.innerHTML = `
            <h4>${esc(job.jobTitle)}</h4>
            <p>${esc(job.company)} &middot; ${dateRange}</p>
            ${job.duties ? `<p style="font-size:0.8125rem;color:#666;margin-top:4px">${esc(job.duties).substring(0, 80)}${job.duties.length > 80 ? '...' : ''}</p>` : ''}
            <div class="entry-actions">
                <button class="btn-remove" title="Remove">&times;</button>
            </div>
        `;

        card.querySelector('.btn-remove').addEventListener('click', () => {
            card.remove();
            const jobs = CVStorage.getStep('step2') || [];
            const idx = jobs.findIndex(j => j.jobTitle === job.jobTitle && j.company === job.company && j.startDate === job.startDate);
            if (idx > -1) jobs.splice(idx, 1);
            CVStorage.saveStep('step2', jobs);
            showToast('Job removed');
        });

        list.appendChild(card);
    }

    // ============================
    // EDUCATION (Step 3)
    // ============================
    function setupEducationForm() {
        document.getElementById('btn-add-education').addEventListener('click', () => {
            const valid = Wizard.validateEntryForm('form-education', [
                { id: 'institution', test: v => v.trim().length >= 2, msg: 'Please enter the school or institution' },
                { id: 'qualification', test: v => v.trim().length >= 2, msg: 'Please enter your qualification' }
            ]);
            if (!valid) return;

            const edu = {
                institution: document.getElementById('institution').value.trim(),
                qualification: document.getElementById('qualification').value.trim(),
                year: document.getElementById('eduYear').value.trim()
            };

            const edus = CVStorage.getStep('step3') || [];
            edus.push(edu);
            CVStorage.saveStep('step3', edus);
            renderEducationCard(edu);
            clearForm('form-education');
            showToast('Education added!');
        });
    }

    function renderEducationCard(edu) {
        const list = document.getElementById('education-list');
        const card = document.createElement('div');
        card.className = 'entry-card';

        card.innerHTML = `
            <h4>${esc(edu.qualification)}</h4>
            <p>${esc(edu.institution)}${edu.year ? ' &middot; ' + esc(edu.year) : ''}</p>
            <div class="entry-actions">
                <button class="btn-remove" title="Remove">&times;</button>
            </div>
        `;

        card.querySelector('.btn-remove').addEventListener('click', () => {
            card.remove();
            const edus = CVStorage.getStep('step3') || [];
            const idx = edus.findIndex(e => e.institution === edu.institution && e.qualification === edu.qualification);
            if (idx > -1) edus.splice(idx, 1);
            CVStorage.saveStep('step3', edus);
            showToast('Education removed');
        });

        list.appendChild(card);
    }

    // ============================
    // SKILLS (Step 4)
    // ============================
    function setupSkillsUI() {
        const savedSkills = CVStorage.getStep('step4') || [];
        const categorySelect = document.getElementById('skillCategory');
        const grid = document.getElementById('skills-grid');

        // Populate category dropdown
        Object.keys(SKILLS_DATA).forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categorySelect.appendChild(opt);
        });

        // Render skill buttons
        function renderSkillButtons(filterCat) {
            grid.innerHTML = '';
            const categories = filterCat === 'all' ? Object.keys(SKILLS_DATA) : [filterCat];

            categories.forEach(cat => {
                SKILLS_DATA[cat].forEach(skill => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'skill-btn';
                    btn.textContent = skill;
                    if (savedSkills.includes(skill)) btn.classList.add('selected');

                    btn.addEventListener('click', () => {
                        toggleSkill(skill, btn);
                    });

                    grid.appendChild(btn);
                });
            });
        }

        renderSkillButtons('all');
        categorySelect.addEventListener('change', () => renderSkillButtons(categorySelect.value));

        // Custom skill
        document.getElementById('btn-add-skill').addEventListener('click', addCustomSkill);
        document.getElementById('customSkill').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); }
        });

        // Render saved selected skills chips
        updateSkillsChips();
    }

    function toggleSkill(skill, btnEl) {
        const skills = CVStorage.getStep('step4') || [];
        const idx = skills.indexOf(skill);

        if (idx > -1) {
            skills.splice(idx, 1);
            if (btnEl) btnEl.classList.remove('selected');
        } else {
            skills.push(skill);
            if (btnEl) btnEl.classList.add('selected');
        }

        CVStorage.saveStep('step4', skills);
        updateSkillsChips();
    }

    function addCustomSkill() {
        const input = document.getElementById('customSkill');
        const skill = input.value.trim();
        if (!skill) return;

        const skills = CVStorage.getStep('step4') || [];
        if (skills.includes(skill)) {
            showToast('Skill already added');
            return;
        }

        skills.push(skill);
        CVStorage.saveStep('step4', skills);
        input.value = '';
        updateSkillsChips();

        // Also mark in grid if it exists
        document.querySelectorAll('.skill-btn').forEach(btn => {
            if (btn.textContent === skill) btn.classList.add('selected');
        });

        showToast('Skill added!');
    }

    function updateSkillsChips() {
        const skills = CVStorage.getStep('step4') || [];
        const container = document.getElementById('selected-skills-list');
        const hint = document.getElementById('no-skills-hint');

        container.innerHTML = '';
        hint.style.display = skills.length === 0 ? 'block' : 'none';

        skills.forEach(skill => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerHTML = `${esc(skill)} <button class="chip-remove" title="Remove">&times;</button>`;

            chip.querySelector('.chip-remove').addEventListener('click', () => {
                toggleSkill(skill, document.querySelector(`.skill-btn.selected[data-skill="${skill}"]`));
                // Remove selected class from grid buttons
                document.querySelectorAll('.skill-btn').forEach(btn => {
                    if (btn.textContent === skill) btn.classList.remove('selected');
                });
            });

            container.appendChild(chip);
        });
    }

    // ============================
    // REFERENCES (Step 5)
    // ============================
    function setupReferencesForm() {
        document.getElementById('btn-add-reference').addEventListener('click', () => {
            const valid = Wizard.validateEntryForm('form-references', [
                { id: 'refName', test: v => v.trim().length >= 2, msg: 'Please enter the reference name' },
                { id: 'refRelationship', test: v => v.trim().length >= 2, msg: 'Please enter the relationship' },
                { id: 'refPhone', test: v => /^[\d\s\-+()]{7,15}$/.test(v.trim()), msg: 'Please enter a valid phone number' }
            ]);
            if (!valid) return;

            const ref = {
                name: document.getElementById('refName').value.trim(),
                relationship: document.getElementById('refRelationship').value.trim(),
                phone: document.getElementById('refPhone').value.trim()
            };

            const refs = CVStorage.getStep('step5') || [];
            refs.push(ref);
            CVStorage.saveStep('step5', refs);
            renderReferenceCard(ref);
            clearForm('form-references');
            showToast('Reference added!');
        });
    }

    function renderReferenceCard(ref) {
        const list = document.getElementById('references-list');
        const card = document.createElement('div');
        card.className = 'entry-card';

        card.innerHTML = `
            <h4>${esc(ref.name)}</h4>
            <p>${esc(ref.relationship)} &middot; ${esc(ref.phone)}</p>
            <div class="entry-actions">
                <button class="btn-remove" title="Remove">&times;</button>
            </div>
        `;

        card.querySelector('.btn-remove').addEventListener('click', () => {
            card.remove();
            const refs = CVStorage.getStep('step5') || [];
            const idx = refs.findIndex(r => r.name === ref.name && r.phone === ref.phone);
            if (idx > -1) refs.splice(idx, 1);
            CVStorage.saveStep('step5', refs);
            showToast('Reference removed');
        });

        list.appendChild(card);
    }

    // ============================
    // TEMPLATE CHOOSER (Step 6)
    // ============================
    function setupTemplateChooser() {
        const savedTemplate = CVStorage.getTemplate();
        const savedColor = CVStorage.getAccentColor();

        // Template card selection
        document.querySelectorAll('.template-card').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.template === savedTemplate);
            btn.addEventListener('click', () => {
                // If locked, show paywall instead
                if (btn.classList.contains('locked')) {
                    showPaywall();
                    return;
                }
                document.querySelectorAll('.template-card').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                CVStorage.saveTemplate(btn.dataset.template);
                renderCVPreview();
            });
        });

        // Lock profession templates for free users
        lockProfessionTemplatesIfFree();

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.template-tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            });
        });

        // Profession template search
        const searchInput = document.getElementById('templateSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const q = searchInput.value.toLowerCase().trim();
                document.querySelectorAll('#profession-templates .template-card').forEach(card => {
                    if (!q) {
                        card.style.display = '';
                        return;
                    }
                    const name = (card.querySelector('.template-name')?.textContent || '').toLowerCase();
                    const keywords = (card.dataset.keywords || '').toLowerCase();
                    card.style.display = (name.includes(q) || keywords.includes(q)) ? '' : 'none';
                });
            });
        }

        // Color presets
        document.querySelectorAll('.color-dot').forEach(dot => {
            if (savedColor && dot.dataset.color === savedColor) {
                document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
            } else if (!savedColor && dot.dataset.color === '') {
                dot.classList.add('active');
            }
            dot.addEventListener('click', () => {
                document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                CVStorage.saveAccentColor(dot.dataset.color);
                applyAccentColor(dot.dataset.color);
                renderCVPreview();
            });
        });

        // Custom color picker
        const customColorInput = document.getElementById('customColor');
        if (customColorInput) {
            if (savedColor) customColorInput.value = savedColor;
            customColorInput.addEventListener('input', () => {
                document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                CVStorage.saveAccentColor(customColorInput.value);
                applyAccentColor(customColorInput.value);
                renderCVPreview();
            });
        }

        // Apply saved color on load
        if (savedColor) applyAccentColor(savedColor);
    }

    function applyAccentColor(color) {
        const preview = document.getElementById('cv-preview');
        if (!preview) return;
        if (color) {
            preview.style.setProperty('--cv-accent', color);
        } else {
            preview.style.removeProperty('--cv-accent');
        }
    }

    // ============================
    // PROFESSION TEMPLATE LOCKING
    // ============================
    async function lockProfessionTemplatesIfFree() {
        try {
            const tier = await Subscription.getTier();
            if (tier === 'free') {
                document.querySelectorAll('#profession-templates .template-card').forEach(card => {
                    card.classList.add('locked');
                });
                const badge = document.getElementById('template-lock-badge');
                if (badge) badge.style.display = '';
            }
        } catch (e) {
            // If check fails, don't lock
        }
    }

    function unlockProfessionTemplates() {
        document.querySelectorAll('#profession-templates .template-card.locked').forEach(card => {
            card.classList.remove('locked');
        });
        const badge = document.getElementById('template-lock-badge');
        if (badge) badge.style.display = 'none';
    }

    // ============================
    // CV PREVIEW
    // ============================
    function renderCVPreview() {
        const data = CVStorage.getAll();
        const template = CVStorage.getTemplate();
        const previewEl = document.getElementById('cv-preview');
        previewEl.innerHTML = CVRenderer.render(data, template);
        applyAccentColor(CVStorage.getAccentColor());
    }

    // ============================
    // EXPORT BUTTONS (with download gating)
    // ============================
    function setupExportButtons() {
        document.getElementById('btn-download-pdf').addEventListener('click', async () => {
            // Check if auth is available and user can download
            try {
                const user = await Auth.getUser();
                if (user) {
                    const allowed = await Subscription.canDownload();
                    if (!allowed) {
                        showPaywall();
                        return;
                    }
                }
            } catch (e) {
                // Auth not available — allow download (offline/no auth mode)
            }

            await performDownload();
        });

        document.getElementById('btn-print').addEventListener('click', () => {
            renderCVPreview(); // ensure latest data is rendered
            PDFExport.printCV();
        });
    }

    let _lastAutoSaveTime = 0;

    async function performDownload() {
        // Always re-render preview to ensure it has the latest data
        renderCVPreview();

        const data = CVStorage.getAll();
        const name = (data.step1.fullName || 'my-cv').replace(/\s+/g, '-').toLowerCase();
        const previewEl = document.getElementById('cv-preview');
        PDFExport.downloadPDF(previewEl, `${name}-cv.pdf`);

        // Auto-save CV on download (skip if saved within last 60 seconds)
        const now = Date.now();
        if (now - _lastAutoSaveTime > 60000) {
            try {
                CVManager.save();
                _lastAutoSaveTime = now;
            } catch (e) { /* ignore */ }
        }

        // Record the download
        try {
            await Subscription.recordDownload();
        } catch (e) {
            // Recording failed — don't block the download
        }
    }

    // ============================
    // DISABILITY "OTHER" TOGGLE
    // ============================
    function setupDisabilityOther() {
        const sel = document.getElementById('disability');
        const group = document.getElementById('disabilityOtherGroup');
        if (!sel || !group) return;

        sel.addEventListener('change', () => {
            group.style.display = sel.value === 'Other' ? '' : 'none';
            if (sel.value !== 'Other') {
                const inp = document.getElementById('disabilityOther');
                if (inp) inp.value = '';
            }
        });
    }

    // ============================
    // SETTINGS PANEL
    // ============================
    function setupSettings() {
        const overlay = document.getElementById('settings-overlay');
        const openBtn = document.getElementById('btn-settings');
        const closeBtn = document.getElementById('settings-close');
        if (!overlay || !openBtn) return;

        // Open / close
        openBtn.addEventListener('click', () => {
            populateSettingsUI();
            overlay.classList.add('show');
        });
        closeBtn.addEventListener('click', () => overlay.classList.remove('show'));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('show');
        });

        // Tab switching
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const target = document.getElementById('settings-tab-' + tab.dataset.settingsTab);
                if (target) target.classList.add('active');
            });
        });

        // Theme
        document.getElementById('setting-theme').addEventListener('change', function () {
            Settings.set('theme', this.value);
            Settings.apply();
        });

        // Font size
        document.getElementById('setting-fontSize').addEventListener('change', function () {
            Settings.set('fontSize', this.value);
            Settings.apply();
        });

        // UI accent colour
        document.getElementById('setting-uiAccentColor').addEventListener('input', function () {
            Settings.set('uiAccentColor', this.value);
            Settings.apply();
        });

        document.getElementById('setting-resetAccent').addEventListener('click', () => {
            Settings.set('uiAccentColor', '');
            Settings.apply();
            document.getElementById('setting-uiAccentColor').value = '#1a6b3c';
        });

        // Session timeout slider
        const slider = document.getElementById('setting-sessionTimeout');
        const sliderVal = document.getElementById('setting-sessionTimeout-val');
        slider.addEventListener('input', function () {
            sliderVal.textContent = this.value + ' min';
        });
        slider.addEventListener('change', function () {
            const mins = parseInt(this.value, 10);
            Settings.set('sessionTimeout', mins);
            SessionTimer.updateTimeout(mins);
        });

        // Auto-save toggle
        document.getElementById('setting-autoSave').addEventListener('change', function () {
            Settings.set('autoSave', this.checked);
        });

        // Export
        document.getElementById('setting-export').addEventListener('click', () => {
            Settings.exportData();
            showToast('CV data exported!');
        });

        // Import
        document.getElementById('setting-import-file').addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            Settings.importData(file).then(() => {
                showToast('Data imported! Reloading...');
                setTimeout(() => window.location.reload(), 1000);
            }).catch(err => {
                showToast(err.message || 'Import failed');
            });
            this.value = '';
        });

        // Clear all data
        document.getElementById('setting-clearAll').addEventListener('click', () => {
            if (confirm('This will permanently delete ALL your saved CV data. Continue?')) {
                Settings.clearAllData();
                showToast('All data cleared. Reloading...');
                setTimeout(() => window.location.reload(), 1000);
            }
        });

        // Upgrade button — close settings and open paywall
        const upgradeBtn = document.getElementById('setting-upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                overlay.classList.remove('show');
                showPaywall();
            });
        }

        // Reset to defaults
        document.getElementById('setting-resetDefaults').addEventListener('click', () => {
            if (confirm('Reset all settings to factory defaults?')) {
                Settings.resetToDefaults();
                populateSettingsUI();
                showToast('Settings reset to defaults');
            }
        });
    }

    async function populateSettingsUI() {
        const s = Settings.load();
        document.getElementById('setting-theme').value = s.theme;
        document.getElementById('setting-fontSize').value = s.fontSize;
        document.getElementById('setting-uiAccentColor').value = s.uiAccentColor || '#1a6b3c';
        document.getElementById('setting-sessionTimeout').value = s.sessionTimeout;
        document.getElementById('setting-sessionTimeout-val').textContent = s.sessionTimeout + ' min';
        document.getElementById('setting-autoSave').checked = s.autoSave;
        document.getElementById('setting-storage-usage').textContent = Settings.getStorageUsage() + ' KB';

        // Populate subscription tab
        try {
            const tier = await Subscription.getTier();
            const planEl = document.getElementById('setting-current-plan');
            const expiryEl = document.getElementById('setting-expiry-countdown');
            const startedEl = document.getElementById('setting-started-on');
            const upgradeBtn = document.getElementById('setting-upgrade-btn');

            if (planEl) planEl.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);

            if (tier !== 'free') {
                const expiry = await Subscription.getSubscriptionExpiry();
                if (expiry) {
                    if (expiryEl) {
                        expiryEl.textContent = expiry.daysLeft > 0
                            ? expiry.daysLeft + ' days remaining (expires ' + expiry.expiryDate.toLocaleDateString('en-ZA') + ')'
                            : 'Expired on ' + expiry.expiryDate.toLocaleDateString('en-ZA');
                    }
                    if (startedEl) {
                        startedEl.textContent = expiry.startedAt.toLocaleDateString('en-ZA');
                    }
                }
                if (upgradeBtn && tier === 'premium') upgradeBtn.style.display = 'none';
            } else {
                if (expiryEl) expiryEl.textContent = '—';
                if (startedEl) startedEl.textContent = '—';
                if (upgradeBtn) upgradeBtn.style.display = 'inline-flex';
            }
        } catch (e) {
            // Subscription info unavailable
        }
    }

    // ============================
    // UTILITIES
    // ============================
    function clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
            form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        }
    }

    function esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function formatDateShort(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + '-01');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ============================
    // CV MANAGER (My CVs)
    // ============================
    /** Check if user can save another CV based on their tier limit */
    async function canSaveCV() {
        try {
            const max = await Subscription.getMaxSavedCVs();
            const current = CVManager.count();
            return current < max;
        } catch (e) {
            return true; // allow save if check fails
        }
    }

    function setupCVManager() {
        const overlay = document.getElementById('mycvs-overlay');
        const openBtn = document.getElementById('btn-my-cvs');
        const closeBtn = document.getElementById('mycvs-close');
        const saveBtn = document.getElementById('btn-save-cv');
        const finishBtn = document.getElementById('btn-finish-cv');
        const searchInput = document.getElementById('mycvs-search');
        const sortField = document.getElementById('mycvs-sort-field');
        const sortDirBtn = document.getElementById('mycvs-sort-dir');
        const emptyTrashBtn = document.getElementById('btn-empty-trash');

        if (!overlay) return;

        let currentSortDir = 'desc';

        function openModal() {
            if (searchInput) searchInput.value = '';
            currentSortDir = 'desc';
            if (sortField) sortField.value = 'updatedAt';
            updateSortDirLabel();
            refreshList();
            refreshTrashList();
            // Reset to Saved CVs tab
            switchTab('saved');
            overlay.classList.add('show');
        }

        function closeModal() {
            overlay.classList.remove('show');
        }

        function updateSortDirLabel() {
            if (!sortDirBtn) return;
            const field = sortField ? sortField.value : 'updatedAt';
            if (field === 'name') {
                sortDirBtn.innerHTML = currentSortDir === 'asc' ? '&#9650; A-Z' : '&#9660; Z-A';
            } else {
                sortDirBtn.innerHTML = currentSortDir === 'asc' ? '&#9650; Oldest' : '&#9660; Newest';
            }
        }

        function refreshList() {
            const query = searchInput ? searchInput.value : '';
            let list = CVManager.search(query);
            const field = sortField ? sortField.value : 'updatedAt';
            list = CVManager.sort(list, field, currentSortDir);
            renderCVList(list);
            const countEl = document.getElementById('mycvs-count');
            if (countEl) countEl.textContent = CVManager.count();
        }

        function refreshTrashList() {
            const trashItems = CVManager.getTrash();
            renderTrashList(trashItems);
            // Update trash count badge
            const trashCountEl = document.getElementById('mycvs-trash-count');
            const tc = CVManager.trashCount();
            if (trashCountEl) {
                trashCountEl.textContent = tc;
                trashCountEl.style.display = tc > 0 ? '' : 'none';
            }
            // Show/hide empty trash button
            if (emptyTrashBtn) {
                emptyTrashBtn.style.display = tc > 0 ? '' : 'none';
            }
        }

        // Tab switching
        function switchTab(tabName) {
            overlay.querySelectorAll('.mycvs-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.mycvsTab === tabName);
            });
            overlay.querySelectorAll('.mycvs-tab-content').forEach(c => {
                c.classList.toggle('active', c.id === 'mycvs-tab-' + tabName);
            });
        }

        overlay.querySelectorAll('.mycvs-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                switchTab(tab.dataset.mycvsTab);
            });
        });

        /** Common save logic with tier limit check */
        async function handleSaveCV() {
            const allowed = await canSaveCV();
            if (!allowed) {
                showPaywall();
                showToast('CV limit reached. Upgrade to save more CVs.');
                return;
            }
            const data = CVStorage.getAll();
            const defaultName = (data.step1 && data.step1.fullName) ? data.step1.fullName : '';
            const name = prompt('Name this CV:', defaultName);
            if (name === null) return;
            CVManager.save(name);
            showToast('CV saved successfully!');
        }

        // Open
        if (openBtn) openBtn.addEventListener('click', openModal);

        // Save CV button
        if (saveBtn) {
            saveBtn.addEventListener('click', handleSaveCV);
        }

        // Finish & Save button
        if (finishBtn) {
            finishBtn.addEventListener('click', async () => {
                const allowed = await canSaveCV();
                if (!allowed) {
                    showPaywall();
                    showToast('CV limit reached. Upgrade to save more CVs.');
                    return;
                }
                const data = CVStorage.getAll();
                const defaultName = (data.step1 && data.step1.fullName) ? data.step1.fullName : '';
                const name = prompt('Name this CV:', defaultName);
                if (name === null) return;
                CVManager.save(name);
                showToast('CV saved! You can find it in My CVs.');
                if (confirm('CV saved! Would you like to start a new CV?')) {
                    CVStorage.clearAll();
                    window.location.reload();
                }
            });
        }

        // Close
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Search
        if (searchInput) searchInput.addEventListener('input', refreshList);

        // Sort field
        if (sortField) sortField.addEventListener('change', () => {
            updateSortDirLabel();
            refreshList();
        });

        // Sort direction toggle
        if (sortDirBtn) sortDirBtn.addEventListener('click', () => {
            currentSortDir = currentSortDir === 'desc' ? 'asc' : 'desc';
            updateSortDirLabel();
            refreshList();
        });

        // Empty trash button
        if (emptyTrashBtn) {
            emptyTrashBtn.addEventListener('click', () => {
                if (!confirm('Permanently delete all CVs in the recycle bin? This cannot be undone.')) return;
                CVManager.emptyTrash();
                refreshTrashList();
                showToast('Recycle bin emptied.');
            });
        }

        // Delegate card action clicks — saved CVs list
        const listContainer = document.getElementById('saved-cvs-list');
        if (listContainer) {
            listContainer.addEventListener('click', async (e) => {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                if (action === 'load') {
                    const result = CVManager.load(id);
                    if (result) window.location.reload();
                } else if (action === 'download') {
                    await downloadSavedCV(id);
                } else if (action === 'rename') {
                    const cv = CVManager.get(id);
                    if (!cv) return;
                    const newName = prompt('Rename CV:', cv.name);
                    if (newName === null || !newName.trim()) return;
                    CVManager.rename(id, newName);
                    refreshList();
                    showToast('CV renamed.');
                } else if (action === 'duplicate') {
                    CVManager.duplicate(id);
                    refreshList();
                    showToast('CV duplicated.');
                } else if (action === 'delete') {
                    CVManager.delete(id);
                    refreshList();
                    refreshTrashList();
                    showToast('CV moved to recycle bin.');
                }
            });
        }

        // Delegate card action clicks — trash list
        const trashContainer = document.getElementById('trash-cvs-list');
        if (trashContainer) {
            trashContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                if (action === 'restore') {
                    CVManager.restore(id);
                    refreshList();
                    refreshTrashList();
                    showToast('CV restored!');
                } else if (action === 'permanent-delete') {
                    if (!confirm('Permanently delete this CV? This cannot be undone.')) return;
                    CVManager.permanentDelete(id);
                    refreshTrashList();
                    showToast('CV permanently deleted.');
                }
            });
        }
    }

    /** Download a saved CV as PDF without disrupting current working CV */
    async function downloadSavedCV(id) {
        const cv = CVManager.get(id);
        if (!cv) return;

        // Check download permission
        try {
            const user = await Auth.getUser();
            if (user) {
                const allowed = await Subscription.canDownload();
                if (!allowed) {
                    showPaywall();
                    return;
                }
            }
        } catch (e) { /* allow if auth unavailable */ }

        // Render the saved CV into the preview temporarily
        const previewEl = document.getElementById('cv-preview');
        const originalHTML = previewEl.innerHTML;
        const template = cv.template || 'classic';
        previewEl.innerHTML = CVRenderer.render(cv.data, template);

        // Generate PDF (await so html2pdf finishes before we restore)
        const name = (cv.data.step1 && cv.data.step1.fullName || 'cv').replace(/\s+/g, '-').toLowerCase();
        try {
            await PDFExport.downloadPDF(previewEl, `${name}-cv.pdf`);
        } catch (e) {
            console.warn('PDF download failed:', e);
        }

        // Restore the working CV preview
        previewEl.innerHTML = originalHTML;
        applyAccentColor(CVStorage.getAccentColor());

        // Record the download
        try { await Subscription.recordDownload(); } catch (e) { }
    }

    function renderCVList(cvs) {
        const listEl = document.getElementById('saved-cvs-list');
        const emptyEl = document.getElementById('mycvs-empty');
        if (!listEl) return;

        if (!cvs || cvs.length === 0) {
            listEl.innerHTML = '';
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        listEl.innerHTML = cvs.map(cv => {
            const created = _formatISODate(cv.createdAt);
            const modified = _formatISODate(cv.updatedAt);
            const tpl = esc(cv.template || 'classic');
            const name = esc(cv.name || 'Untitled CV');

            // Extract rich details from saved data
            const d = cv.data || {};
            const p = d.step1 || {};
            const email = esc(p.email || '');
            const phone = esc(p.phone || '');
            const skillsCount = Array.isArray(d.step4) ? d.step4.length : 0;
            const expCount = Array.isArray(d.step2) ? d.step2.length : 0;

            // Build detail chips
            let details = '';
            if (email) details += `<span class="cv-card-detail"><span class="cv-card-detail-icon">&#9993;</span> ${email}</span>`;
            if (phone) details += `<span class="cv-card-detail"><span class="cv-card-detail-icon">&#9742;</span> ${phone}</span>`;
            if (skillsCount > 0) details += `<span class="cv-card-detail">${skillsCount} skill${skillsCount !== 1 ? 's' : ''}</span>`;
            if (expCount > 0) details += `<span class="cv-card-detail">${expCount} experience${expCount !== 1 ? 's' : ''}</span>`;

            return `<div class="cv-card">
                <div class="cv-card-top">
                    <div class="cv-card-info">
                        <div class="cv-card-name">${name}</div>
                        <div class="cv-card-meta">${tpl} &middot; Created ${created} &middot; Modified ${modified}</div>
                    </div>
                </div>
                ${details ? `<div class="cv-card-details">${details}</div>` : ''}
                <div class="cv-card-actions">
                    <button data-action="load" data-id="${cv.id}" title="Load this CV">Load</button>
                    <button data-action="download" data-id="${cv.id}" class="btn-cv-download" title="Download PDF">Download</button>
                    <button data-action="rename" data-id="${cv.id}" title="Rename">Rename</button>
                    <button data-action="duplicate" data-id="${cv.id}" title="Duplicate">Copy</button>
                    <button data-action="delete" data-id="${cv.id}" class="btn-cv-delete" title="Delete">Del</button>
                </div>
            </div>`;
        }).join('');
    }

    function renderTrashList(cvs) {
        const listEl = document.getElementById('trash-cvs-list');
        const emptyEl = document.getElementById('mycvs-trash-empty');
        if (!listEl) return;

        if (!cvs || cvs.length === 0) {
            listEl.innerHTML = '';
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        listEl.innerHTML = cvs.map(cv => {
            const deleted = _formatISODate(cv.deletedAt);
            const name = esc(cv.name || 'Untitled CV');
            const tpl = esc(cv.template || 'classic');

            // Calculate days remaining
            const deletedDate = new Date(cv.deletedAt || Date.now());
            const expiresAt = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            const daysLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));

            return `<div class="cv-card cv-card-trashed">
                <div class="cv-card-top">
                    <div class="cv-card-info">
                        <div class="cv-card-name">${name}</div>
                        <div class="cv-card-meta">${tpl} &middot; Deleted ${deleted} &middot; ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</div>
                    </div>
                </div>
                <div class="cv-card-actions">
                    <button data-action="restore" data-id="${cv.id}" class="btn-cv-restore" title="Restore this CV">Restore</button>
                    <button data-action="permanent-delete" data-id="${cv.id}" class="btn-cv-delete" title="Delete forever">Delete Forever</button>
                </div>
            </div>`;
        }).join('');
    }

    function _formatISODate(isoStr) {
        if (!isoStr) return '—';
        try {
            const d = new Date(isoStr);
            const day = d.getDate();
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } catch (e) {
            return '—';
        }
    }

    // ============================
    // SERVICE WORKER
    // ============================
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => {
                console.log('SW registration failed:', err);
            });
        }
    }

})();
