const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const MOBILE_CSS = `
        /* Global Mobile Prevent Stretch */
        html, body { max-width: 100vw; overflow-x: hidden; }
        
        @media (max-width: 768px) {
            body { padding: 20px 15px; }
            header { flex-direction: column; align-items: stretch; gap: 10px; margin-bottom: 20px; }
            header > div { display: flex; justify-content: space-between; align-items: center; width: 100%; }
            #current-date { order: 3; font-size: 12px; margin-top: -5px; color: var(--text-muted); text-align: left; }
            .metrics-grid { grid-template-columns: 1fr; }
            .form-grid { grid-template-columns: 1fr; gap: 15px; }
            
            /* Responsive tables containers */
            .ovn-matrix-container, .sched-table-wrapper, .modal-content table {
                display: block;
                width: 100%;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
            }
            .ovn-matrix-container::-webkit-scrollbar, .sched-table-wrapper::-webkit-scrollbar {
                display: none;
            }
            .modal-content {
                width: 95%;
                padding: 20px !important;
                max-height: 90vh;
            }
            .modal-content h2 { font-size: 20px !important; }
        }
`;

html = html.replace('/* Toast Notification Styles */', MOBILE_CSS + '\n        /* Toast Notification Styles */');

fs.writeFileSync('index.html', html, 'utf8');
