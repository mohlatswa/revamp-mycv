/**
 * PDF export using html2pdf.js from CDN. Falls back to browser print if offline.
 */
const PDFExport = (() => {
    let html2pdfLoaded = false;

    function loadLibrary() {
        return new Promise((resolve, reject) => {
            if (html2pdfLoaded && window.html2pdf) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = () => {
                html2pdfLoaded = true;
                resolve();
            };
            script.onerror = () => reject(new Error('Could not load PDF library'));
            document.head.appendChild(script);
        });
    }

    async function downloadPDF(previewEl, filename) {
        try {
            showToast('Preparing PDF...');
            await loadLibrary();

            const opt = {
                margin: 0,
                filename: filename || 'my-cv.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                },
                pagebreak: { mode: ['avoid-all', 'css'] }
            };

            await html2pdf().set(opt).from(previewEl).save();
            showToast('PDF downloaded!');
        } catch (e) {
            console.warn('PDF generation failed, falling back to print:', e);
            showToast('PDF unavailable \u2014 opening print dialog');
            window.print();
        }
    }

    function printCV() {
        window.print();
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    return { downloadPDF, printCV };
})();
