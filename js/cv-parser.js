/**
 * CV Parser — extracts structured data from uploaded CV text.
 * Supports PDF (via pdf.js) and plain text files.
 * Returns data matching the wizard's step1-step5 structure.
 */
const CVParser = (() => {
    'use strict';

    /**
     * Parse a File object and return structured CV data.
     * @param {File} file
     * @returns {Promise<object>} { step1, step2, step3, step4, step5 }
     */
    async function parse(file) {
        let text = '';

        if (file.name.endsWith('.pdf')) {
            text = await extractPDF(file);
        } else {
            text = await file.text();
        }

        if (!text || text.trim().length < 20) {
            throw new Error('Could not extract enough text from this file. Try a different format.');
        }

        return extractData(text);
    }

    /** Extract text from PDF using pdf.js */
    async function extractPDF(file) {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF reader not loaded. Please refresh and try again.');
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    }

    /** Extract structured CV data from raw text */
    function extractData(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const fullText = text;

        const step1 = extractPersonal(fullText, lines);
        const step2 = extractExperience(fullText, lines);
        const step3 = extractEducation(fullText, lines);
        const step4 = extractSkills(fullText, lines);
        const step5 = extractReferences(fullText, lines);

        return { step1, step2, step3, step4, step5 };
    }

    // ── Personal Info ──

    function extractPersonal(text, lines) {
        const p = {};

        // Name — usually the first prominent line
        if (lines.length > 0) {
            const firstLine = lines[0];
            // If first line looks like a name (2-4 words, no digits, no special chars)
            if (/^[A-Za-z\s\-'\.]{3,60}$/.test(firstLine) && firstLine.split(/\s+/).length <= 5) {
                p.fullName = firstLine;
            }
        }

        // Email
        const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) p.email = emailMatch[0];

        // Phone — SA formats
        const phoneMatch = text.match(/(?:\+27|0)\s*[\d\s\-()]{8,14}/);
        if (phoneMatch) p.phone = phoneMatch[0].trim();

        // Address — look for street/suburb patterns
        const addrMatch = text.match(/\d+\s+[\w\s]+(?:street|str|road|rd|avenue|ave|drive|dr|lane|ln|crescent|cres|close|court|place|blvd|way)\b[^,\n]*/i);
        if (addrMatch) p.address = addrMatch[0].trim();

        // Location — look for SA cities/towns
        const cities = ['johannesburg','pretoria','cape town','durban','polokwane','bloemfontein','nelspruit','kimberley','east london','port elizabeth','pietermaritzburg','rustenburg','soweto','sandton','centurion','midrand','randburg','roodepoort','benoni','boksburg','germiston','springs','krugersdorp','witbank','secunda','lephalale','tzaneen','phalaborwa','thohoyandou','makhado','musina','mokopane','giyani','bushbuckridge','mbombela'];
        const textLower = text.toLowerCase();
        for (const city of cities) {
            if (textLower.includes(city)) {
                p.location = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                break;
            }
        }

        // Province
        const provinces = ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape'];
        for (const prov of provinces) {
            if (textLower.includes(prov.toLowerCase())) {
                p.province = prov;
                break;
            }
        }

        // Nationality
        if (textLower.includes('south african')) p.nationality = 'South African';

        // Gender
        if (/\b(male)\b/i.test(text) && !/\b(female)\b/i.test(text)) p.gender = 'Male';
        else if (/\b(female)\b/i.test(text)) p.gender = 'Female';

        // Marital Status
        if (/\b(single)\b/i.test(text)) p.maritalStatus = 'Single';
        else if (/\b(married)\b/i.test(text)) p.maritalStatus = 'Married';
        else if (/\b(divorced)\b/i.test(text)) p.maritalStatus = 'Divorced';
        else if (/\b(widowed)\b/i.test(text)) p.maritalStatus = 'Widowed';

        // Languages
        const langMatch = text.match(/languages?\s*[:\-]\s*(.+)/i);
        if (langMatch) {
            p.languages = langMatch[1].split(/[,;\/]/).map(l => l.trim()).filter(l => l.length > 1 && l.length < 30).join(', ');
        }

        // Driver's licence
        const licenceMatch = text.match(/code\s*(A|B|C1|C|EB|EC1|EC)\b/i);
        if (licenceMatch) {
            const codeMap = { 'a': 'Code A (Motorcycle)', 'b': 'Code B (Light Motor)', 'c1': 'Code C1 (Heavy Vehicle)', 'c': 'Code C (Extra Heavy)', 'eb': 'Code EB (Articulated)', 'ec1': 'Code EC1', 'ec': 'Code EC' };
            p.driversLicence = codeMap[licenceMatch[1].toLowerCase()] || '';
        }

        return p;
    }

    // ── Work Experience ──

    function extractExperience(text, lines) {
        const jobs = [];
        const sectionText = extractSection(text, ['work experience', 'professional experience', 'employment history', 'experience', 'work history', 'career history']);
        if (!sectionText) return jobs;

        // Look for job patterns: Title at Company, dates
        const entries = sectionText.split(/\n(?=[A-Z])/);

        for (const entry of entries) {
            const entryLines = entry.split('\n').map(l => l.trim()).filter(Boolean);
            if (entryLines.length === 0) continue;

            // Try to find a date range
            const dateMatch = entry.match(/(\w+\s*\d{4})\s*[\-–—to]+\s*(\w+\s*\d{4}|present|current)/i);
            const yearMatch = entry.match(/(\d{4})\s*[\-–—to]+\s*(\d{4}|present|current)/i);

            let startDate = '';
            let endDate = '';
            let currentJob = false;

            if (dateMatch) {
                startDate = parseMonthYear(dateMatch[1]);
                if (/present|current/i.test(dateMatch[2])) {
                    currentJob = true;
                } else {
                    endDate = parseMonthYear(dateMatch[2]);
                }
            } else if (yearMatch) {
                startDate = yearMatch[1] + '-01';
                if (/present|current/i.test(yearMatch[2])) {
                    currentJob = true;
                } else {
                    endDate = yearMatch[2] + '-01';
                }
            }

            // First line is usually the job title or "Title at Company"
            let jobTitle = '';
            let company = '';
            const firstLine = entryLines[0];

            const atMatch = firstLine.match(/^(.+?)\s+(?:at|@|-|–|—)\s+(.+)/i);
            if (atMatch) {
                jobTitle = atMatch[1].trim();
                company = atMatch[2].replace(/[\d\-–—\/]+.*$/, '').trim();
            } else {
                jobTitle = firstLine.replace(/[\d\-–—\/]+.*$/, '').trim();
                if (entryLines.length > 1) {
                    company = entryLines[1].replace(/[\d\-–—\/]+.*$/, '').trim();
                }
            }

            // Skip if no meaningful title
            if (!jobTitle || jobTitle.length < 2 || jobTitle.length > 80) continue;

            // Collect duties (remaining lines that look like bullet points)
            const dutyLines = [];
            for (let i = 1; i < entryLines.length; i++) {
                const line = entryLines[i];
                if (/^[\-\•\*\>●○■□▪]/.test(line) || /^\d+[\.\)]\s/.test(line)) {
                    dutyLines.push(line.replace(/^[\-\•\*\>●○■□▪\d\.\)]+\s*/, ''));
                }
            }

            jobs.push({
                jobTitle: jobTitle.substring(0, 80),
                company: (company || '').substring(0, 80),
                startDate,
                endDate,
                currentJob,
                duties: dutyLines.join('\n')
            });

            if (jobs.length >= 6) break;
        }

        return jobs;
    }

    // ── Education ──

    function extractEducation(text, lines) {
        const edus = [];
        const sectionText = extractSection(text, ['education', 'qualifications', 'academic', 'training', 'education and training']);
        if (!sectionText) return edus;

        const entryLines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);

        for (let i = 0; i < entryLines.length; i++) {
            const line = entryLines[i];
            // Look for qualification keywords
            const qualKeywords = /matric|certificate|diploma|degree|bachelor|master|honours|bcom|bsc|ba\b|mba|phd|national senior|n\d\b|nqf/i;

            if (qualKeywords.test(line)) {
                const yearMatch = line.match(/\b(19|20)\d{2}\b/);
                let institution = '';
                // Check next line for institution
                if (i + 1 < entryLines.length && !qualKeywords.test(entryLines[i + 1])) {
                    institution = entryLines[i + 1].replace(/\b(19|20)\d{2}\b/g, '').trim();
                }
                // Or check previous line
                if (!institution && i > 0 && !qualKeywords.test(entryLines[i - 1])) {
                    institution = entryLines[i - 1].replace(/\b(19|20)\d{2}\b/g, '').trim();
                }

                edus.push({
                    qualification: line.replace(/\b(19|20)\d{2}\b/g, '').replace(/[\-–—]/g, '').trim().substring(0, 100),
                    institution: (institution || '').substring(0, 100),
                    year: yearMatch ? yearMatch[0] : ''
                });

                if (edus.length >= 5) break;
            }
        }

        return edus;
    }

    // ── Skills ──

    function extractSkills(text, lines) {
        const skills = [];
        const sectionText = extractSection(text, ['skills', 'competencies', 'key skills', 'core competencies', 'technical skills', 'abilities']);
        if (!sectionText) return skills;

        const sectionLines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);

        for (const line of sectionLines) {
            // Split by commas, bullets, pipes
            const items = line.split(/[,;|•●○■□▪\-]/).map(s => s.trim()).filter(s => s.length >= 2 && s.length <= 40);
            items.forEach(item => {
                const clean = item.replace(/^[\d\.\)]+\s*/, '').trim();
                if (clean.length >= 2 && clean.length <= 40 && !skills.includes(clean)) {
                    skills.push(clean);
                }
            });
            if (skills.length >= 20) break;
        }

        return skills;
    }

    // ── References ──

    function extractReferences(text, lines) {
        const refs = [];
        const sectionText = extractSection(text, ['references', 'referees']);
        if (!sectionText) return refs;

        // Try to find name + phone patterns
        const phoneRegex = /(?:\+27|0)\s*[\d\s\-()]{8,14}/g;
        const refLines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);

        let currentRef = {};
        for (const line of refLines) {
            const phone = line.match(phoneRegex);
            if (phone) {
                currentRef.phone = phone[0].trim();
                if (currentRef.name) {
                    refs.push({ ...currentRef });
                    currentRef = {};
                }
            } else if (/^[A-Za-z\s\.\-']{3,50}$/.test(line) && !currentRef.name) {
                currentRef.name = line;
            } else if (currentRef.name && !currentRef.relationship && line.length < 50) {
                currentRef.relationship = line;
            }
        }
        if (currentRef.name && currentRef.phone) refs.push(currentRef);

        return refs.slice(0, 4);
    }

    // ── Helpers ──

    /** Extract text under a section heading */
    function extractSection(text, headings) {
        const allHeadings = ['personal', 'contact', 'profile', 'summary', 'objective', 'work experience', 'professional experience', 'employment', 'experience', 'education', 'qualifications', 'training', 'skills', 'competencies', 'abilities', 'references', 'referees', 'hobbies', 'interests', 'achievements', 'awards', 'languages', 'additional'];

        for (const heading of headings) {
            // Match heading (case-insensitive, possibly with colon or line break after)
            const regex = new RegExp('(?:^|\\n)\\s*' + heading.replace(/\s+/g, '\\s+') + '\\s*[:\\-–—]?\\s*\\n', 'im');
            const match = text.match(regex);

            if (match) {
                const startIdx = match.index + match[0].length;
                // Find next section heading
                let endIdx = text.length;
                for (const nextHeading of allHeadings) {
                    if (headings.includes(nextHeading)) continue;
                    const nextRegex = new RegExp('(?:^|\\n)\\s*' + nextHeading.replace(/\s+/g, '\\s+') + '\\s*[:\\-–—]?\\s*\\n', 'im');
                    const nextMatch = text.substring(startIdx).match(nextRegex);
                    if (nextMatch && (startIdx + nextMatch.index) < endIdx) {
                        endIdx = startIdx + nextMatch.index;
                    }
                }
                return text.substring(startIdx, endIdx).trim();
            }
        }
        return '';
    }

    /** Parse "January 2020" or "Jan 2020" into "2020-01" */
    function parseMonthYear(str) {
        if (!str) return '';
        const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const cleaned = str.trim().toLowerCase();
        const yearMatch = cleaned.match(/\d{4}/);
        if (!yearMatch) return '';
        const year = yearMatch[0];

        for (const [abbr, num] of Object.entries(months)) {
            if (cleaned.includes(abbr)) return year + '-' + num;
        }
        return year + '-01';
    }

    return { parse };
})();
