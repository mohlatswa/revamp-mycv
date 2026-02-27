/**
 * Renders CV preview HTML from stored data.
 * 46 templates: 16 general + 30 profession-specific.
 */
const CVRenderer = (() => {

    const renderers = {
        // General (13)
        'classic': renderClassic,
        'modern': renderModern,
        'sa-formal': renderSAFormal,
        'executive': renderExecutive,
        'creative': renderCreative,
        'elegant': renderElegant,
        'compact': renderCompact,
        'timeline': renderTimeline,
        'minimalist': renderMinimalist,
        'ats': renderATS,
        'graduate': renderGraduate,
        'career-change': renderCareerChange,
        'executive-modern': renderExecutiveModern,
        // Profession-specific (23)
        'healthcare': renderHealthcare,
        'tech': renderTech,
        'teaching': renderTeaching,
        'engineering': renderEngineering,
        'finance': renderFinance,
        'legal': renderLegal,
        'hospitality': renderHospitality,
        'government': renderGovernment,
        'trades': renderTrades,
        'mining': renderMining,
        'agriculture': renderAgriculture,
        'retail': renderRetail,
        'creative-design': renderCreativeDesign,
        'socialwork': renderSocialWork,
        'security': renderSecurity,
        'logistics': renderLogistics,
        'academic': renderAcademic,
        'consulting': renderConsulting,
        'nonprofit': renderNonprofit,
        'marketing': renderMarketing,
        'data-science': renderDataScience,
        'aviation': renderAviation,
        'media': renderMedia,
        // NEW templates (37-46)
        'professional': renderProfessional,
        'infographic': renderInfographic,
        'simple': renderSimple,
        'banking': renderBanking,
        'medical-doctor': renderMedicalDoctor,
        'hr': renderHR,
        'project-manager': renderProjectManager,
        'pharmacy': renderPharmacy,
        'real-estate': renderRealEstate,
        'tourism': renderTourism
    };

    function render(cvData, template) {
        const fn = renderers[template] || renderClassic;
        return fn(cvData);
    }

    // ── HELPERS ──────────────────────────────
    function esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + '-01');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getFullYear();
    }

    function formatDateFull(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' });
    }

    function getObjective(d) {
        if (d.step1.objective && d.step1.objective.trim()) return d.step1.objective;
        return SummaryGenerator.generate(d);
    }

    function duties(str) {
        if (!str) return '';
        const lines = str.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) return '';
        return '<ul class="cv-duties">' + lines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>';
    }

    function langs(p) {
        if (!p.languages) return [];
        return p.languages.split(',').map(l => l.trim()).filter(Boolean);
    }

    function contact(p) {
        const r = [];
        if (p.phone) r.push(esc(p.phone));
        if (p.email) r.push(esc(p.email));
        const loc = fullAddress(p);
        if (loc) r.push(loc);
        return r;
    }

    function fullAddress(p) {
        const parts = [];
        if (p.address) parts.push(esc(p.address));
        if (p.location) parts.push(esc(p.location));
        if (p.province) parts.push(esc(p.province));
        return parts.join(', ');
    }

    function dr(job) {
        return formatDate(job.startDate) + ' \u2013 ' + (job.currentJob ? 'Present' : formatDate(job.endDate));
    }

    // Photo helper — returns img tag or empty string (validates data URL to prevent XSS)
    function photoImg(p, cls) {
        if (!p.photo) return '';
        // Only allow data:image/* URLs to prevent injection
        if (!/^data:image\/[a-zA-Z+]+;base64,/.test(p.photo)) return '';
        return '<img src="' + p.photo + '" alt="Photo" class="' + (cls || 'cv-photo') + '">';
    }

    // Shorthand data extractor
    function D(data) {
        return {
            p: data.step1 || {},
            exp: data.step2 || [],
            edu: data.step3 || [],
            sk: data.step4 || [],
            ref: data.step5 || [],
            obj: getObjective(data),
            ln: langs(data.step1 || {})
        };
    }

    // ── Common section builders (semantic HTML for ATS) ──
    function secTitle(t) { return '<h3 class="cv-section-title">' + t + '</h3>'; }
    function secOpen() { return '<section class="cv-section">'; }
    function secClose() { return '</section>'; }

    function buildExperience(exp, withRow) {
        let h = '';
        exp.forEach(j => {
            if (withRow) {
                h += '<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">' + esc(j.jobTitle) + '</span><span class="cv-entry-date">' + dr(j) + '</span></div><div class="cv-entry-subtitle">' + esc(j.company) + '</div>' + duties(j.duties) + '</div>';
            } else {
                h += '<div class="cv-entry"><div class="cv-entry-title">' + esc(j.jobTitle) + '</div><div class="cv-entry-subtitle">' + esc(j.company) + '</div><div class="cv-entry-date">' + dr(j) + '</div>' + duties(j.duties) + '</div>';
            }
        });
        return h;
    }

    function buildEducation(edu, withRow) {
        let h = '';
        edu.forEach(e => {
            if (withRow) {
                h += '<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">' + esc(e.qualification) + '</span>' + (e.year ? '<span class="cv-entry-date">' + esc(e.year) + '</span>' : '') + '</div><div class="cv-entry-subtitle">' + esc(e.institution) + '</div></div>';
            } else {
                h += '<div class="cv-entry"><div class="cv-entry-title">' + esc(e.qualification) + '</div><div class="cv-entry-subtitle">' + esc(e.institution) + '</div>' + (e.year ? '<div class="cv-entry-date">' + esc(e.year) + '</div>' : '') + '</div>';
            }
        });
        return h;
    }

    function buildSkillTags(sk, cls) {
        return '<div class="cv-skills-wrap">' + sk.map(s => '<span class="' + (cls||'cv-skill-tag') + '">' + esc(s) + '</span>').join('') + '</div>' +
            '<p class="cv-ats-skills-text">' + sk.map(s => esc(s)).join(', ') + '</p>';
    }

    function buildSkillList(sk) {
        return '<ul class="cv-skills-list">' + sk.map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>';
    }

    function buildRefs(ref) {
        let h = '';
        ref.forEach(r => { h += '<div class="cv-ref-entry"><strong>' + esc(r.name) + '</strong><span>' + esc(r.relationship) + ' | ' + esc(r.phone) + '</span></div>'; });
        return h;
    }

    function buildRefsTable(ref) {
        let h = '<table class="cv-table"><thead><tr><th>Name</th><th>Relationship</th><th>Phone</th></tr></thead><tbody>';
        ref.forEach(r => { h += '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.relationship) + '</td><td>' + esc(r.phone) + '</td></tr>'; });
        return h + '</tbody></table>';
    }

    // ════════════════════════════════════════════
    // GENERAL TEMPLATES (1-8)
    // ════════════════════════════════════════════

    // 1. CLASSIC
    function renderClassic(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-classic"><div class="cv-header">' + photoImg(p) + '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('') + '</div></div>';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Work Experience') + buildExperience(exp, false) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, false) + secClose();
        if (sk.length) h += secOpen() + secTitle('Skills') + buildSkillList(sk) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillList(ln) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div>';
    }

    // 2. MODERN
    function renderModern(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-modern"><div class="cv-sidebar">' + photoImg(p, 'cv-photo-round') + '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">';
        if (p.phone) h += '<p>' + esc(p.phone) + '</p>';
        if (p.email) h += '<p>' + esc(p.email) + '</p>';
        const modAddr = fullAddress(p);
        if (modAddr) h += '<p>' + modAddr + '</p>';
        h += '</div>';
        if (sk.length) h += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Skills</div>' + buildSkillList(sk) + '</div>';
        if (ln.length) h += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Languages</div>' + buildSkillList(ln) + '</div>';
        if (p.driversLicence) h += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Licence</div><p>' + esc(p.driversLicence) + '</p></div>';
        if (ref.length) { h += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">References</div>'; ref.forEach(r => { h += '<div class="cv-ref-entry"><strong>' + esc(r.name) + '</strong><span>' + esc(r.relationship) + '<br>' + esc(r.phone) + '</span></div>'; }); h += '</div>'; }
        h += '</div><div class="cv-main">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Work Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        return h + '</div></div>';
    }

    // 3. SA FORMAL
    function renderSAFormal(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-sa-formal"><div class="cv-header"><div class="cv-name">CURRICULUM VITAE</div><div class="cv-subname">' + esc(p.fullName) + '</div></div>';
        h += secOpen() + secTitle('PERSONAL DETAILS') + '<table class="cv-table"><tbody>';
        h += '<tr><td class="cv-label">Full Name</td><td>' + esc(p.fullName) + '</td></tr>';
        if (p.dateOfBirth) h += '<tr><td class="cv-label">Date of Birth</td><td>' + formatDateFull(p.dateOfBirth) + '</td></tr>';
        if (p.gender) h += '<tr><td class="cv-label">Gender</td><td>' + esc(p.gender) + '</td></tr>';
        if (p.nationality) h += '<tr><td class="cv-label">Nationality</td><td>' + esc(p.nationality) + '</td></tr>';
        if (p.maritalStatus && p.maritalStatus !== 'Prefer not to say') h += '<tr><td class="cv-label">Marital Status</td><td>' + esc(p.maritalStatus) + '</td></tr>';
        if (ln.length) h += '<tr><td class="cv-label">Languages</td><td>' + ln.map(l => esc(l)).join(', ') + '</td></tr>';
        if (p.driversLicence) h += '<tr><td class="cv-label">Driver\'s Licence</td><td>' + esc(p.driversLicence) + '</td></tr>';
        h += '<tr><td class="cv-label">Phone</td><td>' + esc(p.phone) + '</td></tr>';
        if (p.email) h += '<tr><td class="cv-label">Email</td><td>' + esc(p.email) + '</td></tr>';
        h += '<tr><td class="cv-label">Address</td><td>' + fullAddress(p) + '</td></tr>';
        h += '</tbody></table>' + secClose();
        if (obj) h += secOpen() + secTitle('PROFESSIONAL SUMMARY') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('WORK EXPERIENCE') + buildExperience(exp, true) + secClose();
        if (edu.length) { h += secOpen() + secTitle('EDUCATION &amp; QUALIFICATIONS') + '<table class="cv-table"><thead><tr><th>Institution</th><th>Qualification</th><th>Year</th></tr></thead><tbody>'; edu.forEach(e => { h += '<tr><td>' + esc(e.institution) + '</td><td>' + esc(e.qualification) + '</td><td>' + esc(e.year) + '</td></tr>'; }); h += '</tbody></table>' + secClose(); }
        if (sk.length) h += secOpen() + secTitle('SKILLS') + buildSkillList(sk) + secClose();
        if (ref.length) h += secOpen() + secTitle('REFERENCES') + buildRefsTable(ref) + secClose();
        return h + '</div>';
    }

    // 4. EXECUTIVE
    function renderExecutive(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-executive"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Professional Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (sk.length) h += secOpen() + secTitle('Core Competencies') + buildSkillTags(sk) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + '<div class="cv-ref-grid">' + buildRefs(ref) + '</div>' + secClose();
        return h + '</div></div>';
    }

    // 5. CREATIVE
    function renderCreative(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-creative"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">';
        contact(p).forEach(c => { h += '<span>' + c + '</span>'; });
        h += '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + '<h3 class="cv-section-title"><span class="accent-bar"></span>Professional Summary</h3><p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + '<h3 class="cv-section-title"><span class="accent-bar"></span>Experience</h3>' + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + '<h3 class="cv-section-title"><span class="accent-bar"></span>Education</h3>' + buildEducation(edu, true) + secClose();
        if (sk.length) h += secOpen() + '<h3 class="cv-section-title"><span class="accent-bar"></span>Skills</h3>' + buildSkillTags(sk, 'cv-skill-pill') + secClose();
        if (ln.length) h += secOpen() + '<h3 class="cv-section-title"><span class="accent-bar"></span>Languages</h3>' + buildSkillTags(ln, 'cv-skill-pill') + secClose();
        if (ref.length) { h += secOpen() + '<h3 class="cv-section-title"><span class="accent-bar"></span>References</h3>'; ref.forEach(r => { h += '<div class="cv-ref-entry"><strong>' + esc(r.name) + '</strong> &mdash; ' + esc(r.relationship) + ' &middot; ' + esc(r.phone) + '</div>'; }); h += secClose(); }
        return h + '</div></div>';
    }

    // 6. ELEGANT
    function renderElegant(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-elegant"><div class="cv-sidebar"><div class="cv-name">' + esc(p.fullName) + '</div>';
        h += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Contact</div>';
        if (p.phone) h += '<p>' + esc(p.phone) + '</p>';
        if (p.email) h += '<p>' + esc(p.email) + '</p>';
        const elAddr = fullAddress(p);
        if (elAddr) h += '<p>' + elAddr + '</p>';
        h += '</div>';
        if (sk.length) h += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Skills</div>' + buildSkillList(sk) + '</div>';
        if (ln.length) h += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Languages</div>' + buildSkillList(ln) + '</div>';
        if (p.driversLicence) h += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Licence</div><p>' + esc(p.driversLicence) + '</p></div>';
        if (ref.length) { h += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">References</div>'; ref.forEach(r => { h += '<div class="cv-ref-entry"><strong>' + esc(r.name) + '</strong><span>' + esc(r.relationship) + '<br>' + esc(r.phone) + '</span></div>'; }); h += '</div>'; }
        h += '</div><div class="cv-main">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Work Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        return h + '</div></div>';
    }

    // 7. COMPACT
    function renderCompact(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-compact"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">&middot;</span>') + '</div></div><div class="cv-columns"><div class="cv-col cv-col-left">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (sk.length) h += secOpen() + secTitle('Skills') + buildSkillList(sk) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillList(ln) + secClose();
        if (ref.length) { h += secOpen() + secTitle('References'); ref.forEach(r => { h += '<div class="cv-ref-entry"><strong>' + esc(r.name) + '</strong><span>' + esc(r.relationship) + '<br>' + esc(r.phone) + '</span></div>'; }); h += secClose(); }
        h += '</div><div class="cv-col cv-col-right">';
        if (exp.length) { h += secOpen() + secTitle('Experience'); exp.forEach(j => { h += '<div class="cv-entry"><div class="cv-entry-title">' + esc(j.jobTitle) + '</div><div class="cv-entry-meta">' + esc(j.company) + ' &middot; ' + dr(j) + '</div>' + duties(j.duties) + '</div>'; }); h += secClose(); }
        if (edu.length) { h += secOpen() + secTitle('Education'); edu.forEach(e => { h += '<div class="cv-entry"><div class="cv-entry-title">' + esc(e.qualification) + '</div><div class="cv-entry-meta">' + esc(e.institution) + (e.year?' &middot; '+esc(e.year):'') + '</div></div>'; }); h += secClose(); }
        return h + '</div></div></div>';
    }

    // 8. TIMELINE
    function renderTimeline(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-timeline"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        function tlList(items, isFn) { let o = '<div class="cv-tl-list">'; items.forEach(i => { o += '<div class="cv-tl-item"><div class="cv-tl-marker"><div class="cv-tl-dot"></div></div><div class="cv-tl-content">' + isFn(i) + '</div></div>'; }); return o + '</div>'; }
        if (exp.length) h += secOpen() + secTitle('Work Experience') + tlList(exp, j => '<div class="cv-entry-title">' + esc(j.jobTitle) + '</div><div class="cv-entry-subtitle">' + esc(j.company) + '</div><div class="cv-entry-date">' + dr(j) + '</div>' + duties(j.duties)) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + tlList(edu, e => '<div class="cv-entry-title">' + esc(e.qualification) + '</div><div class="cv-entry-subtitle">' + esc(e.institution) + '</div>' + (e.year?'<div class="cv-entry-date">'+esc(e.year)+'</div>':'')) + secClose();
        if (sk.length) h += secOpen() + secTitle('Skills') + buildSkillTags(sk) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // ════════════════════════════════════════════
    // PROFESSION-SPECIFIC TEMPLATES (9-24)
    // ════════════════════════════════════════════

    // Helper: two-col sidebar (left) + main (right)
    function twoColSidebar(cls, sidebarHtml, mainHtml) {
        return '<div class="' + cls + '"><div class="cv-sidebar">' + sidebarHtml + '</div><div class="cv-main">' + mainHtml + '</div></div>';
    }

    // Helper: header + body
    function headerBody(cls, headerHtml, bodyHtml) {
        return '<div class="' + cls + '"><div class="cv-header">' + headerHtml + '</div><div class="cv-body">' + bodyHtml + '</div></div>';
    }

    // Helper: two-col main (left) + panel (right)
    function twoPanelRight(cls, headerHtml, leftHtml, rightHtml) {
        return '<div class="' + cls + '"><div class="cv-header">' + headerHtml + '</div><div class="cv-columns"><div class="cv-col-main">' + leftHtml + '</div><div class="cv-col-panel">' + rightHtml + '</div></div></div>';
    }

    // 9. HEALTHCARE
    function renderHealthcare(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let side = '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-sidebar-section"><div class="cv-sidebar-title">Contact</div>';
        if (p.phone) side += '<p>' + esc(p.phone) + '</p>';
        if (p.email) side += '<p>' + esc(p.email) + '</p>';
        { const a = fullAddress(p); if (a) side += '<p>' + a + '</p>'; }
        side += '</div>';
        if (sk.length) side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Clinical Skills</div>' + buildSkillList(sk) + '</div>';
        if (ln.length) side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Languages</div>' + buildSkillList(ln) + '</div>';
        if (p.driversLicence) side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Licence</div><p>' + esc(p.driversLicence) + '</p></div>';
        if (ref.length) { side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">References</div>'; ref.forEach(r => { side += '<div class="cv-ref-entry"><strong>' + esc(r.name) + '</strong><span>' + esc(r.relationship) + '<br>' + esc(r.phone) + '</span></div>'; }); side += '</div>'; }

        let main = '';
        if (obj) main += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) main += secOpen() + secTitle('Clinical Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) main += secOpen() + secTitle('Education & Training') + buildEducation(edu, true) + secClose();
        return twoColSidebar('cv-healthcare', side, main);
    }

    // 10. TECH
    function renderTech(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let header = '<div class="cv-name"><span class="prompt">&gt;_</span> ' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div>';
        let body = '';
        if (obj) body += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (sk.length) body += secOpen() + secTitle('Technical Skills') + buildSkillTags(sk, 'cv-code-tag') + secClose();
        if (exp.length) body += secOpen() + secTitle('Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) body += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (ln.length) body += secOpen() + secTitle('Languages') + buildSkillTags(ln, 'cv-code-tag') + secClose();
        if (ref.length) body += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return headerBody('cv-tech', header, body);
    }

    // 11. TEACHING
    function renderTeaching(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let header = '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">&middot;</span>') + '</div>';
        let body = '';
        if (obj) body += '<div class="cv-philosophy-box"><p>' + esc(obj) + '</p></div>';
        if (exp.length) body += secOpen() + secTitle('Teaching Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) body += secOpen() + secTitle('Education & Qualifications') + buildEducation(edu, true) + secClose();
        if (sk.length) body += secOpen() + secTitle('Teaching Skills') + buildSkillTags(sk, 'cv-teach-tag') + secClose();
        if (ln.length) body += secOpen() + secTitle('Languages') + buildSkillTags(ln, 'cv-teach-tag') + secClose();
        if (ref.length) body += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return headerBody('cv-teaching', header, body);
    }

    // 12. ENGINEERING
    function renderEngineering(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let header = '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div>';
        let left = '';
        if (obj) left += secOpen() + secTitle('Professional Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) left += secOpen() + secTitle('Engineering Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) left += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (ref.length) left += secOpen() + secTitle('References') + buildRefs(ref) + secClose();

        let right = '';
        if (sk.length) right += secOpen() + secTitle('Technical Skills') + buildSkillList(sk) + secClose();
        if (ln.length) right += secOpen() + secTitle('Languages') + buildSkillList(ln) + secClose();
        if (p.driversLicence) right += secOpen() + secTitle('Licence') + '<p class="cv-entry-subtitle">' + esc(p.driversLicence) + '</p>' + secClose();
        return twoPanelRight('cv-engineering', header, left, right);
    }

    // 13. FINANCE
    function renderFinance(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-finance"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Professional Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) { h += secOpen() + secTitle('Education & Qualifications') + '<table class="cv-table"><thead><tr><th>Institution</th><th>Qualification</th><th>Year</th></tr></thead><tbody>'; edu.forEach(e => { h += '<tr><td>' + esc(e.institution) + '</td><td>' + esc(e.qualification) + '</td><td>' + esc(e.year) + '</td></tr>'; }); h += '</tbody></table>' + secClose(); }
        if (sk.length) h += secOpen() + secTitle('Financial Skills') + buildSkillTags(sk, 'cv-fin-tag') + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln, 'cv-fin-tag') + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 14. LEGAL
    function renderLegal(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-legal"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">&mdash;</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Legal Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (sk.length) h += secOpen() + secTitle('Legal Skills') + '<p class="cv-areas">' + sk.map(s => esc(s)).join(', ') + '</p>' + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + '<p class="cv-areas">' + ln.map(l => esc(l)).join(', ') + '</p>' + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 15. HOSPITALITY
    function renderHospitality(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-hospitality"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">&middot;</span>') + '</div></div>';
        if (sk.length) h += '<div class="cv-strengths-bar">' + sk.slice(0, 6).map(s => '<span class="cv-strength-pill">' + esc(s) + '</span>').join('') + '</div>';
        h += '<div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Hospitality Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education & Training') + buildEducation(edu, true) + secClose();
        if (sk.length > 6) h += secOpen() + secTitle('Additional Skills') + buildSkillTags(sk.slice(6), 'cv-hosp-tag') + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln, 'cv-hosp-tag') + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 16. GOVERNMENT
    function renderGovernment(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-government"><div class="cv-header"><div class="cv-name">CURRICULUM VITAE</div></div>';
        h += secOpen() + secTitle('PERSONAL DETAILS') + '<table class="cv-table"><tbody>';
        h += '<tr><td class="cv-label">Full Name</td><td>' + esc(p.fullName) + '</td></tr>';
        if (p.dateOfBirth) h += '<tr><td class="cv-label">Date of Birth</td><td>' + formatDateFull(p.dateOfBirth) + '</td></tr>';
        if (p.gender) h += '<tr><td class="cv-label">Gender</td><td>' + esc(p.gender) + '</td></tr>';
        if (p.nationality) h += '<tr><td class="cv-label">Nationality</td><td>' + esc(p.nationality) + '</td></tr>';
        if (p.maritalStatus && p.maritalStatus !== 'Prefer not to say') h += '<tr><td class="cv-label">Marital Status</td><td>' + esc(p.maritalStatus) + '</td></tr>';
        if (ln.length) h += '<tr><td class="cv-label">Languages</td><td>' + ln.map(l => esc(l)).join(', ') + '</td></tr>';
        if (p.driversLicence) h += '<tr><td class="cv-label">Driver\'s Licence</td><td>' + esc(p.driversLicence) + '</td></tr>';
        if (p.disability && p.disability !== 'Prefer not to say' && p.disability !== 'None') {
            var disabilityText = (p.disability === 'Other' && p.disabilityOther) ? p.disabilityOther : p.disability;
            h += '<tr><td class="cv-label">Disability</td><td>' + esc(disabilityText) + '</td></tr>';
        }
        h += '<tr><td class="cv-label">Phone</td><td>' + esc(p.phone) + '</td></tr>';
        if (p.email) h += '<tr><td class="cv-label">Email</td><td>' + esc(p.email) + '</td></tr>';
        h += '<tr><td class="cv-label">Address</td><td>' + fullAddress(p) + '</td></tr>';
        h += '</tbody></table>' + secClose();
        if (obj) h += secOpen() + secTitle('PROFESSIONAL SUMMARY') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('WORK EXPERIENCE') + buildExperience(exp, true) + secClose();
        if (edu.length) { h += secOpen() + secTitle('EDUCATION &amp; QUALIFICATIONS') + '<table class="cv-table"><thead><tr><th>Institution</th><th>Qualification</th><th>Year</th></tr></thead><tbody>'; edu.forEach(e => { h += '<tr><td>' + esc(e.institution) + '</td><td>' + esc(e.qualification) + '</td><td>' + esc(e.year) + '</td></tr>'; }); h += '</tbody></table>' + secClose(); }
        if (sk.length) h += secOpen() + secTitle('SKILLS') + buildSkillList(sk) + secClose();
        if (ref.length) h += secOpen() + secTitle('REFERENCES') + buildRefsTable(ref) + secClose();
        h += '<div class="cv-declaration"><p><em>I hereby declare that the information provided above is true and correct.</em></p><div class="cv-sig-line"><span>Signature</span><span>Date</span></div></div>';
        return h + '</div>';
    }

    // 17. TRADES
    function renderTrades(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let header = '<div class="cv-name">' + esc(p.fullName) + '</div>' + (p.driversLicence ? '<div class="cv-trade-title">' + esc(p.driversLicence) + '</div>' : '');
        let left = '';
        if (obj) left += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) left += secOpen() + secTitle('Trade Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) left += secOpen() + secTitle('Qualifications') + buildEducation(edu, true) + secClose();
        if (ref.length) left += secOpen() + secTitle('References') + buildRefs(ref) + secClose();

        let right = '';
        if (sk.length) right += '<div class="cv-safety-section">' + secTitle('Trade Skills') + buildSkillList(sk) + '</div>';
        if (ln.length) right += secOpen() + secTitle('Languages') + buildSkillList(ln) + secClose();
        return twoPanelRight('cv-trades', header, left, right);
    }

    // 18. MINING
    function renderMining(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let header = '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div>';
        let body = '';
        if (sk.length) body += '<div class="cv-cert-banner">' + sk.map(s => '<span class="cv-cert-badge">' + esc(s) + '</span>').join('') + '</div>';
        if (obj) body += secOpen() + secTitle('Professional Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) body += secOpen() + secTitle('Mining Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) body += secOpen() + secTitle('Education & Training') + buildEducation(edu, true) + secClose();
        if (ln.length) body += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (ref.length) body += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return headerBody('cv-mining', header, body);
    }

    // 19. AGRICULTURE
    function renderAgriculture(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-agriculture"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">&middot;</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Agricultural Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education & Training') + buildEducation(edu, true) + secClose();
        if (sk.length) h += secOpen() + secTitle('Agricultural Skills') + buildSkillTags(sk, 'cv-agri-tag') + secClose();
        if (p.driversLicence) h += secOpen() + secTitle('Driver\'s Licence') + '<p class="cv-entry-subtitle">' + esc(p.driversLicence) + '</p>' + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln, 'cv-agri-tag') + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 20. RETAIL
    function renderRetail(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-retail"><div class="cv-header">' + '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div>';
        h += '<div class="cv-columns"><div class="cv-col-main">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Retail Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        h += '</div><div class="cv-col-panel">';
        if (sk.length) h += secOpen() + secTitle('Skills') + buildSkillList(sk) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillList(ln) + secClose();
        h += '</div></div></div>';
        return h;
    }

    // 21. CREATIVE DESIGN
    function renderCreativeDesign(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let side = '<div class="cv-name">' + esc(p.fullName) + '</div>';
        side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Contact</div>';
        if (p.phone) side += '<p>' + esc(p.phone) + '</p>';
        if (p.email) side += '<p>' + esc(p.email) + '</p>';
        { const a = fullAddress(p); if (a) side += '<p>' + a + '</p>'; }
        side += '</div>';
        if (sk.length) side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Design Skills</div>' + buildSkillList(sk) + '</div>';
        if (ln.length) side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Languages</div>' + buildSkillList(ln) + '</div>';
        if (ref.length) { side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">References</div>'; ref.forEach(r => { side += '<div class="cv-ref-entry"><strong>' + esc(r.name) + '</strong><span>' + esc(r.relationship) + '<br>' + esc(r.phone) + '</span></div>'; }); side += '</div>'; }

        let main = '';
        if (obj) main += secOpen() + secTitle('Creative Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) main += secOpen() + secTitle('Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) main += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        return twoColSidebar('cv-creative-design', side, main);
    }

    // 22. SOCIAL WORK
    function renderSocialWork(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let header = '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">&middot;</span>') + '</div>';
        let body = '';
        if (obj) body += '<div class="cv-mission-box"><p>' + esc(obj) + '</p></div>';
        if (exp.length) body += secOpen() + secTitle('Community & Social Work Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) body += secOpen() + secTitle('Education & Qualifications') + buildEducation(edu, true) + secClose();
        if (sk.length) body += secOpen() + secTitle('Skills') + buildSkillTags(sk, 'cv-sw-tag') + secClose();
        if (ln.length) body += secOpen() + secTitle('Languages & Cultural Competency') + buildSkillTags(ln, 'cv-sw-tag') + secClose();
        if (ref.length) body += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return headerBody('cv-socialwork', header, body);
    }

    // 23. SECURITY
    function renderSecurity(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-security"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (sk.length) h += '<div class="cv-clearance-bar">' + sk.slice(0, 5).map(s => '<span class="cv-clearance-badge">' + esc(s) + '</span>').join('') + '</div>';
        if (obj) h += secOpen() + secTitle('Professional Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Security Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Training & Education') + buildEducation(edu, true) + secClose();
        if (sk.length > 5) h += secOpen() + secTitle('Additional Skills') + buildSkillTags(sk.slice(5)) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 24. LOGISTICS
    function renderLogistics(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let header = '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div>';

        let left = '';
        if (obj) left += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) left += secOpen() + secTitle('Logistics Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) left += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (ref.length) left += secOpen() + secTitle('References') + buildRefs(ref) + secClose();

        let right = '';
        if (p.driversLicence) right += '<div class="cv-licence-badge">' + esc(p.driversLicence) + '</div>';
        if (sk.length) right += secOpen() + secTitle('Skills') + buildSkillList(sk) + secClose();
        if (ln.length) right += secOpen() + secTitle('Languages') + buildSkillList(ln) + secClose();
        return '<div class="cv-logistics"><div class="cv-header">' + header + '</div><div class="cv-route-bar"></div><div class="cv-columns"><div class="cv-col-main">' + left + '</div><div class="cv-col-panel">' + right + '</div></div></div>';
    }

    // ════════════════════════════════════════════
    // NEW GENERAL TEMPLATES (25-29)
    // ════════════════════════════════════════════

    // 25. MINIMALIST
    function renderMinimalist(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-minimalist"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('') + '</div></div>';
        if (obj) h += '<div class="cv-section"><p class="cv-objective">' + esc(obj) + '</p></div>';
        if (exp.length) { h += '<div class="cv-section"><div class="cv-section-title">Experience</div>'; exp.forEach(j => { h += '<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">' + esc(j.jobTitle) + ', ' + esc(j.company) + '</span><span class="cv-entry-date">' + dr(j) + '</span></div>' + duties(j.duties) + '</div>'; }); h += '</div>'; }
        if (edu.length) { h += '<div class="cv-section"><div class="cv-section-title">Education</div>'; edu.forEach(e => { h += '<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">' + esc(e.qualification) + ', ' + esc(e.institution) + '</span>' + (e.year ? '<span class="cv-entry-date">' + esc(e.year) + '</span>' : '') + '</div></div>'; }); h += '</div>'; }
        if (sk.length) h += '<div class="cv-section"><div class="cv-section-title">Skills</div><p class="cv-skills-inline">' + sk.map(s => esc(s)).join(' &middot; ') + '</p></div>';
        if (ln.length) h += '<div class="cv-section"><div class="cv-section-title">Languages</div><p class="cv-skills-inline">' + ln.map(l => esc(l)).join(' &middot; ') + '</p></div>';
        if (ref.length) h += '<div class="cv-section"><div class="cv-section-title">References</div>' + buildRefs(ref) + '</div>';
        return h + '</div>';
    }

    // 26. ATS-FRIENDLY
    function renderATS(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-ats"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">';
        if (p.phone) h += esc(p.phone);
        if (p.email) h += ' | ' + esc(p.email);
        { const a = fullAddress(p); if (a) h += ' | ' + a; }
        h += '</div></div>';
        if (obj) h += '<div class="cv-section"><div class="cv-section-title">PROFESSIONAL SUMMARY</div><p>' + esc(obj) + '</p></div>';
        if (exp.length) { h += '<div class="cv-section"><div class="cv-section-title">WORK EXPERIENCE</div>'; exp.forEach(j => { h += '<div class="cv-entry"><div class="cv-entry-title">' + esc(j.jobTitle) + '</div><div class="cv-entry-subtitle">' + esc(j.company) + ' | ' + dr(j) + '</div>' + duties(j.duties) + '</div>'; }); h += '</div>'; }
        if (edu.length) { h += '<div class="cv-section"><div class="cv-section-title">EDUCATION</div>'; edu.forEach(e => { h += '<div class="cv-entry"><div class="cv-entry-title">' + esc(e.qualification) + '</div><div class="cv-entry-subtitle">' + esc(e.institution) + (e.year ? ' | ' + esc(e.year) : '') + '</div></div>'; }); h += '</div>'; }
        if (sk.length) h += '<div class="cv-section"><div class="cv-section-title">SKILLS</div><p>' + sk.map(s => esc(s)).join(', ') + '</p></div>';
        if (ln.length) h += '<div class="cv-section"><div class="cv-section-title">LANGUAGES</div><p>' + ln.map(l => esc(l)).join(', ') + '</p></div>';
        if (p.driversLicence) h += '<div class="cv-section"><div class="cv-section-title">ADDITIONAL INFORMATION</div><p>Driver\'s Licence: ' + esc(p.driversLicence) + '</p></div>';
        if (ref.length) { h += '<div class="cv-section"><div class="cv-section-title">REFERENCES</div>'; ref.forEach(r => { h += '<p><strong>' + esc(r.name) + '</strong> - ' + esc(r.relationship) + ' - ' + esc(r.phone) + '</p>'; }); h += '</div>'; }
        return h + '</div>';
    }

    // 27. GRADUATE
    function renderGraduate(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-graduate"><div class="cv-header"><div class="cv-accent-bar"></div><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (sk.length) h += secOpen() + secTitle('Skills') + buildSkillTags(sk, 'cv-grad-tag') + secClose();
        if (exp.length) h += secOpen() + secTitle('Experience & Internships') + buildExperience(exp, true) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln, 'cv-grad-tag') + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 28. CAREER CHANGE
    function renderCareerChange(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-career-change"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">&middot;</span>') + '</div></div><div class="cv-body">';
        if (obj) h += '<div class="cv-profile-box"><div class="cv-section-title">Professional Profile</div><p class="cv-objective">' + esc(obj) + '</p></div>';
        if (sk.length) { h += secOpen() + secTitle('Skills'); const half = Math.ceil(sk.length / 2); h += '<div class="cv-skill-cols"><ul class="cv-skills-list">' + sk.slice(0, half).map(s => '<li>' + esc(s) + '</li>').join('') + '</ul><ul class="cv-skills-list">' + sk.slice(half).map(s => '<li>' + esc(s) + '</li>').join('') + '</ul></div>' + secClose(); }
        if (edu.length) h += secOpen() + secTitle('Education & Qualifications') + buildEducation(edu, true) + secClose();
        if (exp.length) h += secOpen() + secTitle('Career History') + buildExperience(exp, true) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 29. EXECUTIVE MODERN
    function renderExecutiveModern(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-exec-modern"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div>';
        if (obj) h += '<div class="cv-tagline">' + esc(obj).substring(0, 120) + '</div>';
        h += '<div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('') + '</div></div>';
        h += '<div class="cv-columns"><div class="cv-col-main">';
        if (exp.length) h += secOpen() + secTitle('Leadership Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        h += '</div><div class="cv-col-panel">';
        if (sk.length) h += secOpen() + secTitle('Core Competencies') + buildSkillList(sk) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillList(ln) + secClose();
        if (p.driversLicence) h += secOpen() + secTitle('Licence') + '<p>' + esc(p.driversLicence) + '</p>' + secClose();
        return h + '</div></div></div>';
    }

    // ════════════════════════════════════════════
    // NEW PROFESSION TEMPLATES (30-36)
    // ════════════════════════════════════════════

    // 30. ACADEMIC
    function renderAcademic(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-academic"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Research Interests') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (exp.length) h += secOpen() + secTitle('Academic & Research Experience') + buildExperience(exp, true) + secClose();
        if (sk.length) h += secOpen() + secTitle('Research Skills') + '<p class="cv-academic-skills">' + sk.map(s => esc(s)).join(', ') + '</p>' + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + '<p class="cv-academic-skills">' + ln.map(l => esc(l)).join(', ') + '</p>' + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 31. CONSULTING
    function renderConsulting(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-consulting"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (obj) h += '<div class="cv-value-prop"><p>' + esc(obj) + '</p></div>';
        if (sk.length) h += secOpen() + secTitle('Core Competencies') + '<div class="cv-comp-grid">' + sk.map(s => '<span class="cv-comp-item">' + esc(s) + '</span>').join('') + '</div>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Professional Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + '<p>' + ln.map(l => esc(l)).join(' | ') + '</p>' + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 32. NONPROFIT
    function renderNonprofit(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let side = '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-sidebar-section"><div class="cv-sidebar-title">Contact</div>';
        if (p.phone) side += '<p>' + esc(p.phone) + '</p>';
        if (p.email) side += '<p>' + esc(p.email) + '</p>';
        { const a = fullAddress(p); if (a) side += '<p>' + a + '</p>'; }
        side += '</div>';
        if (sk.length) side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Skills</div>' + buildSkillList(sk) + '</div>';
        if (ln.length) side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Languages</div>' + buildSkillList(ln) + '</div>';
        if (ref.length) { side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">References</div>'; ref.forEach(r => { side += '<div class="cv-ref-entry"><strong>' + esc(r.name) + '</strong><span>' + esc(r.relationship) + '<br>' + esc(r.phone) + '</span></div>'; }); side += '</div>'; }

        let main = '';
        if (obj) main += '<div class="cv-mission-stmt"><p>' + esc(obj) + '</p></div>';
        if (exp.length) main += secOpen() + secTitle('Community & Programme Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) main += secOpen() + secTitle('Education & Training') + buildEducation(edu, true) + secClose();
        return twoColSidebar('cv-nonprofit', side, main);
    }

    // 33. MARKETING
    function renderMarketing(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-marketing"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div>';
        h += '<div class="cv-columns"><div class="cv-col-main">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Marketing Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        h += '</div><div class="cv-col-panel">';
        if (sk.length) h += secOpen() + secTitle('Marketing Skills') + buildSkillList(sk) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillList(ln) + secClose();
        return h + '</div></div></div>';
    }

    // 34. DATA SCIENCE
    function renderDataScience(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let side = '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-sidebar-section"><div class="cv-sidebar-title">Contact</div>';
        if (p.phone) side += '<p>' + esc(p.phone) + '</p>';
        if (p.email) side += '<p>' + esc(p.email) + '</p>';
        { const a = fullAddress(p); if (a) side += '<p>' + a + '</p>'; }
        side += '</div>';
        if (sk.length) side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Technical Skills</div>' + buildSkillList(sk) + '</div>';
        if (ln.length) side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Languages</div>' + buildSkillList(ln) + '</div>';
        if (ref.length) { side += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">References</div>'; ref.forEach(r => { side += '<div class="cv-ref-entry"><strong>' + esc(r.name) + '</strong><span>' + esc(r.relationship) + '<br>' + esc(r.phone) + '</span></div>'; }); side += '</div>'; }

        let main = '';
        if (obj) main += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) main += secOpen() + secTitle('Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) main += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        return twoColSidebar('cv-data-science', side, main);
    }

    // 35. AVIATION
    function renderAviation(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-aviation"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (p.driversLicence || sk.length) { h += '<div class="cv-licence-strip">'; if (p.driversLicence) h += '<span class="cv-avi-badge">' + esc(p.driversLicence) + '</span>'; sk.slice(0, 4).forEach(s => { h += '<span class="cv-avi-badge">' + esc(s) + '</span>'; }); h += '</div>'; }
        if (obj) h += secOpen() + secTitle('Professional Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Aviation Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Training & Qualifications') + buildEducation(edu, true) + secClose();
        if (sk.length > 4) h += secOpen() + secTitle('Additional Skills') + buildSkillTags(sk.slice(4)) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 36. MEDIA
    function renderMedia(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-media"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">&mdash;</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (sk.length) h += '<div class="cv-beat-areas">' + sk.map(s => '<span class="cv-beat-tag">' + esc(s) + '</span>').join('') + '</div>';
        if (exp.length) h += secOpen() + secTitle('Editorial Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // ════════════════════════════════════════════
    // NEW TEMPLATES (37-46)
    // ════════════════════════════════════════════

    // 37. PROFESSIONAL — Clean serif, conservative, suits any industry
    function renderProfessional(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-professional"><div class="cv-header">' + photoImg(p) + '<div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Professional Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (sk.length) h += secOpen() + secTitle('Core Competencies') + buildSkillTags(sk, 'cv-skill-pill') + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (p.driversLicence) h += secOpen() + secTitle('Additional Information') + '<p>' + esc(p.driversLicence) + '</p>' + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 38. INFOGRAPHIC — Visual skill bars, icon-style layout
    function renderInfographic(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let sidebar = photoImg(p, 'cv-photo-round') + '<div class="cv-name">' + esc(p.fullName) + '</div>';
        sidebar += '<div class="cv-contact">';
        if (p.phone) sidebar += '<p>' + esc(p.phone) + '</p>';
        if (p.email) sidebar += '<p>' + esc(p.email) + '</p>';
        { const a = fullAddress(p); if (a) sidebar += '<p>' + a + '</p>'; }
        sidebar += '</div>';
        if (sk.length) {
            sidebar += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Skills</div>';
            sk.forEach((s, i) => {
                const pct = Math.max(40, 100 - i * 8);
                sidebar += '<div class="cv-skill-bar-wrap"><span class="cv-skill-bar-label">' + esc(s) + '</span><div class="cv-skill-bar"><div class="cv-skill-bar-fill" style="width:' + pct + '%"></div></div></div>';
            });
            sidebar += '</div>';
        }
        if (ln.length) {
            sidebar += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Languages</div>';
            ln.forEach(l => { sidebar += '<p class="cv-lang-item">' + esc(l) + '</p>'; });
            sidebar += '</div>';
        }
        if (p.driversLicence) sidebar += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Licence</div><p>' + esc(p.driversLicence) + '</p></div>';

        let main = '';
        if (obj) main += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) main += secOpen() + secTitle('Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) main += secOpen() + secTitle('Education') + buildEducation(edu, true) + secClose();
        if (ref.length) main += secOpen() + secTitle('References') + buildRefs(ref) + secClose();

        return '<div class="cv-infographic"><div class="cv-sidebar">' + sidebar + '</div><div class="cv-main">' + main + '</div></div>';
    }

    // 39. SIMPLE — Bare-minimum design, ultra-readable
    function renderSimple(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-simple"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).join(' | ') + '</div></div>';
        if (obj) h += '<div class="cv-section"><div class="cv-section-title">Professional Summary</div><p>' + esc(obj) + '</p></div>';
        if (exp.length) h += '<div class="cv-section"><div class="cv-section-title">Experience</div>' + buildExperience(exp, false) + '</div>';
        if (edu.length) h += '<div class="cv-section"><div class="cv-section-title">Education</div>' + buildEducation(edu, false) + '</div>';
        if (sk.length) h += '<div class="cv-section"><div class="cv-section-title">Skills</div><p>' + sk.map(s => esc(s)).join(', ') + '</p></div>';
        if (ln.length) h += '<div class="cv-section"><div class="cv-section-title">Languages</div><p>' + ln.map(l => esc(l)).join(', ') + '</p></div>';
        if (ref.length) h += '<div class="cv-section"><div class="cv-section-title">References</div>' + buildRefs(ref) + '</div>';
        return h + '</div>';
    }

    // 40. BANKING — Conservative financial services
    function renderBanking(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-banking"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (sk.length) h += secOpen() + secTitle('Skills') + buildSkillTags(sk, 'cv-skill-pill') + secClose();
        if (exp.length) h += secOpen() + secTitle('Professional Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education & Qualifications') + buildEducation(edu, true) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefsTable(ref) + secClose();
        return h + '</div></div>';
    }

    // 41. MEDICAL DOCTOR — Specialized healthcare for doctors/specialists
    function renderMedicalDoctor(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-medical-doctor"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-title-bar">';
        if (sk.length) h += '<span class="cv-speciality">' + esc(sk[0]) + '</span>';
        h += '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (edu.length) h += secOpen() + secTitle('Medical Education & Training') + buildEducation(edu, true) + secClose();
        if (exp.length) h += secOpen() + secTitle('Clinical Experience') + buildExperience(exp, true) + secClose();
        if (sk.length > 1) h += secOpen() + secTitle('Clinical Skills') + buildSkillTags(sk.slice(1), 'cv-skill-pill') + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (p.driversLicence) h += secOpen() + secTitle('Registration') + '<p>' + esc(p.driversLicence) + '</p>' + secClose();
        if (ref.length) h += secOpen() + secTitle('Professional References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 42. HR / PEOPLE — Human resources professionals
    function renderHR(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let sidebar = photoImg(p, 'cv-photo-round') + '<div class="cv-name">' + esc(p.fullName) + '</div>';
        sidebar += '<div class="cv-contact">';
        if (p.phone) sidebar += '<p>' + esc(p.phone) + '</p>';
        if (p.email) sidebar += '<p>' + esc(p.email) + '</p>';
        { const a = fullAddress(p); if (a) sidebar += '<p>' + a + '</p>'; }
        sidebar += '</div>';
        if (sk.length) sidebar += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">HR Competencies</div>' + buildSkillList(sk) + '</div>';
        if (ln.length) sidebar += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">Languages</div>' + buildSkillList(ln) + '</div>';
        if (ref.length) { sidebar += '<div class="cv-sidebar-section"><div class="cv-sidebar-title">References</div>'; ref.forEach(r => { sidebar += '<div class="cv-ref-entry"><strong>' + esc(r.name) + '</strong><span>' + esc(r.relationship) + '<br>' + esc(r.phone) + '</span></div>'; }); sidebar += '</div>'; }

        let main = '';
        if (obj) main += secOpen() + secTitle('People & Culture Statement') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) main += secOpen() + secTitle('HR Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) main += secOpen() + secTitle('Education & Certifications') + buildEducation(edu, true) + secClose();

        return '<div class="cv-hr"><div class="cv-sidebar">' + sidebar + '</div><div class="cv-main">' + main + '</div></div>';
    }

    // 43. PROJECT MANAGER — PM-focused with methodology tags
    function renderProjectManager(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-project-manager"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div>';
        if (sk.length) { h += '<div class="cv-method-tags">'; sk.slice(0, 6).forEach(s => { h += '<span class="cv-method-tag">' + esc(s) + '</span>'; }); h += '</div>'; }
        h += '</div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (exp.length) h += secOpen() + secTitle('Project Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education & Certifications') + buildEducation(edu, true) + secClose();
        if (sk.length > 6) h += secOpen() + secTitle('Additional Skills') + buildSkillTags(sk.slice(6)) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 44. PHARMACY — Pharmaceutical industry specific
    function renderPharmacy(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-pharmacy"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (edu.length) h += secOpen() + secTitle('Pharmacy Education') + buildEducation(edu, true) + secClose();
        if (exp.length) h += secOpen() + secTitle('Dispensing & Clinical Experience') + buildExperience(exp, true) + secClose();
        if (sk.length) h += secOpen() + secTitle('Pharmaceutical Skills') + buildSkillTags(sk, 'cv-skill-pill') + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (p.driversLicence) h += secOpen() + secTitle('SAPC Registration') + '<p>' + esc(p.driversLicence) + '</p>' + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 45. REAL ESTATE — Property sector focus
    function renderRealEstate(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-real-estate"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">|</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Profile') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (sk.length) {
            h += '<div class="cv-highlight-strip">';
            sk.slice(0, 4).forEach(s => { h += '<span class="cv-highlight-item">' + esc(s) + '</span>'; });
            h += '</div>';
        }
        if (exp.length) h += secOpen() + secTitle('Property Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education & Qualifications') + buildEducation(edu, true) + secClose();
        if (sk.length > 4) h += secOpen() + secTitle('Additional Skills') + buildSkillTags(sk.slice(4)) + secClose();
        if (ln.length) h += secOpen() + secTitle('Languages') + buildSkillTags(ln) + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    // 46. TOURISM GUIDE — Tour guiding / travel industry
    function renderTourism(data) {
        const { p, exp, edu, sk, ref, obj, ln } = D(data);
        let h = '<div class="cv-tourism"><div class="cv-header"><div class="cv-name">' + esc(p.fullName) + '</div><div class="cv-contact">' + contact(p).map(c => '<span>' + c + '</span>').join('<span class="sep">&bull;</span>') + '</div></div><div class="cv-body">';
        if (obj) h += secOpen() + secTitle('Professional Summary') + '<p class="cv-objective">' + esc(obj) + '</p>' + secClose();
        if (ln.length) h += '<div class="cv-lang-strip">' + ln.map(l => '<span class="cv-lang-badge">' + esc(l) + '</span>').join('') + '</div>';
        if (exp.length) h += secOpen() + secTitle('Guiding Experience') + buildExperience(exp, true) + secClose();
        if (edu.length) h += secOpen() + secTitle('Education & Certifications') + buildEducation(edu, true) + secClose();
        if (sk.length) h += secOpen() + secTitle('Skills') + buildSkillTags(sk, 'cv-skill-pill') + secClose();
        if (p.driversLicence) h += secOpen() + secTitle('Licence & Permits') + '<p>' + esc(p.driversLicence) + '</p>' + secClose();
        if (ref.length) h += secOpen() + secTitle('References') + buildRefs(ref) + secClose();
        return h + '</div></div>';
    }

    return { render };
})();
