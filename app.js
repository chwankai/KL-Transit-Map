document.addEventListener('DOMContentLoaded', () => {
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
