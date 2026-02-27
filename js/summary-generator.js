/**
 * Auto-generates a compelling career objective/summary that motivates employers.
 * Produces confident, professional statements tailored to the candidate's background.
 */
const SummaryGenerator = (() => {

    const openings = {
        experienced: [
            'Results-driven and accomplished professional with {years} of proven experience',
            'Dynamic and highly motivated professional bringing {years} of hands-on expertise',
            'Accomplished and detail-oriented professional with a strong {years} track record',
            'Performance-focused professional with {years} of demonstrated success'
        ],
        moderate: [
            'Committed and adaptable professional with solid practical experience',
            'Driven and resourceful individual with a strong foundation of real-world experience',
            'Energetic and dependable professional with meaningful hands-on experience'
        ],
        graduate: [
            'Ambitious and academically accomplished {qual} graduate ready to make an immediate impact',
            'Highly motivated {qual} graduate with a passion for excellence and professional growth',
            'Eager and well-prepared {qual} graduate committed to delivering outstanding results'
        ],
        entry: [
            'Enthusiastic and quick-learning individual with a strong work ethic and desire to excel',
            'Self-motivated and reliable individual ready to contribute energy, dedication, and fresh ideas',
            'Positive and adaptable team player committed to learning, growing, and delivering value'
        ]
    };

    const skillPhrases = [
        'Bringing strong capabilities in {skills}, with a reputation for quality and reliability.',
        'Equipped with valuable expertise in {skills} and a proven ability to deliver under pressure.',
        'Demonstrating exceptional proficiency in {skills}, consistently exceeding expectations.'
    ];

    const closings = [
        'Eager to bring my strengths to a forward-thinking organisation where I can contribute meaningfully and grow professionally.',
        'Seeking a challenging role where I can leverage my abilities to drive results and advance alongside a progressive team.',
        'Ready to add immediate value and collaborate with a team that values excellence, integrity, and continuous improvement.',
        'Looking forward to an opportunity where my dedication and skills will contribute to the company\'s success and my own career development.'
    ];

    function generate(cvData) {
        const experience = cvData.step2 || [];
        const education = cvData.step3 || [];
        const skills = cvData.step4 || [];
        const jobTitles = experience.map(e => e.jobTitle).filter(Boolean);
        const latestQual = education.length > 0 ? education[0].qualification : '';
        const topSkills = skills.slice(0, 3);

        const parts = [];

        // Opening — based on experience level
        const years = estimateYearsExperience(experience);
        if (years >= 2) {
            let opening = pick(openings.experienced);
            const yearStr = years > 1 ? years + ' years' : 'over a year';
            opening = opening.replace('{years}', yearStr);
            if (jobTitles.length > 0) {
                const titles = [...new Set(jobTitles)].slice(0, 2);
                opening += ' in ' + titles.join(' and ');
            }
            parts.push(opening + '.');
        } else if (experience.length > 0) {
            let opening = pick(openings.moderate);
            if (jobTitles.length > 0) {
                const titles = [...new Set(jobTitles)].slice(0, 2);
                opening += ' in ' + titles.join(' and ');
            }
            parts.push(opening + '.');
        } else if (latestQual) {
            parts.push(pick(openings.graduate).replace('{qual}', latestQual) + '.');
        } else {
            parts.push(pick(openings.entry) + '.');
        }

        // Skills mention
        if (topSkills.length > 0) {
            parts.push(pick(skillPhrases).replace('{skills}', topSkills.join(', ')));
        }

        // Strong closing
        parts.push(pick(closings));

        return parts.join(' ');
    }

    function estimateYearsExperience(experience) {
        let totalMonths = 0;
        experience.forEach(job => {
            if (!job.startDate) return;
            const start = new Date(job.startDate);
            const end = job.currentJob ? new Date() : (job.endDate ? new Date(job.endDate) : new Date());
            const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            if (months > 0) totalMonths += months;
        });
        return Math.round(totalMonths / 12);
    }

    // Pick a random option for variety
    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    return { generate };
})();
