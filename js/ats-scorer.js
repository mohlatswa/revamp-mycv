/**
 * ATS Scorer — Scores CV data 0-100 on 10 criteria.
 * Grades: Excellent (85+), Good (65+), Fair (45+), Needs Work (<45).
 */
const ATSScorer = (() => {
    'use strict';

    function score(cvData) {
        const p = cvData.step1 || {};
        const exp = cvData.step2 || [];
        const edu = cvData.step3 || [];
        const sk = cvData.step4 || [];
        const ref = cvData.step5 || [];
        const obj = (p.objective || '').trim();

        const results = [];
        let total = 0;

        // 1. Has professional summary (10 pts)
        const hasSummary = obj.length > 0;
        results.push({ label: 'Professional summary', pass: hasSummary, points: hasSummary ? 10 : 0, max: 10, tip: 'Add a professional summary in Step 1 to tell employers who you are.' });
        total += hasSummary ? 10 : 0;

        // 2. Summary 50+ words (10 pts)
        const wordCount = obj.split(/\s+/).filter(Boolean).length;
        const longSummary = wordCount >= 50;
        results.push({ label: 'Summary 50+ words', pass: longSummary, points: longSummary ? 10 : 0, max: 10, tip: 'Expand your summary to at least 50 words for better ATS matching.' });
        total += longSummary ? 10 : 0;

        // 3. 3+ work experience entries (10 pts)
        const hasExp = exp.length >= 3;
        const expPts = exp.length >= 3 ? 10 : Math.min(10, Math.round(exp.length * 3.3));
        results.push({ label: '3+ work experiences', pass: hasExp, points: expPts, max: 10, tip: 'Add at least 3 job entries to show a solid work history.' });
        total += expPts;

        // 4. Duties listed for each job (15 pts)
        const jobsWithDuties = exp.filter(j => j.duties && j.duties.trim().length > 0).length;
        const dutiesPct = exp.length > 0 ? jobsWithDuties / exp.length : 0;
        const dutiesPts = Math.round(dutiesPct * 15);
        results.push({ label: 'Duties for each job', pass: dutiesPct === 1, points: dutiesPts, max: 15, tip: 'Describe your main duties for every job — this helps ATS match your experience.' });
        total += dutiesPts;

        // 5. 5+ skills (10 pts)
        const hasSkills = sk.length >= 5;
        const skillPts = sk.length >= 5 ? 10 : Math.min(10, sk.length * 2);
        results.push({ label: '5+ skills listed', pass: hasSkills, points: skillPts, max: 10, tip: 'Add at least 5 relevant skills from Step 4.' });
        total += skillPts;

        // 6. Education entries (10 pts)
        const hasEdu = edu.length > 0;
        const eduPts = edu.length >= 2 ? 10 : (edu.length === 1 ? 7 : 0);
        results.push({ label: 'Education entries', pass: hasEdu, points: eduPts, max: 10, tip: 'Add your education and qualifications.' });
        total += eduPts;

        // 7. 2+ references (5 pts)
        const hasRefs = ref.length >= 2;
        const refPts = ref.length >= 2 ? 5 : (ref.length === 1 ? 3 : 0);
        results.push({ label: '2+ references', pass: hasRefs, points: refPts, max: 5, tip: 'Add at least 2 references for credibility.' });
        total += refPts;

        // 8. Complete contact info (10 pts)
        const hasPhone = !!(p.phone && p.phone.trim());
        const hasEmail = !!(p.email && p.email.trim());
        const hasLocation = !!(p.location && p.location.trim());
        const contactPts = (hasPhone ? 4 : 0) + (hasEmail ? 3 : 0) + (hasLocation ? 3 : 0);
        results.push({ label: 'Complete contact info', pass: contactPts === 10, points: contactPts, max: 10, tip: 'Add your phone number, email, and location in Step 1.' });
        total += contactPts;

        // 9. Languages listed (5 pts)
        const langStr = (p.languages || '').trim();
        const hasLangs = langStr.length > 0 && langStr.split(',').filter(Boolean).length > 0;
        results.push({ label: 'Languages listed', pass: hasLangs, points: hasLangs ? 5 : 0, max: 5, tip: 'List the languages you speak — important for South African employers.' });
        total += hasLangs ? 5 : 0;

        // 10. Summary contains skill/title keywords (15 pts)
        const objLower = obj.toLowerCase();
        const skillsInSummary = sk.filter(s => objLower.includes(s.toLowerCase())).length;
        const titlesInSummary = exp.filter(j => j.jobTitle && objLower.includes(j.jobTitle.toLowerCase())).length;
        const kwMatches = skillsInSummary + titlesInSummary;
        const kwPts = Math.min(15, kwMatches * 5);
        results.push({ label: 'Keywords in summary', pass: kwPts >= 10, points: kwPts, max: 15, tip: 'Include your job titles and key skills in your professional summary.' });
        total += kwPts;

        // Grade
        let grade, gradeClass;
        if (total >= 85) { grade = 'Excellent'; gradeClass = 'ats-excellent'; }
        else if (total >= 65) { grade = 'Good'; gradeClass = 'ats-good'; }
        else if (total >= 45) { grade = 'Fair'; gradeClass = 'ats-fair'; }
        else { grade = 'Needs Work'; gradeClass = 'ats-needs-work'; }

        return { total, grade, gradeClass, results };
    }

    return { score };
})();
