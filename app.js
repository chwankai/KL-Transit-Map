document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-fullscreen');
    
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('fullscreen-mode');
        
        // Update button text / icon
        if (document.body.classList.contains('fullscreen-mode')) {
            toggleBtn.innerHTML = '<span class="btn-icon">🚪</span> Exit Fullscreen';
        } else {
            toggleBtn.innerHTML = '<span class="btn-icon">🖥️</span> Fullscreen';
        }
    });

    // Listen for Escape key to exit fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('fullscreen-mode')) {
            document.body.classList.remove('fullscreen-mode');
            toggleBtn.innerHTML = '<span class="btn-icon">🖥️</span> Fullscreen';
        }
    });

    // PDF.js Rendering Logic
    const url = 'Klang Valley Rail Map.pdf';
    const { pdfjsLib } = window;
    
    // Set worker source path using CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    
    const container = document.getElementById('pdf-container');
    let pdfDoc = null;
    
    function renderPage(pageNum) {
        pdfDoc.getPage(pageNum).then((page) => {
            // Render at high resolution (scale 2.5) so detail is preserved when scaled via CSS
            const scale = 2.5;
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas';
            const ctx = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            container.appendChild(canvas);
            
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            page.render(renderContext);
        });
    }
    
    pdfjsLib.getDocument(url).promise.then((pdfDoc_) => {
        pdfDoc = pdfDoc_;
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            renderPage(i);
        }
    }).catch(err => {
        console.error('Error loading PDF: ', err);
        container.innerHTML = `<div class="error-msg">Error loading map PDF. Please try again.</div>`;
    });
});
