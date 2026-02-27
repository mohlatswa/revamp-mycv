/**
 * Session timeout module — auto-logout after inactivity.
 */
const SessionTimer = (() => {
    'use strict';

    var timeoutId = null;
    var warningId = null;
    var timeoutMs = 7 * 60 * 1000; // default 7 min
    var WARNING_BEFORE = 60 * 1000; // warn 1 min before expiry
    var warningEl = null;

    function init() {
        // Read timeout from user settings
        try {
            var settings = JSON.parse(localStorage.getItem('cv_user_settings') || '{}');
            if (settings.sessionTimeout) {
                timeoutMs = settings.sessionTimeout * 60 * 1000;
            }
        } catch (e) { /* use default */ }

        // Create warning banner (inserted once)
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.className = 'session-warning';
            warningEl.innerHTML = '<span>Your session will expire in 1 minute due to inactivity.</span>' +
                '<button type="button" class="session-warning-btn" id="btn-session-extend">Stay signed in</button>';
            document.body.appendChild(warningEl);

            warningEl.querySelector('#btn-session-extend').addEventListener('click', function () {
                resetTimer();
            });
        }

        // Listen for user activity
        var events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart', 'input'];
        events.forEach(function (evt) {
            document.addEventListener(evt, resetTimer, { passive: true });
        });

        resetTimer();
    }

    function resetTimer() {
        clearTimeout(timeoutId);
        clearTimeout(warningId);
        hideWarning();

        if (timeoutMs <= WARNING_BEFORE) {
            // Very short timeout — skip warning, go straight to expire
            timeoutId = setTimeout(expire, timeoutMs);
            return;
        }

        warningId = setTimeout(showWarning, timeoutMs - WARNING_BEFORE);
        timeoutId = setTimeout(expire, timeoutMs);
    }

    function showWarning() {
        if (warningEl) warningEl.classList.add('show');
    }

    function hideWarning() {
        if (warningEl) warningEl.classList.remove('show');
    }

    function expire() {
        hideWarning();
        // Sign out and redirect
        if (typeof Auth !== 'undefined' && Auth.signOut) {
            Auth.signOut().then(function () {
                window.location.replace('login.html');
            }).catch(function () {
                window.location.replace('login.html');
            });
        } else {
            window.location.replace('login.html');
        }
    }

    function updateTimeout(minutes) {
        timeoutMs = minutes * 60 * 1000;
        resetTimer();
    }

    return {
        init: init,
        updateTimeout: updateTimeout
    };
})();
