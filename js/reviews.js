/**
 * Reviews module — stores and renders user reviews.
 * Data lives in localStorage (key: cv_reviews) and is rendered dynamically.
 * Also drives the trust stats bar and review summary panel.
 */
const Reviews = (() => {
    'use strict';

    const STORAGE_KEY = 'cv_reviews';
    const DOWNLOADS_KEY = 'cv_downloads_total';

    // ── Persistence ──

    function _getAll() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function _saveAll(reviews) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    }

    function add(review) {
        const reviews = _getAll();
        reviews.unshift({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: review.name,
            location: review.location || '',
            rating: review.rating,
            text: review.text,
            date: new Date().toISOString()
        });
        _saveAll(reviews);
        return reviews;
    }

    // ── Stats ──

    function getStats() {
        const reviews = _getAll();
        const total = reviews.length;
        if (total === 0) return { total: 0, average: 0, breakdown: [0, 0, 0, 0, 0] };

        const breakdown = [0, 0, 0, 0, 0]; // index 0 = 1-star, index 4 = 5-star
        let sum = 0;
        reviews.forEach(r => {
            const s = Math.max(1, Math.min(5, r.rating || 0));
            breakdown[s - 1]++;
            sum += s;
        });

        return {
            total: total,
            average: Math.round((sum / total) * 10) / 10,
            breakdown: breakdown
        };
    }

    // ── CVs Created counter ──

    function incrementDownloadCount() {
        const count = getDownloadCount() + 1;
        localStorage.setItem(DOWNLOADS_KEY, count.toString());
        return count;
    }

    function getDownloadCount() {
        return parseInt(localStorage.getItem(DOWNLOADS_KEY) || '0', 10);
    }

    // ── Rendering ──

    function renderStars(rating) {
        let s = '';
        for (let i = 1; i <= 5; i++) {
            s += i <= rating ? '\u2605' : '\u2606';
        }
        return s;
    }

    function renderReviewCard(review) {
        const card = document.createElement('div');
        card.className = 'review-card';

        const header = document.createElement('div');
        header.className = 'review-header';

        const avatar = document.createElement('div');
        avatar.className = 'review-avatar';
        const initials = review.name.split(' ').map(w => w[0] || '').join('').toUpperCase().substring(0, 2);
        avatar.textContent = initials;

        const meta = document.createElement('div');
        meta.className = 'review-meta';
        const nameEl = document.createElement('strong');
        nameEl.textContent = review.name;
        const locEl = document.createElement('span');
        locEl.textContent = review.location || '';
        meta.appendChild(nameEl);
        meta.appendChild(locEl);

        const ratingDiv = document.createElement('div');
        ratingDiv.className = 'review-rating';
        ratingDiv.textContent = renderStars(review.rating);

        header.appendChild(avatar);
        header.appendChild(meta);
        header.appendChild(ratingDiv);

        const textP = document.createElement('p');
        textP.className = 'review-text';
        textP.textContent = '\u201C' + review.text + '\u201D';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'review-date';
        const d = new Date(review.date);
        dateSpan.textContent = d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

        card.appendChild(header);
        card.appendChild(textP);
        card.appendChild(dateSpan);
        return card;
    }

    function renderAll() {
        const reviews = _getAll();
        const list = document.getElementById('reviews-list');
        const hint = document.getElementById('no-reviews-hint');
        if (!list) return;

        // Clear existing cards (keep the hint element)
        list.querySelectorAll('.review-card').forEach(c => c.remove());

        if (reviews.length === 0) {
            if (hint) hint.style.display = '';
            _updateSummary({ total: 0, average: 0, breakdown: [0, 0, 0, 0, 0] });
            _updateTrustStats({ total: 0, average: 0 });
            return;
        }

        if (hint) hint.style.display = 'none';

        reviews.forEach(r => {
            list.appendChild(renderReviewCard(r));
        });

        const stats = getStats();
        _updateSummary(stats);
        _updateTrustStats(stats);
    }

    function _updateSummary(stats) {
        const avgEl = document.getElementById('reviews-avg');
        const starsEl = document.getElementById('reviews-avg-stars');
        const countEl = document.getElementById('reviews-total-count');

        if (avgEl) avgEl.textContent = stats.total > 0 ? stats.average.toFixed(1) : '\u2014';
        if (starsEl) starsEl.textContent = stats.total > 0 ? renderStars(Math.round(stats.average)) : '';
        if (countEl) countEl.textContent = stats.total > 0 ? 'Based on ' + stats.total + ' review' + (stats.total !== 1 ? 's' : '') : 'No reviews yet';

        // Update breakdown bars
        for (let i = 1; i <= 5; i++) {
            const bar = document.getElementById('bar-' + i);
            const pct = document.getElementById('pct-' + i);
            const count = stats.breakdown[i - 1] || 0;
            const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            if (bar) bar.style.width = percent + '%';
            if (pct) pct.textContent = percent + '%';
        }
    }

    function _updateTrustStats(stats) {
        const ratingEl = document.getElementById('stat-user-rating');
        const reviewCountEl = document.getElementById('stat-review-count');
        const cvsEl = document.getElementById('stat-cvs-created');

        if (ratingEl) ratingEl.textContent = stats.total > 0 ? stats.average.toFixed(1) + '/5' : '\u2014';
        if (reviewCountEl) reviewCountEl.textContent = stats.total.toLocaleString();
        if (cvsEl) cvsEl.textContent = getDownloadCount().toLocaleString();
    }

    // ── Public API ──

    return {
        getAll: _getAll,
        add: add,
        getStats: getStats,
        renderAll: renderAll,
        incrementDownloadCount: incrementDownloadCount,
        getDownloadCount: getDownloadCount
    };
})();
